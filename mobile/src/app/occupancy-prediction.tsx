import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';

interface Prediction {
  time: string;
  occupancy: number;
}

interface OccupancyResponse {
  current: number;
  predictions: Prediction[];
}

export default function OccupancyPrediction() {
  const [selectedPeriod, setSelectedPeriod] = useState('Today');

  const [currentOccupancy, setCurrentOccupancy] = useState<number | null>(
    null
  );

  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  useEffect(() => {
    fetchOccupancy();
  }, []);

  const fetchOccupancy = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        'http://127.0.0.1:8000/occupancy'
      );

      if (!response.ok) {
        throw new Error('Failed to fetch occupancy data');
      }

      const data: OccupancyResponse = await response.json();

      setCurrentOccupancy(data.current);
      setPredictions(data.predictions);
    } catch (error) {
      console.error('Occupancy API error:', error);

      setError(
        'Unable to connect to the AI backend. Make sure FastAPI is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getLevel = (occupancy: number) => {
    if (occupancy < 50) {
      return 'Low';
    }

    if (occupancy < 75) {
      return 'Medium';
    }

    return 'High';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Occupancy Prediction
          </Text>

          <Text style={styles.subtitle}>
            AI-powered campus occupancy forecast
          </Text>
        </View>
      </View>

      {/* Current Occupancy */}
      <View style={styles.currentCard}>
        <Text style={styles.cardTitle}>
          Current Campus Occupancy
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />
        ) : (
          <Text style={styles.currentValue}>
            {currentOccupancy !== null
              ? `${currentOccupancy}%`
              : '--'}
          </Text>
        )}

        <Text style={styles.currentLabel}>
          {loading
            ? 'Fetching live campus data...'
            : error
              ? 'Backend connection unavailable'
              : 'Live data from campus AI backend'}
        </Text>
      </View>

      {/* Error Message */}
      {error !== '' && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            Connection Error
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={fetchOccupancy}
          >
            <Text style={styles.retryText}>
              Retry
            </Text>
          </Pressable>
        </View>
      )}

      {/* Period Selection */}
      <Text style={styles.sectionTitle}>
        Prediction Period
      </Text>

      <View style={styles.periodRow}>
        {['Today', 'Tomorrow', 'This Week'].map((period) => (
          <Pressable
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period &&
                styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === period &&
                  styles.periodTextActive,
              ]}
            >
              {period}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Predictions */}
      <Text style={styles.sectionTitle}>
        Predicted Occupancy
      </Text>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator
            size="large"
            color="#2563EB"
          />

          <Text style={styles.loadingText}>
            Loading occupancy predictions...
          </Text>
        </View>
      ) : predictions.length > 0 ? (
        predictions.map((prediction) => {
          const level = getLevel(prediction.occupancy);

          return (
            <View
              key={prediction.time}
              style={styles.predictionCard}
            >
              <View>
                <Text style={styles.time}>
                  {prediction.time}
                </Text>

                <Text style={styles.level}>
                  Expected level: {level}
                </Text>
              </View>

              <View style={styles.percentageContainer}>
                <Text style={styles.percentage}>
                  {prediction.occupancy}%
                </Text>

                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progress,
                      {
                        width: `${Math.min(
                          prediction.occupancy,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>
            No occupancy predictions available.
          </Text>
        </View>
      )}

      {/* AI Insight */}
      <Text style={styles.sectionTitle}>
        AI Insight 🤖
      </Text>

      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>
          Smart Occupancy Analysis
        </Text>

        <Text style={styles.insightText}>
          {predictions.length > 0
            ? 'The AI backend has returned the latest campus occupancy forecast. Higher occupancy periods can help administrators plan classrooms, facilities and campus resources.'
            : 'AI-generated occupancy insights will appear here after prediction data is received.'}
        </Text>
      </View>

      {/* Model Information */}
      <Text style={styles.sectionTitle}>
        Prediction Model
      </Text>

      <View style={styles.modelCard}>
        <Text style={styles.modelRow}>
          Model Status:{' '}
          <Text style={styles.connected}>
            Connected
          </Text>
        </Text>

        <Text style={styles.modelRow}>
          Data Source: Campus Sensors
        </Text>

        <Text style={styles.modelRow}>
          Prediction Type: Time-series Forecast
        </Text>

        <Text style={styles.modelRow}>
          Update Frequency: Real-time
        </Text>

        <Text style={styles.modelRow}>
          Backend: FastAPI
        </Text>
      </View>

      {/* Refresh Button */}
      <Pressable
        style={styles.refreshButton}
        onPress={fetchOccupancy}
      >
        <Text style={styles.refreshText}>
          Refresh Prediction
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
  },

  loader: {
    marginVertical: 18,
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

  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 6,
  },

  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },

  periodButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  periodButtonActive: {
    backgroundColor: '#2563EB',
  },

  periodText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },

  periodTextActive: {
    color: '#FFFFFF',
  },

  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },

  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },

  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
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

  percentageContainer: {
    width: 110,
    alignItems: 'flex-end',
  },

  percentage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 6,
  },

  progressBackground: {
    width: 100,
    height: 7,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },

  progress: {
    height: 7,
    backgroundColor: '#2563EB',
    borderRadius: 4,
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

  refreshButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },

  refreshText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});