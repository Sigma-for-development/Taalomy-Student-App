import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    I18nManager
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import api from '../utils/api';
import { API_CONFIG } from '../src/config/api';

interface NotificationSettingsData {
    id?: number;
    all_notifications: boolean;
    intake_invites: boolean;
    class_invites: boolean;
    group_invites: boolean;
    chat_messages: boolean;
    quiz_published: boolean;
}

export default function NotificationSettings() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [settings, setSettings] = useState<NotificationSettingsData>({
        all_notifications: true,
        intake_invites: true,
        class_invites: true,
        group_invites: true,
        chat_messages: true,
        quiz_published: true,
    });
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await api.get('notification-settings/');
            // If it's a list, take the first item (should be only one per user)
            if (Array.isArray(response.data) && response.data.length > 0) {
                setSettings(response.data[0]);
            } else if (response.data && !Array.isArray(response.data)) {
                setSettings(response.data);
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
            // If 404, it might mean settings haven't been created yet.
            // We'll just stick with defaults.
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: string, value: boolean) => {
        // Optimistic update
        const oldSettings = { ...settings };
        const newSettings = { ...settings, [key]: value };

        // If toggling "All Notifications", update all others visually (though backend handles the logic)
        if (key === 'all_notifications' && !value) {
            // If turning off all, maybe we don't need to change individual ones visually, 
            // but the backend will block them.
            // Let's just update the state.
        }

        setSettings(newSettings);
        setUpdating(true);

        try {
            let response;
            // Check if we need to create or update
            if (settings.id) {
                response = await api.patch(`notification-settings/${settings.id}/`, { [key]: value });
            } else {
                response = await api.post('notification-settings/', { ...newSettings });
            }

            if (response.data) {
                setSettings(response.data);
                Toast.show({
                    type: 'success',
                    text1: t('success'),
                    text2: t('settings_updated') || 'Settings updated successfully',
                });
            }
        } catch (error) {
            console.error('Error updating notification settings:', error);
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_to_update_settings') || 'Failed to update settings',
            });
            setSettings(oldSettings); // Revert on error
        } finally {
            setUpdating(false);
        }
    };

    const SettingItem = ({
        label,
        description,
        value,
        onValueChange,
        disabled = false
    }: {
        label: string,
        description?: string,
        value: boolean,
        onValueChange: (val: boolean) => void,
        disabled?: boolean
    }) => (
        <View style={[styles.settingItem, disabled && styles.disabledItem]}>
            <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, disabled && styles.disabledText]}>{label}</Text>
                {description && <Text style={styles.settingDescription}>{description}</Text>}
            </View>
            <Switch
                trackColor={{ false: '#3e3e3e', true: '#3498db' }}
                thumbColor={value ? '#fff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={onValueChange}
                value={value}
                disabled={disabled}
            />
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: t('notification_settings'),
                    headerStyle: { backgroundColor: '#0a0a0a' },
                    headerTintColor: '#fff',
                    headerBackTitle: "Back",
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('general')}</Text>
                    <SettingItem
                        label={t('allow_notifications')}
                        description={t('allow_notifications_desc')}
                        value={settings.all_notifications}
                        onValueChange={(val) => updateSetting('all_notifications', val)}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('invitations')}</Text>
                    <SettingItem
                        label={t('intake_invites')}
                        value={settings.intake_invites}
                        onValueChange={(val) => updateSetting('intake_invites', val)}
                        disabled={!settings.all_notifications}
                    />
                    <SettingItem
                        label={t('class_invites')}
                        value={settings.class_invites}
                        onValueChange={(val) => updateSetting('class_invites', val)}
                        disabled={!settings.all_notifications}
                    />
                    <SettingItem
                        label={t('group_invites')}
                        value={settings.group_invites}
                        onValueChange={(val) => updateSetting('group_invites', val)}
                        disabled={!settings.all_notifications}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('chats')}</Text>
                    <SettingItem
                        label={t('chat_messages_notif')}
                        description={t('chat_messages_desc')}
                        value={settings.chat_messages}
                        onValueChange={(val) => updateSetting('chat_messages', val)}
                        disabled={!settings.all_notifications}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('academic')}</Text>
                    <SettingItem
                        label={t('quiz_published')}
                        description={t('quiz_published_desc')}
                        value={settings.quiz_published}
                        onValueChange={(val) => updateSetting('quiz_published', val)}
                        disabled={!settings.all_notifications}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#3498db',
        marginBottom: 15,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    settingInfo: {
        flex: 1,
        marginEnd: 15,
    },
    settingLabel: {
        fontSize: 16,
        color: '#ecf0f1',
        fontWeight: '500',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 12,
        color: '#95a5a6',
    },
    disabledItem: {
        opacity: 0.5,
    },
    disabledText: {
        color: '#7f8c8d',
    },
});
