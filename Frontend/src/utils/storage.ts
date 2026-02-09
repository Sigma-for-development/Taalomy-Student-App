import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * A wrapper around SecureStore and AsyncStorage to handle platform differences.
 * SecureStore is not supported on the web, so we fallback to AsyncStorage.
 * On native platforms, we use SecureStore for sensitive data.
 */
export const tokenStorage = {
    /**
     * Set a value in storage.
     * Uses SecureStore on native, AsyncStorage on web.
     */
    async setItem(key: string, value: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                await AsyncStorage.setItem(key, value);
            } else {
                await SecureStore.setItemAsync(key, value);
            }
        } catch (error) {
            console.error('Error setting item in tokenStorage:', error);
            throw error;
        }
    },

    /**
     * Get a value from storage.
     * Uses SecureStore on native, AsyncStorage on web.
     */
    async getItem(key: string): Promise<string | null> {
        try {
            console.log(`[tokenStorage] Getting item: ${key} (Platform: ${Platform.OS})`);
            if (Platform.OS === 'web') {
                const value = await AsyncStorage.getItem(key);
                console.log(`[tokenStorage] Web value for ${key}: ${value ? 'FOUND' : 'NULL'}`);
                return value;
            } else {
                const value = await SecureStore.getItemAsync(key);
                console.log(`[tokenStorage] Native value for ${key}: ${value ? 'FOUND' : 'NULL'}`);
                return value;
            }
        } catch (error) {
            console.error(`Error getting item ${key} from tokenStorage:`, error);
            return null;
        }
    },

    /**
     * Delete a value from storage.
     * Uses SecureStore on native, AsyncStorage on web.
     */
    async deleteItem(key: string): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                await AsyncStorage.removeItem(key);
            } else {
                await SecureStore.deleteItemAsync(key);
            }
        } catch (error) {
            console.error('Error deleting item from tokenStorage:', error);
            throw error;
        }
    },
};
