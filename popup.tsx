import { useEffect, useState } from "react"

function IndexPopup() {
  const [url, setUrl] = useState("")
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState("Analyzing...")
  const [flags, setFlags] = useState<string[]>([])

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentUrl = tabs[0]?.url || ""
      setUrl(currentUrl)

      let riskScore = 80
      let statusText = "Safe"

      if (currentUrl.includes("http://")) {
        riskScore = 30
        statusText = "⚠️ Not Secure"
      }

      if (currentUrl.includes("login") || currentUrl.includes("verify")) {
        riskScore -= 20
        statusText = "⚠️ Suspicious"
      }

      if (currentUrl.length > 100) {
        riskScore -= 15
      }

      chrome.tabs.sendMessage(
        tabs[0].id!,
        { type: "SCAN_PAGE" },
        (response) => {
          if (chrome.runtime.lastError) {
            setScore(riskScore)
            setStatus(statusText)
            return
          }

          const foundFlags = response?.flags || []
          setFlags(foundFlags)

          if (foundFlags.length > 0) {
            riskScore = Math.max(riskScore - 30, 0)
            statusText = "⚠️ Suspicious"
          }

          setScore(riskScore)
          setStatus(statusText)
        }
      )
    })
  }, [])

  return (
    <div style={{ padding: 16, width: 320 }}>
      <h2>🧠 Charlie AI</h2>

      <p><strong>Site:</strong></p>
      <p style={{ fontSize: 12, wordBreak: "break-word" }}>{url}</p>

      <p><strong>Score:</strong> {score}/100</p>
      <p><strong>Status:</strong> {status}</p>

      {flags.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p><strong>Flags:</strong></p>
          <ul style={{ paddingLeft: 18, marginTop: 6 }}>
            {flags.map((flag, index) => (
              <li key={index} style={{ fontSize: 12 }}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default IndexPopup