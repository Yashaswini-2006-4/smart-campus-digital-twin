import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RoleGuard from '../components/auth/RoleGuard';
import { NODE_API_URL } from '../constants/api';

type PendingUser = { _id: string; name: string; email: string; createdAt?: string };
type Role = 'student' | 'faculty' | 'admin' | 'maintenance';
const roles: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'admin', label: 'Admin' },
  { value: 'maintenance', label: 'Maintenance' },
];

export default function UserApprovalsScreen() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadPendingUsers = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Your session has expired. Please log in again.');
      const response = await fetch(`${NODE_API_URL}/api/auth/pending-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load registrations.');
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load registrations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadPendingUsers(); }, [loadPendingUsers]);

  const assignRole = async (user: PendingUser, role: Role) => {
    Alert.alert('Confirm Role Assignment', `Assign ${user.name} the ${role} role? They will be able to access that role's dashboard.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Assign Role', onPress: () => { void submitRole(user, role); } },
    ]);
  };

  const submitRole = async (user: PendingUser, role: Role) => {
    try {
      setAssigningId(user._id);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Your session has expired. Please log in again.');
      const response = await fetch(`${NODE_API_URL}/api/auth/users/${user._id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to assign role.');
      setUsers(current => current.filter(item => item._id !== user._id));
      Alert.alert('Role Assigned', `${user.name} is now assigned as ${role}.`);
    } catch (err) {
      Alert.alert('Assignment Failed', err instanceof Error ? err.message : 'Unable to assign role.');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <RoleGuard allowedRole="admin">
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadPendingUsers(true)} colors={['#2563EB']} />}>
        <Pressable onPress={() => router.replace('/admin-dashboard')} style={styles.backButton}><Text style={styles.backText}>‹ Back to Admin Dashboard</Text></Pressable>
        <Text style={styles.title}>Registration Approvals</Text>
        <Text style={styles.subtitle}>Assign a role to approve an account. Until then, the user cannot log in or access any dashboard.</Text>
        {loading ? <ActivityIndicator size="large" color="#2563EB" style={styles.loader} /> : null}
        {error ? <View style={styles.messageCard}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void loadPendingUsers()} style={styles.retryButton}><Text style={styles.retryText}>Try Again</Text></Pressable></View> : null}
        {!loading && !error && users.length === 0 ? <View style={styles.messageCard}><Text style={styles.emptyTitle}>No pending registrations</Text><Text style={styles.emptyText}>New registrations will appear here.</Text></View> : null}
        {users.map(user => (
          <View key={user._id} style={styles.userCard}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.pendingBadge}>PENDING APPROVAL</Text>
            <Text style={styles.assignLabel}>Assign role:</Text>
            <View style={styles.roleGrid}>
              {roles.map(role => (
                <Pressable key={role.value} disabled={assigningId !== null} style={[styles.roleButton, assigningId === user._id && styles.disabled]} onPress={() => void assignRole(user, role.value)}>
                  {assigningId === user._id ? <ActivityIndicator color="#2563EB" /> : <Text style={styles.roleButtonText}>{role.label}</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FB' },
  content: { padding: 22, paddingBottom: 40 },
  backButton: { paddingVertical: 12, marginBottom: 8 },
  backText: { color: '#2563EB', fontWeight: '600', fontSize: 15 },
  title: { color: '#111827', fontSize: 27, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#6B7280', fontSize: 14, lineHeight: 21, marginBottom: 20 },
  loader: { marginTop: 24 },
  messageCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, marginTop: 10 },
  emptyTitle: { fontSize: 17, color: '#111827', fontWeight: 'bold', textAlign: 'center' },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 6 },
  errorText: { color: '#B91C1C', lineHeight: 20 },
  retryButton: { backgroundColor: '#2563EB', padding: 12, borderRadius: 9, marginTop: 12, alignItems: 'center' },
  retryText: { color: '#FFFFFF', fontWeight: 'bold' },
  userCard: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 18, marginBottom: 15, elevation: 2 },
  userName: { color: '#111827', fontSize: 18, fontWeight: 'bold' },
  email: { color: '#64748B', fontSize: 14, marginTop: 4 },
  pendingBadge: { color: '#B45309', backgroundColor: '#FEF3C7', overflow: 'hidden', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, fontSize: 11, fontWeight: 'bold', marginTop: 12 },
  assignLabel: { color: '#374151', fontWeight: '600', marginTop: 16, marginBottom: 9 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleButton: { minWidth: '46%', flexGrow: 1, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center' },
  roleButtonText: { color: '#1D4ED8', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
