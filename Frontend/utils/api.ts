import axios, { AxiosAdapter, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

import { tokenStorage } from '../src/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_CONFIG, axiosConfig } from '../src/config/api';
import { offlineService } from '../src/services/OfflineService';

// Separate instance for actual network calls to avoid adapter loops
// and to rely on the platform's default adapter (XHR/Fetch) safely.
const networkApi = axios.create({
  timeout: API_CONFIG.TIMEOUT,
  // We do NOT set baseURL here because the config passed to request() likely already has it
  // or has the full URL.
});

// Custom Adapter for Offline Mode
const customAdapter: AxiosAdapter = async (config) => {
  // 1. Check Network Status
  if (offlineService.getIsConnected()) {
    try {
      // Online: Relay request to networkApi
      // We strip 'adapter' from config to ensure networkApi uses its default
      const { adapter, ...nextConfig } = config;

      const requestConfig = { ...nextConfig };

      // Special handling for chat endpoints which are on the root URL, not accounts/
      if (requestConfig.url && requestConfig.url.startsWith('chat/')) {
        console.log('[API] Chat endpoint detected, switching baseURL to Root for:', requestConfig.url);
        requestConfig.baseURL = API_CONFIG.BASE_URL;
      }

      // Note: 'config' data is already transformed (stringified) by the time it hits the adapter.
      // We must prevent networkApi from trying to stringify it again.
      const response = await networkApi.request({
        ...requestConfig,
        transformRequest: [(data) => data], // Identity transform for request
        // Use default transform for response (parse JSON)
        transformResponse: axios.defaults.transformResponse,
        // Validate Status: keep strict to allow catch block to handle errors
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Cache successfull GET requests
      offlineService.cacheRequest(config, response);

      return {
        ...response,
        config: config, // Ensure we return the original config context
        request: response.request
      };
    } catch (error: any) {
      // If the error is network related (e.g., server down, timeout), fallback to cache if possible
      console.warn('[API] Request failed, checking cache fallbacks...', config.url);

      if (config.method?.toLowerCase() === 'get') {
        const cached = await offlineService.getCachedRequest(config);
        if (cached) {
          console.log('[API] Serving cached fallback for:', config.url);
          // Optionally add a header to indicate this is stale data
          cached.headers['x-offline-fallback'] = 'true';
          return cached;
        }
      }

      // If it's a mutation (POST/PUT), we might want to queue it if it's strictly a network error?
      // For now, let's keep it simple: If server is unreachable, we queue it.
      // Typically Axios network errors have code 'ERR_NETWORK' or 'ECONNABORTED'
      if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '') &&
        (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED')) {

        console.log('[API] Auto-queuing failed mutation due to network error');
        await offlineService.queueRequest(config);
        return {
          data: { message: 'Request queued (Server unreachable)', _offline_queued: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {}
        };
      }

      throw error;
    }
  } else {
    // 2. Offline Mode
    console.log('[API] Offline mode detected for:', config.url);

    // Handle GET requests: Try Cache
    if (config.method?.toLowerCase() === 'get') {
      const cachedResponse = await offlineService.getCachedRequest(config);
      if (cachedResponse) {
        console.log('[API] Serving cached response for:', config.url);
        return cachedResponse;
      } else {
        // No cache available
        const error = new Error('No offline data available') as AxiosError;
        error.code = 'ERR_NETWORK';
        error.isAxiosError = true;
        // @ts-ignore
        error.response = { status: 503, statusText: 'Service Unavailable', data: { message: 'You are offline and no data is cached.' } };
        throw error;
      }
    }

    // Handle POST/PUT/DELETE: Queue Request
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
      await offlineService.queueRequest(config);

      // Return optimistic success response
      return {
        data: { message: 'Request queued for sync', _offline_queued: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {}
      };
    }

    // Fallback
    const error = new Error('Network error') as AxiosError;
    error.code = 'ERR_NETWORK';
    throw error;
  }
};

// Create axios instance with custom adapter
const api = axios.create({
  ...axiosConfig,
  adapter: customAdapter,
});

// Pass instance to OfflineService for retries
offlineService.setApiInstance(api);

// Request interceptor to add auth token
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

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // If offline, errors might be synthetic
    if (!offlineService.getIsConnected()) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // If the error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenStorage.getItem('refresh_token');
        if (!refreshToken) {
          await tokenStorage.deleteItem('access_token');
          await tokenStorage.deleteItem('refresh_token');
          await AsyncStorage.removeItem('user_data');
          router.replace('/login');
          return new Promise(() => { });
        }

        // Try to refresh the token using a fresh instance
        const authAxios = axios.create();
        const response = await authAxios.post(`${API_CONFIG.ACCOUNTS_BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
          refresh: refreshToken
        });

        const { access } = response.data;
        await tokenStorage.setItem('access_token', access);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        await tokenStorage.deleteItem('access_token');
        await tokenStorage.deleteItem('refresh_token');
        await AsyncStorage.removeItem('user_data');

        if (router.canGoBack()) {
          router.replace('/login');
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
