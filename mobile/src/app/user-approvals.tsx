import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RoleGuard from '../components/auth/RoleGuard';
import { NODE_API_URL } from '../constants/api';

type PendingUser = {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
};

type Role = 'student' | 'faculty' | 'admin' | 'maintenance';

const roles: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'admin', label: 'Admin' },
  { value: 'maintenance', label: 'Maintenance' },
];

async function readResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export default function UserApprovalsScreen() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPendingUsers = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError('');
    setNotice('');

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const response = await fetch(`${NODE_API_URL}/api/auth/pending-users`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || `Unable to load registrations (HTTP ${response.status}).`,
        );
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load registrations.';
      setError(
        message === 'Failed to fetch'
          ? `Cannot reach the backend at ${NODE_API_URL}. Check your Render URL and backend CORS settings.`
          : message,
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPendingUsers();
  }, [loadPendingUsers]);

  const submitRole = async (user: PendingUser, role: Role) => {
    if (assigningId) return;

    setAssigningId(user._id);
    setError('');
    setNotice('');

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const response = await fetch(
        `${NODE_API_URL}/api/auth/users/${encodeURIComponent(user._id)}/role`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role }),
        },
      );
      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || `Unable to assign role (HTTP ${response.status}).`,
        );
      }

      setUsers(current => current.filter(item => item._id !== user._id));
      setNotice(`${user.name} was assigned the ${role} role successfully.`);
      if (Platform.OS !== 'web') {
        Alert.alert('Role Assigned', `${user.name} is now assigned as ${role}.`);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to assign role.';
      const visibleMessage =
        message === 'Failed to fetch'
          ? `Cannot reach the backend at ${NODE_API_URL}. Check the Render URL and CORS settings.`
          : message;

      setError(visibleMessage);
      if (Platform.OS !== 'web') {
        Alert.alert('Assignment Failed', visibleMessage);
      }
    } finally {
      setAssigningId(null);
    }
  };

  const assignRole = (user: PendingUser, role: Role) => {
    const message = `Assign ${user.name} the ${role} role? They will be able to access that role's dashboard.`;

    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' && window.confirm(message);
      if (confirmed) void submitRole(user, role);
      return;
    }

    Alert.alert('Confirm Role Assignment', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Assign Role',
        onPress: () => void submitRole(user, role),
      },
    ]);
  };

  return (
    <RoleGuard allowedRole="admin">
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadPendingUsers(true)}
            colors={['#2563EB']}
          />
        }
      >
        <Pressable
          onPress={() => router.replace('/admin-dashboard')}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Back to Admin Dashboard</Text>
        </Pressable>

        <Text style={styles.title}>Registration Approvals</Text>
        <Text style={styles.subtitle}>
          Assign a role to approve an account. Until then, the user cannot log
          in or access any dashboard.
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />
        ) : null}

        {error ? (
          <View style={styles.messageCard}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {error}
            </Text>
            <Pressable
              onPress={() => void loadPendingUsers()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {notice ? (
          <View style={styles.successCard}>
            <Text style={styles.successText}>{notice}</Text>
          </View>
        ) : null}

        {!loading && !error && users.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.emptyTitle}>No pending registrations</Text>
            <Text style={styles.emptyText}>
              New registrations will appear here.
            </Text>
          </View>
        ) : null}

        {users.map(user => (
          <View key={user._id} style={styles.userCard}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.pendingBadge}>PENDING APPROVAL</Text>
            <Text style={styles.assignLabel}>Assign role:</Text>

            <View style={styles.roleGrid}>
              {roles.map(role => (
                <Pressable
                  key={role.value}
                  disabled={assigningId !== null}
                  style={[
                    styles.roleButton,
                    assigningId !== null && styles.disabled,
                  ]}
                  onPress={() => assignRole(user, role.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Assign ${role.label} role to ${user.name}`}
                >
                  {assigningId === user._id ? (
                    <ActivityIndicator color="#2563EB" />
                  ) : (
                    <Text style={styles.roleButtonText}>{role.label}</Text>
                  )}
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
  title: {
    color: '#111827',
    fontSize: 27,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  loader: { marginTop: 24 },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 17,
    color: '#111827',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 6 },
  errorText: { color: '#B91C1C', lineHeight: 20 },
  successCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  successText: { color: '#166534', lineHeight: 20, fontWeight: '600' },
  retryButton: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 9,
    marginTop: 12,
    alignItems: 'center',
  },
  retryText: { color: '#FFFFFF', fontWeight: 'bold' },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    elevation: 2,
  },
  userName: { color: '#111827', fontSize: 18, fontWeight: 'bold' },
  email: { color: '#64748B', fontSize: 14, marginTop: 4 },
  pendingBadge: {
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    overflow: 'hidden',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 12,
  },
  assignLabel: {
    color: '#374151',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 9,
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleButton: {
    minWidth: '46%',
    flexGrow: 1,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  roleButtonText: { color: '#1D4ED8', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
