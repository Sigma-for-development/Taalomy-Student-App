import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appEventEmitter } from '../utils/eventEmitter';
import { API_CONFIG } from '../config/api';

interface ProfilePictureProps {
  imageUrl?: string | null;
  firstName?: string;
  lastName?: string;
  size?: number;
  onPress?: () => void;
  showEditIcon?: boolean;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  imageUrl,
  firstName = '',
  lastName = '',
  size = 50,
  onPress,
  showEditIcon = false,
}) => {
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null | undefined>(imageUrl);
  // Removed 'key' state which caused flickering

  // Update image URL when props change
  useEffect(() => {
    setCurrentImageUrl(imageUrl);
  }, [imageUrl]);

  // Listen for profile updates across the app
  useEffect(() => {
    const handleProfileUpdate = (updatedUserData: any) => {
      // Only update if URL actually changed
      if (updatedUserData.profile_picture_url !== currentImageUrl) {
        setCurrentImageUrl(updatedUserData.profile_picture_url);
      }
    };

    // Add event listener
    appEventEmitter.on('userProfileUpdated', handleProfileUpdate);

    // Cleanup
    return () => {
      appEventEmitter.off('userProfileUpdated', handleProfileUpdate);
    };
  }, [currentImageUrl]);

  const getInitials = () => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${first}${last}`;
  };

  const getBackgroundColor = () => {
    const colors = [
      '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#16a085'
    ];
    // Handle empty names safely
    const charCode1 = firstName ? firstName.charCodeAt(0) : 0;
    const charCode2 = lastName ? lastName.charCodeAt(0) : 0;
    const index = (charCode1 + charCode2) % colors.length;
    return colors[index];
  };

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
    },
    image: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    fallback: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: getBackgroundColor(),
      justifyContent: 'center',
      alignItems: 'center',
    },
    initials: {
      color: '#fff',
      fontSize: size * 0.4,
      fontWeight: 'bold',
    },
    editIcon: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#3498db',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
  });

  const getFinalUrl = () => {
    if (!currentImageUrl) return null;
    if (currentImageUrl.startsWith('http') || currentImageUrl.startsWith('file://')) {
      return currentImageUrl;
    }

    // Construct absolute URL
    let baseUrl = API_CONFIG.BASE_URL || '';
    // Remove trailing slash if present
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Ensure path starts with slash
    let path = currentImageUrl;
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }

    return `${baseUrl}${path}`;
  };

  const finalUrl = getFinalUrl();

  const content = (
    <View style={styles.container}>
      {finalUrl ? (
        <Image
          source={{ uri: finalUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.initials}>{getInitials()}</Text>
        </View>
      )}
      {showEditIcon && (
        <View style={styles.editIcon}>
          <Ionicons name="camera" size={12} color="#fff" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default ProfilePicture;