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
import { AI_API_URL } from '../constants/api';

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

const formatNumber = (value: unknown, maximumFractionDigits = 2): string => {
  const numericValue = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(numericValue)) {
    return '--';
  }

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits,
  }).format(numericValue);
};

export default function AnomalyDetection() {
  const [data, setData] = useState<AnomalyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnomaly = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${AI_API_URL}/anomaly`);
      if (!response.ok) {
        throw new Error(`Anomaly API returned HTTP ${response.status}`);
      }

      const result = (await response.json()) as AnomalyResponse;
      if (!result || !result.sensor_data || typeof result.risk !== 'string') {
        throw new Error('The anomaly API returned data in an unexpected format.');
      }

      setData(result);
    } catch (fetchError) {
      console.error('Anomaly detection error:', fetchError);
      setError(
        'Unable to load anomaly information. Check that the Python AI backend is running and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnomaly();
  }, [fetchAnomaly]);

  const risk = data?.risk?.toLowerCase() ?? '';
  const isAnomaly = risk === 'high' || risk === 'critical' || risk === 'anomaly';
  const occupancy = Number(data?.sensor_data?.occupancy);
  const occupancyIsPercentage = Number.isFinite(occupancy) && occupancy >= 0 && occupancy <= 100;
  const hasOccupancyReading = data?.sensor_data?.occupancy !== null &&
    data?.sensor_data?.occupancy !== undefined &&
    Number.isFinite(occupancy);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.eyebrow}>CAMPUS MONITORING</Text>
          <Text style={styles.title}>Anomaly Detection</Text>
          <Text style={styles.subtitle}>
            Detect unusual campus behaviour using machine learning.
          </Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        {loading ? (
          <View style={styles.feedbackContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Analyzing campus data...</Text>
          </View>
        ) : error ? (
          <View style={styles.feedbackContainer}>
            <View style={styles.errorSymbol}>
              <Text style={styles.errorSymbolText}>!</Text>
            </View>
            <Text style={styles.errorTitle}>Unable to load analysis</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => void fetchAnomaly()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : data ? (
          <>
            <View style={[styles.statusSymbol, isAnomaly ? styles.statusSymbolAlert : styles.statusSymbolNormal]}>
              <Text style={[styles.statusSymbolText, isAnomaly ? styles.alertText : styles.normalText]}>
                {isAnomaly ? 'ALERT' : 'OK'}
              </Text>
            </View>
            <Text style={[styles.statusTitle, isAnomaly ? styles.anomalyTitle : styles.normalTitle]}>
              {data.status || (isAnomaly ? 'Anomaly Detected' : 'Normal')}
            </Text>
            <Text style={styles.statusDescription}>
              {isAnomaly
                ? 'The model detected a sensor pattern that may need attention.'
                : 'The model currently classifies the sensor pattern as normal.'}
            </Text>
            <View style={[styles.riskBadge, isAnomaly ? styles.highRiskBadge : styles.lowRiskBadge]}>
              <Text style={[styles.riskText, isAnomaly ? styles.highRiskText : styles.lowRiskText]}>
                Risk level: {data.risk || 'Unknown'}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {!loading && !error && data && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Sensor Data</Text>
            <Text style={styles.sectionCaption}>Latest reading from the AI service</Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.sensorCard}>
              <View style={[styles.sensorIconBox, styles.blueIconBox]}>
                <Text style={styles.sensorIconText}>OCC</Text>
              </View>
              <Text style={styles.sensorValue}>
                {hasOccupancyReading
                  ? `${formatNumber(occupancy, 2)}${occupancyIsPercentage ? '%' : ''}`
                  : '--'}
              </Text>
              <Text style={styles.sensorLabel}>Occupancy</Text>
              {hasOccupancyReading && !occupancyIsPercentage && (
                <Text style={styles.sensorNote}>
                  Raw reading shown. Confirm whether the backend reports a count or percentage.
                </Text>
              )}
            </View>

            <View style={styles.sensorCard}>
              <View style={[styles.sensorIconBox, styles.purpleIconBox]}>
                <Text style={styles.sensorIconText}>PWR</Text>
              </View>
              <Text style={styles.sensorValue}>{formatNumber(data.sensor_data.energy)}</Text>
              <Text style={styles.sensorLabel}>Energy</Text>
            </View>

            <View style={styles.sensorCard}>
              <View style={[styles.sensorIconBox, styles.orangeIconBox]}>
                <Text style={styles.sensorIconText}>TEMP</Text>
              </View>
              <Text style={styles.sensorValue}>
                {formatNumber(data.sensor_data.temperature)}°C
              </Text>
              <Text style={styles.sensorLabel}>Temperature</Text>
            </View>

            <View style={styles.sensorCard}>
              <View style={[styles.sensorIconBox, styles.tealIconBox]}>
                <Text style={styles.sensorIconText}>HUM</Text>
              </View>
              <Text style={styles.sensorValue}>{formatNumber(data.sensor_data.humidity)}%</Text>
              <Text style={styles.sensorLabel}>Humidity</Text>
            </View>
          </View>

          <View style={styles.scoreCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Anomaly Score</Text>
                <Text style={styles.cardSubtitle}>Isolation Forest decision score</Text>
              </View>
              <View style={styles.scoreTag}>
                <Text style={styles.scoreTagText}>ML</Text>
              </View>
            </View>
            <Text style={styles.score}>
              {Number.isFinite(Number(data.anomaly_score))
                ? Number(data.anomaly_score).toPrecision(6)
                : '--'}
            </Text>
            <Text style={styles.scoreFootnote}>
              Interpret this score together with the risk classification and sensor readings.
            </Text>
          </View>

          <View style={styles.analysisCard}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.smallStatusDot, isAnomaly ? styles.alertDot : styles.normalDot]} />
              <Text style={styles.cardTitle}>ML Analysis</Text>
            </View>
            <Text style={styles.analysisText}>
              {isAnomaly
                ? 'The Isolation Forest model identified the current campus sensor pattern as unusual. Review the readings and investigate if necessary.'
                : 'The Isolation Forest model found the current combination of occupancy, energy, temperature and humidity to be within its learned normal pattern.'}
            </Text>
          </View>

          <View style={styles.modelCard}>
            <Text style={styles.cardTitle}>Model Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Model</Text>
              <Text style={styles.infoValue}>{data.model || 'Not reported'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.modelStatus}>{data.model_status || 'Not reported'}</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.refreshButton, pressed && styles.buttonPressed]}
            onPress={() => void fetchAnomaly()}
          >
            <Text style={styles.refreshText}>Refresh Analysis</Text>
          </Pressable>
          <Text style={styles.footerNote}>
            Results reflect the data returned by the connected AI backend.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FC',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    maxWidth: 1500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3EAF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  backText: {
    fontSize: 34,
    color: '#2563EB',
    lineHeight: 38,
    marginTop: -3,
  },
  headerContent: {
    flex: 1,
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 5,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#E7EDF6',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  feedbackContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 14,
  },
  statusSymbol: {
    minWidth: 64,
    height: 64,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statusSymbolNormal: {
    backgroundColor: '#DCFCE7',
  },
  statusSymbolAlert: {
    backgroundColor: '#FEE2E2',
  },
  statusSymbolText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusTitle: {
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusDescription: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 600,
  },
  normalTitle: {
    color: '#15803D',
  },
  anomalyTitle: {
    color: '#B91C1C',
  },
  normalText: {
    color: '#15803D',
  },
  alertText: {
    color: '#B91C1C',
  },
  riskBadge: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginTop: 16,
  },
  lowRiskBadge: {
    backgroundColor: '#DCFCE7',
  },
  highRiskBadge: {
    backgroundColor: '#FEE2E2',
  },
  riskText: {
    fontSize: 13,
    fontWeight: '800',
  },
  lowRiskText: {
    color: '#166534',
  },
  highRiskText: {
    color: '#991B1B',
  },
  errorSymbol: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorSymbolText: {
    color: '#B91C1C',
    fontSize: 28,
    fontWeight: '800',
  },
  errorTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#991B1B',
    textAlign: 'center',
  },
  errorText: {
    color: '#7F1D1D',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 560,
  },
  retryButton: {
    backgroundColor: '#B91C1C',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  sectionCaption: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sensorCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7EDF6',
    shadowColor: '#0F172A',
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  sensorIconBox: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 9,
    alignSelf: 'flex-start',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  blueIconBox: {
    backgroundColor: '#DBEAFE',
  },
  purpleIconBox: {
    backgroundColor: '#EDE9FE',
  },
  orangeIconBox: {
    backgroundColor: '#FFEDD5',
  },
  tealIconBox: {
    backgroundColor: '#CCFBF1',
  },
  sensorIconText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  sensorValue: {
    fontSize: 27,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  sensorLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 5,
  },
  sensorNote: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
    marginTop: 8,
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    marginTop: 5,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7EDF6',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
  },
  scoreTag: {
    minWidth: 38,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTagText: {
    color: '#1D4ED8',
    fontWeight: '900',
    fontSize: 12,
  },
  score: {
    fontSize: 34,
    fontWeight: '900',
    color: '#2563EB',
    marginTop: 18,
    fontVariant: ['tabular-nums'],
  },
  scoreFootnote: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 7,
  },
  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E7EDF6',
  },
  smallStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 10,
  },
  normalDot: {
    backgroundColor: '#16A34A',
  },
  alertDot: {
    backgroundColor: '#DC2626',
  },
  analysisText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  modelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7EDF6',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    gap: 16,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  modelStatus: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    color: '#15803D',
    fontWeight: '800',
  },
  refreshButton: {
    backgroundColor: '#2563EB',
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerNote: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
