import { Platform } from 'react-native';

const HOST =
  Platform.OS === 'web'
    ? 'localhost'
    : '192.168.31.98';

export const NODE_API_URL = `http://${HOST}:5000`;
export const AI_API_URL = `http://${HOST}:8000`;

// Keep this temporarily for existing AI screens
export const API_BASE_URL = AI_API_URL;