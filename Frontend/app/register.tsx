import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Dimensions, KeyboardAvoidingView, Platform, StatusBar, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import axios, { AxiosError } from 'axios';
import { Redirect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../src/utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../src/config/api';
import DatePicker from '../src/components/DatePicker';
import CountryPickerModal from '../src/components/CountryPickerModal';
import Toast from 'react-native-toast-message';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
}

interface UserData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  address: string;
  user_type: 'student';
  password: string;
}

interface ApiError {
  message?: string;
  detail?: string;
  error?: string;
  email?: string[];
  username?: string[];
  phone_number?: string[];
}

interface ApiResponse {
  user: UserData;
  access: string;
  refresh: string;
}

const Register = () => {
  const [userData, setUserData] = useState<UserData>({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    date_of_birth: '',
    address: '',
    user_type: 'student',
    password: '',
  });
  const [selectedCountryCode, setSelectedCountryCode] = useState('+966');
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const baseurl = API_CONFIG.ACCOUNTS_BASE_URL;

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
        handleGoogleSignUp(authentication.accessToken);
      } else {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: 'Failed to get access token from Google',
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

  const handleGoogleSignUp = async (accessToken: string) => {
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
          text2: t('student_app_only'),
        });
        return;
      }

      if (user) {
        setUserData({
          email: user.email ?? '',
          username: user.username ?? '',
          first_name: user.first_name ?? '',
          last_name: user.last_name ?? '',
          phone_number: user.phone_number ?? '',
          date_of_birth: user.date_of_birth ?? '',
          address: '',
          user_type: 'student',
          password: '',
        });
        setIsGoogleUser(true);
      }

      await tokenStorage.setItem('access_token', access);
      await tokenStorage.setItem('refresh_token', refresh);

      if (!user) {
        Toast.show({
          type: 'success',
          text1: t('success'),
          text2: t('complete_registration'),
        });
      } else {
        router.push('/home');
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: axiosError.response?.data?.message ||
          axiosError.response?.data?.detail ||
          axiosError.response?.data?.error ||
          t('google_login_failed'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({
        type: 'error',
        text1: t('invalid_email'),
        text2: t('invalid_email_msg'),
      });
      return false;
    }
    return true;
  };

  const validateUsername = (username: string): boolean => {
    if (username.length < 3) {
      Toast.show({
        type: 'error',
        text1: t('invalid_username'),
        text2: t('invalid_username_msg'),
      });
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Toast.show({
        type: 'error',
        text1: t('invalid_username'),
        text2: t('invalid_username_chars'),
      });
      return false;
    }
    return true;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove any non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      Toast.show({
        type: 'error',
        text1: t('invalid_phone'),
        text2: t('invalid_phone_msg'),
      });
      return false;
    }
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      Toast.show({
        type: 'error',
        text1: t('invalid_password'),
        text2: 'Password must be at least 8 characters long.',
      });
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      Toast.show({
        type: 'error',
        text1: t('invalid_password'),
        text2: 'Password must contain at least one uppercase letter.',
      });
      return false;
    }
    if (!/[a-z]/.test(password)) {
      Toast.show({
        type: 'error',
        text1: t('invalid_password'),
        text2: 'Password must contain at least one lowercase letter.',
      });
      return false;
    }
    if (!/\d/.test(password)) {
      Toast.show({
        type: 'error',
        text1: t('invalid_password'),
        text2: 'Password must contain at least one number.',
      });
      return false;
    }
    return true;
  };

  const validateForm = (): boolean => {
    if (!userData.username || !userData.email || !userData.first_name || !userData.last_name || !userData.phone_number || !userData.address || !userData.user_type || !userData.password) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('please_fill_all_fields'),
      });
      return false;
    }

    if (!validateEmail(userData.email)) {
      return false;
    }

    if (!validateUsername(userData.username)) {
      return false;
    }

    if (!validatePassword(userData.password)) {
      return false;
    }

    if (userData.password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('passwords_do_not_match'),
      });
      return false;
    }

    if (!validatePhoneNumber(userData.phone_number)) {
      return false;
    }

    if (!termsAccepted) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('accept_tos'),
      });
      return false;
    }

    return true;
  };



  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    if (!selectedDate) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('select_date_of_birth'),
      });
      return;
    }

    try {
      setIsLoading(true);
      const dob = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
      const data: UserData = {
        ...userData,
        date_of_birth: dob,
        phone_number: `${selectedCountryCode}${userData.phone_number}`,
      };

      console.log('Sending registration data:', data);
      const response = await axios.post<ApiResponse>(`${baseurl}${API_CONFIG.ENDPOINTS.REGISTER}`, data);
      console.log('Registration response:', response.data);

      // Type assertion since we know the API returns these fields
      const { access, refresh, user, verification_required } = response.data as {
        access?: string;
        refresh?: string;
        user: UserData;
        verification_required?: boolean;
      };

      if (verification_required || user.user_type === 'student') {
        // Redirect to OTP screen without storing tokens
        Toast.show({
          type: 'info',
          text1: 'Verification Required',
          text2: 'Please verify your email to complete registration',
        });

        router.replace({
          pathname: '/auth/otp',
          params: { email: user.email, autoSend: 'false' }
        });
        return;
      }

      if (access && refresh) {
        await tokenStorage.setItem('access_token', access);
        await tokenStorage.setItem('refresh_token', refresh);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));

        // Reset form data
        setUserData({
          email: '',
          username: '',
          first_name: '',
          last_name: '',
          phone_number: '',
          date_of_birth: '',
          address: '',
          user_type: 'student',
          password: '',
        });
        setSelectedDate(undefined);
        setSelectedCountryCode('+966');

        // Directly redirect to home
        router.replace('/home');
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      console.log('Registration error:', axiosError.response?.data);

      // Handle specific backend validation errors
      const errorData = axiosError.response?.data;
      let errorMessage = t('registration_failed');

      if (errorData) {
        if (typeof errorData === 'object') {
          // Handle Django REST framework validation errors - show the FIRST error message from the array
          if ('email' in errorData && Array.isArray(errorData.email) && errorData.email.length > 0) {
            errorMessage = errorData.email[0];
          }
          else if ('username' in errorData && Array.isArray(errorData.username) && errorData.username.length > 0) {
            errorMessage = errorData.username[0];
          }
          else if ('phone_number' in errorData && Array.isArray(errorData.phone_number) && errorData.phone_number.length > 0) {
            errorMessage = errorData.phone_number[0];
          }
          else if ('password' in errorData && Array.isArray(errorData.password) && errorData.password.length > 0) {
            errorMessage = errorData.password[0];
          }
          // If we have a specific error message from the backend, use it
          else if ('detail' in errorData && errorData.detail) {
            errorMessage = errorData.detail;
          }
          // Fallback for non_field_errors
          else if ('non_field_errors' in errorData && Array.isArray(errorData.non_field_errors) && errorData.non_field_errors.length > 0) {
            errorMessage = errorData.non_field_errors[0];
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      }

      Toast.show({
        type: 'error',
        text1: t('registration_failed'),
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

          {/* Professional Registration Card */}
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
              }}>{t('join_platform')}</Text>
              <Text style={{
                fontSize: 14,
                color: '#95a5a6',
                textAlign: 'center',
                fontWeight: '400',
              }}>{t('complete_registration')}</Text>
            </View>

            {/* Google Sign Up */}
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
                marginBottom: 20,
                opacity: isLoading ? 0.6 : 1,
              }}
              onPress={() => promptAsync()}
              disabled={!request || isLoading}
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

            {/* Divider */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginVertical: 20,
            }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
              <Text style={{
                color: '#95a5a6',
                paddingHorizontal: 12,
                fontSize: 11,
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('register_manually')}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            </View>

            {/* Form Fields */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>Username</Text>
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
                placeholder={t('letters_numbers_only')}
                placeholderTextColor="#666"
                value={userData.username}
                onChangeText={(text) => setUserData({ ...userData, username: text })}
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('first_name')}</Text>
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
                placeholder={t('enter_first_name')}
                placeholderTextColor="#666"
                value={userData.first_name}
                onChangeText={(text) => setUserData({ ...userData, first_name: text })}
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('last_name')}</Text>
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
                placeholder={t('enter_last_name')}
                placeholderTextColor="#666"
                value={userData.last_name}
                onChangeText={(text) => setUserData({ ...userData, last_name: text })}
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>Email Address</Text>
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
                value={userData.email}
                onChangeText={(text) => setUserData({ ...userData, email: text.toLowerCase() })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>Password</Text>

              <View>
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
                    textAlign: isRTL ? 'right' : 'left',
                    paddingRight: 50 // Space for eye icon
                  }}
                  placeholder={t('min_password_chars')}
                  placeholderTextColor="#666"
                  value={userData.password}
                  onChangeText={(text) => setUserData({ ...userData, password: text })}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: 14,
                    zIndex: 1
                  }}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#bdc3c7" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('registration_confirm_password')}</Text>

              <View>
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
                    textAlign: isRTL ? 'right' : 'left',
                    paddingRight: 50
                  }}
                  placeholder={t('registration_confirm_password_placeholder')}
                  placeholderTextColor="#666"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: 14,
                    zIndex: 1
                  }}
                >
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#bdc3c7" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>Address</Text>

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
                  minHeight: 80,
                  textAlignVertical: 'top',
                  textAlign: isRTL ? 'right' : 'left'
                }}
                placeholder={t('enter_full_address')}
                placeholderTextColor="#666"
                value={userData.address}
                onChangeText={(text) => setUserData({ ...userData, address: text })}
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
            </View>

            {/* Date of Birth */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('date_of_birth')}</Text>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 16))}
                minimumDate={new Date(1924, 0, 1)}
                disabled={isLoading}
                placeholder={t('select_date_of_birth')}
              />
            </View>

            {/* Phone Number */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#bdc3c7',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}>{t('phone_number')}</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={{
                    width: 80,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    marginEnd: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => setCountryPickerVisible(true)}
                >
                  <Text style={{ color: '#ecf0f1', fontSize: 16 }}>{selectedCountryCode}</Text>
                </TouchableOpacity>
                <TextInput
                  style={{
                    flex: 1,
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
                  placeholder={t('enter_phone_number')}
                  placeholderTextColor="#666"
                  value={userData.phone_number}
                  onChangeText={(text) => setUserData({ ...userData, phone_number: text.replace(/[^0-9]/g, '') })}
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={!isLoading}
                />
              </View >
            </View >

            {/* Terms of Service Checkbox */}
            <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setTermsAccepted(!termsAccepted)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: termsAccepted ? '#2ecc71' : '#95a5a6',
                  backgroundColor: termsAccepted ? '#2ecc71' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginEnd: isRTL ? 0 : 10,
                  marginStart: isRTL ? 10 : 0,
                }}
              >
                {termsAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>

              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
                <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                  <Text style={{ color: '#bdc3c7', fontSize: 14 }}>
                    {t('accept_tos')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 16,
                opacity: (isLoading || !termsAccepted || !userData.username || !userData.email || !userData.password || !userData.first_name || !userData.last_name || !userData.phone_number) ? 0.6 : 1,
              }}
              onPress={handleRegister}
              disabled={isLoading || !termsAccepted || !userData.username || !userData.email || !userData.password || !userData.first_name || !userData.last_name || !userData.phone_number}
            >
              <LinearGradient
                colors={(isLoading || !termsAccepted || !userData.username || !userData.email || !userData.password) ? ['#444', '#555'] : ['#2c3e50', '#34495e']}
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
                  {isLoading ? t('creating_account') : t('create_account')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View >

          {/* Login Link */}
          < View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Text style={{
              fontSize: 14,
              color: '#95a5a6',
            }}>{t('already_have_account')} </Text>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              disabled={isLoading}
            >
              <Text style={{
                fontSize: 14,
                color: '#3498db',
                fontWeight: '600',
              }}>{t('sign_in')}</Text>
            </TouchableOpacity>
          </View >

          {/* Footer */}
          < View style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={{
              fontSize: 11,
              color: '#7f8c8d',
              marginBottom: 2,
            }}>© 2025 Taalomy University Platform</Text>
            <Text style={{
              fontSize: 9,
              color: '#7f8c8d',
              fontWeight: '300',
              marginTop: 4,
            }}>{t('secure_reliable')}</Text>
          </View >
        </ScrollView >
      </KeyboardAvoidingView >

      <CountryPickerModal
        visible={countryPickerVisible}
        onClose={() => setCountryPickerVisible(false)}
        onSelect={(country) => {
          setSelectedCountryCode(country.dial_code);
          setCountryPickerVisible(false);
        }}
        allowedCountries={['SA', 'AE', 'EG']}
      />
    </View >
  );
};

export default Register;