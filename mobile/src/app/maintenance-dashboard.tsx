import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
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

export default function MaintenanceDashboard() {
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);

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
      console.error('Failed to load maintenance summary:', error);
      setSummary(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary])
  );

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

  const FeatureCard = ({
    icon,
    title,
    description,
    onPress,
  }: {
    icon: string;
    title: string;
    description: string;
    onPress: () => void;
  }) => (
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
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );

  return (
    <RoleGuard allowedRole="maintenance">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, Maintenance 👋
            </Text>
            <Text style={styles.subtitle}>
              Maintenance Dashboard
            </Text>
          </View>

          <View style={styles.profileCircle}>
            <Text style={styles.profileText}>M</Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            Maintenance Status
          </Text>

          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              System operating normally
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Maintenance Overview
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.icon}>📋</Text>
            <Text style={styles.value}>
              {displayCount(summary?.open_complaints)}
            </Text>
            <Text style={styles.label}>Open Complaints</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.icon}>🚨</Text>
            <Text style={styles.value}>
              {displayCount(summary?.high_priority)}
            </Text>
            <Text style={styles.label}>High Priority</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.icon}>🔧</Text>
            <Text style={styles.value}>
              {displayCount(summary?.tasks)}
            </Text>
            <Text style={styles.label}>Tasks</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.icon}>✅</Text>
            <Text style={styles.value}>
              {displayCount(summary?.completed)}
            </Text>
            <Text style={styles.label}>Completed</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Maintenance Tasks
        </Text>

        <FeatureCard
          icon="📋"
          title="Open Complaints"
          description="View and manage reported campus issues."
          onPress={() => openFeature('/open-complaints')}
        />

        <FeatureCard
          icon="🚨"
          title="Priority Issues"
          description="View issues requiring immediate attention."
          onPress={() => openFeature('/priority-issues')}
        />

        <FeatureCard
          icon="🏫"
          title="Daily Class Occupancy"
          description="Record student counts by date, class/section and room, and view history."
          onPress={() => openFeature('/class-occupancy')}
        />

        <Text style={styles.sectionTitle}>
          AI Anomaly Alerts 🤖
        </Text>

        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>
            Smart Maintenance Alerts
          </Text>

          <Text style={styles.recommendationText}>
            AI-detected equipment or infrastructure anomalies
            will appear here for maintenance action.
          </Text>
        </View>

        <FeatureCard
          icon="🔧"
          title="Maintenance Tasks"
          description="Track assigned, ongoing and completed maintenance work."
          onPress={() => openFeature('/maintenance-tasks')}
        />

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressedButton,
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </RoleGuard>
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
  greeting: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
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
  statusText: {
    color: '#4B5563',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 4,
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
  logoutButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  pressedButton: {
    opacity: 0.75,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});