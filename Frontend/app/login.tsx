import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  I18nManager
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import axios from 'axios';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../src/utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { API_CONFIG } from '../src/config/api';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  // Updated Google Auth configuration with proper redirect URIs
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleLogin(authentication.accessToken);
      } else {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('failed_to_get_google_token') || 'Failed to get access token from Google',
        });
      }
    } else if (response?.type === 'error') {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('google_login_failed'),
      });
    }
  }, [response]);

  const storeTokens = async (access: string, refresh: string) => {
    try {
      await tokenStorage.setItem('access_token', access);
      await tokenStorage.setItem('refresh_token', refresh);
    } catch (error) {
      console.error('Error storing tokens:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_store_credentials') || 'Failed to store login credentials',
      });
    }
  };

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('enter_email_password') || 'Please enter both email and password',
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting login with:', { username: email, password: '***' });
      const res = await axios.post(`${baseurl}${API_CONFIG.ENDPOINTS.LOGIN}`, {
        username: email, // Backend accepts email in username field
        password,
      });
      console.log('Login response:', res.data);
      const { access, refresh, user } = res.data;

      // Check if user is a student
      if (user.user_type !== 'student') {
        Toast.show({
          type: 'error',
          text1: t('access_denied'),
          text2: t('student_app_only') || 'This app is only for students. Please use the lecturer app.',
        });
        return;
      }

      await storeTokens(access, refresh);
      if (user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
      }
      router.push('/home');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error.response) {
        // Server responded with error status
        console.log('Error response:', error.response);

        // Handle unverified email
        if (error.response.data?.code === 'email_not_verified') {
          const emailToVerify = error.response.data.email || email;
          Toast.show({
            type: 'info',
            text1: t('verification_required') || 'Verification Required',
            text2: t('please_verify_email') || 'Please verify your email to continue',
          });

          router.push({
            pathname: '/auth/otp',
            params: { email: emailToVerify, autoSend: 'true' }
          });
          return;
        }

        errorMessage = error.response?.data?.detail ||
          error.response?.data?.error ||
          error.response?.data?.message ||
          'Invalid credentials. Please try again.'; // Fallback
      } else if (error.request) {
        // Request was made but no response received
        console.log('Error request:', error.request);
        errorMessage = t('unable_to_connect_server');
      } else {
        // Something else happened
        console.log('Error message:', error.message);
        errorMessage = error.message || errorMessage;
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

  const handleGoogleLogin = async (accessToken: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${baseurl}auth/google/`, {
        token: accessToken,
      });
      const { access, refresh, user } = res.data;

      // Check if user is a student
      if (user.user_type !== 'student') {
        Toast.show({
          type: 'error',
          text1: t('access_denied'),
          text2: t('student_app_only') || 'This app is only for students. Please use the lecturer app.',
        });
        return;
      }

      await storeTokens(access, refresh);
      if (user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
      }
      router.push('/home');
    } catch (error: any) {
      console.error('Google login error:', error);
      let errorMessage = 'Google login failed. Please try again.';

      if (error.response) {
        // Server responded with error status
        console.log('Error response:', error.response);
        errorMessage = error.response?.data?.error ||
          error.response?.data?.detail ||
          error.response?.data?.message ||
          t('google_login_failed');
      } else if (error.request) {
        // Request was made but no response received
        console.log('Error request:', error.request);
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else {
        // Something else happened
        console.log('Error message:', error.message);
        errorMessage = error.message || errorMessage;
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Professional Dark Background */}
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

        {/* Subtle Geometric Elements removed */}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: Platform.OS === 'ios' ? 60 : 40,
            paddingBottom: Platform.OS === 'ios' ? 40 : 60
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* University Branding */}
          <View style={{
            alignItems: 'center',
            marginBottom: 30,
            marginTop: Platform.OS === 'ios' ? 20 : 40,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginStart: -15 }}>
                <View style={{
                  width: 65,
                  height: 65,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginEnd: -20,
                }}>
                  <Image
                    source={require('../src/assets/images/taalomy-no-back.png')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                </View>
                <Text style={{
                  fontSize: 42,
                  fontWeight: '700',
                  color: '#ecf0f1',
                  marginTop: 5,
                }}>aalomy</Text>
              </View>
              <View style={{
                width: 60,
                height: 3,
                backgroundColor: '#3498db',
                marginTop: 8,
                borderRadius: 2,
              }} />
            </View>
          </View>

          {/* Professional Login Card */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 8,
          }}>
            <View style={{ marginBottom: 24 }}>
              <Text style={{
                fontSize: 22,
                fontWeight: '600',
                color: '#ecf0f1',
                textAlign: 'center',
                marginBottom: 8,
              }}>{t('welcome_back')}</Text>
              <Text style={{
                fontSize: 14,
                color: '#95a5a6',
                textAlign: 'center',
                fontWeight: '400',
              }}>{t('access_portal')}</Text>
            </View>

            {/* Email Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
                textAlign: 'left' // Labels always left align looks weird in RTL if not adjusted, forcing left for now or let default
              }}>{t('email_address')}</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
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

            {/* Password Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('password')}</Text>
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
                  placeholder={t('enter_password')}
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
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

            {/* Login Button */}
            <TouchableOpacity
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 16,
                opacity: (isLoading || !email || !password) ? 0.6 : 1,
              }}
              onPress={handleLogin}
              disabled={isLoading || !email || !password}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={(isLoading || !email || !password) ? ['#444', '#555'] : ['#2c3e50', '#34495e']}
                style={{
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#ecf0f1',
                  letterSpacing: 1,
                }}>
                  {isLoading ? t('authenticating') : t('sign_in')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 16,
            }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
              <Text style={{
                color: '#95a5a6',
                paddingHorizontal: 12,
                fontSize: 11,
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('or_continue_with')}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                marginBottom: 16,
                opacity: isLoading ? 0.6 : 1,
              }}
              onPress={() => promptAsync()}
              disabled={!request || isLoading}
              activeOpacity={0.8}
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginEnd: 10,
              }}>
                <Text style={{ fontSize: 12 }}>G</Text>
              </View>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#bdc3c7',
              }}>
                {isLoading ? t('authenticating') : t('google_workspace')}
              </Text>
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={{
                alignItems: 'center',
                marginBottom: 8,
              }}
              onPress={() => router.push('/auth/forgot-password')}
            >
              <Text style={{
                fontSize: 12,
                color: '#3498db',
                fontWeight: '500',
              }}>{t('forgot_password')}</Text>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Text style={{
              fontSize: 14,
              color: '#95a5a6',
            }}>{t('new_to_platform')} </Text>
            <TouchableOpacity
              onPress={() => router.push('/register')}
              disabled={isLoading}
            >
              <Text style={{
                fontSize: 14,
                color: '#3498db',
                fontWeight: '600',
              }}>{t('sign_up')}</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={{
              fontSize: 11,
              color: '#7f8c8d',
              marginBottom: 2,
            }}>© 2025 Taalomy University Platform</Text>
            <Text style={{
              fontSize: 9,
              color: '#7f8c8d',
              fontWeight: '300',
            }}>{t('secure_reliable')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Login;