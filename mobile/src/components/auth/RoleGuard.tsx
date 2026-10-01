import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type Role = 'student' | 'faculty' | 'admin' | 'maintenance';

interface RoleGuardProps {
  allowedRole: Role;
  children: ReactNode;
}

export default function RoleGuard({
  allowedRole,
  children,
}: RoleGuardProps) {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const userRole = await AsyncStorage.getItem('userRole');

      if (isLoggedIn !== 'true' || !userRole) {
        router.replace('/login');
        return;
      }

      if (userRole !== allowedRole) {
        router.replace('/role-selection');
        return;
      }

      setAuthorized(true);
    } catch (error) {
      console.error('Role verification failed:', error);
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },
});