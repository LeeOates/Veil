import type { PlasmoMessaging } from "@plasmohq/messaging"

export {}

const HISTORY_KEY = "charlieai_history"
const SETTINGS_KEY = "charlieai_settings"

// ─── Per-tab scan cache (in-memory, instant lookup for popup) ─────────────────
const tabScanCache = new Map<number, any>()

// ─── Per-domain breach cache (in-memory, avoids hammering HIBP) ───────────────
const breachCache = new Map<string, any>()

chrome.tabs.onRemoved.addListener((tabId) => tabScanCache.delete(tabId))
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === "loading") tabScanCache.delete(tabId)
})

// ─── Message Router ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {

    case "CHECK_SAFE_BROWSING":
      checkSafeBrowsing(message.url).then(sendResponse)
      return true

    case "SAVE_SCAN":
      saveScan(message.data).then(() => sendResponse({ ok: true }))
      return true

    case "GET_HISTORY":
      chrome.storage.local.get(HISTORY_KEY, (data) => {
        sendResponse(data[HISTORY_KEY] || [])
      })
      return true

    case "CLEAR_HISTORY":
      chrome.storage.local.set({ [HISTORY_KEY]: [] }, () =>
        sendResponse({ ok: true })
      )
      return true

    case "SHOW_NOTIFICATION":
      showNotification(message.title, message.body)
      sendResponse({ ok: true })
      return false

    case "GET_SETTINGS":
      chrome.storage.local.get(SETTINGS_KEY, (data) => {
        sendResponse(
          data[SETTINGS_KEY] || { notifications: false, safeBrowsingKey: "", linkHoverTooltip: false, linkClickInterceptor: false, iconBadge: false }
        )
      })
      return true

    case "SAVE_SETTINGS":
      chrome.storage.local.set({ [SETTINGS_KEY]: message.data }, () =>
        sendResponse({ ok: true })
      )
      return true

    case "UPDATE_BADGE":
      if (_sender.tab?.id) tabScanCache.set(_sender.tab.id, message)
      updateBadgeForTab(message, _sender.tab?.id).catch(() => {})
      sendResponse({ ok: true })
      return false

    case "GET_CACHED_SCAN":
      sendResponse(tabScanCache.get(message.tabId) ?? null)
      return false

    case "GET_AI_EXPLANATION":
      getAiExplanation(message.data).then(sendResponse)
      return true

    case "CHECK_BREACH":
      checkBreach(message.domain).then(sendResponse)
      return true
  }
})

// ─── Claude AI Explanation ────────────────────────────────────────────────────
async function getAiExplanation(data: {
  url: string
  score: number
  band: string
  trackers: string[]
  cookieCount: number
  flags: string[]
  darkPatterns: string[]
  isMalicious: boolean
  threats: string[]
  fingerprintingSignals?: string[]
  cookieConsent?: { grade: string; issues: string[] } | null
  passwordWarnings?: string[]
  dataBroker?: boolean
  aiPhishingSignals?: string[]
  permissionIssues?: string[]
  aiGeneratedSignals?: string[]
  breachInfo?: { breached: boolean; name?: string; date?: string; count?: number } | null
}): Promise<{ explanation: string | null }> {
  const settings = await getSettings()
  const apiKey = settings.anthropicKey?.trim()
  if (!apiKey) return { explanation: null }

  const {
    url, score, band, trackers, cookieCount, flags, darkPatterns,
    isMalicious, threats, fingerprintingSignals = [], cookieConsent,
    passwordWarnings = [], dataBroker = false, aiPhishingSignals = [],
    permissionIssues = [], aiGeneratedSignals = [], breachInfo = null
  } = data

  let domain = url
  try { domain = new URL(url).hostname } catch {}

  const lines = [
    `Domain: ${domain}`,
    `Trust score: ${score}/100 (${band})`,
    `Trackers: ${trackers.length > 0 ? trackers.join(", ") : "none"}`,
    `Cookies: ${cookieCount}`,
    `Security flags: ${flags.length > 0 ? flags.join("; ") : "none"}`,
    `Dark patterns: ${darkPatterns.length > 0 ? darkPatterns.join("; ") : "none"}`,
    `Google Safe Browsing: ${isMalicious ? `FLAGGED — ${threats.join(", ")}` : "clean"}`,
    `Fingerprinting: ${fingerprintingSignals.length > 0 ? fingerprintingSignals.join("; ") : "none detected"}`,
    `Cookie consent grade: ${cookieConsent ? `${cookieConsent.grade} — issues: ${cookieConsent.issues.join("; ") || "none"}` : "N/A"}`,
    `Password warnings: ${passwordWarnings.length > 0 ? passwordWarnings.join("; ") : "none"}`,
    `Data broker: ${dataBroker ? "YES — known data broker site" : "no"}`,
    `AI phishing signals: ${aiPhishingSignals.length > 0 ? aiPhishingSignals.join("; ") : "none"}`,
    `Permission requests: ${permissionIssues.length > 0 ? permissionIssues.join("; ") : "none"}`,
    `AI-generated content signals: ${aiGeneratedSignals.length > 0 ? aiGeneratedSignals.join("; ") : "none"}`,
    `Data breach (HIBP): ${breachInfo?.breached ? `YES — ${breachInfo.count} breach${breachInfo.count !== 1 ? "es" : ""}, most recent: ${breachInfo.name ?? "unknown"} (${breachInfo.date?.slice(0, 4) ?? "?"})` : "no known breaches"}`,
  ]

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 120,
        system: `You are Charlie, the AI inside the Veil browser security extension. Write a 1–2 sentence plain-English summary for the user about this page's privacy and security risks. Prioritise the most serious finding (e.g. confirmed threat > AI phishing > data broker > fingerprinting > trackers). Be direct and actionable — tell the user what to do, not just what was found. No markdown, no bullet points.`,
        messages: [{ role: "user", content: lines.join("\n") }],
      }),
    })
    if (!res.ok) return { explanation: null }
    const json = await res.json()
    const text: string = json.content?.[0]?.text?.trim() ?? ""
    return { explanation: text || null }
  } catch {
    return { explanation: null }
  }
}

// ─── HaveIBeenPwned Breach Check ─────────────────────────────────────────────
async function checkBreach(domain: string): Promise<{ breached: boolean; name?: string; date?: string; count?: number }> {
  if (breachCache.has(domain)) return breachCache.get(domain)!
  try {
    const res = await fetch(
      `https://haveibeenpwned.com/api/v3/breaches?domain=${encodeURIComponent(domain)}`,
      { headers: { "User-Agent": "Veil-Extension/0.1" } }
    )
    if (!res.ok) {
      const result = { breached: false }
      breachCache.set(domain, result)
      return result
    }
    const breaches = await res.json()
    if (!Array.isArray(breaches) || breaches.length === 0) {
      const result = { breached: false }
      breachCache.set(domain, result)
      return result
    }
    // Sort by breach date descending — report the most recent
    const sorted = [...breaches].sort((a, b) =>
      (b.BreachDate ?? "").localeCompare(a.BreachDate ?? "")
    )
    const top = sorted[0]
    const result = {
      breached: true,
      name: top.Name as string,
      date: top.BreachDate as string,
      count: breaches.length,
    }
    breachCache.set(domain, result)
    return result
  } catch {
    const result = { breached: false }
    breachCache.set(domain, result)
    return result
  }
}

// ─── Safe Browsing API ─────────────────────────────────────────────────────────
async function getSettings(): Promise<{ notifications: boolean; safeBrowsingKey: string; anthropicKey: string; iconBadge: boolean; linkHoverTooltip: boolean; linkClickInterceptor: boolean }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (data) => {
      resolve(data[SETTINGS_KEY] || { notifications: false, safeBrowsingKey: "", anthropicKey: "", linkHoverTooltip: false, linkClickInterceptor: false, iconBadge: false })
    })
  })
}

async function checkSafeBrowsing(url: string) {
  const settings = await getSettings()
  const apiKey = settings.safeBrowsingKey?.trim()
  if (!apiKey) return { checked: false, safe: null, reason: "no_key" }

  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "charlie-ai", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: [
              "MALWARE",
              "SOCIAL_ENGINEERING",
              "UNWANTED_SOFTWARE",
              "POTENTIALLY_HARMFUL_APPLICATION"
            ],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }]
          }
        })
      }
    )
    const data = await res.json()
    const threats: string[] = (data.matches || []).map((m: any) => m.threatType)
    return { checked: true, safe: threats.length === 0, threats }
  } catch (e) {
    return { checked: false, safe: null, reason: "fetch_error" }
  }
}

// ─── Chrome Notifications ─────────────────────────────────────────────────────
function showNotification(title: string, body: string) {
  const settings = chrome.storage.local.get(SETTINGS_KEY, (data) => {
    const s = data[SETTINGS_KEY] || { notifications: false, iconBadge: false }
    if (!s.notifications) return
    chrome.notifications.create(`charlie-${Date.now()}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon.png"),
      title,
      message: body,
      priority: 2
    })
  })
}

// ─── Icon Badge ───────────────────────────────────────────────────────────────
async function updateBadgeForTab(data: any, tabId?: number) {
  const settings = await getSettings()
  const tabOpts = tabId ? { tabId } : {}

  if (!settings.iconBadge) {
    chrome.action.setBadgeText({ text: "", ...tabOpts })
    chrome.action.setTitle({ title: "Veil", ...tabOpts })
    return
  }

  const { score, isMalicious, trackers, flags, host } = data
  const band      = score >= 70 ? "safe" : score >= 45 ? "caution" : "danger"
  const color     = band === "safe" ? "#34D399" : band === "caution" ? "#F59E0B" : "#EF4444"
  const label     = band === "safe" ? "Protected" : band === "caution" ? "Review advised" : "High risk"

  chrome.action.setBadgeText({ text: String(score), ...tabOpts })
  chrome.action.setBadgeBackgroundColor({ color, ...tabOpts })

  const signals: string[] = []
  if (isMalicious)  signals.push("⚠️ Threat detected")
  else if (trackers > 0) signals.push(`${trackers} tracker${trackers !== 1 ? "s" : ""}`)
  if (flags > 0)    signals.push(`${flags} flag${flags !== 1 ? "s" : ""}`)

  const title = [`Veil  ·  ${score}/100  ·  ${label}`, host, signals.join("  ·  ")]
    .filter(Boolean).join("\n")
  chrome.action.setTitle({ title, ...tabOpts })
}

// ─── Scan History ─────────────────────────────────────────────────────────────
async function saveScan(entry: any) {
  const stored = await new Promise<any[]>((resolve) => {
    chrome.storage.local.get(HISTORY_KEY, (d) => resolve(d[HISTORY_KEY] || []))
  })
  const history = [{ ...entry, timestamp: Date.now() }, ...stored].slice(0, 60)
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({ [HISTORY_KEY]: history }, resolve)
  })
}
