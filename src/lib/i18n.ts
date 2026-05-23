import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const LANGUAGE_KEY = '@@app_language';

export const staticResources = {
  en: {
    translation: {}
  },
  hi: {
    translation: {}
  }
};

// Try to synchronously read the previously saved language from AsyncStorage
// (MMKVStorage would be instant, but AsyncStorage only has async API, so we
// keep 'en' as the safe default and let initTranslations() update it before
// the first screen mounts — enforced by the _layout.tsx gate below)
let initialLang = 'en';
try {
  // React Native AsyncStorage does not have a sync API; instead we piggyback on
  // a tiny in-process cache that the translationSlice writes when it inits.
  // This is populated in < 1 render cycle before _layout shows any children.
  const cachedLang = (global as any).__appLanguageCache;
  if (cachedLang && ['en', 'hi'].includes(cachedLang)) {
    initialLang = cachedLang;
  }
} catch { /* no-op */ }

i18n
  .use(initReactI18next)
  .init({
    resources: staticResources,
    lng: initialLang,
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    saveMissing: true,
    missingKeyHandler: (lngs, ns, key, fallbackValue) => {
      if (!key || key.trim() === '') return;
      try {
        const { useAppStore } = require('./store');
        useAppStore.getState().registerMissingKey(key, fallbackValue);
      } catch (err) {
        console.warn('[i18n missingKeyHandler] Failed to register missing key:', key, err);
      }
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
