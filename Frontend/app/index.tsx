import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { Redirect } from "expo-router";
import { tokenStorage } from '../src/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const validateToken = async (accessToken: string) => {
    try {
      // Try to make a request to a protected endpoint to validate the token
      const response = await axios.get(`${API_CONFIG.ACCOUNTS_BASE_URL}${API_CONFIG.ENDPOINTS.USER_ID}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.status === 200;
    } catch (error) {
      console.log('Token validation failed:', error);
      return false;
    }
  };

  const checkLoginStatus = async () => {
    try {
      // Check if access token exists
      const accessToken = await tokenStorage.getItem('access_token');
      // We still use AsyncStorage for user_data as per login implementation
      const userData = await AsyncStorage.getItem('user_data');

      if (accessToken && userData) {
        // Validate the token
        const isTokenValid = await validateToken(accessToken);

        if (isTokenValid) {
          // Token is valid, user is logged in
          console.log('Auto-login successful');
          setIsLoggedIn(true);
        } else {
          // Token is invalid, clear storage and redirect to login
          console.log('Token expired, clearing storage');
          await tokenStorage.deleteItem('access_token');
          await tokenStorage.deleteItem('refresh_token');
          await AsyncStorage.removeItem('user_data');
          setIsLoggedIn(false);
        }
      } else {
        // No tokens found, redirect to login
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      // On error, clear storage and redirect to login
      try {
        await tokenStorage.deleteItem('access_token');
        await tokenStorage.deleteItem('refresh_token');
        await AsyncStorage.removeItem('user_data');
      } catch (clearError) {
        console.error('Error clearing storage:', clearError);
      }
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Image
            source={require('../src/assets/images/taalomy-no-back.png')}
            style={{
              width: 100,
              height: 100,
              marginBottom: 20,
              resizeMode: 'contain'
            }}
          />
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#ecf0f1',
            marginBottom: 20
          }}>
            Taalomy
          </Text>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={{
            fontSize: 16,
            color: '#bdc3c7',
            marginTop: 20
          }}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  return isLoggedIn ? <Redirect href="/home" /> : <Redirect href="/login" />;
}
