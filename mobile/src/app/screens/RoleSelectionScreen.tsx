import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

export default function RoleSelectionScreen() {
  const roles = [
    {
      title: 'Student',
      icon: '🎓',
      description: 'View campus information and AI recommendations',
      route: '/student-dashboard',
    },
    {
      title: 'Faculty',
      icon: '👨‍🏫',
      description: 'View classes, occupancy and campus alerts',
      route: '/faculty-dashboard',
    },
    {
      title: 'Admin',
      icon: '🛠️',
      description: 'Manage campus intelligence and AI insights',
      route: '/admin-dashboard',
    },
    {
      title: 'Maintenance',
      icon: '🔧',
      description: 'View complaints and maintenance tasks',
      route: '/maintenance-dashboard',
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>
          Select your role to access your Smart Campus dashboard
        </Text>
      </View>

      <View style={styles.rolesContainer}>
        {roles.map((role) => (
          <Pressable
            key={role.title}
            style={({ pressed }) => [
              styles.roleCard,
              pressed && styles.pressedCard,
            ]}
            onPress={() => router.push(role.route as any)}
          >
            <Text style={styles.icon}>{role.icon}</Text>

            <View style={styles.textContainer}>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.description}>
                {role.description}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F7FB',
    padding: 24,
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 350,
  },

  rolesContainer: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    gap: 16,
  },

  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },

  pressedCard: {
    opacity: 0.7,
  },

  icon: {
    fontSize: 32,
    marginRight: 16,
  },

  textContainer: {
    flex: 1,
  },

  roleTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
  },

  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },

  arrow: {
    fontSize: 30,
    color: '#2563EB',
    marginLeft: 10,
  },
});