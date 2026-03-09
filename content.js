(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const query = (urlParams.get("q") || "").trim();

  const match = query.match(/^(?:datasheet|ds):(\S+)$/i);
  if (!match) return;

  const partNumber = match[1].toUpperCase();
  const partLower = partNumber.toLowerCase();

  function normalize(str) {
    return str.toLowerCase().replace(/[\s\-_\.\/]/g, "");
  }
  const partNorm = normalize(partNumber);

  const TRUSTED_SOURCES = [
    { domain: "ti.com", weight: 10 },
    { domain: "st.com", weight: 10 },
    { domain: "onsemi.com", weight: 10 },
    { domain: "infineon.com", weight: 10 },
    { domain: "nxp.com", weight: 10 },
    { domain: "microchip.com", weight: 10 },
    { domain: "analog.com", weight: 10 },
    { domain: "maximintegrated.com", weight: 10 },
    { domain: "digikey.com", weight: 9 },
    { domain: "mouser.com", weight: 8 },
    { domain: "alldatasheet.com", weight: 7 },
    { domain: "datasheetcatalog.com", weight: 6 },
    { domain: "datasheet4u.com", weight: 5 },
  ];

  const DRAFT_KEYWORDS = ["draft", "preliminary", "pre-release", "prerelease", "obsolete", "not recommended", "nrnd"];

  function scoreLink(href, anchorText) {
    const hrefLower = href.toLowerCase();
    const textLower = anchorText.toLowerCase();

    if (!hrefLower.includes(".pdf")) return -1;

    const hrefNorm = normalize(href);
    const textNorm = normalize(anchorText);

    if (!hrefNorm.includes(partNorm) && !textNorm.includes(partNorm)) return -1;

    let score = 0;

    const combined = hrefLower + " " + textLower;
    for (const kw of DRAFT_KEYWORDS) {
      if (combined.includes(kw)) score -= 50;
    }

    if (hrefLower.includes("datasheet")) score += 10;
    if (textLower.includes("datasheet")) score += 10;

    for (const source of TRUSTED_SOURCES) {
      if (hrefLower.includes(source.domain)) {
        score += source.weight;
        break;
      }
    }

    if (hrefLower.includes(partLower)) score += 15;
    if (textLower.includes(partLower)) score += 15;
    if (hrefNorm.includes(partNorm)) score += 10;
    if (textNorm.includes(partNorm)) score += 10;

    return score;
  }

  function scanAndRedirect() {
    const allLinks = document.querySelectorAll("a[href]");
    const seen = new Set();
    let best = null;

    for (const a of allLinks) {
      const href = a.href;
      if (!href || seen.has(href)) continue;
      seen.add(href);

      if (
        href.includes("google.com") ||
        href.includes("googleapis.com") ||
        href.includes("gstatic.com") ||
        href.includes("youtube.com") ||
        href.startsWith("javascript:") ||
        href.startsWith("#")
      ) continue;

      const text = a.textContent || "";
      const score = scoreLink(href, text);
      if (score > 0 && (!best || score > best.score)) {
        best = { href, score };
      }
    }

    return best;
  }

  // Try immediately
  let redirected = false;

  function tryRedirect() {
    if (redirected) return;
    const best = scanAndRedirect();
    if (best) {
      redirected = true;
      console.log("[Auto-Open-Datasheets] Opening:", best.href, "score:", best.score);
      window.location.href = best.href;
    }
  }

  tryRedirect();

  // Also observe DOM for results loading in dynamically
  if (!redirected) {
    const observer = new MutationObserver(() => tryRedirect());
    observer.observe(document.body, { childList: true, subtree: true });

    // Give up after 3 seconds and show notification
    setTimeout(() => {
      observer.disconnect();
      if (!redirected) {
        showNotification(`No datasheet found for ${partNumber}`, "error");
      }
    }, 3000);
  }

  function showNotification(message, type) {
    const toast = document.createElement("div");
    toast.className = `aod-toast aod-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("aod-toast-hide");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
})();
