import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from './storage';
import { API_CONFIG } from '../config/api';
import { appEventEmitter } from './eventEmitter';
import api from '../../utils/api';

export const pickImage = async (): Promise<string | null> => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return null;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

export const takePhoto = async (): Promise<string | null> => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return null;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

export const uploadProfilePicture = async (imageUri: string, onProgress?: (progress: number) => void): Promise<string | null> => {
  const upload = async (currentToken: string) => {
    // Create form data
    const formData = new FormData();
    formData.append('profile_picture', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile_picture.jpg',
    } as any);

    // Upload to server
    const response = await fetch(`${API_CONFIG.ACCOUNTS_BASE_URL}${API_CONFIG.ENDPOINTS.PROFILE_PICTURE}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
      },
      body: formData,
    });
    return response;
  };

  try {
    let token = await tokenStorage.getItem('access_token');
    if (!token) throw new Error('No access token found');

    let response = await upload(token);

    // Handle 401 Unauthorized (Token Expiry)
    if (response.status === 401) {
      console.log('Upload failed with 401, attempting token refresh...');
      try {
        const refreshToken = await tokenStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');

        // Use direct fetch for refresh to avoid circular dependencies or adapter issues
        const refreshResponse = await fetch(`${API_CONFIG.ACCOUNTS_BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const pToken = refreshData.access;
          await tokenStorage.setItem('access_token', pToken);
          console.log('Token refreshed successfully, retrying upload...');

          // Retry upload with new token
          response = await upload(pToken);
        } else {
          console.error('Token refresh failed');
          // Optional: Trigger logout here if you have a reliable way, or let the error propagate
        }
      } catch (refreshError) {
        console.error('Error during token refresh in upload:', refreshError);
      }
    }

    if (response.ok) {
      const data = await response.json();
      console.log('Upload response:', data);

      let finalUrl = data.profile_picture_url;
      if (finalUrl && !finalUrl.startsWith('http')) {
        const baseUrl = API_CONFIG.ACCOUNTS_BASE_URL.replace('/accounts/', '');
        finalUrl = `${baseUrl}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
        console.log('Constructed full URL:', finalUrl);
      }
      return finalUrl;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to upload profile picture (${response.status})`);
    }
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

// Function to fetch user data from the server
// Note: users/me/ endpoint uses access token to identify user, no user ID needed
export const fetchUserDataFromServer = async () => {
  try {
    // Fetch user data from server (uses access token for authentication)
    const response = await api.get(`users/me/`);

    if (response.status === 200) {
      const userData = response.data;

      // Handle profile picture URL correctly
      // The backend returns 'profile_picture_url' (absolute) and 'profile_picture' (relative path)
      if (userData.profile_picture_url && userData.profile_picture_url.startsWith('http')) {
        // Backend provided a valid absolute URL, use it
        console.log('Using backend provided profile_picture_url:', userData.profile_picture_url);
      } else if (userData.profile_picture) {
        // Fallback to constructing from relative path
        if (userData.profile_picture.startsWith('http')) {
          userData.profile_picture_url = userData.profile_picture;
        } else {
          // Construct absolute URL
          const baseUrl = API_CONFIG.ACCOUNTS_BASE_URL.replace('/accounts/', '');
          // Create proper absolute URL ensuring no double slashes or missing slashes
          // If baseUrl ends with /, remove it. If path starts with /, remove it. Then join with /.
          const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
          const cleanPath = userData.profile_picture.startsWith('/') ? userData.profile_picture.substring(1) : userData.profile_picture;
          userData.profile_picture_url = `${cleanBase}/${cleanPath}`;
          console.log('Constructed profile_picture_url:', userData.profile_picture_url);
        }
      } else {
        // No profile picture
        userData.profile_picture_url = null;
      }

      return userData;
    } else {
      throw new Error('Failed to fetch user data');
    }
  } catch (error) {
    console.error('Error fetching user data from server:', error);
    throw error;
  }
};

// Function to refresh user data across the app
export const refreshUserData = async (updatedUserData: any) => {
  try {
    // Update AsyncStorage
    await AsyncStorage.setItem('user_data', JSON.stringify(updatedUserData));

    // Emit an event to notify other components
    appEventEmitter.emit('userProfileUpdated', updatedUserData);

    return true;
  } catch (error) {
    console.error('Error refreshing user data:', error);
    return false;
  }
};

// Function to ensure user data is up-to-date on app start
// Also handles the case where access_token exists but user_data is missing
export const ensureUserDataIsUpToDate = async () => {
  try {
    // Fetch fresh user data from server (this works even if no local data exists)
    const freshUserData = await fetchUserDataFromServer();

    // Update AsyncStorage with fresh data
    await AsyncStorage.setItem('user_data', JSON.stringify(freshUserData));

    // Emit an event to notify other components
    appEventEmitter.emit('userProfileUpdated', freshUserData);

    return freshUserData;
  } catch (error) {
    console.error('Error ensuring user data is up to date:', error);
    // Return existing data if we can't fetch fresh data
    const userDataString = await AsyncStorage.getItem('user_data');
    return userDataString ? JSON.parse(userDataString) : null;
  }
};

export const showImagePickerOptions = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    // In a real app, you'd show an action sheet here
    // For now, we'll just pick from library
    pickImage().then(resolve);
  });
};