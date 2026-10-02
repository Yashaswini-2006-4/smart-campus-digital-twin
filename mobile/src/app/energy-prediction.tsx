import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { API_BASE_URL } from '../constants/api';

interface EnergyResponse {
  current_energy: number;
  predicted_energy: number;
  difference: number;
  percentage_change: number;
  level: string;
  insight: string;
  model: string;
  model_status: string;
  previous_energy: number;
}

export default function EnergyPrediction() {
  const [energyData, setEnergyData] = useState<EnergyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEnergy = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/energy`);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Request failed (${response.status}): ${body}`);
      }

      const data: EnergyResponse = await response.json();

      if (
        typeof data.current_energy !== 'number' ||
        typeof data.predicted_energy !== 'number'
      ) {
        throw new Error('The backend returned an unexpected energy response.');
      }

      setEnergyData(data);
    } catch (err) {
      console.error('Energy API error:', err);
      setEnergyData(null);
      setError(
        'Unable to load energy data. Check that the backend is running and campus sensor data is available.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnergy();
  }, [fetchEnergy]);

  const formatEnergy = (value: number) =>
    `${Number(value.toFixed(2))} kWh`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>‹</Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>Energy Prediction ⚡</Text>
          <Text style={styles.subtitle}>
            AI-powered campus energy forecasting
          </Text>
        </View>
      </View>

      {loading && !energyData ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>
            Fetching energy data...
          </Text>
        </View>
      ) : null}

      {error !== '' ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={fetchEnergy}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : null}

      {energyData ? (
        <>
          <View style={styles.card}>
            <Text style={styles.icon}>⚡</Text>
            <Text style={styles.cardTitle}>Predicted Energy Usage</Text>
            <Text style={styles.value}>
              {formatEnergy(energyData.predicted_energy)}
            </Text>
            <Text style={styles.description}>
              Predicted campus energy consumption from the AI backend.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Current Energy</Text>
            <Text style={styles.value}>
              {formatEnergy(energyData.current_energy)}
            </Text>
            <Text style={styles.description}>
              Latest recorded campus energy consumption.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Energy Change</Text>

            <Text style={styles.value}>
              {energyData.difference > 0 ? '+' : ''}
              {Number(energyData.difference.toFixed(2))} kWh
            </Text>

            <Text style={styles.description}>
              Percentage change:{' '}
              {energyData.percentage_change > 0 ? '+' : ''}
              {Number(energyData.percentage_change.toFixed(2))}%
            </Text>

            <Text style={styles.description}>
              Previous recorded energy:{' '}
              {formatEnergy(energyData.previous_energy)}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI Insight 🤖</Text>
            <Text style={styles.description}>
              {energyData.insight ||
                'The backend returned an energy prediction.'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prediction Model</Text>

            <Text style={styles.modelRow}>
              Model Status:{' '}
              <Text style={styles.connected}>
                {energyData.model_status || 'Connected'}
              </Text>
            </Text>

            <Text style={styles.modelRow}>
              Model: {energyData.model || 'Energy prediction model'}
            </Text>

            <Text style={styles.modelRow}>
              Data Source: Campus Sensor Data
            </Text>

            <Text style={styles.modelRow}>
              Prediction Type: Energy Forecasting
            </Text>

            <Text style={styles.modelRow}>Backend: FastAPI</Text>
          </View>
        </>
      ) : null}

      <Pressable
        style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
        onPress={fetchEnergy}
        disabled={loading}
        accessibilityRole="button"
      >
        <Text style={styles.refreshText}>
          {loading ? 'Refreshing...' : 'Refresh Energy Prediction'}
        </Text>
      </Pressable>
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
  back: {
    fontSize: 40,
    color: '#2563EB',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    elevation: 2,
  },
  icon: {
    fontSize: 32,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    marginTop: 4,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B91C1C',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 19,
  },
  retryButton: {
    backgroundColor: '#B91C1C',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modelRow: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 10,
  },
  connected: {
    color: '#16A34A',
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});