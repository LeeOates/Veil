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
