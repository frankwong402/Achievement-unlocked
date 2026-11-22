// The browser mounts one app per document. Locale affects presentation only.
let active = 'zh';

export function setLocale(value) {
  active = value === 'en' ? 'en' : 'zh';
}

export function currentLocale() {
  return active;
}

export function label(chinese, english) {
  return active === 'en' ? english : chinese;
}

const preferenceKey = 'achievement-unlocked-language';

export function loadLanguage() {
  try { setLocale(window.localStorage.getItem(preferenceKey)); }
  catch { setLocale('zh'); }
}

export function switchLanguage() {
  setLocale(active === 'zh' ? 'en' : 'zh');
  try { window.localStorage.setItem(preferenceKey, active); }
  catch { /* The selected language still works for this session. */ }
}
