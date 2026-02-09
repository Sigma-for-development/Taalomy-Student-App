import { I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';

/**
 * Formats a date string or Date object to a string using the Gregorian calendar.
 * This ensures that even if the device or locale prefers Hijri (or another calendar),
 * the output will be in Gregorian.
 * 
 * @param date The date to format (string or Date object)
 * @param options Intl.DateTimeFormatOptions to customize the output
 * @returns Formatted date string
 */
export const formatDate = (
    date: string | Date | null | undefined,
    options: Intl.DateTimeFormatOptions = {}
): string => {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
        return '';
    }

    // Default options
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        calendar: 'gregory', // Force Gregorian calendar
        ...options
    };

    // Get current locale from I18nManager or fallback to device locale or 'en'
    // We want to respect the language (Arabic month names) but force the calendar system
    // Get current locale from I18nManager or fallback to device locale or 'en'
    // We want to respect the language (Arabic month names) but force the calendar system
    const deviceLocales = getLocales();
    let currentLocale = I18nManager.isRTL ? 'ar' : (deviceLocales[0]?.languageCode ?? 'en');

    // Force Gregorian calendar via locale extension if not already present
    if (!currentLocale.includes('-u-ca-')) {
        currentLocale += '-u-ca-gregory';
    }

    try {
        return new Intl.DateTimeFormat(currentLocale, defaultOptions).format(dateObj);
    } catch (e) {
        console.warn('Error formatting date:', e);
        // Fallback to simple string if Intl fails
        return dateObj.toLocaleDateString('en-US');
    }
};
