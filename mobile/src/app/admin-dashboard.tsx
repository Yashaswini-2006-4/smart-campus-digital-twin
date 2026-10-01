import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RoleGuard from '../components/auth/RoleGuard';

export default function AdminDashboard() {
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
    <RoleGuard allowedRole="admin">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Hello, Admin 👋</Text>

            <Text style={styles.subtitle}>
              Campus Intelligence Dashboard
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
        </View>

        {/* Campus Health Score */}
        <View style={styles.healthCard}>
          <Text style={styles.healthTitle}>
            Campus Health Score
          </Text>

          <Text style={styles.healthValue}>--</Text>

          <Text style={styles.healthDescription}>
            AI-based campus health assessment
          </Text>
        </View>

        {/* Campus Overview */}
        <Text style={styles.sectionTitle}>
          Campus Overview
        </Text>

        <View style={styles.grid}>
          <View style={styles.overviewCard}>
            <Text style={styles.icon}>👥</Text>

            <Text style={styles.value}>--</Text>

            <Text style={styles.label}>
              Occupancy
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.icon}>⚡</Text>

            <Text style={styles.value}>--</Text>

            <Text style={styles.label}>
              Energy
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.icon}>🚨</Text>

            <Text style={styles.value}>--</Text>

            <Text style={styles.label}>
              Anomalies
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.icon}>🔧</Text>

            <Text style={styles.value}>--</Text>

            <Text style={styles.label}>
              Maintenance
            </Text>
          </View>
        </View>

        {/* AI & Machine Learning */}
        <Text style={styles.sectionTitle}>
          AI & Machine Learning 🤖
        </Text>

        {/* Occupancy Prediction */}
        <Pressable
          style={styles.featureCard}
          onPress={() => router.push('/occupancy-prediction')}
        >
          <Text style={styles.featureIcon}>👥</Text>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Occupancy Prediction
            </Text>

            <Text style={styles.featureDescription}>
              Predict future campus and building occupancy.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Energy Prediction */}
        <Pressable
          style={styles.featureCard}
          onPress={() => router.push('/energy-prediction')}
        >
          <Text style={styles.featureIcon}>⚡</Text>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Energy Prediction
            </Text>

            <Text style={styles.featureDescription}>
              Forecast campus energy consumption.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Anomaly Detection */}
        <Pressable
          style={styles.featureCard}
          onPress={() => router.push('/anomaly-detection')}
        >
          <Text style={styles.featureIcon}>🚨</Text>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Anomaly Detection
            </Text>

            <Text style={styles.featureDescription}>
              Detect unusual energy, occupancy and sensor behaviour.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* AI Decision Layer */}
        <Text style={styles.sectionTitle}>
          AI Decision Layer
        </Text>

        {/* AI Recommendations */}
        <Pressable
          style={styles.featureCard}
          onPress={() => router.push('/ai-recommendations')}
        >
          <Text style={styles.featureIcon}>💡</Text>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              AI Recommendations
            </Text>

            <Text style={styles.featureDescription}>
              Generate intelligent recommendations for campus operations.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* What-If Simulation */}
        <Pressable
          style={styles.featureCard}
          onPress={() => router.push('/what-if-simulation')}
        >
          <Text style={styles.featureIcon}>🔮</Text>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              What-If Simulation
            </Text>

            <Text style={styles.featureDescription}>
              Simulate operational changes and compare predicted outcomes.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Campus Health Score */}
        <Pressable
          style={styles.featureCard}
          onPress={() => router.push('/campus-health-score')}
        >
          <Text style={styles.featureIcon}>🩺</Text>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Campus Health Score
            </Text>

            <Text style={styles.featureDescription}>
              View an overall AI-based campus health assessment.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Logout */}
        <Pressable
          style={styles.logoutButton}
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

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
  },

  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },

  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 32,
  },

  healthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },

  healthValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2563EB',
    marginVertical: 12,
  },

  healthDescription: {
    fontSize: 14,
    color: '#6B7280',
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 14,
    marginTop: 4,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  overviewCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },

  icon: {
    fontSize: 26,
    marginBottom: 12,
  },

  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 5,
  },

  label: {
    fontSize: 14,
    color: '#6B7280',
  },

  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  featureIcon: {
    fontSize: 28,
    width: 50,
  },

  featureContent: {
    flex: 1,
    paddingHorizontal: 8,
  },

  featureTitle: {
    fontSize: 17,
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
    fontSize: 30,
    color: '#2563EB',
  },

  logoutButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});