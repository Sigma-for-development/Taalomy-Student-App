import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    RefreshControl,
    Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { API_CONFIG } from '../src/config/api';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const StudentAllIntakesScreen = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [intakes, setIntakes] = useState<any[]>([]);

    useEffect(() => {
        loadIntakes();
    }, []);

    const loadIntakes = async () => {
        try {
            const response = await api.get(API_CONFIG.ENDPOINTS.STUDENT_INTAKES);
            setIntakes(response.data);
            // Show success toast only on manual refresh
            if (refreshing) {
                Toast.show({
                    type: 'success',
                    text1: t('success'),
                    text2: t('data_refreshed'),
                });
            }
        } catch (error) {
            console.error('Error loading intakes:', error);
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_load_intakes'),
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleIntakePress = async (intakeId: number) => {
        // Update access time in background
        try {
            api.post(`${API_CONFIG.ENDPOINTS.STUDENT_INTAKE_ACCESS}${intakeId}/access/`);
        } catch (error) {
            console.error('Error updating access time:', error);
        }

        // Navigate immediately
        router.push(`/student-intake-details/${intakeId}`);
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadIntakes();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient
                    colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                    style={styles.backgroundGradient}
                />
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
                style={styles.backgroundGradient}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#ecf0f1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('all_intakes')}</Text>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />
                }
            >
                <View style={styles.intakesList}>
                    {intakes.length > 0 ? (
                        intakes.map((intake) => (
                            <TouchableOpacity
                                key={intake.id}
                                style={styles.intakeCard}
                                onPress={() => handleIntakePress(intake.id)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                                    <Ionicons name="school-outline" size={24} color="#3498db" />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={styles.intakeName}>{intake.name}</Text>
                                    <Text style={styles.intakeDescription} numberOfLines={2}>
                                        {intake.description}
                                    </Text>
                                    <View style={styles.metaInfo}>
                                        <Ionicons name="people-outline" size={14} color="#95a5a6" />
                                        <Text style={styles.metaText}>{t('all_intakes_enrolled', { count: intake.current_students })}</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#95a5a6" />
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="library-outline" size={48} color="#34495e" />
                            <Text style={styles.emptyText}>{t('all_intakes_empty')}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
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
    backgroundGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ecf0f1',
        marginStart: 15,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    intakesList: {
        paddingBottom: 40,
    },
    intakeCard: {
        backgroundColor: '#2c3e50',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 15,
    },
    cardContent: {
        flex: 1,
    },
    intakeName: {
        color: '#ecf0f1',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    intakeDescription: {
        color: '#bdc3c7',
        fontSize: 12,
        marginBottom: 8,
    },
    metaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        color: '#95a5a6',
        fontSize: 12,
        marginStart: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        color: '#95a5a6',
        fontSize: 16,
        marginTop: 15,
    },
});

export default StudentAllIntakesScreen;
