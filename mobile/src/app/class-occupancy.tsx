import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import RoleGuard from '../components/auth/RoleGuard';
import { API_BASE_URL } from '../constants/api';

type OccupancyRecord = {
  id: number;
  record_date: string;
  class_section: string;
  room_number: string;
  student_count: number;
  created_at: string;
  updated_at: string;
};

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ClassOccupancyScreen() {
  const [recordDate, setRecordDate] = useState(getLocalDateString());
  const [classSection, setClassSection] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [historyDate, setHistoryDate] = useState(getLocalDateString());
  const [records, setRecords] = useState<OccupancyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const query = historyDate.trim()
        ? `?record_date=${encodeURIComponent(historyDate.trim())}`
        : '';
      const response = await fetch(`${API_BASE_URL}/class-occupancy${query}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || 'Could not load occupancy history.');
      }
      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error.';
      Alert.alert('Could not load history', `${message}\n\nCheck that the backend is running and your phone can reach ${API_BASE_URL}.`);
    } finally {
      setLoading(false);
    }
  }, [historyDate]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSave = async () => {
    const normalizedDate = recordDate.trim();
    const normalizedClass = classSection.trim();
    const normalizedRoom = roomNumber.trim();
    const count = Number(studentCount);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      Alert.alert('Invalid date', 'Enter the date in YYYY-MM-DD format.');
      return;
    }
    if (!normalizedClass || !normalizedRoom || studentCount.trim() === '') {
      Alert.alert('Missing details', 'Enter the date, class/section, room number and student count.');
      return;
    }
    if (!Number.isInteger(count) || count < 0) {
      Alert.alert('Invalid student count', 'Enter a whole number of 0 or more.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/class-occupancy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: normalizedDate,
          class_section: normalizedClass,
          room_number: normalizedRoom,
          student_count: count,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || 'Could not save the occupancy record.');
      }

      setHistoryDate(normalizedDate);
      setClassSection('');
      setRoomNumber('');
      setStudentCount('');
      Alert.alert('Saved', 'Daily class occupancy has been saved. If this class and date already existed, its record was updated.');
      // Refresh explicitly; the history-date state update also triggers a refresh.
      if (historyDate === normalizedDate) {
        await loadHistory();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error.';
      Alert.alert('Save failed', `${message}\n\nCheck that the backend is running and your phone can reach ${API_BASE_URL}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allowedRole="maintenance">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadHistory} />}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹  Back to Dashboard</Text>
        </Pressable>

        <Text style={styles.title}>Daily Class Occupancy</Text>
        <Text style={styles.subtitle}>
          Enter one daily total for each class/section. Saving the same class and date updates its existing record.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Record Occupancy</Text>

          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            value={recordDate}
            onChangeText={setRecordDate}
            placeholder="2026-10-01"
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Class / Section</Text>
          <TextInput
            value={classSection}
            onChangeText={setClassSection}
            placeholder="e.g. CSE 6A"
            style={styles.input}
          />

          <Text style={styles.label}>Room Number</Text>
          <TextInput
            value={roomNumber}
            onChangeText={setRoomNumber}
            placeholder="e.g. 204"
            style={styles.input}
          />

          <Text style={styles.label}>Total Students Present</Text>
          <TextInput
            value={studentCount}
            onChangeText={setStudentCount}
            placeholder="e.g. 58"
            style={styles.input}
            keyboardType="number-pad"
          />

          <Pressable
            style={[styles.primaryButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save Occupancy</Text>}
          </Pressable>
        </View>

        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Occupancy History</Text>
          <Pressable onPress={loadHistory}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Filter by date (YYYY-MM-DD)</Text>
        <TextInput
          value={historyDate}
          onChangeText={setHistoryDate}
          placeholder="Leave blank to view recent records"
          style={styles.input}
          autoCapitalize="none"
        />

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
        ) : records.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No occupancy records found for this date.</Text>
          </View>
        ) : (
          records.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordTop}>
                <Text style={styles.recordClass}>{record.class_section}</Text>
                <Text style={styles.studentCount}>{record.student_count} students</Text>
              </View>
              <Text style={styles.recordDetail}>📅 {record.record_date}</Text>
              <Text style={styles.recordDetail}>🏫 Room {record.room_number}</Text>
              <Text style={styles.updatedAt}>
                Updated: {new Date(record.updated_at).toLocaleString()}
              </Text>
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
  backButton: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 10 },
  backText: { color: '#2563EB', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 25, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 21, marginTop: 8, marginBottom: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 24, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 7, marginTop: 10 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, color: '#111827' },
  primaryButton: { backgroundColor: '#2563EB', borderRadius: 10, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 20, padding: 12 },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refreshText: { color: '#2563EB', fontWeight: '600' },
  loader: { marginTop: 24 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, marginTop: 12 },
  emptyText: { color: '#6B7280', textAlign: 'center' },
  recordCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 12, elevation: 1 },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  recordClass: { fontSize: 16, fontWeight: 'bold', color: '#111827', flex: 1 },
  studentCount: { fontSize: 14, fontWeight: 'bold', color: '#047857' },
  recordDetail: { color: '#4B5563', fontSize: 14, marginTop: 7 },
  updatedAt: { color: '#9CA3AF', fontSize: 11, marginTop: 10 },
});
