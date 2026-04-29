let tooltipEnabled = true
let tooltipEl: HTMLDivElement | null = null
let currentAnchor: HTMLAnchorElement | null = null

// Load initial setting
chrome.storage.local.get("tooltipEnabled", (data) => {
  tooltipEnabled = data.tooltipEnabled !== false
})

// Listen for setting changes from popup
chrome.storage.onChanged.addListener((changes) => {
  if ("tooltipEnabled" in changes) {
    tooltipEnabled = changes.tooltipEnabled.newValue
    if (!tooltipEnabled) removeTooltip()
  }
})

function getRiskScore(url: string): { score: number; label: string; color: string } {
  let score = 80

  if (url.startsWith("http://")) score = 30
  if (/login|verify|signin|account/.test(url)) score = Math.max(score - 20, 0)
  if (url.length > 100) score = Math.max(score - 15, 0)
  if (/phish|malware|spam/.test(url)) score = Math.max(score - 40, 0)

  if (score >= 70) return { score, label: "Looks Safe", color: "#22c55e" }
  if (score >= 40) return { score, label: "Use Caution", color: "#f59e0b" }
  return { score, label: "High Risk", color: "#ef4444" }
}

function createTooltip(anchor: HTMLAnchorElement) {
  if (!tooltipEnabled) return

  const href = anchor.href
  if (!href || href.startsWith("javascript:")) return

  let hostname = href
  try { hostname = new URL(href).hostname } catch {}

  const { score, label, color } = getRiskScore(href)

  tooltipEl = document.createElement("div")
  tooltipEl.setAttribute("data-charlie-tooltip", "true")
  tooltipEl.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    background: #0f0f0f;
    border: 1px solid #2a2a2a;
    border-radius: 10px;
    padding: 10px 14px;
    min-width: 180px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    pointer-events: none;
  `

  tooltipEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:13px">🧠</span>
      <span style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.5px">CHARLIE AI</span>
    </div>
    <div style="font-size:12px;color:#e5e7eb;margin-bottom:8px;word-break:break-all">${hostname}</div>
    <div style="display:flex;align-items:center;gap:10px">
      <div style="
        width:40px;height:40px;border-radius:50%;
        border:2.5px solid ${color};
        display:flex;align-items:center;justify-content:center;
        flex-shrink:0
      ">
        <span style="font-size:13px;font-weight:700;color:${color}">${score}</span>
      </div>
      <div>
        <div style="font-size:13px;font-weight:600;color:${color}">${label}</div>
        <div style="font-size:10px;color:#6b7280">Link risk score</div>
      </div>
    </div>
  `

  document.body.appendChild(tooltipEl)
}

function positionTooltip(e: MouseEvent) {
  if (!tooltipEl) return
  const pad = 12
  const tw = tooltipEl.offsetWidth
  const th = tooltipEl.offsetHeight
  let x = e.clientX + pad
  let y = e.clientY + pad

  if (x + tw > window.innerWidth - pad) x = e.clientX - tw - pad
  if (y + th > window.innerHeight - pad) y = e.clientY - th - pad

  tooltipEl.style.left = `${x}px`
  tooltipEl.style.top = `${y}px`
}

function removeTooltip() {
  if (tooltipEl) {
    tooltipEl.remove()
    tooltipEl = null
  }
  currentAnchor = null
}

document.addEventListener("mouseover", (e) => {
  const anchor = (e.target as Element).closest("a") as HTMLAnchorElement | null
  if (!anchor || anchor === currentAnchor) return
  removeTooltip()
  currentAnchor = anchor
  createTooltip(anchor)
  if (tooltipEl) positionTooltip(e)
})

document.addEventListener("mousemove", positionTooltip)

document.addEventListener("mouseout", (e) => {
  const anchor = (e.target as Element).closest("a")
  if (anchor === currentAnchor) removeTooltip()
})

// Page scan handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCAN_PAGE") {
    const pageText = document.body.innerText.toLowerCase()
    const flags: string[] = []

    if (pageText.includes("password")) flags.push("Password field detected")
    if (pageText.includes("verify your account")) flags.push("Account verification request")
    if (pageText.includes("urgent")) flags.push("Urgency language detected")
    if (pageText.includes("credit card")) flags.push("Sensitive info request")

    sendResponse({ flags })
  }

  return true
})
