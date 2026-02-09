import { socketIOManager as socketManager } from './socketio';

export interface InvitationData {
  id: number;
  email: string;
  invited_at: string;
  is_accepted: boolean;
  intake_name?: string;
  class_name?: string;
  group_name?: string;
  invited_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
}

export interface InvitationEvent {
  invitation_type: 'intake' | 'class' | 'group';
  invitation_data: InvitationData;
}

class InvitationSocketManager {
  private invitationCallbacks: ((event: InvitationEvent) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];
  private isConnected: boolean = false;

  connect() {
    try {
      // Join the invitations room when Socket.IO connects
      socketManager.on('connect', () => {
        console.log('Socket.IO connected, joining invitations room');
        socketManager.joinInvitations();
        this.isConnected = true;
        this.connectionCallbacks.forEach(callback => callback(true));
      });
      
      // Handle disconnection
      socketManager.on('disconnect', () => {
        console.log('Socket.IO disconnected from invitations');
        this.isConnected = false;
        this.connectionCallbacks.forEach(callback => callback(false));
      });
      
      // Handle invitation notifications
      socketManager.on('invitation_notification', (data: any) => {
        console.log('Received invitation notification:', data);
        const invitationEvent: InvitationEvent = {
          invitation_type: data.invitation_type,
          invitation_data: data.invitation_data
        };
        this.invitationCallbacks.forEach(callback => callback(invitationEvent));
      });
      
      // If already connected, join immediately
      if (socketManager['socket']?.connected) {
        socketManager.joinInvitations();
        this.isConnected = true;
        this.connectionCallbacks.forEach(callback => callback(true));
      }
      
      console.log('Invitation Socket.IO manager initialized');
    } catch (error) {
      console.error('Error initializing invitation Socket.IO manager:', error);
    }
  }

  disconnect() {
    try {
      // Leave the invitations room
      socketManager.leaveInvitations();
      
      // Remove event listeners
      socketManager.off('invitation_notification');
      socketManager.off('connect');
      socketManager.off('disconnect');
      
      this.isConnected = false;
      console.log('Invitation Socket.IO manager disconnected');
    } catch (error) {
      console.error('Error disconnecting invitation Socket.IO manager:', error);
    }
  }

  onInvitation(callback: (event: InvitationEvent) => void) {
    this.invitationCallbacks.push(callback);
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.push(callback);
  }

  removeInvitationCallback(callback: (event: InvitationEvent) => void) {
    const index = this.invitationCallbacks.indexOf(callback);
    if (index > -1) {
      this.invitationCallbacks.splice(index, 1);
    }
  }

  removeConnectionCallback(callback: (connected: boolean) => void) {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }
  
  isConnectedStatus(): boolean {
    return this.isConnected;
  }
}

export const invitationSocketManager = new InvitationSocketManager();