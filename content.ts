chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCAN_PAGE") {
    const pageText = document.body.innerText.toLowerCase()

    const flags: string[] = []

    if (pageText.includes("password")) {
      flags.push("Password field detected")
    }

    if (pageText.includes("verify your account")) {
      flags.push("Account verification request")
    }

    if (pageText.includes("urgent")) {
      flags.push("Urgency language detected")
    }

    if (pageText.includes("credit card")) {
      flags.push("Sensitive info request")
    }

    sendResponse({ flags })
  }
})
