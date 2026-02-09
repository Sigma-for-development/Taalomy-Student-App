import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../src/config/api';
import { API_CONFIG } from '../src/config/api';

const { width } = Dimensions.get('window');

interface InsightData {
    performance: {
        student_avg: number;
        class_avg: number;
    };
    attendance_trend: {
        label: string;
        value: number;
        start_date: string;
    }[];
    predicted_grade: {
        score: number;
        grade: string;
    };
}

interface GamificationStats {
    current_streak: number;
    total_points: number;
    level: number;
}

const InsightsScreen = () => {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<InsightData | null>(null);
    const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null);

    const fetchInsights = async (showSuccessToast = false) => {
        try {
            const response = await api.get(API_CONFIG.ENDPOINTS.STUDENT_INSIGHTS);
            setData(response.data);

            // Fetch Gamification Stats
            const gamificationResponse = await api.get(API_CONFIG.ENDPOINTS.GAMIFICATION_STATS);
            setGamificationStats(gamificationResponse.data);

            if (showSuccessToast) {
                Toast.show({
                    type: 'success',
                    text1: t('success'),
                    text2: t('insights_refreshed') || 'Insights refreshed',
                });
            }
        } catch (error) {
            console.error('Error fetching insights:', error);
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_to_load_insights') || 'Failed to load insights',
            });
            // Navigate back after showing error
            setTimeout(() => {
                router.back();
            }, 2000);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchInsights(true);
    };

    const BarChart = ({ label, subLabel, value, color, maxVal = 100, height = 120 }: { label: string, subLabel?: string, value: number, color: string, maxVal?: number, height?: number }) => (
        <View style={styles.barContainer}>
            <View style={[styles.barTrack, { height }]}>
                <View
                    style={[
                        styles.barFill,
                        {
                            height: `${Math.min((value / maxVal) * 100, 100)}%`,
                            backgroundColor: color
                        }
                    ]}
                />
            </View>
            <Text style={styles.barLabel}>{label}</Text>
            {subLabel && <Text style={styles.barSubLabel}>{subLabel}</Text>}
            <Text style={styles.barValue}>{Math.round(value)}%</Text>
        </View>
    );

    const ProgressBar = ({ value, color }: { value: number, color: string }) => (
        <View style={styles.progressContainer}>
            <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
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
                <Text style={styles.headerTitle}>{t('insights_personal')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {data ? (
                    <>
                        {/* Gamification Stats Card */}
                        {gamificationStats && (
                            <TouchableOpacity
                                style={styles.gamificationCard}
                                onPress={() => router.push('/gamification')}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#141E30', '#243B55']} // Deep Navy / Royal Blue
                                    style={styles.gamificationGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.gamificationRow}>
                                        <View style={styles.gamificationStatItem}>
                                            <Ionicons name="flame" size={28} color="#fff" />
                                            <Text style={styles.gamificationStatValue}>{gamificationStats.current_streak}</Text>
                                            <Text style={styles.gamificationStatLabel}>{t('day_streak')}</Text>
                                        </View>
                                        <View style={styles.gamificationStatDivider} />
                                        <View style={styles.gamificationStatItem}>
                                            <Ionicons name="trophy" size={28} color="#fff" />
                                            <Text style={styles.gamificationStatValue}>{gamificationStats.total_points}</Text>
                                            <Text style={styles.gamificationStatLabel}>{t('points')}</Text>
                                        </View>
                                        <View style={styles.gamificationStatDivider} />
                                        <View style={styles.gamificationStatItem}>
                                            <Ionicons name="ribbon" size={28} color="#fff" />
                                            <Text style={styles.gamificationStatValue}>{gamificationStats.level}</Text>
                                            <Text style={styles.gamificationStatLabel}>{t('level')}</Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {/* Performance vs Class Average */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="stats-chart" size={20} color="#3498db" />
                                </View>
                                <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('insights_performance_vs_class')}</Text>
                            </View>

                            <View style={styles.chartRow}>
                                <BarChart
                                    label={t('insights_you')}
                                    value={data.performance.student_avg}
                                    color="#2ecc71"
                                />
                                <BarChart
                                    label={t('insights_class')}
                                    value={data.performance.class_avg}
                                    color="#3498db"
                                />
                            </View>
                            <Text style={styles.caption}>
                                {data.performance.student_avg >= data.performance.class_avg
                                    ? t('insights_performance_above')
                                    : t('insights_performance_below')}
                            </Text>
                        </View>

                        {/* Attendance Trends */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(241, 196, 15, 0.2)' }]}>
                                    <Ionicons name="calendar" size={20} color="#f1c40f" />
                                </View>
                                <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('insights_attendance_trend')}</Text>
                            </View>
                            <View style={styles.chartRow}>
                                {data.attendance_trend.map((item, index) => (
                                    <BarChart
                                        key={index}
                                        label={item.label}
                                        subLabel={item.start_date}
                                        value={item.value}
                                        color="#f1c40f"
                                        height={100}
                                    />
                                ))}
                            </View>
                        </View>

                        {/* Predicted Grade */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(231, 76, 60, 0.2)' }]}>
                                    <Ionicons name="school" size={20} color="#e74c3c" />
                                </View>
                                <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('insights_predicted_grade')}</Text>
                            </View>

                            <View style={styles.predictionContent}>
                                <View style={[styles.gradeCircle, { borderColor: data.predicted_grade.grade === 'A' ? '#2ecc71' : data.predicted_grade.grade === 'B' ? '#3498db' : '#e74c3c' }]}>
                                    <Text style={[
                                        styles.gradeText,
                                        {
                                            color: data.predicted_grade.grade === 'A' ? '#2ecc71' :
                                                data.predicted_grade.grade === 'B' ? '#3498db' :
                                                    data.predicted_grade.grade === 'C' ? '#f1c40f' : '#e74c3c'
                                        }
                                    ]}>
                                        {data.predicted_grade.grade}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, marginStart: 20 }}>
                                    <Text style={[styles.scoreText, { textAlign: isRTL ? 'right' : 'left' }]}>{t('insights_projected_score', { score: data.predicted_grade.score })}</Text>
                                    <ProgressBar
                                        value={data.predicted_grade.score}
                                        color={data.predicted_grade.grade === 'A' ? '#2ecc71' :
                                            data.predicted_grade.grade === 'B' ? '#3498db' :
                                                data.predicted_grade.grade === 'C' ? '#f1c40f' : '#e74c3c'}
                                    />
                                    <Text style={[styles.disclaimer, { textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t('insights_disclaimer')}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </>
                ) : (
                    <Text style={styles.errorText}>{t('insights_unable_to_load')}</Text>
                )}
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
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
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
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    chartRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    barContainer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
    },
    barTrack: {
        width: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        justifyContent: 'flex-end',
        marginBottom: 8,
        overflow: 'hidden',
    },
    barFill: {
        width: '100%',
        borderRadius: 10,
    },
    barLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        marginTop: 4,
    },
    barSubLabel: {
        fontSize: 10,
        color: '#95a5a6',
        marginTop: 2,
    },
    barValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#bdc3c7',
        marginTop: 2,
    },
    caption: {
        fontSize: 12,
        color: '#95a5a6',
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
    predictionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    gradeCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    gradeText: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    scoreText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    progressContainer: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    disclaimer: {
        fontSize: 11,
        color: '#7f8c8d',
    },

    errorText: {
        color: '#e74c3c',
        textAlign: 'center',
        marginTop: 20,
    },
    gamificationCard: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#F09819',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    gamificationGradient: {
        padding: 20,
    },
    gamificationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    gamificationStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    gamificationStatValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 4,
    },
    gamificationStatLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 2,
    },
    gamificationStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
});

export default InsightsScreen;
