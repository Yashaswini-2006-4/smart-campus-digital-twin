
import React, { useCallback, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RoleGuard from '../components/auth/RoleGuard';
import { API_BASE_URL } from '../constants/api';

type MaintenanceSummary = {
  open_complaints: number;
  high_priority: number;
  tasks: number;
  completed: number;
};

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
};

export default function MaintenanceDashboard() {
  const [summary, setSummary] =
    useState<MaintenanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/maintenance/summary`
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data: MaintenanceSummary = await response.json();

      setSummary({
        open_complaints: Number(data.open_complaints ?? 0),
        high_priority: Number(data.high_priority ?? 0),
        tasks: Number(data.tasks ?? 0),
        completed: Number(data.completed ?? 0),
      });
    } catch (error) {
      console.error(
        'Failed to load maintenance summary:',
        error
      );
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSummary();
  }, [fetchSummary]);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('userRole');
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Logout failed', 'Please try again.');
    }
  };

  const openFeature = (path: string) => {
    router.push(path as any);
  };

  const displayCount = (value: number | undefined) =>
    summary === null ? '--' : String(value ?? 0);

  return (
    <RoleGuard allowedRole="maintenance">
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
              Hello, Maintenance 👋
            </Text>
            <Text style={styles.subtitle}>
              Your work queue and campus service requests
            </Text>
          </View>

          <View style={styles.profileCircle}>
            <Text style={styles.profileText}>M</Text>
          </View>
        </View>

        {/* Workspace introduction */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            Maintenance Workspace
          </Text>

          <Text style={styles.statusDescription}>
            Review assigned jobs, investigate campus issues,
            update task progress, record maintenance notes,
            and complete work after resolution.
          </Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                summary === null &&
                  styles.statusDotUnavailable,
              ]}
            />
            <Text style={styles.statusText}>
              {summary === null
                ? 'Work summary unavailable'
                : 'Maintenance workspace ready'}
            </Text>
          </View>
        </View>

        {/* Work Overview */}
        <Text style={styles.sectionTitle}>
          Work Overview
        </Text>

        <View style={styles.statsRow}>
          <StatCard
            icon="📋"
            value={displayCount(summary?.open_complaints)}
            label="Open Complaints"
          />

          <StatCard
            icon="🚨"
            value={displayCount(summary?.high_priority)}
            label="High Priority"
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            icon="🔧"
            value={displayCount(summary?.tasks)}
            label="Maintenance Tasks"
          />

          <StatCard
            icon="✅"
            value={displayCount(summary?.completed)}
            label="Completed Tasks"
          />
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator
              size="small"
              color="#2563EB"
            />
            <Text style={styles.loadingText}>
              Loading work summary...
            </Text>
          </View>
        )}

        {/* Maintenance tasks */}
        <Text style={styles.sectionTitle}>
          My Work
        </Text>

        <FeatureCard
          icon="🧰"
          title="Assigned Maintenance Tasks"
          description="View task details, update progress, record work notes, and complete assigned jobs."
          onPress={() =>
            openFeature('/maintenance-tasks')
          }
        />

        <FeatureCard
          icon="📋"
          title="Open Complaints"
          description="Review reported campus issues, inspect locations, and follow up on resolution."
          onPress={() =>
            openFeature('/open-complaints')
          }
        />

        <FeatureCard
          icon="🚨"
          title="Priority Issues"
          description="Identify urgent problems that require prompt maintenance attention."
          onPress={() =>
            openFeature('/priority-issues')
          }
        />

        {/* Campus operations */}
        <Text style={styles.sectionTitle}>
          Campus Operations
        </Text>

        <FeatureCard
          icon="🏫"
          title="Daily Class Occupancy"
          description="Record student counts by date, class or section, and room; review previous records."
          onPress={() =>
            openFeature('/class-occupancy')
          }
        />

        {/* AI alerts */}
        <Text style={styles.sectionTitle}>
          AI Anomaly Alerts 🤖
        </Text>

        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>
            Smart Maintenance Alerts
          </Text>

          <Text style={styles.recommendationText}>
            Check available AI alerts for unusual equipment
            or infrastructure behaviour. Investigate the
            affected area, document your findings, and
            escalate issues that need further attention.
          </Text>
        </View>

        {/* Recommended workflow */}
        <Text style={styles.sectionTitle}>
          Recommended Work Process
        </Text>

        <View style={styles.workflowCard}>
          <WorkflowStep
            number="1"
            title="Review"
            description="Check assigned tasks and urgent complaints."
          />

          <WorkflowStep
            number="2"
            title="Inspect"
            description="Visit the reported location and investigate the issue."
          />

          <WorkflowStep
            number="3"
            title="Update"
            description="Record progress and add clear maintenance notes."
          />

          <WorkflowStep
            number="4"
            title="Complete"
            description="Mark work complete after the repair or service is finished."
            last
          />
        </View>

        {/* Refresh */}
        <Pressable
          accessibilityRole="button"
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
              ↻ Refresh Work Summary
            </Text>
          )}
        </Pressable>

        {/* Logout */}
        <Pressable
          accessibilityRole="button"
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

/* Reusable overview card */
function StatCard({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

/* Reusable navigation card */
function FeatureCard({
  icon,
  title,
  description,
  onPress,
}: FeatureCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.featureCard,
        pressed && styles.pressedCard,
      ]}
      onPress={onPress}
    >
      <Text style={styles.featureIcon}>{icon}</Text>

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

/* Work process step */
function WorkflowStep({
  number,
  title,
  description,
  last = false,
}: {
  number: string;
  title: string;
  description: string;
  last?: boolean;
}) {
  return (
    <View style={styles.workflowStep}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>
          {number}
        </Text>
      </View>

      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>
          {description}
        </Text>
      </View>

      {!last && <View style={styles.stepConnector} />}
    </View>
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
    lineHeight: 20,
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
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  statusDescription: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginRight: 10,
  },
  statusDotUnavailable: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    color: '#4B5563',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 8,
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 12,
    gap: 8,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 13,
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
  pressedCard: {
    opacity: 0.75,
    backgroundColor: '#EEF4FF',
  },
  featureIcon: {
    fontSize: 26,
    marginRight: 14,
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
    marginLeft: 8,
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    elevation: 3,
  },
  recommendationTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },
  workflowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
  },
  workflowStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 68,
    position: 'relative',
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepNumberText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
  },
  stepTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepDescription: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  stepConnector: {
    position: 'absolute',
    left: 14,
    top: 30,
    bottom: 4,
    width: 2,
    backgroundColor: '#DBEAFE',
  },
  refreshButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  refreshText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: 'bold',
  },
  pressedButton: {
    opacity: 0.75,
  },
  logoutButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
