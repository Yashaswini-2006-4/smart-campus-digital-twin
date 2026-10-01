import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function Index() {
  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const role = await AsyncStorage.getItem('userRole');

      if (isLoggedIn === 'true' && role) {
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

          default:
            router.replace('/role-selection');
        }
      } else {
        router.replace('/login');
      }
    } catch (error) {
      console.error('Login check failed:', error);
      router.replace('/login');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
});