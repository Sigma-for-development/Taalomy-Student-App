import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,

  Image,
  TextInput,
  ScrollView, // Add ScrollView
  I18nManager
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../src/utils/storage';
import api from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { API_CONFIG } from '../src/config/api';
import { formatDate } from '../src/utils/date';

interface ChatRoom {
  id: number;
  name: string;
  chat_type: string;
  class_obj?: {
    id: number;
    name: string;
  };
  group_obj?: {
    id: number;
    name: string;
  };
  participants?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    user_type: string; // Add user_type to identify lecturers
    profile_picture_url?: string;
  }>;
  last_message: {
    id: number;
    content: string;
    sender: {
      id: number;
      first_name: string;
      last_name: string;
      user_type: string; // Add user_type to identify lecturers
    };
    created_at: string;
  } | null;
  unread_count: number;
  updated_at: string;
}

// Add this interface for announcements
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

const MessagesScreen = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]); // Add announcements state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'direct' | 'class' | 'group'>('all'); // Add activeFilter state
  const [searchQuery, setSearchQuery] = useState(''); // Add searchQuery state
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  // Add prefetch function
  const prefetchRecentChats = async (rooms: ChatRoom[]) => {
    try {
      // Take top 3 rooms
      const recentRooms = rooms.slice(0, 3);
      console.log('[Messages] Prefetching recent chats:', recentRooms.map(r => r.id));

      // Fetch concurrently
      await Promise.all(
        recentRooms.map(room =>
          api.get(`${API_CONFIG.ENDPOINTS.CHAT_MESSAGES}${room.id}/messages/`)
            .catch(err => console.warn(`[Messages] Failed to prefetch room ${room.id}`, err))
        )
      );
      console.log('[Messages] Prefetch complete');
    } catch (error) {
      console.warn('[Messages] Prefetch error:', error);
    }
  };

  // Add function to fetch announcements
  const fetchAnnouncements = async (): Promise<Announcement[]> => {
    try {
      // Use the new optimized endpoint
      // api instance handles token automatically
      const response = await api.get(`${API_CONFIG.ENDPOINTS.ANNOUNCEMENTS}`, {
        timeout: 10000
      });

      console.log('[Messages] Fetched announcements successfully:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      return [];
    }
  };

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await tokenStorage.getItem('access_token');

      if (!token) {
        setError(t('no_token_found') || 'No authentication token found');
        return;
      }

      // Get current user ID
      const userDataString = await AsyncStorage.getItem('user_data');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setCurrentUserId(userData.id);
      }

      // Updated endpoint to match the backend API
      const response = await api.get(`${API_CONFIG.ENDPOINTS.CHAT_ROOMS}`, {
        timeout: 10000
      });

      console.log('Received chat rooms:', response.data);

      // Sort chat rooms by last updated time (newest first)
      const sortedRooms = response.data.sort((a: ChatRoom, b: ChatRoom) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setChatRooms(sortedRooms);

      // Trigger prefetch for offline availability
      prefetchRecentChats(sortedRooms);

      // Load announcements
      const fetchedAnnouncements = await fetchAnnouncements();
      setAnnouncements(fetchedAnnouncements);
    } catch (error: any) {
      console.error('Error loading chat rooms:', error);
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        setError(t('network_error_check'));
      } else if (error.response?.status === 404) {
        // Handle 404 specifically - student may not have chat rooms
        setError(t('no_chat_rooms'));
      } else {
        setError(error.response?.data?.error || t('failed_to_load_messages') || 'Failed to load messages');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChatRooms();
    // Refresh announcements as well
    const fetchedAnnouncements = await fetchAnnouncements();
    setAnnouncements(fetchedAnnouncements);
    setRefreshing(false);
    Toast.show({
      type: 'success',
      text1: t('success'),
      text2: t('messages_refreshed') || 'Messages refreshed',
    });
  }, []);

  useEffect(() => {
    loadChatRooms();
  }, []);

  // Filter logic
  const filteredChatRooms = React.useMemo(() => {
    return chatRooms.filter(room => {
      // 1. Filter by Type
      if (activeFilter === 'direct' && room.chat_type !== 'direct') return false;
      if (activeFilter === 'class' && room.chat_type !== 'class') return false;
      if (activeFilter === 'group' && room.chat_type !== 'group') return false;

      // 2. Filter by Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const chatName = getChatName(room)?.toLowerCase() || '';
        return chatName.includes(query);
      }

      return true;
    });
  }, [chatRooms, activeFilter, searchQuery, currentUserId]);

  const handleChatRoomPress = (room: ChatRoom) => {
    if (room.chat_type === 'class' && room.class_obj && room.class_obj.id) {
      router.push(`/student-class-chat/${room.class_obj.id}`);
    } else if (room.chat_type === 'group' && room.group_obj && room.group_obj.id) {
      router.push(`/student-group-chat/${room.group_obj.id}`);
    } else if (room.chat_type === 'direct' && room.participants && currentUserId) {
      // For direct messages, we need to determine the other participant
      // and navigate to the direct message screen
      const otherParticipant = room.participants.find(p => p.id !== currentUserId);

      if (otherParticipant) {
        router.push(`/direct-message/${otherParticipant.id}`);
      } else {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('could_not_determine_participant') || 'Could not determine the other participant.',
        });
      }
    } else {
      Toast.show({
        type: 'error',
        text1: t('unsupported_chat_type'),
        text2: t('chat_type_not_supported') || 'This chat type is not supported yet.',
      });
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return t('yesterday');
    } else {
      return formatDate(date, { month: 'short', day: 'numeric' });
    }
  };

  const getChatName = (room: ChatRoom) => {
    if (room.chat_type === 'direct' && room.participants && currentUserId) {
      // For direct messages, show the name of the other participant
      const otherParticipant = room.participants.find(p => p.id !== currentUserId);
      if (otherParticipant) {
        // Check for Admin
        if (otherParticipant.user_type === 'admin' || !otherParticipant.first_name) {
          return "Taalomy Support";
        }
        return `${otherParticipant.first_name} ${otherParticipant.last_name}`;
      }
    }
    return room.name;
  };

  const getAvatarIcon = (chatType: string) => {
    switch (chatType) {
      case 'group':
        return 'people-outline';
      case 'direct':
        return 'person-outline';
      default:
        return 'school-outline';
    }
  };

  const renderChatRoom = ({ item }: { item: ChatRoom }) => {
    const lastMessage = item.last_message;
    const unreadCount = item.unread_count;
    const chatName = getChatName(item);
    const avatarIcon = getAvatarIcon(item.chat_type);

    // Get other participant for profile picture (matches getChatName logic)
    let profilePicUrl = null;
    if (item.chat_type === 'direct' && item.participants && currentUserId) {
      const otherParticipant = item.participants.find(p => p.id !== currentUserId);
      if (otherParticipant) {
        profilePicUrl = otherParticipant.profile_picture_url;
      }
    }

    return (
      <TouchableOpacity
        style={styles.chatRoomItem}
        onPress={() => handleChatRoomPress(item)}
      >
        <View style={styles.avatarContainer}>
          {chatName === 'Taalomy Support' ? (
            <Image
              source={require('../src/assets/images/taalomy-dark-back.png')}
              style={[styles.avatarImage, { backgroundColor: '#000' }]}
              resizeMode="cover"
            />
          ) : profilePicUrl ? (
            <Image
              source={{ uri: profilePicUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatar}>
              <Ionicons
                name={avatarIcon}
                size={24}
                color="#007AFF"
              />
            </View>
          )}
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {chatName}
            </Text>
            {lastMessage && (
              <Text style={styles.chatTime}>
                {formatTime(lastMessage.created_at)}
              </Text>
            )}
          </View>

          <View style={styles.chatPreview}>
            {lastMessage ? (
              <>
                <Text style={styles.senderName}>
                  {(() => {
                    const senderName = `${lastMessage.sender.first_name} ${lastMessage.sender.last_name}`.trim();
                    return senderName || "Taalomy Support";
                  })()}:
                </Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {lastMessage.content}
                </Text>
              </>
            ) : (
              <Text style={styles.noMessages}>{t('no_messages_yet')}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const retryLoad = () => {
    loadChatRooms();
  };

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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('messages')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>{t('loading_messages')}</Text>
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('messages')}</Text>
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('messages')}</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder={t('search_messages')}
          placeholderTextColor="#666"
          style={styles.searchInput}
          textAlign={isRTL ? 'right' : 'left'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>{t('All')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'direct' && styles.filterChipActive]}
            onPress={() => setActiveFilter('direct')}
          >
            <Text style={[styles.filterText, activeFilter === 'direct' && styles.filterTextActive]}>{t('Direct')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'class' && styles.filterChipActive]}
            onPress={() => setActiveFilter('class')}
          >
            <Text style={[styles.filterText, activeFilter === 'class' && styles.filterTextActive]}>{t('Classes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'group' && styles.filterChipActive]}
            onPress={() => setActiveFilter('group')}
          >
            <Text style={[styles.filterText, activeFilter === 'group' && styles.filterTextActive]}>{t('Groups')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Chat Rooms List */}
      <FlatList
        data={filteredChatRooms}
        renderItem={renderChatRoom}
        keyExtractor={(item) => item.id.toString()}
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
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
            <Ionicons name="chatbubbles-outline" size={64} color="#7f8c8d" />
            <Text style={styles.emptyText}>{t('no_messages_yet')}</Text>
            <Text style={styles.emptySubtext}>{t('your_class_group_chats_appear_here')}</Text>
            <Text style={styles.emptySubtext}>{t('join_classes_groups_to_chat')}</Text>
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
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  chatRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginEnd: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#0a0a0a',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ecf0f1',
    flex: 1,
    marginEnd: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  chatPreview: {
    flexDirection: 'row',
  },
  senderName: {
    fontSize: 14,
    color: '#bdc3c7',
    fontWeight: '600',
    marginEnd: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#95a5a6',
    flex: 1,
  },
  noMessages: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  emptyContainer: {
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
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 4,
  },
  filterContainer: {
    marginBottom: 10,
  },
  filterContent: {
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginEnd: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterText: {
    color: '#bdc3c7',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
});

export default MessagesScreen;