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

interface SensorData {
  occupancy: number;
  energy: number;
  temperature: number;
  humidity: number;
}

interface AnomalyResponse {
  status: string;
  risk: string;
  anomaly_score: number;
  sensor_data: SensorData;
  model: string;
  model_status: string;
}

export default function AnomalyDetection() {
  const [data, setData] =
    useState<AnomalyResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const fetchAnomaly = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        'http://192.168.31.98:8000/anomaly'
      );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch anomaly information'
        );
      }

      const result: AnomalyResponse =
        await response.json();

      setData(result);

    } catch (error) {

      console.error(
        'Anomaly detection error:',
        error
      );

      setError(
        'Unable to connect to the anomaly detection backend.'
      );

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnomaly();
  }, [fetchAnomaly]);

  const isAnomaly =
    data?.risk === 'High';

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
          <Text style={styles.backText}>
            ‹
          </Text>
        </Pressable>

        <View style={styles.headerContent}>

          <Text style={styles.title}>
            Anomaly Detection 🚨
          </Text>

          <Text style={styles.subtitle}>
            Detect unusual campus behaviour using ML
          </Text>

        </View>

      </View>


      {/* Main Status */}

      <View style={styles.statusCard}>

        {loading ? (

          <View style={styles.loadingContainer}>

            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

            <Text style={styles.loadingText}>
              Analyzing campus data...
            </Text>

          </View>

        ) : error !== '' ? (

          <View style={styles.errorContainer}>

            <Text style={styles.errorIcon}>
              ⚠️
            </Text>

            <Text style={styles.errorTitle}>
              Connection Error
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={fetchAnomaly}
            >
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>

          </View>

        ) : (

          <>

            <Text style={styles.statusIcon}>
              {isAnomaly ? '⚠️' : '✓'}
            </Text>

            <Text
              style={[
                styles.statusTitle,
                isAnomaly
                  ? styles.anomalyTitle
                  : styles.normalTitle,
              ]}
            >
              {data?.status}
            </Text>

            <View
              style={[
                styles.riskBadge,
                isAnomaly
                  ? styles.highRiskBadge
                  : styles.lowRiskBadge,
              ]}
            >
              <Text
                style={[
                  styles.riskText,
                  isAnomaly
                    ? styles.highRiskText
                    : styles.lowRiskText,
                ]}
              >
                Risk: {data?.risk}
              </Text>
            </View>

          </>

        )}

      </View>


      {/* Sensor Data */}

      {!loading &&
        error === '' &&
        data && (

          <>

            <Text style={styles.sectionTitle}>
              Current Sensor Data
            </Text>

            <View style={styles.grid}>

              <View style={styles.sensorCard}>

                <Text style={styles.sensorIcon}>
                  👥
                </Text>

                <Text style={styles.sensorValue}>
                  {data.sensor_data.occupancy}%
                </Text>

                <Text style={styles.sensorLabel}>
                  Occupancy
                </Text>

              </View>


              <View style={styles.sensorCard}>

                <Text style={styles.sensorIcon}>
                  ⚡
                </Text>

                <Text style={styles.sensorValue}>
                  {data.sensor_data.energy}
                </Text>

                <Text style={styles.sensorLabel}>
                  Energy
                </Text>

              </View>


              <View style={styles.sensorCard}>

                <Text style={styles.sensorIcon}>
                  🌡️
                </Text>

                <Text style={styles.sensorValue}>
                  {data.sensor_data.temperature}°C
                </Text>

                <Text style={styles.sensorLabel}>
                  Temperature
                </Text>

              </View>


              <View style={styles.sensorCard}>

                <Text style={styles.sensorIcon}>
                  💧
                </Text>

                <Text style={styles.sensorValue}>
                  {data.sensor_data.humidity}%
                </Text>

                <Text style={styles.sensorLabel}>
                  Humidity
                </Text>

              </View>

            </View>


            {/* Anomaly Score */}

            <View style={styles.scoreCard}>

              <Text style={styles.sectionTitle}>
                Anomaly Score
              </Text>

              <Text style={styles.score}>
                {data.anomaly_score}
              </Text>

              <Text style={styles.scoreDescription}>
                Isolation Forest decision score
              </Text>

            </View>


            {/* AI Analysis */}

            <View style={styles.analysisCard}>

              <Text style={styles.analysisTitle}>
                ML Analysis 🤖
              </Text>

              <Text style={styles.analysisText}>

                {isAnomaly
                  ? 'The Isolation Forest model identified the current campus sensor pattern as unusual. The condition should be investigated by the maintenance team.'
                  : 'The Isolation Forest model found the current combination of occupancy, energy, temperature and humidity to be within the learned normal pattern.'}

              </Text>

            </View>


            {/* Model Information */}

            <View style={styles.modelCard}>

              <Text style={styles.modelTitle}>
                Model Information
              </Text>

              <Text style={styles.modelText}>
                Model: {data.model}
              </Text>

              <Text style={styles.modelStatus}>
                Status: {data.model_status}
              </Text>

            </View>


            {/* Refresh */}

            <Pressable
              style={styles.refreshButton}
              onPress={fetchAnomaly}
            >

              <Text style={styles.refreshText}>
                Refresh Analysis
              </Text>

            </Pressable>

          </>

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

  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 3,
  },

  statusIcon: {
    fontSize: 42,
    marginBottom: 10,
  },

  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  normalTitle: {
    color: '#15803D',
  },

  anomalyTitle: {
    color: '#B91C1C',
  },

  riskBadge: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 14,
  },

  lowRiskBadge: {
    backgroundColor: '#DCFCE7',
  },

  highRiskBadge: {
    backgroundColor: '#FEE2E2',
  },

  riskText: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  lowRiskText: {
    color: '#15803D',
  },

  highRiskText: {
    color: '#B91C1C',
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  loadingText: {
    color: '#6B7280',
    fontSize: 14,
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
    color: '#7F1D1D',
    textAlign: 'center',
    fontSize: 13,
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

  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 4,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sensorCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
  },

  sensorIcon: {
    fontSize: 25,
    marginBottom: 8,
  },

  sensorValue: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#2563EB',
  },

  sensorLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    elevation: 2,
  },

  score: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563EB',
  },

  scoreDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },

  analysisTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },

  analysisText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },

  modelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
  },

  modelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },

  modelText: {
    fontSize: 14,
    color: '#6B7280',
  },

  modelStatus: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: 'bold',
    marginTop: 6,
  },

  refreshButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },

  refreshText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

});