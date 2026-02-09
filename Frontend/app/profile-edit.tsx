import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { tokenStorage } from '../src/utils/storage';
import ProfilePicture from '../src/components/ProfilePicture';
import { pickImage, takePhoto, uploadProfilePicture, refreshUserData, ensureUserDataIsUpToDate } from '../src/utils/profilePicture';
import { API_CONFIG } from '../src/config/api';
import api from '../utils/api';
import CountryPickerModal, { COUNTRIES } from '../src/components/CountryPickerModal';

import { useTranslation } from 'react-i18next';
import { I18nManager, NativeModules } from 'react-native';
import * as Updates from 'expo-updates';

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  date_of_birth?: string;
  phone_number?: string;
  address?: string;
  profile_picture_url?: string;
}

const ProfileEditScreen = () => {
  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
  });
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Ensure user data is up-to-date from server
      const updatedUserData = await ensureUserDataIsUpToDate();
      if (updatedUserData) {
        setUserData(updatedUserData);

        let phone = updatedUserData.phone_number || '';
        let code = '+1';

        if (phone) {
          // Sort countries by dial code length (descending) to match longest prefix first
          const sortedCountries = [...COUNTRIES].sort((a, b) => b.dial_code.length - a.dial_code.length);
          const matchedCountry = sortedCountries.find(c => phone.startsWith(c.dial_code));
          if (matchedCountry) {
            code = matchedCountry.dial_code;
            phone = phone.substring(code.length);
          }
        }

        setSelectedCountryCode(code);

        setTempValues({
          first_name: updatedUserData.first_name || '',
          last_name: updatedUserData.last_name || '',
          phone_number: phone,
          address: updatedUserData.address || '',
        });
      } else {
        // Fallback to loading from AsyncStorage
        const userDataString = await AsyncStorage.getItem('user_data');
        if (userDataString) {
          const parsedUserData = JSON.parse(userDataString);
          setUserData(parsedUserData);

          let phone = parsedUserData.phone_number || '';
          let code = '+1';

          if (phone) {
            const sortedCountries = [...COUNTRIES].sort((a, b) => b.dial_code.length - a.dial_code.length);
            const matchedCountry = sortedCountries.find(c => phone.startsWith(c.dial_code));
            if (matchedCountry) {
              code = matchedCountry.dial_code;
              phone = phone.substring(code.length);
            }
          }

          setSelectedCountryCode(code);

          setTempValues({
            first_name: parsedUserData.first_name || '',
            last_name: parsedUserData.last_name || '',
            phone_number: phone,
            address: parsedUserData.address || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_load_user_data') || 'Failed to load user data',
      });
      // Navigate back after showing error
      setTimeout(() => {
        router.back();
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePicker = async () => {
    Alert.alert(
      'Choose Photo',
      'Select a photo from your gallery or take a new one',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const imageUri = await pickImage();
            if (imageUri) {
              await uploadImage(imageUri);
            }
          },
        },
        {
          text: 'Camera',
          onPress: async () => {
            const imageUri = await takePhoto();
            if (imageUri) {
              await uploadImage(imageUri);
            }
          },
        },
      ]
    );
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setIsUploading(true);
      const profilePictureUrl = await uploadProfilePicture(imageUri);

      if (profilePictureUrl && userData) {
        console.log('Setting profile picture URL:', profilePictureUrl);
        const updatedUserData = { ...userData, profile_picture_url: profilePictureUrl };
        setUserData(updatedUserData);
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUserData));

        // Refresh user data across the app
        await refreshUserData(updatedUserData);

        Toast.show({
          type: 'success',
          text1: t('success'),
          text2: t('profile_picture_updated') || 'Profile picture updated successfully!',
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_upload_profile_picture') || 'Failed to upload profile picture',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveField = async (field: string) => {
    try {
      const token = await tokenStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('no_access_token') || 'No access token found. Please login again.',
        });
        setTimeout(() => {
          router.back();
        }, 2000);
        return;
      }

      let valueToSave = tempValues[field as keyof typeof tempValues];
      if (field === 'phone_number') {
        valueToSave = `${selectedCountryCode}${valueToSave}`;
      }

      const response = await api.patch(`users/me/`, {
        [field]: valueToSave,
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        if (userData) {
          let valueToSave = tempValues[field as keyof typeof tempValues];
          if (field === 'phone_number') {
            valueToSave = `${selectedCountryCode}${valueToSave}`;
          }
          const updatedUserData = { ...userData, [field]: valueToSave } as UserData;
          setUserData(updatedUserData);
          await AsyncStorage.setItem('user_data', JSON.stringify(updatedUserData));
          Toast.show({
            type: 'success',
            text1: t('success'),
            text2: `${field.replace('_', ' ')} ${t('updated_successfully') || 'updated successfully!'}`,
          });
        }
      }
    } catch (error) {
      console.error('Error updating field:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: `${t('failed_to_update') || 'Failed to update'} ${field.replace('_', ' ')}`,
      });
    } finally {
      setEditingField(null);
    }
  };

  const handleChangePassword = async () => {
    try {
      // Validate passwords
      if (!passwordValues.currentPassword || !passwordValues.newPassword || !passwordValues.confirmPassword) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('fill_all_password_fields') || 'Please fill in all password fields',
        });
        return;
      }

      if (passwordValues.newPassword !== passwordValues.confirmPassword) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('passwords_do_not_match') || 'New password and confirm password do not match',
        });
        return;
      }

      if (passwordValues.newPassword.length < 8) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('password_min_length') || 'Password must be at least 8 characters long',
        });
        return;
      }

      const token = await tokenStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('no_access_token') || 'No access token found. Please login again.',
        });
        setTimeout(() => {
          router.back();
        }, 2000);
        return;
      }

      // Call the password change API endpoint
      const response = await api.post('auth/password/change/', {
        old_password: passwordValues.currentPassword,
        new_password1: passwordValues.newPassword,
        new_password2: passwordValues.confirmPassword,
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: t('success'),
          text2: t('password_changed_successfully') || 'Password changed successfully!',
        });
        // Reset password fields
        setPasswordValues({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setShowPasswordFields(false);
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.old_password?.[0] ||
        error.response?.data?.new_password1?.[0] ||
        error.response?.data?.new_password2?.[0] ||
        t('failed_to_change_password') || 'Failed to change password';
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: errorMessage,
      });
    }
  };

  const renderEditableField = (field: string, label: string, value: string) => {
    const isEditing = editingField === field;

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isEditing ? (
          <View style={styles.editContainer}>
            {field === 'phone_number' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 15,
                    paddingVertical: 12,
                    borderRightWidth: 1,
                    borderRightColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  onPress={() => setCountryPickerVisible(true)}
                >
                  <Text style={{ color: '#fff', fontSize: 16 }}>{selectedCountryCode}</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={tempValues[field as keyof typeof tempValues]}
                  onChangeText={(text) => setTempValues(prev => ({ ...prev, [field]: text.replace(/[^0-9]/g, '') }))}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  placeholderTextColor="#95a5a6"
                  keyboardType="phone-pad"
                />
              </View>
            ) : (
              <TextInput
                style={styles.textInput}
                value={tempValues[field as keyof typeof tempValues]}
                onChangeText={(text) => setTempValues(prev => ({ ...prev, [field]: text }))}
                placeholder={`Enter ${label.toLowerCase()}`}
                placeholderTextColor="#95a5a6"
              />
            )}
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.editButton, styles.saveButton]}
                onPress={() => handleSaveField(field)}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton]}
                onPress={() => setEditingField(null)}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.fieldValueContainer}>
            <Text style={styles.fieldValue}>{value || 'Not set'}</Text>
            <TouchableOpacity
              style={styles.editIcon}
              onPress={() => setEditingField(field)}
            >
              <Ionicons name="pencil" size={16} color="#3498db" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>
          <View style={styles.profilePictureContainer}>
            <ProfilePicture
              imageUrl={userData?.profile_picture_url}
              firstName={userData?.first_name || ''}
              lastName={userData?.last_name || ''}
              size={100}
              onPress={handleImagePicker}
              showEditIcon={true}
            />
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleImagePicker}
            disabled={isUploading}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>
              {isUploading ? 'Uploading...' : 'Change Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          {renderEditableField('first_name', 'First Name', userData?.first_name || '')}
          {renderEditableField('last_name', 'Last Name', userData?.last_name || '')}
          {renderEditableField('phone_number', 'Phone Number', userData?.phone_number || '')}
          {renderEditableField('address', 'Address', userData?.address || '')}
        </View>

        {/* Password Change Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Password</Text>

          {!showPasswordFields ? (
            <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={() => setShowPasswordFields(true)}
            >
              <Text style={styles.changePasswordButtonText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color="#3498db" />
            </TouchableOpacity>
          ) : (
            <View style={styles.passwordFieldsContainer}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Current Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordValues.currentPassword}
                  onChangeText={(text) => setPasswordValues(prev => ({ ...prev, currentPassword: text }))}
                  placeholder="Enter current password"
                  placeholderTextColor="#95a5a6"
                  secureTextEntry={true}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordValues.newPassword}
                  onChangeText={(text) => setPasswordValues(prev => ({ ...prev, newPassword: text }))}
                  placeholder="Enter new password"
                  placeholderTextColor="#95a5a6"
                  secureTextEntry={true}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordValues.confirmPassword}
                  onChangeText={(text) => setPasswordValues(prev => ({ ...prev, confirmPassword: text }))}
                  placeholder="Confirm new password"
                  placeholderTextColor="#95a5a6"
                  secureTextEntry={true}
                />
              </View>

              <View style={styles.passwordButtons}>
                <TouchableOpacity
                  style={[
                    styles.passwordButton,
                    styles.savePasswordButton,
                    { opacity: (!passwordValues.currentPassword || !passwordValues.newPassword || !passwordValues.confirmPassword) ? 0.6 : 1 }
                  ]}
                  onPress={handleChangePassword}
                  disabled={!passwordValues.currentPassword || !passwordValues.newPassword || !passwordValues.confirmPassword}
                >
                  <Text style={styles.passwordButtonText}>Save Password</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.passwordButton, styles.cancelPasswordButton]}
                  onPress={() => {
                    setShowPasswordFields(false);
                    setPasswordValues({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}
                >
                  <Text style={styles.passwordButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Account Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account_information')}</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('email_label')}</Text>
            <Text style={styles.fieldValue}>{userData?.email}</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('username_label')}</Text>
            <Text style={styles.fieldValue}>{userData?.username}</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('user_type_label')}</Text>
            <Text style={styles.fieldValue}>{userData?.user_type}</Text>
          </View>
        </View>
      </ScrollView>

      <CountryPickerModal
        visible={countryPickerVisible}
        onClose={() => setCountryPickerVisible(false)}
        onSelect={(country) => setSelectedCountryCode(country.dial_code)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  uploadButtonText: {
    color: '#fff',
    marginStart: 8,
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 8,
  },
  fieldValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
  },
  fieldValue: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  editIcon: {
    padding: 8,
  },
  editContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  textInput: {
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  editButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  changePasswordButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  passwordFieldsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  passwordInput: {
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },
  passwordButtons: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  passwordButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  savePasswordButton: {
    backgroundColor: '#27ae60',
  },
  cancelPasswordButton: {
    backgroundColor: '#e74c3c',
  },
  passwordButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  languageButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  languageButtonText: {
    color: '#95a5a6',
    fontWeight: '600',
    fontSize: 16,
  },
  languageButtonTextActive: {
    color: '#fff',
  },
});

export default ProfileEditScreen;
