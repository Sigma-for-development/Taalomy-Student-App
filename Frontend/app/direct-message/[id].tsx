import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Image, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { API_CONFIG } from '../../src/config/api';
import { socketIOManager, ChatMessage, TypingEvent, UserEvent } from '../../src/utils/socketio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../../src/utils/storage';
import axios from 'axios';
import api from '../../utils/api';

const baseurl = API_CONFIG.CHAT_BASE_URL;

export default function DirectMessageScreen() {
  // id here is the lecturerId for Direct Messages
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [lecturer, setLecturer] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingEvent[]>([]);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  // Validate that id exists and is not undefined
  const lecturerId = Array.isArray(id) ? id[0] : id;
  const isValidLecturerId = lecturerId && typeof lecturerId === 'string';

  useEffect(() => {
    // Check if we have a valid lecturer ID before proceeding
    if (!isValidLecturerId) {
      setError('Invalid lecturer ID');
      setLoading(false);
      return;
    }

    loadChatRoom();

    return () => {
      console.log('Unmounting DirectMessageScreen - cleaning up socket');
      // Only leave the room, don't kill the entire socket connection if possible, 
      // but for now, to ensure clean state, we disconnect. 
      // Improvement: socketIOManager.leaveRoom() instead.
      socketIOManager.leaveRoom();
      socketIOManager.disconnect();
    };
  }, [isValidLecturerId]);

  // Add AppState listener to handle background/foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'active') {
        console.log('App came to foreground, checking socket connection');
        socketIOManager.connect().then(() => {
          if (chatRoom?.id) {
            socketIOManager.joinRoom(chatRoom.id.toString());
          }
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [chatRoom]);

  useEffect(() => {
    // Socket.IO event listeners
    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(m => m.message_id === message.message_id);
        if (messageExists) {
          return prev;
        }

        // For own messages, ensure we have the profile picture data based on current user
        const isOwnMessage =
          chatRoom?.current_user_id && message.user_id === chatRoom.current_user_id;

        // Note: For DMs, we might need to fetch current user profile if not available in chatRoom
        // But assuming ChatRoomSerializer provided current_user_id, we can at least identify own messages

        return [...prev, message];
      });
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    const handleTyping = (event: TypingEvent) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.user_id !== event.user_id);
        if (event.typing) {
          return [...filtered, event];
        }
        return filtered;
      });
    };

    const handleUserJoin = (event: UserEvent) => {
      console.log(`${event.username} joined the chat`);
    };

    const handleUserLeave = (event: UserEvent) => {
      console.log(`${event.username} left the chat`);
    };

    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const handleError = (errorMessage: string) => {
      // Don't show alert for connection errors to avoid spamming the user
      console.log('Socket error:', errorMessage);
    };

    socketIOManager.onMessage(handleMessage);
    socketIOManager.onTyping(handleTyping);
    socketIOManager.onUserJoin(handleUserJoin);
    socketIOManager.onUserLeave(handleUserLeave);
    socketIOManager.onConnectionChange(handleConnectionChange);
    socketIOManager.onError(handleError);

    return () => {
      socketIOManager.removeMessageCallback(handleMessage);
      socketIOManager.removeTypingCallback(handleTyping);
      socketIOManager.removeUserJoinCallback(handleUserJoin);
      socketIOManager.removeUserLeaveCallback(handleUserLeave);
      socketIOManager.removeConnectionCallback(handleConnectionChange);
      socketIOManager.removeErrorCallback(handleError);
    };
  }, [chatRoom]); // Add chatRoom dependency to access current_user_id

  const loadChatRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await tokenStorage.getItem('access_token');

      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      // Check for valid ID again
      if (!lecturerId) {
        setError('Invalid lecturer ID');
        setLoading(false);
        return;
      }

      // 1. Fetch Lecturer Details for Header (Optional, but good for UX)
      try {
        const lecturerResponse = await api.get(`users/public/${lecturerId}/`);
        setLecturer(lecturerResponse.data);
      } catch (err) {
        console.log('Failed to load lecturer profile details or Admin ID', err);
        // Continue anyway - if it's admin, we handle it in UI
      }

      // 2. Get the Direct Message Room ID
      const response = await axios.get(`${baseurl}chat/direct-messages/${lecturerId}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });

      setChatRoom(response.data);
      const roomId = response.data.id;

      // 3. Load existing messages
      const messagesResponse = await axios.get(`${baseurl}chat/rooms/${roomId}/messages/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });

      // Convert messages to the expected format
      const formattedMessages = messagesResponse.data.map((msg: any) => ({
        message_id: msg.id,
        user_id: msg.sender?.id,
        username: msg.sender?.username,
        first_name: msg.sender?.first_name,
        last_name: msg.sender?.last_name,
        profile_picture_url: msg.sender?.profile_picture_url,
        message: msg.content,
        timestamp: msg.created_at,
        type: 'message'
      }));

      setMessages(formattedMessages);

      // 4. Connect to Socket.IO and Join Room
      await socketIOManager.connect();
      await socketIOManager.joinRoom(roomId.toString());

      // Mark as read
      if (response.data.unread_count > 0 && messagesResponse.data.length > 0) {
        const latestMessage = messagesResponse.data[messagesResponse.data.length - 1];
        if (socketIOManager['socket']) {
          socketIOManager['socket'].emit('mark_read', { message_id: latestMessage.id });
        }
      }

    } catch (error: any) {
      console.error('Error loading chat room:', error);
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        setError('Network connection failed. Please check your internet connection.');
      } else {
        setError(error.response?.data?.error || 'Failed to load chat room');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !chatRoom) return;

    setSending(true);
    try {
      // Send message via Socket.IO
      socketIOManager.sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_send_message') || 'Failed to send message',
      });
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    // Typing indicator removed
  };

  const retryLoad = () => {
    loadChatRoom();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // Identify if this is our own message
    const isOwnMessage =
      chatRoom?.current_user_id && item.user_id === chatRoom.current_user_id;

    // Use keys for avatar fallbacks
    let profilePictureUrl = item.profile_picture_url;
    let firstName = item.first_name;
    let lastName = item.last_name;

    // Helper to check for localhost URLs (often sent by backend socket consumer mocking request with localhost)
    const isLocalhost = (url?: string) => url && (url.includes('localhost') || url.includes('127.0.0.1'));

    // Handle Admin/Support messages
    if (!isOwnMessage && (!firstName || item.username === 'admin')) {
      firstName = "Taalomy";
      lastName = "Support";
      // Use local asset for admin support (handled in render)
    }
    // If it's the other person (lecturer) and we have their details, use that if msg data missing OR URL is localhost
    else if (!isOwnMessage && lecturer && (!profilePictureUrl || !firstName || isLocalhost(profilePictureUrl))) {
      // Prioritize lecturer details if the message URL is localhost (broken on device)
      if (!profilePictureUrl || isLocalhost(profilePictureUrl)) {
        profilePictureUrl = lecturer.profile_picture_url;
      }
      if (!firstName) firstName = lecturer.first_name;
      if (!lastName) lastName = lecturer.last_name;
    }

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {!isOwnMessage && (
          <View style={styles.messageHeaderWithAvatar}>
            {firstName === 'Taalomy' && lastName === 'Support' ? (
              <Image
                source={require('../../src/assets/images/taalomy-dark-back.png')}
                style={[styles.avatar as any, { backgroundColor: '#000' }]}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={
                  profilePictureUrl
                    ? { uri: profilePictureUrl }
                    : require('../../src/assets/images/default-avatar.png')
                }
                style={styles.avatar as any}
              />
            )}
            <View style={styles.messageHeaderInfo}>
              <Text style={styles.messageSender}>{firstName} {lastName}</Text>
              <Text style={styles.messageTime}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
            {item.message}
          </Text>
        </View>

        {isOwnMessage && (
          <Text style={[styles.messageTime, styles.ownMessageTime]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>
          {typingUsers.map(u => u.first_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </Text>
        <View style={styles.typingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    );
  };

  // Show error screen if we don't have a valid ID
  if (!isValidLecturerId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid User ID</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading chat...</Text>
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
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
            <Text style={styles.retryButtonText}>Retry</Text>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {(() => {
              // 1. If we have lecturer details with a name, use them
              if (lecturer && lecturer.first_name) return `${lecturer.first_name} ${lecturer.last_name}`;

              // 2. If valid chatRoom, try to find the other participant
              if (chatRoom?.participants && chatRoom.current_user_id) {
                const other = chatRoom.participants.find((p: any) => p.id !== chatRoom.current_user_id);
                if (other) {
                  if (other.user_type === 'admin' || !other.first_name) return "Taalomy Support";
                  return `${other.first_name} ${other.last_name}`;
                }
              }

              // 3. Fallback for Admin/Support if name detection failed
              if (chatRoom?.name && (chatRoom.name.startsWith("Direct message") || !lecturer?.first_name)) {
                return "Taalomy Support";
              }

              return chatRoom?.name || 'Chat';
            })()}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
            <Text style={styles.headerSubtitle}>
              {isConnected ? 'Online' : 'Connecting...'}
            </Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        // Use random key fallback only if message_id missing (unlikely)
        keyExtractor={(item) => (item.message_id ? item.message_id.toString() : Math.random().toString())}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={renderTypingIndicator}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#7f8c8d" />
            <Text style={styles.emptyText}>Start a conversation</Text>
            <Text style={styles.emptySubtext}>Send a message to begin chatting</Text>
          </View>
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={handleTyping}
              placeholder="Type a message..."
              placeholderTextColor="#7f8c8d"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

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
    marginBottom: 20,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 8,
    marginEnd: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: 6,
  },
  connected: {
    backgroundColor: '#2ecc71',
  },
  disconnected: {
    backgroundColor: '#e74c3c',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#bdc3c7',
  },
  headerSpacer: {
    width: 32,
    alignItems: 'flex-end',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageHeaderWithAvatar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
  },
  messageHeaderInfo: {
    marginStart: 8,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#bdc3c7',
  },
  messageTime: {
    fontSize: 10,
    color: '#7f8c8d',
    marginStart: 8,
  },
  ownMessageTime: {
    textAlign: 'right',
    marginTop: 2,
    marginEnd: 2,
  },
  messageBubble: {
    borderRadius: 20,
    padding: 12,
  },
  ownBubble: {
    backgroundColor: '#3498db',
    borderBottomEndRadius: 4,
  },
  otherBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomStartRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#ecf0f1',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginStart: 16,
  },
  typingText: {
    fontSize: 12,
    color: '#bdc3c7',
    marginEnd: 8,
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#bdc3c7',
    marginHorizontal: 1,
  },
  dot1: {
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.3,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 12,
    marginEnd: 10,
    fontSize: 16,
    color: '#fff',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sendButton: {
    backgroundColor: '#3498db',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#bdc3c7',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
  },
});