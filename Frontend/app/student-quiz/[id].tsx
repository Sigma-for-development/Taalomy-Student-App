import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  I18nManager
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../src/utils/date';

interface Quiz {
  id: number;
  title: string;
  description: string;
  intake: number;
  intake_name: string;
  is_published: boolean;
  total_questions: number;
  created_at: string;
  my_submission?: {
    started_at: string;
    submitted_at: string | null;
  };
  time_limit: number;
}

interface Question {
  id: number;
  question_text: string;
  question_type: 'mcq' | 'essay';
  points: number;
  order: number;
  options?: { id: number; option_text: string; order: number }[];
}

interface Answer {
  question_id: number;
  option_id?: number;
  essay_text?: string;
}

export default function StudentQuizScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // in seconds
  const [timerActive, setTimerActive] = useState(false);

  const quizId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  // Timer Effect
  useEffect(() => {
    if (!timeLeft || !timerActive || submitting) return;

    if (timeLeft <= 0) {
      handleTimeExpired();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, timerActive, submitting]);

  const handleTimeExpired = async () => {
    setTimerActive(false);
    Alert.alert(
      t('time_expired'),
      t('time_expired_msg'),
      [{ text: 'OK', onPress: submitQuiz }]
    );
    // Force submit
    await submitQuiz();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const loadQuiz = async () => {
    try {
      setLoading(true);
      // Fetch quiz details first (does NOT start quiz)
      const response = await api.get(`student/quizzes/${quizId}/`);
      const quizData = response.data;
      setQuiz(quizData);

      // If student already started, set state
      if (quizData.my_submission?.started_at && !quizData.my_submission.submitted_at) {
        // Resume logic
        setStarted(true);
        // Calculate remaining time
        if (quizData.time_limit > 0) {
          const startedAt = new Date(quizData.my_submission.started_at);
          const now = new Date();
          const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
          const limitSeconds = quizData.time_limit * 60;
          const remaining = limitSeconds - elapsedSeconds;
          setTimeLeft(remaining > 0 ? remaining : 0);
          setTimerActive(true);
        }
        // Fetch questions since we are started
        fetchQuestions();
      }
    } catch (error: any) {
      console.log('Error loading quiz:', error.message || error);

      // Check if the error indicates the quiz was already attempted
      if (error.response?.data?.error === 'You have already attempted this quiz') {
        // Keep Alert for this since it needs user action
        Alert.alert(
          t('quiz_already_attempted'),
          t('quiz_completed_msg'),
          [
            { text: t('view_history'), onPress: () => router.push('/quiz-history' as any) },
            { text: 'OK', onPress: () => router.back() }
          ]
        );
        return;
      }

      // For other errors, show Toast and navigate back
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_load_quiz') || 'Failed to load quiz. Please try again.',
      });
      setTimeout(() => {
        router.back();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await api.get(`student/quizzes/${quizId}/attempt/`);
      if (response.data.questions) {
        setQuestions(response.data.questions);
      }
    } catch (error) {
      console.log("Error fetching questions:", error);
    }
  };
  const startQuiz = async () => {
    try {
      setStarting(true);
      const response = await api.get(`student/quizzes/${quizId}/attempt/`);

      // Check if the error indicates the quiz was already attempted
      if (response.data?.error === 'You have already attempted this quiz') {
        // Show error message instead of redirecting
        Alert.alert(
          t('quiz_already_attempted'),
          t('quiz_completed_msg'),
          [
            { text: t('view_history'), onPress: () => router.push('/quiz-history' as any) },
            { text: 'OK', onPress: () => router.back() }
          ]
        );
        return;
      }


      // Check for expiration
      if (response.data.quiz.end_time && new Date(response.data.quiz.end_time) < new Date()) {
        Toast.show({
          type: 'error',
          text1: t('expired'),
          text2: t('quiz_expired'),
        });
        setTimeout(() => {
          router.back();
        }, 2000);
        return;
      }

      setQuiz(response.data.quiz);
      setQuestions(response.data.questions);
      setStarted(true);

      // Initialize Timer
      if (response.data.quiz.time_limit > 0) {
        // If response has started_at, use it for precision, otherwise full duration
        const startedAtStr = response.data.started_at;
        // Note: started_at comes from our updated backend AttemptView GET response

        if (startedAtStr) {
          const startedAt = new Date(startedAtStr);
          const now = new Date();
          const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
          const limitSeconds = response.data.quiz.time_limit * 60;
          const remaining = limitSeconds - elapsedSeconds;
          setTimeLeft(remaining > 0 ? remaining : 0);
        } else {
          setTimeLeft(response.data.quiz.time_limit * 60);
        }
        setTimerActive(true);
      }
    } catch (error: any) {
      console.log('Error starting quiz:', error.message || error);

      // Check if the error indicates the quiz was already attempted
      if (error.response?.data?.error === 'You have already attempted this quiz') {
        // Show error message instead of redirecting
        Alert.alert(
          t('quiz_already_attempted'),
          t('quiz_completed_msg'),
          [
            { text: t('view_history'), onPress: () => router.push('/quiz-history' as any) },
            { text: 'OK', onPress: () => router.back() }
          ]
        );
        return;
      }

      // For other errors, show Toast
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_start_quiz') || 'Failed to start quiz. Please try again.',
      });
    } finally {
      setStarting(false);
    }
  };

  const selectOption = (questionId: number, optionId: number) => {
    setAnswers(prev => {
      const existingAnswerIndex = prev.findIndex(a => a.question_id === questionId);
      const newAnswer = { question_id: questionId, option_id: optionId };

      if (existingAnswerIndex >= 0) {
        const updated = [...prev];
        updated[existingAnswerIndex] = newAnswer;
        return updated;
      } else {
        return [...prev, newAnswer];
      }
    });
  };

  const updateEssayAnswer = (questionId: number, text: string) => {
    setAnswers(prev => {
      const existingAnswerIndex = prev.findIndex(a => a.question_id === questionId);
      const newAnswer = { question_id: questionId, essay_text: text };

      if (existingAnswerIndex >= 0) {
        const updated = [...prev];
        updated[existingAnswerIndex] = newAnswer;
        return updated;
      } else {
        return [...prev, newAnswer];
      }
    });
  };

  const submitQuiz = async () => {
    try {
      setSubmitting(true);
      const response = await api.post(`student/quizzes/${quizId}/attempt/`, {
        answers
      });

      Alert.alert(
        t('success'),
        t('quiz_submitted_success', { score: response.data.total_score }),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      Alert.alert(t('error'), error.response?.data?.error || t('failed_submit_quiz'));
    } finally {
      setSubmitting(false);
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
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
          <Text style={{ color: '#fff', marginTop: 16 }}>{t('loading_quiz')}</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!started) {
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
              {t('quiz_details')}
            </Text>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16
            }}>
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#3498db',
                marginBottom: 8,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {quiz?.title}
              </Text>

              <Text style={{
                color: '#bdc3c7',
                marginBottom: 16,
                lineHeight: 20,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {quiz?.description || t('no_description')}
              </Text>

              <View style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                marginBottom: 8
              }}>
                <Text style={{ color: '#95a5a6' }}>{t('intake_invites')}:</Text>
                <Text style={{ color: '#ecf0f1' }}>{quiz?.intake_name}</Text>
              </View>

              <View style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                marginBottom: 8
              }}>
                <Text style={{ color: '#95a5a6' }}>{t('questions')}:</Text>
                <Text style={{ color: '#ecf0f1' }}>{quiz?.total_questions}</Text>
              </View>

              <View style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                justifyContent: 'space-between'
              }}>
                <Text style={{ color: '#95a5a6' }}>{t('created')}:</Text>
                <Text style={{ color: '#ecf0f1' }}>
                  {quiz?.created_at ? formatDate(quiz.created_at) : ''}
                </Text>
              </View>
            </View>

            <View style={{
              backgroundColor: 'rgba(230, 126, 34, 0.2)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16
            }}>
              <Text style={{
                color: '#e67e22',
                fontWeight: 'bold',
                marginBottom: 8,
                textAlign: 'center'
              }}>
                {t('important_instructions')}
              </Text>
              <Text style={{ color: '#f39c12', lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
                {t('quiz_instructions')}
              </Text>
            </View>

            {/* Check if already submitted */}
            {quiz?.my_submission?.submitted_at ? (
              <TouchableOpacity
                onPress={() => router.push('/quiz-history')}
                style={{
                  backgroundColor: '#3498db',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginTop: 20
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                  {t('view_results')}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
                  {t('quiz_already_completed')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={startQuiz}
                disabled={starting}
                style={{
                  backgroundColor: '#27ae60',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginTop: 20
                }}
              >
                {starting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                    {t('start_quiz')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const selectedOption = answers.find(a => a.question_id === currentQuestion?.id)?.option_id;

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
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#ecf0f1', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
            {t('quiz_in_progress')}
          </Text>
          {timeLeft !== null && (quiz?.time_limit || 0) > 0 && (
            <View style={{
              backgroundColor: timeLeft < 300 ? 'rgba(231, 76, 60, 0.2)' : 'rgba(52, 152, 219, 0.2)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              [isRTL ? 'marginStart' : 'marginEnd']: 12
            }}>
              <Text style={{
                color: timeLeft < 300 ? '#e74c3c' : '#3498db',
                fontWeight: 'bold',
                fontVariant: ['tabular-nums']
              }}>
                {formatTime(timeLeft)}
              </Text>
            </View>
          )}
          <Text style={{ color: '#bdc3c7' }}>
            {currentQuestionIndex + 1}/{questions.length}
          </Text>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#3498db',
              marginBottom: 8,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {t('questions')} {currentQuestionIndex + 1}
            </Text>

            <Text style={{
              color: '#ecf0f1',
              fontSize: 16,
              lineHeight: 24,
              marginBottom: 16,
              textAlign: isRTL ? 'right' : 'left'
            }}>
              {currentQuestion?.question_text}
            </Text>

            <View style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              marginBottom: 16,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.1)'
            }}>
              <Text style={{ color: '#95a5a6' }}>Type:</Text>
              <Text style={{ color: '#27ae60', fontWeight: 'bold' }}>
                {currentQuestion?.question_type === 'mcq' ? t('multiple_choice') : t('essay')}
              </Text>
            </View>

            {currentQuestion?.question_type === 'mcq' ? (
              <View style={{ marginBottom: 20 }}>
                {currentQuestion.options?.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => selectOption(currentQuestion.id, option.id)}
                    style={{
                      backgroundColor: selectedOption === option.id ? 'rgba(52, 152, 219, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center'
                    }}
                  >
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selectedOption === option.id ? '#3498db' : '#7f8c8d',
                      backgroundColor: selectedOption === option.id ? '#3498db' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      [isRTL ? 'marginStart' : 'marginEnd']: 12
                    }}>
                      {selectedOption === option.id && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={{
                      color: '#ecf0f1',
                      flex: 1,
                      fontSize: 16,
                      textAlign: isRTL ? 'right' : 'left'
                    }}>
                      {option.option_text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  color: '#95a5a6',
                  marginBottom: 8,
                  textAlign: isRTL ? 'right' : 'left'
                }}>
                  {t('your_answer')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
                    padding: 12,
                    color: '#ecf0f1',
                    fontSize: 16,
                    minHeight: 100,
                    textAlignVertical: 'top',
                    textAlign: isRTL ? 'right' : 'left'
                  }}
                  placeholder={t('type_answer_here')}
                  placeholderTextColor="#7f8c8d"
                  multiline
                  numberOfLines={4}
                  value={answers.find(a => a.question_id === currentQuestion.id)?.essay_text || ''}
                  onChangeText={(text: string) => updateEssayAnswer(currentQuestion.id, text)}
                />
              </View>
            )}
          </View>

          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            marginBottom: 16
          }}>
            <TouchableOpacity
              onPress={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              style={{
                backgroundColor: currentQuestionIndex === 0 ? '#7f8c8d' : '#3498db',
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 8,
                opacity: currentQuestionIndex === 0 ? 0.5 : 1
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('previous')}</Text>
            </TouchableOpacity>

            {currentQuestionIndex < questions.length - 1 ? (
              <TouchableOpacity
                onPress={goToNextQuestion}
                style={{
                  backgroundColor: '#3498db',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('next')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={submitQuiz}
                disabled={submitting}
                style={{
                  backgroundColor: '#27ae60',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 8
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('submit_quiz')}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}