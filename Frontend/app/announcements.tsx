import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../src/utils/storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { API_CONFIG } from '../src/config/api';

interface Announcement {
  id: number;
  content: string;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
    user_type: string;
  };
  chat_room: {
    id: number;
    name: string;
    chat_type: string;
  };
  created_at: string;
}

const AnnouncementsScreen = () => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add function to fetch announcements
  const fetchAnnouncements = async (): Promise<Announcement[]> => {
    try {
      const token = await tokenStorage.getItem('access_token');
      if (!token) {
        return [];
      }

      // Use the new optimized endpoint
      const response = await axios.get(`${API_CONFIG.CHAT_BASE_URL}${API_CONFIG.ENDPOINTS.ANNOUNCEMENTS}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });

      console.log('[Announcements] Fetched successfully:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      return [];
    }
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedAnnouncements = await fetchAnnouncements();
      setAnnouncements(fetchedAnnouncements);
    } catch (error: any) {
      console.error('Error loading announcements:', error);
      setError(error.response?.data?.error || t('failed_load_announcements'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
    if (!error) {
      Toast.show({
        type: 'success',
        text1: t('success'),
        text2: t('announcements_refreshed') || 'Announcements refreshed',
      });
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const retryLoad = () => {
    loadAnnouncements();
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => {
    return (
      <View style={styles.announcementItem}>
        <View style={[styles.announcementHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.announcementSender, { textAlign: isRTL ? 'right' : 'left' }]}>
            {item.sender.first_name} {item.sender.last_name}
          </Text>
          <Text style={styles.announcementTime}>
            {new Date(item.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
        </View>
        <Text style={[styles.announcementContent, { textAlign: isRTL ? 'right' : 'left' }]}>{item.content}</Text>
        {item.chat_room && (
          <Text style={[styles.announcementContext, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('in_context')} {item.chat_room.name}
          </Text>
        )}
      </View>
    );
  };

  const isRTL = I18nManager.isRTL;

  // ... fetch functions ...

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('announcements_header')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>{t('loading_announcements')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('announcements_header')}</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('announcements_header')}</Text>
      </View>

      {/* Announcements List */}
      <FlatList
        data={announcements}
        renderItem={renderAnnouncement}
        keyExtractor={(item) => item.id.toString()}
        style={styles.announcementsList}
        contentContainerStyle={styles.announcementsListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3498db"
            colors={['#3498db']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={64} color="#7f8c8d" />
            <Text style={styles.emptyText}>{t('no_announcements_title')}</Text>
            <Text style={styles.emptySubtext}>{t('no_announcements_desc')}</Text>
          </View>
        }
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
    paddingHorizontal: 20,
    paddingTop: 60, // Adjust for status bar
    paddingBottom: 20,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginEnd: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#bdc3c7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  announcementsList: {
    flex: 1,
  },
  announcementsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  announcementItem: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  announcementSender: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  announcementTime: {
    fontSize: 12,
    color: '#95a5a6',
  },
  announcementContent: {
    fontSize: 16,
    color: '#ecf0f1',
    marginBottom: 15,
    lineHeight: 22,
  },
  announcementContext: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default AnnouncementsScreen;