import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../config/api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        // Get the token
        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                console.log('Project ID not found. Attempting to get token without it (may fail)...');
                try {
                    // This often fails in newer Expo versions without a Project ID
                    token = (await Notifications.getExpoPushTokenAsync()).data;
                } catch (e) {
                    console.log('Failed to get push token: Missing Project ID. Run `eas init` to configure it.');
                    return;
                }
            } else {
                token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            }
        } catch (e) {
            console.log('Error fetching push token:', e);
            return;
        }

        // Send to backend
        if (token) {
            try {
                await api.post('device-tokens/', {
                    token: token,
                    platform: Platform.OS
                });
                console.log('Device token registered:', token);
            } catch (error) {
                console.log('Error registering device token:', error);
            }
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
