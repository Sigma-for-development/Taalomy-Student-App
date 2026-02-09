import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  I18nManager,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../src/config/api';
import api from '../utils/api';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

// Define interfaces for our data types
interface Class {
  id: number;
  name: string;
  description: string;
}

interface Group {
  id: number;
  name: string;
  description: string;
  class_name: string;
}

const SubmitAttendanceScreen = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [attendanceCode, setAttendanceCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We no longer need to fetch classes/groups as the backend detects them from the code

  const submitAttendance = async () => {
    if (!attendanceCode.trim() || attendanceCode.length !== 3) {
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('valid_code_required'),
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const requestData = {
        attendance_code: attendanceCode
      };

      const response = await api.post(API_CONFIG.ENDPOINTS.SUBMIT_ATTENDANCE, requestData);

      if (response.status === 201) {
        Toast.show({
          type: 'success',
          text1: t('success'),
          text2: t('attendance_submitted_success'),
        });
        // Navigate back after showing success toast
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      const errorMessage = error.response?.data?.error || t('failed_submit_attendance');
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('submit_attendance')}</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {/* Main Input Section */}
          <View style={styles.fixedInputSection}>

            <View style={styles.iconContainer}>
              <Ionicons name="scan-circle-outline" size={80} color="#3498db" />
            </View>

            <Text style={styles.instructionTextMain}>
              {t('enter_attendance_code')}
            </Text>

            {/* Attendance Code Input */}
            <View style={styles.section}>
              <View style={styles.codeInputContainer}>
                <TextInput
                  style={styles.codeInput}
                  value={attendanceCode}
                  onChangeText={setAttendanceCode}
                  placeholder="000"
                  placeholderTextColor="#555"
                  keyboardType="numeric"
                  maxLength={3}
                  autoFocus
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (attendanceCode.length !== 3 || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={submitAttendance}
              disabled={attendanceCode.length !== 3 || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                  <Text style={styles.submitButtonText}>{t('submit_code')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Note at bottom */}
          <View style={styles.noteContainer}>
            <Text style={styles.note}>
              {t('detect_class_group')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 30,
    justifyContent: 'flex-start', // Moved from center to flex-start
    paddingTop: 30, // Reduced padding to shrink gap
    paddingBottom: 40,
  },
  fixedInputSection: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 40, // Space between input section and note
  },
  iconContainer: {
    marginBottom: 30,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  instructionTextMain: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  section: {
    width: '100%',
    marginBottom: 30,
  },
  codeInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  codeInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 10,
  },
  submitButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 15,
    width: '100%',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginStart: 10,
  },
  noteContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  note: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});

export default SubmitAttendanceScreen;