// Centralized API configuration for Frontend (Student App)
// Fallback to localhost if env var is missing (e.g. during test/dev without .env)
const BASE = process.env.EXPO_PUBLIC_CHAT_BASE_URL;
const ACCOUNTS_BASE = process.env.EXPO_PUBLIC_ACCOUNTS_BASE_URL || `${BASE}accounts/`;

export const API_CONFIG = {
  // Base URLs
  BASE_URL: BASE,
  ACCOUNTS_BASE_URL: ACCOUNTS_BASE,
  CHAT_BASE_URL: BASE,
  VIDEOS_BASE_URL: `${BASE}videos/`,

  // Timeout settings
  TIMEOUT: 30000, // 30 seconds

  // Endpoints
  ENDPOINTS: {
    LOGIN: 'api/token/',
    REGISTER: 'register/',
    REFRESH_TOKEN: 'api/token/refresh/',
    USER_ID: 'userID/',
    USER_PROFILE: 'profile/',
    PROFILE_PICTURE: 'profile-picture/',
    // Student endpoints
    STUDENT_INVITATIONS: 'student/invitations/',
    STUDENT_CLASS_INVITATIONS: 'student/class-invitations/',
    STUDENT_GROUP_INVITATIONS: 'student/group-invitations/',
    STUDENT_INTAKES: 'student/intakes/',
    STUDENT_INTAKE_ACCESS: 'student/intakes/', // append :id/access/
    STUDENT_CLASSES: 'student/classes/',
    STUDENT_CLASS_ACCESS: 'student/classes/', // append :id/access/
    STUDENT_GROUPS: 'student/groups/',
    STUDENT_GROUP_ACCESS: 'student/groups/', // append :id/access/
    // Chat endpoints - relative to Root (Note: Consumed with BASE_URL prefix in home.tsx)
    CHAT_ROOMS: 'chat/rooms/',
    CHAT_MESSAGES: 'chat/rooms/',
    ANNOUNCEMENTS: 'chat/announcements/',
    // Lecturer directory endpoints
    LECTURER_DIRECTORY: 'lecturer-directory/',
    LECTURER_BOOKINGS: 'lecturer/bookings/',
    // Attendance endpoints
    SUBMIT_ATTENDANCE: 'student/submit-attendance/',
    STUDENT_ATTENDANCE_STATISTICS: 'student/attendance-statistics/',
    CLASS_ATTENDANCE_CALENDAR: 'student/classes/', // Append {id}/attendance-calendar/
    GAMIFICATION_STATS: 'student/gamification/',
    LEADERBOARD: 'student/leaderboard/',
    STUDENT_INSIGHTS: 'student/insights/',
    SUPPORT_TICKETS: 'support-tickets/',
    DEMO_INTAKES: 'student/intakes/demo/',
  }
};

// Axios instance configurationr
export const axiosConfig = {
  baseURL: API_CONFIG.ACCOUNTS_BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
};

import axios from 'axios';
import { tokenStorage } from '../utils/storage';

const api = axios.create(axiosConfig);

// Add request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;