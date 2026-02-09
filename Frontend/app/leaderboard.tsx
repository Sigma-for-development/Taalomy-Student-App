
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { API_CONFIG } from '../src/config/api';

interface LeaderboardEntry {
    id: number;
    student_name: string;
    profile_picture_url: string | null;
    total_points: number;
    level: number;
}

export default function LeaderboardScreen() {
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const { t } = useTranslation();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const response = await api.get(API_CONFIG.ENDPOINTS.LEADERBOARD);
            setLeaderboard(response.data);
        } catch (error) {
            console.error(error);
            Toast.show({
                type: 'error',
                text1: t('error'),
                text2: t('failed_to_load_leaderboard') || 'Failed to load leaderboard',
            });
            // Navigate back after showing error
            setTimeout(() => {
                router.back();
            }, 2000);
        } finally {
            setLoading(false);
        }
    };

    const renderRankIcon = (index: number) => {
        if (index === 0) return <Ionicons name="trophy" size={24} color="#FFD700" />;
        if (index === 1) return <Ionicons name="trophy" size={24} color="#C0C0C0" />;
        if (index === 2) return <Ionicons name="trophy" size={24} color="#CD7F32" />;
        return <Text style={styles.rankText}>{index + 1}</Text>;
    };

    const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
        <View style={styles.itemContainer}>
            <View style={styles.rankContainer}>
                {renderRankIcon(index)}
            </View>
            <View style={styles.profileContainer}>
                {item.profile_picture_url ? (
                    <Image source={{ uri: item.profile_picture_url }} style={styles.profileImage} />
                ) : (
                    <View style={styles.profilePlaceholder}>
                        <Ionicons name="person" size={20} color="#bdc3c7" />
                    </View>
                )}
                <View style={styles.infoContainer}>
                    <Text style={styles.nameText}>{item.student_name}</Text>
                    <Text style={styles.levelText}>Level {item.level}</Text>
                </View>
            </View>
            <View style={styles.pointsContainer}>
                <Text style={styles.pointsText}>{item.total_points}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
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
                <Text style={styles.headerTitle}>Leaderboard</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={leaderboard}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <Text style={styles.listHeaderTitle}>Top Students</Text>
                        <Text style={styles.listHeaderSubtitle}>Global Rankings</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
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
    listContent: {
        padding: 20,
    },
    listHeader: {
        marginBottom: 20,
    },
    listHeaderTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    listHeaderSubtitle: {
        fontSize: 14,
        color: '#95a5a6',
        marginTop: 4,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#95a5a6',
    },
    profileContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginStart: 10,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginEnd: 12,
    },
    profilePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: 12,
    },
    infoContainer: {
        justifyContent: 'center',
    },
    nameText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    levelText: {
        fontSize: 12,
        color: '#95a5a6',
        marginTop: 2,
    },
    pointsContainer: {
        alignItems: 'flex-end',
    },
    pointsText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3498db',
    },
    pointsLabel: {
        fontSize: 10,
        color: '#95a5a6',
    },
});
