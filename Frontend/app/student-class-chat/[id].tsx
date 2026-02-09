import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Image, Modal, TouchableWithoutFeedback, Keyboard
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

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  title: string;
  loading: boolean;
}

const ReviewModal = ({ visible, onClose, onSubmit, title, loading }: ReviewModalProps) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment('');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (rating === 0) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('please_select_rating') || 'Please select a rating',
      });
      return;
    }
    onSubmit(rating, comment);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{title}</Text>

              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={32}
                      color="#f1c40f"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder="Write your review (optional)..."
                placeholderTextColor="#95a5a6"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.submitButton,
                    { opacity: (loading || rating === 0) ? 0.6 : 1 }
                  ]}
                  onPress={handleSubmit}
                  disabled={loading || rating === 0}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const baseurl = API_CONFIG.CHAT_BASE_URL;

export default function StudentClassChatScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
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
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

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
  }, [isValidRoomId]); // Use isValidRoomId instead of id

  useEffect(() => {
    // Socket.IO event listeners
    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(m => m.message_id === message.message_id);
        if (messageExists) {
          return prev;
        }

        // For own messages, ensure we have the profile picture data
        const isOwnMessage = message.user_id === chatRoom?.current_user_id;
        if (isOwnMessage && !message.profile_picture_url && chatRoom?.current_user) {
          message.profile_picture_url = chatRoom.current_user.profile_picture_url;
          message.first_name = chatRoom.current_user.first_name;
          message.last_name = chatRoom.current_user.last_name;
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
      const token = await tokenStorage.getItem('access_token');

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
      const response = await axios.get(`${baseurl}chat/classes/${roomId}/chat/`, {
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
        profile_picture_url: msg.sender?.profile_picture_url, // Add profile picture URL
        message: msg.content,
        timestamp: msg.created_at,
        type: 'message'
      }));

      setMessages(formattedMessages);

      // Connect to Socket.IO
      await socketIOManager.connect();
      await socketIOManager.joinRoom(response.data.id.toString());

      // Mark all messages as read when entering the chat room
      if (response.data.unread_count > 0) {
        // Emit mark_read event for the latest message to update last_read_at timestamp
        if (messagesResponse.data.length > 0) {
          const latestMessage = messagesResponse.data[messagesResponse.data.length - 1];
          // Use the socketIOManager's socket directly to emit the event
          if (socketIOManager['socket']) {
            socketIOManager['socket'].emit('mark_read', { message_id: latestMessage.id });

            // Add a small delay to ensure the server processes the mark_read event
            // before we potentially refresh the chat room list
            await new Promise(resolve => setTimeout(resolve, 500));
          }
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

  const handleOpenReview = () => {
    setReviewModalVisible(true);
  };

  const navigateToClassVideos = () => {
    if (chatRoom?.class_obj?.id) {
      router.push(`/class-videos/${chatRoom.class_obj.id}` as any);
    }
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!chatRoom?.class_obj?.id) return;

    try {
      setSubmittingReview(true);
      const payload = {
        rating,
        comment,
        class_obj: chatRoom.class_obj.id
      };

      await api.post('lecturer/reviews/', payload);

      Toast.show({
        type: 'success',
        text1: t('success'),
        text2: t('review_submitted') || 'Thank you for your review!',
      });
      setReviewModalVisible(false);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      const errorMessage = error.response?.data?.error || 'Failed to submit review';
      if (errorMessage.includes('already reviewed')) {
        Toast.show({
          type: 'info',
          text1: t('review_submitted_title') || 'Review Submitted',
          text2: t('already_reviewed') || 'You have already reviewed this item.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: errorMessage,
        });
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    // For own messages, we need to make sure we have the profile picture data
    const isOwnMessage = item.user_id === chatRoom?.current_user_id;

    // If it's our own message but we don't have profile picture data, try to get it from chatRoom
    let profilePictureUrl = item.profile_picture_url;
    let firstName = item.first_name;
    let lastName = item.last_name;

    if (isOwnMessage && !profilePictureUrl && chatRoom?.current_user) {
      profilePictureUrl = chatRoom.current_user.profile_picture_url;
      firstName = chatRoom.current_user.first_name;
      lastName = chatRoom.current_user.last_name;
    }

    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {!isOwnMessage && (
          <View style={styles.messageHeaderWithAvatar}>
            <Image
              source={
                profilePictureUrl
                  ? { uri: profilePictureUrl }
                  : require('../../src/assets/images/default-avatar.png')
              }
              style={styles.avatar as any}
            />
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

  // Show error screen if we don't have a valid room ID
  if (!isValidRoomId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid chat room ID</Text>
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
            {chatRoom?.name || 'Class Chat'}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
            <Text style={styles.headerSubtitle}>
              {isConnected ? 'Online' : 'Connecting...'}
            </Text>
          </View>
        </View>
        <View style={styles.headerSpacer}>
          <TouchableOpacity onPress={navigateToClassVideos} style={styles.headerReviewButton}>
            <Ionicons name="videocam" size={24} color="#9b59b6" />
          </TouchableOpacity>
          {chatRoom?.class_obj?.status === 'completed' && (
            <TouchableOpacity onPress={handleOpenReview} style={styles.headerReviewButton}>
              <Ionicons name="star" size={24} color="#f1c40f" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => (item.message_id ? item.message_id.toString() : Math.random().toString())}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={renderTypingIndicator}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#7f8c8d" />
            <Text style={styles.emptyText}>Welcome to {chatRoom?.name}</Text>
            <Text style={styles.emptySubtext}>Start discussing with your classmates!</Text>
          </View>
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
      <ReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={handleSubmitReview}
        title={`Review ${chatRoom?.name || 'Class'}`}
        loading={submittingReview}
      />
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
  headerReviewButton: {
    padding: 4,
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
    elevation: 4,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowOpacity: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  commentInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.5)',
  },
  submitButton: {
    backgroundColor: '#3498db',
  },
  cancelButtonText: {
    color: '#e74c3c',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});