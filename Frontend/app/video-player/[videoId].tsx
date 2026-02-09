import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { studentVideoApi, StudentVideo } from '../../src/utils/studentVideoApi';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function VideoPlayerScreen() {
  const { videoId, classId, intakeId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<StudentVideo | null>(null);

  // Use refs for tracking time to access latest values in cleanup
  const totalWatchTimeRef = useRef<number>(0);
  const watchStartTimeRef = useRef<number>(0);
  const videoDurationRef = useRef<number>(0);
  const hasRecordedViewRef = useRef<boolean>(false);

  // Initialize player (empty source initially, updated when video loads)
  const player = useVideoPlayer(video?.video_url || '', (player) => {
    player.loop = false;
    if (video?.video_url) {
      player.play();
    }
  });

  useEffect(() => {
    loadVideoDetails();
    watchStartTimeRef.current = Date.now();

    // Enable auto-rotation
    const unlockOrientation = async () => {
      await ScreenOrientation.unlockAsync();
    };
    unlockOrientation();

    // Cleanup function to record watch time and reset orientation
    return () => {
      recordFinalWatchTime();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // Track playback time
  useEffect(() => {
    const interval = setInterval(() => {
      if (player.playing) {
        totalWatchTimeRef.current += 1000;
        // console.log('Watch time:', totalWatchTimeRef.current);
      }
      // Update duration ref if available
      if (player.duration > 0) {
        videoDurationRef.current = player.duration;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player]);

  const loadVideoDetails = async () => {
    try {
      setLoading(true);
      let videoData;

      if (intakeId) {
        videoData = await studentVideoApi.getIntakeVideoDetails(
          Number(intakeId),
          Number(videoId)
        );
      } else {
        videoData = await studentVideoApi.getVideoDetails(
          Number(classId),
          Number(videoId)
        );
      }

      setVideo(videoData);
    } catch (error) {
      console.error('Error loading video details:', error);
      Alert.alert(
        'Error',
        'Failed to load video details',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const recordFinalWatchTime = async () => {
    const totalTime = totalWatchTimeRef.current;

    if (!hasRecordedViewRef.current && totalTime > 0) {
      const watchDurationSeconds = Math.floor(totalTime / 1000);
      const duration = videoDurationRef.current;
      const completionPercentage = duration > 0 ? (watchDurationSeconds / duration) : 0;
      const isCompleted = completionPercentage >= 0.8; // Consider 80% as completed

      try {
        const viewData = {
          watch_duration: `${Math.floor(watchDurationSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((watchDurationSeconds % 3600) / 60).toString().padStart(2, '0')}:${(watchDurationSeconds % 60).toString().padStart(2, '0')}`,
          completed: isCompleted,
        };

        // Note: We use existing params from scope (intakeId, videoId, etc)
        // Since this runs in cleanup, we rely on them being available in closure or refs if they changed (they shouldn't change for this screen instance)

        if (intakeId) {
          await studentVideoApi.recordIntakeView(Number(intakeId), Number(videoId), viewData);
        } else {
          await studentVideoApi.recordView(Number(classId), Number(videoId), viewData);
        }

        hasRecordedViewRef.current = true;
      } catch (error) {
        console.error('Error recording video view:', error);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading video...</Text>
      </SafeAreaView>
    );
  }

  if (!video || !video.video_url) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.errorText}>Video not available</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: video?.title || "Video Player",
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#ecf0f1',
        }}
      />
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Video Player Section */}
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.video}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls
        />
      </View>

      <ScrollView style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{video.title}</Text>

        <View style={styles.metaContainer}>
          <Text style={styles.metaText}>
            By {video.uploaded_by_name} • {video.category_name}
          </Text>
          <Text style={styles.metaText}>
            {video.view_count} views • {video.file_size_mb.toFixed(1)} MB
          </Text>
        </View>

        {video.description ? (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text style={styles.description}>{video.description}</Text>
          </View>
        ) : null}

        {video.has_viewed && (
          <View style={styles.watchedContainer}>
            <Text style={styles.watchedText}>✓ Previously watched</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'black',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  videoInfo: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Dark background to match app theme
    padding: 20,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ecf0f1', // Light text
    marginBottom: 12,
    lineHeight: 28,
  },
  metaContainer: {
    marginBottom: 16,
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#bdc3c7', // Gray text
  },
  descriptionContainer: {
    marginTop: 16,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1', // Light text
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#bdc3c7', // Gray text
    lineHeight: 22,
  },
  watchedContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(46, 125, 50, 0.2)', // Dark green transparent
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  watchedText: {
    fontSize: 14,
    color: '#81c784', // Ligher green text
    fontWeight: '500',
  },
});