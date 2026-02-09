/*
TODO: Enable this test after installing @testing-library/react-native and adding it to devDependencies.

import React from 'react';
import { render } from '@testing-library/react-native';
import { AttendanceTab } from '../app/home';

// Mock the necessary modules
jest.mock('../utils/api');
jest.mock('../src/config/api', () => ({
  API_CONFIG: {
    ENDPOINTS: {
      STUDENT_ATTENDANCE_STATISTICS: 'student/attendance-statistics/',
    }
  }
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  }
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('AttendanceTab Alignment', () => {
  const mockUserData = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    user_type: 'student',
  };

  it('renders attendance statistics with proper alignment', () => {
    const { getByText } = render(<AttendanceTab userData={mockUserData} />);
    
    // Check that the attendance stats are rendered
    expect(getByText('Attendance Overview')).toBeTruthy();
    
    // The actual alignment would be visually verified in the UI
    // This test just ensures the component renders correctly
  });
});
*/