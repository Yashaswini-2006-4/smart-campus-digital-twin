import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NODE_API_URL } from '../constants/api';

type BuildingStatus = 'active' | 'maintenance' | 'closed';

type Building = {
  _id: string;
  name: string;
  code: string;
  description: string;
  location: string;
  floors: number;
  status: BuildingStatus;
  createdAt?: string;
  updatedAt?: string;
};

type FormData = {
  name: string;
  code: string;
  description: string;
  location: string;
  floors: string;
  status: BuildingStatus;
};

const emptyForm: FormData = {
  name: '',
  code: '',
  description: '',
  location: '',
  floors: '1',
  status: 'active',
};

export default function BuildingsScreen() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [userRole, setUserRole] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBuilding, setEditingBuilding] =
    useState<Building | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const isAdmin = userRole === 'admin';

  const loadBuildings = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const token = await AsyncStorage.getItem('token');
      const role = await AsyncStorage.getItem('userRole');

      setUserRole(role || '');

      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(`${NODE_API_URL}/api/buildings`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');

          setError('Your session has expired. Please log in again.');
          return;
        }

        throw new Error(
          data.message || 'Failed to load buildings',
        );
      }

      setBuildings(data.buildings || []);
    } catch (e) {
      console.error('Buildings fetch error:', e);

      setError(
        e instanceof Error
          ? e.message
          : 'Unable to connect to the backend.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  const getStatusStyle = (status: BuildingStatus) => {
    switch (status) {
      case 'active':
        return styles.activeStatus;

      case 'maintenance':
        return styles.maintenanceStatus;

      case 'closed':
        return styles.closedStatus;

      default:
        return styles.activeStatus;
    }
  };

  const getStatusText = (status: BuildingStatus) => {
    switch (status) {
      case 'active':
        return 'Active';

      case 'maintenance':
        return 'Maintenance';

      case 'closed':
        return 'Closed';

      default:
        return status;
    }
  };

  const openAddModal = () => {
    setEditingBuilding(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (building: Building) => {
    setEditingBuilding(building);

    setForm({
      name: building.name,
      code: building.code,
      description: building.description || '',
      location: building.location || '',
      floors: String(building.floors || 1),
      status: building.status,
    });

    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
    setEditingBuilding(null);
    setForm(emptyForm);
  };

  const saveBuilding = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      Alert.alert(
        'Missing Information',
        'Building name and code are required.',
      );
      return;
    }

    const floors = Number(form.floors);

    if (!Number.isInteger(floors) || floors < 1) {
      Alert.alert(
        'Invalid Floors',
        'Floors must be a whole number greater than or equal to 1.',
      );
      return;
    }

    try {
      setSaving(true);

      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert(
          'Session Expired',
          'Please log in again.',
        );

        router.replace('/login');
        return;
      }

      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        location: form.location.trim(),
        floors,
        status: form.status,
      };

      const url = editingBuilding
        ? `${NODE_API_URL}/api/buildings/${editingBuilding._id}`
        : `${NODE_API_URL}/api/buildings`;

      const method = editingBuilding ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');

          throw new Error(
            'Your session has expired. Please log in again.',
          );
        }

        throw new Error(
          data.message ||
            `Failed to ${editingBuilding ? 'update' : 'create'} building`,
        );
      }

      setModalVisible(false);
      setEditingBuilding(null);
      setForm(emptyForm);

      await loadBuildings();

      Alert.alert(
        'Success',
        editingBuilding
          ? 'Building updated successfully.'
          : 'Building created successfully.',
      );
    } catch (e) {
      console.error('Save building error:', e);

      Alert.alert(
        'Unable to Save',
        e instanceof Error
          ? e.message
          : 'Something went wrong while saving the building.',
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteBuilding = (building: Building) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${building.name}"?`,
      );

      if (confirmed) {
        confirmDeleteBuilding(building);
      }

      return;
    }

    Alert.alert(
      'Delete Building',
      `Are you sure you want to delete "${building.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteBuilding(building),
        },
      ],
    );
  };

  const confirmDeleteBuilding = async (building: Building) => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert(
          'Session Expired',
          'Please log in again.',
        );

        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${NODE_API_URL}/api/buildings/${building._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to delete building',
        );
      }

      await loadBuildings();

      Alert.alert(
        'Deleted',
        'Building deleted successfully.',
      );
    } catch (e) {
      console.error('Delete building error:', e);

      Alert.alert(
        'Unable to Delete',
        e instanceof Error
          ? e.message
          : 'Something went wrong while deleting the building.',
      );
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBuildings(true)}
          />
        }
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Campus Buildings</Text>

            <Text style={styles.subtitle}>
              Buildings available in the Smart Campus
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countNumber}>
              {buildings.length}
            </Text>

            <Text style={styles.countLabel}>Buildings</Text>
          </View>
        </View>

        {isAdmin && (
          <Pressable
            style={styles.addButton}
            onPress={openAddModal}
          >
            <Text style={styles.addButtonText}>
              + Add Building
            </Text>
          </Pressable>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />

            <Text style={styles.loadingText}>
              Loading buildings...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Unable to load buildings
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => loadBuildings()}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </Pressable>

            {error.includes('session') && (
              <Pressable
                style={styles.loginButton}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.loginButtonText}>
                  Go to Login
                </Text>
              </Pressable>
            )}
          </View>
        ) : buildings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏢</Text>

            <Text style={styles.emptyTitle}>
              No Buildings Found
            </Text>

            <Text style={styles.emptyText}>
              No buildings are currently available in the
              campus database.
            </Text>

            {isAdmin && (
              <Pressable
                style={styles.emptyAddButton}
                onPress={openAddModal}
              >
                <Text style={styles.emptyAddButtonText}>
                  + Add First Building
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View>
            {buildings.map((building) => (
              <View
                key={building._id}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.buildingIcon}>
                    <Text style={styles.buildingIconText}>
                      🏢
                    </Text>
                  </View>

                  <View style={styles.cardHeaderText}>
                    <Text style={styles.buildingName}>
                      {building.name}
                    </Text>

                    <Text style={styles.buildingCode}>
                      Code: {building.code}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(building.status),
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusText(building.status)}
                    </Text>
                  </View>
                </View>

                {building.description ? (
                  <Text style={styles.description}>
                    {building.description}
                  </Text>
                ) : null}

                <View style={styles.details}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>
                      📍
                    </Text>

                    <View>
                      <Text style={styles.detailLabel}>
                        Location
                      </Text>

                      <Text style={styles.detailValue}>
                        {building.location ||
                          'Not specified'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>
                      🏬
                    </Text>

                    <View>
                      <Text style={styles.detailLabel}>
                        Floors
                      </Text>

                      <Text style={styles.detailValue}>
                        {building.floors}
                      </Text>
                    </View>
                  </View>
                </View>

                {isAdmin && (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() =>
                        openEditModal(building)
                      }
                    >
                      <Text style={styles.editButtonText}>
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteButton}
                      onPress={() =>
                        deleteBuilding(building)
                      }
                    >
                      <Text
                        style={styles.deleteButtonText}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingBuilding
                    ? 'Edit Building'
                    : 'Add Building'}
                </Text>

                <Pressable
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={styles.closeButton}>
                    ×
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.label}>
                Building Name *
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Engineering Block"
                placeholderTextColor="#9CA3AF"
                value={form.name}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    name: value,
                  }))
                }
              />

              <Text style={styles.label}>
                Building Code *
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. EB01"
                placeholderTextColor="#9CA3AF"
                value={form.code}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    code: value,
                  }))
                }
                autoCapitalize="characters"
              />

              <Text style={styles.label}>
                Description
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                ]}
                placeholder="Enter building description"
                placeholderTextColor="#9CA3AF"
                value={form.description}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    description: value,
                  }))
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={styles.label}>
                Location
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Hassan, Karnataka"
                placeholderTextColor="#9CA3AF"
                value={form.location}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    location: value,
                  }))
                }
              />

              <Text style={styles.label}>
                Number of Floors *
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. 3"
                placeholderTextColor="#9CA3AF"
                value={form.floors}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    floors: value.replace(/[^0-9]/g, ''),
                  }))
                }
                keyboardType="numeric"
              />

              <Text style={styles.label}>
                Status
              </Text>

              <View style={styles.statusOptions}>
                {(
                  [
                    'active',
                    'maintenance',
                    'closed',
                  ] as BuildingStatus[]
                ).map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.statusOption,
                      form.status === status &&
                        styles.statusOptionSelected,
                    ]}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        status,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        form.status === status &&
                          styles.statusOptionTextSelected,
                      ]}
                    >
                      {getStatusText(status)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[
                  styles.saveButton,
                  saving && styles.saveButtonDisabled,
                ]}
                onPress={saveBuilding}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingBuilding
                      ? 'Update Building'
                      : 'Create Building'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  content: {
    padding: 20,
    paddingBottom: 50,
  },

  back: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 15,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },

  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 7,
  },

  countBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
  },

  countNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },

  countLabel: {
    fontSize: 11,
    color: '#1D4ED8',
    marginTop: 2,
  },

  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
    marginBottom: 20,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
  },

  loadingText: {
    color: '#6B7280',
    marginTop: 12,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  buildingIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buildingIconText: {
    fontSize: 23,
  },

  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  buildingName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },

  buildingCode: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  activeStatus: {
    backgroundColor: '#DCFCE7',
  },

  maintenanceStatus: {
    backgroundColor: '#FEF3C7',
  },

  closedStatus: {
    backgroundColor: '#FEE2E2',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },

  description: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
  },

  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 150,
  },

  detailIcon: {
    fontSize: 18,
    marginRight: 9,
  },

  detailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },

  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  editButton: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 9,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },

  editButtonText: {
    color: '#2563EB',
    fontWeight: '700',
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 9,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },

  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '700',
  },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    marginTop: 10,
    alignItems: 'center',
    elevation: 2,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B91C1C',
  },

  errorText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 9,
    marginTop: 18,
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  loginButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 9,
    marginTop: 10,
  },

  loginButtonText: {
    color: '#FFFFFF',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
  },

  emptyIcon: {
    fontSize: 42,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
  },

  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  emptyAddButton: {
    backgroundColor: '#2563EB',
    borderRadius: 9,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 18,
  },

  emptyAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#111827',
  },

  closeButton: {
    fontSize: 30,
    lineHeight: 30,
    color: '#6B7280',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  textArea: {
    height: 100,
    paddingTop: 13,
    paddingBottom: 13,
  },

  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },

  statusOption: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  statusOptionSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  statusOptionText: {
    color: '#374151',
    fontWeight: '600',
  },

  statusOptionTextSelected: {
    color: '#FFFFFF',
  },

  saveButton: {
    height: 50,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelButton: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
});