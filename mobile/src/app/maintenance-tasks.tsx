import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import RoleGuard from '../components/auth/RoleGuard';
import { API_BASE_URL } from '../constants/api';

type Task = {
  id: number;
  title: string;
  description: string;
  location: string;
  assigned_to: string;
  priority: string;
  status: string;
};

export default function MaintenanceTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('Medium');

  const loadTasks = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/maintenance/tasks`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to load tasks');
      }

      setTasks(data.tasks || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to backend');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = async () => {
    if (title.trim().length < 2) {
      Alert.alert('Required', 'Enter a task title with at least 2 characters.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/maintenance/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          assigned_to: assignedTo.trim(),
          priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(data.detail || 'Task creation failed'));
      }

      setTitle('');
      setDescription('');
      setLocation('');
      setAssignedTo('');
      setPriority('Medium');

      await loadTasks(true);
      Alert.alert('Success', 'Task created successfully.');
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Could not create task',
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = (task: Task, status: string) => {
    Alert.alert('Update task', `Change status to "${status}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/maintenance/tasks/${task.id}/status`,
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

            await loadTasks(true);
          } catch (e) {
            Alert.alert(
              'Error',
              e instanceof Error ? e.message : 'Could not update task',
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTasks(true)}
          />
        }
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back to Dashboard</Text>
        </Pressable>

        <Text style={styles.title}>Maintenance Tasks</Text>
        <Text style={styles.subtitle}>
          Create, assign, and track maintenance work.
        </Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Create Task</Text>

          <TextInput
            style={styles.input}
            placeholder="Task title *"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Location"
            value={location}
            onChangeText={setLocation}
          />
          <TextInput
            style={styles.input}
            placeholder="Assigned to"
            value={assignedTo}
            onChangeText={setAssignedTo}
          />

          <Text style={styles.label}>Priority</Text>
          <View style={styles.row}>
            {['Low', 'Medium', 'High', 'Urgent'].map(p => (
              <Pressable
                key={p}
                onPress={() => setPriority(p)}
                style={[styles.chip, priority === p && styles.selected]}
              >
                <Text>{p}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.primary}
            onPress={createTask}
            disabled={saving}
          >
            <Text style={styles.primaryText}>
              {saving ? 'Saving...' : 'Create Task'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.heading}>Tasks ({tasks.length})</Text>
          <Pressable onPress={() => loadTasks(true)}>
            <Text style={styles.link}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => loadTasks()}>
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.card}>
            <Text>No tasks found.</Text>
          </View>
        ) : (
          tasks.map(task => (
            <View key={task.id} style={styles.card}>
              <Text style={styles.heading}>{task.title}</Text>
              <Text style={styles.meta}>
                #{task.id} · {task.status} · {task.priority}
              </Text>

              {!!task.description && (
                <Text style={styles.detail}>{task.description}</Text>
              )}
              {!!task.location && (
                <Text style={styles.meta}>Location: {task.location}</Text>
              )}
              {!!task.assigned_to && (
                <Text style={styles.meta}>Assigned to: {task.assigned_to}</Text>
              )}

              <View style={styles.row}>
                {task.status === 'Pending' && (
                  <Pressable
                    style={styles.smallButton}
                    onPress={() => updateStatus(task, 'In Progress')}
                  >
                    <Text style={styles.buttonText}>Start</Text>
                  </Pressable>
                )}

                {task.status !== 'Completed' && (
                  <Pressable
                    style={styles.smallButton}
                    onPress={() => updateStatus(task, 'Completed')}
                  >
                    <Text style={styles.buttonText}>Complete</Text>
                  </Pressable>
                )}

                {task.status !== 'Pending' && (
                  <Pressable
                    style={styles.chip}
                    onPress={() => updateStatus(task, 'Pending')}
                  >
                    <Text>Reset</Text>
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
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 16, marginTop: 16, elevation: 2,
  },
  heading: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 9,
    padding: 12, marginTop: 10, color: '#111827',
  },
  label: { marginTop: 12, fontWeight: '600', color: '#374151' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  rowBetween: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 24,
  },
  chip: {
    borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  selected: { backgroundColor: '#DBEAFE', borderColor: '#2563EB' },
  primary: {
    backgroundColor: '#2563EB', padding: 14,
    borderRadius: 10, alignItems: 'center', marginTop: 16,
  },
  primaryText: { color: '#FFFFFF', fontWeight: 'bold' },
  smallButton: {
    backgroundColor: '#2563EB', padding: 10, borderRadius: 8,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  link: { color: '#2563EB', fontWeight: '600' },
  meta: { color: '#6B7280', marginTop: 7, fontSize: 13 },
  detail: { color: '#374151', marginTop: 8, lineHeight: 20 },
  error: { color: '#B91C1C', marginBottom: 8 },
  loader: { marginTop: 24 },
});