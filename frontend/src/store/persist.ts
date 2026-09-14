export const PREFS_STORAGE_KEY = "prefs:v1";
export const PREFS_COOKIE = "kanbain_prefs";

export const LOCALES = ["en", "it", "fr", "es", "de"] as const;
export const THEMES = ["dark", "light", "system"] as const;
export const DENSITIES = ["comfortable", "compact"] as const;

export type Locale = (typeof LOCALES)[number];
export type ThemePref = (typeof THEMES)[number];
export type Density = (typeof DENSITIES)[number];

export type PrefsState = {
  theme: ThemePref;
  locale: Locale;
  density: Density;
};

export const defaultPrefs: PrefsState = {
  theme: "dark",
  locale: "en",
  density: "comfortable",
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function isThemePref(value: unknown): value is ThemePref {
  return THEMES.includes(value as ThemePref);
}

export function isDensity(value: unknown): value is Density {
  return DENSITIES.includes(value as Density);
}

export function parsePrefs(value: unknown): PrefsState {
  if (!value || typeof value !== "object") return defaultPrefs;
  const record = value as Record<string, unknown>;
  return {
    theme: isThemePref(record.theme) ? record.theme : defaultPrefs.theme,
    locale: isLocale(record.locale) ? record.locale : defaultPrefs.locale,
    density: isDensity(record.density) ? record.density : defaultPrefs.density,
  };
}

export function parsePrefsJson(raw: string | null | undefined): PrefsState {
  if (!raw) return defaultPrefs;
  try {
    return parsePrefs(JSON.parse(raw));
  } catch {
    return defaultPrefs;
  }
}

export function parsePrefsCookie(raw: string | undefined): PrefsState {
  if (!raw) return defaultPrefs;
  try {
    return parsePrefsJson(decodeURIComponent(raw));
  } catch {
    return defaultPrefs;
  }
}

export function resolvedTheme(theme: ThemePref): "light" | "dark" {
  if (theme === "light") return "light";
  if (theme === "dark") return "dark";
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function applyPrefsToDocument(prefs: PrefsState) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolvedTheme(prefs.theme));
  root.setAttribute("data-density", prefs.density);
  root.lang = prefs.locale;
}

export function persistPrefs(prefs: PrefsState) {
  const raw = JSON.stringify(prefs);
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, raw);
  } catch {
    /* private mode / quota */
  }
  const secure = window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${PREFS_COOKIE}=${encodeURIComponent(raw)};Path=/;Max-Age=31536000;SameSite=Lax${secure}`;
}

export function subscribeSystemTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
