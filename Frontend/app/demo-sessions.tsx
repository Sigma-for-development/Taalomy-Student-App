import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import api from '../src/config/api';
import { API_CONFIG } from '../src/config/api';
import { formatDate } from '../src/utils/date';

interface DemoIntake {
    id: number;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: string;
    is_demo: boolean;
    price: string; // DecimalField comes as string usually
    created_by: {
        id: number;
        username: string;
        first_name: string;
        last_name: string;
    };
}

const DemoSessionsScreen = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'available' | 'purchased'>('available');
    const [intakes, setIntakes] = useState<DemoIntake[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // TODO: Add logic to filter 'purchased' vs 'available' if the backend doesn't separate them yet.
    // The current backend endpoint `DEMO_INTAKES` returns all active demo intakes. 
    // We might need to check enrollment status client-side or update backend later.
    // For now, list all demo intakes.

    const fetchIntakes = async (showSuccessToast = false) => {
        try {
            const response = await api.get(API_CONFIG.ENDPOINTS.DEMO_INTAKES);
            setIntakes(response.data);
            if (showSuccessToast) {
                Toast.show({
                    type: 'success',
                    text1: t('success'),
                    text2: t('demo_sessions_refreshed') || 'Demo sessions refreshed',
                });
            }
        } catch (error) {
            console.error('Error fetching demo sessions:', error);
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_to_load_demo_sessions') || 'Failed to load demo sessions',
            });
            // Navigate back on initial load error
            if (!showSuccessToast) {
                setTimeout(() => {
                    router.back();
                }, 2000);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchIntakes();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchIntakes(true);
    };

    const renderIntakeItem = ({ item }: { item: DemoIntake }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerInfo}>
                    <Text style={styles.courseName}>{item.name}</Text>
                    <Text style={styles.lecturerName}>
                        by {item.created_by?.first_name} {item.created_by?.last_name}
                    </Text>
                </View>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceText}>
                        {parseFloat(item.price) > 0 ? `$${item.price}` : 'Free'}
                    </Text>
                </View>
            </View>

            <Text style={styles.description} numberOfLines={2}>
                {item.description}
            </Text>

            <View style={styles.cardFooter}>
                <View style={styles.dateInfo}>
                    <Ionicons name="calendar-outline" size={14} color="#95a5a6" />
                    <Text style={styles.dateText}>Starts {formatDate(item.start_date)}</Text>
                </View>

                <TouchableOpacity
                    style={styles.detailButton}
                    onPress={() => router.push(`/student-intake-details/${item.id}`)}
                >
                    <Text style={styles.detailButtonText}>View Details</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={styles.background}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Demo Sessions</Text>
                <View style={{ width: 40 }} />
            </View>

            <Text style={styles.subtitle}>Try a session before committing to the full course.</Text>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                </View>
            ) : (
                <FlatList
                    data={intakes}
                    renderItem={renderIntakeItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="flask-outline" size={64} color="#555" />
                            <Text style={styles.emptyText}>No demo sessions available.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 10,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 14,
        color: '#95a5a6',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    headerInfo: {
        flex: 1,
        marginEnd: 10,
    },
    courseName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    lecturerName: {
        color: '#3498db',
        fontSize: 14,
    },
    priceContainer: {
        backgroundColor: 'rgba(46, 204, 113, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(46, 204, 113, 0.3)',
    },
    priceText: {
        color: '#2ecc71',
        fontWeight: 'bold',
        fontSize: 14,
    },
    description: {
        color: '#bdc3c7',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 12,
    },
    dateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        color: '#95a5a6',
        fontSize: 12,
        marginStart: 6,
    },
    detailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3498db',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    detailButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginEnd: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: '#777',
        marginTop: 16,
        fontSize: 16,
    },
});

export default DemoSessionsScreen;
