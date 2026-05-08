import { useEffect, useRef, useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Design tokens (stone / silver light theme) ───────────────────────────────
const tokens = {
  bgPage:    "#F2F1EE",
  bgSurface: "#FFFFFF",
  bgSunk:    "#EDECE9",
  bgInput:   "#E8E7E3",

  textPrimary:   "#1A1A18",
  textSecondary: "#5A5955",
  textTertiary:  "#9E9C97",
  textDisabled:  "#C4C2BC",

  borderDefault: "#E2E0DB",
  borderStrong:  "#CBC9C3",

  green:      "#1E7A3E",
  greenBg:    "#E6F4EC",
  greenRing:  "#34D399",
  amber:      "#7A4F00",
  amberBg:    "#FFF3D6",
  amberRing:  "#F59E0B",
  red:        "#B91C1C",
  redBg:      "#FEE9E9",
  redRing:    "#EF4444",

  logoMark:   "#FFFFFF",
  radius:     "12px",
  radiusSm:   "8px",
  radiusPill: "999px",
}

// ─── Keyframes (injected once) ─────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes veil-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes veil-fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes veil-tabIn {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes veil-slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes veil-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }
  @keyframes veil-dotPulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%            { transform: scale(1);   opacity: 1;   }
  }
  @keyframes veil-slideUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Keyboard focus ring (visible only for keyboard nav) ── */
  *:focus { outline: none; }
  *:focus-visible {
    outline: 2px solid #A855F7;
    outline-offset: 2px;
    border-radius: 4px;
  }
`

// ─── Status config ────────────────────────────────────────────────────────────
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

// ─── Count-up animation hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 700): number {
  const [displayed, setDisplayed] = useState(0)
  const rafRef  = useRef<number | null>(null)
  const startTs = useRef<number | null>(null)
  const fromVal = useRef(0)

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    fromVal.current = displayed
    startTs.current = null

    const tick = (ts: number) => {
      if (startTs.current === null) startTs.current = ts
      const t = Math.min((ts - startTs.current) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)               // easeOutCubic
      setDisplayed(Math.round(fromVal.current + (target - fromVal.current) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [target])                                             // eslint-disable-line

  return displayed
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, band }: { score: number; band: RiskBand }) {
  const { ring } = getStatusConfig(band)
  const displayedScore = useCountUp(score, 750)
  const r = 24
  const circ = 2 * Math.PI * r
  const filled = (displayedScore / 100) * circ
  return (
    <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
      <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: "absolute", top: 0, left: 0 }}>
        <circle cx="30" cy="30" r={r} fill="none" stroke={tokens.borderDefault} strokeWidth="5" />
        <circle
          cx="30" cy="30" r={r} fill="none" stroke={ring} strokeWidth="5"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 30 30)"
          style={{ transition: "stroke 0.4s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 500, color: tokens.textPrimary,
        fontFamily: "Georgia, 'Times New Roman', serif",
        letterSpacing: "-0.5px",
        transition: "color 0.4s ease",
      }}>
        {displayedScore}
      </div>
    </div>
  )
}

// ─── Veil Logo (Space Invader pixel art) ─────────────────────────────────────
function VeilLogo() {
  return (
    <svg width="18" height="15" viewBox="0 0 13 11" fill="#A855F7" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="0" width="2" height="1"/>
      <rect x="8" y="0" width="2" height="1"/>
      <rect x="3" y="1" width="2" height="1"/>
      <rect x="8" y="1" width="2" height="1"/>
      <rect x="3" y="2" width="7" height="1"/>
      <rect x="2" y="3" width="9" height="1"/>
      <rect x="2" y="4" width="9" height="1"/>
      <rect x="2" y="5" width="1" height="1"/>
      <rect x="4" y="5" width="5" height="1"/>
      <rect x="10" y="5" width="1" height="1"/>
      <rect x="0" y="6" width="13" height="1"/>
      <rect x="0" y="7" width="13" height="1"/>
      <rect x="2" y="8" width="9" height="1"/>
      <rect x="3" y="9" width="2" height="1"/>
      <rect x="8" y="9" width="2" height="1"/>
      <rect x="3" y="10" width="2" height="1"/>
      <rect x="8" y="10" width="2" height="1"/>
    </svg>
  )
}

// ─── Skeleton shimmer block ───────────────────────────────────────────────────
function Skeleton({
  width = "100%",
  height = 12,
  rounded = false,
  style: extra = {},
}: {
  width?: string | number
  height?: number
  rounded?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      width,
      height,
      borderRadius: rounded ? 999 : 6,
      background: "linear-gradient(90deg, #EDECE9 25%, #E4E3DF 50%, #EDECE9 75%)",
      backgroundSize: "200% 100%",
      animation: "veil-shimmer 1.4s ease-in-out infinite",
      flexShrink: 0,
      ...extra,
    }} />
  )
}

// ─── FadeIn entrance wrapper ──────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div style={{
      animation: "veil-fadeIn 0.22s ease both",
      animationDelay: `${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// ─── SlideDown entrance wrapper ───────────────────────────────────────────────
function SlideDown({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div style={{
      animation: "veil-slideDown 0.2s ease both",
      animationDelay: `${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <div style={{
      fontSize: 11,
      padding: "3px 9px",
      borderRadius: tokens.radiusPill,
      border: `0.5px solid ${highlight ? "#F5C96A" : tokens.borderDefault}`,
      background: highlight ? "#FFF6E6" : tokens.bgSunk,
      color: highlight ? "#7A4F00" : tokens.textSecondary,
      lineHeight: 1.6,
    }}>
      {label}
    </div>
  )
}

// ─── Skeleton Chip ────────────────────────────────────────────────────────────
function SkeletonChip({ width = 60 }: { width?: number }) {
  return <Skeleton width={width} height={24} rounded style={{ display: "inline-block" }} />
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 0",
      borderBottom: `0.5px solid ${tokens.borderDefault}`,
    }}>
      <Skeleton width={6} height={6} rounded style={{ flexShrink: 0 }} />
      <Skeleton width="75%" height={11} />
    </div>
  )
}

// ─── Flag Row ─────────────────────────────────────────────────────────────────
function FlagRow({ text, type = "warn" }: { text: string; type?: "warn" | "info" }) {
  const dotColor = type === "warn" ? tokens.amberRing : tokens.greenRing
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 9,
      padding: "7px 0",
      borderBottom: `0.5px solid ${tokens.borderDefault}`,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: dotColor, flexShrink: 0, marginTop: 5,
      }} />
      <span style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>{text}</span>
    </div>
  )
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "12px 18px",
      background: tokens.bgSurface,
      borderBottom: `0.5px solid ${tokens.borderDefault}`,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 500, letterSpacing: "0.8px",
      textTransform: "uppercase", color: tokens.textTertiary,
      marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({
  text,
  variant = "neutral",
}: {
  text: string
  variant?: "neutral" | "good" | "warn"
}) {
  const icon   = variant === "good" ? "✓" : variant === "warn" ? "!" : "·"
  const bg     = variant === "good" ? tokens.greenBg  : variant === "warn" ? tokens.amberBg  : tokens.bgSunk
  const color  = variant === "good" ? tokens.green    : variant === "warn" ? tokens.amber    : tokens.textDisabled

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "3px 0" }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 12, color: tokens.textDisabled, margin: 0 }}>{text}</p>
    </div>
  )
}

// ─── Animated thinking dots for Charlie ──────────────────────────────────────
function ThinkingDots() {
  const dotStyle = (delayMs: number): React.CSSProperties => ({
    display: "inline-block",
    width: 4, height: 4,
    borderRadius: "50%",
    background: tokens.textDisabled,
    marginRight: 3,
    animation: `veil-dotPulse 1.2s ease-in-out ${delayMs}ms infinite`,
  })
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 0, verticalAlign: "middle" }}>
      <span style={dotStyle(0)} />
      <span style={dotStyle(160)} />
      <span style={dotStyle(320)} />
    </span>
  )
}

// ─── Main Popup ───────────────────────────────────────────────────────────────
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
  const [aiLoading, setAiLoading]   = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [copied, setCopied]         = useState(false)

  const statusConfig = getStatusConfig(band)

  function computeUrlScore(currentUrl: string): number {
    let s = 85
    if (currentUrl.startsWith("http://")) s -= 35
    if (/login|verify|signin|confirm|reset/i.test(currentUrl)) s -= 12
    if (currentUrl.length > 100) s -= 8
    try {
      if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(new URL(currentUrl).hostname)) s -= 25
    } catch {}
    return Math.max(0, Math.min(100, s))
  }

  function computeScore(result: ScanResult, currentUrl: string): number {
    let s = 85
    if (currentUrl.startsWith("http://")) s -= 35
    if (/login|verify|signin|confirm|reset/i.test(currentUrl)) s -= 12
    if (currentUrl.length > 100) s -= 8
    try {
      if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(new URL(currentUrl).hostname)) s -= 25
    } catch {}
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
    setScore(computed)
    setBand(getBand(computed))
    setTrackers(result.trackers)
    setCookies(result.cookieCount)
    setFlags(result.flags)
    setDarkPats(result.darkPatterns)
    setIsMalicious(result.isMalicious ?? false)
    setThreats(result.threats ?? [])
    setFingerprinting(response.fingerprintingSignals ?? [])
    setCookieConsent(response.cookieConsent ?? null)
    setPasswordWarnings(response.passwordWarnings ?? [])
    setDataBroker(response.dataBroker ?? false)
    setAiPhishing(response.aiPhishingSignals ?? [])
    setPermissionIssues(response.permissionIssues ?? [])
    setAiGenerated(response.aiGeneratedSignals ?? [])
    setBreachInfo(response.breachInfo ?? null)
    setHasFullData(true)
    setLoading(false)
    setScanning(false)

    // Request AI explanation (non-blocking)
    setAiExplanation(null)
    setAiLoading(true)
    chrome.runtime.sendMessage({
      type: "GET_AI_EXPLANATION",
      data: {
        url: currentUrl,
        score: computed,
        band: getBand(computed),
        trackers: result.trackers,
        cookieCount: result.cookieCount,
        flags: result.flags,
        darkPatterns: result.darkPatterns,
        isMalicious: result.isMalicious ?? false,
        threats: result.threats ?? [],
        fingerprintingSignals: response.fingerprintingSignals ?? [],
        cookieConsent: response.cookieConsent ?? null,
        passwordWarnings: response.passwordWarnings ?? [],
        dataBroker: response.dataBroker ?? false,
        aiPhishingSignals: response.aiPhishingSignals ?? [],
        permissionIssues: response.permissionIssues ?? [],
        aiGeneratedSignals: response.aiGeneratedSignals ?? [],
        breachInfo: response.breachInfo ?? null,
      },
    }, (resp) => {
      setAiLoading(false)
      if (resp?.explanation) setAiExplanation(resp.explanation)
    })
  }

  function runScan() {
    setScanning(true)
    setHasFullData(false)
    setAiExplanation(null)
    setAiLoading(false)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || ""
      const tabId = tabs[0]?.id!
      setUrl(currentUrl)
      try { setDomain(new URL(currentUrl).hostname) } catch { setDomain(currentUrl) }

      // Phase 1: instant URL-only score
      const urlScore = computeUrlScore(currentUrl)
      setScore(urlScore)
      setBand(getBand(urlScore))
      setLoading(false)

      // Phase 2: full data from cache
      chrome.runtime.sendMessage({ type: "GET_CACHED_SCAN", tabId }, (cached) => {
        if (cached) {
          applyFullResult(cached, currentUrl)
          return
        }
        chrome.tabs.sendMessage(tabId, { type: "SCAN_PAGE" }, (response) => {
          if (chrome.runtime.lastError || !response) {
            setHasFullData(true)
            setScanning(false)
            return
          }
          applyFullResult(response, currentUrl)
        })
      })
    })
  }

  // ─── Report helpers ──────────────────────────────────────────────────────────

  function nowLabel() {
    return new Date().toLocaleString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    })
  }

  function generateTextReport(): string {
    const bar  = "─".repeat(40)
    const band2 = band === "safe" ? "Protected" : band === "caution" ? "Review advised" : "High risk"
    const lines: string[] = [
      "VEIL SECURITY REPORT",
      "═".repeat(40),
      `Site:         ${domain}`,
      `URL:          ${url}`,
      `Scanned:      ${nowLabel()}`,
      `Trust Score:  ${score} / 100  —  ${band2}`,
      "",
      bar,
      "PRIVACY",
      bar,
      `Trackers (${trackers.length}):  ${trackers.length > 0 ? trackers.join(", ") : "None detected"}`,
      `Cookies:       ${cookies}  (${cookieSeverity.charAt(0).toUpperCase() + cookieSeverity.slice(1)})`,
      `Dark patterns: ${darkPats.length > 0 ? darkPats.join("; ") : "None detected"}`,
      `Fingerprinting:${fingerprinting.length > 0 ? " " + fingerprinting.join("; ") : " None detected"}`,
      `AI content:    ${aiGenerated.length > 0 ? aiGenerated.join("; ") : "None detected"}`,
      `Cookie consent:${cookieConsent && cookieConsent.grade !== "N/A"
          ? ` Grade ${cookieConsent.grade}${cookieConsent.issues.length > 0 ? "\n  · " + cookieConsent.issues.join("\n  · ") : ""}`
          : " N/A"}`,
      "",
      bar,
      "SECURITY",
      bar,
      `HTTPS:         ${url.startsWith("https://") ? "Yes ✓" : "No ✗"}`,
      `Security flags:${flags.length > 0 ? "\n  · " + flags.join("\n  · ") : " None"}`,
      `Password safety:${passwordWarnings.length > 0 ? "\n  · " + passwordWarnings.join("\n  · ") : " OK"}`,
      `Permissions:   ${permissionIssues.length > 0 ? "\n  · " + permissionIssues.join("\n  · ") : " None unusual"}`,
      `Data broker:   ${dataBroker ? "Yes ⚠️" : "No"}`,
      `AI phishing:   ${aiPhishing.length > 0 ? aiPhishing.join("; ") : "None detected"}`,
      `Data breach:   ${breachInfo?.breached
          ? `Yes — ${breachInfo.count} breach${breachInfo.count !== 1 ? "es" : ""}. Most recent: ${breachInfo.name ?? "unknown"} (${breachInfo.date?.slice(0, 4) ?? "?"})`
          : "No known breaches"}`,
      `Threat status: ${isMalicious && threats.length > 0
          ? "⚠️ " + threats.map(t => THREAT_LABELS[t] ?? t).join(", ")
          : "Clean"}`,
      "",
      bar,
      "URL CHECKS",
      bar,
      `${url.startsWith("https://") ? "✓" : "✗"} HTTPS connection`,
      `${url.length <= 100 ? "✓" : "✗"} Standard URL length`,
      `${!/login|verify|signin|confirm|reset/i.test(url) ? "✓" : "✗"} No suspicious keywords`,
      `${!/\d{1,3}\.\d{1,3}/.test(url) ? "✓" : "✗"} Domain looks clean`,
      "",
      bar,
      "CHARLIE'S ANALYSIS",
      bar,
      explanation || "No analysis available.",
      "",
      "═".repeat(40),
      "Powered by Veil · Oates Technology",
    ]
    return lines.join("\n")
  }

  function generateHtmlReport(): string {
    const band2      = band === "safe" ? "Protected" : band === "caution" ? "Review advised" : "High risk"
    const bandColor  = band === "safe" ? "#1E7A3E"  : band === "caution" ? "#7A4F00"        : "#B91C1C"
    const bandBg     = band === "safe" ? "#E6F4EC"  : band === "caution" ? "#FFF3D6"        : "#FEE9E9"
    const ringColor  = band === "safe" ? "#34D399"  : band === "caution" ? "#F59E0B"        : "#EF4444"
    const r = 36, circ = 2 * Math.PI * r
    const filled = (score / 100) * circ

    const row = (label: string, value: string, highlight = false) =>
      `<div class="row${highlight ? " warn" : ""}"><span class="lbl">${label}</span><span class="val">${value}</span></div>`

    const urlChecks = [
      { label: "HTTPS connection",       pass: url.startsWith("https://") },
      { label: "Standard URL length",    pass: url.length <= 100 },
      { label: "No suspicious keywords", pass: !/login|verify|signin|confirm|reset/i.test(url) },
      { label: "Domain looks clean",     pass: !/\d{1,3}\.\d{1,3}/.test(url) },
    ]

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Veil Report — ${domain}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"SF Pro Text","Helvetica Neue",sans-serif;background:#F2F1EE;color:#1A1A18;min-height:100vh}
header{background:#fff;border-bottom:0.5px solid #E2E0DB;padding:16px 28px;display:flex;align-items:center;gap:10px}
.logo{width:30px;height:30px;border-radius:7px;background:#1A1A18;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.logo-text h1{font-size:15px;font-weight:500;letter-spacing:-0.3px}
.logo-text p{font-size:11px;color:#9E9C97;margin-top:1px}
main{max-width:620px;margin:32px auto;padding:0 20px 60px}
.card{background:#fff;border:0.5px solid #E2E0DB;border-radius:12px;padding:22px 26px;margin-bottom:14px}
.hero{display:flex;align-items:center;gap:20px}
.score-num{font-size:28px;font-weight:500;font-family:Georgia,serif;letter-spacing:-0.5px;color:#1A1A18}
.band-pill{display:inline-block;font-size:11px;font-weight:500;padding:3px 10px;border-radius:999px;background:${bandBg};color:${bandColor};margin-top:6px}
.meta{font-size:11px;color:#9E9C97;margin-top:4px}
.domain{font-size:13px;font-weight:500;color:#1A1A18;margin-top:2px;word-break:break-all}
h2{font-size:13px;font-weight:500;letter-spacing:0.4px;text-transform:uppercase;color:#9E9C97;margin-bottom:14px}
.row{display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:0.5px solid #E2E0DB;gap:12px}
.row:last-child{border-bottom:none}
.lbl{font-size:12px;color:#5A5955;flex-shrink:0}
.val{font-size:12px;color:#1A1A18;text-align:right;word-break:break-word}
.row.warn .val{color:#7A4F00}
.check-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:0.5px solid #E2E0DB}
.check-row:last-child{border-bottom:none}
.pass{color:#1E7A3E;font-size:12px;font-weight:600}
.fail{color:#B91C1C;font-size:12px;font-weight:600}
.check-label{font-size:12px;color:#5A5955}
.charlie{background:#EDECE9;border:0.5px solid #E2E0DB;border-radius:8px;padding:12px 14px}
.charlie p{font-size:12px;color:#5A5955;line-height:1.65;margin:0}
.charlie .attr{font-size:10px;color:#C4C2BC;margin-top:6px}
footer{text-align:center;font-size:11px;color:#C4C2BC;margin-top:28px}
.alert{border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:12px;line-height:1.55}
.alert-amber{background:#FFF3D6;border:0.5px solid #F59E0B;color:#7A4F00}
.alert-red{background:#FEE9E9;border:0.5px solid #EF4444;color:#B91C1C}
.alert strong{display:block;font-size:11px;letter-spacing:0.4px;margin-bottom:3px;text-transform:uppercase}
</style>
</head>
<body>
<header>
  <div class="logo">
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
  </div>
  <div class="logo-text">
    <h1>Veil</h1>
    <p>Security Report · Oates Technology</p>
  </div>
</header>
<main>

  <!-- Score card -->
  <div class="card">
    <div class="hero">
      <svg width="90" height="90" viewBox="0 0 90 90" style="flex-shrink:0">
        <circle cx="45" cy="45" r="${r}" fill="none" stroke="#E2E0DB" stroke-width="6"/>
        <circle cx="45" cy="45" r="${r}" fill="none" stroke="${ringColor}" stroke-width="6"
          stroke-dasharray="${filled.toFixed(2)} ${circ.toFixed(2)}"
          stroke-linecap="round" transform="rotate(-90 45 45)"/>
        <text x="45" y="51" text-anchor="middle" font-family="Georgia,serif" font-size="22" font-weight="500" fill="#1A1A18">${score}</text>
      </svg>
      <div>
        <div class="score-num">${score}<span style="font-size:14px;color:#9E9C97"> / 100</span></div>
        <div class="band-pill">${band2}</div>
        <div class="domain">${domain}</div>
        <div class="meta">Scanned ${nowLabel()}</div>
      </div>
    </div>
  </div>

  <!-- Alerts -->
  ${isMalicious && threats.length > 0 ? `
  <div class="alert alert-red">
    <strong>⚠️ Confirmed Threat — Google Safe Browsing</strong>
    ${threats.map(t => `${THREAT_LABELS[t] ?? t}`).join(", ")}
  </div>` : ""}
  ${breachInfo?.breached ? `
  <div class="alert alert-amber">
    <strong>🔓 Data Breach — HaveIBeenPwned</strong>
    This domain was involved in ${breachInfo.count} known breach${breachInfo.count !== 1 ? "es" : ""}.
    ${breachInfo.name ? `Most recent: ${breachInfo.name}` : ""}${breachInfo.date ? ` (${breachInfo.date.slice(0, 4)})` : ""}.
  </div>` : ""}
  ${dataBroker ? `<div class="alert alert-amber"><strong>⚠️ Data Broker Site</strong>This site collects and sells personal data.</div>` : ""}

  <!-- Privacy card -->
  <div class="card">
    <h2>Privacy</h2>
    ${row("Trackers", trackers.length > 0 ? trackers.join(", ") : "None detected")}
    ${row("Cookies", `${cookies} — ${cookieSeverity.charAt(0).toUpperCase() + cookieSeverity.slice(1)}`, cookies > 10)}
    ${row("Dark patterns", darkPats.length > 0 ? darkPats.join("; ") : "None detected", darkPats.length > 0)}
    ${row("Fingerprinting", fingerprinting.length > 0 ? fingerprinting.join("; ") : "None detected")}
    ${row("AI-generated content", aiGenerated.length > 0 ? aiGenerated.join("; ") : "None detected")}
    ${cookieConsent && cookieConsent.grade !== "N/A"
      ? row("Cookie consent", `Grade ${cookieConsent.grade}${cookieConsent.issues.length > 0 ? " · " + cookieConsent.issues.join("; ") : ""}`,
            cookieConsent.grade === "C" || cookieConsent.grade === "D")
      : row("Cookie consent", "No banner detected")}
  </div>

  <!-- Security card -->
  <div class="card">
    <h2>Security</h2>
    ${row("HTTPS", url.startsWith("https://") ? "Yes ✓" : "No ✗", !url.startsWith("https://"))}
    ${row("Security flags", flags.length > 0 ? flags.join("; ") : "None", flags.length > 0)}
    ${row("Password safety", passwordWarnings.length > 0 ? passwordWarnings.join("; ") : "OK", passwordWarnings.length > 0)}
    ${row("Permission requests", permissionIssues.length > 0 ? permissionIssues.join("; ") : "None unusual", permissionIssues.length > 0)}
    ${row("AI phishing signals", aiPhishing.length > 0 ? aiPhishing.join("; ") : "None detected", aiPhishing.length > 0)}
    ${row("Data breach (HIBP)", breachInfo?.breached
      ? `${breachInfo.count} breach${breachInfo.count !== 1 ? "es" : ""} — ${breachInfo.name ?? "unknown"} (${breachInfo.date?.slice(0,4) ?? "?"})`
      : "No known breaches", breachInfo?.breached)}
    <h2 style="margin-top:16px;margin-bottom:12px">URL Checks</h2>
    ${urlChecks.map(c => `
    <div class="check-row">
      <span class="${c.pass ? "pass" : "fail"}">${c.pass ? "✓" : "✗"}</span>
      <span class="check-label">${c.label}</span>
    </div>`).join("")}
  </div>

  <!-- Charlie card -->
  <div class="card">
    <h2>Charlie's Analysis</h2>
    <div class="charlie">
      <p>${explanation || "No analysis available."}</p>
      <div class="attr">${isAiExplanation ? "Explained by Charlie · AI (Anthropic Claude)" : "Explained by Charlie · Veil"}</div>
    </div>
  </div>

</main>
<footer>Oates Technology · Veil · ${nowLabel()}</footer>
</body>
</html>`
  }

  function handleCopy() {
    if (!hasFullData) return
    navigator.clipboard.writeText(generateTextReport()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
    setExportOpen(false)
  }

  function handleDownload() {
    if (!hasFullData) return
    const html     = generateHtmlReport()
    const blob     = new Blob([html], { type: "text/html" })
    const a        = document.createElement("a")
    a.href         = URL.createObjectURL(blob)
    a.download     = `veil-report-${domain.replace(/[^a-z0-9]/gi, "-")}.html`
    a.click()
    URL.revokeObjectURL(a.href)
    setExportOpen(false)
  }

  useEffect(() => { runScan() }, [])

  const cookieSeverity = cookies > 10 ? "high" : cookies > 4 ? "moderate" : "low"
  const cookieBadgeStyle = {
    high:     { bg: tokens.redBg,   color: tokens.red   },
    moderate: { bg: tokens.amberBg, color: tokens.amber  },
    low:      { bg: tokens.greenBg, color: tokens.green  },
  }[cookieSeverity]

  const tabStyle = (t: Tab): React.CSSProperties => ({
    fontSize: 12,
    padding: "9px 12px 8px",
    cursor: "pointer",
    color: tab === t ? tokens.textPrimary : tokens.textTertiary,
    fontWeight: tab === t ? 500 : 400,
    background: "none",
    border: "none",
    borderBottom: `1.5px solid ${tab === t ? tokens.textPrimary : "transparent"}`,
    fontFamily: "inherit",
    transition: "color 0.15s ease, border-color 0.15s ease",
  })

  const fallbackExplanation = !hasFullData
    ? ""
    : isMalicious && threats.length > 0
      ? `Google Safe Browsing flagged this site as ${THREAT_LABELS[threats[0]] ?? threats[0]}. Do not enter any personal information here.`
      : band === "safe"
        ? `This site has ${trackers.length > 0 ? `${trackers.length} tracker${trackers.length !== 1 ? "s" : ""}` : "no known trackers"} and ${cookies} cookie${cookies !== 1 ? "s" : ""}. Nothing unexpected.`
        : band === "caution"
          ? `This site collects data through ${trackers.length} tracker${trackers.length !== 1 ? "s" : ""}. Your browsing behavior may be shared with third parties.`
          : `Multiple risk signals detected. Avoid entering personal information on this page.`

  const explanation     = aiExplanation ?? fallbackExplanation
  const isAiExplanation = aiExplanation !== null && hasFullData

  return (
    <div style={{
      width: 340,
      background: tokens.bgPage,
      fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif",
      fontSize: 14,
      color: tokens.textPrimary,
      borderRadius: 18,
    }}>

      {/* ── Global keyframes ── */}
      <style>{GLOBAL_STYLES}</style>

      {/* ── Header ── */}
      <div style={{
        padding: "15px 18px",
        background: tokens.bgSurface,
        borderBottom: `0.5px solid ${tokens.borderDefault}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: tokens.logoMark,
            border: `0.5px solid ${tokens.borderDefault}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <VeilLogo />
          </div>
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.3px", color: tokens.textPrimary }}>
            Veil
          </span>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 500,
          padding: "3px 10px", borderRadius: tokens.radiusPill,
          background: statusConfig.bg, color: statusConfig.color,
          transition: "background 0.4s ease, color 0.4s ease",
        }}>
          {statusConfig.label}
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{
        padding: "16px 18px 14px",
        background: tokens.bgSurface,
        borderBottom: `0.5px solid ${tokens.borderDefault}`,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <ScoreRing score={loading ? 0 : score} band={band} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: tokens.textTertiary, marginBottom: 3, letterSpacing: "0.3px" }}>
            Trust score
          </div>
          <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55, wordBreak: "break-word" }}>
            {domain
              ? <span style={{ fontWeight: 500, color: tokens.textPrimary }}>{domain}</span>
              : <Skeleton width="60%" height={12} />
            }
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: "flex",
        background: tokens.bgSurface,
        borderBottom: `0.5px solid ${tokens.borderDefault}`,
        padding: "0 18px",
      }}>
        <button
          role="tab"
          aria-selected={tab === "privacy"}
          style={tabStyle("privacy")}
          onClick={() => setTab("privacy")}
        >Privacy</button>
        <button
          role="tab"
          aria-selected={tab === "security"}
          style={tabStyle("security")}
          onClick={() => setTab("security")}
        >Security</button>
      </div>

      {/* ── Tab Content (keyed for fade animation on tab switch) ── */}
      <div key={tab} style={{ animation: "veil-tabIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both" }}>

        {/* ── Privacy Tab ── */}
        {tab === "privacy" && (
          <>
            {/* Trackers */}
            <Section>
              <SectionTitle>Trackers found</SectionTitle>
              {!hasFullData ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  <SkeletonChip width={68} />
                  <SkeletonChip width={52} />
                  <SkeletonChip width={80} />
                </div>
              ) : trackers.length === 0 ? (
                <FadeIn>
                  <EmptyState text="No trackers found — your activity isn't being shared with ad networks." variant="good" />
                </FadeIn>
              ) : (
                <FadeIn>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {trackers.map((t, i) => (
                      <Chip key={i} label={t} highlight={/meta|tiktok|doubleclick|facebook/i.test(t)} />
                    ))}
                  </div>
                </FadeIn>
              )}
            </Section>

            {/* Cookies */}
            <Section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  {!hasFullData ? (
                    <Skeleton width={28} height={24} style={{ marginBottom: 4 }} />
                  ) : (
                    <div style={{
                      fontSize: 20, fontWeight: 500, color: tokens.textPrimary,
                      fontFamily: "Georgia, serif",
                      animation: hasFullData ? "veil-fadeIn 0.3s ease both" : undefined,
                    }}>
                      {cookies}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: tokens.textTertiary, marginTop: 1 }}>
                    Cookies set
                  </div>
                </div>
                {hasFullData && (
                  <FadeIn>
                    <span style={{
                      fontSize: 10, fontWeight: 500,
                      padding: "3px 9px", borderRadius: tokens.radiusPill,
                      background: cookieBadgeStyle.bg, color: cookieBadgeStyle.color,
                    }}>
                      {cookieSeverity.charAt(0).toUpperCase() + cookieSeverity.slice(1)}
                    </span>
                  </FadeIn>
                )}
              </div>
            </Section>

            {/* Dark Patterns */}
            {hasFullData && (
              <SlideDown>
                <Section>
                  <SectionTitle>Dark patterns</SectionTitle>
                  {darkPats.length === 0 ? (
                    <FadeIn>
                      <EmptyState text="No manipulative design patterns detected." variant="good" />
                    </FadeIn>
                  ) : (
                    darkPats.map((p, i) => <FlagRow key={i} text={p} type="warn" />)
                  )}
                </Section>
              </SlideDown>
            )}

            {/* Fingerprinting */}
            {hasFullData && (
              <SlideDown delay={40}>
                <Section>
                  <SectionTitle>Fingerprinting</SectionTitle>
                  {fingerprinting.length === 0 ? (
                    <FadeIn>
                      <EmptyState text="No fingerprinting scripts detected." variant="good" />
                    </FadeIn>
                  ) : (
                    fingerprinting.map((f, i) => <FlagRow key={i} text={f} type="warn" />)
                  )}
                </Section>
              </SlideDown>
            )}

            {/* AI-Generated Content */}
            {hasFullData && aiGenerated.length > 0 && (
              <SlideDown delay={80}>
                <Section>
                  <div style={{
                    padding: "10px 12px",
                    background: tokens.amberBg,
                    border: `1px solid ${tokens.amberRing}`,
                    borderRadius: tokens.radiusSm,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: tokens.amber, letterSpacing: "0.5px", marginBottom: 4 }}>
                      🤖 POSSIBLE AI-GENERATED CONTENT
                    </div>
                    {aiGenerated.map((s, i) => (
                      <div key={i} style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>{s}</div>
                    ))}
                  </div>
                </Section>
              </SlideDown>
            )}

            {/* Cookie Consent */}
            {hasFullData && cookieConsent && cookieConsent.grade !== "N/A" && (
              <SlideDown delay={60}>
                <Section>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: cookieConsent.issues.length > 0 ? 8 : 0 }}>
                    <SectionTitle>Cookie consent</SectionTitle>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      padding: "2px 8px", borderRadius: tokens.radiusPill,
                      background: cookieConsent.grade === "A" ? tokens.greenBg : cookieConsent.grade === "B" ? tokens.amberBg : tokens.redBg,
                      color:      cookieConsent.grade === "A" ? tokens.green   : cookieConsent.grade === "B" ? tokens.amber   : tokens.red,
                    }}>
                      Grade {cookieConsent.grade}
                    </span>
                  </div>
                  {cookieConsent.issues.map((issue, i) => <FlagRow key={i} text={issue} type="warn" />)}
                </Section>
              </SlideDown>
            )}
          </>
        )}

        {/* ── Security Tab ── */}
        {tab === "security" && (
          <>
            {/* Data Broker */}
            {!loading && dataBroker && (
              <SlideDown>
                <div style={{ margin: "10px 12px 0", padding: "12px 14px", background: tokens.amberBg, border: `1px solid ${tokens.amberRing}`, borderRadius: tokens.radius }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tokens.amber, letterSpacing: "0.5px", marginBottom: 4 }}>⚠️ DATA BROKER SITE</div>
                  <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>
                    This site is known to collect and sell personal information. Avoid entering any personal details.
                  </div>
                </div>
              </SlideDown>
            )}

            {/* AI Phishing */}
            {!loading && aiPhishing.length > 0 && (
              <SlideDown delay={30}>
                <div style={{ margin: "10px 12px 0", padding: "12px 14px", background: tokens.redBg, border: `1px solid ${tokens.redRing}`, borderRadius: tokens.radius }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tokens.red, letterSpacing: "0.5px", marginBottom: 4 }}>🤖 AI PHISHING PATTERNS DETECTED</div>
                  {aiPhishing.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>{s}</div>
                  ))}
                </div>
              </SlideDown>
            )}

            {/* Data Breach */}
            {!loading && breachInfo?.breached && (
              <SlideDown delay={60}>
                <div style={{ margin: "10px 12px 0", padding: "12px 14px", background: tokens.amberBg, border: `1px solid ${tokens.amberRing}`, borderRadius: tokens.radius }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tokens.amber, letterSpacing: "0.5px", marginBottom: 4 }}>
                    🔓 DATA BREACH — HaveIBeenPwned
                  </div>
                  <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>
                    This domain was involved in{" "}
                    <strong>{breachInfo.count === 1 ? "a known data breach" : `${breachInfo.count} known breaches`}</strong>.
                    {breachInfo.name && ` Most recent: ${breachInfo.name}`}
                    {breachInfo.date && ` (${breachInfo.date.slice(0, 4)})`}.
                    {" "}Avoid reusing passwords here.
                  </div>
                </div>
              </SlideDown>
            )}

            {/* Confirmed Threat */}
            {!loading && isMalicious && threats.length > 0 && (
              <SlideDown delay={0}>
                <div style={{
                  margin: "10px 12px 0", padding: "12px 14px",
                  background: tokens.redBg, border: `1px solid ${tokens.red}`,
                  borderRadius: tokens.radius,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tokens.red, letterSpacing: "0.5px", marginBottom: 4 }}>
                    ⚠️ CONFIRMED THREAT — Google Safe Browsing
                  </div>
                  {threats.map((t, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: tokens.red, marginBottom: 2 }}>
                        {THREAT_LABELS[t] ?? t}
                      </div>
                      <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>
                        {THREAT_DESCRIPTIONS[t] ?? "This site has been flagged as dangerous."}
                      </div>
                    </div>
                  ))}
                </div>
              </SlideDown>
            )}

            {/* URL Checks */}
            <Section>
              <SectionTitle>URL checks</SectionTitle>
              {[
                { label: "HTTPS connection",       pass: url.startsWith("https://") },
                { label: "Standard URL length",    pass: url.length <= 100 },
                { label: "No suspicious keywords", pass: !/login|verify|signin|confirm|reset/i.test(url) },
                { label: "Domain looks clean",     pass: !/\d{1,3}\.\d{1,3}/.test(url) },
              ].map(({ label, pass }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: `0.5px solid ${tokens.borderDefault}`,
                }}>
                  <span style={{ fontSize: 12, color: tokens.textSecondary }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: pass ? tokens.green : tokens.red }}>
                    {pass ? "Pass" : "Fail"}
                  </span>
                </div>
              ))}
            </Section>

            {/* Security Flags */}
            <Section>
              <SectionTitle>Security flags</SectionTitle>
              {!hasFullData ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : flags.length === 0 ? (
                <FadeIn>
                  <EmptyState text="Nothing flagged — this page's content looks clean." variant="good" />
                </FadeIn>
              ) : (
                <FadeIn>
                  {flags.map((f, i) => <FlagRow key={i} text={f} type="warn" />)}
                </FadeIn>
              )}
            </Section>

            {/* Password Safety */}
            {hasFullData && (
              <SlideDown delay={40}>
                <Section>
                  <SectionTitle>Password safety</SectionTitle>
                  {passwordWarnings.length === 0 ? (
                    <FadeIn>
                      <EmptyState text="No password security issues detected." variant="good" />
                    </FadeIn>
                  ) : (
                    passwordWarnings.map((w, i) => <FlagRow key={i} text={w} type="warn" />)
                  )}
                </Section>
              </SlideDown>
            )}

            {/* Permission Requests */}
            {hasFullData && (
              <SlideDown delay={60}>
                <Section>
                  <SectionTitle>Permission requests</SectionTitle>
                  {permissionIssues.length === 0 ? (
                    <FadeIn>
                      <EmptyState text="No unusual permission requests found." variant="good" />
                    </FadeIn>
                  ) : (
                    permissionIssues.map((p, i) => <FlagRow key={i} text={p} type="warn" />)
                  )}
                </Section>
              </SlideDown>
            )}
          </>
        )}

      </div>{/* end tab content */}

      {/* ── Charlie Explanation ── */}
      <div style={{ padding: "12px 18px", background: tokens.bgSurface, borderTop: `0.5px solid ${tokens.borderDefault}` }}>
        <div style={{
          background: tokens.bgSunk,
          borderRadius: tokens.radiusSm,
          padding: "10px 12px",
          border: `0.5px solid ${tokens.borderDefault}`,
          minHeight: 54,
        }}>
          {/* Skeleton while full data hasn't arrived yet */}
          {!hasFullData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
              <Skeleton width="90%" height={11} />
              <Skeleton width="65%" height={11} />
            </div>
          ) : aiLoading ? (
            /* Full data arrived, AI response in-flight — show fallback + dots */
            <>
              <p style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.65, margin: 0 }}>
                {fallbackExplanation}
              </p>
              <div style={{ fontSize: 10, color: tokens.textDisabled, marginTop: 6, letterSpacing: "0.2px", display: "flex", alignItems: "center", gap: 5 }}>
                Charlie is thinking <ThinkingDots />
              </div>
            </>
          ) : (
            /* Final state — show explanation with fade-in if it just arrived */
            <div key={isAiExplanation ? "ai" : "fallback"} style={{ animation: "veil-fadeIn 0.3s ease both" }}>
              <p style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.65, margin: 0 }}>
                {explanation}
              </p>
              <div style={{ fontSize: 10, color: tokens.textDisabled, marginTop: 6, letterSpacing: "0.2px" }}>
                {isAiExplanation ? "Explained by Charlie · AI" : "Explained by Charlie"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "10px 18px",
        background: tokens.bgSurface,
        borderTop: `0.5px solid ${tokens.borderDefault}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative",
      }}>

        {/* Export dropdown (opens upward) */}
        {exportOpen && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              style={{ position: "fixed", inset: 0, zIndex: 40 }}
              onClick={() => setExportOpen(false)}
            />
            <div style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: 12,
              background: tokens.bgSurface,
              border: `0.5px solid ${tokens.borderDefault}`,
              borderRadius: tokens.radiusSm,
              boxShadow: "0 4px 20px rgba(0,0,0,0.11)",
              overflow: "hidden",
              zIndex: 50,
              minWidth: 168,
              animation: "veil-slideUp 0.15s ease both",
            }}>
              <button
                onClick={handleCopy}
                disabled={!hasFullData}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  width: "100%", padding: "10px 14px",
                  background: "none", border: "none",
                  fontSize: 12, color: hasFullData ? tokens.textPrimary : tokens.textDisabled,
                  cursor: hasFullData ? "pointer" : "default",
                  fontFamily: "inherit", textAlign: "left",
                  borderBottom: `0.5px solid ${tokens.borderDefault}`,
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => hasFullData && ((e.currentTarget as HTMLElement).style.background = tokens.bgSunk)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
              >
                <span style={{ fontSize: 14 }}>{copied ? "✓" : "📋"}</span>
                <span>{copied ? "Copied!" : "Copy as text"}</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={!hasFullData}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  width: "100%", padding: "10px 14px",
                  background: "none", border: "none",
                  fontSize: 12, color: hasFullData ? tokens.textPrimary : tokens.textDisabled,
                  cursor: hasFullData ? "pointer" : "default",
                  fontFamily: "inherit", textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => hasFullData && ((e.currentTarget as HTMLElement).style.background = tokens.bgSunk)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
              >
                <span style={{ fontSize: 14 }}>⬇</span>
                <span>Download .html</span>
              </button>
            </div>
          </>
        )}

        {/* Left: Settings + Export */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            title="Settings"
            aria-label="Open settings"
            style={{
              background: "none", border: "none", padding: "3px 5px",
              cursor: "pointer", color: tokens.textTertiary,
              fontSize: 14, lineHeight: 1, borderRadius: 6,
            }}>
            ⚙️
          </button>
          <button
            onClick={() => setExportOpen(v => !v)}
            title="Export report"
            aria-label="Export report"
            aria-expanded={exportOpen}
            style={{
              background: "none", border: "none", padding: "3px 5px",
              cursor: "pointer", borderRadius: 6,
              fontSize: 13, lineHeight: 1,
              color: exportOpen ? tokens.textPrimary : tokens.textTertiary,
              transition: "color 0.15s",
            }}>
            ↑□
          </button>
        </div>

        <span style={{ fontSize: 10, color: tokens.textDisabled, letterSpacing: "0.3px" }}>
          Oates Technology
        </span>

        <button
          onClick={runScan}
          disabled={scanning}
          aria-label={scanning ? "Scanning…" : "Re-scan this page"}
          style={{
            fontSize: 11,
            padding: "4px 11px",
            borderRadius: tokens.radiusPill,
            border: `0.5px solid ${tokens.borderStrong}`,
            background: "transparent",
            color: scanning ? tokens.textDisabled : tokens.textSecondary,
            cursor: scanning ? "default" : "pointer",
            fontFamily: "inherit",
            transition: "color 0.15s ease, opacity 0.15s ease",
          }}>
          {scanning ? "Scanning…" : "Rescan"}
        </button>
      </div>

    </div>
  )
}
