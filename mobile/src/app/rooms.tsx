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

type RoomType =
  | 'classroom'
  | 'lab'
  | 'office'
  | 'seminar_hall'
  | 'auditorium'
  | 'library'
  | 'other';

type RoomStatus =
  | 'available'
  | 'occupied'
  | 'maintenance'
  | 'closed';

type Building = {
  _id: string;
  name: string;
  code: string;
  location?: string;
};

type Department = {
  _id: string;
  name: string;
  code: string;
};

type Room = {
  _id: string;
  name: string;
  roomNumber: string;
  type: RoomType;
  building: Building;
  department?: Department | null;
  capacity: number;
  floor: number;
  status: RoomStatus;
};

type FormData = {
  name: string;
  roomNumber: string;
  type: RoomType;
  building: string;
  department: string;
  capacity: string;
  floor: string;
  status: RoomStatus;
};

const emptyForm: FormData = {
  name: '',
  roomNumber: '',
  type: 'classroom',
  building: '',
  department: '',
  capacity: '0',
  floor: '1',
  status: 'available',
};

const roomTypes: { value: RoomType; label: string }[] = [
  { value: 'classroom', label: 'Classroom' },
  { value: 'lab', label: 'Laboratory' },
  { value: 'office', label: 'Office' },
  { value: 'seminar_hall', label: 'Seminar Hall' },
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'library', label: 'Library' },
  { value: 'other', label: 'Other' },
];

const roomStatuses: { value: RoomStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'closed', label: 'Closed' },
];

export default function RoomsScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [userRole, setUserRole] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const isAdmin = userRole === 'admin';

  const getToken = async () => {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      router.replace('/login');
      return null;
    }

    return token;
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

      if (!token) {
        return;
      }

      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || '');

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [roomsResponse, buildingsResponse, departmentsResponse] =
        await Promise.all([
          fetch(`${NODE_API_URL}/api/rooms`, {
            method: 'GET',
            headers,
          }),
          fetch(`${NODE_API_URL}/api/buildings`, {
            method: 'GET',
            headers,
          }),
          fetch(`${NODE_API_URL}/api/departments`, {
            method: 'GET',
            headers,
          }),
        ]);

      const roomsData = await roomsResponse.json();
      const buildingsData = await buildingsResponse.json();
      const departmentsData = await departmentsResponse.json();

      if (!roomsResponse.ok) {
        throw new Error(
          roomsData.message || 'Failed to load rooms',
        );
      }

      if (!buildingsResponse.ok) {
        throw new Error(
          buildingsData.message || 'Failed to load buildings',
        );
      }

      if (!departmentsResponse.ok) {
        throw new Error(
          departmentsData.message || 'Failed to load departments',
        );
      }

      setRooms(roomsData.rooms || []);
      setBuildings(buildingsData.buildings || []);
      setDepartments(departmentsData.departments || []);
    } catch (e) {
      console.error('Rooms fetch error:', e);

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

  const getTypeLabel = (type: RoomType) => {
    return (
      roomTypes.find((item) => item.value === type)?.label ||
      type
    );
  };

  const getStatusLabel = (status: RoomStatus) => {
    return (
      roomStatuses.find((item) => item.value === status)?.label ||
      status
    );
  };

  const getStatusStyle = (status: RoomStatus) => {
    switch (status) {
      case 'available':
        return styles.availableStatus;
      case 'occupied':
        return styles.occupiedStatus;
      case 'maintenance':
        return styles.maintenanceStatus;
      case 'closed':
        return styles.closedStatus;
      default:
        return styles.availableStatus;
    }
  };

  const openAddModal = () => {
    setEditingRoom(null);
    setForm({
      ...emptyForm,
      building: buildings[0]?._id || '',
    });
    setModalVisible(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);

    setForm({
      name: room.name,
      roomNumber: room.roomNumber,
      type: room.type,
      building:
        typeof room.building === 'object'
          ? room.building._id
          : '',
      department:
        room.department && typeof room.department === 'object'
          ? room.department._id
          : '',
      capacity: String(room.capacity ?? 0),
      floor: String(room.floor ?? 1),
      status: room.status,
    });

    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
    setEditingRoom(null);
    setForm(emptyForm);
  };

  const saveRoom = async () => {
    if (!form.name.trim() || !form.roomNumber.trim()) {
      Alert.alert(
        'Missing Information',
        'Room name and room number are required.',
      );
      return;
    }

    if (!form.building) {
      Alert.alert(
        'Building Required',
        'Please select a building.',
      );
      return;
    }

    const capacity = Number(form.capacity);
    const floor = Number(form.floor);

    if (!Number.isInteger(capacity) || capacity < 0) {
      Alert.alert(
        'Invalid Capacity',
        'Capacity must be a whole number greater than or equal to 0.',
      );
      return;
    }

    if (!Number.isInteger(floor) || floor < 0) {
      Alert.alert(
        'Invalid Floor',
        'Floor must be a whole number greater than or equal to 0.',
      );
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      if (!token) {
        return;
      }

      const payload = {
        name: form.name.trim(),
        roomNumber: form.roomNumber.trim(),
        type: form.type,
        building: form.building,
        department: form.department || null,
        capacity,
        floor,
        status: form.status,
      };

      const url = editingRoom
        ? `${NODE_API_URL}/api/rooms/${editingRoom._id}`
        : `${NODE_API_URL}/api/rooms`;

      const response = await fetch(url, {
        method: editingRoom ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Unable to ${
              editingRoom ? 'update' : 'create'
            } room`,
        );
      }

      setModalVisible(false);
      setEditingRoom(null);
      setForm(emptyForm);

      await loadData();

      Alert.alert(
        'Success',
        editingRoom
          ? 'Room updated successfully.'
          : 'Room created successfully.',
      );
    } catch (e) {
      console.error('Save room error:', e);

      Alert.alert(
        'Unable to Save',
        e instanceof Error
          ? e.message
          : 'Something went wrong while saving the room.',
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteRoom = (room: Room) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${room.name}"?`,
      );

      if (confirmed) {
        confirmDeleteRoom(room);
      }

      return;
    }

    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${room.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteRoom(room),
        },
      ],
    );
  };

  const confirmDeleteRoom = async (room: Room) => {
    try {
      const token = await getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${NODE_API_URL}/api/rooms/${room._id}`,
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
          data.message || 'Unable to delete room',
        );
      }

      await loadData();

      Alert.alert(
        'Deleted',
        'Room deleted successfully.',
      );
    } catch (e) {
      console.error('Delete room error:', e);

      Alert.alert(
        'Unable to Delete',
        e instanceof Error
          ? e.message
          : 'Something went wrong while deleting the room.',
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
            onRefresh={() => loadData(true)}
          />
        }
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Campus Rooms</Text>
            <Text style={styles.subtitle}>
              Classrooms, laboratories and other campus spaces
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countNumber}>{rooms.length}</Text>
            <Text style={styles.countLabel}>Rooms</Text>
          </View>
        </View>

        {isAdmin && (
          <Pressable
            style={styles.addButton}
            onPress={openAddModal}
          >
            <Text style={styles.addButtonText}>
              + Add Room
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
              Loading rooms...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Unable to load rooms
            </Text>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => loadData()}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : rooms.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🚪</Text>
            <Text style={styles.emptyTitle}>
              No Rooms Found
            </Text>
            <Text style={styles.emptyText}>
              No rooms are currently available in the campus
              database.
            </Text>

            {isAdmin && (
              <Pressable
                style={styles.emptyAddButton}
                onPress={openAddModal}
              >
                <Text style={styles.emptyAddButtonText}>
                  + Add First Room
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View>
            {rooms.map((room) => (
              <View key={room._id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.roomIcon}>
                    <Text style={styles.roomIconText}>
                      🚪
                    </Text>
                  </View>

                  <View style={styles.cardHeaderText}>
                    <Text style={styles.roomName}>
                      {room.name}
                    </Text>
                    <Text style={styles.roomNumber}>
                      Room No: {room.roomNumber}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(room.status),
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusLabel(room.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {getTypeLabel(room.type)}
                  </Text>
                </View>

                <View style={styles.details}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>🏢</Text>
                    <View>
                      <Text style={styles.detailLabel}>
                        Building
                      </Text>
                      <Text style={styles.detailValue}>
                        {room.building?.name ||
                          'Not specified'}
                      </Text>
                      {room.building?.code ? (
                        <Text style={styles.detailSubValue}>
                          {room.building.code}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>🏫</Text>
                    <View>
                      <Text style={styles.detailLabel}>
                        Department
                      </Text>
                      <Text style={styles.detailValue}>
                        {room.department?.name ||
                          'Not assigned'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>👥</Text>
                    <View>
                      <Text style={styles.detailLabel}>
                        Capacity
                      </Text>
                      <Text style={styles.detailValue}>
                        {room.capacity}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailIcon}>🏬</Text>
                    <View>
                      <Text style={styles.detailLabel}>
                        Floor
                      </Text>
                      <Text style={styles.detailValue}>
                        {room.floor}
                      </Text>
                    </View>
                  </View>
                </View>

                {isAdmin && (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => openEditModal(room)}
                    >
                      <Text style={styles.editButtonText}>
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => deleteRoom(room)}
                    >
                      <Text style={styles.deleteButtonText}>
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
                  {editingRoom ? 'Edit Room' : 'Add Room'}
                </Text>

                <Pressable
                  onPress={closeModal}
                  disabled={saving}
                >
                  <Text style={styles.closeButton}>×</Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Room Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CSE Lab 101"
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
                Room Number *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 101"
                placeholderTextColor="#9CA3AF"
                value={form.roomNumber}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    roomNumber: value,
                  }))
                }
              />

              <Text style={styles.label}>Room Type</Text>
              <View style={styles.optionContainer}>
                {roomTypes.map((item) => (
                  <Pressable
                    key={item.value}
                    style={[
                      styles.option,
                      form.type === item.value &&
                        styles.optionSelected,
                    ]}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        type: item.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        form.type === item.value &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Building *</Text>
              {buildings.length === 0 ? (
                <Text style={styles.warningText}>
                  No buildings available. Add a building
                  first.
                </Text>
              ) : (
                <View style={styles.optionContainer}>
                  {buildings.map((building) => (
                    <Pressable
                      key={building._id}
                      style={[
                        styles.option,
                        form.building === building._id &&
                          styles.optionSelected,
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
                          styles.optionText,
                          form.building === building._id &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {building.name} ({building.code})
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={styles.label}>
                Department (Optional)
              </Text>
              <View style={styles.optionContainer}>
                <Pressable
                  style={[
                    styles.option,
                    !form.department &&
                      styles.optionSelected,
                  ]}
                  onPress={() =>
                    setForm((current) => ({
                      ...current,
                      department: '',
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.optionText,
                      !form.department &&
                        styles.optionTextSelected,
                    ]}
                  >
                    None
                  </Text>
                </Pressable>

                {departments.map((department) => (
                  <Pressable
                    key={department._id}
                    style={[
                      styles.option,
                      form.department === department._id &&
                        styles.optionSelected,
                    ]}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        department: department._id,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        form.department === department._id &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {department.name} ({department.code})
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Capacity</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 60"
                placeholderTextColor="#9CA3AF"
                value={form.capacity}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    capacity: value.replace(/[^0-9]/g, ''),
                  }))
                }
                keyboardType="numeric"
              />

              <Text style={styles.label}>Floor</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1"
                placeholderTextColor="#9CA3AF"
                value={form.floor}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    floor: value.replace(/[^0-9]/g, ''),
                  }))
                }
                keyboardType="numeric"
              />

              <Text style={styles.label}>Status</Text>
              <View style={styles.optionContainer}>
                {roomStatuses.map((item) => (
                  <Pressable
                    key={item.value}
                    style={[
                      styles.option,
                      form.status === item.value &&
                        styles.optionSelected,
                    ]}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        status: item.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        form.status === item.value &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[
                  styles.saveButton,
                  saving && styles.saveButtonDisabled,
                ]}
                onPress={saveRoom}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingRoom
                      ? 'Update Room'
                      : 'Create Room'}
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

  headerText: {
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

  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  roomIconText: {
    fontSize: 23,
  },

  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },

  roomNumber: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 14,
  },

  typeBadgeText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  availableStatus: {
    backgroundColor: '#DCFCE7',
  },

  occupiedStatus: {
    backgroundColor: '#DBEAFE',
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
    minWidth: 170,
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

  detailSubValue: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
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
    maxWidth: 650,
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

  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  option: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 2,
  },

  optionSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  optionText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },

  optionTextSelected: {
    color: '#FFFFFF',
  },

  warningText: {
    color: '#B45309',
    backgroundColor: '#FFFBEB',
    borderRadius: 9,
    padding: 12,
    lineHeight: 19,
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
