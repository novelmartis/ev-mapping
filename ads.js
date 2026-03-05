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
    return;
  }

  container.innerHTML =
    '<ins class="adsbygoogle" style="display:block" data-ad-client="' +
    cfg.client +
    '" data-ad-slot="' +
    cfg.mapFooterSlot +
    '" data-ad-format="auto" data-full-width-responsive="true"></ins>';

  const adScript = document.createElement("script");
  adScript.async = true;
  adScript.src =
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
    encodeURIComponent(cfg.client);
  adScript.crossOrigin = "anonymous";

  adScript.onload = function () {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  };

  document.head.appendChild(adScript);
})();
