import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ScreenCapture from 'expo-screen-capture';
import * as Device from 'expo-device';

const { width: screenWidth } = Dimensions.get('window');

interface ProtectedVideoPlayerProps {
  videoUri: string;
  title?: string;
  onPlaybackStatusUpdate?: (status: any) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  showControls?: boolean;
  autoPlay?: boolean;
  poster?: string;
  enableScreenProtection?: boolean;
}

export default function ProtectedVideoPlayer({
  videoUri,
  title,
  onPlaybackStatusUpdate,
  onProgress,
  showControls = true,
  autoPlay = false,
  poster,
  enableScreenProtection = true,
}: ProtectedVideoPlayerProps) {
  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.muted = false;
    if (autoPlay) {
      player.play();
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenCaptureEnabled, setIsScreenCaptureEnabled] = useState(false);
  const [protectionActive, setProtectionActive] = useState(false);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Screen protection effects
  useEffect(() => {
    if (enableScreenProtection) {
      initializeScreenProtection();
    }

    return () => {
      if (enableScreenProtection) {
        cleanupScreenProtection();
      }
    };
  }, [enableScreenProtection]);

  // Monitor screen recording status
  useEffect(() => {
    if (enableScreenProtection) {
      const checkScreenCapture = async () => {
        try {
          const captureEnabled = await ScreenCapture.isAvailableAsync();
          setIsScreenCaptureEnabled(captureEnabled);
          
          if (captureEnabled) {
            await ScreenCapture.preventScreenCaptureAsync();
            setProtectionActive(true);
          }
        } catch (error) {
          console.warn('Screen capture protection error:', error);
        }
      };

      checkScreenCapture();
      const interval = setInterval(checkScreenCapture, 1000);

      return () => clearInterval(interval);
    }
  }, [enableScreenProtection]);

  const initializeScreenProtection = async () => {
    try {
      // Enable screen capture prevention
      await ScreenCapture.preventScreenCaptureAsync();
      setProtectionActive(true);
      
      // Listen for screen capture events
      const subscription = ScreenCapture.addScreenshotListener(() => {
        Alert.alert(
          'Screenshot Detected',
          'Screenshots are not allowed while viewing protected content.',
          [{ text: 'OK' }]
        );
      });

      return subscription;
    } catch (error) {
      console.warn('Failed to initialize screen protection:', error);
    }
  };

  const cleanupScreenProtection = async () => {
    try {
      await ScreenCapture.allowScreenCaptureAsync();
      setProtectionActive(false);
    } catch (error) {
      console.warn('Failed to cleanup screen protection:', error);
    }
  };

  useEffect(() => {
    let progressInterval: ReturnType<typeof setInterval>;
    
    if (player.playing && onProgress) {
      progressInterval = setInterval(() => {
        const current = player.currentTime;
        const total = player.duration;
        if (current && total) {
          onProgress(current, total);
          setCurrentTime(current);
          setDuration(total);
        }
      }, 1000);
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [player.playing, onProgress]);

  // Auto-hide controls when video is playing
  useEffect(() => {
    if (player.playing && showControls) {
      startHideControlsTimer();
    } else {
      clearHideControlsTimer();
      if (showControls) {
        showControlsWithAnimation();
      }
    }
  }, [player.playing, showControls]);

  // Update progress bar in real-time when playing
  useEffect(() => {
    let realtimeInterval: ReturnType<typeof setInterval>;
    
    if (player.playing) {
      realtimeInterval = setInterval(() => {
        const current = player.currentTime;
        const total = player.duration;
        if (current && total) {
          setCurrentTime(current);
          setDuration(total);
        }
      }, 100); // Update every 100ms for smooth timeline
    }

    return () => {
      if (realtimeInterval) {
        clearInterval(realtimeInterval);
      }
    };
  }, [player.playing]);

  useEffect(() => {
    const subscription = player.addListener('statusChange', (statusData) => {
      setIsLoading(statusData.status === 'loading');
      if (onPlaybackStatusUpdate) {
        onPlaybackStatusUpdate({ 
          isLoaded: statusData.status === 'readyToPlay' || statusData.status === 'idle',
          isPlaying: player.playing,
          positionMillis: player.currentTime * 1000,
          durationMillis: player.duration * 1000
        });
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [player, onPlaybackStatusUpdate]);

  const handlePlayPause = () => {
    try {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error('Error controlling playback:', error);
      Alert.alert('Error', 'Failed to control video playback');
    }
  };

  const handleSeek = (value: number) => {
    try {
      player.currentTime = value;
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handleFullscreen = () => {
    try {
      if (isFullscreen) {
        setIsFullscreen(false);
      } else {
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startHideControlsTimer = () => {
    clearHideControlsTimer();
    hideControlsTimer.current = setTimeout(() => {
      hideControlsWithAnimation();
    }, 3000);
  };

  const clearHideControlsTimer = () => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  };

  const showControlsWithAnimation = () => {
    setControlsVisible(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideControlsWithAnimation = () => {
    Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setControlsVisible(false);
    });
  };

  const toggleControlsVisibility = () => {
    if (controlsVisible) {
      hideControlsWithAnimation();
    } else {
      showControlsWithAnimation();
      if (player.playing) {
        startHideControlsTimer();
      }
    }
  };

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {enableScreenProtection && protectionActive && (
            <View style={styles.protectionIndicator}>
              <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
              <Text style={styles.protectionText}>Protected</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.videoContainer}>
        <TouchableOpacity
          style={styles.videoWrapper}
          onPress={toggleControlsVisibility}
          activeOpacity={1}
        >
          <VideoView
            style={styles.video}
            player={player}
            fullscreenOptions={{ enable: false }} // Disable fullscreen for protected content
            allowsPictureInPicture={!enableScreenProtection} // Disable PiP for protected content
            nativeControls={false}
          />

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.loadingText}>Loading protected video...</Text>
            </View>
          )}

          {/* Protection Warning Overlay */}
          {enableScreenProtection && !protectionActive && (
            <View style={styles.protectionWarningOverlay}>
              <Ionicons name="shield-outline" size={48} color="#ff6b6b" />
              <Text style={styles.protectionWarningText}>
                Screen protection unavailable
              </Text>
              <Text style={styles.protectionWarningSubtext}>
                Video may not be secure
              </Text>
            </View>
          )}

          {/* Controls Overlay - Animated and interactive */}
          {showControls && controlsVisible && (
            <Animated.View 
              style={[
                styles.controlsOverlay,
                { opacity: controlsOpacity }
              ]}
              pointerEvents={controlsVisible ? 'auto' : 'none'}
            >
              <View style={styles.topControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleFullscreen}
                >
                  <Ionicons 
                    name={isFullscreen ? "contract" : "expand"} 
                    size={24} 
                    color="white" 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.bottomControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handlePlayPause}
                >
                  <Ionicons 
                    name={player.playing ? "pause" : "play"} 
                    size={32} 
                    color="white" 
                  />
                </TouchableOpacity>

                <View style={styles.progressContainer}>
                  <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                  <Slider
                    style={styles.progressSlider}
                    minimumValue={0}
                    maximumValue={duration}
                    value={currentTime}
                    onValueChange={handleSeek}
                    minimumTrackTintColor="white"
                    maximumTrackTintColor="rgba(255,255,255,0.5)"
                    thumbTintColor="white"
                  />
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
              </View>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  titleContainer: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  protectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  protectionText: {
    color: '#4CAF50',
    fontSize: 12,
    marginStart: 4,
    fontWeight: '500',
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
  },
  protectionWarningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  protectionWarningText: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  protectionWarningSubtext: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  controlButton: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressSlider: {
    flex: 1,
    height: 40,
  },
  timeText: {
    color: 'white',
    fontSize: 14,
    minWidth: 40,
    textAlign: 'center',
  },
});