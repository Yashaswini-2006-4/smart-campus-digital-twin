
import { Platform } from 'react-native';

// API host configuration
// Web: use localhost on your development computer.
// Android/iOS: use your computer's LAN IP address.
const WEB_HOST = 'localhost';
const DEVICE_HOST = '192.168.31.98';

const HOST =
  Platform.OS === 'web'
    ? WEB_HOST
    : DEVICE_HOST;

// Node.js backend — port 5000
export const NODE_API_URL = `http://${HOST}:5000`;

// Python FastAPI backend — port 8000
export const AI_API_URL = `http://${HOST}:8000`;

// Backward compatibility for existing AI screens
export const API_BASE_URL = AI_API_URL;
