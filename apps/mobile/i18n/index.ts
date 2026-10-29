import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { en } from './locales/en';
import { te } from './locales/te';

const LANGUAGE_KEY = 'user_preferred_language';

const resources = {
  en: { translation: en },
  te: { translation: te },
};

// Detect system default or fallback to en
const deviceLocales = Localization.getLocales();
const systemLang = deviceLocales[0]?.languageCode === 'te' ? 'te' : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: systemLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

// Load saved user preference asynchronously
export const initLanguagePreference = async () => {
  try {
    const saved = await SecureStore.getItemAsync(LANGUAGE_KEY);
    if (saved && (saved === 'en' || saved === 'te')) {
      await i18n.changeLanguage(saved);
    }
  } catch {
    // default to initialized language
  }
};

export const setLanguage = async (lang: 'en' | 'te') => {
  await i18n.changeLanguage(lang);
  try {
    await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
  } catch {
    // Ignore storage errors in dev
  }
};

export default i18n;
