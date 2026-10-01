import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RoleGuard from '../components/auth/RoleGuard';

export default function FacultyDashboard() {
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('userRole');

      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <RoleGuard allowedRole="faculty">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Faculty 👋</Text>

            <Text style={styles.subtitle}>
              Faculty Dashboard
            </Text>
          </View>

          <View style={styles.profileCircle}>
            <Text style={styles.profileText}>F</Text>
          </View>
        </View>

        {/* Campus Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            Campus Status
          </Text>

          <View style={styles.statusRow}>
            <View style={styles.statusDot} />

            <Text style={styles.statusText}>
              Campus is operating normally
            </Text>
          </View>
        </View>

        {/* Today's Overview */}
        <Text style={styles.sectionTitle}>
          Today's Overview
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.icon}>📚</Text>

            <Text style={styles.value}>--</Text>

            <Text style={styles.label}>
              Active Classes
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.icon}>👥</Text>

            <Text style={styles.value}>--</Text>

            <Text style={styles.label}>
              Occupancy
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.icon}>⚡</Text>

            <Text style={styles.value}>--</Text>

            <Text style={styles.label}>
              Energy Usage
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.icon}>🚨</Text>

            <Text style={styles.value}>--</Text>

            <Text style={styles.label}>
              Alerts
            </Text>
          </View>
        </View>

        {/* Class Occupancy */}
        <Text style={styles.sectionTitle}>
          Class Occupancy
        </Text>

        <Pressable
          style={styles.featureCard}
          onPress={() =>
            router.push('/occupancy-prediction')
          }
        >
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Classroom Occupancy
            </Text>

            <Text style={styles.featureDescription}>
              View current and predicted classroom occupancy.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* AI Recommendations */}
        <Text style={styles.sectionTitle}>
          AI Recommendations 🤖
        </Text>

        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>
            Smart Teaching Insights
          </Text>

          <Text style={styles.recommendationText}>
            AI recommendations based on classroom occupancy,
            energy usage and campus conditions will appear here.
          </Text>
        </View>

        {/* Campus Alerts */}
        <Text style={styles.sectionTitle}>
          Campus Alerts
        </Text>

        <Pressable
          style={styles.featureCard}
          onPress={() =>
            router.push('/anomaly-detection')
          }
        >
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Active Alerts
            </Text>

            <Text style={styles.featureDescription}>
              Important campus alerts and anomaly notifications.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
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
    marginLeft: 10,
  },

  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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

  logoutButtonPressed: {
    opacity: 0.7,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});