import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
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

type ApiResponse = {
  detail?: unknown;
  tasks?: Task[];
};

function errorMessage(data: ApiResponse, fallback: string) {
  if (typeof data.detail === 'string') return data.detail;
  return fallback;
}

async function parseResponse(
  response: Response,
): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return {};
  }
}

export default function MaintenanceTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] =
    useState<number | null>(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeIsError, setNoticeIsError] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('Medium');

  const showNotice = (message: string, isError = false) => {
    setNotice(message);
    setNoticeIsError(isError);
  };

  const loadTasks = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/maintenance/tasks`,
      );
      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          errorMessage(data, 'Failed to load maintenance tasks.'),
        );
      }

      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not connect to the maintenance backend.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const createTask = async () => {
    setNotice('');

    if (title.trim().length < 2) {
      showNotice(
        'Enter a task title with at least 2 characters.',
        true,
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/maintenance/tasks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            assigned_to: assignedTo.trim(),
            priority,
          }),
        },
      );

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          errorMessage(data, 'Task creation failed.'),
        );
      }

      setTitle('');
      setDescription('');
      setLocation('');
      setAssignedTo('');
      setPriority('Medium');

      await loadTasks(true);
      showNotice('Task created successfully.');
    } catch (e) {
      showNotice(
        e instanceof Error
          ? e.message
          : 'Could not create the task.',
        true,
      );
    } finally {
      setSaving(false);
    }
  };

  // Update the task directly. No Alert.alert confirmation is used,
  // because its callback pattern is unreliable in Expo Web.
  const updateStatus = async (
    task: Task,
    status: 'In Progress' | 'Completed' | 'Pending',
  ) => {
    if (updatingTaskId !== null) return;

    setUpdatingTaskId(task.id);
    setNotice('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/maintenance/tasks/${task.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        },
      );

      const data = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          errorMessage(data, 'Task status update failed.'),
        );
      }

      await loadTasks(true);

      showNotice(`Task #${task.id} updated to ${status}.`);
    } catch (e) {
      showNotice(
        e instanceof Error
          ? `Update failed: ${e.message}`
          : 'Could not update the task status.',
        true,
      );
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <RoleGuard allowedRole="maintenance">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadTasks(true)}
          />
        }
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.back}>
            ‹ Back to Dashboard
          </Text>
        </Pressable>

        <Text style={styles.title}>Maintenance Tasks</Text>

        <Text style={styles.subtitle}>
          Create, assign, and track maintenance work.
        </Text>

        {!!notice && (
          <View
            style={[
              styles.notice,
              noticeIsError
                ? styles.noticeError
                : styles.noticeSuccess,
            ]}
          >
            <Text
              style={
                noticeIsError
                  ? styles.noticeErrorText
                  : styles.noticeSuccessText
              }
            >
              {notice}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.heading}>Create Task</Text>

          <TextInput
            style={styles.input}
            placeholder="Task title *"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.input, styles.multiline]}
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
            {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
              <Pressable
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.chip,
                  priority === p && styles.selected,
                ]}
              >
                <Text style={styles.chipText}>{p}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[
              styles.primary,
              saving && styles.disabledButton,
            ]}
            onPress={() => void createTask()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>
                Create Task
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.heading}>
            Tasks ({tasks.length})
          </Text>

          <Pressable onPress={() => void loadTasks(true)}>
            <Text style={styles.link}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>

            <Pressable onPress={() => void loadTasks()}>
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.card}>
            <Text>No tasks found.</Text>
          </View>
        ) : (
          tasks.map((task) => {
            const updating = updatingTaskId === task.id;
            const anyUpdateRunning = updatingTaskId !== null;

            return (
              <View key={task.id} style={styles.card}>
                <Text style={styles.heading}>
                  {task.title}
                </Text>

                <Text style={styles.meta}>
                  #{task.id} · {task.status} · {task.priority}
                </Text>

                {!!task.description && (
                  <Text style={styles.detail}>
                    {task.description}
                  </Text>
                )}

                {!!task.location && (
                  <Text style={styles.meta}>
                    Location: {task.location}
                  </Text>
                )}

                {!!task.assigned_to && (
                  <Text style={styles.meta}>
                    Assigned to: {task.assigned_to}
                  </Text>
                )}

                <View style={styles.row}>
                  {task.status === 'Pending' && (
                    <Pressable
                      style={[
                        styles.smallButton,
                        anyUpdateRunning &&
                          styles.disabledButton,
                      ]}
                      disabled={anyUpdateRunning}
                      onPress={() =>
                        void updateStatus(task, 'In Progress')
                      }
                    >
                      <Text style={styles.buttonText}>
                        {updating ? 'Updating...' : 'Start'}
                      </Text>
                    </Pressable>
                  )}

                  {task.status !== 'Completed' && (
                    <Pressable
                      style={[
                        styles.smallButton,
                        anyUpdateRunning &&
                          styles.disabledButton,
                      ]}
                      disabled={anyUpdateRunning}
                      onPress={() =>
                        void updateStatus(task, 'Completed')
                      }
                    >
                      <Text style={styles.buttonText}>
                        {updating ? 'Updating...' : 'Complete'}
                      </Text>
                    </Pressable>
                  )}

                  {task.status !== 'Pending' && (
                    <Pressable
                      style={[
                        styles.chip,
                        anyUpdateRunning &&
                          styles.disabledButton,
                      ]}
                      disabled={anyUpdateRunning}
                      onPress={() =>
                        void updateStatus(task, 'Pending')
                      }
                    >
                      <Text style={styles.chipText}>Reset</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  back: {
    color: '#2563EB',
    fontSize: 15,
    marginBottom: 16,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 21,
  },
  notice: {
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  noticeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  noticeError: {
    backgroundColor: '#FEE2E2',
  },
  noticeSuccessText: {
    color: '#166534',
  },
  noticeErrorText: {
    color: '#991B1B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    elevation: 2,
  },
  heading: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 9,
    padding: 12,
    marginTop: 10,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  label: {
    marginTop: 12,
    fontWeight: '600',
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: '#111827',
  },
  selected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  primary: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  smallButton: {
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  link: {
    color: '#2563EB',
    fontWeight: '600',
  },
  meta: {
    color: '#6B7280',
    marginTop: 7,
    fontSize: 13,
  },
  detail: {
    color: '#374151',
    marginTop: 8,
    lineHeight: 20,
  },
  error: {
    color: '#B91C1C',
    marginBottom: 8,
  },
  loader: {
    marginTop: 24,
  },
});