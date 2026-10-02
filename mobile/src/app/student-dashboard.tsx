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

type EnvironmentData = {
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [weatherError, setWeatherError] = useState('');

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
    fetchDashboard();
    fetchWeather();
  }, [fetchDashboard, fetchWeather]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
    fetchWeather(true);
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Hello, Student 👋</Text>
            <Text style={styles.subtitle}>
              Smart Campus Dashboard
            </Text>
          </View>

          <View style={styles.profileCircle}>
            <Text style={styles.profileText}>S</Text>
          </View>
        </View>

        {/* Campus Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Campus Status</Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor },
              ]}
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
            <Text style={styles.statusInsight}>
              {health.insight}
            </Text>
          ) : null}
        </View>

        {/* Dashboard error */}
        {dashboardError ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>{dashboardError}</Text>
          </View>
        ) : null}

        {/* Campus Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Campus Overview</Text>

          {loading ? (
            <ActivityIndicator color="#2563EB" />
          ) : null}
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
                ? `${formatNumber(health.score, 0)}`
                : '--'}
            </Text>
            <Text style={styles.statLabel}>Campus Health</Text>
            <Text style={styles.statCaption}>
              {health?.status || 'Score unavailable'}
            </Text>
          </View>
        </View>

        {/* Predictions summary */}
        <Text style={styles.sectionTitle}>AI Predictions</Text>

        <View style={styles.predictionCard}>
          <View style={styles.predictionHeader}>
            <Text style={styles.predictionIcon}>👥</Text>
            <Text style={styles.predictionTitle}>
              Occupancy Prediction
            </Text>
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
            <Text style={styles.predictionTitle}>
              Energy Prediction
            </Text>
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

        {/* Live Outdoor Weather */}
        <Text style={styles.sectionTitle}>
          Live Outdoor Weather 🌦️
        </Text>

        <View style={styles.weatherCard}>
          <View style={styles.weatherHeader}>
            <Text style={styles.weatherTitle}>Current Conditions</Text>

            <Pressable
              style={styles.refreshButton}
              onPress={() => fetchWeather(true)}
            >
              <Text style={styles.refreshButtonText}>↻ Refresh</Text>
            </Pressable>
          </View>

          {weather ? (
            <>
              <Text style={styles.weatherLocation}>
                📍 {[weather.location, weather.region]
                  .filter(Boolean)
                  .join(', ')}
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
                Source: {weather.source || 'WeatherAPI'} · Outdoor data
              </Text>
            </>
          ) : (
            <Text style={styles.weatherMuted}>
              {weatherError || 'Loading live weather...'}
            </Text>
          )}

          {weatherError && weather ? (
            <Text style={styles.weatherWarning}>{weatherError}</Text>
          ) : null}
        </View>

        {/* AI Recommendations */}
        <Text style={styles.sectionTitle}>
          AI Recommendations 🤖
        </Text>

        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>
            Smart Campus Insights
          </Text>

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

        {/* Additional Features */}
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

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
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
  weatherWarning: {
    color: '#B45309',
    fontSize: 12,
    marginTop: 10,
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
});