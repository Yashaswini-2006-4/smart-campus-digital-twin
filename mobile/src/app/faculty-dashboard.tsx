import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RoleGuard from '../components/auth/RoleGuard';
import { API_BASE_URL } from '../constants/api';

type ApiData = any;

type DashboardData = {
  sensorData: ApiData;
  occupancy: ApiData;
  energy: ApiData;
  anomaly: ApiData;
  health: ApiData;
  recommendations: ApiData;
};

const EMPTY_DATA: DashboardData = {
  sensorData: null,
  occupancy: null,
  energy: null,
  anomaly: null,
  health: null,
  recommendations: null,
};

const isObject = (
  value: any,
): value is Record<string, any> => {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
};

const getRecords = (data: any): any[] => {
  if (Array.isArray(data)) {
    return data;
  }

  if (!isObject(data)) {
    return [];
  }

  for (const key of [
    'readings',
    'data',
    'results',
    'items',
    'records',
    'sensor_data',
  ]) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  return [];
};

const getLatestRecord = (data: any): any => {
  const records = getRecords(data);

  if (records.length > 0) {
    return records[0];
  }

  if (isObject(data)) {
    for (const key of ['latest', 'reading', 'result']) {
      if (isObject(data[key])) {
        return data[key];
      }
    }

    return data;
  }

  return null;
};

const findNumber = (
  data: any,
  keys: string[],
  depth = 0,
): number | null => {
  if (depth > 4 || data == null) {
    return null;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findNumber(
        item,
        keys,
        depth + 1,
      );

      if (result !== null) {
        return result;
      }
    }

    return null;
  }

  if (!isObject(data)) {
    return null;
  }

  for (const key of keys) {
    const value = data[key];

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === 'string' &&
      value.trim() !== '' &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  for (const value of Object.values(data)) {
    if (
      isObject(value) ||
      Array.isArray(value)
    ) {
      const result = findNumber(
        value,
        keys,
        depth + 1,
      );

      if (result !== null) {
        return result;
      }
    }
  }

  return null;
};

const formatValue = (
  value: number | null,
  suffix = '',
): string => {
  if (value === null) {
    return '--';
  }

  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toFixed(1);

  return `${formatted}${suffix}`;
};

const getRecommendations = (
  data: any,
): string[] => {
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (isObject(item)) {
          return (
            item.message ??
            item.recommendation ??
            item.description ??
            item.text ??
            ''
          );
        }

        return '';
      })
      .filter(
        (item): item is string =>
          typeof item === 'string' &&
          item.trim().length > 0,
      );
  }

  if (isObject(data)) {
    for (const key of [
      'recommendations',
      'items',
      'results',
      'data',
    ]) {
      if (Array.isArray(data[key])) {
        return getRecommendations(data[key]);
      }
    }

    const message =
      data.message ??
      data.recommendation ??
      data.description;

    if (
      typeof message === 'string' &&
      message.trim()
    ) {
      return [message];
    }
  }

  return [];
};

const getAlertCount = (
  data: any,
): number | null => {
  if (data == null) {
    return null;
  }

  if (Array.isArray(data)) {
    return data.length;
  }

  if (!isObject(data)) {
    return null;
  }

  const count = findNumber(data, [
    'alert_count',
    'alerts_count',
    'total_alerts',
    'anomaly_count',
    'total_anomalies',
  ]);

  if (count !== null) {
    return count;
  }

  for (const key of [
    'alerts',
    'anomalies',
    'items',
    'results',
  ]) {
    if (Array.isArray(data[key])) {
      return data[key].length;
    }
  }

  if (typeof data.anomaly_detected === 'boolean') {
    return data.anomaly_detected ? 1 : 0;
  }

  if (typeof data.is_anomaly === 'boolean') {
    return data.is_anomaly ? 1 : 0;
  }

  if (typeof data.anomaly === 'boolean') {
    return data.anomaly ? 1 : 0;
  }

  return null;
};

const getHealthStatus = (
  data: any,
): string => {
  if (typeof data === 'string') {
    return data;
  }

  if (!isObject(data)) {
    return 'Campus status unavailable';
  }

  const status =
    data.status ??
    data.health_status ??
    data.campus_status ??
    data.message;

  if (typeof status === 'string') {
    return status;
  }

  if (typeof data.healthy === 'boolean') {
    return data.healthy
      ? 'Campus health is normal'
      : 'Campus health needs attention';
  }

  if (typeof data.is_healthy === 'boolean') {
    return data.is_healthy
      ? 'Campus health is normal'
      : 'Campus health needs attention';
  }

  return 'Campus status available';
};

const getAnomalyRisk = (data: any): string => {
  if (!isObject(data)) {
    return 'Unknown';
  }

  const risk = data.risk ?? data.severity;

  if (typeof risk === 'string') {
    return risk;
  }

  return data.anomaly_detected === true
    ? 'Anomaly detected'
    : 'No anomaly reported';
};

export default function FacultyDashboard() {
  const [dashboard, setDashboard] =
    useState<DashboardData>(EMPTY_DATA);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      setError('');

      const endpoints = [
        '/sensor-data',
        '/occupancy',
        '/energy',
        '/anomaly',
        '/health',
        '/recommendations',
      ];

      const results = await Promise.allSettled(
        endpoints.map(async (endpoint) => {
          const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
          );

          if (!response.ok) {
            throw new Error(
              `${endpoint} returned ${response.status}`,
            );
          }

          return response.json();
        }),
      );

      const nextData: DashboardData = {
        ...EMPTY_DATA,
      };

      const keys: (keyof DashboardData)[] = [
        'sensorData',
        'occupancy',
        'energy',
        'anomaly',
        'health',
        'recommendations',
      ];

      let successCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          nextData[keys[index]] = result.value;
          successCount += 1;
        } else {
          console.warn(
            `Faculty dashboard request failed (${endpoints[index]}):`,
            result.reason,
          );
        }
      });

      setDashboard(nextData);

      if (successCount === 0) {
        setError(
          'Unable to connect to the backend. Check that the backend is running and your device is connected to the same network.',
        );
      } else if (successCount < endpoints.length) {
        setError(
          'Some dashboard information could not be loaded. Pull down to refresh.',
        );
      }
    } catch (err) {
      console.error(
        'Faculty dashboard error:',
        err,
      );

      setError(
        'Unable to load dashboard information.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('userRole');

      router.replace('/login');
    } catch (err) {
      console.error('Logout failed:', err);

      Alert.alert(
        'Error',
        'Unable to log out. Please try again.',
      );
    }
  };

  const latestSensor = getLatestRecord(
    dashboard.sensorData,
  );

  const occupancy =
    findNumber(latestSensor, [
      'occupancy',
      'occupancy_count',
      'people_count',
      'current_occupancy',
    ]) ??
    findNumber(dashboard.occupancy, [
      'current_occupancy',
      'occupancy',
      'predicted_occupancy',
      'prediction',
      'predicted_value',
    ]);

  // Prefer the actual sensor reading over the prediction.
  const energy =
    findNumber(latestSensor, [
      'energy',
      'energy_usage',
      'energy_consumption',
      'power',
      'power_usage',
    ]) ??
    findNumber(dashboard.energy, [
      'energy',
      'energy_usage',
      'predicted_energy',
      'prediction',
      'predicted_value',
    ]);

  // The backend's class_schedule value is 1 in the supplied response.
  const activeClasses = findNumber(latestSensor, [
    'active_classes',
    'class_count',
    'class_schedule',
  ]);

  const alertCount = getAlertCount(
    dashboard.anomaly,
  );

  const recommendations = getRecommendations(
    dashboard.recommendations,
  );

  const healthStatus = getHealthStatus(
    dashboard.health,
  );

  const healthScore = findNumber(
    dashboard.health,
    ['score', 'health_score', 'campus_health_score'],
  );

  const anomalyRisk = getAnomalyRisk(
    dashboard.anomaly,
  );

  const anomalyDetected =
    isObject(dashboard.anomaly) &&
    dashboard.anomaly.anomaly_detected === true;

  const hasAlerts =
    alertCount !== null && alertCount > 0;

  return (
    <RoleGuard allowedRole="faculty">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563EB']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              Hello, Faculty 👋
            </Text>

            <Text style={styles.subtitle}>
              Faculty Dashboard
            </Text>
          </View>

          <View style={styles.profileCircle}>
            <Text style={styles.profileText}>
              F
            </Text>
          </View>
        </View>

        {/* Campus Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>
              Campus Status
            </Text>

            {loading ? (
              <ActivityIndicator
                size="small"
                color="#2563EB"
              />
            ) : (
              <View
                style={[
                  styles.statusDot,
                  hasAlerts && styles.alertDot,
                ]}
              />
            )}
          </View>

          <Text style={styles.statusText}>
            {loading
              ? 'Checking campus status...'
              : healthStatus}
          </Text>

          {healthScore !== null && (
            <View style={styles.healthScoreRow}>
              <Text style={styles.healthScoreLabel}>
                Campus Health Score
              </Text>

              <Text style={styles.healthScoreValue}>
                {formatValue(healthScore)} / 100
              </Text>
            </View>
          )}

          {error ? (
            <Text style={styles.errorText}>
              {error}
            </Text>
          ) : null}
        </View>

        {/* Today's Overview */}
        <Text style={styles.sectionTitle}>
          Today's Overview
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.icon}>📚</Text>

            <Text style={styles.value}>
              {loading
                ? '...'
                : formatValue(activeClasses)}
            </Text>

            <Text style={styles.label}>
              Active Classes
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.icon}>👥</Text>

            <Text style={styles.value}>
              {loading
                ? '...'
                : formatValue(occupancy)}
            </Text>

            <Text style={styles.label}>
              Occupancy
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.icon}>⚡</Text>

            <Text style={styles.value}>
              {loading
                ? '...'
                : formatValue(energy)}
            </Text>

            <Text style={styles.label}>
              Energy Usage
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.icon}>🚨</Text>

            <Text style={styles.value}>
              {loading
                ? '...'
                : formatValue(alertCount)}
            </Text>

            <Text style={styles.label}>
              Alerts
            </Text>
          </View>
        </View>

        {/* Class Occupancy */}
        <Text style={styles.sectionTitle}>
          Class Occupancy
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.featureCard,
            pressed && styles.featureCardPressed,
          ]}
          onPress={() =>
            router.push('/occupancy-prediction')
          }
        >
          <View style={styles.featureIcon}>
            <Text style={styles.featureEmoji}>
              👥
            </Text>
          </View>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Classroom Occupancy
            </Text>

            <Text style={styles.featureDescription}>
              View current and predicted classroom occupancy.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* AI Recommendations */}
        <Text style={styles.sectionTitle}>
          AI Recommendations 🤖
        </Text>

        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>
            Smart Teaching Insights
          </Text>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#2563EB" />

              <Text style={styles.recommendationText}>
                Loading recommendations...
              </Text>
            </View>
          ) : recommendations.length > 0 ? (
            recommendations
              .slice(0, 5)
              .map((recommendation, index) => (
                <View
                  key={`${index}-${recommendation}`}
                  style={styles.recommendationItem}
                >
                  <Text style={styles.bullet}>
                    •
                  </Text>

                  <Text
                    style={styles.recommendationText}
                  >
                    {recommendation}
                  </Text>
                </View>
              ))
          ) : (
            <Text style={styles.recommendationText}>
              No recommendations are available right now.
              Refresh to check for updates.
            </Text>
          )}
        </View>

        {/* Campus Alerts */}
        <Text style={styles.sectionTitle}>
          Campus Alerts
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.featureCard,
            pressed && styles.featureCardPressed,
          ]}
          onPress={() =>
            router.push('/anomaly-detection')
          }
        >
          <View style={styles.alertIcon}>
            <Text style={styles.featureEmoji}>
              🚨
            </Text>
          </View>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Active Alerts
            </Text>

            <Text style={styles.featureDescription}>
              {loading
                ? 'Checking for anomalies...'
                : anomalyDetected
                  ? `${anomalyRisk} risk — anomaly detected. View details.`
                  : alertCount === 0
                    ? 'No anomalies reported.'
                    : 'View campus alerts and anomaly notifications.'}
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Refresh */}
        <Pressable
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color="#2563EB" />
          ) : (
            <Text style={styles.refreshText}>
              ↻ Refresh Dashboard
            </Text>
          )}
        </Pressable>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            Logout
          </Text>
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

  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  statusTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },

  alertDot: {
    backgroundColor: '#EF4444',
  },

  statusText: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 21,
  },

  healthScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  healthScoreLabel: {
    color: '#6B7280',
    fontSize: 13,
  },

  healthScoreValue: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: 'bold',
  },

  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
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

  icon: {
    fontSize: 25,
    marginBottom: 8,
  },

  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563EB',
  },

  label: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
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

  featureCardPressed: {
    opacity: 0.75,
  },

  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  featureEmoji: {
    fontSize: 22,
  },

  featureContent: {
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
    fontSize: 28,
    color: '#2563EB',
    marginLeft: 10,
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
    marginBottom: 12,
  },

  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  bullet: {
    fontSize: 18,
    color: '#2563EB',
    marginRight: 8,
    lineHeight: 21,
  },

  recommendationText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    flex: 1,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  refreshButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  refreshText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: 'bold',
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

  logoutButtonPressed: {
    opacity: 0.7,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});