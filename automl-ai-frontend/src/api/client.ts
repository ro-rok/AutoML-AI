import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Standardize env var name - use VITE_API_BASE_URL
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and FormData handling
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Auto-detect FormData and remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Log requests in dev mode
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        baseURL: config.baseURL,
        data: config.data instanceof FormData ? `FormData (${config.data.get('file')?.name || 'unknown'})` : config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
  (response) => {
    // Log successful responses in dev mode
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error: AxiosError) => {
    // Enhanced error handling
    if (import.meta.env.DEV) {
      console.error('[API Response Error]', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
    }

    // Transform error to have consistent shape
    const errorMessage = 
      (error.response?.data as any)?.detail ||
      (error.response?.data as any)?.message ||
      error.message ||
      'An unexpected error occurred';

    const statusCode = error.response?.status;

    // Handle specific error codes
    if (statusCode === 413) {
      return Promise.reject(new Error('File too large. Maximum size is 100MB.'));
    }
    if (statusCode === 415) {
      return Promise.reject(new Error('Unsupported file type. Please upload CSV or XLSX files.'));
    }
    if (statusCode === 422) {
      return Promise.reject(new Error(errorMessage || 'Validation error. Please check your file.'));
    }
    if (statusCode === 429) {
      return Promise.reject(new Error('Too many requests. Please wait a moment and try again.'));
    }
    if (statusCode === 504) {
      return Promise.reject(new Error('Request timeout. The server took too long to respond. Try reducing your dataset size.'));
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return Promise.reject(new Error('Network error. Please check if the backend is running and try again.'));
    }

    return Promise.reject(new Error(errorMessage));
  }
);
