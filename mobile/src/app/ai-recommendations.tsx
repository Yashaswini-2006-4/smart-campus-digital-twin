import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const API_URL = 'http://127.0.0.1:8000';

interface Recommendation {
  category: string;
  priority: string;
  title: string;
  message: string;
  action: string;
}

interface MLInputs {
  current_occupancy: number;
  predicted_occupancy: number;
  current_energy: number;
  predicted_energy: number;
  anomaly_risk: string;
  health_score: number;
}

interface Models {
  occupancy: string;
  energy: string;
  anomaly: string;
  decision_layer: string;
}

interface RecommendationResponse {
  summary: string;
  recommendations: Recommendation[];
  ml_inputs: MLInputs;
  models: Models;
  model_status: string;
}

export default function AIRecommendations() {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchRecommendations = async () => {
    try {
      setError('');

      const response = await fetch(`${API_URL}/recommendations`);

      if (!response.ok) {
        throw new Error('Failed to load recommendations');
      }

      const result: RecommendationResponse = await response.json();

      setData(result);
    } catch (err) {
      console.error('Recommendations error:', err);
      setError(
        'Unable to connect to the AI recommendation service.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecommendations();
  }, []);

  const getPriorityStyle = (priority: string) => {
    const value = priority.toLowerCase();

    if (value.includes('high')) {
      return styles.highPriority;
    }

    if (value.includes('medium')) {
      return styles.mediumPriority;
    }

    return styles.lowPriority;
  };

  const getPriorityTextStyle = (priority: string) => {
    const value = priority.toLowerCase();

    if (value.includes('high')) {
      return styles.highPriorityText;
    }

    if (value.includes('medium')) {
      return styles.mediumPriorityText;
    }

    return styles.lowPriorityText;
  };

  const getAnomalyStyle = (risk: string) => {
    const value = risk.toLowerCase();

    if (
      value.includes('high') ||
      value.includes('detected') ||
      value.includes('anomaly')
    ) {
      return styles.riskHigh;
    }

    if (value.includes('medium')) {
      return styles.riskMedium;
    }

    return styles.riskLow;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          Loading AI recommendations...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>

        <Text style={styles.errorTitle}>
          Connection Error
        </Text>

        <Text style={styles.errorMessage}>
          {error}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={fetchRecommendations}
        >
          <Text style={styles.retryButtonText}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  const inputs = data.ml_inputs;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            AI Recommendations
          </Text>

          <Text style={styles.subtitle}>
            Intelligent campus decision support
          </Text>
        </View>

        <View style={styles.aiIcon}>
          <Text style={styles.aiIconText}>AI</Text>
        </View>
      </View>

      {/* AI Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>✦</Text>
          </View>

          <Text style={styles.summaryTitle}>
            AI Decision Summary
          </Text>
        </View>

        <Text style={styles.summaryText}>
          {data.summary}
        </Text>

        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />

          <Text style={styles.statusText}>
            {data.model_status}
          </Text>
        </View>
      </View>

      {/* ML Inputs */}
      <Text style={styles.sectionTitle}>
        Current ML Insights
      </Text>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>👥</Text>

          <Text style={styles.metricLabel}>
            Occupancy
          </Text>

          <Text style={styles.metricValue}>
            {Math.round(inputs.current_occupancy)}
          </Text>

          <Text style={styles.metricSecondary}>
            Predicted: {Math.round(inputs.predicted_occupancy)}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>⚡</Text>

          <Text style={styles.metricLabel}>
            Energy
          </Text>

          <Text style={styles.metricValue}>
            {Math.round(inputs.current_energy)}
          </Text>

          <Text style={styles.metricSecondary}>
            Predicted: {Math.round(inputs.predicted_energy)}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>🚨</Text>

          <Text style={styles.metricLabel}>
            Anomaly Risk
          </Text>

          <View
            style={[
              styles.riskBadge,
              getAnomalyStyle(inputs.anomaly_risk),
            ]}
          >
            <Text style={styles.riskText}>
              {inputs.anomaly_risk}
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>❤️</Text>

          <Text style={styles.metricLabel}>
            Campus Health
          </Text>

          <Text style={styles.metricValue}>
            {Math.round(inputs.health_score)}
          </Text>

          <Text style={styles.metricSecondary}>
            / 100
          </Text>
        </View>
      </View>

      {/* Recommendations */}
      <Text style={styles.sectionTitle}>
        Recommended Actions
      </Text>

      {data.recommendations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✅</Text>

          <Text style={styles.emptyTitle}>
            No Immediate Actions
          </Text>

          <Text style={styles.emptyText}>
            Current campus conditions do not require
            additional AI-generated actions.
          </Text>
        </View>
      ) : (
        data.recommendations.map(
          (recommendation, index) => (
            <View
              key={`${recommendation.title}-${index}`}
              style={styles.recommendationCard}
            >
              <View style={styles.recommendationTop}>
                <View style={styles.categoryContainer}>
                  <Text style={styles.categoryText}>
                    {recommendation.category}
                  </Text>
                </View>

                <View
                  style={[
                    styles.priorityBadge,
                    getPriorityStyle(
                      recommendation.priority
                    ),
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      getPriorityTextStyle(
                        recommendation.priority
                      ),
                    ]}
                  >
                    {recommendation.priority}
                  </Text>
                </View>
              </View>

              <Text style={styles.recommendationTitle}>
                {recommendation.title}
              </Text>

              <Text style={styles.recommendationMessage}>
                {recommendation.message}
              </Text>

              <View style={styles.actionBox}>
                <Text style={styles.actionLabel}>
                  ACTION
                </Text>

                <Text style={styles.actionText}>
                  {recommendation.action}
                </Text>
              </View>
            </View>
          )
        )
      )}

      {/* Models */}
      <Text style={styles.sectionTitle}>
        AI Models Used
      </Text>

      <View style={styles.modelsCard}>
        <ModelRow
          label="Occupancy Prediction"
          value={data.models.occupancy}
        />

        <ModelRow
          label="Energy Prediction"
          value={data.models.energy}
        />

        <ModelRow
          label="Anomaly Detection"
          value={data.models.anomaly}
        />

        <ModelRow
          label="Decision Layer"
          value={data.models.decision_layer}
        />
      </View>

      {/* Refresh */}
      <Pressable
        style={styles.refreshButton}
        onPress={fetchRecommendations}
      >
        <Text style={styles.refreshButtonText}>
          ↻  Refresh AI Analysis
        </Text>
      </Pressable>

      <Text style={styles.footer}>
        AI recommendations are generated from current
        campus sensor data and ML predictions.
      </Text>
    </ScrollView>
  );
}

function ModelRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.modelRow}>
      <View style={styles.modelIndicator} />

      <View style={styles.modelContent}>
        <Text style={styles.modelLabel}>
          {label}
        </Text>

        <Text style={styles.modelValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F5F7FB',
  },

  errorIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },

  errorMessage: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
  },

  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: '#64748B',
  },

  aiIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  aiIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  summaryIconText: {
    fontSize: 20,
    color: '#2563EB',
    fontWeight: '800',
  },

  summaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },

  summaryText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#475569',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 15,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 7,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  metricIcon: {
    fontSize: 23,
    marginBottom: 9,
  },

  metricLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  metricValue: {
    fontSize: 25,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 5,
  },

  metricSecondary: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },

  riskBadge: {
    alignSelf: 'flex-start',
    marginTop: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },

  riskLow: {
    backgroundColor: '#DCFCE7',
  },

  riskMedium: {
    backgroundColor: '#FEF3C7',
  },

  riskHigh: {
    backgroundColor: '#FEE2E2',
  },

  riskText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },

  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  recommendationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  categoryContainer: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },

  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },

  priorityBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  highPriority: {
    backgroundColor: '#FEE2E2',
  },

  mediumPriority: {
    backgroundColor: '#FEF3C7',
  },

  lowPriority: {
    backgroundColor: '#DCFCE7',
  },

  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },

  highPriorityText: {
    color: '#B91C1C',
  },

  mediumPriorityText: {
    color: '#B45309',
  },

  lowPriorityText: {
    color: '#15803D',
  },

  recommendationTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 7,
  },

  recommendationMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
  },

  actionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
  },

  actionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563EB',
    marginBottom: 5,
  },

  actionText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
    fontWeight: '600',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },

  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
  },

  modelsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },

  modelIndicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    marginRight: 12,
  },

  modelContent: {
    flex: 1,
  },

  modelLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 3,
  },

  modelValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },

  refreshButton: {
    backgroundColor: '#2563EB',
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
  },

  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    color: '#94A3B8',
    marginTop: 15,
  },
});