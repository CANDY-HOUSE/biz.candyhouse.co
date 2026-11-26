import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { isAppHome } from './services/deviceService';

// Each language is the namespace files under <lang>/; a file holds only the namespace it is named after.
const bundle = (files) => Object.assign({}, ...files.keys().map((file) => files(file)));

export const languages = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
];
const supported = languages.map((language) => language.code);
const languageKey = 'bizLanguage';

// The APP follows the phone's language, like its native screens; only the browser offers a choice.
export const followsSystemLanguage = isAppHome || new URLSearchParams(window.location.search).get('fromType') === 'app';

export const normalizeLanguage = (language) => {
  const locale = (language || '').replace(/_/g, '-');
  if (/^zh(?:-|$)/i.test(locale)) return /-(?:Hant|TW|HK|MO)(?:-|$)/i.test(locale) ? 'zh-TW' : 'zh-CN';
  const base = locale.split('-')[0].toLowerCase();
  return supported.includes(base) ? base : null;
};

const storage = {
  get: () => {
    try {
      return localStorage.getItem(languageKey);
    } catch {
      return null;
    }
  },
  set: (value) => {
    try {
      localStorage.setItem(languageKey, value);
    } catch {
      /* Without storage the choice lasts for this page only. */
    }
  },
};

const systemLanguage = (fallback) =>
  (navigator.languages?.length ? navigator.languages : [navigator.language]).map(normalizeLanguage).find(Boolean) ||
  fallback;

const browserLanguage = () => {
  const chosen = storage.get();
  return supported.includes(chosen) ? chosen : systemLanguage('ja');
};

// Earlier builds cached the detected browser language here without the user choosing it.
const clearLegacyCache = () => {
  try {
    localStorage.removeItem('i18nextLng');
  } catch {
    /* ignore */
  }
  document.cookie = 'i18next=; path=/; max-age=0';
};

if (!followsSystemLanguage) clearLegacyCache();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: bundle(require.context('./i18n/en', false, /\.json$/)) },
    ja: { translation: bundle(require.context('./i18n/ja', false, /\.json$/)) },
    'zh-CN': { translation: bundle(require.context('./i18n/zh-CN', false, /\.json$/)) },
    'zh-TW': { translation: bundle(require.context('./i18n/zh-TW', false, /\.json$/)) },
  },
  lng: followsSystemLanguage ? systemLanguage('en') : browserLanguage(),
  fallbackLng: followsSystemLanguage ? 'en' : 'ja',
  supportedLngs: supported,
  interpolation: {
    escapeValue: false,
  },
});

document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

if (followsSystemLanguage) {
  window.addEventListener('languagechange', () => i18n.changeLanguage(systemLanguage('en')));
} else {
  window.addEventListener('storage', (event) => {
    if (event.key === languageKey) i18n.changeLanguage(browserLanguage());
  });
}

// The server localizes history texts per WebSocket connection, so a new language starts a fresh page.
export const chooseLanguage = (language) => {
  if (!supported.includes(language) || language === i18n.language) return;
  storage.set(language);
  window.location.reload();
};

export default i18n;
