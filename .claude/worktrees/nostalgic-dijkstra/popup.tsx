import { useEffect, useState } from "react"

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e"
  if (score >= 40) return "#f59e0b"
  return "#ef4444"
}

function getStatusLabel(score: number): string {
  if (score >= 70) return "Looks Safe"
  if (score >= 40) return "Use Caution"
  return "High Risk"
}

function IndexPopup() {
  const [url, setUrl] = useState("")
  const [hostname, setHostname] = useState("")
  const [score, setScore] = useState<number | null>(null)
  const [flags, setFlags] = useState<string[]>([])
  const [tooltipEnabled, setTooltipEnabled] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    // Load tooltip setting
    chrome.storage.local.get("tooltipEnabled", (data) => {
      setTooltipEnabled(data.tooltipEnabled !== false)
    })

    // Analyze current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || ""
      setUrl(currentUrl)

      try {
        setHostname(new URL(currentUrl).hostname)
      } catch {
        setHostname(currentUrl)
      }

      let riskScore = 80

      if (currentUrl.startsWith("http://")) {
        riskScore = 30
      }

      if (currentUrl.includes("login") || currentUrl.includes("verify")) {
        riskScore = Math.max(riskScore - 20, 0)
      }

      if (currentUrl.length > 100) {
        riskScore = Math.max(riskScore - 15, 0)
      }

      chrome.tabs.sendMessage(
        tabs[0].id!,
        { type: "SCAN_PAGE" },
        (response) => {
          if (chrome.runtime.lastError) {
            setScore(riskScore)
            return
          }

          const foundFlags: string[] = response?.flags || []
          setFlags(foundFlags)

          if (foundFlags.length > 0) {
            riskScore = Math.max(riskScore - 30, 0)
          }

          setScore(riskScore)
        }
      )
    })
  }, [])

  function toggleTooltip(enabled: boolean) {
    setTooltipEnabled(enabled)
    chrome.storage.local.set({ tooltipEnabled: enabled })
  }

  const scoreColor = score !== null ? getScoreColor(score) : "#6b7280"
  const statusLabel = score !== null ? getStatusLabel(score) : "Analyzing..."

  return (
    <div
      style={{
        width: 320,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: "#0f0f0f",
        color: "#f0f0f0",
      }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #1f1f1f",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: "#1a1a2e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}>
            🧠
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: 0.3 }}>
            CHARLIE AI
          </span>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          style={{
            background: "none",
            border: "none",
            color: showSettings ? "#a78bfa" : "#6b7280",
            cursor: "pointer",
            fontSize: 16,
            padding: "2px 4px",
            lineHeight: 1,
          }}
          title="Settings">
          ⚙
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #1f1f1f",
            backgroundColor: "#131313",
          }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>
            SETTINGS
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
            <div>
              <div style={{ fontSize: 13, color: "#e5e7eb" }}>
                Link tooltips
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                Show risk score when hovering links
              </div>
            </div>
            {/* Toggle switch */}
            <div
              onClick={() => toggleTooltip(!tooltipEnabled)}
              style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                backgroundColor: tooltipEnabled ? "#7c3aed" : "#374151",
                position: "relative",
                cursor: "pointer",
                transition: "background-color 0.2s",
                flexShrink: 0,
              }}>
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: tooltipEnabled ? 21 : 3,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                  transition: "left 0.2s",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* URL */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1f1f1f" }}>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>
          Current site
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#e5e7eb",
            wordBreak: "break-all",
            lineHeight: 1.4,
          }}>
          {hostname || "Loading..."}
        </div>
      </div>

      {/* Score */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          borderBottom: flags.length > 0 ? "1px solid #1f1f1f" : "none",
        }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: `3px solid ${scoreColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: scoreColor }}>
            {score ?? "—"}
          </span>
        </div>
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: scoreColor,
              marginBottom: 3,
            }}>
            {statusLabel}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>Site risk score</div>
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
            DETECTED FLAGS
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}>
            {flags.map((flag, i) => (
              <li
                key={i}
                style={{
                  fontSize: 12,
                  color: "#fca5a5",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                <span style={{ color: "#ef4444" }}>⚠</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default IndexPopup
