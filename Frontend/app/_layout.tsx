import { Stack, useRouter, useSegments } from "expo-router";
import './globals.css';
import { useEffect } from 'react';
import { registerForPushNotificationsAsync } from '../src/utils/notifications';
import { tokenStorage } from '../src/utils/storage';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { LocalizationProvider } from '../src/context/LocalizationContext';
import initI18n from '../src/i18n';
import OfflineBanner from '../src/components/OfflineBanner';

const toastConfig = {
  /* Success Toast - Dark Theme */
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#2ecc71', // Green accent
        backgroundColor: '#1E1E1E', // Dark card background
        borderLeftWidth: 5,
        height: 70, // Slightly taller for better readability
        width: '90%', // Responsive width
        borderRadius: 10,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF' // White Title
      }}
      text2Style={{
        fontSize: 14,
        color: '#BDC3C7' // Light Grey Subtitle
      }}
    />
  ),

  /* Error Toast - Dark Theme */
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#e74c3c', // Red accent
        backgroundColor: '#1E1E1E', // Dark card background
        borderLeftWidth: 5,
        height: 70,
        width: '90%',
        borderRadius: 10,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF' // White Title
      }}
      text2Style={{
        fontSize: 14,
        color: '#BDC3C7' // Light Grey Subtitle
      }}
    />
  )
};

// Initialize i18n
initI18n();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [loaded, error] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const router = useRouter();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync();

    // Handle notification when app is in foreground
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      // console.log('Notification received:', notification);
    });

    // Handle notification response (user tap)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // console.log('Notification response:', data);

      if (data?.type === 'chat_message') {
        if (data.chat_type === 'direct') {
          // Navigate to direct message with the sender
          router.push(`/direct-message/${data.sender_id}`);
        } else if (data.chat_type === 'class') {
          router.push(`/student-class-chat/${data.chat_id}`);
        } else if (data.chat_type === 'group') {
          router.push(`/student-group-chat/${data.chat_id}`);
        }
      }
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Authentication Protection
  const segments = useSegments();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await tokenStorage.getItem('access_token');
      // Check if we are in an auth route (login, register, or landing page)
      // segments[0] might be undefined for root, or the first path part
      const currentRoute = segments[0] as string;
      const guestOnlyRoutes = ['login', 'register', 'index'];
      const publicRoutes = ['terms-of-service', 'auth'];

      if (token && guestOnlyRoutes.includes(currentRoute)) {
        // Redirect to home if accessing guest-only routes (like login) with token
        router.replace('/home');
      } else if (!token && !guestOnlyRoutes.includes(currentRoute) && !publicRoutes.includes(currentRoute)) {
        // Redirect to login if accessing protected route without token (and it's not a public route)
        router.replace('/login');
      }
    };

    if (segments) { // Ensure segments is available
      checkAuth();
    }
  }, [segments]);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <LocalizationProvider>
        <Stack>
          <Stack.Screen
            name="index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="login"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="register"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="auth/otp"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="auth/forgot-password"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="auth/reset-password"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="home"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile-edit"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="student-class-chat/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="student-group-chat/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="student-intake-details/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="student-intakes-all"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="student-classes-all"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="student-groups-all"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="submit-attendance"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="lecturer-directory"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="book-lecturer/[id]"
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="messages"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="direct-message/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="support/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="quiz-history"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="student-quiz/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="notification-settings"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="privacy-settings"
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="gamification"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
          <Stack.Screen name="insights" options={{ headerShown: false }} />
          <Stack.Screen name="announcements" options={{ headerShown: false }} />
          <Stack.Screen name="invitations" options={{ headerShown: false }} />
          <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
        </Stack>
        <Toast config={toastConfig} topOffset={60} />
        <OfflineBanner />
      </LocalizationProvider>
    </>
  );
}
