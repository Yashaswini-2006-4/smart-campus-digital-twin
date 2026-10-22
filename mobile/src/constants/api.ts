import { Platform } from 'react-native';

// Local development defaults
const WEB_HOST = 'localhost';
const DEVICE_HOST = '192.168.31.98';

const HOST = Platform.OS === 'web' ? WEB_HOST : DEVICE_HOST;

// Configure these in Vercel/Expo for deployed builds.
// Example values are your public Render service URLs, not secrets.
const configuredNodeApiUrl = process.env.EXPO_PUBLIC_NODE_API_URL?.trim();
const configuredAiApiUrl = process.env.EXPO_PUBLIC_AI_API_URL?.trim();

// Remove trailing slashes so endpoint paths append consistently.
const normalizeBaseUrl = (
  url: string | undefined,
  fallback: string,
): string => {
  const value = url || fallback;
  return value.replace(/\/+$/, '');
};

// Node.js / Express backend — port 5000
export const NODE_API_URL = normalizeBaseUrl(
  configuredNodeApiUrl,
  `http://${HOST}:5000`,
);

// Python / FastAPI backend — port 8000
export const AI_API_URL = normalizeBaseUrl(
  configuredAiApiUrl,
  `http://${HOST}:8000`,
);

// Backward compatibility for existing AI screens.
export const API_BASE_URL = AI_API_URL;
