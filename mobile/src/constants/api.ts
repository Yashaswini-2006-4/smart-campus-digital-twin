
import { Platform } from 'react-native';

// Local development defaults
const WEB_HOST = 'localhost';
const DEVICE_HOST = '192.168.31.98';

const HOST = Platform.OS === 'web' ? WEB_HOST : DEVICE_HOST;

// Production API URLs are supplied by the deployment environment.
// When they are absent, local development continues to use localhost
// on web and the computer's LAN IP on a physical mobile device.
const configuredNodeApiUrl = process.env.EXPO_PUBLIC_NODE_API_URL;
const configuredAiApiUrl = process.env.EXPO_PUBLIC_AI_API_URL;

// Node.js backend — port 5000
export const NODE_API_URL =
  configuredNodeApiUrl || `http://${HOST}:5000`;

// Python FastAPI backend — port 8000
export const AI_API_URL =
  configuredAiApiUrl || `http://${HOST}:8000`;

// Backward compatibility for existing AI screens
export const API_BASE_URL = AI_API_URL;
