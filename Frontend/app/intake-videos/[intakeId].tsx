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
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { studentVideoApi, VideoCategory, StudentVideo } from '../../src/utils/studentVideoApi';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IntakeVideoLibraryScreen() {
    const { intakeId } = useLocalSearchParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [videos, setVideos] = useState<StudentVideo[]>([]);
    const [categories, setCategories] = useState<VideoCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchVisible, setSearchVisible] = useState(false);

    // Validate that intakeId exists
    const validIntakeId = Array.isArray(intakeId) ? intakeId[0] : intakeId;

    useFocusEffect(
        useCallback(() => {
            if (validIntakeId) {
                loadData();
            }
        }, [validIntakeId])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadVideos(),
                loadCategories(),
            ]);
        } catch (error: any) {
            console.error('Error loading data:', error);
            Alert.alert('Error', `Failed to load videos: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const loadVideos = async () => {
        try {
            if (!validIntakeId) return;
            const params: any = {};
            if (selectedCategory) params.category = Number(selectedCategory);
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const data = await studentVideoApi.getIntakeVideos(Number(validIntakeId), params);
            setVideos(data);
        } catch (error) {
            console.error('Error loading videos:', error);
            throw error;
        }
    };

    const loadCategories = async () => {
        try {
            if (!validIntakeId) return;
            const data = await studentVideoApi.getIntakeCategories(Number(validIntakeId));
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
                intakeId: validIntakeId,
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
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: "Intake Videos",
                    headerStyle: { backgroundColor: '#1a1a1a' },
                    headerTintColor: '#ecf0f1',
                    headerRight: () => (
                        <TouchableOpacity onPress={() => setSearchVisible(!searchVisible)} style={{ padding: 8 }}>
                            <Ionicons name="search" size={24} color="#3498db" />
                        </TouchableOpacity>
                    ),
                }}
            />
            <View style={styles.container}>
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
                                placeholderTextColor="#95a5a6"
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
                                dropdownIconColor="#ecf0f1"
                            >
                                <Picker.Item label="All Categories" value="" style={{ color: '#000' }} />
                                {categories.map((category) => (
                                    <Picker.Item
                                        key={category.id}
                                        label={`${category.name} (${category.videos_count})`}
                                        value={category.id.toString()}
                                        style={{ color: '#000' }}
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
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ecf0f1" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="videocam-off" size={64} color="#555" />
                            <Text style={styles.emptyText}>No videos available</Text>
                            <Text style={styles.emptySubtext}>
                                {selectedCategory || searchQuery
                                    ? 'Try adjusting your search or filters'
                                    : 'No videos have been uploaded to this intake yet'}
                            </Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#ecf0f1',
    },
    searchButton: {
        padding: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#1a1a1a',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        gap: 12,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#ecf0f1',
    },
    searchActionButton: {
        backgroundColor: '#3498db',
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
        backgroundColor: '#1a1a1a',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    filterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterLabel: {
        fontSize: 14,
        color: '#bdc3c7',
        marginEnd: 12,
    },
    pickerWrapper: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        color: '#ecf0f1',
        backgroundColor: 'transparent',
    },
    listContainer: {
        padding: 16,
    },
    videoCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 4,
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
        color: '#ecf0f1',
        marginBottom: 4,
    },
    videoCategory: {
        fontSize: 14,
        color: '#3498db',
        marginBottom: 2,
    },
    videoUploader: {
        fontSize: 13,
        color: '#95a5a6',
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
        color: '#bdc3c7',
    },
    thumbnailContainer: {
        position: 'relative',
    },
    thumbnail: {
        width: 100,
        height: 75,
        borderRadius: 8,
        backgroundColor: '#2d2d2d',
    },
    thumbnailPlaceholder: {
        width: 100,
        height: 75,
        borderRadius: 8,
        backgroundColor: '#2d2d2d',
        justifyContent: 'center',
        alignItems: 'center',
    },
    watchedBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
    },
    playButton: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(52, 152, 219, 0.9)',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoDescription: {
        fontSize: 14,
        color: '#bdc3c7',
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
        color: '#ecf0f1',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#95a5a6',
        marginTop: 8,
        textAlign: 'center',
    },
});
