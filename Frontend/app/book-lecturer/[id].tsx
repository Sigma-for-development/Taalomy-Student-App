import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../../src/utils/storage';
import { WebView } from 'react-native-webview';
import ProfilePicture from '../../src/components/ProfilePicture';
import { API_CONFIG } from '../../src/config/api';
import api from '../../utils/api';
import DatePicker from '../../src/components/DatePicker';
import TimePicker from '../../src/components/TimePicker';
import { useLocalization } from '../../src/context/LocalizationContext';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { formatDate } from '../../src/utils/date';

interface LecturerProfile {
  id: number;
  lecturer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url?: string;
  };
  lecturer_name: string;
  lecturer_profile_picture?: string;
  bio: string;
  experience_years: number;
  education: string;
  speciality: string;
  hourly_rate: number;
  class_rate: number;
  term_rate: number;
  is_demo_offered: boolean;
  demo_price: number;
  show_hourly_rate: boolean;
  show_class_rate: boolean;
  show_term_rate: boolean;
  working_hours: string;
  languages: string;
  certifications: string;
  achievements: string;
  teaching_style: string;
  subjects_taught: string;
  availability_status: string;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  reviews: Review[];
}

interface Review {
  id: number;
  student_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface BookingForm {
  booking_date: string;
  start_time: string;
  end_time: string;
  subject: string;
  notes: string;
}

const BookLecturerScreen = () => {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const [lecturer, setLecturer] = useState<LecturerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [currentBookingId, setCurrentBookingId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedStartTime, setSelectedStartTime] = useState<Date | undefined>(undefined);

  // Removed selectedEndTime state
  const [quantity, setQuantity] = useState<string>('1');
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    booking_date: '',
    start_time: '',
    end_time: '',
    subject: '',
    notes: '',
  });
  const { formatPrice } = useLocalization();
  const [selectedPaymentType, setSelectedPaymentType] = useState<'hourly' | 'class' | 'term' | 'demo'>('hourly');

  // Validate that id exists and is not undefined
  const lecturerId = Array.isArray(id) ? id[0] : id;
  const isValidLecturerId = lecturerId && typeof lecturerId === 'string';

  useEffect(() => {
    // Check if we have a valid lecturer ID before proceeding
    if (!isValidLecturerId) {
      setIsLoading(false);
      return;
    }

    loadLecturerDetails();
  }, [id, isValidLecturerId]);

  const loadLecturerDetails = async () => {
    try {
      const token = await tokenStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('no_access_token') || 'No access token found',
        });
        setTimeout(() => router.back(), 2000);
        return;
      }

      const response = await api.get(`lecturer-directory/${lecturerId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        setLecturer(response.data);
      }
    } catch (error) {
      console.error('Error loading lecturer details:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_load_lecturer_details') || 'Failed to load lecturer details',
      });
      setTimeout(() => router.back(), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lecturer) {
      // Set default payment type based on availability
      if (lecturer.show_hourly_rate) {
        setSelectedPaymentType('hourly');
      } else if (lecturer.show_class_rate) {
        setSelectedPaymentType('class');
      } else if (lecturer.show_term_rate) {
        setSelectedPaymentType('term');
      } else if (lecturer.is_demo_offered) {
        setSelectedPaymentType('demo');
      }
    }
  }, [lecturer]);

  const updateBookingField = (field: keyof BookingForm, value: string) => {
    setBookingForm(prev => ({ ...prev, [field]: value }));
  };

  const handleStartTimeChange = (date: Date) => {
    setSelectedStartTime(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    updateBookingField('start_time', `${hours}:${minutes}`);
  };

  // Removed handleEndTimeChange

  const calculateDuration = () => {
    if (selectedPaymentType === 'hourly') {
      return parseFloat(quantity) || 0;
    }
    return 1; // Default duration for non-hourly
  };

  const calculateTotalAmount = () => {
    if (!lecturer) return 0;

    if (selectedPaymentType === 'hourly') {
      return (parseFloat(quantity) || 0) * (Number(lecturer.hourly_rate) || 0);
    } else if (selectedPaymentType === 'class') {
      return (parseFloat(quantity) || 0) * (Number(lecturer.class_rate) || 0);
    } else if (selectedPaymentType === 'term') {
      return (parseFloat(quantity) || 0) * (Number(lecturer.term_rate) || 0);
    } else if (selectedPaymentType === 'demo') {
      return Number(lecturer.demo_price) || 0;
    }
    return 0;
  };

  const validateForm = () => {
    if (!selectedDate) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('select_booking_date') || 'Please select a booking date',
      });
      return false;
    }
    if (!selectedStartTime) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('select_start_time') || 'Please select a start time',
      });
      return false;
    }


    // Validate quantity
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('enter_valid_quantity') || 'Please enter a valid quantity',
      });
      return false;
    }
    if (selectedPaymentType === 'hourly' && qty > 8) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('duration_limit') || 'Booking duration cannot exceed 8 hours per session',
      });
      return false;
    }
    if (!bookingForm.subject) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('enter_subject') || 'Please enter a subject',
      });
      return false;
    }



    return true;
  };

  const handleBooking = async () => {
    if (!validateForm() || !lecturer) return;

    const totalAmount = calculateTotalAmount();

    try {
      setIsBooking(true);
      const token = await tokenStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('no_access_token') || 'No access token found',
        });
        return;
      }

      const duration = calculateDuration();

      // Format the selected date to YYYY-MM-DD
      const formattedDate = selectedDate
        ? `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`
        : '';

      // Calculate End Time based on Start Time + Duration
      const startDateTime = new Date(`2000-01-01T${bookingForm.start_time}`);
      const durationHours = calculateDuration();
      const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);
      const hours = endDateTime.getHours().toString().padStart(2, '0');
      const minutes = endDateTime.getMinutes().toString().padStart(2, '0');
      const calculatedEndTime = `${hours}:${minutes}`;

      // Include lecturer ID in the booking data
      const bookingData = {
        ...bookingForm,
        booking_date: formattedDate,
        end_time: calculatedEndTime,
        duration_hours: durationHours,
        total_amount: totalAmount,
        lecturer: lecturer.lecturer.id,
        payment_type: selectedPaymentType,
        quantity: parseFloat(quantity),
        platform: 'ios' // Identify as iOS booking for commission calculation
      };

      // 1. Create Booking
      const response = await api.post('lecturer/bookings/', bookingData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 201) {
        const bookingId = response.data.id;
        setCurrentBookingId(bookingId);

        // 2. Initiate Payment
        const paymentResponse = await api.post('booking/initiate-payment/', { booking_id: bookingId }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (paymentResponse.status === 200) {
          if (paymentResponse.data.payment_required === false) {
            Alert.alert(
              'Booking Successful!',
              `Your demo session with ${lecturer?.lecturer_name} has been confirmed.`,
              [{ text: 'OK', onPress: () => router.back() }]
            );
            return;
          }
          setPaymentUrl(paymentResponse.data.iframe_url);
        } else {
          Toast.show({
            type: 'error',
            text1: t('error'),
            text2: t('failed_to_initiate_payment') || 'Failed to initiate payment',
          });
        }
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: error.response?.data?.error || t('failed_to_create_booking') || 'Failed to create booking',
      });
    } finally {
      setIsBooking(false);
    }
  };

  const completePaymentManually = async (bookingId: number, success: boolean) => {
    try {
      const token = await tokenStorage.getItem('access_token');
      await api.post('booking/complete-payment/', {
        booking_id: bookingId,
        success: success
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Manual completion error:', error);
    }
  };

  const handleWebViewNavigationStateChange = (navState: any) => {
    const { url } = navState;
    if (url.includes('success=true')) {
      setPaymentUrl(null);
      if (currentBookingId) {
        completePaymentManually(currentBookingId, true);
      }
      // Keep Alert here since it needs callback for navigation
      Alert.alert(
        'Booking Successful!',
        `Your booking with ${lecturer?.lecturer_name} has been confirmed.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else if (url.includes('success=false')) {
      setPaymentUrl(null);
      if (currentBookingId) {
        completePaymentManually(currentBookingId, false);
      }
      Toast.show({
        type: 'error',
        text1: t('payment_failed'),
        text2: t('payment_failed_msg') || 'Payment failed. Please try again.',
      });
    }
  };

  // Show error screen if we don't have a valid lecturer ID
  if (!isValidLecturerId) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Invalid Lecturer ID</Text>
          <Text style={styles.errorText}>The lecturer ID is missing or invalid.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (paymentUrl) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setPaymentUrl(null)} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 40 }} />
        </View>
        <WebView
          source={{ uri: paymentUrl }}
          style={{ flex: 1 }}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          startInLoadingState={true}
          renderLoading={() => <ActivityIndicator size="large" color="#3498db" style={StyleSheet.absoluteFill} />}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!lecturer) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <Text style={styles.errorText}>Lecturer not found</Text>
      </View>
    );
  }

  const duration = calculateDuration();
  const totalAmount = calculateTotalAmount();

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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Session</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Lecturer Info */}
        <View style={styles.lecturerCard}>
          <View style={styles.lecturerHeader}>
            <ProfilePicture
              imageUrl={lecturer.lecturer_profile_picture}
              firstName={lecturer.lecturer.first_name}
              lastName={lecturer.lecturer.last_name}
              size={80}
            />
            <View style={styles.lecturerInfo}>
              <Text style={styles.lecturerName}>{lecturer.lecturer_name}</Text>
              <Text style={styles.lecturerSpeciality}>{lecturer.speciality}</Text>
              <View style={styles.lecturerStats}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#f39c12" />
                  <Text style={styles.ratingText}>{typeof lecturer.rating === 'number' ? lecturer.rating.toFixed(1) : typeof lecturer.rating === 'string' ? parseFloat(lecturer.rating).toFixed(1) : '0.0'}</Text>
                  <Text style={styles.reviewsText}>({lecturer.total_reviews || 0} reviews)</Text>
                </View>
                <Text style={styles.hourlyRate}>{formatPrice(lecturer.hourly_rate)}/hr</Text>
              </View>
            </View>
          </View>

          {lecturer.bio && (
            <Text style={styles.bioText}>{lecturer.bio}</Text>
          )}

          {/* Reviews Section */}
          {lecturer.reviews && lecturer.reviews.length > 0 && (
            <View style={styles.reviewsSection}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              {lecturer.reviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.student_name}</Text>
                    <View style={styles.reviewRating}>
                      <Ionicons name="star" size={14} color="#f39c12" />
                      <Text style={styles.reviewRatingText}>{review.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>
                    {formatDate(review.created_at)}
                  </Text>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Booking Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date</Text>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              minimumDate={new Date()}
              placeholder="Select booking date"
            />
          </View>

          <View style={styles.timeContainer}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Start Time</Text>
              <TimePicker
                value={selectedStartTime}
                onChange={handleStartTimeChange}
                placeholder="Start Time"
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>
                {selectedPaymentType === 'hourly' ? 'Number of Hours' :
                  selectedPaymentType === 'class' ? 'Number of Classes' :
                    selectedPaymentType === 'term' ? 'Number of Terms' : 'Quantity'}
              </Text>
              <TextInput
                style={styles.textInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#95a5a6"
                editable={selectedPaymentType !== 'demo'}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.textInput}
              value={bookingForm.subject}
              onChangeText={(text) => updateBookingField('subject', text)}
              placeholder="What would you like to learn?"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={bookingForm.notes}
              onChangeText={(text) => updateBookingField('notes', text)}
              placeholder="Any specific topics or questions you'd like to cover?"
              placeholderTextColor="#95a5a6"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Payment Options */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Payment Option</Text>
            <View style={styles.paymentOptionsContainer}>
              {lecturer.show_hourly_rate && (
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    selectedPaymentType === 'hourly' && styles.paymentOptionSelected
                  ]}
                  onPress={() => setSelectedPaymentType('hourly')}
                >
                  <Text style={[styles.paymentOptionTitle, selectedPaymentType === 'hourly' && styles.paymentOptionTitleSelected]}>Hourly</Text>
                  <Text style={[styles.paymentOptionPrice, selectedPaymentType === 'hourly' && styles.paymentOptionPriceSelected]}>{formatPrice(lecturer.hourly_rate)}/hr</Text>
                </TouchableOpacity>
              )}

              {lecturer.show_class_rate && lecturer.class_rate > 0 && (
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    selectedPaymentType === 'class' && styles.paymentOptionSelected
                  ]}
                  onPress={() => setSelectedPaymentType('class')}
                >
                  <Text style={[styles.paymentOptionTitle, selectedPaymentType === 'class' && styles.paymentOptionTitleSelected]}>Class Price</Text>
                  <Text style={[styles.paymentOptionPrice, selectedPaymentType === 'class' && styles.paymentOptionPriceSelected]}>{formatPrice(lecturer.class_rate)}</Text>
                  <Text style={styles.paymentOptionDesc}>Flat fee per session</Text>
                </TouchableOpacity>
              )}

              {lecturer.show_term_rate && lecturer.term_rate > 0 && (
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    selectedPaymentType === 'term' && styles.paymentOptionSelected
                  ]}
                  onPress={() => setSelectedPaymentType('term')}
                >
                  <Text style={[styles.paymentOptionTitle, selectedPaymentType === 'term' && styles.paymentOptionTitleSelected]}>Term Price</Text>
                  <Text style={[styles.paymentOptionPrice, selectedPaymentType === 'term' && styles.paymentOptionPriceSelected]}>{formatPrice(lecturer.term_rate)}</Text>
                  <Text style={styles.paymentOptionDesc}>Full term package</Text>
                </TouchableOpacity>
              )}

              {lecturer.is_demo_offered && (
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    selectedPaymentType === 'demo' && styles.paymentOptionSelected,
                    { borderColor: '#2ecc71' }
                  ]}
                  onPress={() => setSelectedPaymentType('demo')}
                >
                  <Text style={[styles.paymentOptionTitle, selectedPaymentType === 'demo' && styles.paymentOptionTitleSelected]}>Demo Session</Text>
                  <Text style={[styles.paymentOptionPrice, selectedPaymentType === 'demo' && styles.paymentOptionPriceSelected]}>
                    {Number(lecturer.demo_price) > 0 ? formatPrice(lecturer.demo_price) : 'Free'}
                  </Text>
                  <Text style={styles.paymentOptionDesc}>Try a session first</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Booking Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>
              {selectedPaymentType === 'hourly' ? 'Duration:' : 'Quantity:'}
            </Text>
            <Text style={styles.summaryValue}>
              {quantity} {selectedPaymentType === 'hourly' ? 'hours' :
                selectedPaymentType === 'class' ? 'classes' :
                  selectedPaymentType === 'term' ? 'terms' : ''}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Rate:</Text>
            <Text style={styles.summaryValue}>{formatPrice(lecturer.hourly_rate)}/hour</Text>
          </View>

          <View style={[styles.summaryItem, styles.totalItem]}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>{formatPrice(totalAmount)}</Text>
          </View>
        </View>

        {/* Book Button */}
        <TouchableOpacity
          style={[
            styles.bookButton,
            (isBooking || !selectedDate || !selectedStartTime || !bookingForm.subject || !quantity) && styles.bookButtonDisabled
          ]}
          onPress={handleBooking}
          disabled={isBooking || !selectedDate || !selectedStartTime || !bookingForm.subject || !quantity}
        >
          {isBooking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name={(selectedDate && selectedStartTime && bookingForm.subject) ? "card" : "lock-closed"} size={20} color="#fff" />
              <Text style={styles.bookButtonText}>
                {(selectedDate && selectedStartTime && bookingForm.subject) ? "Pay & Book Session" : "Complete Details to Book"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lecturerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  lecturerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  lecturerInfo: {
    marginStart: 15,
    flex: 1,
  },
  lecturerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  lecturerSpeciality: {
    fontSize: 16,
    color: '#3498db',
    marginBottom: 8,
  },
  lecturerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginStart: 4,
  },
  reviewsText: {
    color: '#95a5a6',
    fontSize: 14,
    marginStart: 4,
  },
  hourlyRate: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: '600',
  },
  bioText: {
    color: '#bdc3c7',
    fontSize: 14,
    lineHeight: 20,
  },
  reviewsSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 15,
  },
  reviewItem: {
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRatingText: {
    color: '#fff',
    fontSize: 12,
    marginStart: 4,
    fontWeight: 'bold',
  },
  reviewDate: {
    color: '#95a5a6',
    fontSize: 12,
    marginBottom: 6,
  },
  reviewComment: {
    color: '#bdc3c7',
    fontSize: 14,
    lineHeight: 20,
  },

  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  timeField: {
    flex: 1,
  },
  summarySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#bdc3c7',
  },
  summaryValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  totalItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 15,
    marginTop: 15,
  },
  totalLabel: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 8,
  },
  warningText: {
    color: '#f39c12',
    fontSize: 14,
    marginStart: 8,
  },
  bookButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 15,
    marginBottom: 30,
  },
  bookButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginStart: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#bdc3c7',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentOptionsContainer: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  paymentOptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '30%',
    minWidth: 100,
    alignItems: 'center',
  },
  paymentOptionSelected: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    borderColor: '#3498db',
  },
  paymentOptionTitle: {
    color: '#bdc3c7',
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  paymentOptionTitleSelected: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  paymentOptionPrice: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  paymentOptionPriceSelected: {
    color: '#fff',
  },
  paymentOptionDesc: {
    color: '#95a5a6',
    fontSize: 10,
    textAlign: 'center',
  },
});

export default BookLecturerScreen;