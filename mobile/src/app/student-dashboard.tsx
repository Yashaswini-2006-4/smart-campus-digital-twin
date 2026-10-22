
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RoleGuard from '../components/auth/RoleGuard';
import { API_BASE_URL } from '../constants/api';

type AirQualityData = {
  available?: boolean;
  us_epa_index?: number | null;
  us_epa_category?: string | null;
  gb_defra_index?: number | null;
  gb_defra_band?: string | null;
  pm2_5?: number | null;
  pm10?: number | null;
  co?: number | null;
  o3?: number | null;
  no2?: number | null;
  so2?: number | null;
  last_updated?: string | null;
  index_note?: string;
  pollutant_units?: string;
};

type EnvironmentData = {
  air_quality?: AirQualityData;
  location?: string;
  region?: string;
  temperature_c?: number;
  humidity?: number;
  condition?: string;
  feels_like_c?: number;
  wind_kph?: number;
  last_updated?: string;
  source?: string;
};

type SensorData = {
  occupancy?: number;
  energy?: number;
  temperature?: number;
  humidity?: number;
  timestamp?: string;
};

type OccupancyData = {
  current_occupancy?: number;
  predicted_occupancy?: number;
  level?: string;
  insight?: string;
};

type EnergyData = {
  current_energy?: number;
  predicted_energy?: number;
  level?: string;
  insight?: string;
};

type HealthData = {
  score?: number;
  status?: string;
  insight?: string;
};

type Recommendation = {
  category?: string;
  priority?: string;
  title?: string;
  message?: string;
  action?: string;
};

type RecommendationsData = {
  summary?: string;
  recommendations?: Recommendation[];
};

function formatNumber(value: unknown, decimals = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return Number(value.toFixed(decimals)).toString();
}

function aqiColor(index?: number | null): string {
  if (typeof index !== 'number' || !Number.isFinite(index)) return '#64748B';
  if (index <= 1) return '#15803D';
  if (index <= 2) return '#65A30D';
  if (index <= 3) return '#D97706';
  if (index <= 4) return '#EA580C';
  return '#B91C1C';
}

function pollutantValue(value?: number | null): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—';
}

function priorityColor(priority?: string): string {
  switch (priority?.toLowerCase()) {
    case 'high':
      return '#DC2626';
    case 'medium':
      return '#D97706';
    case 'normal':
      return '#2563EB';
    case 'low':
      return '#16A34A';
    default:
      return '#6B7280';
  }
}

export default function StudentDashboard() {
  const [sensor, setSensor] = useState<SensorData | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyData | null>(null);
  const [energy, setEnergy] = useState<EnergyData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [recommendations, setRecommendations] =
    useState<RecommendationsData | null>(null);
  const [weather, setWeather] = useState<EnvironmentData | null>(null);
  const [weatherError, setWeatherError] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  const fetchJson = async <T,>(endpoint: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);

    if (!response.ok) {
      throw new Error(`${endpoint} returned ${response.status}`);
    }

    return (await response.json()) as T;
  };

  const fetchDashboard = useCallback(async () => {
    try {
      setDashboardError('');

      const results = await Promise.allSettled([
        fetchJson<SensorData>('/sensor-data'),
        fetchJson<OccupancyData>('/occupancy'),
        fetchJson<EnergyData>('/energy'),
        fetchJson<HealthData>('/health'),
        fetchJson<RecommendationsData>('/recommendations'),
      ]);

      const [
        sensorResult,
        occupancyResult,
        energyResult,
        healthResult,
        recommendationsResult,
      ] = results;

      let failures = 0;

      if (sensorResult.status === 'fulfilled') {
        setSensor(sensorResult.value);
      } else {
        failures++;
      }

      if (occupancyResult.status === 'fulfilled') {
        setOccupancy(occupancyResult.value);
      } else {
        failures++;
      }

      if (energyResult.status === 'fulfilled') {
        setEnergy(energyResult.value);
      } else {
        failures++;
      }

      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value);
      } else {
        failures++;
      }

      if (recommendationsResult.status === 'fulfilled') {
        setRecommendations(recommendationsResult.value);
      } else {
        failures++;
      }

      if (failures === results.length) {
        setDashboardError(
          'Could not load campus data. Check that the backend is running and sensor data is available.',
        );
      } else if (failures > 0) {
        setDashboardError(
          `${failures} campus data request(s) failed. Some values may be unavailable.`,
        );
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setDashboardError('Unable to load campus data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchWeather = useCallback(async (refresh = false) => {
    try {
      setWeatherError('');
      const data = await fetchJson<EnvironmentData>(
        `/environment?refresh=${refresh}`,
      );
      setWeather(data);
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeatherError('Live weather is currently unavailable.');
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
    void fetchWeather();
  }, [fetchDashboard, fetchWeather]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchDashboard();
    void fetchWeather(true);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('userRole');
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Logout failed', 'Please try again.');
    }
  };

  const openChatbot = () => {
    router.push('/chatbot' as any);
  };

  const campusStatus = health?.status || 'Data unavailable';

  const statusColor =
    campusStatus === 'Healthy'
      ? '#16A34A'
      : campusStatus === 'Moderate'
        ? '#D97706'
        : campusStatus === 'Needs Attention'
          ? '#DC2626'
          : '#9CA3AF';

  const recommendationList = recommendations?.recommendations ?? [];

  return (
    <RoleGuard allowedRole="student">
      <View style={styles.screen}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Hello, Student 👋</Text>
              <Text style={styles.subtitle}>Smart Campus Dashboard</Text>
            </View>

            <View style={styles.profileCircle}>
              <Text style={styles.profileText}>S</Text>
            </View>
          </View>

          {/* Primary student navigation */}
          <Text style={styles.sectionTitle}>Explore Your Campus 🧭</Text>
          <Text style={styles.navigationIntro}>
            Start with the campus digital twin, then report or track campus issues.
          </Text>

          <Pressable
            style={styles.primaryNavigationCard}
            onPress={() => router.push('/digital-twin')}
          >
            <View style={styles.primaryNavigationIcon}>
              <Text style={styles.primaryNavigationEmoji}>🏫</Text>
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.primaryNavigationTitle}>Campus Digital Twin</Text>
              <Text style={styles.featureDescription}>
                Explore campus buildings, departments, rooms and facilities.
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.primaryNavigationCard}
            onPress={() => router.push('/complaints')}
          >
            <View style={styles.primaryNavigationIcon}>
              <Text style={styles.primaryNavigationEmoji}>📋</Text>
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.primaryNavigationTitle}>Campus Complaints</Text>
              <Text style={styles.featureDescription}>
                Report campus problems and follow their status.
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          {/* Campus status */}
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Campus Status</Text>

            <View style={styles.statusRow}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={styles.statusText}>
                {loading ? 'Checking campus status...' : campusStatus}
              </Text>
              {health?.score !== undefined && (
                <Text style={styles.statusScore}>
                  {formatNumber(health.score, 0)}/100
                </Text>
              )}
            </View>

            {health?.insight ? (
              <Text style={styles.statusInsight}>{health.insight}</Text>
            ) : null}
          </View>

          {/* Dashboard errors */}
          {dashboardError ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{dashboardError}</Text>
            </View>
          ) : null}

          {/* Campus overview */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Campus Overview</Text>
            {loading ? <ActivityIndicator color="#2563EB" /> : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>👥</Text>
              <Text style={styles.statValue}>
                {formatNumber(
                  occupancy?.current_occupancy ?? sensor?.occupancy,
                  0,
                )}
              </Text>
              <Text style={styles.statLabel}>Occupancy</Text>
              <Text style={styles.statCaption}>
                {occupancy?.level || 'Current campus'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>⚡</Text>
              <Text style={styles.statValue}>
                {formatNumber(
                  energy?.current_energy ?? sensor?.energy,
                  0,
                )}
              </Text>
              <Text style={styles.statLabel}>Energy</Text>
              <Text style={styles.statCaption}>Current reading</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🌡️</Text>
              <Text style={styles.statValue}>
                {typeof sensor?.temperature === 'number'
                  ? `${formatNumber(sensor.temperature)}°C`
                  : '--'}
              </Text>
              <Text style={styles.statLabel}>Campus Temperature</Text>
              <Text style={styles.statCaption}>Sensor reading</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🏥</Text>
              <Text style={styles.statValue}>
                {health?.score !== undefined
                  ? formatNumber(health.score, 0)
                  : '--'}
              </Text>
              <Text style={styles.statLabel}>Campus Health</Text>
              <Text style={styles.statCaption}>
                {health?.status || 'Score unavailable'}
              </Text>
            </View>
          </View>

          {/* AI predictions */}
          <Text style={styles.sectionTitle}>AI Predictions</Text>

          <View style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Text style={styles.predictionIcon}>👥</Text>
              <Text style={styles.predictionTitle}>Occupancy Prediction</Text>
            </View>

            <Text style={styles.predictionValue}>
              {formatNumber(occupancy?.predicted_occupancy, 1)}
            </Text>
            <Text style={styles.predictionDescription}>
              {occupancy?.insight || 'Prediction unavailable.'}
            </Text>

            <Pressable
              style={styles.smallLink}
              onPress={() => router.push('/occupancy-prediction')}
            >
              <Text style={styles.smallLinkText}>View details ›</Text>
            </Pressable>
          </View>

          <View style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Text style={styles.predictionIcon}>⚡</Text>
              <Text style={styles.predictionTitle}>Energy Prediction</Text>
            </View>

            <Text style={styles.predictionValue}>
              {formatNumber(energy?.predicted_energy, 1)}
            </Text>
            <Text style={styles.predictionDescription}>
              {energy?.insight || 'Prediction unavailable.'}
            </Text>

            <Pressable
              style={styles.smallLink}
              onPress={() => router.push('/energy-prediction')}
            >
              <Text style={styles.smallLinkText}>View details ›</Text>
            </Pressable>
          </View>

          {/* Live outdoor weather */}
          <Text style={styles.sectionTitle}>Live Outdoor Weather 🌦️</Text>

          <View style={styles.weatherCard}>
            <View style={styles.weatherHeader}>
              <Text style={styles.weatherTitle}>Current Conditions</Text>
              <Pressable
                style={styles.refreshButton}
                onPress={() => void fetchWeather(true)}
              >
                <Text style={styles.refreshButtonText}>↻ Refresh</Text>
              </Pressable>
            </View>

            {weather ? (
              <>
                <Text style={styles.weatherLocation}>
                  📍 {[weather.location, weather.region].filter(Boolean).join(', ')}
                </Text>

                <Text style={styles.weatherTemperature}>
                  {typeof weather.temperature_c === 'number'
                    ? `${weather.temperature_c}°C`
                    : '--'}
                </Text>

                <Text style={styles.weatherCondition}>
                  {weather.condition || 'Condition unavailable'}
                </Text>

                <View style={styles.weatherDetails}>
                  <View style={styles.weatherDetailItem}>
                    <Text style={styles.weatherDetailIcon}>💧</Text>
                    <Text style={styles.weatherDetailLabel}>Humidity</Text>
                    <Text style={styles.weatherDetailValue}>
                      {typeof weather.humidity === 'number'
                        ? `${weather.humidity}%`
                        : '--'}
                    </Text>
                  </View>

                  <View style={styles.weatherDetailItem}>
                    <Text style={styles.weatherDetailIcon}>🌡️</Text>
                    <Text style={styles.weatherDetailLabel}>Feels like</Text>
                    <Text style={styles.weatherDetailValue}>
                      {typeof weather.feels_like_c === 'number'
                        ? `${weather.feels_like_c}°C`
                        : '--'}
                    </Text>
                  </View>

                  <View style={styles.weatherDetailItem}>
                    <Text style={styles.weatherDetailIcon}>💨</Text>
                    <Text style={styles.weatherDetailLabel}>Wind</Text>
                    <Text style={styles.weatherDetailValue}>
                      {typeof weather.wind_kph === 'number'
                        ? `${weather.wind_kph} km/h`
                        : '--'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.weatherSource}>
                  Source: {weather.source || 'WeatherAPI'}
                  {weather.last_updated
                    ? ` · Updated ${weather.last_updated}`
                    : ''}
                </Text>
              </>
            ) : (
              <View style={styles.weatherUnavailable}>
                <Text style={styles.weatherErrorTitle}>Weather unavailable</Text>
                <Text style={styles.weatherErrorText}>
                  {weatherError || 'Loading current outdoor conditions…'}
                </Text>
                <Pressable
                  style={styles.weatherRetryButton}
                  onPress={() => void fetchWeather(true)}
                >
                  <Text style={styles.weatherRetryText}>Retry</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Live air quality from the existing environment API */}
          <View style={styles.aqiCard}>
            <View style={styles.aqiHeader}>
              <View style={styles.aqiHeaderText}>
                <Text style={styles.aqiTitle}>🌿 Live Air Quality (AQI)</Text>
                <Text style={styles.aqiSubtitle}>
                  {[weather?.location, weather?.region].filter(Boolean).join(', ') || 'Outdoor air quality'}
                </Text>
              </View>
              <Pressable style={styles.refreshButton} onPress={() => void fetchWeather(true)}>
                <Text style={styles.refreshButtonText}>↻ Refresh</Text>
              </Pressable>
            </View>
            {weather?.air_quality?.available ? (
              <>
                <View style={styles.aqiIndexRow}>
                  <View style={styles.aqiIndexPanel}>
                    <Text style={styles.aqiIndexLabel}>US EPA Index</Text>
                    <Text style={[styles.aqiIndexValue, { color: aqiColor(weather.air_quality.us_epa_index) }]}>
                      {weather.air_quality.us_epa_index ?? '—'}
                    </Text>
                    <Text style={styles.aqiCategory}>{weather.air_quality.us_epa_category ?? 'Not provided'}</Text>
                  </View>
                  <View style={styles.aqiDivider} />
                  <View style={styles.aqiIndexPanel}>
                    <Text style={styles.aqiIndexLabel}>UK DEFRA Index</Text>
                    <Text style={[styles.aqiIndexValue, { color: aqiColor(weather.air_quality.gb_defra_index) }]}>
                      {weather.air_quality.gb_defra_index ?? '—'}
                    </Text>
                    <Text style={styles.aqiCategory}>{weather.air_quality.gb_defra_band ?? 'Not provided'}</Text>
                  </View>
                </View>
                <Text style={styles.aqiPollutantHeading}>Pollutants</Text>
                <View style={styles.aqiPollutantGrid}>
                  {([
                    ['PM2.5', weather.air_quality.pm2_5],
                    ['PM10', weather.air_quality.pm10],
                    ['CO', weather.air_quality.co],
                    ['O₃', weather.air_quality.o3],
                    ['NO₂', weather.air_quality.no2],
                    ['SO₂', weather.air_quality.so2],
                  ] as const).map(([label, value]) => (
                    <View key={label} style={styles.aqiPollutantItem}>
                      <Text style={styles.aqiPollutantLabel}>{label}</Text>
                      <Text style={styles.aqiPollutantValue}>{pollutantValue(value)}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.aqiUpdated}>
                  {weather.air_quality.last_updated || weather.last_updated
                    ? `Observation: ${weather.air_quality.last_updated || weather.last_updated}`
                    : 'Observation time not provided'}
                </Text>
                <Text style={styles.aqiNote}>
                  {weather.air_quality.index_note || 'Index standards are defined by the data provider.'}
                </Text>
              </>
            ) : (
              <Text style={styles.aqiUnavailableText}>
                {weatherError || weather?.air_quality?.available === false
                  ? 'Live AQI is currently unavailable. Check the weather service AQI access and try refreshing.'
                  : 'Loading live air-quality readings…'}
              </Text>
            )}
          </View>

          {/* AI recommendations */}
          <Text style={styles.sectionTitle}>AI Recommendations 🤖</Text>

          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>Smart Campus Insights</Text>

            {recommendations?.summary ? (
              <Text style={styles.recommendationSummary}>
                {recommendations.summary}
              </Text>
            ) : null}

            {recommendationList.length > 0 ? (
              recommendationList.map((item, index) => (
                <View
                  key={`${item.category || 'recommendation'}-${index}`}
                  style={styles.recommendationItem}
                >
                  <View style={styles.recommendationItemHeader}>
                    <Text style={styles.recommendationItemTitle}>
                      {item.title || item.category || 'Recommendation'}
                    </Text>

                    <Text
                      style={[
                        styles.priority,
                        { color: priorityColor(item.priority) },
                      ]}
                    >
                      {item.priority || 'Info'}
                    </Text>
                  </View>

                  {item.message ? (
                    <Text style={styles.recommendationText}>
                      {item.message}
                    </Text>
                  ) : null}

                  {item.action ? (
                    <Text style={styles.recommendationAction}>
                      Action: {item.action}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.recommendationText}>
                {loading
                  ? 'Loading recommendations...'
                  : 'No recommendations are available. Check campus sensor data.'}
              </Text>
            )}
          </View>

          {/* Additional campus features */}
          <Text style={styles.sectionTitle}>Campus Features</Text>

          <Pressable
            style={styles.featureCard}
            onPress={() => router.push('/anomaly-detection')}
          >
            <View style={styles.featureIconBox}>
              <Text style={styles.featureIcon}>🔎</Text>
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Anomaly Detection</Text>
              <Text style={styles.featureDescription}>
                View unusual campus sensor patterns.
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.featureCard}
            onPress={() => router.push('/campus-health-score')}
          >
            <View style={styles.featureIconBox}>
              <Text style={styles.featureIcon}>🏥</Text>
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Campus Health Score</Text>
              <Text style={styles.featureDescription}>
                View campus health and component scores.
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          {/* Refresh dashboard */}
          <Pressable
            style={[
              styles.dashboardRefreshButton,
              refreshing && styles.buttonDisabled,
            ]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Text style={styles.dashboardRefreshText}>
              {refreshing ? 'Refreshing Dashboard...' : 'Refresh Dashboard'}
            </Text>
          </Pressable>

          {/* Keep the existing Logout feature */}
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => void handleLogout()}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Floating chatbot button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Campus Assistant chatbot"
          onPress={openChatbot}
          style={({ pressed }) => [
            styles.chatbotButton,
            pressed && styles.chatbotButtonPressed,
          ]}
        >
          <Text style={styles.chatbotButtonIcon}>💬</Text>
          <Text style={styles.chatbotButtonLabel}>Chat</Text>
        </Pressable>
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  aqiCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginTop: 18, marginBottom: 8, borderWidth: 1, borderColor: '#D1FAE5' },
  aqiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  aqiHeaderText: { flex: 1 },
  aqiTitle: { color: '#111827', fontSize: 17, fontWeight: 'bold' },
  aqiSubtitle: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  aqiIndexRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 14 },
  aqiIndexPanel: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  aqiDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#E2E8F0' },
  aqiIndexLabel: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  aqiIndexValue: { fontSize: 31, fontWeight: 'bold', marginTop: 5 },
  aqiCategory: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 2 },
  aqiPollutantHeading: { color: '#374151', fontSize: 13, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  aqiPollutantGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aqiPollutantItem: { width: '30%', flexGrow: 1, backgroundColor: '#F8FAFC', borderRadius: 9, padding: 10 },
  aqiPollutantLabel: { color: '#64748B', fontSize: 12 },
  aqiPollutantValue: { color: '#111827', fontSize: 15, fontWeight: 'bold', marginTop: 4 },
  aqiUpdated: { color: '#64748B', fontSize: 11, marginTop: 12 },
  aqiNote: { color: '#64748B', fontSize: 11, lineHeight: 16, marginTop: 7 },
  aqiUnavailableText: { color: '#64748B', fontSize: 13, lineHeight: 19, paddingVertical: 8 },
  screen: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  bottomSpacer: {
    height: 45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusText: {
    color: '#4B5563',
    fontSize: 14,
    flex: 1,
  },
  statusScore: {
    color: '#111827',
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusInsight: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  warningText: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    elevation: 2,
  },
  statIcon: {
    fontSize: 25,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },
  statCaption: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 5,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  predictionValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 6,
  },
  predictionDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  smallLink: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  smallLinkText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  refreshButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  weatherLocation: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 8,
  },
  weatherTemperature: {
    color: '#2563EB',
    fontSize: 42,
    fontWeight: 'bold',
  },
  weatherCondition: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 20,
  },
  weatherDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    gap: 8,
  },
  weatherDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  weatherDetailIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  weatherDetailLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  weatherDetailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
    textAlign: 'center',
  },
  weatherMuted: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 21,
  },
  weatherSource: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 18,
  },
  weatherUnavailable: {
    paddingVertical: 12,
  },
  weatherErrorTitle: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  weatherErrorText: {
    color: '#B91C1C',
    marginBottom: 12,
  },
  weatherRetryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  weatherRetryText: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
  },
  recommendationTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  recommendationSummary: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  recommendationItem: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 14,
    marginTop: 8,
  },
  recommendationItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  recommendationItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  priority: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  recommendationText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  recommendationAction: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginTop: 6,
  },
  primaryNavigationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  primaryNavigationIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  primaryNavigationEmoji: {
    fontSize: 24,
  },
  primaryNavigationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  navigationIntro: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
    marginTop: -6,
    marginBottom: 12,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  featureIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureIcon: {
    fontSize: 21,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  featureDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 5,
    lineHeight: 19,
  },
  arrow: {
    marginLeft: 10,
    fontSize: 28,
    color: '#2563EB',
  },
  dashboardRefreshButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  dashboardRefreshText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  logoutButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  chatbotButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    minWidth: 64,
    height: 58,
    paddingHorizontal: 16,
    borderRadius: 29,
    backgroundColor: '#173B70',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    zIndex: 1000,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  chatbotButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  chatbotButtonIcon: {
    fontSize: 21,
    marginRight: 7,
  },
  chatbotButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
