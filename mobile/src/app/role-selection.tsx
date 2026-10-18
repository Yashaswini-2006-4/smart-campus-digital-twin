import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { NODE_API_URL } from '../constants/api';

type Role = 'student' | 'faculty' | 'admin' | 'maintenance';

const roles: {
  role: Role;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    role: 'student',
    title: 'Student',
    description: 'View campus information and AI recommendations',
    icon: '🎓',
  },
  {
    role: 'faculty',
    title: 'Faculty',
    description: 'View classes, occupancy and campus alerts',
    icon: '👩‍🏫',
  },
  {
    role: 'admin',
    title: 'Admin',
    description: 'Manage campus intelligence and AI insights',
    icon: '🛠️',
  },
  {
    role: 'maintenance',
    title: 'Maintenance',
    description: 'View complaints and maintenance tasks',
    icon: '🔧',
  },
];

export default function RoleSelection() {
  const [loadingRole, setLoadingRole] = React.useState<Role | null>(null);

  const selectRole = async (role: Role) => {
    try {
      setLoadingRole(role);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert(
          'Session Expired',
          'Please log in again.',
        );

        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${NODE_API_URL}/api/auth/select-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to select role',
        );
      }

      // Store the new JWT containing the selected role
      await AsyncStorage.setItem('token', data.token);

      // Keep the selected role for frontend dashboard guards
      await AsyncStorage.setItem('userRole', role);

      await AsyncStorage.setItem('isLoggedIn', 'true');

      switch (role) {
        case 'student':
          router.replace('/student-dashboard');
          break;

        case 'faculty':
          router.replace('/faculty-dashboard');
          break;

        case 'admin':
          router.replace('/admin-dashboard');
          break;

        case 'maintenance':
          router.replace('/maintenance-dashboard');
          break;
      }
    } catch (error) {
      console.error('Role selection error:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to select role.';

      Alert.alert('Role Selection Failed', message);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Role</Text>

        <Text style={styles.subtitle}>
          Select your role to access your Smart Campus dashboard
        </Text>
      </View>

      <View style={styles.rolesContainer}>
        {roles.map((item) => {
          const isLoading = loadingRole === item.role;

          return (
            <Pressable
              key={item.role}
              disabled={loadingRole !== null}
              style={({ pressed }) => [
                styles.roleCard,
                pressed && styles.roleCardPressed,
                loadingRole !== null &&
                  !isLoading &&
                  styles.roleCardDisabled,
              ]}
              onPress={() => selectRole(item.role)}
            >
              <Text style={styles.icon}>{item.icon}</Text>

              <View style={styles.roleContent}>
                <Text style={styles.roleTitle}>
                  {item.title}
                </Text>

                <Text style={styles.roleDescription}>
                  {item.description}
                </Text>
              </View>

              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#2563EB"
                />
              ) : (
                <Text style={styles.arrow}>›</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F5F7FB',
    paddingHorizontal: 30,
    paddingVertical: 70,
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: 35,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 500,
  },

  rolesContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    gap: 16,
  },

  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 25,
    paddingVertical: 25,
    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  roleCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },

  roleCardDisabled: {
    opacity: 0.6,
  },

  icon: {
    fontSize: 32,
    width: 55,
    textAlign: 'center',
  },

  roleContent: {
    flex: 1,
    marginLeft: 15,
  },

  roleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
  },

  roleDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },

  arrow: {
    fontSize: 32,
    color: '#2563EB',
    marginLeft: 10,
  },
});