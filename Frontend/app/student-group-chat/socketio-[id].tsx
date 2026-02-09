import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Alert, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from '../../src/config/api';
import { socketIOManager, ChatMessage, TypingEvent, UserEvent } from '../../src/utils/socketio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const baseurl = API_CONFIG.CHAT_BASE_URL;

export default function StudentGroupChatScreen() {
  const { id } = useLocalSearchParams();
  const [chatRoom, setChatRoom] = useState<any>(null);
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
  const roomId = Array.isArray(id) ? id[0] : id;
  const isValidRoomId = roomId && typeof roomId === 'string';

  useEffect(() => {
    // Check if we have a valid room ID before proceeding
    if (!isValidRoomId) {
      setError('Invalid chat room ID');
      setLoading(false);
      return;
    }

    loadChatRoom();
    return () => {
      socketIOManager.disconnect();
    };
  }, [id, isValidRoomId]);

  useEffect(() => {
    // Socket.IO event listeners
    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(m => m.message_id === message.message_id);
        if (messageExists) {
          return prev;
        }
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
      // Could show a notification or update UI
      console.log(`${event.username} joined the chat`);
    };

    const handleUserLeave = (event: UserEvent) => {
      // Could show a notification or update UI
      console.log(`${event.username} left the chat`);
    };

    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
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
  }, []);

  const loadChatRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('access_token');

      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      // Ensure id is a string (already validated above)
      const roomId = Array.isArray(id) ? id[0] : id;

      // Additional validation to ensure roomId is valid
      if (!roomId || roomId === 'undefined') {
        setError('Invalid chat room ID');
        setLoading(false);
        return;
      }

      // Load chat room details
      const response = await axios.get(`${baseurl}chat/groups/${roomId}/chat/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });

      setChatRoom(response.data);

      // Load existing messages
      const messagesResponse = await axios.get(`${baseurl}chat/rooms/${response.data.id}/messages/`, {
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

      // Connect to Socket.IO
      await socketIOManager.connect();
      await socketIOManager.joinRoom(response.data.id.toString());

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
      Alert.alert('Error', 'Failed to send message');
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
    const isOwnMessage = item.user_id === chatRoom?.current_user_id;

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {!isOwnMessage && (
          <View style={styles.messageHeaderWithAvatar}>
            <Image
              source={
                item.profile_picture_url
                  ? { uri: item.profile_picture_url }
                  : require('../../src/assets/images/default-avatar.png')
              }
              style={styles.avatar}
            />
            <View style={styles.messageHeaderInfo}>
              <Text style={styles.messageSender}>{item.first_name} {item.last_name}</Text>
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

  // Show error screen if we don't have a valid room ID
  if (!isValidRoomId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid chat room ID</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatRoom?.name || 'Group Chat'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isConnected ? 'Online' : 'Connecting...'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.message_id.toString()}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={renderTypingIndicator}
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={handleTyping}
            placeholder="Type a message..."
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8e8e93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#c6c6c8',
  },
  backButton: {
    padding: 4,
    marginEnd: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  headerSpacer: {
    width: 32,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
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
  },
  messageHeaderInfo: {
    marginStart: 8,
  },
  messageSender: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
  },
  messageTime: {
    fontSize: 11,
    color: '#8e8e93',
    marginStart: 8,
  },
  ownMessageTime: {
    textAlign: 'right',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomEndRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomStartRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 14,
    color: '#8e8e93',
    marginEnd: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8e8e93',
    marginHorizontal: 2,
  },
  dot1: {
    animationDelay: '0ms',
  },
  dot2: {
    animationDelay: '200ms',
  },
  dot3: {
    animationDelay: '400ms',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#c6c6c8',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c6c6c8',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    marginEnd: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#c6c6c8',
  },
});