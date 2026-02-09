import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,

  Linking,
  I18nManager
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../src/utils/storage';
import ProfilePicture from '../src/components/ProfilePicture';
import Toast from 'react-native-toast-message';
import { API_CONFIG } from '../src/config/api';
import api from '../utils/api';
import { useLocalization } from '../src/context/LocalizationContext';
import { formatDate } from '../src/utils/date';

interface Lecturer {
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
  region: string; // Add region to interface
  speciality: string;
  hourly_rate: string; // This is a string in the API response
  availability_status: string;
  is_verified: boolean;
  rating: string; // This is a string in the API response
  total_reviews: number;
  // Detailed profile fields (will be loaded when expanded)
  bio?: string;
  experience_years?: number;
  education?: string;
  working_hours?: string;
  languages?: string;
  certifications?: string;
  achievements?: string;
  teaching_style?: string;
  subjects_taught?: string;
  portfolio_website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  // Reviews (will be loaded when expanded)
  reviews?: LecturerReview[];
}

interface LecturerReview {
  id: number;
  student: {
    id: number;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
  student_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

const LecturerDirectoryScreen = () => {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [filteredLecturers, setFilteredLecturers] = useState<Lecturer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLecturer, setExpandedLecturer] = useState<Lecturer | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<number | null>(null);
  const [loadingReviews, setLoadingReviews] = useState<number | null>(null);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedLecturerReviews, setSelectedLecturerReviews] = useState<LecturerReview[]>([]);

  // Filter States
  const [showDemoOnly, setShowDemoOnly] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [showHourly, setShowHourly] = useState(false);
  const [showClass, setShowClass] = useState(false);
  const [showTerm, setShowTerm] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null); // 'SA', 'AE', 'EG' or null
  const [sortBy, setSortBy] = useState('rating_high_low'); // default sort
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const { formatPrice, region: userRegion, convertPrice, formatPriceForRegion } = useLocalization();

  useEffect(() => {
    loadLecturers();
  }, [showDemoOnly, showVerifiedOnly, showHourly, showClass, showTerm, sortBy, selectedRegion]); // Reload when filters change

  useEffect(() => {
    filterLecturers();
  }, [searchQuery, lecturers]);

  const loadLecturers = async () => {
    setIsLoading(true);
    try {
      let url = `${API_CONFIG.ENDPOINTS.LECTURER_DIRECTORY}?`;

      // Append filters to URL
      if (showDemoOnly) url += 'demo_only=true&';
      if (showVerifiedOnly) url += 'verified_only=true&';

      const paymentTypes = [];
      if (showHourly) paymentTypes.push('hourly');
      if (showClass) paymentTypes.push('class');
      if (showTerm) paymentTypes.push('term');
      if (paymentTypes.length > 0) url += `payment_types=${paymentTypes.join(',')}&`;

      // Region Filter
      if (selectedRegion) url += `region=${selectedRegion}&`;

      if (sortBy) url += `sort_by=${sortBy}&`;

      const response = await api.get(url);
      setLecturers(response.data);
      setFilteredLecturers(response.data);
    } catch (error) {
      console.error('Error loading lecturers:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_load_lecturers') || 'Failed to load lecturers',
      });
      // Navigate back after showing error
      setTimeout(() => {
        router.back();
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };



  const loadLecturerDetails = async (lecturerId: number) => {
    try {
      setLoadingDetails(lecturerId);
      const token = await tokenStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('no_access_token') || 'No access token found',
        });
        return;
      }

      const response = await api.get(`lecturer-directory/${lecturerId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        // Update the lecturer with detailed information
        const updatedLecturers = lecturers.map(lecturer =>
          lecturer.id === lecturerId ? { ...lecturer, ...response.data } : lecturer
        );
        setLecturers(updatedLecturers);
        setFilteredLecturers(updatedLecturers);

        // Update expanded lecturer if it's the same one
        if (expandedLecturer?.id === lecturerId) {
          // Find the updated lecturer in the array and set it as expanded
          const updatedLecturer = updatedLecturers.find(l => l.id === lecturerId);
          if (updatedLecturer) {
            setExpandedLecturer(updatedLecturer);
          }
        }
      }
    } catch (error) {
      console.error('Error loading lecturer details:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_load_lecturer_details') || 'Failed to load lecturer details',
      });
    } finally {
      setLoadingDetails(null);
    }
  };

  const loadLecturerReviews = async (lecturerId: number) => {
    try {
      setLoadingReviews(lecturerId);
      const token = await tokenStorage.getItem('access_token');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('no_access_token') || 'No access token found',
        });
        return;
      }

      const response = await api.get(`lecturer/${lecturerId}/reviews/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 200) {
        // Update the lecturer with reviews
        const updatedLecturers = lecturers.map(lecturer =>
          lecturer.id === lecturerId ? { ...lecturer, reviews: response.data } : lecturer
        );
        setLecturers(updatedLecturers);
        setFilteredLecturers(updatedLecturers);

        // Update expanded lecturer if it's the same one
        if (expandedLecturer?.id === lecturerId) {
          // Find the updated lecturer in the array and set it as expanded
          const updatedLecturer = updatedLecturers.find(l => l.id === lecturerId);
          if (updatedLecturer) {
            setExpandedLecturer(updatedLecturer);
          }
        }
      }
    } catch (error) {
      console.error('Error loading lecturer reviews:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_load_reviews') || 'Failed to load lecturer reviews',
      });
    } finally {
      setLoadingReviews(null);
    }
  };

  const filterLecturers = () => {
    if (!searchQuery.trim()) {
      setFilteredLecturers(lecturers);
      return;
    }

    const filtered = lecturers.filter(lecturer =>
      lecturer.lecturer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lecturer.speciality.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredLecturers(filtered);
  };

  const handleLecturerPress = async (lecturer: Lecturer) => {
    // If already expanded, collapse it
    if (expandedLecturer?.id === lecturer.id) {
      setExpandedLecturer(null);
      return;
    }

    let updatedLecturer = lecturer;

    // If we don't have detailed info yet, load it
    if (!lecturer.bio) {
      setLoadingDetails(lecturer.id);
      try {
        const token = await tokenStorage.getItem('access_token');
        if (token) {
          const response = await api.get(`lecturer-directory/${lecturer.id}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.status === 200) {
            updatedLecturer = { ...updatedLecturer, ...response.data };

            // Update the lecturers array with detailed information
            const updatedLecturers = lecturers.map(l =>
              l.id === lecturer.id ? updatedLecturer : l
            );
            setLecturers(updatedLecturers);
            setFilteredLecturers(updatedLecturers);
          }
        }
      } catch (error) {
        console.error('Error loading lecturer details:', error);
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('failed_to_load_lecturer_details') || 'Failed to load lecturer details',
        });
      } finally {
        setLoadingDetails(null);
      }
    }

    // Load reviews if not already loaded
    if (!lecturer.reviews) {
      setLoadingReviews(lecturer.id);
      try {
        const token = await tokenStorage.getItem('access_token');
        if (token) {
          const response = await api.get(`lecturer/${lecturer.id}/reviews/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.status === 200) {
            updatedLecturer = { ...updatedLecturer, reviews: response.data };

            // Update the lecturers array with reviews
            const updatedLecturers = lecturers.map(l =>
              l.id === lecturer.id ? updatedLecturer : l
            );
            setLecturers(updatedLecturers);
            setFilteredLecturers(updatedLecturers);
          }
        }
      } catch (error) {
        console.error('Error loading lecturer reviews:', error);
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('failed_to_load_reviews') || 'Failed to load lecturer reviews',
        });
      } finally {
        setLoadingReviews(null);
      }
    }

    // Expand the lecturer with all the loaded information
    setExpandedLecturer(updatedLecturer);
  };

  const handleBookLecturer = (lecturer: Lecturer) => {
    router.push(`/book-lecturer/${lecturer.id}`);
  };

  // Add this new function for direct messaging
  const handleDirectMessage = (lecturer: Lecturer) => {
    // For now, we'll navigate to a direct message screen
    // This will be implemented as a one-on-one chat room
    router.push(`/direct-message/${lecturer.lecturer.id}`);
  };

  const showAllReviews = (lecturer: Lecturer) => {
    if (lecturer.reviews) {
      setSelectedLecturerReviews(lecturer.reviews);
      setShowAllReviewsModal(true);
    }
  };

  const renderDetailItem = (label: string, value: string | number | undefined) => {
    if (!value) return null;
    return (
      <View style={styles.detailItem}>
        <Text style={styles.detailLabel}>{label}:</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    );
  };

  const renderLecturerCard = ({ item }: { item: Lecturer }) => {
    const isExpanded = expandedLecturer?.id === item.id;
    const isLoadingDetails = loadingDetails === item.id;

    return (
      <View style={styles.lecturerCard}>
        <TouchableOpacity
          style={styles.lecturerHeader}
          onPress={() => handleLecturerPress(item)}
        >
          <View style={styles.lecturerInfo}>
            <ProfilePicture
              imageUrl={item.lecturer_profile_picture}
              firstName={item.lecturer.first_name}
              lastName={item.lecturer.last_name}
              size={60}
            />
            <View style={styles.lecturerDetails}>
              <Text style={styles.lecturerName}>{item.lecturer_name}</Text>
              <Text style={styles.lecturerSpeciality}>{item.speciality}</Text>
              <View style={styles.lecturerStats}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#f39c12" />
                  <Text style={styles.ratingText}>{(parseFloat(item.rating || '0')).toFixed(1)}</Text>
                  <Text style={styles.reviewsText}>({item.total_reviews || 0})</Text>
                </View>
                <Text style={[styles.hourlyRate, isExpanded && styles.expandedHourlyRate]}>
                  {userRegion !== item.region ? (
                    <>
                      {formatPriceForRegion(parseFloat(item.hourly_rate), item.region)}/hr
                      <Text style={{ fontSize: 12, color: '#95a5a6', fontWeight: '400' }}>
                        {" "}(~{formatPrice(convertPrice(parseFloat(item.hourly_rate), item.region, userRegion))})
                      </Text>
                    </>
                  ) : (
                    `${formatPrice(parseFloat(item.hourly_rate))}/hr`
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.lecturerActions}>
              <View style={styles.badgeContainer}>
                {item.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#fff" />
                    <Text style={styles.verifiedText}>{t('verified')}</Text>
                  </View>
                )}
                <View style={[styles.availabilityBadge,
                item.availability_status === 'available' ? styles.availableBadge : styles.unavailableBadge
                ]}>
                  <Text style={styles.availabilityText}>
                    {item.availability_status === 'available' ? t('available') : t('busy')}
                  </Text>
                </View>
              </View>
              {isLoadingDetails ? (
                <ActivityIndicator size="small" color="#95a5a6" />
              ) : (
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#95a5a6"
                />
              )}
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Bio */}
            {item.bio && (
              <View style={styles.bioSection}>
                <Text style={styles.sectionTitle}>{t('about')}</Text>
                <Text style={styles.bioText}>{item.bio}</Text>
              </View>
            )}

            {/* Professional Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>{t('professional_profile')}</Text>

              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={20} color="#3498db" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('experience')}</Text>
                  <Text style={styles.infoValue}>{item.experience_years} {t('years')}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={20} color="#3498db" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('education')}</Text>
                  <Text style={styles.infoValue}>{item.education}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="language-outline" size={20} color="#3498db" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('languages')}</Text>
                  <Text style={styles.infoValue}>{item.languages}</Text>
                </View>
              </View>
              {renderDetailItem(t('subjects_taught'), item.subjects_taught)}
              {renderDetailItem(t('teaching_style'), item.teaching_style)}
              {renderDetailItem(t('working_hours'), item.working_hours)}

              {item.certifications && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t('certifications')}:</Text>
                  <Text style={styles.detailValue}>{item.certifications}</Text>
                </View>
              )}

              {item.achievements && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t('achievements')}:</Text>
                  <Text style={styles.detailValue}>{item.achievements}</Text>
                </View>
              )}
            </View>

            {/* Social Links */}
            {(item.portfolio_website || item.linkedin_url || item.twitter_url || item.youtube_url) && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>{t('connect')}</Text>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                  {item.portfolio_website && (
                    <TouchableOpacity onPress={() => Linking.openURL(item.portfolio_website!)}>
                      <Ionicons name="globe-outline" size={24} color="#3498db" />
                    </TouchableOpacity>
                  )}
                  {item.linkedin_url && (
                    <TouchableOpacity onPress={() => Linking.openURL(item.linkedin_url!)}>
                      <Ionicons name="logo-linkedin" size={24} color="#0077b5" />
                    </TouchableOpacity>
                  )}
                  {item.twitter_url && (
                    <TouchableOpacity onPress={() => Linking.openURL(item.twitter_url!)}>
                      <Ionicons name="logo-twitter" size={24} color="#1da1f2" />
                    </TouchableOpacity>
                  )}
                  {item.youtube_url && (
                    <TouchableOpacity onPress={() => Linking.openURL(item.youtube_url!)}>
                      <Ionicons name="logo-youtube" size={24} color="#ff0000" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.enquireButton]}
                onPress={() => handleDirectMessage(item)}
              >
                <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>{t('enquire')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.bookButton]}
                onPress={() => handleBookLecturer(item)}
              >
                <Ionicons name="calendar" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>{t('book_session')}</Text>
              </TouchableOpacity>
            </View>

            {/* Reviews Section */}
            <View style={styles.reviewsSection}>
              <Text style={styles.sectionTitle}>{t('student_reviews')}</Text>
              {loadingReviews === item.id ? (
                <ActivityIndicator size="small" color="#3498db" style={styles.reviewLoading} />
              ) : item.reviews && item.reviews.length > 0 ? (
                <>
                  {item.reviews.slice(0, 3).map(renderReviewItem)}
                  {item.reviews.length > 3 && (
                    <TouchableOpacity
                      style={styles.viewMoreButton}
                      onPress={() => showAllReviews(item)}
                    >
                      <Text style={styles.viewMoreText}>{t('view_all_reviews', { count: item.reviews.length })}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#3498db" />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={styles.noReviewsText}>{t('no_reviews_yet')}</Text>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderReviewItem = (review: LecturerReview) => {
    return (
      <View key={review.id} style={styles.reviewItem}>
        <View style={styles.reviewHeader}>
          <ProfilePicture
            imageUrl={review.student.profile_picture_url}
            firstName={review.student.first_name}
            lastName={review.student.last_name}
            size={40}
          />
          <View style={styles.reviewInfo}>
            <Text style={styles.reviewStudentName}>{review.student_name}</Text>
            <View style={styles.reviewRating}>
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < review.rating ? "star" : "star-outline"}
                  size={14}
                  color={i < review.rating ? "#f39c12" : "#95a5a6"}
                />
              ))}
            </View>
          </View>
        </View>
        <Text style={styles.reviewComment}>{review.comment}</Text>
        <Text style={styles.reviewDate}>
          {formatDate(review.created_at)}
        </Text>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>{t('lecturer_directory')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#95a5a6" />
          <TextInput
            style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('search_lecturers')}
            placeholderTextColor="#95a5a6"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersWrapper}>
        {/* Top Row: Sort + Regions */}
        <View style={styles.filterTopRow}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons name="filter" size={16} color="#ecf0f1" />
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={[styles.filterChip, selectedRegion === null && styles.activeFilterChip]}
                onPress={() => setSelectedRegion(null)}
              >
                <Text style={[styles.filterChipText, selectedRegion === null && styles.activeFilterChipText]}>{t('all')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedRegion === 'SA' && styles.activeFilterChip]}
                onPress={() => setSelectedRegion(selectedRegion === 'SA' ? null : 'SA')}
              >
                <Text style={[styles.filterChipText, selectedRegion === 'SA' && styles.activeFilterChipText]}>🇸🇦 {t('ksa')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedRegion === 'AE' && styles.activeFilterChip]}
                onPress={() => setSelectedRegion(selectedRegion === 'AE' ? null : 'AE')}
              >
                <Text style={[styles.filterChipText, selectedRegion === 'AE' && styles.activeFilterChipText]}>🇦🇪 {t('uae')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedRegion === 'EG' && styles.activeFilterChip]}
                onPress={() => setSelectedRegion(selectedRegion === 'EG' ? null : 'EG')}
              >
                <Text style={[styles.filterChipText, selectedRegion === 'EG' && styles.activeFilterChipText]}>🇪🇬 {t('egypt')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Bottom Row: Type Filters */}
        <View style={styles.typeFiltersContainer}>
          <TouchableOpacity
            style={[styles.filterChip, showDemoOnly && styles.activeFilterChip]}
            onPress={() => setShowDemoOnly(!showDemoOnly)}
          >
            <Text style={[styles.filterText, showDemoOnly && styles.activeFilterText]}>{t('demo_only')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, showVerifiedOnly && styles.activeFilterChip]}
            onPress={() => setShowVerifiedOnly(!showVerifiedOnly)}
          >
            <Text style={[styles.filterText, showVerifiedOnly && styles.activeFilterText]}>{t('verified_only')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, showHourly && styles.activeFilterChip]}
            onPress={() => setShowHourly(!showHourly)}
          >
            <Text style={[styles.filterText, showHourly && styles.activeFilterText]}>{t('hourly')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, showClass && styles.activeFilterChip]}
            onPress={() => setShowClass(!showClass)}
          >
            <Text style={[styles.filterText, showClass && styles.activeFilterText]}>{t('class')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, showTerm && styles.activeFilterChip]}
            onPress={() => setShowTerm(!showTerm)}
          >
            <Text style={[styles.filterText, showTerm && styles.activeFilterText]}>{t('term')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={filteredLecturers}
        renderItem={renderLecturerCard}
        keyExtractor={(item) => item.id.toString()}
        extraData={expandedLecturer}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#95a5a6" />
            <Text style={styles.emptyText}>{t('no_lecturers_found')}</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? t('try_adjusting_search') : t('check_back_later_lecturers')}
            </Text>
          </View>
        }
      />

      {/* All Reviews Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAllReviewsModal}
        onRequestClose={() => setShowAllReviewsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('all_reviews')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAllReviewsModal(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedLecturerReviews}
              renderItem={({ item }) => renderReviewItem(item)}
              keyExtractor={(item) => item.id.toString()}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Sort Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSortModal}
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <Text style={styles.modalTitle}>Sort By</Text>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => { setSortBy('rating_high_low'); setShowSortModal(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === 'rating_high_low' && styles.activeSortOptionText]}>Recommended (Highest Rated)</Text>
              {sortBy === 'rating_high_low' && <Ionicons name="checkmark" size={20} color="#3498db" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => { setSortBy('rating_low_high'); setShowSortModal(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === 'rating_low_high' && styles.activeSortOptionText]}>Lowest Rated</Text>
              {sortBy === 'rating_low_high' && <Ionicons name="checkmark" size={20} color="#3498db" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => { setSortBy('price_high_low'); setShowSortModal(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === 'price_high_low' && styles.activeSortOptionText]}>Price: High to Low</Text>
              {sortBy === 'price_high_low' && <Ionicons name="checkmark" size={20} color="#3498db" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              onPress={() => { setSortBy('price_low_high'); setShowSortModal(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === 'price_low_high' && styles.activeSortOptionText]}>Price: Low to High</Text>
              {sortBy === 'price_low_high' && <Ionicons name="checkmark" size={20} color="#3498db" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginStart: 10,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0,
  },
  filtersWrapper: {
    marginBottom: 10,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  filterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  typeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3498db',
    marginEnd: 10,
  },
  sortModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sortOptionText: {
    color: '#bdc3c7',
    fontSize: 16,
  },
  activeSortOptionText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  activeFilterChip: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    borderColor: '#3498db',
  },
  filterText: {
    color: '#95a5a6',
    fontSize: 13,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 5,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  lecturerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  lecturerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  lecturerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lecturerDetails: {
    marginStart: 15,
    flex: 1,
  },
  lecturerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  lecturerSpeciality: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    marginStart: 4,
  },
  reviewsText: {
    color: '#95a5a6',
    fontSize: 12,
    marginStart: 4,
  },
  hourlyRate: {
    color: '#27ae60',
    fontSize: 14,
    fontWeight: '600',
  },
  lecturerActions: {
    alignItems: 'flex-end',
  },

  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 5,
  },
  availableBadge: {
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
  },
  unavailableBadge: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  availabilityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
  },
  bioSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 10,
  },
  bioText: {
    color: '#bdc3c7',
    fontSize: 14,
    lineHeight: 20,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailItem: {
    marginBottom: 8,
  },
  detailLabel: {
    color: '#95a5a6',
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2f3136', // Discord-like dark button
  },
  enquireButton: {
    backgroundColor: '#5865F2', // Discord blurple for messaging
  },
  bookButton: {
    backgroundColor: '#3ba55d', // Discord green for booking
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginStart: 6,
  },
  reviewsSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 15,
    marginTop: 15,
  },
  reviewItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewInfo: {
    marginStart: 10,
  },
  reviewStudentName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewRating: {
    flexDirection: 'row',
    marginTop: 4,
  },
  reviewComment: {
    color: '#bdc3c7',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewDate: {
    color: '#95a5a6',
    fontSize: 12,
  },
  reviewLoading: {
    marginVertical: 10,
  },
  noReviewsText: {
    color: '#95a5a6',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewMoreText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
    marginEnd: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalList: {
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },

  filterScroll: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterGroupLabel: {
    color: '#bdc3c7',
    marginEnd: 8,
    fontSize: 12,
  },

  filterChipText: {
    color: '#bdc3c7',
    fontSize: 12,
  },
  activeFilterChipText: {
    color: '#3498db',
    fontWeight: '600',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  expandedHourlyRate: {
    fontSize: 18,
    marginTop: 5,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoContent: {
    marginStart: 12,
    flex: 1,
  },
  infoLabel: {
    color: '#95a5a6',
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '500',
  },


});

export default LecturerDirectoryScreen;