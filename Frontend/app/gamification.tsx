
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../utils/api';
import { API_CONFIG } from '../src/config/api';
import { formatDate } from '../src/utils/date';

const { width } = Dimensions.get('window');

interface AchievementBadge {
    id: number;
    name: string;
    description: string;
    icon_name: string;
    category: string;
    points_reward: number;
}

interface StudentBadge {
    id: number;
    badge: AchievementBadge;
    earned_at: string;
}

interface GamificationStats {
    id: number;
    current_streak: number;
    longest_streak: number;
    total_points: number;
    level: number;
    badges: StudentBadge[];
}

export default function GamificationScreen() {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<GamificationStats | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const response = await api.get(API_CONFIG.ENDPOINTS.GAMIFICATION_STATS);
            setStats(response.data);
        } catch (error) {
            console.error(error);
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_to_load_gamification') || 'Failed to load achievements',
            });
            // Navigate back after showing error
            setTimeout(() => {
                router.back();
            }, 2000);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#FF512F" />
            </View>
        );
    }

    return (
        <View style={styles.container}>

            <LinearGradient
                colors={['#0a0a0a', '#1a1a1a']}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('gamification_achievements')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.contentAndScroll}>
                {/* Stats Header */}
                <LinearGradient
                    colors={['#141E30', '#243B55']}
                    style={styles.statsCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.levelContainer}>
                        <Ionicons name="ribbon-outline" size={24} color="#bdc3c7" style={{ marginBottom: 5 }} />
                        <Text style={styles.levelLabel}>{t('gamification_level')}</Text>
                        <Text style={styles.levelValue}>{stats?.level}</Text>
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="flame" size={32} color="#fff" style={{ marginBottom: 8 }} />
                            <Text style={styles.statValue}>{stats?.current_streak}</Text>
                            <Text style={styles.statLabel}>{t('gamification_current_streak')}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="trophy" size={32} color="#fff" style={{ marginBottom: 8 }} />
                            <Text style={styles.statValue}>{stats?.total_points}</Text>
                            <Text style={styles.statLabel}>{t('gamification_total_points')}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Badges Grid */}
                <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('gamification_my_badges')}</Text>
                <View style={styles.badgesGrid}>
                    {stats?.badges && stats.badges.length > 0 ? (
                        stats.badges.map((item) => (
                            <View key={item.id} style={styles.badgeItem}>
                                <View style={styles.badgeIconContainer}>
                                    <Ionicons name={item.badge.icon_name as any} size={32} color="#FFD700" />
                                </View>
                                <Text style={styles.badgeName}>{item.badge.name}</Text>
                                <Text style={styles.badgeDate}>{formatDate(item.earned_at)}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>{t('gamification_no_badges')}</Text>
                    )}
                </View>

                {/* Leaderboard Button */}
                <TouchableOpacity
                    style={styles.leaderboardButton}
                    onPress={() => router.push('/leaderboard')}
                >
                    <Ionicons name="podium" size={24} color="#fff" style={{ marginEnd: 10 }} />
                    <Text style={styles.leaderboardButtonText}>{t('gamification_view_leaderboard')}</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    contentAndScroll: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 60,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    statsCard: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 30,
        elevation: 5,
        shadowColor: '#F09819',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    levelContainer: {
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.3)',
        paddingBottom: 20,
        width: '100%',
    },
    levelLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 4,
        letterSpacing: 2,
    },
    levelValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    badgeItem: {
        width: (width - 60) / 3,
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 12,
    },
    badgeIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeDate: {
        fontSize: 10,
        color: '#95a5a6',
    },
    emptyText: {
        color: '#95a5a6',
        fontSize: 14,
        fontStyle: 'italic',
    },
    leaderboardButton: {
        flexDirection: 'row',
        backgroundColor: '#3498db',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    leaderboardButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
