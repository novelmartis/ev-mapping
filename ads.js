(function () {
  const cfg = window.EV_ADS_CONFIG || {};
  const container = document.getElementById("map-ad-container");
  if (!container) return;

  const isConfigured =
    cfg.enabled === true &&
    typeof cfg.client === "string" &&
    cfg.client.startsWith("ca-pub-") &&
    !cfg.client.includes("X") &&
    typeof cfg.mapFooterSlot === "string" &&
    /^\d+$/.test(cfg.mapFooterSlot);

  if (!isConfigured) {
    container.textContent = "Sponsored slot disabled.";
    return;
  }

  const isLocalPreview = /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);
  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.setAttribute("data-ad-client", cfg.client);
  ins.setAttribute("data-ad-slot", cfg.mapFooterSlot);
  ins.setAttribute("data-ad-format", "auto");
  ins.setAttribute("data-full-width-responsive", "true");
  if (isLocalPreview) {
    ins.setAttribute("data-adtest", "on");
  }
  container.innerHTML = "";
  container.append(ins);

  const pushAd = function () {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      container.textContent = "Sponsored slot configured. Ad may appear after AdSense activation.";
    }
  };

  const existingLoader = document.querySelector('script[data-ev-ads-loader="1"]');
  if (existingLoader) {
    pushAd();
    return;
  }

  const adScript = document.createElement("script");
  adScript.async = true;
  adScript.setAttribute("data-ev-ads-loader", "1");
  adScript.src =
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
    encodeURIComponent(cfg.client);
  adScript.crossOrigin = "anonymous";
  adScript.onload = pushAd;
  adScript.onerror = function () {
    container.textContent = "Sponsored slot configured. Ad network script unavailable.";
  };
  document.head.appendChild(adScript);
})();
