import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import RoleGuard from '../components/auth/RoleGuard';
import { API_BASE_URL } from '../constants/api';

type Complaint = {
  id: number;
  title: string;
  description: string;
  location: string;
  priority: string;
  status: string;
};

export default function OpenComplaints() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/maintenance/complaints`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to load complaints');
      }

      setItems(data.complaints || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to backend');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = (item: Complaint, status: string) => {
    Alert.alert('Update complaint', `Set status to "${status}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/maintenance/complaints/${item.id}/status`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
              },
            );

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.detail || 'Status update failed');
            }

            await load(true);
          } catch (e) {
            Alert.alert(
              'Error',
              e instanceof Error ? e.message : 'Could not update complaint',
            );
          }
        },
      },
    ]);
  };

  return (
    <RoleGuard allowedRole="maintenance">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back to Dashboard</Text>
        </Pressable>

        <Text style={styles.title}>Open Complaints</Text>
        <Text style={styles.subtitle}>
          Campus complaints stored in the maintenance database.
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {items.filter(item => item.status !== 'Resolved').length} unresolved
            complaint(s)
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => load()}>
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.card}>
            <Text>No complaints found.</Text>
          </View>
        ) : (
          items.map(item => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.heading}>{item.title}</Text>
              <Text style={styles.meta}>
                #{item.id} · {item.priority} · {item.status}
              </Text>
              <Text style={styles.detail}>{item.description}</Text>
              <Text style={styles.meta}>Location: {item.location}</Text>

              <View style={styles.row}>
                {item.status !== 'In Progress' &&
                  item.status !== 'Resolved' && (
                    <Pressable
                      style={styles.button}
                      onPress={() => updateStatus(item, 'In Progress')}
                    >
                      <Text style={styles.buttonText}>Start Work</Text>
                    </Pressable>
                  )}

                {item.status !== 'Resolved' && (
                  <Pressable
                    style={styles.button}
                    onPress={() => updateStatus(item, 'Resolved')}
                  >
                    <Text style={styles.buttonText}>Resolve</Text>
                  </Pressable>
                )}

                {item.status !== 'Open' && (
                  <Pressable
                    style={styles.secondary}
                    onPress={() => updateStatus(item, 'Open')}
                  >
                    <Text>Reopen</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  content: { padding: 20, paddingBottom: 40 },
  back: { color: '#2563EB', fontSize: 15, marginBottom: 16 },
  title: { fontSize: 25, fontWeight: 'bold', color: '#111827' },
  subtitle: { color: '#6B7280', marginTop: 8, lineHeight: 21 },
  summary: {
    backgroundColor: '#DBEAFE', padding: 14,
    borderRadius: 12, marginTop: 18,
  },
  summaryText: { color: '#1D4ED8', fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 16, marginTop: 16, elevation: 2,
  },
  heading: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  meta: { color: '#6B7280', marginTop: 7, fontSize: 13 },
  detail: { color: '#374151', marginTop: 8, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  button: { backgroundColor: '#2563EB', padding: 10, borderRadius: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  secondary: {
    borderWidth: 1, borderColor: '#D1D5DB',
    padding: 10, borderRadius: 8,
  },
  link: { color: '#2563EB', fontWeight: '600' },
  error: { color: '#B91C1C', marginBottom: 8 },
  loader: { marginTop: 24 },
});