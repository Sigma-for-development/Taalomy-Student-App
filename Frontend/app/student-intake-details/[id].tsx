import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, Alert, TouchableOpacity, ScrollView, Modal, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import api from '../../utils/api';
import { API_CONFIG } from '../../src/config/api';
import { socketIOManager } from '../../src/utils/socketio';
import { formatDate } from '../../src/utils/date';

interface IntakeData {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  max_students: number;
  current_students: number;
  status: string;
  has_reviewed: boolean;
  created_by: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

interface ClassData {
  id: number;
  name: string;
  description: string;
  max_students: number;
  current_students: number;
  created_at: string;
  status: string;
  has_reviewed: boolean;
  intake: number;
}

interface Quiz {
  id: number;
  title: string;
  description: string;
  intake: number;
  intake_name: string;
  created_at: string;
  is_published: boolean;
  end_time: string | null;
  total_questions: number;
}

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
  title: string;
  loading: boolean;
}

const ReviewModal = ({ visible, onClose, onSubmit, title, loading }: ReviewModalProps) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment('');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (rating === 0) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('please_select_rating') || 'Please select a rating',
      });
      return;
    }
    onSubmit(rating, comment);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{title}</Text>

              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={32}
                      color="#f1c40f"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder="Write your review (optional)..."
                placeholderTextColor="#95a5a6"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default function StudentIntakeDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ type: 'intake' | 'class', id: number, name: string } | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Validate that id exists and is not undefined
  const intakeId = Array.isArray(id) ? id[0] : id;
  const isValidIntakeId = intakeId && typeof intakeId === 'string';

  useEffect(() => {
    // Check if we have a valid intake ID before proceeding
    if (!isValidIntakeId) {
      setError('Invalid intake ID');
      setLoading(false);
      return;
    }

    loadIntakeDetails();

    // Connect to Socket.IO for real-time updates
    socketIOManager.connect();

    // Handle entity deletion events
    const handleEntityDeleted = (event: any) => {
      console.log('Entity deleted:', event);

      // If the current intake was deleted, go back to the previous screen
      if (event.entity_type === 'intake' && event.entity_id === parseInt(intakeId as string)) {
        Alert.alert('Intake Deleted', 'This intake has been deleted by the lecturer.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      // If a class was deleted, reload the data
      if (event.entity_type === 'class') {
        loadIntakeDetails();
      }
    };

    // Listen for entity deletion events
    socketIOManager.onEntityDeleted(handleEntityDeleted);

    // Cleanup
    return () => {
      socketIOManager.removeEntityDeletedCallback(handleEntityDeleted);
      socketIOManager.disconnect();
    };
  }, [id, isValidIntakeId]);

  const loadIntakeDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load intake details
      const intakeResponse = await api.get(`${API_CONFIG.ENDPOINTS.STUDENT_INTAKES}${intakeId}/`);
      setIntake(intakeResponse.data);

      // Load classes for this intake
      const classesResponse = await api.get(`${API_CONFIG.ENDPOINTS.STUDENT_CLASSES}`);
      const intakeClasses = classesResponse.data.filter((classItem: ClassData) =>
        classItem.intake === parseInt(intakeId as string)
      );
      setClasses(intakeClasses);

      // Load quizzes for this intake
      const quizzesResponse = await api.get(`student/quizzes/`);
      const intakeQuizzes = quizzesResponse.data.filter((quiz: Quiz) =>
        quiz.intake === parseInt(intakeId as string)
      );
      setQuizzes(intakeQuizzes);

    } catch (error: any) {
      console.error('Error loading intake details:', error);
      setError(error.response?.data?.error || 'Failed to load intake details');
    } finally {
      setLoading(false);
    }
  };

  const navigateToClassChat = (classId: number) => {
    router.push(`/student-class-chat/${classId}`);
  };

  const navigateToQuiz = (quizId: number) => {
    // Navigate to quiz attempt page
    router.push(`/student-quiz/${quizId}` as any);
  };

  const navigateToQuizHistory = () => {
    router.push('/quiz-history' as any);
  };

  const navigateToIntakeVideos = () => {
    if (isValidIntakeId) {
      router.push(`/intake-videos/${intakeId}` as any);
    }
  };

  const retryLoad = () => {
    loadIntakeDetails();
  };

  const handleOpenReview = (type: 'intake' | 'class', id: number, name: string) => {
    setReviewTarget({ type, id, name });
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!reviewTarget) return;

    try {
      setSubmittingReview(true);
      const payload: any = {
        rating,
        comment,
      };

      if (reviewTarget.type === 'intake') {
        payload.intake = reviewTarget.id;
      } else {
        payload.class_obj = reviewTarget.id;
      }

      await api.post('lecturer/reviews/', payload);

      Toast.show({
        type: 'success',
        text1: t('success'),
        text2: t('review_submitted') || 'Thank you for your review!',
      });
      setReviewModalVisible(false);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      console.log('Error response data:', error.response?.data);
      const errorMessage = error.response?.data?.error || JSON.stringify(error.response?.data) || 'Failed to submit review';
      if (errorMessage.includes('already reviewed')) {
        Toast.show({
          type: 'info',
          text1: t('review_submitted_title') || 'Review Submitted',
          text2: t('already_reviewed') || 'You have already reviewed this item.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: errorMessage,
        });
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  // Show error screen if we don't have a valid intake ID
  if (!isValidIntakeId) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Invalid Intake ID</Text>
          <Text style={styles.errorText}>The intake ID is missing or invalid.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading intake details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!intake) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="school-outline" size={48} color="#999" />
          <Text style={styles.errorTitle}>Intake Not Found</Text>
          <Text style={styles.errorText}>The intake you're looking for doesn't exist or you don't have access to it.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#3498db" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{intake.name}</Text>
          <Text style={styles.headerSubtitle}>Intake Details</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intake Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Intake Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description:</Text>
            <Text style={styles.infoValue}>{intake.description}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Start Date:</Text>
            <Text style={styles.infoValue}>{formatDate(intake.start_date)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>End Date:</Text>
            <Text style={styles.infoValue}>{formatDate(intake.end_date)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[styles.infoValue, styles.statusText]}>{intake.status}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Students:</Text>
            <Text style={styles.infoValue}>{intake.current_students} / {intake.max_students}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created by:</Text>
            <Text style={styles.infoValue}>{intake.created_by.first_name} {intake.created_by.last_name}</Text>
          </View>
        </View>

        {/* View Videos Button */}
        <TouchableOpacity
          onPress={navigateToIntakeVideos}
          style={{
            backgroundColor: '#9b59b6',
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 10,
            marginBottom: 10,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name="videocam"
            size={20}
            color="#fff"
            style={{ marginEnd: 8 }}
          />
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            View Videos
          </Text>
        </TouchableOpacity>

        {/* Review Button for Intake */}
        {intake.status === 'completed' && (
          <TouchableOpacity
            onPress={() => handleOpenReview('intake', intake.id, intake.name)}
            disabled={intake.has_reviewed}
            style={{
              backgroundColor: intake.has_reviewed ? '#7f8c8d' : '#f39c12',
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: 'center',
              marginTop: 10,
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={intake.has_reviewed ? "checkmark-circle" : "star"}
              size={20}
              color="#fff"
              style={{ marginEnd: 8 }}
            />
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {intake.has_reviewed ? 'Intake Reviewed' : 'Review Intake'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Classes Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enrolled Classes</Text>

          {classes.length > 0 ? (
            classes.map((classItem) => (
              <TouchableOpacity
                key={classItem.id}
                style={styles.classItem}
                onPress={() => navigateToClassChat(classItem.id)}
              >
                <View style={styles.classIconContainer}>
                  <Ionicons name="library-outline" size={24} color="#3498db" />
                </View>

                <View style={styles.classContent}>
                  <Text style={styles.className}>{classItem.name}</Text>
                  <Text style={styles.classDescription}>{classItem.description}</Text>
                  <Text style={styles.classStats}>{classItem.current_students} students enrolled</Text>
                </View>

                <View style={styles.classActions}>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => navigateToClassChat(classItem.id)}
                  >
                    <Ionicons name="chatbubbles-outline" size={20} color="#3498db" />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color="#95a5a6" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No classes enrolled yet</Text>
          )}
        </View>

        {/* Quizzes Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.cardTitle}>Available Quizzes</Text>
            <TouchableOpacity
              onPress={navigateToQuizHistory}
              style={{ padding: 8 }}
            >
              <Text style={{ color: '#3498db', fontWeight: 'bold' }}>History</Text>
            </TouchableOpacity>
          </View>

          {quizzes.length > 0 ? (
            quizzes.map((quiz) => {
              const isExpired = quiz.end_time ? new Date(quiz.end_time) < new Date() : false;
              return (
                <TouchableOpacity
                  key={quiz.id}
                  style={[styles.classItem, isExpired && { opacity: 0.7 }]}
                  onPress={() => !isExpired && navigateToQuiz(quiz.id)}
                  disabled={isExpired}
                >
                  <View style={styles.classIconContainer}>
                    <Ionicons name="document-text-outline" size={24} color="#3498db" />
                  </View>

                  <View style={styles.classContent}>
                    <Text style={styles.className}>{quiz.title}</Text>
                    <Text style={styles.classDescription}>{quiz.description || 'No description'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.classStats, { marginEnd: 10 }]}>{quiz.total_questions} questions</Text>
                      {quiz.end_time && (
                        <Text style={{ fontSize: 12, color: isExpired ? '#e74c3c' : '#f39c12' }}>
                          {isExpired ? 'Expired' : `Ends: ${formatDate(quiz.end_time)} ${new Date(quiz.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.classActions}>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => navigateToQuiz(quiz.id)}
                    >
                      <Text style={{ color: isExpired ? '#95a5a6' : '#3498db', fontWeight: 'bold' }}>
                        {isExpired ? 'Ended' : 'Start'}
                      </Text>
                    </TouchableOpacity>
                    {!isExpired && <Ionicons name="chevron-forward" size={20} color="#95a5a6" />}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No quizzes available yet</Text>
          )}
        </View>
      </ScrollView>

      <ReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={handleSubmitReview}
        title={`Review ${reviewTarget?.name || ''}`}
        loading={submittingReview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerBackButton: {
    marginEnd: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ecf0f1',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#bdc3c7',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#ecf0f1',
    flex: 2,
    textAlign: 'right',
  },
  statusText: {
    textTransform: 'capitalize',
    color: '#27ae60',
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  classIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  classContent: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  classDescription: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 2,
  },
  classStats: {
    fontSize: 12,
    color: '#95a5a6',
  },
  classActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButton: {
    padding: 8,
    marginEnd: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewButton: {
    backgroundColor: '#f1c40f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  reviewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  classReviewButton: {
    backgroundColor: '#f1c40f',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginStart: 8,
  },
  classReviewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2c2c2c',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starButton: {
    padding: 5,
  },
  commentInput: {
    backgroundColor: '#3c3c3c',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  submitButton: {
    backgroundColor: '#3498db',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
