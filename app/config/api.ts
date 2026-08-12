// app/config/api.ts
import Constants from 'expo-constants';

// Get the base API URL from app.json extra
export const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://señas.tech/api';
export const STORAGE_BASE_URL = Constants.expoConfig?.extra?.storageUrl || 'https://señas.tech/storage';

// Helper to build full URLs
export const buildMediaUrl = (path: string): string => {
    const cleanPath = path.replace(/^\//, '');
    return `${STORAGE_BASE_URL}/${cleanPath}`;
};

// Helper to get full API URL
export const buildApiUrl = (endpoint: string): string => {
    const cleanEndpoint = endpoint.replace(/^\//, '');
    return `${API_BASE_URL}/${cleanEndpoint}`;
};