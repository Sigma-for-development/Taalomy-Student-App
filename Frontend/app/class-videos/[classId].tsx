import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { studentVideoApi, VideoCategory, StudentVideo } from '../../src/utils/studentVideoApi';

export default function ClassVideoLibraryScreen() {
  const { classId } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videos, setVideos] = useState<StudentVideo[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadVideos(),
        loadCategories(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    try {
      const params: any = {};
      if (selectedCategory) params.category = Number(selectedCategory);
      if (searchQuery.trim()) params.search = searchQuery.trim();
      
      const data = await studentVideoApi.getVideos(Number(classId), params);
      setVideos(data);
    } catch (error) {
      console.error('Error loading videos:', error);
      throw error;
    }
  };

  const loadCategories = async () => {
    try {
      const data = await studentVideoApi.getCategories(Number(classId));
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadVideos();
  };

  const handleFilterChange = () => {
    loadVideos();
  };

  const handleVideoPress = (video: StudentVideo) => {
    router.push({
      pathname: '/video-player/[videoId]',
      params: { 
        videoId: video.id, 
        classId,
        videoTitle: video.title,
        videoUrl: video.video_url,
      },
    });
  };

  const formatFileSize = (sizeMB: number) => {
    if (sizeMB < 1) return `${(sizeMB * 1024).toFixed(0)} KB`;
    if (sizeMB < 1024) return `${sizeMB.toFixed(1)} MB`;
    return `${(sizeMB / 1024).toFixed(1)} GB`;
  };

  const formatDuration = (duration: string | undefined) => {
    if (!duration) return null;
    // Assuming duration is in format "HH:MM:SS" or similar
    return duration;
  };

  const renderVideoItem = ({ item }: { item: StudentVideo }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => handleVideoPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.videoHeader}>
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.videoCategory}>{item.category_name}</Text>
          <Text style={styles.videoUploader}>By {item.uploaded_by_name}</Text>
          
          <View style={styles.videoMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="eye" size={14} color="#666" />
              <Text style={styles.metaText}>{item.view_count} views</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="folder" size={14} color="#666" />
              <Text style={styles.metaText}>{formatFileSize(item.file_size_mb)}</Text>
            </View>
            {item.duration && (
              <View style={styles.metaItem}>
                <Ionicons name="time" size={14} color="#666" />
                <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.thumbnailContainer}>
          {item.thumbnail_url ? (
            <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="videocam" size={32} color="#ccc" />
            </View>
          )}
          
          {item.has_viewed && (
            <View style={styles.watchedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            </View>
          )}
          
          <View style={styles.playButton}>
            <Ionicons name="play" size={20} color="white" />
          </View>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.videoDescription} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Class Videos</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setSearchVisible(!searchVisible)}
        >
          <Ionicons name="search" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search videos..."
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  loadVideos();
                }}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchActionButton} onPress={handleSearch}>
            <Text style={styles.searchActionText}>Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category Filter */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={(value) => {
                setSelectedCategory(value);
                setTimeout(handleFilterChange, 100);
              }}
              style={styles.picker}
            >
              <Picker.Item label="All Categories" value="" />
              {categories.map((category) => (
                <Picker.Item
                  key={category.id}
                  label={`${category.name} (${category.videos_count})`}
                  value={category.id.toString()}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Videos List */}
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No videos available</Text>
            <Text style={styles.emptySubtext}>
              {selectedCategory || searchQuery 
                ? 'Try adjusting your search or filters' 
                : 'No videos have been uploaded to this class yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchActionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchActionText: {
    color: 'white',
    fontWeight: '600',
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginEnd: 12,
  },
  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 40,
  },
  listContainer: {
    padding: 16,
  },
  videoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  videoInfo: {
    flex: 1,
    marginEnd: 12,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  videoCategory: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  videoUploader: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  videoMeta: {
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 100,
    height: 75,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  thumbnailPlaceholder: {
    width: 100,
    height: 75,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  playButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});