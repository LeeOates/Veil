type Flag = { message: string; severity: "high" | "low" }

const HIGH_SIGNALS: { pattern: RegExp | string; message: string }[] = [
  { pattern: "verify your account", message: "Account verification request" },
  { pattern: "your account has been", message: "Account threat language" },
  { pattern: "expires in", message: "Artificial urgency (countdown)" },
  { pattern: "act now", message: "Artificial urgency language" },
  { pattern: "you have been selected", message: "Scam selection language" },
  { pattern: "confirm your identity", message: "Identity confirmation request" },
  { pattern: "your payment was declined", message: "Payment scare tactic" },
  { pattern: "unusual activity", message: "Unusual activity claim" },
]

const LOW_SIGNALS: { pattern: RegExp | string; message: string }[] = [
  { pattern: "password", message: "Password field detected" },
  { pattern: "credit card", message: "Payment info requested" },
  { pattern: "ssn", message: "Social security number requested" },
  { pattern: "urgent", message: "Urgency language detected" },
  { pattern: "limited time", message: "Limited-time pressure tactic" },
  { pattern: "free gift", message: "Free gift offer detected" },
  { pattern: "congratulations", message: "Prize/reward language detected" },
]

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "SCAN_PAGE") return

  const pageText = document.body.innerText.toLowerCase()
  const seen = new Set<string>()
  const flags: string[] = []

  // Check high severity signals first
  for (const { pattern, message } of HIGH_SIGNALS) {
    const matched =
      typeof pattern === "string" ? pageText.includes(pattern) : pattern.test(pageText)
    if (matched && !seen.has(message)) {
      seen.add(message)
      flags.push(message)
    }
  }

  // Check low severity signals
  for (const { pattern, message } of LOW_SIGNALS) {
    const matched =
      typeof pattern === "string" ? pageText.includes(pattern) : pattern.test(pageText)
    if (matched && !seen.has(message)) {
      seen.add(message)
      flags.push(message)
    }
  }

  // Check for excessive ALL CAPS blocks (common in scam pages)
  const capsWords = (document.body.innerText.match(/\b[A-Z]{4,}\b/g) || []).length
  if (capsWords > 10 && !seen.has("Excessive caps text")) {
    flags.push("Excessive caps text")
  }

  // Check for suspicious number of external links
  const allLinks = Array.from(document.querySelectorAll("a[href]"))
  const externalLinks = allLinks.filter((a) => {
    try {
      return new URL((a as HTMLAnchorElement).href).hostname !== location.hostname
    } catch {
      return false
    }
  })
  if (externalLinks.length > 20 && !seen.has("High volume of external links")) {
    flags.push("High volume of external links")
  }

  sendResponse({ flags })
})
