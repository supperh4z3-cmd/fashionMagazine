import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';

const resources = {
  en: {
    translation: {
      welcome: "Welcome to Fashion Magazine",
      login: "Login",
      register: "Register",
      change_language: "Change Language",
      chat: "Chat",
      send: "Send",
      price: "Price",
      ask_price: "Ask Price",
      products: "Products",
      featured: "Featured",
      new_season: "New Season"
    }
  },
  tr: {
    translation: {
      welcome: "Fashion Magazine'e Hoş Geldiniz",
      login: "Giriş Yap",
      register: "Kayıt Ol",
      change_language: "Dili Değiştir",
      chat: "Sohbet",
      send: "Gönder",
      price: "Fiyat",
      ask_price: "Fiyat Sorunuz",
      products: "Ürünler",
      featured: "Vitrindekiler",
      new_season: "Yeni Sezon"
    }
  },
  ar: {
    translation: {
      welcome: "مرحبا بكم في مجلة الموضة",
      login: "تسجيل الدخول",
      register: "تسجيل",
      change_language: "تغيير اللغة",
      chat: "دردشة",
      send: "إرسال",
      price: "السعر",
      ask_price: "اطلب السعر",
      products: "منتجات",
      featured: "متميز",
      new_season: "الموسم الجديد"
    }
  },
  fr: {
    translation: {
      welcome: "Bienvenue sur Fashion Magazine",
      login: "Connexion",
      register: "S'inscrire",
      change_language: "Changer de langue",
      chat: "Discuter",
      send: "Envoyer",
      price: "Prix",
      ask_price: "Demander le prix",
      products: "Produits",
      featured: "En vedette",
      new_season: "Nouvelle Saison"
    }
  }
};

export const SUPPORTED_LANGUAGES = ['tr', 'en', 'ar', 'fr'];

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getLocales()[0].languageCode || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export const changeLanguage = async (lang: string) => {
  const isRTL = lang === 'ar';
  if (isRTL !== I18nManager.isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    await Updates.reloadAsync();
  } else {
    i18n.changeLanguage(lang);
  }
};

export default i18n;
