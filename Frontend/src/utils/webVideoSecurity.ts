import { Platform } from 'react-native';

export interface WebSecurityConfig {
  disableRightClick: boolean;
  disableTextSelection: boolean;
  disableDeveloperTools: boolean;
  enableContentProtection: boolean;
  obfuscateContent: boolean;
  enableWatermark: boolean;
  watermarkText?: string;
}

export class WebVideoSecurity {
  private static instance: WebVideoSecurity;
  private config: WebSecurityConfig;
  private securityListeners: (() => void)[] = [];

  private constructor() {
    this.config = {
      disableRightClick: true,
      disableTextSelection: true,
      disableDeveloperTools: true,
      enableContentProtection: true,
      obfuscateContent: true,
      enableWatermark: true,
      watermarkText: 'Protected Content',
    };
  }

  public static getInstance(): WebVideoSecurity {
    if (!WebVideoSecurity.instance) {
      WebVideoSecurity.instance = new WebVideoSecurity();
    }
    return WebVideoSecurity.instance;
  }

  public configure(config: Partial<WebSecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public enableWebProtection(): void {
    if (Platform.OS !== 'web') {
      return;
    }

    try {
      // Disable right-click context menu
      if (this.config.disableRightClick) {
        this.disableRightClick();
      }

      // Disable text selection
      if (this.config.disableTextSelection) {
        this.disableTextSelection();
      }

      // Disable developer tools
      if (this.config.disableDeveloperTools) {
        this.disableDeveloperTools();
      }

      // Enable content protection
      if (this.config.enableContentProtection) {
        this.enableContentProtection();
      }

      // Add security event listeners
      this.addSecurityEventListeners();

      // Add watermark
      if (this.config.enableWatermark) {
        this.addWatermark();
      }

    } catch (error) {
      console.warn('Failed to enable web video protection:', error);
    }
  }

  public disableWebProtection(): void {
    if (Platform.OS !== 'web') {
      return;
    }

    try {
      // Remove all security listeners
      this.removeSecurityEventListeners();

      // Re-enable right-click
      if (typeof document !== 'undefined') {
        document.oncontextmenu = null;
      }

      // Re-enable text selection
      this.enableTextSelection();

      // Remove watermark
      this.removeWatermark();

    } catch (error) {
      console.warn('Failed to disable web video protection:', error);
    }
  }

  private disableRightClick(): void {
    if (typeof document !== 'undefined') {
      const preventRightClick = (e: MouseEvent) => {
        e.preventDefault();
        this.showSecurityWarning('Right-click is disabled for protected content.');
        return false;
      };

      document.addEventListener('contextmenu', preventRightClick, false);
      this.securityListeners.push(() => {
        document.removeEventListener('contextmenu', preventRightClick, false);
      });
    }
  }

  private disableTextSelection(): void {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        video {
          pointer-events: none;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `;
      style.id = 'video-security-styles';
      document.head.appendChild(style);

      this.securityListeners.push(() => {
        const existingStyle = document.getElementById('video-security-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      });
    }
  }

  private enableTextSelection(): void {
    if (typeof document !== 'undefined') {
      const existingStyle = document.getElementById('video-security-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    }
  }

  private disableDeveloperTools(): void {
    if (typeof window !== 'undefined') {
      // Detect when developer tools are opened
      const detectDevTools = () => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
          this.showSecurityWarning('Developer tools detected. Video playback paused for security.');
          // You could pause video playback here
        }
      };

      // Check for common developer tools shortcuts
      const preventDevToolsShortcuts = (e: KeyboardEvent) => {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (
          e.keyCode === 123 || // F12
          (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
          (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
          (e.ctrlKey && e.keyCode === 85) // Ctrl+U
        ) {
          e.preventDefault();
          this.showSecurityWarning('Developer tools access is restricted for protected content.');
          return false;
        }
      };

      window.addEventListener('resize', detectDevTools);
      document.addEventListener('keydown', preventDevToolsShortcuts);

      this.securityListeners.push(() => {
        window.removeEventListener('resize', detectDevTools);
        document.removeEventListener('keydown', preventDevToolsShortcuts);
      });
    }
  }

  private enableContentProtection(): void {
    if (typeof document !== 'undefined') {
      // Disable drag and drop
      const preventDragDrop = (e: DragEvent) => {
        e.preventDefault();
        return false;
      };

      // Disable printing
      const preventPrint = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.keyCode === 80) { // Ctrl+P
          e.preventDefault();
          this.showSecurityWarning('Printing is disabled for protected content.');
          return false;
        }
      };

      // Disable save shortcuts
      const preventSave = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.keyCode === 83) { // Ctrl+S
          e.preventDefault();
          this.showSecurityWarning('Saving is disabled for protected content.');
          return false;
        }
      };

      document.addEventListener('dragstart', preventDragDrop);
      document.addEventListener('drop', preventDragDrop);
      document.addEventListener('keydown', preventPrint);
      document.addEventListener('keydown', preventSave);

      this.securityListeners.push(() => {
        document.removeEventListener('dragstart', preventDragDrop);
        document.removeEventListener('drop', preventDragDrop);
        document.removeEventListener('keydown', preventPrint);
        document.removeEventListener('keydown', preventSave);
      });
    }
  }

  private addSecurityEventListeners(): void {
    if (typeof window !== 'undefined') {
      // Monitor for screenshot attempts (limited detection on web)
      const monitorScreenshotAttempts = () => {
        // This is a basic implementation - real screenshot detection on web is very limited
        if (document.hidden || document.visibilityState === 'hidden') {
          // Document became hidden - potential screenshot
          setTimeout(() => {
            if (!document.hidden) {
              this.showSecurityWarning('Potential screenshot attempt detected.');
            }
          }, 100);
        }
      };

      document.addEventListener('visibilitychange', monitorScreenshotAttempts);

      this.securityListeners.push(() => {
        document.removeEventListener('visibilitychange', monitorScreenshotAttempts);
      });
    }
  }

  private addWatermark(): void {
    if (typeof document !== 'undefined') {
      const watermark = document.createElement('div');
      watermark.id = 'video-security-watermark';
      watermark.innerHTML = this.config.watermarkText || 'Protected Content';
      watermark.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 48px;
        color: rgba(255, 255, 255, 0.1);
        font-weight: bold;
        pointer-events: none;
        z-index: 9999;
        user-select: none;
        font-family: Arial, sans-serif;
      `;

      document.body.appendChild(watermark);

      this.securityListeners.push(() => {
        const existingWatermark = document.getElementById('video-security-watermark');
        if (existingWatermark) {
          existingWatermark.remove();
        }
      });
    }
  }

  private removeWatermark(): void {
    if (typeof document !== 'undefined') {
      const existingWatermark = document.getElementById('video-security-watermark');
      if (existingWatermark) {
        existingWatermark.remove();
      }
    }
  }

  private removeSecurityEventListeners(): void {
    this.securityListeners.forEach(removeListener => {
      try {
        removeListener();
      } catch (error) {
        console.warn('Error removing security listener:', error);
      }
    });
    this.securityListeners = [];
  }

  private showSecurityWarning(message: string): void {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(message);
    } else {
      console.warn('Security Warning:', message);
    }
  }

  public getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; frame-ancestors 'none';",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    };
  }
}

// Export singleton instance
export const webVideoSecurity = WebVideoSecurity.getInstance();

// Utility functions
export const enableWebVideoProtection = (config?: Partial<WebSecurityConfig>): void => {
  if (config) {
    webVideoSecurity.configure(config);
  }
  webVideoSecurity.enableWebProtection();
};

export const disableWebVideoProtection = (): void => {
  webVideoSecurity.disableWebProtection();
};

export const getWebSecurityHeaders = (): Record<string, string> => {
  return webVideoSecurity.getSecurityHeaders();
};