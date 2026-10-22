import React, { useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NODE_API_URL } from '../constants/api';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing Information', 'Please fill in every field.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password Too Short', 'Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please confirm the same password.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${NODE_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed.');
      setRegistered(true);
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        error instanceof Error ? error.message : 'Unable to connect to the backend.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoCircle}><Text style={styles.logoText}>SC</Text></View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Smart Campus Digital Twin</Text>
        <View style={styles.card}>
          {registered ? (
            <>
              <Text style={styles.successTitle}>Registration submitted ✓</Text>
              <Text style={styles.note}>
                Your account is pending approval. You can sign in after an administrator assigns your Student, Faculty, Admin, or Maintenance role.
              </Text>
              <Pressable style={styles.primaryButton} onPress={() => router.replace('/login')}>
                <Text style={styles.primaryButtonText}>Back to Login</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.heading}>Register</Text>
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.input} placeholder="Enter your full name" value={name} onChangeText={setName} autoCapitalize="words" />
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <Text style={styles.label}>Password</Text>
              <TextInput style={styles.input} placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput style={styles.input} placeholder="Re-enter password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />
              <Pressable style={[styles.primaryButton, loading && styles.disabled]} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
              </Pressable>
              <Text style={styles.note}>New accounts cannot access the dashboards until an administrator assigns a role.</Text>
              <Pressable style={styles.linkButton} onPress={() => router.replace('/login')}>
                <Text style={styles.linkText}>Already registered? Login</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  logoText: { color: '#FFFFFF', fontSize: 23, fontWeight: 'bold' },
  title: { fontSize: 29, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 6, marginBottom: 24 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, elevation: 4 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 13, marginBottom: 16, color: '#111827', backgroundColor: '#FFFFFF' },
  primaryButton: { minHeight: 49, backgroundColor: '#2563EB', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.7 },
  note: { color: '#6B7280', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 16 },
  linkButton: { alignItems: 'center', paddingTop: 18 },
  linkText: { color: '#2563EB', fontWeight: '600' },
  successTitle: { color: '#166534', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
});
