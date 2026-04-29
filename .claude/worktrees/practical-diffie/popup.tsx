import { useEffect, useState } from "react"
import icon from "url:assets/icon.png"

const RESTRICTED_PREFIXES = ["chrome://", "chrome-extension://", "about:", "edge://", "file://"]

function isRestricted(url: string) {
  return RESTRICTED_PREFIXES.some((p) => url.startsWith(p)) || url === ""
}

function calcScore(url: string, flags: string[]) {
  let score = 100
  if (url.startsWith("http://")) score -= 40
  if (url.includes("login") || url.includes("verify")) score -= 20
  if (url.length > 100) score -= 15
  score -= Math.min(flags.length * 15, 45)
  return Math.max(score, 0)
}

function getStatus(score: number) {
  if (score >= 70) return "Safe"
  if (score >= 40) return "Caution"
  return "Unsafe"
}

function IndexPopup() {
  const [url, setUrl] = useState("")
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState("Safe")
  const [flags, setFlags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [restricted, setRestricted] = useState(false)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || ""
      setUrl(currentUrl)

      if (isRestricted(currentUrl)) {
        setRestricted(true)
        setLoading(false)
        return
      }

      const timeout = setTimeout(() => {
        const s = calcScore(currentUrl, [])
        setScore(s)
        setStatus(getStatus(s))
        setLoading(false)
      }, 2000)

      chrome.tabs.sendMessage(
        tabs[0].id!,
        { type: "SCAN_PAGE" },
        (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) {
            const s = calcScore(currentUrl, [])
            setScore(s)
            setStatus(getStatus(s))
            setLoading(false)
            return
          }
          const foundFlags: string[] = response?.flags || []
          const s = calcScore(currentUrl, foundFlags)
          setFlags(foundFlags)
          setScore(s)
          setStatus(getStatus(s))
          setLoading(false)
        }
      )
    })
  }, [])

  const scoreColor =
    score >= 70 ? "#a78bfa" : score >= 40 ? "#f59e0b" : "#ef4444"

  const statusBadgeStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    border: `1px solid ${scoreColor}`,
    color: scoreColor,
    background: "rgba(124,58,237,0.1)",
  }

  return (
    <div
      style={{
        width: 320,
        background: "#1a1a2e",
        color: "#e2e8f0",
        fontFamily: "'Courier New', Courier, monospace",
      }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #2d1b69 0%, #4c1d95 100%)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "2px solid #7c3aed",
        }}>
        <img
          src={icon}
          width={36}
          height={36}
          style={{ imageRendering: "crisp-edges" }}
        />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#c4b5fd" }}>
            CHARLIE AI
          </div>
          <div style={{ fontSize: 10, color: "#8b5cf6", letterSpacing: 2 }}>
            SITE SCANNER
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        {/* URL */}
        <div
          style={{
            background: "#16213e",
            border: "1px solid #374151",
            borderRadius: 6,
            padding: "8px 10px",
            marginBottom: 14,
          }}>
          <div style={{ fontSize: 9, color: "#6b7280", letterSpacing: 1, marginBottom: 4 }}>
            CURRENT SITE
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#a78bfa",
              wordBreak: "break-all",
              lineHeight: 1.4,
            }}>
            {url || "—"}
          </div>
        </div>

        {/* Restricted page */}
        {restricted ? (
          <div
            style={{
              background: "#16213e",
              border: "1px solid #374151",
              borderRadius: 6,
              padding: "14px 12px",
              fontSize: 12,
              color: "#6b7280",
              textAlign: "center",
            }}>
            Cannot scan this page
          </div>
        ) : loading ? (
          /* Loading state */
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div
              style={{
                display: "inline-block",
                width: 28,
                height: 28,
                border: "3px solid #2d2d4a",
                borderTopColor: "#7c3aed",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 10, letterSpacing: 1 }}>
              ANALYZING...
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* Score */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}>
                <span style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 1 }}>
                  TRUST SCORE
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: scoreColor }}>
                  {score}
                  <span style={{ fontSize: 11, color: "#6b7280" }}>/100</span>
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "#2d2d4a",
                  borderRadius: 3,
                  overflow: "hidden",
                }}>
                <div
                  style={{
                    height: "100%",
                    width: `${score}%`,
                    background: `linear-gradient(90deg, #7c3aed, ${scoreColor})`,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: flags.length > 0 ? 14 : 0 }}>
              <span style={{ fontSize: 9, color: "#6b7280", letterSpacing: 1, marginRight: 8 }}>
                STATUS
              </span>
              <span style={statusBadgeStyle}>{status.toUpperCase()}</span>
            </div>

            {/* Flags */}
            {flags.length > 0 && (
              <div
                style={{
                  background: "#1e1030",
                  border: "1px solid #7c3aed",
                  borderRadius: 6,
                  padding: "10px 12px",
                }}>
                <div style={{ fontSize: 9, color: "#8b5cf6", letterSpacing: 1, marginBottom: 8 }}>
                  ⚑ FLAGS DETECTED
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {flags.map((flag, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 11,
                        color: "#c4b5fd",
                        paddingLeft: 10,
                        marginBottom: 4,
                        borderLeft: "2px solid #7c3aed",
                      }}>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #2d2d4a",
          padding: "6px 16px",
          fontSize: 9,
          color: "#374151",
          letterSpacing: 1,
          textAlign: "right",
        }}>
        CHARLIE AI v0.0.1
      </div>
    </div>
  )
}

export default IndexPopup
