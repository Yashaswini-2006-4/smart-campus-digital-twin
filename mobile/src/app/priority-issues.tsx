import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import RoleGuard from '../components/auth/RoleGuard';
import { API_BASE_URL } from '../constants/api';

type Issue = {
  id: number;
  title: string;
  description: string;
  location: string;
  priority: string;
  status: string;
};

export default function PriorityIssues() {
  const [items, setItems] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/maintenance/priority-issues`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to load priority issues');
      }

      setItems(data.issues || []);
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

  const resolveIssue = (item: Issue) => {
    Alert.alert('Resolve issue', `Resolve "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/maintenance/complaints/${item.id}/status`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Resolved' }),
              },
            );

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.detail || 'Could not resolve issue');
            }

            await load(true);
          } catch (e) {
            Alert.alert(
              'Error',
              e instanceof Error ? e.message : 'Could not resolve issue',
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

        <Text style={styles.title}>Priority Issues</Text>
        <Text style={styles.subtitle}>
          Active high-priority and urgent complaints.
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {items.length} active priority issue(s)
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
            <Text>No active high-priority or urgent issues.</Text>
          </View>
        ) : (
          items.map(item => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.heading}>{item.title}</Text>
              <Text
                style={[
                  styles.badge,
                  item.priority === 'Urgent' && styles.urgent,
                ]}
              >
                {item.priority}
              </Text>
              <Text style={styles.meta}>
                Complaint #{item.id} · {item.status}
              </Text>
              <Text style={styles.detail}>{item.description}</Text>
              <Text style={styles.meta}>Location: {item.location}</Text>

              <Pressable
                style={styles.button}
                onPress={() => resolveIssue(item)}
              >
                <Text style={styles.buttonText}>Mark Resolved</Text>
              </Pressable>
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
    backgroundColor: '#FEE2E2', padding: 14,
    borderRadius: 12, marginTop: 18,
  },
  summaryText: { color: '#991B1B', fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 16, marginTop: 16, elevation: 2,
  },
  heading: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  badge: {
    alignSelf: 'flex-start', color: '#92400E',
    backgroundColor: '#FEF3C7', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 8,
    overflow: 'hidden', fontWeight: '700',
  },
  urgent: { color: '#991B1B', backgroundColor: '#FEE2E2' },
  meta: { color: '#6B7280', marginTop: 7, fontSize: 13 },
  detail: { color: '#374151', marginTop: 8, lineHeight: 20 },
  button: {
    backgroundColor: '#2563EB', padding: 12,
    borderRadius: 9, alignSelf: 'flex-start', marginTop: 14,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  link: { color: '#2563EB', fontWeight: '600' },
  error: { color: '#B91C1C', marginBottom: 8 },
  loader: { marginTop: 24 },
});