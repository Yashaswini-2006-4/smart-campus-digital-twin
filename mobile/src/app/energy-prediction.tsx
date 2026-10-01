import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

interface EnergyResponse {
  today: number;
  predicted: number;
}

export default function EnergyPrediction() {
  const [todayEnergy, setTodayEnergy] = useState<number | null>(null);
  const [predictedEnergy, setPredictedEnergy] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEnergy();
  }, []);

  const fetchEnergy = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        'http://127.0.0.1:8000/energy'
      );

      if (!response.ok) {
        throw new Error('Failed to fetch energy data');
      }

      const data: EnergyResponse = await response.json();

      setTodayEnergy(data.today);
      setPredictedEnergy(data.predicted);
    } catch (error) {
      console.error('Energy API error:', error);

      setError(
        'Unable to connect to the AI backend. Make sure FastAPI is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getEnergyInsight = () => {
    if (todayEnergy === null || predictedEnergy === null) {
      return 'AI-based energy recommendations will appear here when campus energy data is available.';
    }

    if (predictedEnergy > todayEnergy) {
      return `The predicted energy usage is ${predictedEnergy} kWh, which is higher than today's usage of ${todayEnergy} kWh. Campus administrators can monitor high-consumption periods and plan energy-saving actions.`;
    }

    if (predictedEnergy < todayEnergy) {
      return `The predicted energy usage is ${predictedEnergy} kWh, which is lower than today's usage of ${todayEnergy} kWh. This indicates a possible reduction in campus energy consumption.`;
    }

    return 'The predicted energy usage is similar to today’s consumption.';
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
            Energy Prediction ⚡
          </Text>

          <Text style={styles.subtitle}>
            AI-powered campus energy forecasting
          </Text>
        </View>
      </View>

      {/* Predicted Energy */}
      <View style={styles.card}>
        <Text style={styles.icon}>⚡</Text>

        <Text style={styles.cardTitle}>
          Predicted Energy Usage
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />
        ) : (
          <Text style={styles.value}>
            {predictedEnergy !== null
              ? `${predictedEnergy} kWh`
              : '-- kWh'}
          </Text>
        )}

        <Text style={styles.description}>
          {loading
            ? 'Fetching energy prediction...'
            : 'Predicted campus energy consumption from the AI backend.'}
        </Text>
      </View>

      {/* Today's Energy */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Today's Energy
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />
        ) : (
          <Text style={styles.value}>
            {todayEnergy !== null
              ? `${todayEnergy} kWh`
              : '-- kWh'}
          </Text>
        )}

        <Text style={styles.description}>
          Current campus energy consumption.
        </Text>
      </View>

      {/* Error */}
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
            onPress={fetchEnergy}
          >
            <Text style={styles.retryText}>
              Retry
            </Text>
          </Pressable>
        </View>
      )}

      {/* AI Insight */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          AI Insight 🤖
        </Text>

        <Text style={styles.description}>
          {getEnergyInsight()}
        </Text>
      </View>

      {/* Model Information */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Prediction Model
        </Text>

        <Text style={styles.modelRow}>
          Model Status:{' '}
          <Text style={styles.connected}>
            {predictedEnergy !== null ? 'Connected' : 'Pending'}
          </Text>
        </Text>

        <Text style={styles.modelRow}>
          Data Source: Campus Energy Data
        </Text>

        <Text style={styles.modelRow}>
          Prediction Type: Energy Forecasting
        </Text>

        <Text style={styles.modelRow}>
          Backend: FastAPI
        </Text>
      </View>

      {/* Refresh */}
      <Pressable
        style={styles.refreshButton}
        onPress={fetchEnergy}
      >
        <Text style={styles.refreshText}>
          Refresh Energy Prediction
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
  },

  loader: {
    marginVertical: 12,
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

  refreshText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});