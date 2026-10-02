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

interface OccupancyResponse {
  current_occupancy: number;
  predicted_occupancy: number;
  difference: number;
  level: string;
  insight: string;
  model: string;
  model_status: string;
  previous_occupancy: number;
}

export default function OccupancyPrediction() {
  const [data, setData] = useState<OccupancyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOccupancy = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/occupancy`);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Request failed (${response.status}): ${body}`);
      }

      const result: OccupancyResponse = await response.json();

      if (
        typeof result.current_occupancy !== 'number' ||
        typeof result.predicted_occupancy !== 'number'
      ) {
        throw new Error('The backend returned an unexpected occupancy response.');
      }

      setData(result);
    } catch (err) {
      console.error('Occupancy API error:', err);
      setError(
        'Unable to load occupancy data. Check that the backend is running and campus sensor data is available.',
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOccupancy();
  }, [fetchOccupancy]);

  const getLevel = (occupancy: number) => {
    if (occupancy < 40) return 'Low';
    if (occupancy < 80) return 'Normal';
    return 'High';
  };

  const formatOccupancy = (value: number) => {
    return `${Number(value.toFixed(2))}%`;
  };

  const progressWidth = (value: number) =>
    `${Math.max(0, Math.min(value, 100))}%` as `${number}%`;

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
          <Text style={styles.title}>Occupancy Prediction</Text>
          <Text style={styles.subtitle}>
            AI-powered campus occupancy forecast
          </Text>
        </View>
      </View>

      {loading && !data ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>
            Loading occupancy data...
          </Text>
        </View>
      ) : null}

      {error !== '' ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to Load Occupancy</Text>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={fetchOccupancy}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : null}

      {data ? (
        <>
          <View style={styles.currentCard}>
            <Text style={styles.cardTitle}>
              Current Campus Occupancy
            </Text>
            <Text style={styles.currentValue}>
              {formatOccupancy(data.current_occupancy)}
            </Text>
            <Text style={styles.currentLabel}>
              Latest recorded campus sensor reading
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Next Occupancy Prediction</Text>

          <View style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <View style={styles.predictionTextContainer}>
                <Text style={styles.time}>Predicted Occupancy</Text>
                <Text style={styles.level}>
                  Expected level: {data.level || getLevel(data.predicted_occupancy)}
                </Text>
              </View>

              <Text style={styles.percentage}>
                {formatOccupancy(data.predicted_occupancy)}
              </Text>
            </View>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progress,
                  { width: progressWidth(data.predicted_occupancy) },
                ]}
              />
            </View>

            <Text style={styles.difference}>
              Change from current: {data.difference > 0 ? '+' : ''}
              {Number(data.difference.toFixed(2))}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>AI Insight 🤖</Text>

          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>
              Smart Occupancy Analysis
            </Text>
            <Text style={styles.insightText}>
              {data.insight ||
                'The backend returned an occupancy prediction.'}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Prediction Model</Text>

          <View style={styles.modelCard}>
            <Text style={styles.modelRow}>
              Model Status:{' '}
              <Text style={styles.connected}>
                {data.model_status || 'Connected'}
              </Text>
            </Text>
            <Text style={styles.modelRow}>
              Model: {data.model || 'Occupancy prediction model'}
            </Text>
            <Text style={styles.modelRow}>
              Data Source: Campus Sensors
            </Text>
            <Text style={styles.modelRow}>
              Prediction Type: Next-step occupancy prediction
            </Text>
            <Text style={styles.modelRow}>Backend: FastAPI</Text>
          </View>
        </>
      ) : null}

      <Pressable
        style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
        onPress={fetchOccupancy}
        disabled={loading}
        accessibilityRole="button"
      >
        <Text style={styles.refreshText}>
          {loading ? 'Refreshing...' : 'Refresh Prediction'}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  currentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 3,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  currentValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2563EB',
    marginTop: 12,
  },
  currentLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 6,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  predictionTextContainer: {
    flex: 1,
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  level: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 5,
  },
  percentage: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  progressBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    height: 8,
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  difference: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 12,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    marginBottom: 24,
  },
  insightTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },
  modelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
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
    marginBottom: 24,
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
  refreshButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
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