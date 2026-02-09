import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  I18nManager
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../utils/api';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../src/utils/date';

interface QuizHistoryItem {
  id: number;
  quiz_id: number;
  quiz_title: string;
  intake_id: number;
  intake_name: string;
  submitted_at: string;
  score: number | null;
  total_possible_points: number;
  is_graded: boolean;
  percentage: number;
}

export default function QuizHistoryScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadQuizHistory();
  }, []);

  const loadQuizHistory = async (showSuccessToast = false) => {
    try {
      setLoading(true);
      const response = await api.get('student/quizzes/history/');
      setHistory(response.data);
      if (showSuccessToast) {
        Toast.show({
          type: 'success',
          text1: t('success'),
          text2: t('quiz_history_refreshed') || 'Quiz history refreshed',
        });
      }
    } catch (error: any) {
      console.error('Error loading quiz history:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: error.response?.data?.error || t('failed_to_load_quiz_history') || 'Failed to load quiz history',
      });
      // Navigate back after a short delay if there's an error
      setTimeout(() => {
        router.back();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuizHistory(true);
    setRefreshing(false);
  };



  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading_quiz_history')}</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)'
        }}>
          <TouchableOpacity onPress={() => router.back()} style={{ [isRTL ? 'marginStart' : 'marginEnd']: 12 }}>
            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#3498db" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#ecf0f1' }}>
            {t('quiz_history')}
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1, padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {history.length > 0 ? (
            history.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16
                }}
              >
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: '#3498db',
                  marginBottom: 8,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {item.quiz_title}
                </Text>

                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  justifyContent: 'space-between',
                  marginBottom: 8
                }}>
                  <Text style={{ color: '#95a5a6' }}>{t('intake_invites')}:</Text>
                  <Text style={{ color: '#ecf0f1' }}>{item.intake_name}</Text>
                </View>

                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  justifyContent: 'space-between',
                  marginBottom: 8
                }}>
                  <Text style={{ color: '#95a5a6' }}>{t('created')}:</Text>
                  <Text style={{ color: '#ecf0f1' }}>{formatDate(item.submitted_at)}</Text>
                </View>

                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  justifyContent: 'space-between',
                  marginBottom: 12
                }}>
                  <Text style={{ color: '#95a5a6' }}>{t('activity_status')}:</Text>
                  <Text style={{
                    color: item.is_graded ? '#27ae60' : '#f39c12',
                    fontWeight: 'bold'
                  }}>
                    {item.is_graded ? t('graded') : t('pending')}
                  </Text>
                </View>

                {item.is_graded ? (
                  <View style={{
                    backgroundColor: 'rgba(39, 174, 96, 0.2)',
                    borderRadius: 8,
                    padding: 12
                  }}>
                    <View style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}>
                      <Text style={{ color: '#27ae60', fontWeight: 'bold' }}>{t('score')}:</Text>
                      <Text style={{ color: '#27ae60', fontWeight: 'bold' }}>
                        {item.score} / {item.total_possible_points}
                      </Text>
                    </View>
                    <View style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      justifyContent: 'space-between'
                    }}>
                      <Text style={{ color: '#27ae60' }}>{t('percentage')}:</Text>
                      <Text style={{ color: '#27ae60', fontWeight: 'bold' }}>
                        {item.percentage}%
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{
                    backgroundColor: 'rgba(243, 156, 18, 0.2)',
                    borderRadius: 8,
                    padding: 12
                  }}>
                    <Text style={{
                      color: '#f39c12',
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}>
                      {t('quiz_being_graded')}
                    </Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 40
            }}>
              <Ionicons name="document-text-outline" size={48} color="#7f8c8d" />
              <Text style={{
                color: '#7f8c8d',
                marginTop: 16,
                fontSize: 16,
                textAlign: 'center'
              }}>
                {t('no_quiz_history')}
              </Text>
              <Text style={{
                color: '#95a5a6',
                marginTop: 8,
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 20
              }}>
                {t('quiz_attempts_msg')}
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  backgroundColor: '#3498db',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('back_to_intake')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
