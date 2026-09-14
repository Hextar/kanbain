(function () {
  var KEY = "prefs:v1";
  var COOKIE = "kanbain_prefs";
  var LOCALES = { en: 1, it: 1, fr: 1, es: 1, de: 1 };
  function parse(raw) {
    try {
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      return {
        theme:
          data.theme === "light" || data.theme === "system"
            ? data.theme
            : "dark",
        locale: LOCALES[data.locale] ? data.locale : "en",
        density: data.density === "compact" ? "compact" : "comfortable",
      };
    } catch (e) {
      return null;
    }
  }
  function fromCookie() {
    var parts = document.cookie.split("; ");
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(COOKIE + "=") === 0) {
        try {
          return parse(decodeURIComponent(parts[i].slice(COOKIE.length + 1)));
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }
  var prefs = null;
  try {
    prefs = parse(localStorage.getItem(KEY) || "");
  } catch (e) {}
  if (!prefs) prefs = fromCookie();
  if (!prefs) return;
  var theme = prefs.theme;
  if (theme === "system") {
    theme = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  var root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-density", prefs.density);
  root.lang = prefs.locale;
})();
