(function () {
  const cfg = window.EV_ADS_CONFIG || {};
  const container = document.getElementById("map-ad-container");
  if (!container) return;
  const placeholderSrc = "./ad-placeholder.svg";

  function renderPlaceholderOnly() {
    container.innerHTML =
      '<img class="ad-fallback-image" src="' +
      placeholderSrc +
      '" alt="Sponsored placeholder" loading="lazy" decoding="async">';
  }

  const isConfigured =
    cfg.enabled === true &&
    typeof cfg.client === "string" &&
    cfg.client.startsWith("ca-pub-") &&
    !cfg.client.includes("X") &&
    typeof cfg.mapFooterSlot === "string" &&
    /^\d+$/.test(cfg.mapFooterSlot);

  renderPlaceholderOnly();
  if (!isConfigured) {
    return;
  }

  const isLocalPreview = /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);
  container.innerHTML =
    '<div class="ad-runtime" id="ad-runtime">' +
    '<img class="ad-fallback-image" src="' +
    placeholderSrc +
    '" alt="Sponsored placeholder" loading="lazy" decoding="async">' +
    "</div>";
  const runtime = document.getElementById("ad-runtime");
  if (!runtime) return;

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
  runtime.append(ins);

  const monitorFillState = function () {
    const start = Date.now();
    const interval = window.setInterval(() => {
      const status = String(ins.getAttribute("data-ad-status") || "").toLowerCase();
      if (status === "filled") {
        runtime.classList.add("is-filled");
        window.clearInterval(interval);
        return;
      }
      if (status === "unfilled" || Date.now() - start > 20000) {
        runtime.classList.remove("is-filled");
        window.clearInterval(interval);
      }
    }, 600);
  };

  const pushAd = function () {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      monitorFillState();
    } catch {
      runtime.classList.remove("is-filled");
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
    runtime.classList.remove("is-filled");
  };
  document.head.appendChild(adScript);
})();
