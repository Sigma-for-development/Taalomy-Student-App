import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
  FlatList,
  I18nManager,
  NativeModules,
  Image
} from 'react-native';

import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '../src/utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ProfilePicture from '../src/components/ProfilePicture';
import { appEventEmitter } from '../src/utils/eventEmitter';
import axios from 'axios';
import { API_CONFIG } from '../src/config/api';
import api from '../utils/api';
import { ensureUserDataIsUpToDate } from '../src/utils/profilePicture';
import ClassAttendanceCalendar from '../src/components/ClassAttendanceCalendar';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import * as Updates from 'expo-updates';
import { formatDate } from '../src/utils/date';
const { width } = Dimensions.get('window');

interface UserData {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  date_of_birth?: string;
  phone_number?: string;
  address?: string;
  profile_picture_url?: string;
}

interface ClassData {
  id: number;
  name: string;
  description: string;
  venue?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: string | string[]; // Can be either string or array
  // Add other fields as needed
}

interface GroupData {
  id: number;
  name: string;
  description: string;
  venue?: string;
  start_time?: string;
  end_time?: string;
  days_of_week?: string | string[]; // Can be either string or array
  // Add other fields as needed
}



type TabType = 'dashboard' | 'attendance' | 'timetable' | 'messages' | 'profile';

// Professional Icon Components
const DashboardIcon = ({ active }: { active: boolean }) => (
  <View style={[styles.tabIconContainer, active && styles.activeTabIconContainer]}>
    <Ionicons
      name="analytics-outline"
      size={20}
      color={active ? '#3498db' : '#95a5a6'}
    />
  </View>
);

const AttendanceIcon = ({ active }: { active: boolean }) => (
  <View style={[styles.tabIconContainer, active && styles.activeTabIconContainer]}>
    <Ionicons
      name="checkmark-circle-outline"
      size={20}
      color={active ? '#3498db' : '#95a5a6'}
    />
  </View>
);

const TimetableIcon = ({ active }: { active: boolean }) => (
  <View style={[styles.tabIconContainer, active && styles.activeTabIconContainer]}>
    <Ionicons
      name="calendar-outline"
      size={20}
      color={active ? '#3498db' : '#95a5a6'}
    />
  </View>
);

const MessagesIcon = ({ active }: { active: boolean }) => (
  <View style={[styles.tabIconContainer, active && styles.activeTabIconContainer]}>
    <Ionicons
      name="chatbubbles-outline"
      size={20}
      color={active ? '#3498db' : '#95a5a6'}
    />
  </View>
);

const ProfileIcon = ({ active }: { active: boolean }) => (
  <View style={[styles.tabIconContainer, active && styles.activeTabIconContainer]}>
    <Ionicons
      name="person-outline"
      size={20}
      color={active ? '#3498db' : '#95a5a6'}
    />
  </View>
);

const Home = () => {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const profilePictureRef = useRef(null);

  // Student data states
  const [intakeInvitations, setIntakeInvitations] = useState<any[]>([]);
  const [classInvitations, setClassInvitations] = useState<any[]>([]);
  const [groupInvitations, setGroupInvitations] = useState<any[]>([]);
  const [intakes, setIntakes] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);


  useEffect(() => {
    loadUserData();
  }, []);

  // Add focus effect to refresh when user returns to this screen
  useFocusEffect(
    useCallback(() => {
      // Add a small delay to ensure the server has processed the mark_read event
      const timer = setTimeout(() => {
        // Refresh student data when user returns to the screen
        if (userData?.user_type === 'student') {
          loadStudentData();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }, [userData])
  );

  // Listen for profile updates across the app
  useEffect(() => {
    const handleProfileUpdate = (updatedUserData: any) => {
      console.log('Received profile update event:', updatedUserData);
      setUserData(updatedUserData);
    };

    // Add event listener
    appEventEmitter.on('userProfileUpdated', handleProfileUpdate);

    // Cleanup
    return () => {
      appEventEmitter.off('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (userData?.user_type === 'student') {
      loadStudentData();
    }
  }, [userData]);

  const loadUserData = async () => {
    try {
      const accessToken = await tokenStorage.getItem('access_token');
      if (!accessToken) {
        router.replace('/login');
        return;
      }

      // Ensure user data is up-to-date from server
      // This will also fetch and store user data if it's missing locally
      const updatedUserData = await ensureUserDataIsUpToDate();
      if (updatedUserData) {
        console.log('Loaded updated user data:', updatedUserData);
        setUserData(updatedUserData);
      } else {
        // Fallback to loading from AsyncStorage
        const userDataString = await AsyncStorage.getItem('user_data');
        if (userDataString) {
          const parsedUserData = JSON.parse(userDataString);
          console.log('Loaded user data from AsyncStorage:', parsedUserData);
          setUserData(parsedUserData);
        } else {
          // Both server fetch and local storage failed - clear tokens and redirect to login
          console.log('No user data found - clearing tokens and redirecting to login');
          Toast.show({
            type: 'error',
            text1: t('error'),
            text2: t('no_user_data_found') || 'No user data found. Please login again.',
          });
          // Clear tokens to prevent infinite loop
          await tokenStorage.deleteItem('access_token');
          await tokenStorage.deleteItem('refresh_token');
          await AsyncStorage.removeItem('user_data');
          router.replace('/login');
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_load_user_data') || 'Failed to load user data',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudentData = async () => {
    try {
      // Execute all requests in parallel using Promise.all
      // efficient and faster than serial awaits
      const [
        invitationsRes,
        intakesRes,
        classesRes,
        groupsRes
      ] = await Promise.all([
        api.get(API_CONFIG.ENDPOINTS.STUDENT_INVITATIONS),
        api.get(API_CONFIG.ENDPOINTS.STUDENT_INTAKES),
        api.get(API_CONFIG.ENDPOINTS.STUDENT_CLASSES),
        api.get(API_CONFIG.ENDPOINTS.STUDENT_GROUPS)
      ]);

      const allInvitations = invitationsRes.data || [];
      // Only show pending invitations on the dashboard home screen
      setIntakeInvitations(allInvitations.filter((inv: any) => inv.invitation_type === 'intake' && inv.status === 'pending'));
      setClassInvitations(allInvitations.filter((inv: any) => inv.invitation_type === 'class' && inv.status === 'pending'));
      setGroupInvitations(allInvitations.filter((inv: any) => inv.invitation_type === 'group' && inv.status === 'pending'));

      setIntakes(intakesRes.data);
      setClasses(classesRes.data);
      setGroups(groupsRes.data);

      // Load chat rooms (non-blocking for main content)
      loadStudentChatRooms();

    } catch (error) {
      console.error('Error loading student data:', error);
      // Optional: Add more granular error handling here
    } finally {
      setLoading(false);
    }
  };

  // Add function to load chat rooms for students
  // Add function to load chat rooms for students
  const loadStudentChatRooms = async () => {
    try {
      // Use centralized api instance (handles token automatically)
      const response = await api.get(API_CONFIG.ENDPOINTS.CHAT_ROOMS);
      console.log('Student chat rooms:', response.data);
      // We could store these in state if needed for UI elements
    } catch (error) {
      console.error('Error loading student chat rooms:', error);
    }
  };

  // Add function to fetch announcements
  // Add function to fetch announcements
  // Add function to fetch announcements
  const fetchAnnouncements = async (filters?: { source?: string }): Promise<Announcement[]> => {
    try {
      const url = filters?.source
        ? `${API_CONFIG.ENDPOINTS.ANNOUNCEMENTS}?source=${filters.source}`
        : API_CONFIG.ENDPOINTS.ANNOUNCEMENTS;

      // Use centralized api instance
      const response = await api.get(url);

      console.log(`[Home] Fetched announcements (source=${filters?.source || 'all'}) successfully:`, response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      return [];
    }
  };

  const handleLogout = async () => {
    try {
      await tokenStorage.deleteItem('access_token');
      await tokenStorage.deleteItem('refresh_token');
      await AsyncStorage.removeItem('user_data');
      router.replace('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_to_logout') || 'Failed to logout',
      });
    }
  };

  const toggleProfileMenu = () => {
    setProfileMenuVisible(!profileMenuVisible);
  };

  const hideProfileMenu = () => {
    setProfileMenuVisible(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            userData={userData}
            intakeInvitations={intakeInvitations}
            classInvitations={classInvitations}
            groupInvitations={groupInvitations}
            intakes={intakes}
            classes={classes}
            groups={groups}
            onRefresh={loadStudentData}
            fetchAnnouncements={fetchAnnouncements}

          />
        );
      case 'attendance':
        return <AttendanceTab userData={userData} />;
      case 'timetable':
        return <TimetableTab userData={userData} />;
      case 'messages':
        return <MessagesTab />;
      case 'profile':
        return <ProfileTab userData={userData} onLogout={handleLogout} />;
      default:
        return (
          <DashboardTab
            userData={userData}
            intakeInvitations={intakeInvitations}
            classInvitations={classInvitations}
            groupInvitations={groupInvitations}
            intakes={intakes}
            classes={classes}
            groups={groups}
            onRefresh={loadStudentData}
            fetchAnnouncements={fetchAnnouncements}

          />
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a0a', '#1a1a1a', '#2d2d2d']}
          style={styles.backgroundGradient}
        />
        <Text style={styles.loadingText}>{t('loading')}</Text>
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
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              {t('welcome', { name: userData?.first_name || 'User' })}
            </Text>
            <Text style={styles.subtitleText}>
              Academic Excellence Platform
            </Text>
          </View>
          <TouchableOpacity onPress={toggleProfileMenu} ref={profilePictureRef}>
            <ProfilePicture
              imageUrl={userData?.profile_picture_url}
              firstName={userData?.first_name || ''}
              lastName={userData?.last_name || ''}
              size={50}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
          onPress={() => setActiveTab('dashboard')}
        >
          <DashboardIcon active={activeTab === 'dashboard'} />
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
            {t('dashboard')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
          onPress={() => setActiveTab('attendance')}
        >
          <AttendanceIcon active={activeTab === 'attendance'} />
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>
            {t('attendance')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timetable' && styles.activeTab]}
          onPress={() => setActiveTab('timetable')}
        >
          <TimetableIcon active={activeTab === 'timetable'} />
          <Text style={[styles.tabText, activeTab === 'timetable' && styles.activeTabText]}>
            {t('timetable')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <MessagesIcon active={activeTab === 'messages'} />
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            {t('messages')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <ProfileIcon active={activeTab === 'profile'} />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            {t('profile')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* Profile Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={profileMenuVisible}
        onRequestClose={hideProfileMenu}
      >
        <View style={{ flex: 1 }}>
          {/* Overlay background */}
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={hideProfileMenu}
            activeOpacity={1}
          />

          {/* Menu positioned absolutely on top of overlay */}
          <View style={[styles.profileMenu, { position: 'absolute', top: 80, right: 20 }]}>
            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={() => {
                setProfileMenuVisible(false);
                router.push('/profile-edit');
              }}
            >
              <Ionicons name="person-outline" size={20} color="#ecf0f1" />
              <Text style={styles.profileMenuItemText}>{t('edit_profile')}</Text>
            </TouchableOpacity>





            <TouchableOpacity
              style={[styles.profileMenuItem, styles.logoutMenuItem]}
              onPress={() => {
                hideProfileMenu();
                handleLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
              <Text style={[styles.profileMenuItemText, styles.logoutText]}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Dashboard Tab Component
const DashboardTab = ({
  userData,
  intakeInvitations,
  classInvitations,
  groupInvitations,
  intakes,
  classes,
  groups,
  onRefresh,
  fetchAnnouncements
}: {
  userData: UserData | null;
  intakeInvitations: any[];
  classInvitations: any[];
  groupInvitations: any[];
  intakes: any[];
  classes: any[];
  groups: any[];
  onRefresh: () => void;
  fetchAnnouncements: (filters?: { source?: string }) => Promise<Announcement[]>;
}) => {
  const [loading, setLoading] = useState(false);
  const [recentAnnouncement, setRecentAnnouncement] = useState<Announcement | null>(null);

  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;

  useEffect(() => {
    loadRecentAnnouncement();
  }, []);

  const loadRecentAnnouncement = async () => {
    try {
      // Filter for admin announcements only (source='admin')
      const announcements = await fetchAnnouncements({ source: 'admin' });
      if (announcements && announcements.length > 0) {
        setRecentAnnouncement(announcements[0]);
      }
    } catch (error) {
      console.error('Error loading recent announcement:', error);
    }
  };

  const acceptIntakeInvitation = async (invitationId: number) => {
    try {
      setLoading(true);
      await api.patch(`${API_CONFIG.ENDPOINTS.STUDENT_INVITATIONS}${invitationId}/accept/`);
      Toast.show({
        type: 'success',
        text1: t('success'),
        text2: t('intake_invitation_accepted'),
      });
      onRefresh(); // Refresh data
    } catch (error) {
      console.error('Error accepting intake invitation:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_accept_intake'),
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptClassInvitation = async (invitationId: number) => {
    try {
      setLoading(true);
      await api.patch(`${API_CONFIG.ENDPOINTS.STUDENT_CLASS_INVITATIONS}${invitationId}/accept/`);

      Toast.show({
        type: 'success',
        text1: t('success'),
        text2: t('class_invitation_accepted'),
      });
      onRefresh(); // Refresh data
    } catch (error) {
      console.error('Error accepting class invitation:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_accept_class'),
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptGroupInvitation = async (invitationId: number) => {
    try {
      setLoading(true);
      await api.patch(`${API_CONFIG.ENDPOINTS.STUDENT_GROUP_INVITATIONS}${invitationId}/accept/`);

      Toast.show({
        type: 'success',
        text1: t('success'),
        text2: t('group_invitation_accepted'),
      });
      onRefresh(); // Refresh data
    } catch (error) {
      console.error('Error accepting group invitation:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_accept_group'),
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {/* Highlighted Announcement Card */}
      {recentAnnouncement && (
        <TouchableOpacity
          style={styles.announcementCard}
          onPress={() => router.push('/announcements')}
        >
          <View style={[styles.announcementHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.announcementTitle}>{t('latest_announcement')}</Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
          </View>
          <Text style={[styles.announcementContent, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
            {recentAnnouncement.content}
          </Text>
          <View style={[styles.announcementFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.announcementSender}>
              {recentAnnouncement.sender.first_name} {recentAnnouncement.sender.last_name}
            </Text>
            <Text style={styles.announcementTime}>
              {formatDate(recentAnnouncement.created_at, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </Text>
          </View>
          {recentAnnouncement.chat_room && (
            <Text style={[styles.announcementContext, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('in_context')} {recentAnnouncement.chat_room.name}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Intake Invitations Card */}
      {intakeInvitations && intakeInvitations.length > 0 && (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('pending_intake_invitations')}</Text>
          {intakeInvitations.map((invitation: any) => (
            <View key={invitation.id} style={[styles.invitationItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.invitationContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.invitationTitle}>{invitation.target_name || invitation.intake_name}</Text>
                <Text style={styles.invitationText}>
                  {t('invited_by')} {invitation.lecturer_name || (invitation.invited_by?.first_name + ' ' + invitation.invited_by?.last_name)}
                </Text>
                <Text style={styles.invitationDate}>{formatDate(invitation.created_at || invitation.invited_at)}</Text>
              </View>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => router.push('/invitations')}
              >
                <Text style={styles.acceptButtonText}>{t('view')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Class Invitations Card */}
      {classInvitations && classInvitations.length > 0 && (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('pending_class_invitations')}</Text>
          {classInvitations.map((invitation: any) => (
            <View key={invitation.id} style={[styles.invitationItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.invitationContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.invitationTitle}>{invitation.target_name || invitation.class_name}</Text>
                <Text style={styles.invitationText}>
                  {t('invited_by')} {invitation.lecturer_name || (invitation.invited_by?.first_name + ' ' + invitation.invited_by?.last_name)}
                </Text>
                <Text style={styles.invitationDate}>{formatDate(invitation.created_at || invitation.invited_at)}</Text>
              </View>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => router.push('/invitations')}
              >
                <Text style={styles.acceptButtonText}>{t('view')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Group Invitations Card */}
      {groupInvitations && groupInvitations.length > 0 && (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('pending_group_invitations')}</Text>
          {groupInvitations.map((invitation: any) => (
            <View key={invitation.id} style={[styles.invitationItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.invitationContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.invitationTitle}>{invitation.target_name || invitation.group_name}</Text>
                <Text style={styles.invitationText}>
                  {t('invited_by')} {invitation.lecturer_name || (invitation.invited_by?.first_name + ' ' + invitation.invited_by?.last_name)}
                </Text>
                <Text style={styles.invitationDate}>{formatDate(invitation.created_at || invitation.invited_at)}</Text>
              </View>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => router.push('/invitations')}
              >
                <Text style={styles.acceptButtonText}>{t('view')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Enrolled Intakes Card */}
      <View style={styles.card}>
        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.cardTitle}>{t('my_intakes')}</Text>
          {intakes && intakes.length > 5 && (
            <TouchableOpacity onPress={() => router.push('/student-intakes-all')}>
              <Text style={styles.viewAllText}>{t('view_all')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {intakes && intakes.length > 0 ? (
          intakes.slice(0, 5).map((intake: any) => (
            <TouchableOpacity
              key={intake.id}
              style={[styles.intakeItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                try {
                  api.post(`${API_CONFIG.ENDPOINTS.STUDENT_INTAKE_ACCESS}${intake.id}/access/`);
                } catch (e) {
                  console.log('Failed to update access time', e);
                }
                router.push(`/student-intake-details/${intake.id}`);
              }}
            >
              <View style={[styles.intakeIconContainer, isRTL ? { marginStart: 16, marginEnd: 0 } : {}]}>
                <Ionicons name="school-outline" size={24} color="#3498db" />
              </View>
              <View style={[styles.intakeContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.intakeName, { textAlign: isRTL ? 'right' : 'left' }]}>{intake.name}</Text>
                <Text style={[styles.intakeDescription, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{intake.description}</Text>
                <Text style={[styles.intakeStats, { textAlign: isRTL ? 'right' : 'left' }]}>{t('students_enrolled', { count: intake.current_students })}</Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('no_intakes')}</Text>
        )}
      </View>

      {/* Enrolled Classes Card */}
      <View style={styles.card}>
        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.cardTitle}>{t('my_classes')}</Text>
          {classes && classes.length > 5 && (
            <TouchableOpacity onPress={() => router.push('/student-classes-all')}>
              <Text style={styles.viewAllText}>{t('view_all')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {classes && classes.length > 0 ? (
          classes.slice(0, 5).map((cls: any) => (
            <TouchableOpacity
              key={cls.id}
              style={[styles.intakeItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                try {
                  api.post(`${API_CONFIG.ENDPOINTS.STUDENT_CLASS_ACCESS}${cls.id}/access/`);
                } catch (e) {
                  console.log('Failed to update class access time', e);
                }
                router.push(`/student-class-chat/${cls.id}`);
              }}
            >
              <View style={[styles.intakeIconContainer, isRTL ? { marginStart: 16, marginEnd: 0 } : {}]}>
                <Ionicons name="book-outline" size={24} color="#3498db" />
              </View>
              <View style={[styles.intakeContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.intakeName, { textAlign: isRTL ? 'right' : 'left' }]}>{cls.name}</Text>
                <Text style={[styles.intakeDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{cls.description}</Text>
                <Text style={[styles.intakeStats, { textAlign: isRTL ? 'right' : 'left' }]}>{t('students_enrolled', { count: cls.enrolled_count || 0 })}</Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('no_classes')}</Text>
        )}
      </View>

      {/* Enrolled Groups Card */}
      <View style={styles.card}>
        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.cardTitle}>{t('my_groups')}</Text>
          {groups && groups.length > 5 && (
            <TouchableOpacity onPress={() => router.push('/student-groups-all')}>
              <Text style={styles.viewAllText}>{t('view_all')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {groups && groups.length > 0 ? (
          groups.slice(0, 5).map((group: any) => (
            <TouchableOpacity
              key={group.id}
              style={[styles.intakeItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                try {
                  api.post(`${API_CONFIG.ENDPOINTS.STUDENT_GROUP_ACCESS}${group.id}/access/`);
                } catch (e) {
                  console.log('Failed to update group access time', e);
                }
                router.push(`/student-group-chat/${group.id}`);
              }}
            >
              <View style={[styles.intakeIconContainer, isRTL ? { marginStart: 16, marginEnd: 0 } : {}]}>
                <Ionicons name="people-outline" size={24} color="#3498db" />
              </View>
              <View style={[styles.intakeContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.intakeName, { textAlign: isRTL ? 'right' : 'left' }]}>{group.name}</Text>
                <Text style={[styles.intakeDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{group.description}</Text>
                <Text style={[styles.intakeStats, { textAlign: isRTL ? 'right' : 'left' }]}>{t('all_groups_enrolled', { count: group.enrolled_count || 0 })}</Text>
              </View>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('all_groups_empty')}</Text>
        )}
      </View>

      {/* Quiz History Card */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('quiz_history')}</Text>
        <TouchableOpacity
          style={[styles.lecturerDirectoryItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => router.push('/quiz-history')}
        >
          <LinearGradient
            colors={['#9b59b6', '#8e44ad']}
            style={[styles.lecturerDirectoryIconContainer, isRTL ? { marginStart: 16, marginEnd: 0 } : {}]}
          >
            <Ionicons name="document-text-outline" size={24} color="#fff" />
          </LinearGradient>
          <View style={[styles.lecturerDirectoryContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.lecturerDirectoryTitle}>{t('view_all')}</Text>
            <Text style={[styles.lecturerDirectoryDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{t('quiz_history')}</Text>
          </View>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
        </TouchableOpacity>
      </View>



      {/* Lecturer Directory Card */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('find_lecturers')}</Text>
        <TouchableOpacity
          style={[styles.lecturerDirectoryItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => router.push('/lecturer-directory')}
        >
          <LinearGradient
            colors={['#2ecc71', '#27ae60']}
            style={[styles.lecturerDirectoryIconContainer, isRTL ? { marginStart: 16, marginEnd: 0 } : {}]}
          >
            <Ionicons name="search-outline" size={24} color="#fff" />
          </LinearGradient>
          <View style={[styles.lecturerDirectoryContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.lecturerDirectoryTitle}>{t('browse_lecturer_directory')}</Text>
            <Text style={[styles.lecturerDirectoryDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{t('find_lecturer_desc')}</Text>
          </View>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
        </TouchableOpacity>
      </View>

      {/* Invitations Card */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('invitations')}</Text>
        <TouchableOpacity
          style={[styles.lecturerDirectoryItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => router.push('/invitations')}
        >
          <LinearGradient
            colors={['#f1c40f', '#f39c12']}
            style={[styles.lecturerDirectoryIconContainer, isRTL ? { marginStart: 16, marginEnd: 0 } : {}]}
          >
            <Ionicons name="mail-open-outline" size={24} color="#fff" />
          </LinearGradient>
          <View style={[styles.lecturerDirectoryContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.lecturerDirectoryTitle}>{t('view_all_invitations') || 'View All Invitations'}</Text>
            <Text style={[styles.lecturerDirectoryDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{t('check_invitations_desc') || 'Check your pending and past invitations'}</Text>
          </View>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
        </TouchableOpacity>
      </View>

      {/* Attendance Card */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('submit_attendance_action')}</Text>
        <TouchableOpacity
          style={[styles.lecturerDirectoryItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => router.push('/submit-attendance')}
        >
          <LinearGradient
            colors={['#e74c3c', '#c0392b']}
            style={[styles.lecturerDirectoryIconContainer, isRTL ? { marginStart: 16, marginEnd: 0 } : {}]}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
          </LinearGradient>
          <View style={[styles.lecturerDirectoryContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.lecturerDirectoryTitle}>{t('submit_attendance_action')}</Text>
            <Text style={[styles.lecturerDirectoryDescription, { textAlign: isRTL ? 'right' : 'left' }]}>{t('submit_attendance_desc')}</Text>
          </View>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
        </TouchableOpacity>
      </View>
    </View>
  );
};



// Add this interface for attendance statistics
interface AttendanceStatistics {
  overall_attendance_percentage: number;
  total_present: number;
  total_absent: number;
  total_possible_attendances: number;
  enrolled_classes_count: number;
  enrolled_groups_count: number;
  class_attendance_details: ClassAttendanceDetail[];
  recent_attendance_records: {
    id: number;
    date: string;
    status: string;
    context_name: string;
  }[];
}

interface ClassAttendanceDetail {
  class_id: number;
  class_name: string;
  present_count: number;
  total_sessions: number;
  percentage: number;
}

// Attendance Tab Component
export const AttendanceTab = ({ userData }: { userData: UserData | null }) => {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<{ id: number; name: string } | null>(null);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    loadAttendanceStatistics();
  }, []);

  const loadAttendanceStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_CONFIG.ENDPOINTS.STUDENT_ATTENDANCE_STATISTICS);
      setAttendanceStats(response.data);
    } catch (error) {
      console.error('Error loading attendance statistics:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_load_stats'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClassPress = async (classId: number, className: string) => {
    setSelectedClass({ id: classId, name: className });
    setCalendarVisible(true);
    setCalendarLoading(true);

    try {
      const response = await api.get(`${API_CONFIG.ENDPOINTS.CLASS_ATTENDANCE_CALENDAR}${classId}/attendance-calendar/`);
      setCalendarData(response.data);
    } catch (error) {
      console.error('Error loading attendance calendar:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: t('failed_load_calendar'),
      });
    } finally {
      setCalendarLoading(false);
    }
  };

  const closeCalendar = () => {
    setCalendarVisible(false);
    setSelectedClass(null);
    setCalendarData(null);
  };

  if (loading) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('attendance_overview')}</Text>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('attendance_overview')}</Text>
        <View style={[styles.attendanceStats, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.attendanceStat}>
            <LinearGradient
              colors={['#3498db', '#2980b9']}
              style={styles.attendanceIconContainer}
            >
              <Ionicons name="analytics-outline" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.attendanceNumber}>
              {attendanceStats?.overall_attendance_percentage ?? 0}%
            </Text>
            <Text style={styles.attendanceLabel}>{t('overall')}</Text>
          </View>
          <View style={styles.attendanceStat}>
            <LinearGradient
              colors={['#2ecc71', '#27ae60']}
              style={styles.attendanceIconContainer}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.attendanceNumber}>
              {attendanceStats?.total_present ?? 0}
            </Text>
            <Text style={styles.attendanceLabel}>{t('present')}</Text>
          </View>
          <View style={styles.attendanceStat}>
            <LinearGradient
              colors={['#e74c3c', '#c0392b']}
              style={styles.attendanceIconContainer}
            >
              <Ionicons name="close-circle-outline" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.attendanceNumber}>
              {attendanceStats?.total_absent ?? 0}
            </Text>
            <Text style={styles.attendanceLabel}>{t('absent')}</Text>
          </View>
        </View>

        {/* Mark Attendance Button */}
        <TouchableOpacity
          style={[styles.lecturerDirectoryItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => router.push('/submit-attendance')}
        >
          <LinearGradient
            colors={['#e67e22', '#d35400']}
            style={[styles.lecturerDirectoryIconContainer, isRTL ? { marginStart: 16, marginEnd: 0 } : {}]}
          >
            <Ionicons name="checkmark-done-circle-outline" size={24} color="#fff" />
          </LinearGradient>
          <View style={[styles.lecturerDirectoryContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.lecturerDirectoryTitle}>{t('mark_attendance')}</Text>
            <Text style={styles.lecturerDirectoryDescription}>{t('mark_attendance_desc')}</Text>
          </View>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#95a5a6" />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('course_attendance')}</Text>
        <View style={styles.courseAttendance}>
          {attendanceStats?.class_attendance_details.map((classDetail) => (
            <TouchableOpacity
              key={classDetail.class_id}
              style={[styles.courseRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => handleClassPress(classDetail.class_id, classDetail.class_name)}
              activeOpacity={0.7}
            >
              <Text style={[styles.attendanceCourseName, { textAlign: isRTL ? 'right' : 'left' }]}>{classDetail.class_name}</Text>
              <Text style={styles.attendanceRatio}>{classDetail.present_count}/{classDetail.total_sessions}</Text>
              <Text style={styles.attendancePercentage}>{classDetail.percentage}%</Text>
              <Ionicons name="calendar-outline" size={20} color="#3498db" style={{ [isRTL ? 'marginEnd' : 'marginStart']: 8 }} />
            </TouchableOpacity>
          ))}

          {(!attendanceStats?.class_attendance_details || attendanceStats.class_attendance_details.length === 0) && (
            <Text style={styles.emptyText}>{t('no_attendance_data')}</Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('recent_attendance')}</Text>
        <View style={styles.attendanceHistory}>
          {attendanceStats?.recent_attendance_records && attendanceStats.recent_attendance_records.length > 0 ? (
            attendanceStats.recent_attendance_records.map((record) => (
              <View key={record.id} style={[styles.historyItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyDate, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {new Date(record.date).toLocaleDateString()}
                  </Text>
                  <Text style={{ textAlign: isRTL ? 'right' : 'left', color: '#7f8c8d', fontSize: 12, marginTop: 2 }}>
                    {record.context_name}
                  </Text>
                </View>
                <View style={[styles.statusContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#27ae60" />
                  <Text style={[styles.historyStatus, { [isRTL ? 'marginEnd' : 'marginStart']: 6, color: '#FFFFFF' }]}>{t('present')}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('no_attendance_data')}</Text>
          )}
        </View>
      </View>

      {/* Attendance Calendar Modal */}
      {selectedClass && (
        <ClassAttendanceCalendar
          visible={calendarVisible}
          onClose={closeCalendar}
          classId={selectedClass.id}
          className={selectedClass.name}
          attendanceRecords={calendarData?.attendance_records || []}
          classSchedule={calendarData?.class_schedule || { days_of_week: [], start_date: '', end_date: null, start_time: null, end_time: null }}
          loading={calendarLoading}
        />
      )}
    </View>
  );
};

// Messages Tab Component
const MessagesTab = () => {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]); // Add announcements state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    loadChatRooms();
    // Load announcements as well
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const fetchedAnnouncements = await fetchAnnouncements();
      setAnnouncements(fetchedAnnouncements);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[MessagesTab] Attempting to retrieve token...');
      let token = await tokenStorage.getItem('access_token');

      // Retry mechanism for race conditions on reload (especially in Arabic/RTL switch)
      if (!token) {
        console.log('[MessagesTab] Token not found initially, retrying...');
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          token = await tokenStorage.getItem('access_token');
          if (token) {
            console.log(`[MessagesTab] Token found after retry ${i + 1}`);
            break;
          }
        }
      }

      console.log(`[MessagesTab] Final Token status: ${token ? 'FOUND' : 'MISSING'}`);

      if (!token) {
        setError('No authentication token found (after retries)');
        return;
      }

      // Get current user ID
      const userDataString = await AsyncStorage.getItem('user_data');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setCurrentUserId(userData.id);
      }

      // Updated endpoint to match the backend API
      const response = await axios.get(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.CHAT_ROOMS, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });

      console.log('Received chat rooms:', response.data);

      // Sort chat rooms by last updated time (newest first)
      const sortedRooms = response.data.sort((a: ChatRoom, b: ChatRoom) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setChatRooms(sortedRooms);
    } catch (error: any) {
      console.error('Error loading chat rooms:', error);
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        setError(t('network_error_check'));
      } else if (error.response?.status === 404) {
        // Handle 404 specifically - student may not have chat rooms
        setError(t('no_chat_rooms'));
      } else {
        setError(error.response?.data?.error || t('error'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Add function to fetch announcements
  const fetchAnnouncements = async (filters?: { source?: string }): Promise<Announcement[]> => {
    try {
      const token = await tokenStorage.getItem('access_token');
      if (!token) {
        return [];
      }

      // Updated to use the single optimized endpoint
      const response = await axios.get(`${API_CONFIG.CHAT_BASE_URL}${API_CONFIG.ENDPOINTS.ANNOUNCEMENTS}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });

      console.log('[Home] Fetched announcements successfully:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      return [];
    }
  };

  const handleChatRoomPress = (room: ChatRoom) => {
    if (room.chat_type === 'class' && room.class_obj && room.class_obj.id) {
      router.push(`/student-class-chat/${room.class_obj.id}`);
    } else if (room.chat_type === 'group' && room.group_obj && room.group_obj.id) {
      router.push(`/student-group-chat/${room.group_obj.id}`);
    } else if (room.chat_type === 'direct' && room.participants && currentUserId) {
      // For direct messages, we need to determine the other participant
      // and navigate to the direct message screen
      const otherParticipant = room.participants.find(p => p.id !== currentUserId);

      if (otherParticipant) {
        router.push(`/direct-message/${otherParticipant.id}`);
      } else {
        Toast.show({
          type: 'error',
          text1: t('error'),
          text2: t('could_not_determine_participant') || 'Could not determine the other participant in this conversation.',
        });
      }
    } else {
      Toast.show({
        type: 'error',
        text1: t('unsupported_chat_type'),
        text2: t('chat_type_not_supported') || 'This chat type is not supported yet.',
      });
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return t('yesterday');
    } else {
      return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
    }
  };

  const getChatName = (room: ChatRoom) => {
    if (room.chat_type === 'direct' && room.participants && currentUserId) {
      // For direct messages, show the name of the other participant
      const otherParticipant = room.participants.find(p => p.id !== currentUserId);
      if (otherParticipant) {
        // Check for Admin
        if (otherParticipant.user_type === 'admin' || !otherParticipant.first_name) {
          return "Taalomy Support";
        }
        return `${otherParticipant.first_name} ${otherParticipant.last_name}`;
      }
    }
    return room.name;
  };

  const getAvatarIcon = (chatType: string) => {
    switch (chatType) {
      case 'group':
        return 'people-outline';
      case 'direct':
        return 'person-outline';
      default:
        return 'school-outline';
    }
  };

  if (loading) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('your_messages')}</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>{t('loading_messages')}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('your_messages')}</Text>
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadChatRooms}>
              <Text style={styles.retryButtonText}>{t('retry') || 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>


      <View style={styles.card}>
        <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.cardTitle}>{t('your_messages')}</Text>
          {chatRooms.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/messages')}>
              <Text style={styles.viewAllText}>{t('view_all')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {chatRooms.length > 0 ? (
          <>
            <View style={styles.chatList}>
              {chatRooms.slice(0, 5).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chatRoomItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => handleChatRoomPress(item)}
                >
                  <View style={[styles.avatarContainer, isRTL ? { marginStart: 16, marginEnd: 0 } : {}]}>
                    <View style={styles.avatar}>
                      {getChatName(item) === 'Taalomy Support' ? (
                        <Image
                          source={require('../src/assets/images/taalomy-dark-back.png')}
                          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#000' }}
                          resizeMode="cover"
                        />
                      ) : (() => {
                        let profilePicUrl = null;
                        if (item.chat_type === 'direct' && item.participants && currentUserId) {
                          const otherParticipant = item.participants.find(p => p.id !== currentUserId);
                          if (otherParticipant) {
                            profilePicUrl = otherParticipant.profile_picture_url;
                          }
                        }

                        if (profilePicUrl) {
                          return (
                            <Image
                              source={{ uri: profilePicUrl }}
                              style={{ width: 40, height: 40, borderRadius: 20 }}
                              resizeMode="cover"
                            />
                          );
                        }

                        return (
                          <Ionicons
                            name={getAvatarIcon(item.chat_type)}
                            size={20}
                            color="#3498db"
                          />
                        );
                      })()}
                    </View>
                    {item.unread_count > 0 && (
                      <View style={[styles.badge, isRTL ? { left: 0, right: 'auto' } : {}]}>
                        <Text style={styles.badgeText}>{item.unread_count}</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.chatInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.chatHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%' }]}>
                      <Text style={[styles.chatName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                        {getChatName(item)}
                      </Text>
                      {item.last_message && (
                        <Text style={styles.chatTime}>
                          {formatTime(item.last_message.created_at)}
                        </Text>
                      )}
                    </View>

                    <View style={[styles.chatPreview, { width: '100%' }]}>
                      {item.last_message ? (
                        <>
                          <Text style={[styles.senderName, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {(() => {
                              const chatName = getChatName(item);
                              if (chatName === 'Taalomy Support') return "Taalomy Support:";
                              return `${item.last_message.sender.first_name} ${item.last_message.sender.last_name}:`;
                            })()}
                          </Text>
                          <Text style={[styles.lastMessage, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                            {item.last_message.content}
                          </Text>
                        </>
                      ) : (
                        <Text style={[styles.noMessages, { textAlign: isRTL ? 'right' : 'left' }]}>{t('no_messages_yet')}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.actionButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => router.push('/messages')}
            >
              <Text style={styles.actionButtonText}>{t('view_all_messages')}</Text>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#7f8c8d" />
            <Text style={styles.emptyText}>{t('no_messages_yet')}</Text>
            <Text style={styles.emptySubtext}>{t('join_classes_chat_desc')}</Text>
            <Text style={styles.emptySubtext}>{t('join_classes_chat_action')}</Text>
          </View>
        )}
      </View>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <View style={styles.card}>
          <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.cardTitle}>{t('latest_announcements')}</Text>
            <TouchableOpacity onPress={() => router.push('/announcements')}>
              <Text style={styles.viewAllText}>{t('view_all')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chatList}>
            {announcements.slice(0, 3).map((announcement) => (
              <TouchableOpacity
                key={announcement.id}
                style={styles.announcementCard}
                onPress={() => router.push('/announcements')}
              >
                <View style={[styles.announcementHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.announcementSender, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {announcement.sender.first_name} {announcement.sender.last_name}
                  </Text>
                  <Text style={styles.announcementTime}>
                    {new Date(announcement.created_at).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.announcementContent, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                  {announcement.content}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// Add the ChatRoom interface
interface ChatRoom {
  id: number;
  name: string;
  chat_type: string;
  class_obj?: {
    id: number;
    name: string;
  };
  group_obj?: {
    id: number;
    name: string;
  };
  participants?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    user_type: string; // Add user_type to identify lecturers
    profile_picture_url?: string;
  }>;
  last_message: {
    id: number;
    content: string;
    sender: {
      id: number;
      first_name: string;
      last_name: string;
      user_type: string; // Add user_type to identify lecturers
    };
    created_at: string;
  } | null;
  unread_count: number;
  updated_at: string;
}

// Add this interface for announcements
interface Announcement {
  id: number;
  content: string;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
    user_type: string;
  };
  chat_room: {
    id: number;
    name: string;
    chat_type: string;
  };
  created_at: string;
}

// Timetable Tab Component
const TimetableTab = ({ userData }: { userData: UserData | null }) => {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to convert days_of_week to array if it's a string
  const ensureDaysArray = (days: string | string[] | undefined): string[] => {
    if (!days) return [];
    if (Array.isArray(days)) return days;
    if (typeof days === 'string') return days.split(',').map(day => day.trim());
    return [];
  };

  useEffect(() => {
    loadTimetableData();
  }, []);

  const loadTimetableData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load classes with schedule data
      const classesResponse = await api.get(API_CONFIG.ENDPOINTS.STUDENT_CLASSES);
      // Process classes to ensure days_of_week is an array
      const processedClasses = classesResponse.data.map((cls: any) => ({
        ...cls,
        days_of_week: ensureDaysArray(cls.days_of_week)
      }));
      setClasses(processedClasses);

      // Load groups with schedule data
      const groupsResponse = await api.get(API_CONFIG.ENDPOINTS.STUDENT_GROUPS);
      // Process groups to ensure days_of_week is an array
      const processedGroups = groupsResponse.data.map((group: any) => ({
        ...group,
        days_of_week: ensureDaysArray(group.days_of_week)
      }));
      setGroups(processedGroups);

    } catch (err: any) {
      console.error('Error loading timetable data:', err);
      setError(t('failed_load_timetable'));
    } finally {
      setLoading(false);
    }
  };

  // Function to organize classes and groups by days of the week
  const getScheduleByDay = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const schedule: Record<string, any[]> = {
      'Monday': [],
      'Tuesday': [],
      'Wednesday': [],
      'Thursday': [],
      'Friday': [],
      'Saturday': [],
      'Sunday': []
    };

    // Process classes
    classes.forEach(cls => {
      const daysArray = ensureDaysArray(cls.days_of_week);
      if (daysArray.length > 0 && cls.start_time && cls.end_time) {
        daysArray.forEach((day: string) => {
          if (schedule[day]) {
            schedule[day].push({
              id: cls.id,
              name: cls.name,
              type: 'class',
              startTime: cls.start_time,
              endTime: cls.end_time,
              venue: cls.venue || 'Not specified'
            });
          }
        });
      }
    });

    // Process groups
    groups.forEach(group => {
      const daysArray = ensureDaysArray(group.days_of_week);
      if (daysArray.length > 0 && group.start_time && group.end_time) {
        daysArray.forEach((day: string) => {
          if (schedule[day]) {
            schedule[day].push({
              id: group.id,
              name: group.name,
              type: 'group',
              startTime: group.start_time,
              endTime: group.end_time,
              venue: group.venue || 'Not specified'
            });
          }
        });
      }
    });

    // Sort each day's schedule by start time
    Object.keys(schedule).forEach(day => {
      schedule[day].sort((a, b) => {
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
        return 0;
      });
    });

    return schedule;
  };

  const schedule = getScheduleByDay();

  if (loading) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('this_week_schedule')}</Text>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('this_week_schedule')}</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={loadTimetableData}
          >
            <Text style={styles.acceptButtonText}>{t('retry') || 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Check if there's any schedule data
  const hasScheduleData = Object.values(schedule).some(daySchedule => daySchedule.length > 0);

  return (
    <View style={styles.tabContent}>
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t('this_week_schedule')}</Text>

        {hasScheduleData ? (
          Object.entries(schedule).map(([day, daySchedule]) => (
            daySchedule.length > 0 && (
              <View key={day} style={styles.daySchedule}>
                <Text style={[styles.dayTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{t(day.toLowerCase())}</Text>
                {daySchedule.map((item, index) => (
                  <View key={`${item.type} -${item.id} -${index} `} style={styles.scheduleClassItem}>
                    <Text style={[styles.classTime, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {item.startTime} - {item.endTime}
                    </Text>
                    <Text style={[styles.scheduleClassName, { textAlign: isRTL ? 'right' : 'left' }]}>{item.name}</Text>
                    <Text style={[styles.classRoom, { textAlign: isRTL ? 'right' : 'left' }]}>{item.venue}</Text>
                    <View style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      marginTop: 5
                    }}>
                      <View style={{
                        backgroundColor: item.type === 'class' ? '#3498db' : '#9b59b6',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4
                      }}>
                        <Text style={{
                          color: 'white',
                          fontSize: 10,
                          fontWeight: 'bold'
                        }}>
                          {t(`type_${item.type}`)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )
          ))
        ) : (
          <Text style={styles.emptyText}>
            {t('no_schedule_data')}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { marginBottom: 15, textAlign: isRTL ? 'right' : 'left' }]}>{t('upcoming_events')}</Text>
        {(() => {
          // Helper to get next occurrence date
          const getNextOccurrence = (dayName: string, timeStr: string) => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const targetDayIndex = days.indexOf(dayName);
            if (targetDayIndex === -1) return null;

            const now = new Date();
            const currentDayIndex = now.getDay();

            let daysUntil = targetDayIndex - currentDayIndex;
            if (daysUntil < 0) daysUntil += 7;

            // If it's today, check if time has passed
            if (daysUntil === 0) {
              const [hours, minutes] = timeStr.split(':').map(Number);
              const eventTime = new Date(now);
              eventTime.setHours(hours, minutes, 0, 0);
              if (eventTime <= now) daysUntil = 7; // Next week
            }

            const nextDate = new Date(now);
            nextDate.setDate(now.getDate() + daysUntil);

            const [hours, minutes] = timeStr.split(':').map(Number);
            nextDate.setHours(hours, minutes, 0, 0);

            return nextDate;
          };

          // Collect all future events
          const allEvents: any[] = [];

          Object.entries(schedule).forEach(([day, daySchedule]) => {
            daySchedule.forEach(item => {
              const nextDate = getNextOccurrence(day, item.startTime);
              if (nextDate) {
                allEvents.push({
                  ...item,
                  nextDate,
                  dayName: day
                });
              }
            });
          });

          // Sort by date and take top 3
          const upcomingEvents = allEvents
            .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
            .slice(0, 3);

          if (upcomingEvents.length === 0) {
            return (
              <Text style={styles.emptyText}>{t('no_upcoming_events')}</Text>
            );
          }

          return upcomingEvents.map((event, index) => (
            <View
              key={`event-${event.id}-${index}`}
              style={[
                styles.eventItem,
                index === upcomingEvents.length - 1 && { borderBottomWidth: 0 },
                { flexDirection: isRTL ? 'row-reverse' : 'row' }
              ]}
            >
              <View style={[styles.eventIconContainer, isRTL ? { marginStart: 16, marginEnd: 0 } : {}]}>
                <Ionicons
                  name={event.type === 'class' ? "school-outline" : "people-outline"}
                  size={20}
                  color="#3498db"
                />
              </View>
              <View style={[styles.eventContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.eventTitle}>{event.name}</Text>
                <Text style={styles.eventDate}>
                  {event.nextDate.toLocaleDateString(i18n.language, { weekday: 'long' })}, {event.startTime} ({t(`type_${event.type}`)})
                </Text>
              </View>
            </View>
          ));
        })()}
      </View>
    </View>
  );
};



// Profile Tab Component
const ProfileTab = ({ userData, onLogout }: { userData: UserData | null; onLogout: () => void; }) => {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const changeLanguage = async (lang: string) => {
    if (lang === i18n.language) return;

    try {
      await AsyncStorage.setItem('user-language', lang);
      const isRTL = lang === 'ar';

      // Update Native Flags
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);

      // Reload immediately to apply changes
      try {
        if (!__DEV__) {
          await Updates.reloadAsync();
        } else {
          if (NativeModules.DevSettings) {
            NativeModules.DevSettings.reload();
          } else {
            await Updates.reloadAsync();
          }
        }
      } catch (e) {
        // Fallback
        if (NativeModules.DevSettings) {
          NativeModules.DevSettings.reload();
        }
      }

    } catch (e) {
      console.error('Failed to change language', e);
    }
  };


  return (
    <View style={styles.tabContent}>

      {/* User Information Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('user_information')}</Text>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => router.push('/profile-edit')}
          >
            <Ionicons name="pencil" size={16} color="#3498db" />
            <Text style={styles.editProfileText}>{t('edit_profile')}</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <ProfilePicture
            imageUrl={userData?.profile_picture_url}
            firstName={userData?.first_name || ''}
            lastName={userData?.last_name || ''}
            size={80}
            onPress={() => router.push('/profile-edit')}
            showEditIcon={true}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userData?.first_name} {userData?.last_name}
            </Text>
            <Text style={styles.profileRole}>
              {userData?.user_type === 'student' ? t('student') : t('lecturer')}
            </Text>
          </View>
        </View>



        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('name_label')}</Text>
          <Text style={styles.value}>
            {userData?.first_name} {userData?.last_name}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('username_label')}</Text>
          <Text style={styles.value}>{userData?.username}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('email_label')}</Text>
          <Text style={styles.value}>{userData?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('user_type_label')}</Text>
          <Text style={styles.value}>{userData?.user_type}</Text>
        </View>
        {
          userData?.phone_number && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('phone_label')}</Text>
              <Text style={styles.value}>{userData.phone_number}</Text>
            </View>
          )
        }
        {
          userData?.address && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('address_label')}</Text>
              <Text style={styles.value}>{userData.address}</Text>
            </View>
          )
        }
      </View>

      {/* Personal Insights Button */}
      <TouchableOpacity
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          marginBottom: 20,
          padding: 20,
          borderRadius: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
        onPress={() => router.push('/insights')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            padding: 10,
            borderRadius: 12,
            marginEnd: 15,
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Ionicons name="analytics" size={20} color="#3498db" />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ecf0f1' }}>{t('personal_insights')}</Text>
            <Text style={{ fontSize: 12, color: '#bdc3c7' }}>{t('view_performance_predictions')}</Text>
          </View>
        </View>
        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color="#bdc3c7" />
      </TouchableOpacity >

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings')}</Text>

        {/* Language Switcher */}
        {/* Language Switcher */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="language-outline" size={20} color="#3498db" />
          </View>
          <Text style={styles.settingText}>{t('language')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#95a5a6', marginEnd: 8, fontSize: 14 }}>
              {i18n.language === 'en' ? 'English' : 'العربية'}
            </Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color="#95a5a6" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/notification-settings')}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="notifications-outline" size={20} color="#3498db" />
          </View>
          <Text style={styles.settingText}>{t('notifications')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#95a5a6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/privacy-settings')}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#3498db" />
          </View>
          <Text style={styles.settingText}>{t('privacy')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#95a5a6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/terms-of-service')}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="document-text-outline" size={20} color="#3498db" />
          </View>
          <Text style={styles.settingText}>{t('terms_of_service')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#95a5a6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/support')}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="help-circle-outline" size={20} color="#3498db" />
          </View>
          <Text style={styles.settingText}>{t('help_support')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#95a5a6" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>{t('logout')}</Text>
      </TouchableOpacity>
    </View >
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
    padding: 20,
    paddingTop: 60,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#bdc3c7',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    color: '#ecf0f1',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
    borderRadius: 12,
  },
  iconText: {
    fontSize: 16,
    color: '#95a5a6',
  },
  activeIconText: {
    color: '#3498db',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#95a5a6',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  tabIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderRadius: 12,
  },
  activeTabIconContainer: {
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
  },

  contentContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  tabContent: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ecf0f1',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editProfileText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
    marginStart: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#bdc3c7',
    marginTop: 5,
  },
  scheduleItem: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  scheduleTime: {
    width: 60,
    marginEnd: 15,
  },
  timeText: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
  },
  scheduleContent: {
    flex: 1,
  },

  announcementCard: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
  },
  announcementContent: {
    fontSize: 16,
    color: '#ecf0f1',
    marginBottom: 15,
    lineHeight: 22,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  announcementSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  announcementTime: {
    fontSize: 12,
    color: '#95a5a6',
  },
  announcementContext: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
    marginTop: 8,
  },

  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  courseLocation: {
    fontSize: 14,
    color: '#95a5a6',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },

  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#ecf0f1',
  },
  activityTime: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  attendanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 5,
    paddingVertical: 5,
    width: '100%',
  },
  attendanceStat: {
    alignItems: 'center',
    paddingVertical: 5,
    minWidth: 80,
  },
  attendanceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  attendanceNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    textAlign: 'center',
    minWidth: 50,
  },
  attendanceLabel: {
    fontSize: 10,
    color: '#bdc3c7',
    marginTop: 3,
    textAlign: 'center',
  },
  courseAttendance: {
    marginTop: 10,
  },
  courseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  attendanceCourseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ecf0f1',
    flex: 1,
  },
  attendanceRatio: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
    marginEnd: 10,
    minWidth: 40,
    textAlign: 'right',
  },
  attendancePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
    minWidth: 40,
    textAlign: 'right',
  },
  attendanceHistory: {
    marginTop: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  historyDate: {
    fontSize: 14,
    color: '#ecf0f1',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  daySchedule: {
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 10,
  },
  scheduleClassItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  classTime: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 5,
  },
  scheduleClassName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  classRoom: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 5,
  },

  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },

  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 5,
  },
  eventDate: {
    fontSize: 14,
    color: '#95a5a6',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    marginTop: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#bdc3c7',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#ecf0f1',
    flex: 2,
    textAlign: 'right',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },

  settingText: {
    fontSize: 16,
    color: '#ecf0f1',
    flex: 1,
  },

  logoutButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.8)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.3)',
  },
  logoutButtonText: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topUpButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cardDescription: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 20,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginEnd: 8,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingBottom: 16,
  },
  chatRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    marginBottom: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginEnd: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ecf0f1',
    flex: 1,
    marginEnd: 8,
  },
  chatTime: {
    fontSize: 11,
    color: '#95a5a6',
  },
  chatPreview: {
    flexDirection: 'row',
  },
  senderName: {
    fontSize: 13,
    color: '#95a5a6',
    fontWeight: '500',
    marginEnd: 4,
  },
  lastMessage: {
    fontSize: 13,
    color: '#95a5a6',
    flex: 1,
  },
  noMessages: {
    fontSize: 13,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 15,
    color: '#95a5a6',
    marginTop: 10,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#95a5a6',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#ff3b30',
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  profilePictureSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileInfo: {
    flex: 1,
    marginStart: 15,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  // Student component styles
  invitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  invitationContent: {
    flex: 1,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  invitationText: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 2,
  },
  invitationDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  acceptButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  intakeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  intakeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  intakeContent: {
    flex: 1,
  },
  intakeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  intakeDescription: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 2,
  },
  intakeStats: {
    fontSize: 12,
    color: '#95a5a6',
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
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  groupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  groupContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 2,
  },
  groupStats: {
    fontSize: 12,
    color: '#95a5a6',
  },
  lecturerDirectoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lecturerDirectoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  lecturerDirectoryContent: {
    flex: 1,
  },
  lecturerDirectoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
    marginBottom: 4,
  },
  lecturerDirectoryDescription: {
    fontSize: 14,
    color: '#bdc3c7',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Darkening overlay restored
  },
  profileMenu: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    paddingVertical: 10,
    minWidth: 180,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  logoutMenuItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 5,
  },
  profileMenuItemText: {
    fontSize: 16,
    color: '#ecf0f1',
    marginStart: 12,
    fontWeight: '500',
  },
  logoutText: {
    color: '#e74c3c',
  },

});

export default Home;