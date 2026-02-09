import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import en from './locales/en.json';
import ar from './locales/ar.json';
import 'intl-pluralrules';

const resources = {
    en: { translation: en },
    ar: { translation: ar },
};

const initI18n = async () => {
    try {
        let savedLanguage = await AsyncStorage.getItem('user-language');

        if (!savedLanguage) {
            const deviceLanguage = getLocales()[0]?.languageCode;
            savedLanguage = deviceLanguage === 'ar' ? 'ar' : 'en';
        }

        await i18n
            .use(initReactI18next)
            .init({
                resources,
                lng: savedLanguage,
                fallbackLng: 'en',
                interpolation: {
                    escapeValue: false,
                },
                compatibilityJSON: 'v4',
                react: {
                    useSuspense: false,
                }
            });

        // Handle RTL
        const isRTL = savedLanguage === 'ar';
        I18nManager.allowRTL(isRTL);
        I18nManager.forceRTL(isRTL);

    } catch (error) {
        console.error('Error initializing i18n:', error);
    }
};

export default initI18n;
export { i18n };
