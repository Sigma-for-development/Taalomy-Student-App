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
import { enableVideoProtection, disableVideoProtection } from '../utils/videoSecurity';
import { enableWebVideoProtection, disableWebVideoProtection } from '../utils/webVideoSecurity';

const { width: screenWidth } = Dimensions.get('window');

interface VideoPlayerProps {
  videoUri: string;
  title?: string;
  onPlaybackStatusUpdate?: (status: any) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  showControls?: boolean;
  autoPlay?: boolean;
  poster?: string;
  enableProtection?: boolean;
  isProtectedContent?: boolean;
}

export default function VideoPlayer({
  videoUri,
  title,
  onPlaybackStatusUpdate,
  onProgress,
  showControls = true,
  autoPlay = false,
  poster,
  enableProtection = true,
  isProtectedContent = true,
}: VideoPlayerProps) {
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
  const [protectionEnabled, setProtectionEnabled] = useState(false);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize video protection
  useEffect(() => {
    if (enableProtection && isProtectedContent) {
      initializeVideoProtection();
    }

    return () => {
      if (enableProtection && isProtectedContent) {
        cleanupVideoProtection();
      }
    };
  }, [enableProtection, isProtectedContent]);

  const initializeVideoProtection = async () => {
    try {
      if (Platform.OS === 'web') {
        enableWebVideoProtection({
          watermarkText: title || 'Protected Video',
        });
      } else {
        const success = await enableVideoProtection({
          onSecurityViolation: (violationType) => {
            console.warn(`Security violation in video player: ${violationType}`);
            if (violationType === 'screenshot_attempt' || violationType === 'screen_recording_detected') {
              // Pause video on security violation
              if (player.playing) {
                player.pause();
              }
            }
          },
        });
        setProtectionEnabled(success);
      }
    } catch (error) {
      console.warn('Failed to initialize video protection:', error);
    }
  };

  const cleanupVideoProtection = async () => {
    try {
      if (Platform.OS === 'web') {
        disableWebVideoProtection();
      } else {
        await disableVideoProtection();
      }
      setProtectionEnabled(false);
    } catch (error) {
      console.warn('Failed to cleanup video protection:', error);
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
        // Exit fullscreen logic would go here
        setIsFullscreen(false);
      } else {
        // Enter fullscreen logic would go here
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

  // Interactive controls with animations

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
            fullscreenOptions={isProtectedContent ? { enable: false } : { enable: true }}
            allowsPictureInPicture={!isProtectedContent}
            nativeControls={false}
          />

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.loadingText}>
                {isProtectedContent ? 'Loading protected video...' : 'Loading video...'}
              </Text>
            </View>
          )}

          {/* Protection Status Indicator */}
          {isProtectedContent && (
            <View style={styles.protectionIndicator}>
              <Ionicons
                name={protectionEnabled ? "shield-checkmark" : "shield-outline"}
                size={16}
                color={protectionEnabled ? "#4CAF50" : "#ff6b6b"}
              />
              <Text style={[styles.protectionText, { color: protectionEnabled ? "#4CAF50" : "#ff6b6b" }]}>
                {protectionEnabled ? 'Protected' : 'Unprotected'}
              </Text>
            </View>
          )}

          {/* Removed simple play button overlay - only using full controls */}

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
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
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
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
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
  protectionIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  protectionText: {
    fontSize: 12,
    marginStart: 4,
    fontWeight: '500',
  },
});