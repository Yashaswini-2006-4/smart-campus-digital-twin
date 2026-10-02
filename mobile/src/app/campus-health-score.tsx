import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';

// Web runs in your PC browser.
// Android/iOS uses your PC's LAN IP.
const API_URL =
  Platform.OS === 'web'
    ?  "http://192.168.31.98:8000"
    : 'http://192.168.31.98:8000';

interface HealthResponse {
  score: number;
  status: string;
  insight: string;
  component_scores?: {
    occupancy?: number;
    energy?: number;
    anomaly?: number;
  };
  components?: {
    occupancy_score?: number;
    energy_score?: number;
    anomaly_score?: number;
  };
  inputs: {
    occupancy: number;
    energy: number;
    temperature?: number;
    humidity?: number;
    anomaly_detected?: boolean;
    anomaly_risk?: string;
  };
  decision_layer?: string;
  model_status: string;
}

interface WeatherResponse {
  location: string;
  region?: string;
  country?: string;
  local_time?: string;
  temperature_c: number;
  humidity: number;
  condition: string;
  feels_like_c?: number;
  wind_kph?: number;
  last_updated?: string;
  source?: string;
  data_type?: string;
}

export default function CampusHealthScore() {
  const [health, setHealth] =
    useState<HealthResponse | null>(null);

  const [weather, setWeather] =
    useState<WeatherResponse | null>(null);

  const [healthLoading, setHealthLoading] =
    useState(true);

  const [weatherLoading, setWeatherLoading] =
    useState(true);

  const [healthError, setHealthError] =
    useState('');

  const [weatherError, setWeatherError] =
    useState('');

  const fetchHealthScore = useCallback(async () => {
    try {
      setHealthLoading(true);
      setHealthError('');

      const response = await fetch(`${API_URL}/health`);

      if (!response.ok) {
        throw new Error(
          `Health request failed (${response.status})`
        );
      }

      const result: HealthResponse = await response.json();

      setHealth(result);
    } catch (error) {
      console.error('Health score error:', error);
      setHealthError(
        'Unable to load the campus health score.'
      );
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchWeather = useCallback(async () => {
    try {
      setWeatherLoading(true);
      setWeatherError('');

      const response = await fetch(
        `${API_URL}/environment`
      );

      if (!response.ok) {
        throw new Error(
          `Weather request failed (${response.status})`
        );
      }

      const result: WeatherResponse = await response.json();

      setWeather(result);
    } catch (error) {
      console.error('Weather error:', error);
      setWeatherError(
        'Unable to load live weather. Check the backend connection.'
      );
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthScore();
    fetchWeather();
  }, [fetchHealthScore, fetchWeather]);

  const getStatusStyle = () => {
    if (!health) return styles.neutralBadge;

    if (health.status === 'Healthy') {
      return styles.healthyBadge;
    }

    if (health.status === 'Moderate') {
      return styles.moderateBadge;
    }

    return styles.attentionBadge;
  };

  const getStatusTextStyle = () => {
    if (!health) return styles.neutralText;

    if (health.status === 'Healthy') {
      return styles.healthyText;
    }

    if (health.status === 'Moderate') {
      return styles.moderateText;
    }

    return styles.attentionText;
  };

  const occupancyScore =
    health?.component_scores?.occupancy ??
    health?.components?.occupancy_score ??
    0;

  const energyScore =
    health?.component_scores?.energy ??
    health?.components?.energy_score ??
    0;

  const anomalyScore =
    health?.component_scores?.anomaly ??
    health?.components?.anomaly_score ??
    0;

  const anomalyRisk =
    health?.inputs.anomaly_risk ??
    (health?.inputs.anomaly_detected ? 'High' : 'Low');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.title}>
            Campus Health Score
          </Text>

          <Text style={styles.subtitle}>
            AI-based campus health assessment
          </Text>
        </View>
      </View>

      {/* Live Outdoor Weather */}
      <Text style={styles.sectionTitle}>
        Live Environment 🌦️
      </Text>

      <View style={styles.weatherCard}>
        {weatherLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />
            <Text style={styles.loadingText}>
              Fetching live weather...
            </Text>
          </View>
        ) : weatherError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>

            <Text style={styles.errorText}>
              {weatherError}
            </Text>

            <Pressable
              style={styles.smallRetryButton}
              onPress={fetchWeather}
            >
              <Text style={styles.retryText}>
                Retry Weather
              </Text>
            </Pressable>
          </View>
        ) : weather ? (
          <>
            <View style={styles.weatherHeader}>
              <View style={styles.weatherHeaderText}>
                <Text style={styles.weatherLocation}>
                  📍 {weather.location}
                  {weather.region
                    ? `, ${weather.region}`
                    : ''}
                </Text>

                <Text style={styles.weatherSubtitle}>
                  {weather.data_type ??
                    'Live outdoor weather'}
                </Text>
              </View>

              <Text style={styles.weatherEmoji}>
                🌤️
              </Text>
            </View>

            <Text style={styles.temperature}>
              {weather.temperature_c}°C
            </Text>

            <Text style={styles.weatherCondition}>
              {weather.condition}
            </Text>

            <View style={styles.weatherStats}>
              <View style={styles.weatherStat}>
                <Text style={styles.weatherStatIcon}>
                  💧
                </Text>
                <Text style={styles.weatherStatLabel}>
                  Humidity
                </Text>
                <Text style={styles.weatherStatValue}>
                  {weather.humidity}%
                </Text>
              </View>

              <View style={styles.weatherStat}>
                <Text style={styles.weatherStatIcon}>
                  🌬️
                </Text>
                <Text style={styles.weatherStatLabel}>
                  Wind
                </Text>
                <Text style={styles.weatherStatValue}>
                  {weather.wind_kph ?? '--'} km/h
                </Text>
              </View>

              <View style={styles.weatherStat}>
                <Text style={styles.weatherStatIcon}>
                  🌡️
                </Text>
                <Text style={styles.weatherStatLabel}>
                  Feels like
                </Text>
                <Text style={styles.weatherStatValue}>
                  {weather.feels_like_c ?? '--'}°C
                </Text>
              </View>
            </View>

            <Text style={styles.weatherUpdated}>
              Last updated:{' '}
              {weather.last_updated ?? 'Not available'}
            </Text>

            <Text style={styles.weatherSource}>
              Source: {weather.source ?? 'WeatherAPI'}
              {' · '}
              Outdoor data, not indoor classroom readings
            </Text>

            <Pressable
              style={styles.refreshButton}
              onPress={fetchWeather}
              disabled={weatherLoading}
            >
              <Text style={styles.refreshText}>
                Refresh Weather
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {/* Campus Health Score */}
      <Text style={styles.sectionTitle}>
        Campus Health 🏫
      </Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreTitle}>
          Overall Campus Health
        </Text>

        {healthLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

            <Text style={styles.loadingText}>
              Calculating health score...
            </Text>
          </View>
        ) : healthError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>

            <Text style={styles.errorTitle}>
              Connection Error
            </Text>

            <Text style={styles.errorText}>
              {healthError}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={fetchHealthScore}
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : health ? (
          <>
            <Text style={styles.score}>
              {health.score}
            </Text>

            <Text style={styles.outOf}>
              out of 100
            </Text>

            <View
              style={[
                styles.statusBadge,
                getStatusStyle(),
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  getStatusTextStyle(),
                ]}
              >
                {health.status}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {/* AI Insight */}
      {!healthLoading &&
        !healthError &&
        health && (
          <View style={styles.insightCard}>
            <Text style={styles.sectionTitle}>
              AI Health Insight 🤖
            </Text>

            <Text style={styles.insightText}>
              {health.insight}
            </Text>
          </View>
        )}

      {/* ML Components */}
      {!healthLoading &&
        !healthError &&
        health && (
          <>
            <Text style={styles.sectionTitle}>
              ML Health Components
            </Text>

            <View style={styles.componentCard}>
              <View style={styles.componentHeader}>
                <Text style={styles.componentTitle}>
                  Occupancy
                </Text>

                <Text style={styles.componentScore}>
                  {occupancyScore}
                </Text>
              </View>

              <Text style={styles.componentDescription}>
                Current occupancy: {health.inputs.occupancy}%
              </Text>
            </View>

            <View style={styles.componentCard}>
              <View style={styles.componentHeader}>
                <Text style={styles.componentTitle}>
                  Energy
                </Text>

                <Text style={styles.componentScore}>
                  {energyScore}
                </Text>
              </View>

              <Text style={styles.componentDescription}>
                Energy input: {health.inputs.energy} kWh
              </Text>
            </View>

            <View style={styles.componentCard}>
              <View style={styles.componentHeader}>
                <Text style={styles.componentTitle}>
                  Anomaly
                </Text>

                <Text style={styles.componentScore}>
                  {anomalyScore}
                </Text>
              </View>

              <Text style={styles.componentDescription}>
                Current anomaly risk: {anomalyRisk}
              </Text>
            </View>

            <View style={styles.decisionCard}>
              <Text style={styles.decisionTitle}>
                AI Decision Layer
              </Text>

              <Text style={styles.decisionText}>
                The campus health score combines outputs
                from occupancy prediction, energy prediction,
                and anomaly detection.
              </Text>

              <Text style={styles.modelStatus}>
                {health.model_status}
              </Text>
            </View>
          </>
        )}

      {/* Refresh Health */}
      {!healthLoading && (
        <Pressable
          style={styles.refreshButton}
          onPress={fetchHealthScore}
        >
          <Text style={styles.refreshText}>
            Refresh Health Score
          </Text>
        </Pressable>
      )}
    </ScrollView>
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
    alignItems: 'center',
    marginBottom: 24,
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  backText: {
    fontSize: 40,
    color: '#2563EB',
    lineHeight: 42,
  },

  headerContent: {
    flex: 1,
  },

  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#111827',
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 4,
  },

  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    marginBottom: 24,
    elevation: 3,
  },

  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  weatherHeaderText: {
    flex: 1,
  },

  weatherLocation: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },

  weatherSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },

  weatherEmoji: {
    fontSize: 34,
    marginLeft: 12,
  },

  temperature: {
    fontSize: 54,
    fontWeight: 'bold',
    color: '#2563EB',
    marginTop: 12,
  },

  weatherCondition: {
    fontSize: 17,
    color: '#374151',
    marginTop: 2,
    marginBottom: 18,
  },

  weatherStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  weatherStat: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },

  weatherStatIcon: {
    fontSize: 20,
    marginBottom: 5,
  },

  weatherStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },

  weatherStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
    textAlign: 'center',
  },

  weatherUpdated: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 16,
  },

  weatherSource: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    marginTop: 5,
  },

  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
  },

  scoreTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 14,
  },

  score: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#2563EB',
  },

  outOf: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 16,
  },

  healthyBadge: {
    backgroundColor: '#DCFCE7',
  },

  moderateBadge: {
    backgroundColor: '#FEF3C7',
  },

  attentionBadge: {
    backgroundColor: '#FEE2E2',
  },

  neutralBadge: {
    backgroundColor: '#E5E7EB',
  },

  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  healthyText: {
    color: '#15803D',
  },

  moderateText: {
    color: '#A16207',
  },

  attentionText: {
    color: '#B91C1C',
  },

  neutralText: {
    color: '#374151',
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },

  errorContainer: {
    alignItems: 'center',
  },

  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B91C1C',
  },

  errorText: {
    fontSize: 13,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },

  retryButton: {
    backgroundColor: '#B91C1C',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 14,
  },

  smallRetryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
  },

  insightText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },

  componentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
  },

  componentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  componentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },

  componentScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },

  componentDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginTop: 8,
  },

  decisionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 12,
    elevation: 2,
  },

  decisionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },

  decisionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },

  modelStatus: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: 'bold',
    marginTop: 10,
  },

  refreshButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  refreshText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});