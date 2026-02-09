import { API_CONFIG } from '../config/api';
import api from '../config/api';

export interface VideoCategory {
  id: number;
  name: string;
  description: string;
  class_obj: number;
  created_by: number;
  videos_count: number;
  created_at: string;
  updated_at: string;
}

export interface StudentVideo {
  id: number;
  title: string;
  description: string;
  category_name: string;
  uploaded_by_name: string;
  file_size_mb: number;
  duration?: string;
  view_count: number;
  video_url?: string;
  thumbnail_url?: string;
  has_viewed: boolean;
  created_at: string;
}

export interface VideoViewData {
  watch_duration?: string;
  completed?: boolean;
}

// Student Video API
export const studentVideoApi = {
  // Get video categories for a class
  getCategories: async (classId: number): Promise<VideoCategory[]> => {
    const response = await api.get(
      `${API_CONFIG.VIDEOS_BASE_URL}student/classes/${classId}/categories/`
    );
    return response.data;
  },

  // Get videos for a class
  getVideos: async (classId: number, params?: {
    category?: number;
    search?: string;
  }): Promise<StudentVideo[]> => {
    let url = `${API_CONFIG.VIDEOS_BASE_URL}student/classes/${classId}/videos/`;

    const urlParams = new URLSearchParams();
    if (params?.category) urlParams.append('category', params.category.toString());
    if (params?.search) urlParams.append('search', params.search);

    if (urlParams.toString()) {
      url += `?${urlParams.toString()}`;
    }

    const response = await api.get(url);
    return response.data;
  },

  // Get video details
  getVideoDetails: async (classId: number, videoId: number): Promise<StudentVideo> => {
    const response = await api.get(
      `${API_CONFIG.VIDEOS_BASE_URL}student/classes/${classId}/videos/${videoId}/`
    );
    return response.data;
  },

  // Record video view
  recordView: async (classId: number, videoId: number, viewData: VideoViewData): Promise<void> => {
    await api.post(
      `${API_CONFIG.VIDEOS_BASE_URL}student/classes/${classId}/videos/${videoId}/view/`,
      viewData
    );
  },

  // --------------------------------------------------------------------------
  // INTAKE VIDEOS
  // --------------------------------------------------------------------------

  // Get video categories for an INTKAE
  getIntakeCategories: async (intakeId: number): Promise<VideoCategory[]> => {
    const response = await api.get(
      `${API_CONFIG.VIDEOS_BASE_URL}student/intakes/${intakeId}/categories/`
    );
    return response.data;
  },

  // Get videos for an INTAKE
  getIntakeVideos: async (intakeId: number, params?: {
    category?: number;
    search?: string;
  }): Promise<StudentVideo[]> => {
    let url = `${API_CONFIG.VIDEOS_BASE_URL}student/intakes/${intakeId}/videos/`;

    const urlParams = new URLSearchParams();
    if (params?.category) urlParams.append('category', params.category.toString());
    if (params?.search) urlParams.append('search', params.search);

    if (urlParams.toString()) {
      url += `?${urlParams.toString()}`;
    }

    const response = await api.get(url);
    return response.data;
  },

  // Get video details (Intake)
  getIntakeVideoDetails: async (intakeId: number, videoId: number): Promise<StudentVideo> => {
    const response = await api.get(
      `${API_CONFIG.VIDEOS_BASE_URL}student/intakes/${intakeId}/videos/${videoId}/`
    );
    return response.data;
  },

  // Record video view (Intake)
  recordIntakeView: async (intakeId: number, videoId: number, viewData: VideoViewData): Promise<void> => {
    await api.post(
      `${API_CONFIG.VIDEOS_BASE_URL}student/intakes/${intakeId}/videos/${videoId}/view/`,
      viewData
    );
  },
};