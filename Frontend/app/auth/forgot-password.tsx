
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    I18nManager
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import axios from 'axios';
import { API_CONFIG } from '../../src/config/api';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const ForgotPassword = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;
    const isRTL = I18nManager.isRTL;

    const handleRequestReset = async () => {
        if (!email) {
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('enter_email'),
            });
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${baseurl}auth/password-reset/request/`, { email });

            Toast.show({
                type: 'success',
                text1: t('success'),
                text2: t('reset_code_sent'),
            });

            router.push({
                pathname: '/auth/reset-password',
                params: { email }
            });
        } catch (error: any) {
            let errorMessage = 'Failed to send reset code';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            position: 'absolute',
                            top: 60,
                            left: 24,
                            zIndex: 10,
                            padding: 8,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 8
                        }}
                    >
                        <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={{ marginBottom: 40, alignItems: 'center' }}>
                        <View style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 24,
                            borderWidth: 1,
                            borderColor: 'rgba(52, 152, 219, 0.3)',
                        }}>
                            <Ionicons name="key-outline" size={40} color="#3498db" />
                        </View>
                        <Text style={{
                            fontSize: 28,
                            fontWeight: '700',
                            color: '#fff',
                            marginBottom: 12,
                            textAlign: 'center',
                        }}>
                            {t('forgot_password')}
                        </Text>
                        <Text style={{
                            fontSize: 16,
                            color: '#95a5a6',
                            textAlign: 'center',
                            lineHeight: 24,
                            maxWidth: '80%'
                        }}>
                            {t('forgot_password_desc')}
                        </Text>
                    </View>

                    <View style={{ marginBottom: 32 }}>
                        <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: '#bdc3c7',
                            marginBottom: 8,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            alignSelf: 'flex-start'
                        }}>{t('email_address')}</Text>
                        <TextInput
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 16,
                                fontSize: 16,
                                color: '#ecf0f1',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                textAlign: isRTL ? 'right' : 'left'
                            }}
                            placeholder={t('enter_email')}
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!isLoading}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleRequestReset}
                        disabled={isLoading}
                        style={{
                            borderRadius: 14,
                            overflow: 'hidden',
                            marginBottom: 24,
                            shadowColor: '#3498db',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4,
                        }}
                    >
                        <LinearGradient
                            colors={['#3498db', '#2980b9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                                paddingVertical: 18,
                                alignItems: 'center',
                            }}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{
                                    fontSize: 18,
                                    fontWeight: '600',
                                    color: '#fff',
                                    letterSpacing: 0.5,
                                }}>
                                    {t('send_code')}
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

export default ForgotPassword;
