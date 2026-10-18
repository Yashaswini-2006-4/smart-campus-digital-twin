import React, { useCallback, useEffect, useState } from 'react';

import {

  ActivityIndicator,

  Alert,

  Platform,

  Modal,

  Pressable,

  RefreshControl,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  View,

} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { router } from 'expo-router';

import { NODE_API_URL } from '../constants/api';

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

  description?: string;

  head?: string;

  building:

    | string

    | {

        _id: string;

        name: string;

        code: string;

        location?: string;

      };

};

export default function DepartmentsScreen() {

  const [departments, setDepartments] = useState<Department[]>([]);

  const [buildings, setBuildings] = useState<Building[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  const [role, setRole] = useState('');

  const [modalVisible, setModalVisible] = useState(false);

  const [editingDepartment, setEditingDepartment] =

    useState<Department | null>(null);

  const [name, setName] = useState('');

  const [code, setCode] = useState('');

  const [description, setDescription] = useState('');

  const [head, setHead] = useState('');

  const [selectedBuilding, setSelectedBuilding] = useState('');

  const [saving, setSaving] = useState(false);

  const isAdmin = role === 'admin';

  const getToken = async () => {

    return await AsyncStorage.getItem('token');

  };

  const loadData = useCallback(async () => {

    try {

      setError('');

      const token = await getToken();

      if (!token) {

        router.replace('/login');

        return;

      }

      const headers = {

        Authorization: `Bearer ${token}`,

      };

      const [departmentResponse, buildingResponse] = await Promise.all([

        fetch(`${NODE_API_URL}/api/departments`, {

          headers,

        }),

        fetch(`${NODE_API_URL}/api/buildings`, {

          headers,

        }),

      ]);

      const departmentData = await departmentResponse.json();

      const buildingData = await buildingResponse.json();

      if (!departmentResponse.ok) {

        throw new Error(

          departmentData.message || 'Failed to load departments',

        );

      }

      if (!buildingResponse.ok) {

        throw new Error(

          buildingData.message || 'Failed to load buildings',

        );

      }

      setDepartments(departmentData.departments || []);

      setBuildings(buildingData.buildings || []);

    } catch (err) {

      console.error('Department loading error:', err);

      setError(

        err instanceof Error

          ? err.message

          : 'Unable to connect to the backend.',

      );

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  }, []);

  useEffect(() => {

    const initialize = async () => {

      const storedRole = await AsyncStorage.getItem('userRole');

      if (storedRole) {

        setRole(storedRole);

      }

      await loadData();

    };

    initialize();

  }, [loadData]);

  const onRefresh = () => {

    setRefreshing(true);

    loadData();

  };

  const openAddModal = () => {

    setEditingDepartment(null);

    setName('');

    setCode('');

    setDescription('');

    setHead('');

    setSelectedBuilding('');

    setModalVisible(true);

  };

  const openEditModal = (department: Department) => {

    setEditingDepartment(department);

    setName(department.name);

    setCode(department.code);

    setDescription(department.description || '');

    setHead(department.head || '');

    if (typeof department.building === 'object') {

      setSelectedBuilding(department.building._id);

    } else {

      setSelectedBuilding(department.building);

    }

    setModalVisible(true);

  };

  const closeModal = () => {

    if (!saving) {

      setModalVisible(false);

    }

  };

  const saveDepartment = async () => {

    if (!name.trim() || !code.trim() || !selectedBuilding) {

      Alert.alert(

        'Missing Information',

        'Name, code and building are required.',

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

      const body = {

        name: name.trim(),

        code: code.trim().toUpperCase(),

        description: description.trim(),

        building: selectedBuilding,

        head: head.trim(),

      };

      const url = editingDepartment

        ? `${NODE_API_URL}/api/departments/${editingDepartment._id}`

        : `${NODE_API_URL}/api/departments`;

      const response = await fetch(url, {

        method: editingDepartment ? 'PUT' : 'POST',

        headers: {

          'Content-Type': 'application/json',

          Authorization: `Bearer ${token}`,

        },

        body: JSON.stringify(body),

      });

      const data = await response.json();

      if (!response.ok) {

        throw new Error(

          data.message || 'Unable to save department',

        );

      }

      setModalVisible(false);

      Alert.alert(

        'Success',

        editingDepartment

          ? 'Department updated successfully.'

          : 'Department created successfully.',

      );

      await loadData();

    } catch (err) {

      Alert.alert(

        'Error',

        err instanceof Error

          ? err.message

          : 'Unable to save department.',

      );

    } finally {

      setSaving(false);

    }

  };

  const deleteDepartment = (department: Department) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${department.name}"?`,
      );

      if (confirmed) {
        confirmDeleteDepartment(department);
      }

      return;
    }

    Alert.alert(
      'Delete Department',
      `Are you sure you want to delete "${department.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteDepartment(department),
        },
      ],
    );
  };

  const confirmDeleteDepartment = async (department: Department) => {
    try {
      const token = await getToken();

      if (!token) {
        Alert.alert(
          'Session Expired',
          'Please log in again.',
        );

        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${NODE_API_URL}/api/departments/${department._id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to delete department',
        );
      }

      await loadData();

      Alert.alert(
        'Deleted',
        'Department deleted successfully.',
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error
          ? err.message
          : 'Unable to delete department.',
      );
    }
  };

  return (

    <View style={styles.container}>

      <ScrollView

        contentContainerStyle={styles.content}

        refreshControl={

          <RefreshControl

            refreshing={refreshing}

            onRefresh={onRefresh}

          />

        }

      >

        <Pressable onPress={() => router.back()}>

          <Text style={styles.back}>‹ Back</Text>

        </Pressable>

        <View style={styles.headerRow}>

          <View style={styles.headerText}>

            <Text style={styles.title}>Campus Departments</Text>

            <Text style={styles.subtitle}>

              Departments connected to campus buildings

            </Text>

          </View>

          <View style={styles.countBox}>

            <Text style={styles.count}>{departments.length}</Text>

            <Text style={styles.countLabel}>Departments</Text>

          </View>

        </View>

        {isAdmin && (

          <Pressable

            style={styles.addButton}

            onPress={openAddModal}

          >

            <Text style={styles.addButtonText}>

              + Add Department

            </Text>

          </Pressable>

        )}

        {loading ? (

          <ActivityIndicator

            size="large"

            color="#2563EB"

            style={styles.loader}

          />

        ) : error ? (

          <View style={styles.errorCard}>

            <Text style={styles.errorTitle}>

              Unable to load departments

            </Text>

            <Text style={styles.errorText}>{error}</Text>

            <Pressable

              style={styles.retryButton}

              onPress={loadData}

            >

              <Text style={styles.retryText}>Try Again</Text>

            </Pressable>

          </View>

        ) : departments.length === 0 ? (

          <View style={styles.emptyCard}>

            <Text style={styles.emptyIcon}>🏛️</Text>

            <Text style={styles.emptyTitle}>

              No Departments Found

            </Text>

            <Text style={styles.emptyText}>

              No departments are currently available in the

              campus database.

            </Text>

            {isAdmin && (

              <Pressable

                style={styles.emptyButton}

                onPress={openAddModal}

              >

                <Text style={styles.emptyButtonText}>

                  Add First Department

                </Text>

              </Pressable>

            )}

          </View>

        ) : (

          departments.map((department) => {

            const building =

              typeof department.building === 'object'

                ? department.building

                : null;

            return (

              <View

                key={department._id}

                style={styles.card}

              >

                <View style={styles.cardTop}>

                  <View style={styles.iconBox}>

                    <Text style={styles.icon}>🏛️</Text>

                  </View>

                  <View style={styles.departmentInfo}>

                    <Text style={styles.departmentName}>

                      {department.name}

                    </Text>

                    <Text style={styles.departmentCode}>

                      Code: {department.code}

                    </Text>

                  </View>

                </View>

                {department.description ? (

                  <Text style={styles.description}>

                    {department.description}

                  </Text>

                ) : null}

                <View style={styles.detailsRow}>

                  <View style={styles.detail}>

                    <Text style={styles.detailLabel}>

                      🏢 Building

                    </Text>

                    <Text style={styles.detailValue}>

                      {building

                        ? `${building.name} (${building.code})`

                        : 'Not available'}

                    </Text>

                  </View>

                  <View style={styles.detail}>

                    <Text style={styles.detailLabel}>

                      👤 Department Head

                    </Text>

                    <Text style={styles.detailValue}>

                      {department.head || 'Not assigned'}

                    </Text>

                  </View>

                </View>

                {isAdmin && (

                  <View style={styles.actions}>

                    <Pressable

                      style={styles.editButton}

                      onPress={() =>

                        openEditModal(department)

                      }

                    >

                      <Text style={styles.editText}>

                        Edit

                      </Text>

                    </Pressable>

                    <Pressable

                      style={styles.deleteButton}

                      onPress={() =>

                        deleteDepartment(department)

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

          <View style={styles.modal}>

            <ScrollView>

              <View style={styles.modalHeader}>

                <Text style={styles.modalTitle}>

                  {editingDepartment

                    ? 'Edit Department'

                    : 'Add Department'}

                </Text>

                <Pressable onPress={closeModal}>

                  <Text style={styles.closeButton}>✕</Text>

                </Pressable>

              </View>

              <Text style={styles.formLabel}>

                Department Name \*

              </Text>

              <TextInput

                style={styles.input}

                placeholder="e.g. Computer Science and Engineering"

                value={name}

                onChangeText={setName}

              />

              <Text style={styles.formLabel}>

                Department Code \*

              </Text>

              <TextInput

                style={styles.input}

                placeholder="e.g. CSE"

                value={code}

                onChangeText={setCode}

                autoCapitalize="characters"

              />

              <Text style={styles.formLabel}>

                Description

              </Text>

              <TextInput

                style={[

                  styles.input,

                  styles.textArea,

                ]}

                placeholder="Enter department description"

                value={description}

                onChangeText={setDescription}

                multiline

              />

              <Text style={styles.formLabel}>

                Building \*

              </Text>

              {buildings.length === 0 ? (

                <View style={styles.noBuildingBox}>

                  <Text style={styles.noBuildingText}>

                    No buildings available. Add a building

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

                        selectedBuilding === building._id &&

                          styles.buildingOptionSelected,

                      ]}

                      onPress={() =>

                        setSelectedBuilding(building._id)

                      }

                    >

                      <Text

                        style={[

                          styles.buildingOptionName,

                          selectedBuilding ===

                            building._id &&

                            styles.buildingOptionNameSelected,

                        ]}

                      >

                        {building.name}

                      </Text>

                      <Text

                        style={[

                          styles.buildingOptionCode,

                          selectedBuilding ===

                            building._id &&

                            styles.buildingOptionCodeSelected,

                        ]}

                      >

                        {building.code}

                      </Text>

                    </Pressable>

                  ))}

                </View>

              )}

              <Text style={styles.formLabel}>

                Department Head

              </Text>

              <TextInput

                style={styles.input}

                placeholder="e.g. Dr. John Doe"

                value={head}

                onChangeText={setHead}

              />

              <Pressable

                style={[

                  styles.saveButton,

                  saving && styles.disabledButton,

                ]}

                onPress={saveDepartment}

                disabled={saving}

              >

                {saving ? (

                  <ActivityIndicator color="#FFFFFF" />

                ) : (

                  <Text style={styles.saveButtonText}>

                    {editingDepartment

                      ? 'Update Department'

                      : 'Create Department'}

                  </Text>

                )}

              </Pressable>

            </ScrollView>

          </View>

        </View>

      </Modal>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#F5F7FB',

  },

  content: {

    padding: 24,

    paddingBottom: 50,

  },

  back: {

    color: '#2563EB',

    fontSize: 16,

    marginBottom: 20,

  },

  headerRow: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'flex-start',

    marginBottom: 20,

  },

  headerText: {

    flex: 1,

    paddingRight: 20,

  },

  title: {

    fontSize: 30,

    fontWeight: 'bold',

    color: '#111827',

  },

  subtitle: {

    fontSize: 15,

    color: '#6B7280',

    marginTop: 8,

  },

  countBox: {

    backgroundColor: '#DBEAFE',

    borderRadius: 14,

    paddingVertical: 12,

    paddingHorizontal: 18,

    alignItems: 'center',

  },

  count: {

    fontSize: 24,

    fontWeight: 'bold',

    color: '#2563EB',

  },

  countLabel: {

    fontSize: 12,

    color: '#2563EB',

    marginTop: 2,

  },

  addButton: {

    backgroundColor: '#2563EB',

    borderRadius: 10,

    paddingVertical: 13,

    paddingHorizontal: 18,

    alignSelf: 'flex-start',

    marginBottom: 16,

  },

  addButtonText: {

    color: '#FFFFFF',

    fontWeight: '700',

    fontSize: 15,

  },

  loader: {

    marginTop: 40,

  },

  errorCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 16,

    padding: 24,

    marginTop: 10,

  },

  errorTitle: {

    color: '#B91C1C',

    fontSize: 18,

    fontWeight: 'bold',

  },

  errorText: {

    color: '#6B7280',

    marginTop: 8,

  },

  retryButton: {

    backgroundColor: '#2563EB',

    borderRadius: 8,

    padding: 12,

    alignSelf: 'flex-start',

    marginTop: 16,

  },

  retryText: {

    color: '#FFFFFF',

    fontWeight: '600',

  },

  emptyCard: {

    backgroundColor: '#FFFFFF',

    borderRadius: 16,

    padding: 50,

    alignItems: 'center',

    marginTop: 10,

  },

  emptyIcon: {

    fontSize: 48,

    marginBottom: 14,

  },

  emptyTitle: {

    fontSize: 21,

    fontWeight: 'bold',

    color: '#111827',

  },

  emptyText: {

    color: '#6B7280',

    textAlign: 'center',

    marginTop: 8,

    maxWidth: 500,

    lineHeight: 21,

  },

  emptyButton: {

    backgroundColor: '#2563EB',

    paddingVertical: 12,

    paddingHorizontal: 18,

    borderRadius: 9,

    marginTop: 18,

  },

  emptyButtonText: {

    color: '#FFFFFF',

    fontWeight: '700',

  },

  card: {

    backgroundColor: '#FFFFFF',

    borderRadius: 16,

    padding: 20,

    marginTop: 16,

    elevation: 2,

  },

  cardTop: {

    flexDirection: 'row',

    alignItems: 'center',

  },

  iconBox: {

    width: 56,

    height: 56,

    borderRadius: 14,

    backgroundColor: '#DBEAFE',

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 15,

  },

  icon: {

    fontSize: 28,

  },

  departmentInfo: {

    flex: 1,

  },

  departmentName: {

    fontSize: 20,

    fontWeight: 'bold',

    color: '#111827',

  },

  departmentCode: {

    color: '#6B7280',

    marginTop: 5,

  },

  description: {

    color: '#374151',

    marginTop: 16,

    lineHeight: 21,

  },

  detailsRow: {

    borderTopWidth: 1,

    borderTopColor: '#E5E7EB',

    marginTop: 18,

    paddingTop: 16,

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 30,

  },

  detail: {

    minWidth: 220,

    flex: 1,

  },

  detailLabel: {

    color: '#6B7280',

    fontSize: 13,

    marginBottom: 5,

  },

  detailValue: {

    color: '#111827',

    fontWeight: '600',

  },

  actions: {

    borderTopWidth: 1,

    borderTopColor: '#E5E7EB',

    marginTop: 18,

    paddingTop: 14,

    flexDirection: 'row',

    gap: 10,

  },

  editButton: {

    borderWidth: 1,

    borderColor: '#2563EB',

    borderRadius: 8,

    paddingVertical: 9,

    paddingHorizontal: 18,

  },

  editText: {

    color: '#2563EB',

    fontWeight: '700',

  },

  deleteButton: {

    borderWidth: 1,

    borderColor: '#DC2626',

    borderRadius: 8,

    paddingVertical: 9,

    paddingHorizontal: 18,

  },

  deleteText: {

    color: '#DC2626',

    fontWeight: '700',

  },

  modalOverlay: {

    flex: 1,

    backgroundColor: 'rgba(0,0,0,0.45)',

    justifyContent: 'center',

    padding: 20,

  },

  modal: {

    backgroundColor: '#FFFFFF',

    borderRadius: 18,

    maxHeight: '90%',

    padding: 22,

  },

  modalHeader: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    marginBottom: 20,

  },

  modalTitle: {

    fontSize: 22,

    fontWeight: 'bold',

    color: '#111827',

  },

  closeButton: {

    fontSize: 20,

    color: '#6B7280',

  },

  formLabel: {

    fontSize: 14,

    fontWeight: '700',

    color: '#374151',

    marginBottom: 7,

    marginTop: 12,

  },

  input: {

    borderWidth: 1,

    borderColor: '#D1D5DB',

    borderRadius: 9,

    height: 48,

    paddingHorizontal: 13,

    color: '#111827',

    backgroundColor: '#FFFFFF',

  },

  textArea: {

    height: 90,

    paddingTop: 12,

    textAlignVertical: 'top',

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

  saveButtonText: {

    color: '#FFFFFF',

    fontSize: 16,

    fontWeight: '700',

  },

  disabledButton: {

    opacity: 0.7,

  },

});