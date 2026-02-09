
import React, { useState, useRef } from 'react';
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
    I18nManager,
    Dimensions
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { API_CONFIG } from '../../src/config/api';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ResetPassword = () => {
    const { t } = useTranslation();
    const { email } = useLocalSearchParams();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const inputs = useRef<Array<TextInput | null>>([]);
    const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;
    const isRTL = I18nManager.isRTL;

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const validatePassword = (password: string) => {
        // Basic validation, can be enhanced
        return password.length >= 8;
    };

    const handleResetPassword = async () => {
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            Toast.show({ type: 'error', text1: t('error'), text2: t('enter_valid_otp') });
            return;
        }

        if (!newPassword || !confirmPassword) {
            Toast.show({ type: 'error', text1: t('error'), text2: t('fill_all_fields') });
            return;
        }

        if (newPassword !== confirmPassword) {
            Toast.show({ type: 'error', text1: t('error'), text2: t('passwords_do_not_match') });
            return;
        }

        if (!validatePassword(newPassword)) {
            Toast.show({ type: 'error', text1: t('error'), text2: t('password_too_short') });
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${baseurl}auth/password-reset/confirm/`, {
                email,
                otp_code: otpCode,
                new_password: newPassword,
            });

            Toast.show({
                type: 'success',
                text1: t('success'),
                text2: t('password_reset_success'),
            });

            router.replace('/login');
        } catch (error: any) {
            let errorMessage = 'Failed to reset password';
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

                    <View style={{ marginBottom: 30, alignItems: 'center', marginTop: 60 }}>
                        <Text style={{
                            fontSize: 28,
                            fontWeight: '700',
                            color: '#fff',
                            marginBottom: 12,
                            textAlign: 'center',
                        }}>
                            {t('reset_password')}
                        </Text>
                        <Text style={{
                            fontSize: 16,
                            color: '#95a5a6',
                            textAlign: 'center',
                            lineHeight: 24,
                        }}>
                            {t('enter_otp_and_password')}
                        </Text>
                    </View>

                    {/* OTP Section */}
                    <Text style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: '#bdc3c7',
                        marginBottom: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        alignSelf: 'flex-start'
                    }}>{t('verification_code')}</Text>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 30,
                        direction: 'ltr'
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

                    {/* New Password */}
                    <View style={{ marginBottom: 20 }}>
                        <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: '#bdc3c7',
                            marginBottom: 6,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>{t('new_password')}</Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                        }}>
                            <TextInput
                                style={{
                                    flex: 1,
                                    paddingHorizontal: 16,
                                    paddingVertical: 14,
                                    fontSize: 16,
                                    color: '#ecf0f1',
                                    textAlign: isRTL ? 'right' : 'left'
                                }}
                                placeholder={t('enter_new_password')}
                                placeholderTextColor="#666"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 14,
                                }}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color="#95a5a6"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Confirm Password */}
                    <View style={{ marginBottom: 30 }}>
                        <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: '#bdc3c7',
                            marginBottom: 6,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>{t('confirm_password')}</Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                        }}>
                            <TextInput
                                style={{
                                    flex: 1,
                                    paddingHorizontal: 16,
                                    paddingVertical: 14,
                                    fontSize: 16,
                                    color: '#ecf0f1',
                                    textAlign: isRTL ? 'right' : 'left'
                                }}
                                placeholder={t('confirm_new_password')}
                                placeholderTextColor="#666"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                autoCapitalize="none"
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 14,
                                }}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <Ionicons
                                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color="#95a5a6"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleResetPassword}
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
                                    {t('set_new_password')}
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

export default ResetPassword;
