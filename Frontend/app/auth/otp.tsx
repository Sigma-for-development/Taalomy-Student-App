
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ScrollView,
    I18nManager,
    ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { API_CONFIG } from '../../src/config/api';
import { tokenStorage } from '../../src/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const OTPVerification = () => {
    const { t } = useTranslation();
    const { email, password, autoSend } = useLocalSearchParams();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [timer, setTimer] = useState(30);
    const inputs = useRef<Array<TextInput | null>>([]);
    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;
    const isRTL = I18nManager.isRTL;

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    useEffect(() => {
        if (autoSend === 'true' && timer === 30) {
            // Logic to prevent double send if already sent recently could be added here
            // For now, we assume user landed here and might need a code if not just registered
        }
    }, []);

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            inputs.current[index + 1]?.focus();
        }

        // Auto submit if filled
        if (index === 5 && value) {
            // Optional: verify automatically
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('enter_valid_otp'),
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post(`${baseurl}auth/verify-otp/`, {
                email,
                otp_code: otpCode,
            });

            const { user, access, refresh } = response.data;

            await tokenStorage.setItem('access_token', access);
            await tokenStorage.setItem('refresh_token', refresh);
            await AsyncStorage.setItem('user_data', JSON.stringify(user));

            Toast.show({
                type: 'success',
                text1: t('success'),
                text2: t('email_verified_success'),
            });

            router.replace('/home');
        } catch (error: any) {
            console.error('Verify error:', error);
            let errorMessage = 'Verification failed';
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

    const handleResend = async () => {
        if (timer > 0) return;

        setIsResending(true);
        try {
            await axios.post(`${baseurl}auth/send-otp/`, { email });
            setTimer(30);
            Toast.show({
                type: 'success',
                text1: t('success'),
                text2: t('otp_resent'),
            });
        } catch (error: any) {
            let errorMessage = 'Failed to resend OTP';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: errorMessage,
            });
        } finally {
            setIsResending(false);
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
                            <Ionicons name="shield-checkmark-outline" size={40} color="#3498db" />
                        </View>
                        <Text style={{
                            fontSize: 28,
                            fontWeight: '700',
                            color: '#fff',
                            marginBottom: 12,
                            textAlign: 'center',
                        }}>
                            {t('verify_email')}
                        </Text>
                        <Text style={{
                            fontSize: 16,
                            color: '#95a5a6',
                            textAlign: 'center',
                            lineHeight: 24,
                        }}>
                            {t('otp_sent_to')}{'\n'}
                            <Text style={{ color: '#fff', fontWeight: '600' }}>{email}</Text>
                        </Text>
                    </View>

                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 40,
                        direction: 'ltr', // Force LTR for OTP inputs
                    }}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => { inputs.current[index] = ref; }}
                                style={{
                                    width: width / 8,
                                    height: 56,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: digit ? '#3498db' : 'rgba(255, 255, 255, 0.1)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: '#fff',
                                    fontSize: 24,
                                    fontWeight: '700',
                                    textAlign: 'center',
                                }}
                                keyboardType="number-pad"
                                maxLength={1}
                                value={digit}
                                onChangeText={(value) => handleOtpChange(value, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                editable={!isLoading}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={handleVerify}
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
                                    {t('verify_account')}
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center' }}>
                        <Text style={{
                            color: '#95a5a6',
                            marginBottom: 8,
                        }}>
                            {t('didnt_receive_code')}
                        </Text>
                        <TouchableOpacity
                            onPress={handleResend}
                            disabled={timer > 0 || isResending}
                        >
                            <Text style={{
                                color: timer > 0 ? '#555' : '#3498db',
                                fontWeight: '600',
                                fontSize: 16,
                            }}>
                                {isResending ? (
                                    t('sending')
                                ) : timer > 0 ? (
                                    `${t('resend_in')} ${timer}s`
                                ) : (
                                    t('resend_code')
                                )}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ marginTop: 40, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={{ color: '#7f8c8d', fontSize: 14 }}>
                                {t('back_to_login')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

export default OTPVerification;
