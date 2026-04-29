import { useEffect, useState } from "react"

// ─── Design tokens (matches popup stone theme) ────────────────────────────────
const tokens = {
  bgPage:        "#F2F1EE",
  bgSurface:     "#FFFFFF",
  bgSunk:        "#EDECE9",
  bgInput:       "#E8E7E3",
  textPrimary:   "#1A1A18",
  textSecondary: "#5A5955",
  textTertiary:  "#9E9C97",
  textDisabled:  "#C4C2BC",
  borderDefault: "#E2E0DB",
  borderStrong:  "#CBC9C3",
  green:         "#1E7A3E",
  greenBg:       "#E6F4EC",
  greenRing:     "#34D399",
  amber:         "#7A4F00",
  amberBg:       "#FFF3D6",
  amberRing:     "#F59E0B",
  red:           "#B91C1C",
  redBg:         "#FEE9E9",
  redRing:       "#EF4444",
  logoMark:      "#1A1A18",
  radius:        "12px",
  radiusSm:      "8px",
  radiusPill:    "999px",
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

// ─── Veil Logo (Space Invader pixel art) ─────────────────────────────────────
function VeilLogo() {
  return (
    <svg width="20" height="17" viewBox="0 0 13 11" fill="#A855F7" xmlns="http://www.w3.org/2000/svg">
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

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 42, height: 24, borderRadius: 999,
        background: on ? tokens.green : tokens.borderStrong,
        position: "relative", cursor: "pointer",
        transition: "background 0.2s ease", flexShrink: 0,
      }}>
      <div style={{
        position: "absolute", top: 3,
        left: on ? 21 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
        transition: "left 0.2s ease",
      }} />
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%",
      transform: "translateX(-50%)",
      background: type === "success" ? tokens.green : tokens.red,
      color: "#fff",
      padding: "10px 20px",
      borderRadius: tokens.radiusPill,
      fontSize: 13, fontWeight: 500,
      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      zIndex: 999,
    }}>
      {message}
    </div>
  )
}

// ─── Main Options Page ────────────────────────────────────────────────────────
export default function OptionsPage() {
  const [apiKey, setApiKey]                     = useState("")
  const [showKey, setShowKey]                   = useState(false)
  const [anthropicKey, setAnthropicKey]         = useState("")
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [notifications, setNotifications]       = useState(false)
  const [linkHoverTooltip, setLinkHoverTooltip] = useState(false)
  const [linkClickInterceptor, setLinkClickInterceptor] = useState(false)
  const [iconBadge, setIconBadge] = useState(false)
  const [saved, setSaved]                       = useState(false)
  const [historyCount, setHistoryCount] = useState(0)
  const [toast, setToast]             = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [testing, setTesting]         = useState(false)
  const [testResult, setTestResult]   = useState<"none" | "valid" | "invalid">("none")
  const [anthropicTesting, setAnthropicTesting] = useState(false)
  const [anthropicTestResult, setAnthropicTestResult] = useState<"none" | "valid" | "invalid">("none")

  // Load saved settings on mount
  useEffect(() => {
    chrome.storage.local.get([SETTINGS_KEY, HISTORY_KEY], (data) => {
      const s: Settings = data[SETTINGS_KEY] || { safeBrowsingKey: "", anthropicKey: "", notifications: false, linkHoverTooltip: false, linkClickInterceptor: false, iconBadge: false }
      setApiKey(s.safeBrowsingKey || "")
      setAnthropicKey(s.anthropicKey || "")
      setNotifications(s.notifications ?? false)
      setLinkHoverTooltip(s.linkHoverTooltip ?? false)
      setLinkClickInterceptor(s.linkClickInterceptor ?? false)
      setIconBadge(s.iconBadge ?? false)
      const history = data[HISTORY_KEY] || []
      setHistoryCount(history.length)
    })
  }, [])

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function saveSettings() {
    const settings: Settings = { safeBrowsingKey: apiKey.trim(), anthropicKey: anthropicKey.trim(), notifications, linkHoverTooltip, linkClickInterceptor, iconBadge }
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
      setSaved(true)
      showToast("Settings saved", "success")
      setTimeout(() => setSaved(false), 2000)
    })
  }

  function clearHistory() {
    chrome.storage.local.set({ [HISTORY_KEY]: [] }, () => {
      setHistoryCount(0)
      showToast("Scan history cleared", "success")
    })
  }

  async function testApiKey() {
    const key = apiKey.trim()
    if (!key) {
      showToast("Enter an API key first", "error")
      return
    }
    setTesting(true)
    setTestResult("none")
    try {
      // Test with a known safe URL — if the key is valid, we get a 200 with no matches
      const res = await fetch(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: { clientId: "veil-test", clientVersion: "1.0" },
            threatInfo: {
              threatTypes: ["MALWARE"],
              platformTypes: ["ANY_PLATFORM"],
              threatEntryTypes: ["URL"],
              threatEntries: [{ url: "https://www.google.com" }],
            },
          }),
        }
      )
      if (res.ok) {
        setTestResult("valid")
        showToast("API key is valid ✓", "success")
      } else {
        setTestResult("invalid")
        showToast(`Invalid key (${res.status})`, "error")
      }
    } catch {
      setTestResult("invalid")
      showToast("Connection failed", "error")
    }
    setTesting(false)
  }

  async function testAnthropicKey() {
    const key = anthropicKey.trim()
    if (!key) { showToast("Enter an Anthropic API key first", "error"); return }
    setAnthropicTesting(true)
    setAnthropicTestResult("none")
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 10,
          messages: [{ role: "user", content: "ping" }],
        }),
      })
      setAnthropicTestResult(res.ok ? "valid" : "invalid")
      showToast(res.ok ? "Anthropic key is valid ✓" : `Invalid key (${res.status})`, res.ok ? "success" : "error")
    } catch {
      setAnthropicTestResult("invalid")
      showToast("Connection failed", "error")
    }
    setAnthropicTesting(false)
  }

  const keyBorderColor =
    testResult === "valid"   ? tokens.green :
    testResult === "invalid" ? tokens.red   :
    apiKey.length > 0        ? tokens.borderStrong :
    tokens.borderDefault

  return (
    <div style={{
      minHeight: "100vh",
      background: tokens.bgPage,
      fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif",
      color: tokens.textPrimary,
    }}>

      {/* ── Header ── */}
      <div style={{
        background: tokens.bgSurface,
        borderBottom: `0.5px solid ${tokens.borderDefault}`,
        padding: "18px 32px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: tokens.logoMark,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <VeilLogo />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.3px" }}>Veil</div>
          <div style={{ fontSize: 11, color: tokens.textTertiary, marginTop: 1 }}>Settings — Powered by Charlie</div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "32px auto", padding: "0 24px" }}>

        {/* ── Safe Browsing API Key ── */}
        <div style={{
          background: tokens.bgSurface,
          borderRadius: tokens.radius,
          border: `0.5px solid ${tokens.borderDefault}`,
          overflow: "hidden",
          marginBottom: 16,
        }}>
          <div style={{ padding: "16px 20px", borderBottom: `0.5px solid ${tokens.borderDefault}` }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Google Safe Browsing API Key</div>
            <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>
              Required for Charlie to check URLs against Google's real-time threat database.
              Get a free key at{" "}
              <a
                href="https://console.cloud.google.com/apis/library/safebrowsing.googleapis.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: tokens.textPrimary, fontWeight: 500 }}>
                Google Cloud Console
              </a>.
            </div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setTestResult("none") }}
                  placeholder="Paste your API key here…"
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 12px",
                    borderRadius: tokens.radiusSm,
                    border: `1px solid ${keyBorderColor}`,
                    background: tokens.bgInput,
                    fontSize: 13,
                    color: tokens.textPrimary,
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: "absolute", right: 10, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    cursor: "pointer", fontSize: 14,
                    color: tokens.textTertiary, padding: 2,
                  }}>
                  {showKey ? "🙈" : "👁"}
                </button>
              </div>
              <button
                onClick={testApiKey}
                disabled={testing || !apiKey.trim()}
                style={{
                  padding: "10px 14px",
                  borderRadius: tokens.radiusSm,
                  border: `0.5px solid ${tokens.borderStrong}`,
                  background: tokens.bgSunk,
                  color: testing || !apiKey.trim() ? tokens.textDisabled : tokens.textSecondary,
                  fontSize: 12, fontWeight: 500,
                  cursor: testing || !apiKey.trim() ? "default" : "pointer",
                  fontFamily: "inherit", whiteSpace: "nowrap",
                }}>
                {testing ? "Testing…" : "Test key"}
              </button>
            </div>
            {testResult === "valid" && (
              <div style={{ fontSize: 11, color: tokens.green, marginTop: 6 }}>
                ✓ Key is valid — Safe Browsing is active
              </div>
            )}
            {testResult === "invalid" && (
              <div style={{ fontSize: 11, color: tokens.red, marginTop: 6 }}>
                ✗ Key did not work — check it and try again
              </div>
            )}
          </div>
        </div>

        {/* ── Anthropic (Claude AI) Key ── */}
        <div style={{
          background: tokens.bgSurface,
          borderRadius: tokens.radius,
          border: `0.5px solid ${tokens.borderDefault}`,
          overflow: "hidden",
          marginBottom: 16,
        }}>
          <div style={{ padding: "16px 20px", borderBottom: `0.5px solid ${tokens.borderDefault}` }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Anthropic API Key (Claude AI)</div>
            <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.55 }}>
              Powers the "Explained by Charlie" AI summary. Get a free key at{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
                style={{ color: tokens.textPrimary, fontWeight: 500 }}>
                console.anthropic.com
              </a>. Optional — without it, Charlie uses template explanations.
            </div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type={showAnthropicKey ? "text" : "password"}
                  value={anthropicKey}
                  onChange={(e) => { setAnthropicKey(e.target.value); setAnthropicTestResult("none") }}
                  placeholder="sk-ant-…"
                  style={{
                    width: "100%", padding: "10px 40px 10px 12px",
                    borderRadius: tokens.radiusSm,
                    border: `1px solid ${anthropicTestResult === "valid" ? tokens.green : anthropicTestResult === "invalid" ? tokens.red : anthropicKey.length > 0 ? tokens.borderStrong : tokens.borderDefault}`,
                    background: tokens.bgInput, fontSize: 13,
                    color: tokens.textPrimary, fontFamily: "inherit",
                    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
                  }}
                />
                <button onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: tokens.textTertiary, padding: 2 }}>
                  {showAnthropicKey ? "🙈" : "👁"}
                </button>
              </div>
              <button onClick={testAnthropicKey} disabled={anthropicTesting || !anthropicKey.trim()}
                style={{
                  padding: "10px 14px", borderRadius: tokens.radiusSm,
                  border: `0.5px solid ${tokens.borderStrong}`, background: tokens.bgSunk,
                  color: anthropicTesting || !anthropicKey.trim() ? tokens.textDisabled : tokens.textSecondary,
                  fontSize: 12, fontWeight: 500,
                  cursor: anthropicTesting || !anthropicKey.trim() ? "default" : "pointer",
                  fontFamily: "inherit", whiteSpace: "nowrap",
                }}>
                {anthropicTesting ? "Testing…" : "Test key"}
              </button>
            </div>
            {anthropicTestResult === "valid" && (
              <div style={{ fontSize: 11, color: tokens.green, marginTop: 6 }}>✓ Claude AI is active — Charlie will use AI explanations</div>
            )}
            {anthropicTestResult === "invalid" && (
              <div style={{ fontSize: 11, color: tokens.red, marginTop: 6 }}>✗ Key did not work — check it and try again</div>
            )}
          </div>
        </div>

        {/* ── Notifications ── */}
        <div style={{
          background: tokens.bgSurface,
          borderRadius: tokens.radius,
          border: `0.5px solid ${tokens.borderDefault}`,
          overflow: "hidden",
          marginBottom: 16,
        }}>
          <div style={{
            padding: "14px 20px", borderBottom: `0.5px solid ${tokens.borderDefault}`,
            fontSize: 11, fontWeight: 500, color: tokens.textTertiary,
            letterSpacing: "0.8px", textTransform: "uppercase",
          }}>
            Features
          </div>

          {/* Link hover tooltip */}
          <div style={{
            padding: "14px 20px", borderBottom: `0.5px solid ${tokens.borderDefault}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Link hover tooltip</div>
              <div style={{ fontSize: 12, color: tokens.textSecondary }}>
                Show a risk score when hovering over links on any page
              </div>
            </div>
            <Toggle on={linkHoverTooltip} onChange={setLinkHoverTooltip} />
          </div>

          {/* Link click interceptor */}
          <div style={{
            padding: "14px 20px", borderBottom: `0.5px solid ${tokens.borderDefault}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Risky link warning</div>
              <div style={{ fontSize: 12, color: tokens.textSecondary }}>
                Block navigation and show a warning when clicking a high-risk link
              </div>
            </div>
            <Toggle on={linkClickInterceptor} onChange={setLinkClickInterceptor} />
          </div>

          {/* Icon badge */}
          <div style={{
            padding: "14px 20px", borderBottom: `0.5px solid ${tokens.borderDefault}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Icon badge & hover info</div>
              <div style={{ fontSize: 12, color: tokens.textSecondary }}>
                Show risk score on the extension icon with a colour indicator and hover summary
              </div>
            </div>
            <Toggle on={iconBadge} onChange={setIconBadge} />
          </div>

          {/* Threat notifications */}
          <div style={{
            padding: "14px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Threat notifications</div>
              <div style={{ fontSize: 12, color: tokens.textSecondary }}>
                Show a Chrome notification when Veil detects a high-risk page
              </div>
            </div>
            <Toggle on={notifications} onChange={setNotifications} />
          </div>
        </div>

        {/* ── Scan History ── */}
        <div style={{
          background: tokens.bgSurface,
          borderRadius: tokens.radius,
          border: `0.5px solid ${tokens.borderDefault}`,
          padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 24,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Scan history</div>
            <div style={{ fontSize: 12, color: tokens.textSecondary }}>
              {historyCount} site{historyCount !== 1 ? "s" : ""} stored locally
            </div>
          </div>
          <button
            onClick={clearHistory}
            disabled={historyCount === 0}
            style={{
              padding: "7px 14px",
              borderRadius: tokens.radiusPill,
              border: `0.5px solid ${historyCount === 0 ? tokens.borderDefault : tokens.red}`,
              background: "transparent",
              color: historyCount === 0 ? tokens.textDisabled : tokens.red,
              fontSize: 12, fontWeight: 500,
              cursor: historyCount === 0 ? "default" : "pointer",
              fontFamily: "inherit",
            }}>
            Clear history
          </button>
        </div>

        {/* ── Save Button ── */}
        <button
          onClick={saveSettings}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: tokens.radius,
            border: "none",
            background: tokens.logoMark,
            color: "#fff",
            fontSize: 14, fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.2px",
          }}>
          {saved ? "Saved ✓" : "Save settings"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: tokens.textDisabled }}>
          Oates Technology · Veil · Explained by Charlie
          {" · "}
          <a
            href={chrome.runtime.getURL("privacy-policy.html")}
            target="_blank"
            rel="noreferrer"
            style={{ color: tokens.textDisabled, textDecoration: "underline" }}>
            Privacy Policy
          </a>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
