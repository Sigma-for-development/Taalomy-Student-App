import { Platform, Alert, AppState, AppStateStatus } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import * as Device from 'expo-device';

export interface ScreenProtectionConfig {
  enableScreenshotPrevention: boolean;
  enableScreenRecordingDetection: boolean;
  enableAppStateMonitoring: boolean;
  enableRootDetection: boolean;
  warningMessage?: string;
  onSecurityViolation?: (violationType: string) => void;
}

export class VideoSecurityManager {
  private static instance: VideoSecurityManager;
  private config: ScreenProtectionConfig;
  private appStateSubscription: any;
  private screenCaptureSubscription: any;
  private isActive: boolean = false;
  private securityViolationCount: number = 0;

  private constructor() {
    this.config = {
      enableScreenshotPrevention: true,
      enableScreenRecordingDetection: true,
      enableAppStateMonitoring: true,
      enableRootDetection: true,
      warningMessage: 'This content is protected and cannot be captured or recorded.',
    };
  }

  public static getInstance(): VideoSecurityManager {
    if (!VideoSecurityManager.instance) {
      VideoSecurityManager.instance = new VideoSecurityManager();
    }
    return VideoSecurityManager.instance;
  }

  public configure(config: Partial<ScreenProtectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public async enableProtection(): Promise<boolean> {
    try {
      this.isActive = true;
      
      // Enable screenshot prevention
      if (this.config.enableScreenshotPrevention) {
        await this.enableScreenshotPrevention();
      }

      // Enable screen recording detection
      if (this.config.enableScreenRecordingDetection) {
        await this.enableScreenRecordingDetection();
      }

      // Enable app state monitoring
      if (this.config.enableAppStateMonitoring) {
        this.enableAppStateMonitoring();
      }

      // Check for rooted/jailbroken devices
      if (this.config.enableRootDetection) {
        await this.checkDeviceSecurity();
      }

      return true;
    } catch (error) {
      console.error('Failed to enable video protection:', error);
      return false;
    }
  }

  public async disableProtection(): Promise<void> {
    try {
      this.isActive = false;
      
      // Disable screenshot prevention
      await ScreenCapture.allowScreenCaptureAsync();
      
      // Remove listeners
      if (this.screenCaptureSubscription) {
        this.screenCaptureSubscription.remove();
        this.screenCaptureSubscription = null;
      }

      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }

    } catch (error) {
      console.error('Failed to disable video protection:', error);
    }
  }

  private async enableScreenshotPrevention(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Prevent screenshots
        await ScreenCapture.preventScreenCaptureAsync();
        
        // Listen for screenshot attempts
        this.screenCaptureSubscription = ScreenCapture.addScreenshotListener(() => {
          this.handleSecurityViolation('screenshot_attempt');
        });
      } else if (Platform.OS === 'android') {
        // Android: Prevent screenshots and screen recording
        await ScreenCapture.preventScreenCaptureAsync();
        
        // Note: Android screenshot detection is limited due to platform restrictions
        // We'll rely on the FLAG_SECURE flag which should prevent most screenshot attempts
      }
    } catch (error) {
      console.warn('Screenshot prevention not available:', error);
    }
  }

  private async enableScreenRecordingDetection(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // iOS specific screen recording detection
        const checkRecording = async () => {
          try {
            // Note: This is a simplified check. In production, you might want to use
            // native modules to detect screen recording more reliably
            const isRecording = await this.isScreenBeingRecorded();
            if (isRecording) {
              this.handleSecurityViolation('screen_recording_detected');
            }
          } catch (error) {
            console.warn('Screen recording detection error:', error);
          }
        };

        // Check every 2 seconds
        setInterval(checkRecording, 2000);
      }
    } catch (error) {
      console.warn('Screen recording detection not available:', error);
    }
  }

  private enableAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background - potential security risk
        this.handleSecurityViolation('app_backgrounded');
      }
    });
  }

  private async checkDeviceSecurity(): Promise<void> {
    try {
      // Check if device is rooted/jailbroken
      const isDeviceSecure = await this.isDeviceSecure();
      if (!isDeviceSecure) {
        this.handleSecurityViolation('compromised_device');
      }
    } catch (error) {
      console.warn('Device security check failed:', error);
    }
  }

  private async isScreenBeingRecorded(): Promise<boolean> {
    // This is a placeholder. In a real implementation, you would use
    // native modules to detect screen recording on iOS
    return false;
  }

  private async isDeviceSecure(): Promise<boolean> {
    try {
      // Check for common signs of rooted/jailbroken devices
      if (Platform.OS === 'ios') {
        // iOS jailbreak detection would require native implementation
        return true; // Placeholder
      } else if (Platform.OS === 'android') {
        // Android root detection would require native implementation
        return true; // Placeholder
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  private handleSecurityViolation(violationType: string): void {
    this.securityViolationCount++;
    
    console.warn(`Security violation detected: ${violationType}`);
    
    // Call custom handler if provided
    if (this.config.onSecurityViolation) {
      this.config.onSecurityViolation(violationType);
    }

    // Show warning to user
    this.showSecurityWarning(violationType);

    // Take action based on violation type
    switch (violationType) {
      case 'screenshot_attempt':
        this.handleScreenshotAttempt();
        break;
      case 'screen_recording_detected':
        this.handleScreenRecordingDetected();
        break;
      case 'app_backgrounded':
        this.handleAppBackgrounded();
        break;
      case 'compromised_device':
        this.handleCompromisedDevice();
        break;
    }
  }

  private showSecurityWarning(violationType: string): void {
    let message = this.config.warningMessage || 'Security violation detected.';
    
    switch (violationType) {
      case 'screenshot_attempt':
        message = 'Screenshots are not allowed for this protected content.';
        break;
      case 'screen_recording_detected':
        message = 'Screen recording detected. Video playback will be paused.';
        break;
      case 'app_backgrounded':
        message = 'Video paused for security reasons.';
        break;
      case 'compromised_device':
        message = 'This device appears to be compromised. Secure content may not be available.';
        break;
    }

    Alert.alert('Security Warning', message, [{ text: 'OK' }]);
  }

  private handleScreenshotAttempt(): void {
    // Additional actions for screenshot attempts
    // Could include logging, reporting to server, etc.
  }

  private handleScreenRecordingDetected(): void {
    // Additional actions for screen recording detection
    // Could include pausing video, reporting to server, etc.
  }

  private handleAppBackgrounded(): void {
    // Additional actions when app is backgrounded
    // Could include pausing video, clearing sensitive data, etc.
  }

  private handleCompromisedDevice(): void {
    // Additional actions for compromised devices
    // Could include refusing to play content, reporting to server, etc.
  }

  public getSecurityStatus(): {
    isActive: boolean;
    violationCount: number;
    lastViolation?: string;
  } {
    return {
      isActive: this.isActive,
      violationCount: this.securityViolationCount,
    };
  }

  public resetViolationCount(): void {
    this.securityViolationCount = 0;
  }
}

// Export singleton instance
export const videoSecurityManager = VideoSecurityManager.getInstance();

// Utility functions for easier usage
export const enableVideoProtection = async (config?: Partial<ScreenProtectionConfig>): Promise<boolean> => {
  if (config) {
    videoSecurityManager.configure(config);
  }
  return await videoSecurityManager.enableProtection();
};

export const disableVideoProtection = async (): Promise<void> => {
  await videoSecurityManager.disableProtection();
};

export const getVideoSecurityStatus = () => {
  return videoSecurityManager.getSecurityStatus();
};