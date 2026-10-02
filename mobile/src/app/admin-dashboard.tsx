import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

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
  health: ApiData;
  occupancy: ApiData;
  energy: ApiData;
  anomaly: ApiData;
};

const initialData: DashboardData = {
  sensorData: null,
  health: null,
  occupancy: null,
  energy: null,
  anomaly: null,
};

async function fetchJson(endpoint: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(
      `${endpoint} returned HTTP ${response.status}`,
    );
  }

  return response.json();
}

function isObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function getLatestRecord(data: any): any {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }

  if (!isObject(data)) {
    return null;
  }

  for (const key of ['latest', 'reading', 'result']) {
    if (isObject(data[key])) {
      return data[key];
    }
  }

  return data;
}

function getNumber(
  data: any,
  possibleKeys: string[],
  depth = 0,
): number | null {
  if (data == null || depth > 4) {
    return null;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const result = getNumber(
        item,
        possibleKeys,
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

  for (const key of possibleKeys) {
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
    if (isObject(value) || Array.isArray(value)) {
      const result = getNumber(
        value,
        possibleKeys,
        depth + 1,
      );

      if (result !== null) {
        return result;
      }
    }
  }

  return null;
}

function displayValue(value: number | null): string {
  if (value === null) {
    return '--';
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1);
}

function getHealthStatus(data: any): string {
  if (!isObject(data)) {
    return 'Status unavailable';
  }

  const status =
    data.status ??
    data.health_status ??
    data.campus_status;

  return typeof status === 'string'
    ? status
    : 'Status unavailable';
}

function getAnomalyStatus(data: any): string {
  if (!isObject(data)) {
    return 'Unavailable';
  }

  const detected =
    data.anomaly_detected ??
    data.is_anomaly ??
    data.anomaly;

  const status = String(
    data.status ?? '',
  ).toLowerCase();

  if (
    detected === true ||
    detected === 1 ||
    status.includes('anomal')
  ) {
    return 'Detected';
  }

  if (
    detected === false ||
    detected === 0 ||
    status.includes('normal')
  ) {
    return 'None';
  }

  return 'Unknown';
}

function getAnomalyRisk(data: any): string {
  if (!isObject(data)) {
    return '';
  }

  const risk = data.risk ?? data.severity;

  return typeof risk === 'string' ? risk : '';
}

export default function AdminDashboard() {
  const [data, setData] =
    useState<DashboardData>(initialData);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setError('');

    const endpoints = [
      '/sensor-data',
      '/health',
      '/occupancy',
      '/energy',
      '/anomaly',
    ];

    try {
      const results = await Promise.allSettled(
        endpoints.map((endpoint) => fetchJson(endpoint)),
      );

      const nextData: DashboardData = {
        ...initialData,
      };

      const keys: (keyof DashboardData)[] = [
        'sensorData',
        'health',
        'occupancy',
        'energy',
        'anomaly',
      ];

      const failedEndpoints: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          nextData[keys[index]] = result.value;
        } else {
          failedEndpoints.push(endpoints[index]);

          console.error(
            `Admin dashboard request failed (${endpoints[index]}):`,
            result.reason,
          );
        }
      });

      setData(nextData);

      if (failedEndpoints.length === endpoints.length) {
        setError(
          'Unable to load campus data. Check that the backend is running and the API URL is correct.',
        );
      } else if (failedEndpoints.length > 0) {
        setError(
          `Some information could not be loaded: ${failedEndpoints.join(', ')}`,
        );
      }
    } catch (err) {
      console.error('Admin dashboard error:', err);

      setError('Unable to load campus information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('userRole');

      router.replace('/login');
    } catch (err) {
      console.error('Logout failed:', err);

      Alert.alert(
        'Logout Failed',
        'Unable to log out. Please try again.',
      );
    }
  };

  // Read the latest sensor values first.
  const latestSensor = getLatestRecord(data.sensorData);

  // Current sensor values take priority over predictions.
  const occupancy =
    getNumber(latestSensor, [
      'occupancy',
      'current_occupancy',
      'occupancy_count',
      'people_count',
    ]) ??
    getNumber(data.occupancy, [
      'current_occupancy',
      'occupancy',
      'current',
      'predicted_occupancy',
      'prediction',
      'predicted_value',
    ]);

  const energy =
    getNumber(latestSensor, [
      'energy',
      'energy_usage',
      'energy_consumption',
      'power',
      'power_usage',
    ]) ??
    getNumber(data.energy, [
      'current_energy',
      'energy',
      'current',
      'predicted_energy',
      'prediction',
      'predicted_value',
    ]);

  const healthScore = getNumber(data.health, [
    'score',
    'health_score',
    'campus_health_score',
  ]);

  const healthStatus = getHealthStatus(data.health);
  const anomalyStatus = getAnomalyStatus(data.anomaly);
  const anomalyRisk = getAnomalyRisk(data.anomaly);

  return (
    <RoleGuard allowedRole="admin">
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
            <Text style={styles.title}>
              Hello, Admin 👋
            </Text>

            <Text style={styles.subtitle}>
              Campus Intelligence Dashboard
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

            <Text style={styles.loadingText}>
              Loading campus data...
            </Text>
          </View>
        )}

        {/* Error */}
        {!loading && error !== '' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Campus data update
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={handleRefresh}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        )}

        {/* Campus Health */}
        <View style={styles.healthCard}>
          <Text style={styles.healthTitle}>
            Campus Health Score
          </Text>

          <Text style={styles.healthValue}>
            {displayValue(healthScore)}
            {healthScore !== null ? '/100' : ''}
          </Text>

          <View
            style={[
              styles.statusBadge,
              healthStatus.toLowerCase().includes('attention') &&
                styles.warningBadge,
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {healthStatus}
            </Text>
          </View>

          <Text style={styles.healthDescription}>
            AI-based campus health assessment
          </Text>
        </View>

        {/* Campus Overview */}
        <Text style={styles.sectionTitle}>
          Campus Overview
        </Text>

        <View style={styles.grid}>
          <View style={styles.overviewCard}>
            <Text style={styles.icon}>👥</Text>

            <Text style={styles.value}>
              {displayValue(occupancy)}
            </Text>

            <Text style={styles.label}>
              Occupancy
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.icon}>⚡</Text>

            <Text style={styles.value}>
              {displayValue(energy)}
            </Text>

            <Text style={styles.label}>
              Energy Usage
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.icon}>🚨</Text>

            <Text
              style={[
                styles.value,
                anomalyStatus === 'Detected' &&
                  styles.alertValue,
              ]}
            >
              {anomalyStatus}
            </Text>

            <Text style={styles.label}>
              Anomaly Status
            </Text>

            {anomalyRisk !== '' && (
              <Text style={styles.riskText}>
                Risk: {anomalyRisk}
              </Text>
            )}
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.icon}>🔧</Text>

            <Text style={styles.value}>
              Not reported
            </Text>

            <Text style={styles.label}>
              Maintenance
            </Text>
          </View>
        </View>

        {/* AI & Machine Learning */}
        <Text style={styles.sectionTitle}>
          AI & Machine Learning 🤖
        </Text>

        <FeatureCard
          icon="👥"
          title="Occupancy Prediction"
          description="Predict future campus and building occupancy."
          onPress={() =>
            router.push('/occupancy-prediction')
          }
        />

        <FeatureCard
          icon="⚡"
          title="Energy Prediction"
          description="Forecast campus energy consumption."
          onPress={() =>
            router.push('/energy-prediction')
          }
        />

        <FeatureCard
          icon="🚨"
          title="Anomaly Detection"
          description="Detect unusual energy, occupancy and sensor behaviour."
          onPress={() =>
            router.push('/anomaly-detection')
          }
        />

        {/* AI Decision Layer */}
        <Text style={styles.sectionTitle}>
          AI Decision Layer
        </Text>

        <FeatureCard
          icon="💡"
          title="AI Recommendations"
          description="View intelligent recommendations for campus operations."
          onPress={() =>
            router.push('/ai-recommendations')
          }
        />

        <FeatureCard
          icon="🔮"
          title="What-If Simulation"
          description="Simulate operational changes and compare predicted outcomes."
          onPress={() =>
            router.push('/what-if-simulation')
          }
        />

        <FeatureCard
          icon="🩺"
          title="Campus Health Score"
          description="View the overall campus health assessment."
          onPress={() =>
            router.push('/campus-health-score')
          }
        />

        <FeatureCard
          icon="🌦️"
          title="Live Campus Environment"
          description="View the latest available outdoor weather information."
          onPress={() =>
            router.push('/live-campus-data')
          }
        />

        {/* Refresh */}
        <Pressable
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.pressedButton,
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
            pressed && styles.pressedButton,
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

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
};

function FeatureCard({
  icon,
  title,
  description,
  onPress,
}: FeatureCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.featureCard,
        pressed && styles.featureCardPressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.featureIcon}>
        {icon}
      </Text>

      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>
          {title}
        </Text>

        <Text style={styles.featureDescription}>
          {description}
        </Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
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

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
  },

  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },

  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },

  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },

  errorTitle: {
    color: '#991B1B',
    fontWeight: 'bold',
    marginBottom: 6,
  },

  errorText: {
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 19,
  },

  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#B91C1C',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 12,
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 32,
    elevation: 3,
  },

  healthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },

  healthValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2563EB',
    marginVertical: 12,
  },

  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },

  warningBadge: {
    backgroundColor: '#FEF3C7',
  },

  statusBadgeText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },

  healthDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 14,
    marginTop: 4,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  overviewCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    elevation: 2,
  },

  icon: {
    fontSize: 26,
    marginBottom: 12,
  },

  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 5,
  },

  alertValue: {
    color: '#DC2626',
  },

  label: {
    fontSize: 14,
    color: '#6B7280',
  },

  riskText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
  },

  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },

  featureCardPressed: {
    opacity: 0.75,
  },

  featureIcon: {
    fontSize: 28,
    width: 50,
  },

  featureContent: {
    flex: 1,
    paddingHorizontal: 8,
  },

  featureTitle: {
    fontSize: 17,
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
    fontSize: 30,
    color: '#2563EB',
  },

  refreshButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },

  refreshText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: 'bold',
  },

  pressedButton: {
    opacity: 0.7,
  },

  logoutButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});