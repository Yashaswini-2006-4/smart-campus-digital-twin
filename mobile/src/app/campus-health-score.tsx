import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';


interface HealthComponents {
  occupancy_score: number;
  energy_score: number;
  anomaly_score: number;
}


interface HealthInputs {
  occupancy: number;
  energy: number;
  anomaly_risk: string;
}


interface HealthResponse {
  score: number;
  status: string;
  insight: string;
  components: HealthComponents;
  inputs: HealthInputs;
  model_status: string;
}


export default function CampusHealthScore() {

  const [data, setData] =
    useState<HealthResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');


  const fetchHealthScore =
    useCallback(async () => {

      try {

        setLoading(true);
        setError('');

        const response =
          await fetch(
            'http://127.0.0.1:8000/health'
          );

        if (!response.ok) {

          throw new Error(
            'Failed to fetch health score'
          );

        }

        const result: HealthResponse =
          await response.json();

        setData(result);

      } catch (error) {

        console.error(
          'Health score error:',
          error
        );

        setError(
          'Unable to connect to the campus health backend.'
        );

      } finally {

        setLoading(false);

      }

    }, []);


  useEffect(() => {

    fetchHealthScore();

  }, [fetchHealthScore]);


  const getStatusStyle = () => {

    if (!data) {
      return styles.neutralBadge;
    }

    if (data.status === 'Healthy') {
      return styles.healthyBadge;
    }

    if (data.status === 'Moderate') {
      return styles.moderateBadge;
    }

    return styles.attentionBadge;
  };


  const getStatusTextStyle = () => {

    if (!data) {
      return styles.neutralText;
    }

    if (data.status === 'Healthy') {
      return styles.healthyText;
    }

    if (data.status === 'Moderate') {
      return styles.moderateText;
    }

    return styles.attentionText;
  };


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
            Campus Health Score
          </Text>

          <Text style={styles.subtitle}>
            AI-based campus health assessment
          </Text>

        </View>

      </View>


      {/* Main Score */}

      <View style={styles.scoreCard}>

        <Text style={styles.scoreTitle}>
          Overall Campus Health
        </Text>


        {loading ? (

          <View style={styles.loadingContainer}>

            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

            <Text style={styles.loadingText}>
              Calculating health score...
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
              onPress={fetchHealthScore}
            >

              <Text style={styles.retryText}>
                Retry
              </Text>

            </Pressable>

          </View>

        ) : data ? (

          <>

            <Text style={styles.score}>
              {data.score}
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

                {data.status}

              </Text>

            </View>

          </>

        ) : null}

      </View>


      {/* AI Insight */}

      {!loading &&
        error === '' &&
        data && (

          <View style={styles.insightCard}>

            <Text style={styles.sectionTitle}>
              AI Health Insight 🤖
            </Text>

            <Text style={styles.insightText}>
              {data.insight}
            </Text>

          </View>

        )}


      {/* ML Components */}

      {!loading &&
        error === '' &&
        data && (

          <>

            <Text style={styles.sectionTitle}>
              ML Health Components
            </Text>


            {/* Occupancy */}

            <View style={styles.componentCard}>

              <View style={styles.componentHeader}>

                <Text style={styles.componentTitle}>
                  Occupancy
                </Text>

                <Text style={styles.componentScore}>
                  {data.components.occupancy_score}
                </Text>

              </View>

              <Text style={styles.componentDescription}>
                Occupancy input:
                {' '}
                {data.inputs.occupancy}%
              </Text>

            </View>


            {/* Energy */}

            <View style={styles.componentCard}>

              <View style={styles.componentHeader}>

                <Text style={styles.componentTitle}>
                  Energy
                </Text>

                <Text style={styles.componentScore}>
                  {data.components.energy_score}
                </Text>

              </View>

              <Text style={styles.componentDescription}>
                Predicted energy:
                {' '}
                {data.inputs.energy} kWh
              </Text>

            </View>


            {/* Anomaly */}

            <View style={styles.componentCard}>

              <View style={styles.componentHeader}>

                <Text style={styles.componentTitle}>
                  Anomaly
                </Text>

                <Text style={styles.componentScore}>
                  {data.components.anomaly_score}
                </Text>

              </View>

              <Text style={styles.componentDescription}>
                Current anomaly risk:
                {' '}
                {data.inputs.anomaly_risk}
              </Text>

            </View>

          </>

        )}


      {/* Decision Layer */}

      {!loading &&
        error === '' &&
        data && (

          <View style={styles.decisionCard}>

            <Text style={styles.decisionTitle}>
              AI Decision Layer
            </Text>

            <Text style={styles.decisionText}>
              The campus health score combines outputs
              from occupancy prediction, energy prediction
              and anomaly detection.
            </Text>

            <Text style={styles.modelStatus}>
              {data.model_status}
            </Text>

          </View>

        )}


      {/* Refresh */}

      {!loading && (

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

  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 4,
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
    alignItems: 'center',
    marginTop: 10,
  },

  refreshText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },

});