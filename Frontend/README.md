# AcadeX Frontend

## Features Overview

The AcadeX app is a comprehensive university management platform with a modern, professional interface featuring a consistent icon system.

### 🎨 **Professional Design System**

#### **Icon System**
- **Professional Vector Icons**: High-quality Ionicons from Expo Vector Icons library
- **Consistent Design**: 1-2 tone professional icons throughout the app
- **Tab Icons**: Clean, minimal icons for navigation (analytics, checkmark, calendar, person)
- **Status Icons**: Professional indicators for attendance and activities
- **Feature Icons**: Consistent styling for all interactive elements
- **Loading Icons**: Professional loading states with branded elements

#### **Design Principles**
- **Professional Dark Theme**: Consistent dark color scheme throughout
- **Modern UI Elements**: Clean, organized interface with proper spacing
- **Responsive Design**: Optimized for mobile devices
- **Smooth Animations**: Professional transitions and interactions
- **Accessibility**: Proper contrast and readable typography

### 🏠 **Home Page - Tabbed Interface**

The home page features a sophisticated tabbed navigation system with four main sections:

#### 📊 **Dashboard Tab**
- **Quick Stats**: Attendance percentage, number of courses, GPA, and assignments
- **Today's Schedule**: Current day's classes with times and locations
- **Recent Activities**: Latest academic activities and updates

#### ✅ **Attendance Tab**
- **Attendance Overview**: Overall attendance statistics (percentage, present/absent counts)
- **Course Attendance**: Individual course attendance percentages
- **Recent Attendance**: Historical attendance records

#### 📅 **Timetable Tab**
- **Weekly Schedule**: Complete weekly class schedule organized by day
- **Class Details**: Times, locations, and course information
- **Upcoming Events**: Important academic events and deadlines

#### 👤 **Profile Tab**
- **User Information**: Complete user profile details
- **Settings**: App preferences and configuration options
- **Logout**: Secure logout functionality

### 🔐 **Login Persistence Feature**

The app includes automatic login persistence that keeps users logged in until they explicitly log out.

#### How It Works

1. **App Startup**: When the app starts, it checks for existing tokens in AsyncStorage
2. **Token Validation**: If tokens exist, it validates them against the backend
3. **Auto-Login**: If tokens are valid, the user is automatically redirected to the home page
4. **Token Refresh**: If the access token is expired, the app automatically refreshes it using the refresh token
5. **Session Expiry**: If refresh fails, the user is redirected to login

#### Features

- ✅ **Automatic Login**: Users stay logged in between app sessions
- ✅ **Token Validation**: Validates tokens on app startup
- ✅ **Token Refresh**: Automatically refreshes expired tokens
- ✅ **Secure Logout**: Clears all tokens and user data on logout
- ✅ **Error Handling**: Graceful handling of token expiration

### 💬 **Chat System**

The app includes a real-time chat system for class and group communication.

#### Current Implementation
- **WebSocket-based**: Uses Django Channels for real-time communication
- **Fallback Polling**: HTTP polling when WebSocket connection fails
- **Room-based**: Separate chat rooms for classes and groups
- **Typing Indicators**: Shows when other users are typing
- **Message History**: Loads previous messages when joining a chat

#### New Socket.IO Implementation (Recommended)
A more robust Socket.IO-based chat system has been implemented with the following improvements:
- **Automatic Reconnection**: Built-in reconnection logic with exponential backoff
- **Better Error Handling**: Comprehensive error event handling
- **Cross-platform Compatibility**: Works seamlessly across different devices and networks
- **Heartbeat Mechanism**: Automatic keep-alive pings to maintain connection
- **Room-based Messaging**: Native support for room-based communication

To use the new Socket.IO chat system, navigate to:
- Class Chat: `/student-class-chat/socketio-[id]`
- Group Chat: `/student-group-chat/socketio-[id]`

See [CHAT_SYSTEM_UPGRADE.md](CHAT_SYSTEM_UPGRADE.md) for detailed documentation.

### 🛡️ **Security Features**

- **JWT Tokens**: Secure token-based authentication
- **Token Expiry**: Access tokens expire after 1 hour
- **Refresh Tokens**: Long-lived refresh tokens for seamless experience
- **Automatic Cleanup**: Invalid tokens are automatically cleared
- **Secure Storage**: Tokens stored in AsyncStorage (device storage)

### 📱 **Technical Implementation**

#### Tab Navigation System
- **State Management**: React hooks for tab state management
- **Component Architecture**: Separate components for each tab
- **Responsive Layout**: Flexible design that adapts to screen size
- **Performance Optimized**: Efficient rendering and minimal re-renders

#### Professional Icon System
- **Vector Icons**: High-quality Ionicons for crisp, scalable graphics
- **Consistent Styling**: Unified icon containers and colors
- **Active States**: Professional active/inactive icon states
- **Scalable Design**: Icons scale appropriately across devices
- **Accessibility**: Proper contrast and touch targets
- **Professional Appearance**: 1-2 tone design suitable for academic environments

#### API Integration
- **Global Axios Interceptors**: Automatic token management
- **Error Handling**: Comprehensive error handling and user feedback
- **Data Persistence**: Local storage for offline functionality
- **Real-time Updates**: Dynamic content updates

### 🧪 **Testing**

#### Login Persistence Test
1. Login with valid credentials (`az1@gmail.com` / `Ahmad123`)
2. Close the app completely
3. Reopen the app
4. You should be automatically logged in and redirected to home

#### Tab Navigation Test
1. Login to the app
2. Navigate between different tabs
3. Verify content loads correctly for each tab
4. Test tab switching responsiveness

#### Chat System Test
1. Navigate to any class or group
2. Open the chat screen
3. Send and receive messages in real-time
4. Verify typing indicators work
5. Test the new Socket.IO implementation for improved reliability

#### Icon System Test
1. Verify all professional vector icons display consistently
2. Check active/inactive states for tab icons
3. Test icon responsiveness on different screen sizes
4. Verify professional 1-2 tone appearance throughout
5. Confirm crisp, scalable icon rendering

#### Logout Test
1. Go to Profile tab
2. Click the "Logout" button
3. You should be redirected to login page
4. Reopening the app should require login again

### 🚀 **System Status**

✅ **Frontend**: Running on `http://localhost:8081`  
✅ **Backend**: Running on `http://192.168.100.12:8000`  
✅ **Tabbed Interface**: Fully implemented and functional  
✅ **Login Persistence**: Automatic login working  
✅ **Professional Design**: Consistent dark theme throughout  
✅ **Icon System**: Professional vector icons (Ionicons) implemented  
✅ **Chat System**: Real-time messaging with WebSocket fallback  

### 📋 **User Flow**

1. **First Login**: User enters credentials → Tokens stored → Redirected to Dashboard
2. **Tab Navigation**: User can switch between Dashboard, Attendance, Timetable, and Profile
3. **App Restart**: App checks tokens → Validates → Auto-login to Dashboard
4. **Logout**: User clicks logout → All tokens cleared → Redirected to login

### 🎯 **Design Highlights**

- **Professional Vector Icons**: High-quality Ionicons with consistent 1-2 tone design
- **Modern Tab Design**: Sleek tab navigation with professional styling
- **Unified Color Scheme**: Consistent use of dark theme colors
- **Responsive Layout**: Adapts beautifully to different screen sizes
- **Smooth Interactions**: Professional animations and transitions

The AcadeX app now provides a **comprehensive, professional university management experience** with intuitive navigation, persistent login functionality, and a cohesive design system that rivals modern educational applications!