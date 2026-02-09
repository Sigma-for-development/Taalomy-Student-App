import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    I18nManager
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../utils/api';

interface PrivacySettingsData {
    id?: number;
    profile_visibility: 'everyone' | 'contacts' | 'me';
    show_online_status: boolean;
    read_receipts: boolean;
    group_add_permission: 'everyone' | 'contacts' | 'nobody';
    hide_review_identities: boolean;
}

export default function PrivacySettings() {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [settings, setSettings] = useState<PrivacySettingsData>({
        profile_visibility: 'everyone',
        show_online_status: true,
        read_receipts: true,
        group_add_permission: 'everyone',
        hide_review_identities: false,
    });
    const { t } = useTranslation();
    const isRTL = I18nManager.isRTL;

    // Modal states
    const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
    const [groupModalVisible, setGroupModalVisible] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await api.get('privacy-settings/');
            if (Array.isArray(response.data) && response.data.length > 0) {
                setSettings(response.data[0]);
            } else if (response.data && !Array.isArray(response.data)) {
                setSettings(response.data);
            }
        } catch (error) {
            console.error('Error loading privacy settings:', error);
            // If 404, it might mean settings haven't been created yet.
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: string, value: any) => {
        // Optimistic update
        const oldSettings = { ...settings };
        const newSettings = { ...settings, [key]: value };

        setSettings(newSettings);
        setUpdating(true);

        try {
            let response;
            if (settings.id) {
                response = await api.patch(`privacy-settings/${settings.id}/`, { [key]: value });
            } else {
                response = await api.post('privacy-settings/', { ...newSettings });
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
            console.error('Error updating privacy settings:', error);
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_to_update_settings') || 'Failed to update settings',
            });
            setSettings(oldSettings);
        } finally {
            setUpdating(false);
        }
    };

    const SelectionModal = ({
        visible,
        onClose,
        title,
        options,
        currentValue,
        onSelect
    }: {
        visible: boolean,
        onClose: () => void,
        title: string,
        options: { label: string, value: string }[],
        currentValue: string,
        onSelect: (value: string) => void
    }) => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={styles.modalOption}
                            onPress={() => {
                                onSelect(option.value);
                                onClose();
                            }}
                        >
                            <Text style={[
                                styles.modalOptionText,
                                currentValue === option.value && styles.selectedOptionText
                            ]}>
                                {option.label}
                            </Text>
                            {currentValue === option.value && (
                                <Ionicons name="checkmark" size={20} color="#3498db" />
                            )}
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const SettingItem = ({
        label,
        description,
        value,
        onValueChange,
        type = 'switch',
        displayValue = ''
    }: {
        label: string,
        description?: string,
        value: boolean | string,
        onValueChange: (val: any) => void,
        type?: 'switch' | 'select',
        displayValue?: string
    }) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={() => type === 'select' && onValueChange(null)}
            disabled={type === 'switch'}
        >
            <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{label}</Text>
                {description && <Text style={styles.settingDescription}>{description}</Text>}
            </View>

            {type === 'switch' ? (
                <Switch
                    trackColor={{ false: '#3e3e3e', true: '#3498db' }}
                    thumbColor={value ? '#fff' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={onValueChange}
                    value={value as boolean}
                />
            ) : (
                <View style={styles.selectValueContainer}>
                    <Text style={styles.selectValueText}>{displayValue}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#95a5a6" />
                </View>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    const visibilityOptions = [
        { label: t('everyone'), value: 'everyone' },
        { label: t('contacts'), value: 'contacts' },
        { label: t('only_me'), value: 'me' },
    ];

    const groupOptions = [
        { label: t('everyone'), value: 'everyone' },
        { label: t('contacts'), value: 'contacts' },
        { label: t('nobody'), value: 'nobody' },
    ];

    const getLabel = (options: any[], value: string) => {
        return options.find(o => o.value === value)?.label || value;
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: t('privacy_settings'),
                    headerStyle: { backgroundColor: '#0a0a0a' },
                    headerTintColor: '#fff',
                    headerBackTitle: "Back",
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('profile_privacy')}</Text>
                    <SettingItem
                        label={t('profile_visibility')}
                        description={t('profile_visibility_desc')}
                        value={settings.profile_visibility}
                        type="select"
                        displayValue={getLabel(visibilityOptions, settings.profile_visibility)}
                        onValueChange={() => setVisibilityModalVisible(true)}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('activity_status')}</Text>
                    <SettingItem
                        label={t('show_online_status')}
                        description={t('show_online_status_desc')}
                        value={settings.show_online_status}
                        onValueChange={(val) => updateSetting('show_online_status', val)}
                    />
                    <SettingItem
                        label={t('read_receipts')}
                        description={t('read_receipts_desc')}
                        value={settings.read_receipts}
                        onValueChange={(val) => updateSetting('read_receipts', val)}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('reviews')}</Text>
                    <SettingItem
                        label={t('anonymous_reviews')}
                        description={t('anonymous_reviews_desc')}
                        value={settings.hide_review_identities}
                        onValueChange={(val) => updateSetting('hide_review_identities', val)}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('groups')}</Text>
                    <SettingItem
                        label={t('group_invitations')}
                        description={t('group_invitations_desc')}
                        value={settings.group_add_permission}
                        type="select"
                        displayValue={getLabel(groupOptions, settings.group_add_permission)}
                        onValueChange={() => setGroupModalVisible(true)}
                    />
                </View>
            </ScrollView>

            <SelectionModal
                visible={visibilityModalVisible}
                onClose={() => setVisibilityModalVisible(false)}
                title={t('profile_visibility')}
                options={visibilityOptions}
                currentValue={settings.profile_visibility}
                onSelect={(val) => updateSetting('profile_visibility', val)}
            />

            <SelectionModal
                visible={groupModalVisible}
                onClose={() => setGroupModalVisible(false)}
                title={t('group_invitations')}
                options={groupOptions}
                currentValue={settings.group_add_permission}
                onSelect={(val) => updateSetting('group_add_permission', val)}
            />
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
    selectValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectValueText: {
        color: '#3498db',
        marginEnd: 8,
        fontSize: 14,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        width: '100%',
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#bdc3c7',
    },
    selectedOptionText: {
        color: '#3498db',
        fontWeight: 'bold',
    },
    closeButton: {
        marginTop: 20,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
