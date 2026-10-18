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

type FacilityStatus = 'available' | 'maintenance' | 'closed';

type Building = {
  _id: string;
  name: string;
  code: string;
  location?: string;
};

type Facility = {
  _id: string;
  name: string;
  type: string;
  description?: string;
  building:
    | string
    | {
        _id: string;
        name: string;
        code: string;
        location?: string;
      };
  location?: string;
  status: FacilityStatus;
  operatingHours?: string;
  createdAt?: string;
  updatedAt?: string;
};

type FormData = {
  name: string;
  type: string;
  description: string;
  building: string;
  location: string;
  status: FacilityStatus;
  operatingHours: string;
};

const emptyForm: FormData = {
  name: '',
  type: 'cafeteria',
  description: '',
  building: '',
  location: '',
  status: 'available',
  operatingHours: '',
};

const statusOptions: FacilityStatus[] = [
  'available',
  'maintenance',
  'closed',
];

export default function FacilitiesScreen() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [userRole, setUserRole] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFacility, setEditingFacility] =
    useState<Facility | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const isAdmin = userRole === 'admin';

  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const token = await getToken();
      const role = await AsyncStorage.getItem('userRole');

      setUserRole(role || '');

      if (!token) {
        router.replace('/login');
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [facilityResponse, buildingResponse] =
        await Promise.all([
          fetch(`${NODE_API_URL}/api/facilities`, {
            method: 'GET',
            headers,
          }),
          fetch(`${NODE_API_URL}/api/buildings`, {
            method: 'GET',
            headers,
          }),
        ]);

      const facilityData = await facilityResponse.json();
      const buildingData = await buildingResponse.json();

      if (!facilityResponse.ok) {
        if (facilityResponse.status === 401) {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('userRole');

          router.replace('/login');
          return;
        }

        throw new Error(
          facilityData.message || 'Failed to load facilities',
        );
      }

      if (!buildingResponse.ok) {
        throw new Error(
          buildingData.message || 'Failed to load buildings',
        );
      }

      setFacilities(facilityData.facilities || []);
      setBuildings(buildingData.buildings || []);
    } catch (e) {
      console.error('Facilities loading error:', e);

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
    loadData();
  }, [loadData]);

  const getBuilding = (facility: Facility) => {
    return typeof facility.building === 'object'
      ? facility.building
      : null;
  };

  const getStatusText = (status: FacilityStatus) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'maintenance':
        return 'Maintenance';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  };

  const getStatusStyle = (status: FacilityStatus) => {
    switch (status) {
      case 'available':
        return styles.availableStatus;
      case 'maintenance':
        return styles.maintenanceStatus;
      case 'closed':
        return styles.closedStatus;
      default:
        return styles.availableStatus;
    }
  };

  const getTypeIcon = (type: string) => {
    const value = type.toLowerCase();

    if (value.includes('cafeteria') || value.includes('canteen')) {
      return '🍽️';
    }

    if (value.includes('library')) {
      return '📚';
    }

    if (value.includes('sport') || value.includes('gym')) {
      return '🏟️';
    }

    if (value.includes('parking')) {
      return '🅿️';
    }

    if (value.includes('medical') || value.includes('health')) {
      return '🏥';
    }

    if (value.includes('wifi') || value.includes('internet')) {
      return '📶';
    }

    return '🏢';
  };

  const openAddModal = () => {
    setEditingFacility(null);
    setForm({
      ...emptyForm,
      building: buildings.length > 0 ? buildings[0]._id : '',
    });
    setModalVisible(true);
  };

  const openEditModal = (facility: Facility) => {
    setEditingFacility(facility);

    const buildingId =
      typeof facility.building === 'object'
        ? facility.building._id
        : facility.building;

    setForm({
      name: facility.name || '',
      type: facility.type || 'other',
      description: facility.description || '',
      building: buildingId || '',
      location: facility.location || '',
      status: facility.status || 'available',
      operatingHours: facility.operatingHours || '',
    });

    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
    setEditingFacility(null);
    setForm(emptyForm);
  };

  const saveFacility = async () => {
    if (!form.name.trim()) {
      Alert.alert(
        'Missing Information',
        'Facility name is required.',
      );
      return;
    }

    if (!form.type.trim()) {
      Alert.alert(
        'Missing Information',
        'Facility type is required.',
      );
      return;
    }

    if (!form.building) {
      Alert.alert(
        'Missing Information',
        'Please select a building.',
      );
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      if (!token) {
        router.replace('/login');
        return;
      }

      const payload = {
        name: form.name.trim(),
        type: form.type.trim().toLowerCase(),
        description: form.description.trim(),
        building: form.building,
        location: form.location.trim(),
        status: form.status,
        operatingHours: form.operatingHours.trim(),
      };

      const url = editingFacility
        ? `${NODE_API_URL}/api/facilities/${editingFacility._id}`
        : `${NODE_API_URL}/api/facilities`;

      const response = await fetch(url, {
        method: editingFacility ? 'PUT' : 'POST',
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
          await AsyncStorage.removeItem('userRole');

          throw new Error(
            'Your session has expired. Please log in again.',
          );
        }

        throw new Error(
          data.message ||
            `Failed to ${
              editingFacility ? 'update' : 'create'
            } facility`,
        );
      }

      setModalVisible(false);
      setEditingFacility(null);
      setForm(emptyForm);

      await loadData();

      Alert.alert(
        'Success',
        editingFacility
          ? 'Facility updated successfully.'
          : 'Facility created successfully.',
      );
    } catch (e) {
      console.error('Save facility error:', e);

      Alert.alert(
        'Unable to Save',
        e instanceof Error
          ? e.message
          : 'Something went wrong while saving the facility.',
      );
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (facility: Facility) => {
    try {
      const token = await getToken();

      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${NODE_API_URL}/api/facilities/${facility._id}`,
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
        if (response.status === 401) {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('userRole');

          throw new Error(
            'Your session has expired. Please log in again.',
          );
        }

        throw new Error(
          data.message || 'Failed to delete facility',
        );
      }

      await loadData();

      Alert.alert(
        'Deleted',
        'Facility deleted successfully.',
      );
    } catch (e) {
      console.error('Delete facility error:', e);

      Alert.alert(
        'Unable to Delete',
        e instanceof Error
          ? e.message
          : 'Something went wrong while deleting the facility.',
      );
    }
  };

  const deleteFacility = (facility: Facility) => {
    const message = `Are you sure you want to delete "${facility.name}"?`;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);

      if (confirmed) {
        performDelete(facility);
      }

      return;
    }

    Alert.alert(
      'Delete Facility',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(facility),
        },
      ],
    );
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
          />
        }
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Campus Facilities</Text>

            <Text style={styles.subtitle}>
              Services and facilities available across the campus
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countNumber}>
              {facilities.length}
            </Text>

            <Text style={styles.countLabel}>Facilities</Text>
          </View>
        </View>

        {isAdmin && (
          <Pressable
            style={styles.addButton}
            onPress={openAddModal}
          >
            <Text style={styles.addButtonText}>
              + Add Facility
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
              Loading facilities...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Unable to load facilities
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => loadData()}
            >
              <Text style={styles.retryButtonText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : facilities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏢</Text>

            <Text style={styles.emptyTitle}>
              No Facilities Yet
            </Text>

            <Text style={styles.emptyText}>
              {isAdmin
                ? 'Add your first campus facility.'
                : 'No campus facilities have been added yet.'}
            </Text>
          </View>
        ) : (
          facilities.map((facility) => {
            const building = getBuilding(facility);

            return (
              <View
                key={facility._id}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconBox}>
                    <Text style={styles.icon}>
                      {getTypeIcon(facility.type)}
                    </Text>
                  </View>

                  <View style={styles.cardHeaderText}>
                    <Text style={styles.facilityName}>
                      {facility.name}
                    </Text>

                    <Text style={styles.facilityType}>
                      {facility.type || 'Other'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(facility.status),
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusText(facility.status)}
                    </Text>
                  </View>
                </View>

                {facility.description ? (
                  <Text style={styles.description}>
                    {facility.description}
                  </Text>
                ) : null}

                <View style={styles.details}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>
                      🏢
                    </Text>

                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>
                        Building
                      </Text>

                      <Text style={styles.detailValue}>
                        {building
                          ? building.name
                          : 'Not available'}
                      </Text>

                      {building?.code ? (
                        <Text style={styles.detailSecondary}>
                          {building.code}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>
                      📍
                    </Text>

                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>
                        Location
                      </Text>

                      <Text style={styles.detailValue}>
                        {facility.location ||
                          'Not specified'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>
                      🕐
                    </Text>

                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>
                        Operating Hours
                      </Text>

                      <Text style={styles.detailValue}>
                        {facility.operatingHours ||
                          'Not specified'}
                      </Text>
                    </View>
                  </View>
                </View>

                {isAdmin && (
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() =>
                        openEditModal(facility)
                      }
                    >
                      <Text style={styles.editText}>
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteButton}
                      onPress={() =>
                        deleteFacility(facility)
                      }
                    >
                      <Text style={styles.deleteText}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFacility
                  ? 'Edit Facility'
                  : 'Add Facility'}
              </Text>

              <Pressable
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.closeButton}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.label}>
                Facility Name *
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Campus Cafeteria"
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
                Facility Type *
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. cafeteria, library, gym"
                placeholderTextColor="#9CA3AF"
                value={form.type}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    type: value,
                  }))
                }
                autoCapitalize="none"
              />

              <Text style={styles.helperText}>
                Use a simple type such as cafeteria, library,
                parking, sports, medical, or other.
              </Text>

              <Text style={styles.label}>
                Building *
              </Text>

              {buildings.length === 0 ? (
                <View style={styles.noBuildingBox}>
                  <Text style={styles.noBuildingText}>
                    No buildings are available. Add a building
                    first.
                  </Text>
                </View>
              ) : (
                <View style={styles.buildingOptions}>
                  {buildings.map((building) => (
                    <Pressable
                      key={building._id}
                      style={[
                        styles.buildingOption,
                        form.building === building._id &&
                          styles.buildingOptionSelected,
                      ]}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          building: building._id,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.buildingOptionName,
                          form.building === building._id &&
                            styles.buildingOptionNameSelected,
                        ]}
                      >
                        {building.name}
                      </Text>

                      <Text
                        style={[
                          styles.buildingOptionCode,
                          form.building === building._id &&
                            styles.buildingOptionCodeSelected,
                        ]}
                      >
                        {building.code}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={styles.label}>
                Location
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Engineering Block - Ground Floor"
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
                Operating Hours
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. 8:00 AM - 6:00 PM"
                placeholderTextColor="#9CA3AF"
                value={form.operatingHours}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    operatingHours: value,
                  }))
                }
              />

              <Text style={styles.label}>
                Description
              </Text>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe this facility"
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
              />

              <Text style={styles.label}>
                Status
              </Text>

              <View style={styles.statusOptions}>
                {statusOptions.map((status) => (
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
                  saving && styles.disabledButton,
                ]}
                onPress={saveFacility}
                disabled={saving || buildings.length === 0}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingFacility
                      ? 'Update Facility'
                      : 'Create Facility'}
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
    lineHeight: 20,
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

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  icon: {
    fontSize: 24,
  },

  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 10,
  },

  facilityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },

  facilityType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textTransform: 'capitalize',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  availableStatus: {
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
    alignItems: 'flex-start',
    minWidth: 190,
    flex: 1,
  },

  detailIcon: {
    fontSize: 18,
    marginRight: 9,
  },

  detailContent: {
    flex: 1,
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

  detailSecondary: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  actions: {
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
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 26,
  },

  editText: {
    color: '#2563EB',
    fontWeight: '700',
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 26,
  },

  deleteText: {
    color: '#DC2626',
    fontWeight: '700',
  },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
    marginTop: 18,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 35,
    alignItems: 'center',
    marginTop: 5,
    elevation: 2,
  },

  emptyIcon: {
    fontSize: 42,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
  },

  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 650,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },

  closeButton: {
    fontSize: 20,
    color: '#6B7280',
    padding: 4,
  },

  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 7,
    marginTop: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 9,
    minHeight: 48,
    paddingHorizontal: 13,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  textArea: {
    height: 95,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  helperText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },

  buildingOptions: {
    gap: 8,
  },

  buildingOption: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 9,
    padding: 12,
  },

  buildingOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },

  buildingOptionName: {
    color: '#111827',
    fontWeight: '600',
  },

  buildingOptionNameSelected: {
    color: '#1D4ED8',
  },

  buildingOptionCode: {
    color: '#6B7280',
    marginTop: 3,
    fontSize: 12,
  },

  buildingOptionCodeSelected: {
    color: '#2563EB',
  },

  noBuildingBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 9,
    padding: 12,
  },

  noBuildingText: {
    color: '#B91C1C',
    lineHeight: 19,
  },

  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  statusOption: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  statusOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },

  statusOptionText: {
    color: '#4B5563',
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  statusOptionTextSelected: {
    color: '#1D4ED8',
  },

  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 10,
  },

  disabledButton: {
    opacity: 0.55,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
});
