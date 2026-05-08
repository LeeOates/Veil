// ═══════════════════════════════════════════════════════════════════════════════
// VEIL — MASTERCODE BACKUP
// Project: Veil Browser Extension (Plasmo / Chrome MV3)
// Author:  Oates Technology
// Description: Your personal AI-powered privacy companion.
//
// ─── CHANGELOG ────────────────────────────────────────────────────────────────
//
// [2026-04-17] — Initial build & core architecture
//   • Plasmo v0.90.5 scaffold — background service worker, content script, popup, options
//   • content.ts: tracker detection (26 tracker signatures), cookie counting, dark
//     pattern detection (7 patterns), page security flags (9 checks), quick URL
//     heuristic scorer, proactive auto-scan on page load, RESCAN message handler
//   • background.ts: Google Safe Browsing API v4 integration, scan history (60 entries,
//     chrome.storage.local), Chrome notifications, icon badge with colour-coded score,
//     per-tab in-memory scan cache for instant popup loads, GET_CACHED_SCAN handler
//   • popup.tsx: two-phase score loading (Phase 1: URL-only <1ms; Phase 2: full cached
//     data ~5ms), score ring, Privacy tab (trackers, cookies, dark patterns), Security
//     tab (URL checks, security flags, threat alert banner), Charlie explanation footer
//   • options.tsx: Google Safe Browsing API key input + test, feature toggles (link
//     hover tooltip, risky link warning, icon badge, threat notifications), scan history
//     clear, save/toast feedback — stone/silver design system
//   • Link hover tooltip: risk score shown on all links (feature-flagged OFF by default)
//   • Risky link warning overlay: full-screen modal for <65 score links (OFF by default)
//   • Design tokens: stone/silver light theme consistent across popup + options + overlays
//
// [2026-04-20 → 21] — Advanced security detectors + Claude AI integration
//   • content.ts: added 8 new detection engines:
//       – detectFingerprinting()    canvas, audio, WebGL, FingerprintJS, plugins, screen
//       – gradeCookieConsent()      grades A–D: reject-all, essential-only, pre-checked
//       – checkPasswordSafety()     HTTP form submission, external-domain login forms
//       – isDataBrokerSite()        hardcoded list of 22 known data broker domains
//       – detectAiPhishing()        urgency+credential combos, fake-official language,
//                                   brand impersonation, Levenshtein typosquatting (≤2)
//       – levenshtein()             edit-distance helper for domain comparison
//       – auditPermissions()        camera/mic, geolocation, notification requests in code
//       – detectAiGeneratedSite()   AI filler phrases (8 regex), missing byline/date/email
//   • content.ts: runProactiveScan() calls all detectors; updated score formula:
//       score -= flags*8 + trackers*2 + darkPatterns*5 + fingerprinting*6
//               + passwordWarnings*12 + aiPhishing*15 + aiGenerated*5
//               + (dataBroker?20:0) + (consentGrade=D?8:C?4:0)
//       Safe Browsing confirmed threat: additional -50
//   • content.ts: cachedResult extended with all new signal fields
//   • content.ts: notifications added for AI phishing patterns and data broker sites
//   • background.ts: GET_AI_EXPLANATION message handler → getAiExplanation()
//   • background.ts: getAiExplanation() calls claude-haiku-4-5-20251001 (max_tokens:120)
//     with all signal data; system prompt: "Prioritise most serious finding … be direct
//     and actionable"; returns { explanation: string | null }
//   • background.ts: getSettings() return type expanded to include anthropicKey, iconBadge
//   • popup.tsx: ScanResult interface extended (fingerprintingSignals, cookieConsent,
//     passwordWarnings, dataBroker, aiPhishingSignals, permissionIssues)
//   • popup.tsx: state + applyFullResult() handles all new fields
//   • popup.tsx: Privacy tab — Fingerprinting section, Cookie Consent grade badge (A–D)
//   • popup.tsx: Security tab — AI phishing red banner, data broker amber banner,
//     password safety section, permission issues section
//   • popup.tsx: non-blocking GET_AI_EXPLANATION call → "Explained by Charlie · AI" vs
//     "Explained by Charlie" depending on whether Anthropic key is configured
//   • options.tsx: anthropicKey field added to Settings interface
//   • options.tsx: Anthropic API Key card with show/hide, test key button, result indicator
//   • options.tsx: iconBadge toggle added to Features card
//   • package.json: added http://*/* to host_permissions; explicit icon size entries
//   • Assets: Space Invader pixel art icon (purple, transparent) exported at 16/32/48/128px
//
// [2026-04-30] — Phase 1 bug fixes: edge-case guards, detector hardening, score calibration
//   • content.ts (Phase 1.1): BLOCKED_HOSTS set (app.notion.com + extensible)
//   • content.ts (Phase 1.1): shouldSkip() — skips PDF, non-HTTP protocols, no body, blocked hosts
//   • content.ts (Phase 1.1): safeSend() — silences "Extension context invalidated" errors;
//     replaces all direct chrome.runtime.sendMessage calls
//   • content.ts (Phase 1.1): init() wrapped in try/catch; shouldSkip() guard at top of init
//   • content.ts (Phase 1.2): every detector function wrapped in outer try/catch returning []
//   • content.ts (Phase 1.2): document.body.innerText replaced with document.body?.innerText ?? ""
//     in all detectors (null-safe)
//   • content.ts (Phase 1.2): heavy DOM query loops (querySelectorAll) wrapped individually
//   • content.ts (Phase 1.2): runProactiveScan() calls each detector in isolated IIFE try/catch
//     so one crashing detector can never abort the full scan
//   • content.ts (Phase 1.3): score penalty calibration after simulating 14 site categories:
//       – darkPatterns per-pattern: 5 → 8  (single dark pattern now meaningfully lowers score)
//       – dataBroker penalty: 20 → 37      (data brokers now correctly land in HIGH RISK)
//   • popup.tsx: tokens.logoMark changed from "#1A1A18" → "#FFFFFF" (white logo background)
//   • popup.tsx: logo container div — border: 0.5px solid tokens.borderDefault added
//   • options.tsx: tokens.logoMark changed from "#1A1A18" → "#FFFFFF" (white logo background)
//   • options.tsx: logo container div — border: 0.5px solid tokens.borderDefault added
//   • assets/icon*.png: Python/Pillow script — dark pixel background replaced with white
//     (purple pixels R>100,B>150,G<150 preserved; dark brightness<80,alpha>100 → #FFFFFF)
//   • package.json: description updated — "Powered by Charlie" removed for store submission
//   • package.json: manifest audit confirms MV3 compliance; version 0.1.0 → bump to 1.0.0
//     pre-submission (tabs permission confirmed needed for onRemoved/onUpdated listeners)
//   • content.ts tooltip logo: background changed from #1A1A18 → #FFFFFF to match icon
//   • background.ts: removed unused `import type { PlasmoMessaging }` (dead import, type error)
//   • tsconfig.json: added MASTERCODE.ts to exclude list (prevents backup file from polluting
//     type-checking — was surfacing false positives across the project)
//
// [2026-05-08] — Phase 2.5: Keyboard accessibility
//   • popup.tsx: GLOBAL_STYLES — added *:focus-visible ring (2px solid #A855F7, offset 2px)
//   • popup.tsx: tab buttons — added role="tab" + aria-selected={tab === t}
//   • popup.tsx: settings button — added aria-label="Open settings"
//   • popup.tsx: export button — added aria-label="Export report" + aria-expanded={exportOpen}
//   • popup.tsx: rescan button — added aria-label (dynamic: "Scanning…" / "Re-scan this page")
//   • options.tsx: Toggle — was a plain <div onClick>, now fully accessible:
//       role="switch", aria-checked={on}, tabIndex={0}, onKeyDown (Space/Enter toggles)
//       label prop added; focus ring uses border-radius:999px for pill shape
//   • options.tsx: all 4 Toggle instances — label prop passed with feature name
//   • options.tsx: Safe Browsing show/hide button — aria-label (Show/Hide Safe Browsing API key)
//   • options.tsx: Anthropic show/hide button — aria-label (Show/Hide Anthropic API key)
//   • options.tsx: global focus-visible styles injected via <style> tag in return
//
// [2026-05-07] — Phase 2.3: Icon set — sharp rendering + greyscale inactive variant
//   • assets/icon{16,32,48,128}.png: re-rendered from extracted 16×14 logical pixel grid
//     using nearest-neighbor at exact integer dot sizes (1/2/3/8 px per dot respectively)
//     — eliminates antialiasing blur that previous bilinear downsample introduced at 16px
//   • assets/icon{16,32,48,128}-inactive.png: greyscale (#808080) variants at all 4 sizes,
//     same logical grid, for use on restricted pages (chrome://, about:, new tab)
//   • background.ts: setIconVariant(tabId, "active"|"inactive") helper — calls
//     chrome.action.setIcon() with the correct path set for all 4 sizes
//   • background.ts: onUpdated listener extended — switches to inactive icon while tab is
//     loading or URL is non-HTTP (restricted); restores active icon on UPDATE_BADGE
//   • package.json: inactive PNG assets added to web_accessible_resources
//
// [2026-05-07] — Phase 2.2: Empty state copy
//   • popup.tsx: Trackers empty state — "No known trackers detected." →
//     "No trackers found — your activity isn't being shared with ad networks."
//   • popup.tsx: Security flags empty state — "No security flags found." →
//     "Nothing flagged — this page's content looks clean."
//   • popup.tsx: Dark patterns — changed from hidden-when-clean to always-visible section;
//     empty state: "No manipulative design patterns detected." (variant=good)
//   • popup.tsx: Fingerprinting — changed from hidden-when-clean to always-visible section;
//     empty state: "No fingerprinting scripts detected." (variant=good)
//   • popup.tsx: Password safety — changed from hidden-when-clean to always-visible section;
//     empty state: "No password security issues detected." (variant=good)
//   • popup.tsx: Permission requests — changed from hidden-when-clean to always-visible section;
//     empty state: "No unusual permission requests found." (variant=good)
//   → Both tabs now always show what was checked, even when results are clean
//
// [2026-05-07] — Phase 2.1: Onboarding page
//   • onboarding.html: first-run page opened automatically on install — covers:
//       – Hero section: what Veil is, 3 active-state badges
//       – "What Veil checks" grid (8 detectors with icons)
//       – Step 2: Google Safe Browsing API key input (saves to charlieai_settings)
//       – Step 3: Anthropic API key input (saves to charlieai_settings)
//       – Step 4: Feature toggles (hover tooltip, risky link warning, badge, notifications)
//       – "Open Full Settings" CTA → chrome.runtime.openOptionsPage()
//       – Loads existing settings on open, masks saved keys with ••••
//       – Inline JS writes directly to chrome.storage.local — no page reload needed
//   • background.ts: chrome.runtime.onInstalled listener → opens onboarding.html on reason=install
//   • package.json: web_accessible_resources += onboarding.html
//
// [2026-04-22] — HIBP breach alert, AI-generated site flag UI, privacy policy, new icons
//   • content.ts: aiGeneratedSignals now included in cachedResult (was computed but not stored)
//   • content.ts: CHECK_BREACH async call added to runProactiveScan(); breachInfo stored in
//     cachedResult; score penalty -10 if site has known breaches
//   • background.ts: breachCache Map (in-memory, per-domain)
//   • background.ts: CHECK_BREACH message handler → checkBreach()
//   • background.ts: checkBreach() fetches haveibeenpwned.com/api/v3/breaches?domain=…
//     (no API key required), sorts by BreachDate desc, caches result per domain
//   • background.ts: getAiExplanation() now receives + surfaces aiGeneratedSignals and
//     breachInfo in the prompt sent to Claude
//   • popup.tsx: ScanResult extended with aiGeneratedSignals and breachInfo
//   • popup.tsx: Privacy tab — amber "POSSIBLE AI-GENERATED CONTENT" banner
//   • popup.tsx: Security tab — amber "DATA BREACH — HaveIBeenPwned" banner with breach
//     count, most-recent name and year
//   • popup.tsx: GET_AI_EXPLANATION payload includes aiGeneratedSignals + breachInfo
//   • package.json: host_permissions += haveibeenpwned.com/*, api.anthropic.com/*
//   • package.json: web_accessible_resources added for privacy-policy.html
//   • privacy-policy.html: created — documents local-only analysis, external API calls
//     (Safe Browsing, Anthropic, HIBP), storage policy, permissions; hosted at
//     chrome.runtime.getURL("privacy-policy.html")
//   • options.tsx: Privacy Policy link in footer
//   • Icon refresh (all surfaces): replaced V pixel art with Space Invader pixel art
//       – assets/icon16/32/48/128.png — nearest-neighbor scaled from source, transparent bg
//       – popup.tsx VeilLogo()        — 18×15 inline SVG, fill #A855F7
//       – options.tsx VeilLogo()      — 20×17 inline SVG, fill #A855F7
//       – content.ts tooltip logo    — 12×10 inline SVG in HTML string
//       – content.ts warning overlay — 10×9 inline SVG in footer of overlay
//       – privacy-policy.html header — 20×17 inline SVG
//
// FILES INCLUDED IN THIS MASTERCODE:
//   1. package.json          (as block comment)
//   2. tsconfig.json         (as block comment)
//   3. background.ts
//   4. content.ts
//   5. popup.tsx
//   6. options.tsx
//   7. privacy-policy.html   (as block comment)
// ═══════════════════════════════════════════════════════════════════════════════


// ───────────────────────────────────────────────────────────────────────────────
// FILE 1: package.json
// ───────────────────────────────────────────────────────────────────────────────
/*
{
  "name": "veil",
  "displayName": "Veil",
  "version": "0.1.0",
  "description": "Your personal AI-powered privacy companion.",
  "author": "Oates Technology",
  "scripts": {
    "dev": "plasmo dev",
    "build": "plasmo build",
    "package": "plasmo package"
  },
  "dependencies": {
    "plasmo": "0.90.5",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  },
  "devDependencies": {
    "@ianvs/prettier-plugin-sort-imports": "4.1.1",
    "@types/chrome": "0.0.258",
    "@types/node": "20.11.5",
    "@types/react": "18.2.48",
    "@types/react-dom": "18.2.18",
    "prettier": "3.2.4",
    "typescript": "5.3.3"
  },
  "icons": {
    "16": "assets/icon16.png",
    "32": "assets/icon32.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  },
  "manifest": {
    "host_permissions": [
      "https://*/*",
      "http://*/*",
      "https://safebrowsing.googleapis.com/*",
      "https://haveibeenpwned.com/*",
      "https://api.anthropic.com/*"
    ],
    "permissions": [
      "storage",
      "notifications",
      "tabs",
      "activeTab"
    ],
    "web_accessible_resources": [
      {
        "resources": ["privacy-policy.html"],
        "matches": ["<all_urls>"]
      }
    ]
  }
}
*/


// ───────────────────────────────────────────────────────────────────────────────
// FILE 2: tsconfig.json
// ───────────────────────────────────────────────────────────────────────────────
/*
{
  "extends": "plasmo/templates/tsconfig.base",
  "exclude": ["node_modules", "MASTERCODE.ts"],
  "include": [
    ".plasmo/index.d.ts",
    "./**/*.ts",
    "./**/*.tsx"
  ],
  "compilerOptions": {
    "paths": { "~*": ["./*"] },
    "baseUrl": "."
  }
}
*/


// ───────────────────────────────────────────────────────────────────────────────
// FILE 3: background.ts
// ───────────────────────────────────────────────────────────────────────────────

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

// ─── Settings ─────────────────────────────────────────────────────────────────
async function getSettings(): Promise<{ notifications: boolean; safeBrowsingKey: string; anthropicKey: string; iconBadge: boolean; linkHoverTooltip: boolean; linkClickInterceptor: boolean }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (data) => {
      resolve(data[SETTINGS_KEY] || { notifications: false, safeBrowsingKey: "", anthropicKey: "", linkHoverTooltip: false, linkClickInterceptor: false, iconBadge: false })
    })
  })
}

// ─── Safe Browsing API ─────────────────────────────────────────────────────────
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
  chrome.storage.local.get(SETTINGS_KEY, (data) => {
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


// ───────────────────────────────────────────────────────────────────────────────
// FILE 4: content.ts
// ───────────────────────────────────────────────────────────────────────────────

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"]
}

// ─── Edge-Case Guard ──────────────────────────────────────────────────────────
// Skip tabs where DOM scanning would throw or be meaningless
const BLOCKED_HOSTS = new Set([
  "app.notion.com",        // complex SPA — avoid noise
])

function shouldSkip(): boolean {
  try {
    if (!document.body) return true
    if (document.contentType === "application/pdf") return true
    const proto = location.protocol
    if (proto !== "http:" && proto !== "https:") return true
    if (BLOCKED_HOSTS.has(location.hostname)) return true
    return false
  } catch {
    return true
  }
}

// ─── Safe Message Sender ──────────────────────────────────────────────────────
// Silences "Extension context invalidated" errors after extension updates
function safeSend(message: object, callback?: (r: any) => void) {
  try {
    if (!chrome?.runtime?.id) return
    if (callback) {
      chrome.runtime.sendMessage(message, callback)
    } else {
      chrome.runtime.sendMessage(message)
    }
  } catch {
    // Extension context gone — silently ignore
  }
}

// ─── Tracker Map ──────────────────────────────────────────────────────────────
const TRACKER_MAP: Record<string, string> = {
  "google-analytics.com": "Google Analytics",
  "googletagmanager.com": "Google Tag Manager",
  "connect.facebook.net": "Meta Pixel",
  "facebook.com/tr": "Meta Pixel",
  "analytics.tiktok.com": "TikTok Pixel",
  "ads-twitter.com": "X (Twitter) Ads",
  "snap.licdn.com": "LinkedIn Insight",
  "ads.linkedin.com": "LinkedIn Ads",
  "static.hotjar.com": "Hotjar",
  "cdn.mxpanel.com": "Mixpanel",
  "cdn.segment.com": "Segment",
  "cdn.amplitude.com": "Amplitude",
  "widget.intercom.io": "Intercom",
  "js.hs-scripts.com": "HubSpot",
  "js.hs-analytics.net": "HubSpot",
  "crisp.chat": "Crisp Chat",
  "clarity.ms": "Microsoft Clarity",
  "platform.twitter.com": "X Embed",
  "doubleclick.net": "Google DoubleClick",
  "adservice.google.com": "Google Ads",
  "scorecardresearch.com": "Comscore",
  "quantserve.com": "Quantcast",
  "outbrain.com": "Outbrain",
  "taboola.com": "Taboola",
  "pubmatic.com": "PubMatic",
  "rubiconproject.com": "Rubicon/Magnite"
}

// ─── Detect Trackers ──────────────────────────────────────────────────────────
function detectTrackers(): string[] {
  try {
    const found = new Set<string>()
    const currentHost = location.hostname
    const checkSrc = (src: string) => {
      const s = src.toLowerCase()
      for (const [domain, name] of Object.entries(TRACKER_MAP)) {
        if (s.includes(domain)) found.add(name)
      }
    }
    try { document.querySelectorAll("script[src]").forEach((el) => checkSrc((el as HTMLScriptElement).src)) } catch {}
    try { document.querySelectorAll("iframe[src]").forEach((el) => checkSrc((el as HTMLIFrameElement).src)) } catch {}
    try {
      document.querySelectorAll("img[src]").forEach((el) => {
        const src = (el as HTMLImageElement).src
        if (!src.includes(currentHost)) checkSrc(src)
      })
    } catch {}
    return Array.from(found)
  } catch { return [] }
}

// ─── Count Cookies ────────────────────────────────────────────────────────────
function countCookies(): number {
  try {
    return document.cookie
      ? document.cookie.split(";").filter((c) => c.trim().length > 0).length
      : 0
  } catch { return 0 }
}

// ─── Detect Dark Patterns ─────────────────────────────────────────────────────
function detectDarkPatterns(): string[] {
  try {
    const patterns = new Set<string>()
    const bodyText = document.body?.innerText ?? ""

    try {
      document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked').forEach((cb) => {
        const label =
          cb.closest("label")?.textContent ||
          document.querySelector(`label[for="${cb.id}"]`)?.textContent || ""
        if (/newsletter|subscribe|marketing|promotional|offers|updates|emails/i.test(label))
          patterns.add("Pre-checked marketing consent checkbox")
      })
    } catch {}

    if (/\d{1,2}\s*:\s*\d{2}\s*:\s*\d{2}/.test(bodyText) ||
        /offer ends in|only \d+ (left|remaining)|limited time/i.test(bodyText))
      patterns.add("Countdown timer / artificial urgency")

    if (/no thanks,?\s*i (don'?t|hate|prefer not)/i.test(bodyText) ||
        /i don'?t want (to save|deals|discounts|offers)/i.test(bodyText))
      patterns.add("Confirm-shaming opt-out language")

    try {
      document.querySelectorAll<HTMLElement>("a, button, span").forEach((el) => {
        if (!/unsubscribe|opt.?out/i.test(el.textContent || "")) return
        const s = window.getComputedStyle(el)
        if (parseFloat(s.fontSize) < 10 || parseFloat(s.opacity) < 0.3)
          patterns.add("Hidden or near-invisible unsubscribe link")
      })
    } catch {}

    if (/free trial/i.test(bodyText) && /credit card/i.test(bodyText))
      patterns.add("Free trial requiring credit card")

    if (/subscribe|sign up/i.test(bodyText) && !/cancel|unsubscribe/i.test(bodyText))
      patterns.add("Subscription with no visible cancel option")

    try {
      Array.from(document.querySelectorAll<HTMLElement>("button, a, span"))
        .filter((el) => /skip|no thanks|maybe later/i.test(el.textContent || ""))
        .forEach((el) => {
          if (parseFloat(window.getComputedStyle(el).fontSize) < 11)
            patterns.add("Misdirection: skip option hidden in tiny text")
        })
    } catch {}

    return Array.from(patterns)
  } catch { return [] }
}

// ─── Page Security Flags ──────────────────────────────────────────────────────
function detectPageFlags(): string[] {
  try {
    const flags: string[] = []
    const pageText = (document.body?.innerText ?? "").toLowerCase()
    const currentHost = location.hostname

    try { if (document.querySelectorAll('input[type="password"]').length > 0) flags.push("Password field on page") } catch {}

    if (/act (now|immediately)|urgent(ly)?|immediate action|expire[sd]? (today|in \d)/i.test(pageText))
      flags.push("Urgency language detected")

    const phishPhrases = ["verify your account","confirm your identity","update your billing",
      "your payment failed","we have detected unusual activity","click here to confirm","your account will be suspended"]
    if (phishPhrases.some((p) => pageText.includes(p))) flags.push("Phishing language detected")

    if (pageText.includes("credit card") || pageText.includes("card number")) flags.push("Credit card info requested")
    if (pageText.includes("social security") || pageText.includes("ssn")) flags.push("SSN / government ID requested")

    try {
      document.querySelectorAll("form").forEach((form) => {
        const action = form.getAttribute("action") || ""
        if (action.startsWith("http") && !action.includes(currentHost))
          flags.push("Form submits to external domain")
      })
    } catch {}

    try { if (document.querySelectorAll('input[type="hidden"]').length > 10) flags.push("Excessive hidden form fields") } catch {}

    try {
      const extScripts = Array.from(document.querySelectorAll("script[src]"))
        .filter((s) => { const src = (s as HTMLScriptElement).src; return src && !src.includes(currentHost) })
      if (extScripts.length > 8) flags.push("High count of external scripts")
    } catch {}

    try {
      const bigBrands = ["paypal","amazon","google","apple","microsoft","netflix","facebook","instagram","bank of america","chase","wells fargo"]
      if (bigBrands.some((b) => document.title.toLowerCase().includes(b)) &&
          !bigBrands.some((b) => currentHost.includes(b)))
        flags.push("Brand impersonation in page title")
    } catch {}

    try {
      const shorteners = ["bit.ly","tinyurl.com","t.co","goo.gl","ow.ly","rb.gy"]
      const shortLinkCount = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .filter((a) => shorteners.some((s) => a.href.includes(s))).length
      if (shortLinkCount > 2) flags.push("Multiple shortened / obfuscated links")
    } catch {}

    return flags
  } catch { return [] }
}

// ─── Quick URL Heuristic Score ────────────────────────────────────────────────
function quickScoreUrl(url: string): { score: number; label: string; color: string; textColor: string } {
  let score = 82
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "http:") score -= 35
    if (/login|verify|signin|account|secure|update|confirm|reset|password/i.test(url)) score -= 15
    if (url.length > 100) score -= 10
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(parsed.hostname)) score -= 30
    if (parsed.hostname.split(".").length > 4) score -= 12
    const shorteners = ["bit.ly","tinyurl","t.co","goo.gl","ow.ly","rb.gy"]
    if (shorteners.some((s) => parsed.hostname.includes(s))) score -= 20
  } catch { score = 15 }
  score = Math.max(0, Math.min(100, score))
  const label     = score >= 70 ? "Looks Safe"  : score >= 45 ? "Use Caution" : "High Risk"
  const color     = score >= 70 ? "#34D399"     : score >= 45 ? "#F59E0B"     : "#EF4444"
  const textColor = score >= 70 ? "#1E7A3E"     : score >= 45 ? "#7A4F00"     : "#B91C1C"
  return { score, label, color, textColor }
}

// ─── Hover Link Tooltip ───────────────────────────────────────────────────────
let tooltip: HTMLDivElement | null = null

function ensureTooltip() {
  if (tooltip) return
  tooltip = document.createElement("div")
  tooltip.id = "__charlie_tooltip__"
  tooltip.style.cssText = `
    position:fixed;z-index:2147483647;
    background:#FFFFFF;border:0.5px solid #E2E0DB;border-radius:12px;
    padding:10px 14px;font-family:-apple-system,'SF Pro Text','Helvetica Neue',sans-serif;font-size:12px;color:#1A1A18;
    pointer-events:none;display:none;
    box-shadow:0 4px 16px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);max-width:240px;min-width:180px;
  `
  document.body.appendChild(tooltip)
}

function showTooltip(e: MouseEvent, url: string) {
  ensureTooltip()
  const { score, label, color, textColor } = quickScoreUrl(url)
  let domain = url
  try { domain = new URL(url).hostname } catch {}
  tooltip!.innerHTML = `
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
      <div style="width:18px;height:18px;background:#FFFFFF;border:0.5px solid #E2E0DB;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="12" height="10" viewBox="0 0 13 11" fill="#A855F7" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="0" width="2" height="1"/><rect x="8" y="0" width="2" height="1"/>
          <rect x="3" y="1" width="2" height="1"/><rect x="8" y="1" width="2" height="1"/>
          <rect x="3" y="2" width="7" height="1"/>
          <rect x="2" y="3" width="9" height="1"/>
          <rect x="2" y="4" width="9" height="1"/>
          <rect x="2" y="5" width="1" height="1"/><rect x="4" y="5" width="5" height="1"/><rect x="10" y="5" width="1" height="1"/>
          <rect x="0" y="6" width="13" height="1"/>
          <rect x="0" y="7" width="13" height="1"/>
          <rect x="2" y="8" width="9" height="1"/>
          <rect x="3" y="9" width="2" height="1"/><rect x="8" y="9" width="2" height="1"/>
          <rect x="3" y="10" width="2" height="1"/><rect x="8" y="10" width="2" height="1"/>
        </svg>
      </div>
      <span style="font-weight:600;color:#1A1A18;font-size:10px;letter-spacing:0.8px;text-transform:uppercase">Veil</span>
    </div>
    <div style="font-size:11px;color:#9E9C97;margin-bottom:8px;word-break:break-all;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${domain}</div>
    <div style="display:flex;align-items:center;gap:8px">
      <div style="width:34px;height:34px;flex-shrink:0;border-radius:50%;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;color:#1A1A18">${score}</div>
      <div>
        <div style="font-weight:600;color:${textColor};font-size:12px">${label}</div>
        <div style="font-size:10px;color:#9E9C97">Link risk score</div>
      </div>
    </div>
  `
  tooltip!.style.display = "block"
  positionTooltip(e)
}

function positionTooltip(e: MouseEvent) {
  if (!tooltip) return
  tooltip.style.left = `${Math.min(e.clientX + 14, window.innerWidth - 275)}px`
  tooltip.style.top  = `${Math.min(e.clientY + 14, window.innerHeight - 110)}px`
}

function hideTooltip() { if (tooltip) tooltip.style.display = "none" }

function setupLinkHover() {
  document.addEventListener("mouseover", (e) => {
    const a = (e.target as HTMLElement).closest("a")
    if (!a) { hideTooltip(); return }
    const href = (a as HTMLAnchorElement).href
    if (href && !href.startsWith("javascript:") && !href.startsWith("#")) showTooltip(e, href)
  })
  document.addEventListener("mousemove", (e) => {
    if (tooltip?.style.display !== "none") positionTooltip(e)
  })
  document.addEventListener("mouseout", (e) => {
    if ((e.target as HTMLElement).closest("a")) hideTooltip()
  })
}

// ─── Link Click Interceptor ───────────────────────────────────────────────────
function setupLinkClickInterceptor() {
  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest("a")
    if (!a) return
    const href = (a as HTMLAnchorElement).href
    if (!href || href.startsWith("javascript:") || href.startsWith("#")) return
    try { if (new URL(href).hostname === location.hostname) return } catch {}
    const { score } = quickScoreUrl(href)
    if (score < 65) {
      e.preventDefault(); e.stopPropagation(); hideTooltip()
      safeSend({ type: "SHOW_NOTIFICATION", title: "Veil — Risky Link Detected", body: `Score ${score}/100. That link looks suspicious. Be careful!` })
      showLinkWarning(href, score, () => { window.location.href = href })
    }
  }, true)
}

// ─── Inline Warning Overlay ───────────────────────────────────────────────────
function showLinkWarning(url: string, score: number, onProceed: () => void) {
  document.getElementById("__charlie_warning__")?.remove()
  let domain = url
  try { domain = new URL(url).hostname } catch {}
  const overlay = document.createElement("div")
  overlay.id = "__charlie_warning__"
  overlay.style.cssText = `position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:2147483645;display:flex;align-items:center;justify-content:center;font-family:-apple-system,'SF Pro Text','Helvetica Neue',sans-serif;`
  overlay.innerHTML = `
    <div style="background:#FFFFFF;border:0.5px solid #E2E0DB;border-radius:18px;padding:28px 24px;max-width:360px;width:90%;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06);">
      <div style="width:48px;height:48px;background:#FEE9E9;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke="#B91C1C" stroke-width="1.5" fill="none"/>
          <path d="M12 8V12M12 16H12.01" stroke="#B91C1C" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div style="font-size:17px;font-weight:600;color:#1A1A18;margin-bottom:6px;letter-spacing:-0.3px">Risky Link Detected</div>
      <div style="font-size:12px;color:#5A5955;margin-bottom:18px;line-height:1.55">Veil flagged this destination as potentially unsafe based on URL analysis.</div>
      <div style="background:#F2F1EE;border-radius:10px;padding:12px 14px;margin-bottom:16px;border:0.5px solid #E2E0DB;text-align:left">
        <div style="font-size:10px;color:#9E9C97;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:4px">Destination</div>
        <div style="font-size:12px;color:#1A1A18;word-break:break-all">${domain}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:22px">
        <div style="width:44px;height:44px;border-radius:50%;border:2.5px solid #EF4444;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:16px;color:#1A1A18">${score}</div>
        <div style="text-align:left">
          <div style="font-weight:600;color:#B91C1C;font-size:14px">High Risk Score</div>
          <div style="font-size:11px;color:#9E9C97">Out of 100</div>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <button id="__charlie_back__" style="flex:1;padding:11px;border-radius:10px;background:#F2F1EE;border:0.5px solid #E2E0DB;color:#1A1A18;font-weight:500;cursor:pointer;font-size:13px;font-family:inherit;">← Go Back</button>
        <button id="__charlie_proceed__" style="flex:1;padding:11px;border-radius:10px;background:#1A1A18;border:none;color:white;font-weight:500;cursor:pointer;font-size:13px;font-family:inherit;">Proceed Anyway</button>
      </div>
      <div style="margin-top:14px;font-size:10px;color:#C4C2BC;letter-spacing:0.2px;display:flex;align-items:center;justify-content:center;gap:5px">
        <svg width="10" height="9" viewBox="0 0 13 11" fill="#A855F7" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="0" width="2" height="1"/><rect x="8" y="0" width="2" height="1"/>
          <rect x="3" y="2" width="7" height="1"/>
          <rect x="2" y="3" width="9" height="1"/><rect x="2" y="4" width="9" height="1"/>
          <rect x="2" y="5" width="1" height="1"/><rect x="4" y="5" width="5" height="1"/><rect x="10" y="5" width="1" height="1"/>
          <rect x="0" y="6" width="13" height="1"/><rect x="0" y="7" width="13" height="1"/>
          <rect x="2" y="8" width="9" height="1"/>
          <rect x="3" y="9" width="2" height="1"/><rect x="8" y="9" width="2" height="1"/>
        </svg>
        Veil — Powered by Charlie
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  document.getElementById("__charlie_back__")?.addEventListener("click", () => overlay.remove())
  document.getElementById("__charlie_proceed__")?.addEventListener("click", () => { overlay.remove(); onProceed() })
}

// ─── AI-Generated Site Detector ──────────────────────────────────────────────
function detectAiGeneratedSite(): string[] {
  try {
  const signals: string[] = []
  const text = document.body?.innerText ?? ""
  const aiPhrases = [
    /in (this|the) (article|post|guide|blog)[,\s].{0,30}(will|shall) (explore|discuss|delve|examine|cover)/i,
    /it (is|'?s) (important|crucial|essential|worth) to note that/i,
    /without further ado/i,
    /in (today'?s|the modern) (digital )?(world|landscape|era|age)/i,
    /as (an? )?(ai|artificial intelligence) (language )?model/i,
    /in (summary|conclusion)[,\s].{0,20}(we have|we'?ve|this (article|post|guide)) (explored|discussed|covered)/i,
    /whether you('?re| are) (a|an) (beginner|novice|expert|professional),/i,
    /by (the end of this|following this) (article|guide|post)/i,
  ]
  const aiPhraseHits = aiPhrases.filter((p) => p.test(text)).length
  const hasAuthorMeta = !!document.querySelector('meta[name="author"]')?.getAttribute("content")
  const hasByline = /\bby\s+[A-Z][a-z]+ [A-Z][a-z]+|\bauthor:|\bwritten by\b|\bposted by\b/i.test(text)
  const hasDate = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b/i.test(text)
  const hasRealEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)
  if (aiPhraseHits >= 2) signals.push("AI-generated writing style detected")
  if (aiPhraseHits >= 1 && !hasByline && !hasAuthorMeta) signals.push("No human authorship signals")
  if (aiPhraseHits >= 1 && !hasDate && !hasRealEmail) signals.push("No human contact or publication date")
  return signals
  } catch { return [] }
}

// ─── Fingerprinting Shield ────────────────────────────────────────────────────
function detectFingerprinting(): string[] {
  try {
    const signals: string[] = []
    const allCode = Array.from(document.querySelectorAll("script"))
      .map((s) => (s.src ? s.src : s.textContent || "")).join(" ").toLowerCase()
    const patterns: [RegExp, string][] = [
      [/fingerprintjs|fingerprint2|fpjs|fingerprint\.js/, "Browser fingerprinting library (FingerprintJS)"],
      [/clientjs|client\.js/,                              "Browser fingerprinting library (ClientJS)"],
      [/todataurl.*canvas|canvas.*todataurl/,              "Canvas fingerprinting detected"],
      [/audiocontext|offlineaudiocontext/,                 "Audio fingerprinting detected"],
      [/webgl.*getparameter|getparameter.*webgl/,          "WebGL fingerprinting detected"],
      [/navigator\.plugins.*length|plugins.*navigator/,    "Plugin enumeration detected"],
      [/screen\.colorDepth|screen\.pixelDepth/,            "Screen fingerprinting detected"],
    ]
    for (const [pattern, label] of patterns) {
      if (pattern.test(allCode)) signals.push(label)
    }
    return signals
  } catch { return [] }
}

// ─── Cookie Consent Grader ────────────────────────────────────────────────────
function gradeCookieConsent(): { grade: string; issues: string[] } {
  try {
    const bodyText = document.body?.innerText ?? ""
    const hasBanner = /cookie|consent|gdpr/i.test(bodyText) && /accept|agree|allow/i.test(bodyText)
    if (!hasBanner) return { grade: "N/A", issues: [] }
    const issues: string[] = []
    if (!/reject all|decline all|deny all|refuse all/i.test(bodyText)) issues.push('No "reject all" option')
    if (!/necessary only|essential only|reject non-essential/i.test(bodyText)) issues.push('No "essential only" option')
    try {
      const preChecked = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked'))
        .some((cb) => {
          const label = cb.closest("label")?.textContent || document.querySelector(`label[for="${cb.id}"]`)?.textContent || ""
          return /marketing|analytics|advertising|targeting|social/i.test(label)
        })
      if (preChecked) issues.push("Marketing cookies pre-checked")
    } catch {}
    if (/we share your data|sold to partners|third.party advertising/i.test(bodyText)) issues.push("Admits selling data to third parties")
    const grade = issues.length === 0 ? "A" : issues.length === 1 ? "B" : issues.length === 2 ? "C" : "D"
    return { grade, issues }
  } catch { return { grade: "N/A", issues: [] } }
}

// ─── Password Field Safety ────────────────────────────────────────────────────
function checkPasswordSafety(): string[] {
  try {
    const warnings: string[] = []
    const host = location.hostname
    document.querySelectorAll("form").forEach((form) => {
      try {
        if (!form.querySelector('input[type="password"]')) return
        if (location.protocol === "http:") warnings.push("Password submitted over unencrypted HTTP")
        const action = form.getAttribute("action") || ""
        if (action.startsWith("http://")) warnings.push("Login form posts to non-HTTPS endpoint")
        if (action.startsWith("http") && !action.includes(host)) warnings.push("Login form submits to a different domain")
      } catch {}
    })
    return [...new Set(warnings)]
  } catch { return [] }
}

// ─── Data Broker Detector ─────────────────────────────────────────────────────
function isDataBrokerSite(): boolean {
  try {
    const DATA_BROKERS = [
      "spokeo.com","whitepages.com","intelius.com","beenverified.com",
      "truthfinder.com","instantcheckmate.com","peoplefinder.com",
      "mylife.com","radaris.com","acxiom.com","epsilon.com",
      "pipl.com","peekyou.com","zabasearch.com","usersearch.org",
      "fastpeoplesearch.com","peoplelooker.com","privateye.com",
      "archives.com","addresses.com","anywho.com","411.com",
    ]
    const host = location.hostname.replace(/^www\./, "")
    return DATA_BROKERS.some((b) => host === b || host.endsWith("." + b))
  } catch { return false }
}

// ─── AI Phishing Detector ─────────────────────────────────────────────────────
function detectAiPhishing(): string[] {
  try {
    const signals: string[] = []
    const text = document.body?.innerText ?? ""
    const hasUrgency = /immediately|urgent|within 24 hours|account.*suspend|verify.*now|action required|limited time/i.test(text)
    const asksCredentials = /enter.*password|confirm.*login|verify.*identity|update.*payment|provide.*card/i.test(text)
    const asksPersonalInfo = /social security|date of birth|mother.*maiden|national id|passport number/i.test(text)
    const fakeOfficial = /official notice|security department|compliance team|fraud prevention team/i.test(text)
    const brandSpoofInText = /paypal|amazon|apple|microsoft|google|netflix|bank of america|chase|wells fargo/i.test(text)
    const isBrandDomain = /paypal|amazon|apple|microsoft|google|netflix|bankofamerica|chase|wellsfargo/i.test(location.hostname)
    if (hasUrgency && asksCredentials) signals.push("Urgency + credential request (AI phishing pattern)")
    if (hasUrgency && asksPersonalInfo) signals.push("Urgency + personal info request")
    if (fakeOfficial && !isBrandDomain && brandSpoofInText) signals.push("Fake official communication from impersonated brand")
    try {
      const host = location.hostname.replace(/^www\./, "")
      const BRANDS = ["paypal","amazon","google","apple","microsoft","netflix","facebook","instagram","twitter","chase","wellsfargo","bankofamerica"]
      for (const brand of BRANDS) {
        if (!host.includes(brand)) {
          const normalized = host.replace(/0/g,"o").replace(/1/g,"l").replace(/rn/g,"m").replace(/vv/g,"w").replace(/-/g,"")
          if (normalized.includes(brand) || levenshtein(host.replace(/\.[^.]+$/,""), brand) <= 2) {
            signals.push(`Possible typosquat of "${brand}"`)
            break
          }
        }
      }
    } catch {}
    return signals
  } catch { return [] }
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

// ─── Permission Audit ─────────────────────────────────────────────────────────
function auditPermissions(): string[] {
  try {
    const issues: string[] = []
    const scripts = Array.from(document.querySelectorAll("script")).map((s) => s.textContent || "").join(" ").toLowerCase()
    if (scripts.includes("getusermedia") || scripts.includes("mediadevices")) issues.push("Requests camera/microphone access")
    if (scripts.includes("geolocation")) issues.push("Requests location access")
    if (scripts.includes("notifications") && scripts.includes("requestpermission")) issues.push("Requests notification permission")
    return issues
  } catch { return [] }
}

// ─── Proactive Auto-Scan on Page Load ────────────────────────────────────────
let cachedResult: any = null

async function runProactiveScan() {
  // Each detector is individually guarded — one bad page can't crash the scan
  const flags               = (() => { try { return detectPageFlags()        } catch { return [] } })()
  const trackers            = (() => { try { return detectTrackers()          } catch { return [] } })()
  const darkPatterns        = (() => { try { return detectDarkPatterns()      } catch { return [] } })()
  const cookieCount         = (() => { try { return countCookies()            } catch { return 0  } })()
  const fingerprintingSignals = (() => { try { return detectFingerprinting()  } catch { return [] } })()
  const cookieConsent       = (() => { try { return gradeCookieConsent()      } catch { return { grade: "N/A", issues: [] } } })()
  const passwordWarnings    = (() => { try { return checkPasswordSafety()     } catch { return [] } })()
  const dataBroker          = (() => { try { return isDataBrokerSite()        } catch { return false } })()
  const aiPhishingSignals   = (() => { try { return detectAiPhishing()        } catch { return [] } })()
  const permissionIssues    = (() => { try { return auditPermissions()        } catch { return [] } })()
  const aiGeneratedSignals  = (() => { try { return detectAiGeneratedSite()   } catch { return [] } })()

  const url = location.href

  let score = 82
  if (url.startsWith("http://")) score -= 35
  if (/login|verify|signin|account|secure|update|confirm|reset|password/i.test(url)) score -= 15
  if (url.length > 100) score -= 10
  if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(location.hostname)) score -= 30
  if (location.hostname.split(".").length > 4) score -= 12
  score = Math.max(0, score
    - flags.length * 8
    - trackers.length * 2
    - darkPatterns.length * 8    // raised 5→8: single dark pattern should meaningfully impact score
    - fingerprintingSignals.length * 6
    - passwordWarnings.length * 12
    - aiPhishingSignals.length * 15
    - aiGeneratedSignals.length * 5
    - (dataBroker ? 37 : 0)     // raised 20→37: data brokers should land in HIGH RISK
    - (cookieConsent.grade === "D" ? 8 : cookieConsent.grade === "C" ? 4 : 0)
  )

  // ── Safe Browsing check ──
  let isMalicious = false
  let threats: string[] = []
  try {
    const sbResult = await new Promise<any>((resolve) => {
      safeSend({ type: "CHECK_SAFE_BROWSING", url }, resolve)
    })
    if (sbResult?.checked && !sbResult.safe) {
      isMalicious = true; threats = sbResult.threats || []
      score = Math.max(0, score - 50)
    }
  } catch {}

  // ── HIBP breach check ──
  let breachInfo: { breached: boolean; name?: string; date?: string; count?: number } = { breached: false }
  try {
    const domain = location.hostname.replace(/^www\./, "")
    const bResult = await new Promise<any>((resolve) => {
      safeSend({ type: "CHECK_BREACH", domain }, resolve)
    })
    if (bResult) { breachInfo = bResult; if (bResult.breached) score = Math.max(0, score - 10) }
  } catch {}

  cachedResult = {
    flags, trackers, cookieCount, darkPatterns, isMalicious, threats,
    fingerprintingSignals, cookieConsent, passwordWarnings, dataBroker,
    aiPhishingSignals, permissionIssues, aiGeneratedSignals, breachInfo,
  }

  safeSend({ type: "UPDATE_BADGE", score, isMalicious, trackers: trackers.length, flags: flags.length, host: location.hostname })

  if (isMalicious) {
    safeSend({ type: "SHOW_NOTIFICATION", title: "⚠️ Veil — Threat Detected", body: `This site was flagged by Google Safe Browsing: ${threats[0] ?? "potential threat"}.` })
  } else if (aiPhishingSignals.length > 0) {
    safeSend({ type: "SHOW_NOTIFICATION", title: "Veil — AI Phishing Pattern Detected", body: `${aiPhishingSignals[0]} on ${location.hostname}` })
  } else if (dataBroker) {
    safeSend({ type: "SHOW_NOTIFICATION", title: "Veil — Data Broker Site", body: `${location.hostname} is a known data broker that may sell your personal information.` })
  } else if (score < 65 && (flags.length >= 2 || darkPatterns.length >= 1)) {
    const total = flags.length + darkPatterns.length
    safeSend({ type: "SHOW_NOTIFICATION", title: "Veil — Suspicious Page", body: `${total} risk signal${total !== 1 ? "s" : ""} detected on ${location.hostname}. Score: ${score}/100` })
  }
}

// ─── Message Listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCAN_PAGE") {
    if (cachedResult) { sendResponse(cachedResult) }
    else { runProactiveScan().then(() => sendResponse(cachedResult)) }
    return true
  }
  if (message.type === "RESCAN") {
    cachedResult = null
    runProactiveScan().then(() => sendResponse(cachedResult))
    return true
  }
})

// ─── Settings Helper ──────────────────────────────────────────────────────────
async function getFeatureSettings(): Promise<{ linkHoverTooltip: boolean; linkClickInterceptor: boolean }> {
  return new Promise((resolve) => {
    chrome.storage.local.get("charlieai_settings", (data) => {
      const s = data["charlieai_settings"] || {}
      resolve({ linkHoverTooltip: s.linkHoverTooltip ?? false, linkClickInterceptor: s.linkClickInterceptor ?? false })
    })
  })
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    if (shouldSkip()) return
    const { linkHoverTooltip, linkClickInterceptor } = await getFeatureSettings()
    runProactiveScan()
    if (linkHoverTooltip) setupLinkHover()
    if (linkClickInterceptor) setupLinkClickInterceptor()
  } catch {
    // Fail silently — never surface errors to the page console
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}


// ───────────────────────────────────────────────────────────────────────────────
// FILE 5: popup.tsx
// ───────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react"

type RiskBand = "safe" | "caution" | "danger"
type Tab = "privacy" | "security"

interface ScanResult {
  trackers: string[]
  cookieCount: number
  flags: string[]
  darkPatterns: string[]
  isMalicious?: boolean
  threats?: string[]
  fingerprintingSignals?: string[]
  cookieConsent?: { grade: string; issues: string[] }
  passwordWarnings?: string[]
  dataBroker?: boolean
  aiPhishingSignals?: string[]
  permissionIssues?: string[]
  aiGeneratedSignals?: string[]
  breachInfo?: { breached: boolean; name?: string; date?: string; count?: number }
}

const THREAT_LABELS: Record<string, string> = {
  MALWARE:                         "Malware",
  SOCIAL_ENGINEERING:              "Phishing / Social Engineering",
  UNWANTED_SOFTWARE:               "Unwanted Software",
  POTENTIALLY_HARMFUL_APPLICATION: "Potentially Harmful App",
}
const THREAT_DESCRIPTIONS: Record<string, string> = {
  MALWARE:                         "This site may try to install harmful software on your device.",
  SOCIAL_ENGINEERING:              "This site is designed to steal your passwords or personal information.",
  UNWANTED_SOFTWARE:               "This site may install software that changes your browser settings.",
  POTENTIALLY_HARMFUL_APPLICATION: "This site may distribute apps that could harm your device.",
}

const tokens = {
  bgPage: "#F2F1EE", bgSurface: "#FFFFFF", bgSunk: "#EDECE9", bgInput: "#E8E7E3",
  textPrimary: "#1A1A18", textSecondary: "#5A5955", textTertiary: "#9E9C97", textDisabled: "#C4C2BC",
  borderDefault: "#E2E0DB", borderStrong: "#CBC9C3",
  green: "#1E7A3E", greenBg: "#E6F4EC", greenRing: "#34D399",
  amber: "#7A4F00", amberBg: "#FFF3D6", amberRing: "#F59E0B",
  red: "#B91C1C", redBg: "#FEE9E9", redRing: "#EF4444",
  logoMark: "#1A1A18", radius: "12px", radiusSm: "8px", radiusPill: "999px",
}

function getStatusConfig(band: RiskBand) {
  if (band === "safe")    return { label: "Protected",      color: tokens.green, bg: tokens.greenBg, ring: tokens.greenRing }
  if (band === "caution") return { label: "Review advised", color: tokens.amber, bg: tokens.amberBg, ring: tokens.amberRing }
  return                         { label: "High risk",      color: tokens.red,   bg: tokens.redBg,   ring: tokens.redRing   }
}
function getBand(score: number): RiskBand {
  if (score >= 70) return "safe"
  if (score >= 45) return "caution"
  return "danger"
}

function ScoreRing({ score, band }: { score: number; band: RiskBand }) {
  const { ring } = getStatusConfig(band)
  const r = 24, circ = 2 * Math.PI * r, filled = (score / 100) * circ
  return (
    <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
      <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: "absolute", top: 0, left: 0 }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke={tokens.borderDefault} strokeWidth="5" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={ring} strokeWidth="5"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" transform="rotate(-90 30 30)"
          style={{ transition: "stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1), stroke 0.4s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 500, color: tokens.textPrimary, fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "-0.5px" }}>
        {score}
      </div>
    </div>
  )
}

// Space Invader pixel art logo (13×11 grid, purple #A855F7)
function VeilLogo() {
  return (
    <svg width="18" height="15" viewBox="0 0 13 11" fill="#A855F7" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="0" width="2" height="1"/><rect x="8" y="0" width="2" height="1"/>
      <rect x="3" y="1" width="2" height="1"/><rect x="8" y="1" width="2" height="1"/>
      <rect x="3" y="2" width="7" height="1"/>
      <rect x="2" y="3" width="9" height="1"/>
      <rect x="2" y="4" width="9" height="1"/>
      <rect x="2" y="5" width="1" height="1"/><rect x="4" y="5" width="5" height="1"/><rect x="10" y="5" width="1" height="1"/>
      <rect x="0" y="6" width="13" height="1"/>
      <rect x="0" y="7" width="13" height="1"/>
      <rect x="2" y="8" width="9" height="1"/>
      <rect x="3" y="9" width="2" height="1"/><rect x="8" y="9" width="2" height="1"/>
      <rect x="3" y="10" width="2" height="1"/><rect x="8" y="10" width="2" height="1"/>
    </svg>
  )
}

function Chip({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <div style={{ fontSize: 11, padding: "3px 9px", borderRadius: tokens.radiusPill,
      border: `0.5px solid ${highlight ? "#F5C96A" : tokens.borderDefault}`,
      background: highlight ? "#FFF6E6" : tokens.bgSunk,
      color: highlight ? "#7A4F00" : tokens.textSecondary, lineHeight: 1.6 }}>
      {label}
    </div>
  )
}

function FlagRow({ text, type = "warn" }: { text: string; type?: "warn" | "info" }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "7px 0", borderBottom: `0.5px solid ${tokens.borderDefault}` }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: type === "warn" ? tokens.amberRing : tokens.greenRing, flexShrink: 0, marginTop: 5 }} />
      <span style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>{text}</span>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "12px 18px", background: tokens.bgSurface, borderBottom: `0.5px solid ${tokens.borderDefault}` }}>{children}</div>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.8px", textTransform: "uppercase", color: tokens.textTertiary, marginBottom: 8 }}>{children}</div>
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ fontSize: 12, color: tokens.textDisabled, margin: 0, padding: "2px 0" }}>{text}</p>
}

export default function IndexPopup() {
  const [url, setUrl]               = useState("")
  const [domain, setDomain]         = useState("")
  const [score, setScore]           = useState(0)
  const [band, setBand]             = useState<RiskBand>("safe")
  const [trackers, setTrackers]     = useState<string[]>([])
  const [cookies, setCookies]       = useState(0)
  const [flags, setFlags]           = useState<string[]>([])
  const [darkPats, setDarkPats]     = useState<string[]>([])
  const [isMalicious, setIsMalicious] = useState(false)
  const [threats, setThreats]       = useState<string[]>([])
  const [fingerprinting, setFingerprinting] = useState<string[]>([])
  const [cookieConsent, setCookieConsent] = useState<{ grade: string; issues: string[] } | null>(null)
  const [passwordWarnings, setPasswordWarnings] = useState<string[]>([])
  const [dataBroker, setDataBroker] = useState(false)
  const [aiPhishing, setAiPhishing] = useState<string[]>([])
  const [permissionIssues, setPermissionIssues] = useState<string[]>([])
  const [aiGenerated, setAiGenerated] = useState<string[]>([])
  const [breachInfo, setBreachInfo] = useState<{ breached: boolean; name?: string; date?: string; count?: number } | null>(null)
  const [loading, setLoading]       = useState(true)
  const [hasFullData, setHasFullData] = useState(false)
  const [tab, setTab]               = useState<Tab>("privacy")
  const [scanning, setScanning]     = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)

  const statusConfig = getStatusConfig(band)

  function computeUrlScore(u: string): number {
    let s = 85
    if (u.startsWith("http://")) s -= 35
    if (/login|verify|signin|confirm|reset/i.test(u)) s -= 12
    if (u.length > 100) s -= 8
    try { if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(new URL(u).hostname)) s -= 25 } catch {}
    return Math.max(0, Math.min(100, s))
  }

  function computeScore(result: ScanResult, u: string): number {
    let s = 85
    if (u.startsWith("http://")) s -= 35
    if (/login|verify|signin|confirm|reset/i.test(u)) s -= 12
    if (u.length > 100) s -= 8
    try { if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(new URL(u).hostname)) s -= 25 } catch {}
    s -= result.flags.length * 7
    s -= result.trackers.length * 2
    s -= result.darkPatterns.length * 4
    if (result.cookieCount > 10) s -= 8
    if (result.isMalicious) s -= 50
    return Math.max(0, Math.min(100, s))
  }

  function applyFullResult(response: any, currentUrl: string) {
    const result: ScanResult = {
      trackers:     response.trackers     || [],
      cookieCount:  response.cookieCount  || 0,
      flags:        response.flags        || [],
      darkPatterns: response.darkPatterns || [],
      isMalicious:  response.isMalicious  || false,
      threats:      response.threats      || [],
    }
    const computed = computeScore(result, currentUrl)
    setScore(computed); setBand(getBand(computed))
    setTrackers(result.trackers); setCookies(result.cookieCount)
    setFlags(result.flags); setDarkPats(result.darkPatterns)
    setIsMalicious(result.isMalicious ?? false); setThreats(result.threats ?? [])
    setFingerprinting(response.fingerprintingSignals ?? [])
    setCookieConsent(response.cookieConsent ?? null)
    setPasswordWarnings(response.passwordWarnings ?? [])
    setDataBroker(response.dataBroker ?? false)
    setAiPhishing(response.aiPhishingSignals ?? [])
    setPermissionIssues(response.permissionIssues ?? [])
    setAiGenerated(response.aiGeneratedSignals ?? [])
    setBreachInfo(response.breachInfo ?? null)
    setHasFullData(true); setLoading(false); setScanning(false)

    setAiExplanation(null)
    chrome.runtime.sendMessage({
      type: "GET_AI_EXPLANATION",
      data: {
        url: currentUrl, score: computed, band: getBand(computed),
        trackers: result.trackers, cookieCount: result.cookieCount,
        flags: result.flags, darkPatterns: result.darkPatterns,
        isMalicious: result.isMalicious ?? false, threats: result.threats ?? [],
        fingerprintingSignals: response.fingerprintingSignals ?? [],
        cookieConsent: response.cookieConsent ?? null,
        passwordWarnings: response.passwordWarnings ?? [],
        dataBroker: response.dataBroker ?? false,
        aiPhishingSignals: response.aiPhishingSignals ?? [],
        permissionIssues: response.permissionIssues ?? [],
        aiGeneratedSignals: response.aiGeneratedSignals ?? [],
        breachInfo: response.breachInfo ?? null,
      },
    }, (resp) => { if (resp?.explanation) setAiExplanation(resp.explanation) })
  }

  function runScan() {
    setScanning(true); setHasFullData(false)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || ""
      const tabId = tabs[0]?.id!
      setUrl(currentUrl)
      try { setDomain(new URL(currentUrl).hostname) } catch { setDomain(currentUrl) }
      const urlScore = computeUrlScore(currentUrl)
      setScore(urlScore); setBand(getBand(urlScore)); setLoading(false)
      chrome.runtime.sendMessage({ type: "GET_CACHED_SCAN", tabId }, (cached) => {
        if (cached) { applyFullResult(cached, currentUrl); return }
        chrome.tabs.sendMessage(tabId, { type: "SCAN_PAGE" }, (response) => {
          if (chrome.runtime.lastError || !response) { setHasFullData(true); setScanning(false); return }
          applyFullResult(response, currentUrl)
        })
      })
    })
  }

  useEffect(() => { runScan() }, [])

  const cookieSeverity = cookies > 10 ? "high" : cookies > 4 ? "moderate" : "low"
  const cookieBadgeStyle = { high: { bg: tokens.redBg, color: tokens.red }, moderate: { bg: tokens.amberBg, color: tokens.amber }, low: { bg: tokens.greenBg, color: tokens.green } }[cookieSeverity]

  const tabStyle = (t: Tab) => ({
    fontSize: 12, padding: "9px 12px 8px", cursor: "pointer",
    color: tab === t ? tokens.textPrimary : tokens.textTertiary,
    fontWeight: tab === t ? 500 : 400,
    background: "none", border: "none",
    borderBottomStyle: "solid" as const, borderBottomWidth: "1.5px",
    borderBottomColor: tab === t ? tokens.textPrimary : "transparent",
    marginBottom: "-0.5px", fontFamily: "inherit",
  })

  const fallbackExplanation = !hasFullData ? "Analyzing page…"
    : isMalicious && threats.length > 0
      ? `Google Safe Browsing flagged this site as ${THREAT_LABELS[threats[0]] ?? threats[0]}. Do not enter any personal information here.`
      : band === "safe"
        ? `This site has ${trackers.length > 0 ? `${trackers.length} tracker${trackers.length !== 1 ? "s" : ""}` : "no known trackers"} and ${cookies} cookie${cookies !== 1 ? "s" : ""}. Nothing unexpected.`
        : band === "caution"
          ? `This site collects data through ${trackers.length} tracker${trackers.length !== 1 ? "s" : ""}. Your browsing behavior may be shared with third parties.`
          : `Multiple risk signals detected. Avoid entering personal information on this page.`

  const explanation = aiExplanation ?? fallbackExplanation
  const isAiExplanation = aiExplanation !== null && hasFullData

  return (
    <div style={{ width: 340, background: tokens.bgPage, fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif", fontSize: 14, color: tokens.textPrimary, borderRadius: 18, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "15px 18px", background: tokens.bgSurface, borderBottom: `0.5px solid ${tokens.borderDefault}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: tokens.logoMark, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <VeilLogo />
          </div>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.3px", color: tokens.textPrimary }}>Veil</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: tokens.radiusPill, background: statusConfig.bg, color: statusConfig.color }}>
          {statusConfig.label}
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: "16px 18px 14px", background: tokens.bgSurface, borderBottom: `0.5px solid ${tokens.borderDefault}`, display: "flex", alignItems: "center", gap: 14 }}>
        <ScoreRing score={loading ? 0 : score} band={band} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: tokens.textTertiary, marginBottom: 3, letterSpacing: "0.3px" }}>Trust score</div>
          <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55, wordBreak: "break-word" }}>
            <span style={{ fontWeight: 500, color: tokens.textPrimary }}>{domain}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: tokens.bgSurface, borderBottom: `0.5px solid ${tokens.borderDefault}`, padding: "0 18px" }}>
        <button style={tabStyle("privacy")} onClick={() => setTab("privacy")}>Privacy</button>
        <button style={tabStyle("security")} onClick={() => setTab("security")}>Security</button>
      </div>

      {/* Privacy Tab */}
      {tab === "privacy" && (
        <>
          <Section>
            <SectionTitle>Trackers found</SectionTitle>
            {!hasFullData ? <EmptyState text="Checking…" /> : trackers.length === 0 ? <EmptyState text="No trackers found — your activity isn't being shared with ad networks." variant="good" /> :
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {trackers.map((t, i) => <Chip key={i} label={t} highlight={/meta|tiktok|doubleclick|facebook/i.test(t)} />)}
              </div>}
          </Section>

          <Section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 500, color: tokens.textPrimary, fontFamily: "Georgia, serif" }}>{!hasFullData ? "—" : cookies}</div>
                <div style={{ fontSize: 11, color: tokens.textTertiary, marginTop: 1 }}>Cookies set</div>
              </div>
              {hasFullData && (
                <span style={{ fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: tokens.radiusPill, background: cookieBadgeStyle.bg, color: cookieBadgeStyle.color }}>
                  {cookieSeverity.charAt(0).toUpperCase() + cookieSeverity.slice(1)}
                </span>
              )}
            </div>
          </Section>

          {darkPats.length > 0 && (
            <Section>
              <SectionTitle>Dark patterns</SectionTitle>
              {darkPats.map((p, i) => <FlagRow key={i} text={p} type="warn" />)}
            </Section>
          )}

          {hasFullData && fingerprinting.length > 0 && (
            <Section>
              <SectionTitle>Fingerprinting</SectionTitle>
              {fingerprinting.map((f, i) => <FlagRow key={i} text={f} type="warn" />)}
            </Section>
          )}

          {hasFullData && aiGenerated.length > 0 && (
            <Section>
              <div style={{ padding: "10px 12px", background: tokens.amberBg, border: `1px solid ${tokens.amberRing}`, borderRadius: tokens.radiusSm, marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: tokens.amber, letterSpacing: "0.5px", marginBottom: 4 }}>🤖 POSSIBLE AI-GENERATED CONTENT</div>
                {aiGenerated.map((s, i) => <div key={i} style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>{s}</div>)}
              </div>
            </Section>
          )}

          {hasFullData && cookieConsent && cookieConsent.grade !== "N/A" && (
            <Section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: cookieConsent.issues.length > 0 ? 8 : 0 }}>
                <SectionTitle>Cookie consent</SectionTitle>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: tokens.radiusPill,
                  background: cookieConsent.grade === "A" ? tokens.greenBg : cookieConsent.grade === "B" ? tokens.amberBg : tokens.redBg,
                  color: cookieConsent.grade === "A" ? tokens.green : cookieConsent.grade === "B" ? tokens.amber : tokens.red }}>
                  Grade {cookieConsent.grade}
                </span>
              </div>
              {cookieConsent.issues.map((issue, i) => <FlagRow key={i} text={issue} type="warn" />)}
            </Section>
          )}
        </>
      )}

      {/* Security Tab */}
      {tab === "security" && (
        <>
          {!loading && dataBroker && (
            <div style={{ margin: "10px 12px 0", padding: "12px 14px", background: tokens.amberBg, border: `1px solid ${tokens.amberRing}`, borderRadius: tokens.radius }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: tokens.amber, letterSpacing: "0.5px", marginBottom: 4 }}>⚠️ DATA BROKER SITE</div>
              <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>This site is known to collect and sell personal information. Avoid entering any personal details.</div>
            </div>
          )}

          {!loading && aiPhishing.length > 0 && (
            <div style={{ margin: "10px 12px 0", padding: "12px 14px", background: tokens.redBg, border: `1px solid ${tokens.redRing}`, borderRadius: tokens.radius }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: tokens.red, letterSpacing: "0.5px", marginBottom: 4 }}>🤖 AI PHISHING PATTERNS DETECTED</div>
              {aiPhishing.map((s, i) => <div key={i} style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>{s}</div>)}
            </div>
          )}

          {!loading && breachInfo?.breached && (
            <div style={{ margin: "10px 12px 0", padding: "12px 14px", background: tokens.amberBg, border: `1px solid ${tokens.amberRing}`, borderRadius: tokens.radius }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: tokens.amber, letterSpacing: "0.5px", marginBottom: 4 }}>🔓 DATA BREACH — HaveIBeenPwned</div>
              <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>
                This domain was involved in <strong>{breachInfo.count === 1 ? "a known data breach" : `${breachInfo.count} known breaches`}</strong>.
                {breachInfo.name && ` Most recent: ${breachInfo.name}`}{breachInfo.date && ` (${breachInfo.date.slice(0, 4)})`}. Avoid reusing passwords here.
              </div>
            </div>
          )}

          {!loading && isMalicious && threats.length > 0 && (
            <div style={{ margin: "10px 12px 0", padding: "12px 14px", background: tokens.redBg, border: `1px solid ${tokens.red}`, borderRadius: tokens.radius }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: tokens.red, letterSpacing: "0.5px", marginBottom: 4 }}>⚠️ CONFIRMED THREAT — Google Safe Browsing</div>
              {threats.map((t, i) => (
                <div key={i}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: tokens.red, marginBottom: 2 }}>{THREAT_LABELS[t] ?? t}</div>
                  <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>{THREAT_DESCRIPTIONS[t] ?? "This site has been flagged as dangerous."}</div>
                </div>
              ))}
            </div>
          )}

          <Section>
            <SectionTitle>URL checks</SectionTitle>
            {[
              { label: "HTTPS connection",        pass: url.startsWith("https://") },
              { label: "Standard URL length",     pass: url.length <= 100 },
              { label: "No suspicious keywords",  pass: !/login|verify|signin|confirm|reset/i.test(url) },
              { label: "Domain looks clean",      pass: !/\d{1,3}\.\d{1,3}/.test(url) },
            ].map(({ label, pass }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `0.5px solid ${tokens.borderDefault}` }}>
                <span style={{ fontSize: 12, color: tokens.textSecondary }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: pass ? tokens.green : tokens.red }}>{pass ? "Pass" : "Fail"}</span>
              </div>
            ))}
          </Section>

          <Section>
            <SectionTitle>Security flags</SectionTitle>
            {!hasFullData ? <EmptyState text="Checking…" /> : flags.length === 0 ? <EmptyState text="Nothing flagged — this page's content looks clean." variant="good" /> : flags.map((f, i) => <FlagRow key={i} text={f} type="warn" />)}
          </Section>

          {hasFullData && passwordWarnings.length > 0 && (
            <Section>
              <SectionTitle>Password safety</SectionTitle>
              {passwordWarnings.map((w, i) => <FlagRow key={i} text={w} type="warn" />)}
            </Section>
          )}

          {hasFullData && permissionIssues.length > 0 && (
            <Section>
              <SectionTitle>Permission requests</SectionTitle>
              {permissionIssues.map((p, i) => <FlagRow key={i} text={p} type="warn" />)}
            </Section>
          )}
        </>
      )}

      {/* Charlie Explanation */}
      <div style={{ padding: "12px 18px", background: tokens.bgSurface, borderTop: `0.5px solid ${tokens.borderDefault}` }}>
        <div style={{ background: tokens.bgSunk, borderRadius: tokens.radiusSm, padding: "10px 12px", border: `0.5px solid ${tokens.borderDefault}` }}>
          <p style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.65, margin: 0 }}>{explanation}</p>
          <div style={{ fontSize: 10, color: tokens.textDisabled, marginTop: 6, letterSpacing: "0.2px" }}>
            {isAiExplanation ? "Explained by Charlie · AI" : "Explained by Charlie"}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 18px", background: tokens.bgSurface, borderTop: `0.5px solid ${tokens.borderDefault}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => chrome.runtime.openOptionsPage()} title="Settings"
          style={{ background: "none", border: "none", padding: "2px 4px", cursor: "pointer", color: tokens.textTertiary, fontSize: 14, lineHeight: 1, borderRadius: 6 }}>⚙️</button>
        <span style={{ fontSize: 10, color: tokens.textDisabled, letterSpacing: "0.3px" }}>Oates Technology</span>
        <button onClick={runScan} disabled={scanning}
          style={{ fontSize: 11, padding: "4px 11px", borderRadius: tokens.radiusPill, border: `0.5px solid ${tokens.borderStrong}`, background: "transparent", color: scanning ? tokens.textDisabled : tokens.textSecondary, cursor: scanning ? "default" : "pointer", fontFamily: "inherit" }}>
          {scanning ? "Scanning…" : "Rescan"}
        </button>
      </div>
    </div>
  )
}


// ───────────────────────────────────────────────────────────────────────────────
// FILE 6: options.tsx
// ───────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react"

const tokens_opt = {
  bgPage: "#F2F1EE", bgSurface: "#FFFFFF", bgSunk: "#EDECE9", bgInput: "#E8E7E3",
  textPrimary: "#1A1A18", textSecondary: "#5A5955", textTertiary: "#9E9C97", textDisabled: "#C4C2BC",
  borderDefault: "#E2E0DB", borderStrong: "#CBC9C3",
  green: "#1E7A3E", greenBg: "#E6F4EC", greenRing: "#34D399",
  amber: "#7A4F00", amberBg: "#FFF3D6", amberRing: "#F59E0B",
  red: "#B91C1C", redBg: "#FEE9E9", redRing: "#EF4444",
  logoMark: "#1A1A18", radius: "12px", radiusSm: "8px", radiusPill: "999px",
}

const SETTINGS_KEY = "charlieai_settings"
const HISTORY_KEY  = "charlieai_history"

interface Settings {
  safeBrowsingKey: string
  anthropicKey: string
  notifications: boolean
  linkHoverTooltip: boolean
  linkClickInterceptor: boolean
  iconBadge: boolean
}

// Space Invader pixel art logo (20×17)
function VeilLogo() {
  return (
    <svg width="20" height="17" viewBox="0 0 13 11" fill="#A855F7" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="0" width="2" height="1"/><rect x="8" y="0" width="2" height="1"/>
      <rect x="3" y="1" width="2" height="1"/><rect x="8" y="1" width="2" height="1"/>
      <rect x="3" y="2" width="7" height="1"/>
      <rect x="2" y="3" width="9" height="1"/>
      <rect x="2" y="4" width="9" height="1"/>
      <rect x="2" y="5" width="1" height="1"/><rect x="4" y="5" width="5" height="1"/><rect x="10" y="5" width="1" height="1"/>
      <rect x="0" y="6" width="13" height="1"/>
      <rect x="0" y="7" width="13" height="1"/>
      <rect x="2" y="8" width="9" height="1"/>
      <rect x="3" y="9" width="2" height="1"/><rect x="8" y="9" width="2" height="1"/>
      <rect x="3" y="10" width="2" height="1"/><rect x="8" y="10" width="2" height="1"/>
    </svg>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 42, height: 24, borderRadius: 999, background: on ? tokens_opt.green : tokens_opt.borderStrong, position: "relative", cursor: "pointer", transition: "background 0.2s ease", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.18)", transition: "left 0.2s ease" }} />
    </div>
  )
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: type === "success" ? tokens_opt.green : tokens_opt.red, color: "#fff", padding: "10px 20px", borderRadius: tokens_opt.radiusPill, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 999 }}>
      {message}
    </div>
  )
}

export default function OptionsPage() {
  const [apiKey, setApiKey]                     = useState("")
  const [showKey, setShowKey]                   = useState(false)
  const [anthropicKey, setAnthropicKey]         = useState("")
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [notifications, setNotifications]       = useState(false)
  const [linkHoverTooltip, setLinkHoverTooltip] = useState(false)
  const [linkClickInterceptor, setLinkClickInterceptor] = useState(false)
  const [iconBadge, setIconBadge]               = useState(false)
  const [saved, setSaved]                       = useState(false)
  const [historyCount, setHistoryCount]         = useState(0)
  const [toast, setToast]                       = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [testing, setTesting]                   = useState(false)
  const [testResult, setTestResult]             = useState<"none" | "valid" | "invalid">("none")
  const [anthropicTesting, setAnthropicTesting] = useState(false)
  const [anthropicTestResult, setAnthropicTestResult] = useState<"none" | "valid" | "invalid">("none")

  useEffect(() => {
    chrome.storage.local.get([SETTINGS_KEY, HISTORY_KEY], (data) => {
      const s: Settings = data[SETTINGS_KEY] || { safeBrowsingKey: "", anthropicKey: "", notifications: false, linkHoverTooltip: false, linkClickInterceptor: false, iconBadge: false }
      setApiKey(s.safeBrowsingKey || ""); setAnthropicKey(s.anthropicKey || "")
      setNotifications(s.notifications ?? false); setLinkHoverTooltip(s.linkHoverTooltip ?? false)
      setLinkClickInterceptor(s.linkClickInterceptor ?? false); setIconBadge(s.iconBadge ?? false)
      setHistoryCount((data[HISTORY_KEY] || []).length)
    })
  }, [])

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type }); setTimeout(() => setToast(null), 3000)
  }

  function saveSettings() {
    const settings: Settings = { safeBrowsingKey: apiKey.trim(), anthropicKey: anthropicKey.trim(), notifications, linkHoverTooltip, linkClickInterceptor, iconBadge }
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
      setSaved(true); showToast("Settings saved", "success"); setTimeout(() => setSaved(false), 2000)
    })
  }

  function clearHistory() {
    chrome.storage.local.set({ [HISTORY_KEY]: [] }, () => { setHistoryCount(0); showToast("Scan history cleared", "success") })
  }

  async function testApiKey() {
    const key = apiKey.trim()
    if (!key) { showToast("Enter an API key first", "error"); return }
    setTesting(true); setTestResult("none")
    try {
      const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client: { clientId: "veil-test", clientVersion: "1.0" }, threatInfo: { threatTypes: ["MALWARE"], platformTypes: ["ANY_PLATFORM"], threatEntryTypes: ["URL"], threatEntries: [{ url: "https://www.google.com" }] } }),
      })
      if (res.ok) { setTestResult("valid"); showToast("API key is valid ✓", "success") }
      else { setTestResult("invalid"); showToast(`Invalid key (${res.status})`, "error") }
    } catch { setTestResult("invalid"); showToast("Connection failed", "error") }
    setTesting(false)
  }

  async function testAnthropicKey() {
    const key = anthropicKey.trim()
    if (!key) { showToast("Enter an Anthropic API key first", "error"); return }
    setAnthropicTesting(true); setAnthropicTestResult("none")
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 10, messages: [{ role: "user", content: "ping" }] }),
      })
      setAnthropicTestResult(res.ok ? "valid" : "invalid")
      showToast(res.ok ? "Anthropic key is valid ✓" : `Invalid key (${res.status})`, res.ok ? "success" : "error")
    } catch { setAnthropicTestResult("invalid"); showToast("Connection failed", "error") }
    setAnthropicTesting(false)
  }

  const keyBorderColor = testResult === "valid" ? tokens_opt.green : testResult === "invalid" ? tokens_opt.red : apiKey.length > 0 ? tokens_opt.borderStrong : tokens_opt.borderDefault

  return (
    <div style={{ minHeight: "100vh", background: tokens_opt.bgPage, fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif", color: tokens_opt.textPrimary }}>

      {/* Header */}
      <div style={{ background: tokens_opt.bgSurface, borderBottom: `0.5px solid ${tokens_opt.borderDefault}`, padding: "18px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: tokens_opt.logoMark, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <VeilLogo />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.3px" }}>Veil</div>
          <div style={{ fontSize: 11, color: tokens_opt.textTertiary, marginTop: 1 }}>Settings — Powered by Charlie</div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 24px" }}>

        {/* Google Safe Browsing API Key */}
        <div style={{ background: tokens_opt.bgSurface, borderRadius: tokens_opt.radius, border: `0.5px solid ${tokens_opt.borderDefault}`, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "16px 20px", borderBottom: `0.5px solid ${tokens_opt.borderDefault}` }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Google Safe Browsing API Key</div>
            <div style={{ fontSize: 12, color: tokens_opt.textSecondary, lineHeight: 1.55 }}>
              Required for Charlie to check URLs against Google's real-time threat database. Get a free key at{" "}
              <a href="https://console.cloud.google.com/apis/library/safebrowsing.googleapis.com" target="_blank" rel="noreferrer" style={{ color: tokens_opt.textPrimary, fontWeight: 500 }}>Google Cloud Console</a>.
            </div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => { setApiKey(e.target.value); setTestResult("none") }} placeholder="Paste your API key here…"
                  style={{ width: "100%", padding: "10px 40px 10px 12px", borderRadius: tokens_opt.radiusSm, border: `1px solid ${keyBorderColor}`, background: tokens_opt.bgInput, fontSize: 13, color: tokens_opt.textPrimary, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} />
                <button onClick={() => setShowKey(!showKey)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: tokens_opt.textTertiary, padding: 2 }}>
                  {showKey ? "🙈" : "👁"}
                </button>
              </div>
              <button onClick={testApiKey} disabled={testing || !apiKey.trim()}
                style={{ padding: "10px 14px", borderRadius: tokens_opt.radiusSm, border: `0.5px solid ${tokens_opt.borderStrong}`, background: tokens_opt.bgSunk, color: testing || !apiKey.trim() ? tokens_opt.textDisabled : tokens_opt.textSecondary, fontSize: 12, fontWeight: 500, cursor: testing || !apiKey.trim() ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {testing ? "Testing…" : "Test key"}
              </button>
            </div>
            {testResult === "valid" && <div style={{ fontSize: 11, color: tokens_opt.green, marginTop: 6 }}>✓ Key is valid — Safe Browsing is active</div>}
            {testResult === "invalid" && <div style={{ fontSize: 11, color: tokens_opt.red, marginTop: 6 }}>✗ Key did not work — check it and try again</div>}
          </div>
        </div>

        {/* Anthropic (Claude AI) Key */}
        <div style={{ background: tokens_opt.bgSurface, borderRadius: tokens_opt.radius, border: `0.5px solid ${tokens_opt.borderDefault}`, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "16px 20px", borderBottom: `0.5px solid ${tokens_opt.borderDefault}` }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Anthropic API Key (Claude AI)</div>
            <div style={{ fontSize: 12, color: tokens_opt.textSecondary, lineHeight: 1.55 }}>
              Powers the "Explained by Charlie" AI summary. Get a free key at{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: tokens_opt.textPrimary, fontWeight: 500 }}>console.anthropic.com</a>. Optional — without it, Charlie uses template explanations.
            </div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input type={showAnthropicKey ? "text" : "password"} value={anthropicKey} onChange={(e) => { setAnthropicKey(e.target.value); setAnthropicTestResult("none") }} placeholder="sk-ant-…"
                  style={{ width: "100%", padding: "10px 40px 10px 12px", borderRadius: tokens_opt.radiusSm, border: `1px solid ${anthropicTestResult === "valid" ? tokens_opt.green : anthropicTestResult === "invalid" ? tokens_opt.red : anthropicKey.length > 0 ? tokens_opt.borderStrong : tokens_opt.borderDefault}`, background: tokens_opt.bgInput, fontSize: 13, color: tokens_opt.textPrimary, fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} />
                <button onClick={() => setShowAnthropicKey(!showAnthropicKey)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: tokens_opt.textTertiary, padding: 2 }}>
                  {showAnthropicKey ? "🙈" : "👁"}
                </button>
              </div>
              <button onClick={testAnthropicKey} disabled={anthropicTesting || !anthropicKey.trim()}
                style={{ padding: "10px 14px", borderRadius: tokens_opt.radiusSm, border: `0.5px solid ${tokens_opt.borderStrong}`, background: tokens_opt.bgSunk, color: anthropicTesting || !anthropicKey.trim() ? tokens_opt.textDisabled : tokens_opt.textSecondary, fontSize: 12, fontWeight: 500, cursor: anthropicTesting || !anthropicKey.trim() ? "default" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {anthropicTesting ? "Testing…" : "Test key"}
              </button>
            </div>
            {anthropicTestResult === "valid" && <div style={{ fontSize: 11, color: tokens_opt.green, marginTop: 6 }}>✓ Claude AI is active — Charlie will use AI explanations</div>}
            {anthropicTestResult === "invalid" && <div style={{ fontSize: 11, color: tokens_opt.red, marginTop: 6 }}>✗ Key did not work — check it and try again</div>}
          </div>
        </div>

        {/* Features */}
        <div style={{ background: tokens_opt.bgSurface, borderRadius: tokens_opt.radius, border: `0.5px solid ${tokens_opt.borderDefault}`, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 20px", borderBottom: `0.5px solid ${tokens_opt.borderDefault}`, fontSize: 11, fontWeight: 500, color: tokens_opt.textTertiary, letterSpacing: "0.8px", textTransform: "uppercase" }}>Features</div>

          {[
            { label: "Link hover tooltip",    desc: "Show a risk score when hovering over links on any page", val: linkHoverTooltip, set: setLinkHoverTooltip },
            { label: "Risky link warning",    desc: "Block navigation and show a warning when clicking a high-risk link", val: linkClickInterceptor, set: setLinkClickInterceptor },
            { label: "Icon badge & hover info", desc: "Show risk score on the extension icon with a colour indicator and hover summary", val: iconBadge, set: setIconBadge },
            { label: "Threat notifications",  desc: "Show a Chrome notification when Veil detects a high-risk page", val: notifications, set: setNotifications },
          ].map(({ label, desc, val, set }, i, arr) => (
            <div key={label} style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? `0.5px solid ${tokens_opt.borderDefault}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: tokens_opt.textSecondary }}>{desc}</div>
              </div>
              <Toggle on={val} onChange={set} />
            </div>
          ))}
        </div>

        {/* Scan History */}
        <div style={{ background: tokens_opt.bgSurface, borderRadius: tokens_opt.radius, border: `0.5px solid ${tokens_opt.borderDefault}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Scan history</div>
            <div style={{ fontSize: 12, color: tokens_opt.textSecondary }}>{historyCount} site{historyCount !== 1 ? "s" : ""} stored locally</div>
          </div>
          <button onClick={clearHistory} disabled={historyCount === 0}
            style={{ padding: "7px 14px", borderRadius: tokens_opt.radiusPill, border: `0.5px solid ${historyCount === 0 ? tokens_opt.borderDefault : tokens_opt.red}`, background: "transparent", color: historyCount === 0 ? tokens_opt.textDisabled : tokens_opt.red, fontSize: 12, fontWeight: 500, cursor: historyCount === 0 ? "default" : "pointer", fontFamily: "inherit" }}>
            Clear history
          </button>
        </div>

        {/* Save Button */}
        <button onClick={saveSettings}
          style={{ width: "100%", padding: "13px", borderRadius: tokens_opt.radius, border: "none", background: tokens_opt.logoMark, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.2px" }}>
          {saved ? "Saved ✓" : "Save settings"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: tokens_opt.textDisabled }}>
          Oates Technology · Veil · Explained by Charlie{" · "}
          <a href={chrome.runtime.getURL("privacy-policy.html")} target="_blank" rel="noreferrer" style={{ color: tokens_opt.textDisabled, textDecoration: "underline" }}>Privacy Policy</a>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}


// ───────────────────────────────────────────────────────────────────────────────
// FILE 7: privacy-policy.html  (web_accessible_resource, linked from options footer)
// Full source in: /Users/juliusoates/Desktop/Veil/privacy-policy.html
// Covers: local-only analysis, external API calls (Safe Browsing / Anthropic / HIBP),
//         chrome.storage.local usage, permissions justification, contact info.
// ───────────────────────────────────────────────────────────────────────────────
// (See privacy-policy.html file — too large to inline here as a comment block)


// ═══════════════════════════════════════════════════════════════════════════════
// END OF MASTERCODE BACKUP
// Veil v0.1.0 — Oates Technology — Last updated: 2026-04-22
// ═══════════════════════════════════════════════════════════════════════════════
