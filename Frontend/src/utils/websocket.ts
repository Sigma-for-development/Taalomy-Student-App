import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import { tokenStorage } from './storage';

export interface ChatMessage {
  id: string;
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  message: string;
  timestamp: string;
  type: 'message' | 'user_joined' | 'user_left' | 'typing';
}

export interface TypingEvent {
  user_id: number;
  username: string;
  first_name: string;
  typing: boolean;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private pollingInterval: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  private messageCallbacks: ((message: ChatMessage) => void)[] = [];
  private typingCallbacks: ((event: TypingEvent) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];

  async connect(roomId: string) {
    try {
      const token = await tokenStorage.getItem('access_token');
      if (!token) {
        console.log('No access token found, skipping WebSocket connection');
        // Start polling as fallback when no token
        this.connectionCallbacks.forEach(callback => callback(true));
        this.startPolling(roomId);
        return;
      }

      // Reset last message ID for new room
      this.lastMessageId = null;

      // Create WebSocket connection with token as query parameter
      const chatBaseUrl = API_CONFIG.CHAT_BASE_URL || '';
      const wsUrl = `${chatBaseUrl.replace('http', 'ws')}ws/chat/${roomId}/?token=${token}`;
      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        this.connectionCallbacks.forEach(callback => callback(true));

        // Clear polling if it was running
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'message') {
            const chatMessage: ChatMessage = {
              id: data.message_id?.toString() || Date.now().toString(),
              user_id: data.user_id,
              username: data.username,
              first_name: data.first_name,
              last_name: data.last_name,
              message: data.message,
              timestamp: data.timestamp,
              type: 'message'
            };
            this.messageCallbacks.forEach(callback => callback(chatMessage));
          } else if (data.type === 'typing') {
            const typingEvent: TypingEvent = {
              user_id: data.user_id,
              username: data.username,
              first_name: data.first_name,
              typing: data.typing
            };
            this.typingCallbacks.forEach(callback => callback(typingEvent));
          } else if (data.type === 'user_joined' || data.type === 'user_left') {
            // Handle user join/leave events if needed
            console.log(`${data.type}: ${data.message}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionCallbacks.forEach(callback => callback(false));
        // Start polling as fallback
        this.startPolling(roomId);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.connectionCallbacks.forEach(callback => callback(false));

        // Attempt to reconnect
        if (event.code !== 1000) { // Don't reconnect if closed normally
          this.attemptReconnect(roomId);
        } else {
          // Start polling as fallback when closed normally
          this.startPolling(roomId);
        }
      };

    } catch (error) {
      console.error('Error connecting to chat:', error);
      // Fallback to polling if WebSocket fails
      console.log('Falling back to polling for real-time updates');
      this.connectionCallbacks.forEach(callback => callback(true));
      this.startPolling(roomId);
    }
  }

  private lastMessageId: number | null = null;

  private startPolling(roomId: string) {
    // Clear any existing polling interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Poll every 3 seconds for new messages
    this.pollingInterval = setInterval(async () => {
      try {
        const token = await tokenStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(`${API_CONFIG.CHAT_BASE_URL}chat/rooms/${roomId}/messages/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const messages = await response.json();
          // Only emit new messages
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];

            // Check if this is a new message
            if (this.lastMessageId === null || latestMessage.id > this.lastMessageId) {
              this.lastMessageId = latestMessage.id;

              // Convert to the expected format
              const formattedMessage: ChatMessage = {
                id: latestMessage.id.toString(),
                user_id: latestMessage.sender?.id,
                username: latestMessage.sender?.username,
                first_name: latestMessage.sender?.first_name,
                last_name: latestMessage.sender?.last_name,
                message: latestMessage.content,
                timestamp: latestMessage.created_at,
                type: 'message'
              };
              this.messageCallbacks.forEach(callback => callback(formattedMessage));
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
  }

  private attemptReconnect(roomId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect(roomId);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async sendMessage(message: string, roomId?: string) {
    try {
      // If WebSocket is connected, send via WebSocket
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const data = {
          type: 'message',
          message: message
        };
        this.ws.send(JSON.stringify(data));
        return;
      }

      // Fallback to HTTP if WebSocket is not available
      const token = await tokenStorage.getItem('access_token');
      if (!token) {
        console.log('No access token found, cannot send message');
        return;
      }

      if (!roomId) {
        console.error('Room ID is required for HTTP message sending');
        return;
      }

      const response = await fetch(`${API_CONFIG.CHAT_BASE_URL}chat/rooms/${roomId}/messages/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json();
        // Emit the sent message immediately
        this.messageCallbacks.forEach(callback => callback(sentMessage));
      } else {
        console.error('Failed to send message:', response.status);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  sendTyping(typing: boolean) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const data = {
        type: 'typing',
        typing: typing
      };
      this.ws.send(JSON.stringify(data));
    }
  }

  sendReadReceipt(messageId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const data = {
        type: 'read',
        message_id: messageId
      };
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(callback: (message: ChatMessage) => void) {
    this.messageCallbacks.push(callback);
  }

  onTyping(callback: (event: TypingEvent) => void) {
    this.typingCallbacks.push(callback);
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.push(callback);
  }

  removeMessageCallback(callback: (message: ChatMessage) => void) {
    const index = this.messageCallbacks.indexOf(callback);
    if (index > -1) {
      this.messageCallbacks.splice(index, 1);
    }
  }

  removeTypingCallback(callback: (event: TypingEvent) => void) {
    const index = this.typingCallbacks.indexOf(callback);
    if (index > -1) {
      this.typingCallbacks.splice(index, 1);
    }
  }

  removeConnectionCallback(callback: (connected: boolean) => void) {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }
}

export const websocketManager = new WebSocketManager();