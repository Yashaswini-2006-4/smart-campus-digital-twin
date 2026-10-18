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

type ComplaintCategory =
  | 'electrical'
  | 'plumbing'
  | 'cleanliness'
  | 'infrastructure'
  | 'internet'
  | 'security'
  | 'other';

type ComplaintStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

type ComplaintPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

type Complaint = {
  _id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  location: string;
  reportedBy:
    | string
    | {
        _id: string;
        name: string;
        email: string;
        role: string;
      };
  assignedTo:
    | null
    | string
    | {
        _id: string;
        name: string;
        email: string;
        role: string;
      };
  status: ComplaintStatus;
  priority: ComplaintPriority;
  resolutionNote?: string;
  resolvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ComplaintForm = {
  title: string;
  description: string;
  category: ComplaintCategory;
  location: string;
  priority: ComplaintPriority;
};

type UpdateForm = {
  status: ComplaintStatus;
  priority: ComplaintPriority;
  resolutionNote: string;
};

const categoryOptions: ComplaintCategory[] = [
  'electrical',
  'plumbing',
  'cleanliness',
  'infrastructure',
  'internet',
  'security',
  'other',
];

const priorityOptions: ComplaintPriority[] = [
  'low',
  'medium',
  'high',
  'urgent',
];

const statusOptions: ComplaintStatus[] = [
  'pending',
  'assigned',
  'in_progress',
  'resolved',
  'rejected',
];

const emptyComplaintForm: ComplaintForm = {
  title: '',
  description: '',
  category: 'other',
  location: '',
  priority: 'medium',
};

export default function ComplaintsScreen() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');

  const [createModalVisible, setCreateModalVisible] =
    useState(false);
  const [updateModalVisible, setUpdateModalVisible] =
    useState(false);

  const [selectedComplaint, setSelectedComplaint] =
    useState<Complaint | null>(null);

  const [complaintForm, setComplaintForm] =
    useState<ComplaintForm>(emptyComplaintForm);

  const [updateForm, setUpdateForm] = useState<UpdateForm>({
    status: 'pending',
    priority: 'medium',
    resolutionNote: '',
  });

  const [saving, setSaving] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const canCreate =
    userRole === 'student' ||
    userRole === 'faculty' ||
    userRole === 'admin';

  const canManage =
    userRole === 'admin' || userRole === 'maintenance';

  const isAdmin = userRole === 'admin';

  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  const loadCurrentUser = async () => {
    const storedUser = await AsyncStorage.getItem('user');
    const storedRole = await AsyncStorage.getItem('userRole');

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        setUserId(user.id || user._id || '');
        setUserName(user.name || '');
        setUserRole(storedRole || user.role || '');
        return;
      } catch (e) {
        console.error('Unable to read stored user:', e);
      }
    }

    setUserRole(storedRole || '');
  };

  const loadComplaints = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const token = await getToken();

        if (!token) {
          router.replace('/login');
          return;
        }

        const response = await fetch(
          `${NODE_API_URL}/api/complaints`,
          {
            method: 'GET',
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

            router.replace('/login');
            return;
          }

          throw new Error(
            data.message || 'Failed to load complaints',
          );
        }

        setComplaints(data.complaints || []);
      } catch (e) {
        console.error('Complaint loading error:', e);

        setError(
          e instanceof Error
            ? e.message
            : 'Unable to connect to the backend.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadCurrentUser();
    loadComplaints();
  }, [loadComplaints]);

  const openCreateModal = () => {
    setComplaintForm(emptyComplaintForm);
    setCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    if (saving) {
      return;
    }

    setCreateModalVisible(false);
    setComplaintForm(emptyComplaintForm);
  };

  const createComplaint = async () => {
    if (!complaintForm.title.trim()) {
      Alert.alert(
        'Missing Information',
        'Complaint title is required.',
      );
      return;
    }

    if (!complaintForm.description.trim()) {
      Alert.alert(
        'Missing Information',
        'Complaint description is required.',
      );
      return;
    }

    if (!complaintForm.location.trim()) {
      Alert.alert(
        'Missing Information',
        'Complaint location is required.',
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

      const response = await fetch(
        `${NODE_API_URL}/api/complaints`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: complaintForm.title.trim(),
            description: complaintForm.description.trim(),
            category: complaintForm.category,
            location: complaintForm.location.trim(),
            priority: complaintForm.priority,
          }),
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
          data.message || 'Failed to create complaint',
        );
      }

      setCreateModalVisible(false);
      setComplaintForm(emptyComplaintForm);

      await loadComplaints();

      Alert.alert(
        'Complaint Created',
        'Your complaint was submitted successfully.',
      );
    } catch (e) {
      console.error('Create complaint error:', e);

      Alert.alert(
        'Unable to Create Complaint',
        e instanceof Error
          ? e.message
          : 'Something went wrong while creating the complaint.',
      );
    } finally {
      setSaving(false);
    }
  };

  const openUpdateModal = (complaint: Complaint) => {
    setSelectedComplaint(complaint);

    setUpdateForm({
      status: complaint.status,
      priority: complaint.priority,
      resolutionNote: complaint.resolutionNote || '',
    });

    setUpdateModalVisible(true);
  };

  const closeUpdateModal = () => {
    if (saving) {
      return;
    }

    setUpdateModalVisible(false);
    setSelectedComplaint(null);
  };

  const updateComplaint = async () => {
    if (!selectedComplaint) {
      return;
    }

    try {
      setSaving(true);

      const token = await getToken();

      if (!token) {
        router.replace('/login');
        return;
      }

      const payload: Record<string, string> = {
        status: updateForm.status,
        priority: updateForm.priority,
        resolutionNote: updateForm.resolutionNote.trim(),
      };

      // Maintenance staff can assign the complaint to themselves.
      // This uses the authenticated user's ID instead of asking the
      // frontend to guess another user's ID.
      if (
        userRole === 'maintenance' &&
        userId &&
        !selectedComplaint.assignedTo
      ) {
        payload.assignedTo = userId;
      }

      const response = await fetch(
        `${NODE_API_URL}/api/complaints/${selectedComplaint._id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
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
          data.message || 'Failed to update complaint',
        );
      }

      setUpdateModalVisible(false);
      setSelectedComplaint(null);

      await loadComplaints();

      Alert.alert(
        'Complaint Updated',
        'Complaint details were updated successfully.',
      );
    } catch (e) {
      console.error('Update complaint error:', e);

      Alert.alert(
        'Unable to Update',
        e instanceof Error
          ? e.message
          : 'Something went wrong while updating the complaint.',
      );
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (complaint: Complaint) => {
    try {
      const token = await getToken();

      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${NODE_API_URL}/api/complaints/${complaint._id}`,
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
          data.message || 'Failed to delete complaint',
        );
      }

      await loadComplaints();

      Alert.alert(
        'Deleted',
        'Complaint deleted successfully.',
      );
    } catch (e) {
      console.error('Delete complaint error:', e);

      Alert.alert(
        'Unable to Delete',
        e instanceof Error
          ? e.message
          : 'Something went wrong while deleting the complaint.',
      );
    }
  };

  const deleteComplaint = (complaint: Complaint) => {
    const message = `Are you sure you want to delete "${complaint.title}"?`;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);

      if (confirmed) {
        performDelete(complaint);
      }

      return;
    }

    Alert.alert(
      'Delete Complaint',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(complaint),
        },
      ],
    );
  };

  const getStatusLabel = (status: ComplaintStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'assigned':
        return 'Assigned';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: ComplaintPriority) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getCategoryLabel = (category: ComplaintCategory) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getStatusStyle = (status: ComplaintStatus) => {
    switch (status) {
      case 'pending':
        return styles.pendingBadge;
      case 'assigned':
        return styles.assignedBadge;
      case 'in_progress':
        return styles.progressBadge;
      case 'resolved':
        return styles.resolvedBadge;
      case 'rejected':
        return styles.rejectedBadge;
      default:
        return styles.pendingBadge;
    }
  };

  const getPriorityStyle = (priority: ComplaintPriority) => {
    switch (priority) {
      case 'urgent':
        return styles.urgentBadge;
      case 'high':
        return styles.highBadge;
      case 'medium':
        return styles.mediumBadge;
      case 'low':
        return styles.lowBadge;
      default:
        return styles.mediumBadge;
    }
  };

  const getReportedByName = (complaint: Complaint) => {
    if (
      complaint.reportedBy &&
      typeof complaint.reportedBy === 'object'
    ) {
      return complaint.reportedBy.name;
    }

    return 'Unknown user';
  };

  const getAssignedToName = (complaint: Complaint) => {
    if (
      complaint.assignedTo &&
      typeof complaint.assignedTo === 'object'
    ) {
      return complaint.assignedTo.name;
    }

    return 'Not assigned';
  };

  const formatDate = (date?: string | null) => {
    if (!date) {
      return 'Not available';
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return 'Not available';
    }

    return parsed.toLocaleString();
  };

  const openDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setDetailsVisible(true);
  };

  const closeDetails = () => {
    setDetailsVisible(false);
    setSelectedComplaint(null);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadComplaints(true)}
          />
        }
      >
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              Campus Complaints
            </Text>

            <Text style={styles.subtitle}>
              Report and track campus issues
            </Text>

            {userName ? (
              <Text style={styles.loggedUser}>
                Logged in as {userName}
              </Text>
            ) : null}
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countNumber}>
              {complaints.length}
            </Text>

            <Text style={styles.countLabel}>
              Complaints
            </Text>
          </View>
        </View>

        {canCreate && (
          <Pressable
            style={styles.addButton}
            onPress={openCreateModal}
          >
            <Text style={styles.addButtonText}>
              + New Complaint
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
              Loading complaints...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Unable to load complaints
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => loadComplaints()}
            >
              <Text style={styles.retryButtonText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : complaints.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>

            <Text style={styles.emptyTitle}>
              No Complaints Yet
            </Text>

            <Text style={styles.emptyText}>
              {canCreate
                ? 'Create a complaint when you find an issue on campus.'
                : 'There are currently no complaints.'}
            </Text>
          </View>
        ) : (
          complaints.map((complaint) => (
            <View
              key={complaint._id}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={styles.issueIcon}>
                  <Text style={styles.issueIconText}>
                    🚨
                  </Text>
                </View>

                <View style={styles.cardHeaderText}>
                  <Text style={styles.complaintTitle}>
                    {complaint.title}
                  </Text>

                  <Text style={styles.categoryText}>
                    {getCategoryLabel(complaint.category)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    getStatusStyle(complaint.status),
                  ]}
                >
                  <Text style={styles.statusText}>
                    {getStatusLabel(complaint.status)}
                  </Text>
                </View>
              </View>

              <Text
                style={styles.description}
                numberOfLines={3}
              >
                {complaint.description}
              </Text>

              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.priorityBadge,
                    getPriorityStyle(complaint.priority),
                  ]}
                >
                  <Text style={styles.priorityText}>
                    {getPriorityLabel(complaint.priority)}
                  </Text>
                </View>

                <Text style={styles.locationText}>
                  📍 {complaint.location}
                </Text>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>
                    Reported By
                  </Text>

                  <Text style={styles.infoValue}>
                    {getReportedByName(complaint)}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>
                    Assigned To
                  </Text>

                  <Text style={styles.infoValue}>
                    {getAssignedToName(complaint)}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>
                    Created
                  </Text>

                  <Text style={styles.infoValue}>
                    {formatDate(complaint.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={styles.viewButton}
                  onPress={() => openDetails(complaint)}
                >
                  <Text style={styles.viewText}>
                    View Details
                  </Text>
                </Pressable>

                {canManage && (
                  <Pressable
                    style={styles.editButton}
                    onPress={() =>
                      openUpdateModal(complaint)
                    }
                  >
                    <Text style={styles.editText}>
                      Update
                    </Text>
                  </Pressable>
                )}

                {isAdmin && (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      deleteComplaint(complaint)
                    }
                  >
                    <Text style={styles.deleteText}>
                      Delete
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create complaint modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                New Complaint
              </Text>

              <Pressable
                onPress={closeCreateModal}
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
                Title *
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. WiFi not working in CSE Lab"
                placeholderTextColor="#9CA3AF"
                value={complaintForm.title}
                onChangeText={(value) =>
                  setComplaintForm((current) => ({
                    ...current,
                    title: value,
                  }))
                }
              />

              <Text style={styles.label}>
                Description *
              </Text>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the problem clearly"
                placeholderTextColor="#9CA3AF"
                value={complaintForm.description}
                onChangeText={(value) =>
                  setComplaintForm((current) => ({
                    ...current,
                    description: value,
                  }))
                }
                multiline
                numberOfLines={5}
              />

              <Text style={styles.label}>
                Category
              </Text>

              <View style={styles.optionGrid}>
                {categoryOptions.map((category) => (
                  <Pressable
                    key={category}
                    style={[
                      styles.option,
                      complaintForm.category === category &&
                        styles.optionSelected,
                    ]}
                    onPress={() =>
                      setComplaintForm((current) => ({
                        ...current,
                        category,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        complaintForm.category === category &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {getCategoryLabel(category)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>
                Location *
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Engineering Block - CSE Lab 101"
                placeholderTextColor="#9CA3AF"
                value={complaintForm.location}
                onChangeText={(value) =>
                  setComplaintForm((current) => ({
                    ...current,
                    location: value,
                  }))
                }
              />

              <Text style={styles.label}>
                Priority
              </Text>

              <View style={styles.optionGrid}>
                {priorityOptions.map((priority) => (
                  <Pressable
                    key={priority}
                    style={[
                      styles.priorityOption,
                      complaintForm.priority === priority &&
                        styles.priorityOptionSelected,
                    ]}
                    onPress={() =>
                      setComplaintForm((current) => ({
                        ...current,
                        priority,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        complaintForm.priority === priority &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {getPriorityLabel(priority)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={createComplaint}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Submit Complaint
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={closeCreateModal}
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

      {/* Update complaint modal */}
      <Modal
        visible={updateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeUpdateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>
                  Update Complaint
                </Text>

                {selectedComplaint ? (
                  <Text
                    style={styles.modalSubtitle}
                    numberOfLines={1}
                  >
                    {selectedComplaint.title}
                  </Text>
                ) : null}
              </View>

              <Pressable
                onPress={closeUpdateModal}
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
                Status
              </Text>

              <View style={styles.optionGrid}>
                {statusOptions.map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.option,
                      updateForm.status === status &&
                        styles.optionSelected,
                    ]}
                    onPress={() =>
                      setUpdateForm((current) => ({
                        ...current,
                        status,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        updateForm.status === status &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {getStatusLabel(status)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>
                Priority
              </Text>

              <View style={styles.optionGrid}>
                {priorityOptions.map((priority) => (
                  <Pressable
                    key={priority}
                    style={[
                      styles.priorityOption,
                      updateForm.priority === priority &&
                        styles.priorityOptionSelected,
                    ]}
                    onPress={() =>
                      setUpdateForm((current) => ({
                        ...current,
                        priority,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        updateForm.priority === priority &&
                          styles.optionTextSelected,
                      ]}
                    >
                      {getPriorityLabel(priority)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>
                Resolution Note
              </Text>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add progress or resolution details"
                placeholderTextColor="#9CA3AF"
                value={updateForm.resolutionNote}
                onChangeText={(value) =>
                  setUpdateForm((current) => ({
                    ...current,
                    resolutionNote: value,
                  }))
                }
                multiline
                numberOfLines={5}
              />

              {userRole === 'maintenance' &&
              selectedComplaint &&
              !selectedComplaint.assignedTo ? (
                <View style={styles.assignHint}>
                  <Text style={styles.assignHintTitle}>
                    Maintenance assignment
                  </Text>

                  <Text style={styles.assignHintText}>
                    Saving this update will assign the complaint
                    to your logged-in maintenance account.
                  </Text>
                </View>
              ) : null}

              <Pressable
                style={[
                  styles.saveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={updateComplaint}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Save Update
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={closeUpdateModal}
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

      {/* Complaint details modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Complaint Details
              </Text>

              <Pressable onPress={closeDetails}>
                <Text style={styles.closeButton}>
                  ✕
                </Text>
              </Pressable>
            </View>

            {selectedComplaint ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.detailsContent}
              >
                <Text style={styles.detailsTitle}>
                  {selectedComplaint.title}
                </Text>

                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      getStatusStyle(
                        selectedComplaint.status,
                      ),
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusLabel(
                        selectedComplaint.status,
                      )}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.priorityBadge,
                      getPriorityStyle(
                        selectedComplaint.priority,
                      ),
                    ]}
                  >
                    <Text style={styles.priorityText}>
                      {getPriorityLabel(
                        selectedComplaint.priority,
                      )}
                    </Text>
                  </View>
                </View>

                <Text style={styles.detailsLabel}>
                  Description
                </Text>

                <Text style={styles.detailsValue}>
                  {selectedComplaint.description}
                </Text>

                <Text style={styles.detailsLabel}>
                  Category
                </Text>

                <Text style={styles.detailsValue}>
                  {getCategoryLabel(
                    selectedComplaint.category,
                  )}
                </Text>

                <Text style={styles.detailsLabel}>
                  Location
                </Text>

                <Text style={styles.detailsValue}>
                  {selectedComplaint.location}
                </Text>

                <Text style={styles.detailsLabel}>
                  Reported By
                </Text>

                <Text style={styles.detailsValue}>
                  {getReportedByName(selectedComplaint)}
                </Text>

                <Text style={styles.detailsLabel}>
                  Assigned To
                </Text>

                <Text style={styles.detailsValue}>
                  {getAssignedToName(selectedComplaint)}
                </Text>

                <Text style={styles.detailsLabel}>
                  Resolution Note
                </Text>

                <Text style={styles.detailsValue}>
                  {selectedComplaint.resolutionNote ||
                    'No resolution note yet.'}
                </Text>

                <Text style={styles.detailsLabel}>
                  Created
                </Text>

                <Text style={styles.detailsValue}>
                  {formatDate(selectedComplaint.createdAt)}
                </Text>

                <Text style={styles.detailsLabel}>
                  Resolved At
                </Text>

                <Text style={styles.detailsValue}>
                  {formatDate(selectedComplaint.resolvedAt)}
                </Text>

                <Pressable
                  style={styles.cancelButton}
                  onPress={closeDetails}
                >
                  <Text style={styles.cancelButtonText}>
                    Close
                  </Text>
                </Pressable>
              </ScrollView>
            ) : null}
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
    marginBottom: 20,
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

  loggedUser: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
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

  issueIcon: {
    width: 50,
    height: 50,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  issueIconText: {
    fontSize: 23,
  },

  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 10,
  },

  complaintTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },

  categoryText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
    textTransform: 'capitalize',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },

  assignedBadge: {
    backgroundColor: '#DBEAFE',
  },

  progressBadge: {
    backgroundColor: '#E0E7FF',
  },

  resolvedBadge: {
    backgroundColor: '#DCFCE7',
  },

  rejectedBadge: {
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

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },

  priorityBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 15,
  },

  urgentBadge: {
    backgroundColor: '#FEE2E2',
  },

  highBadge: {
    backgroundColor: '#FFEDD5',
  },

  mediumBadge: {
    backgroundColor: '#FEF3C7',
  },

  lowBadge: {
    backgroundColor: '#DCFCE7',
  },

  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },

  locationText: {
    color: '#6B7280',
    fontSize: 13,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  infoItem: {
    minWidth: 170,
    flex: 1,
  },

  infoLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 3,
  },

  infoValue: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  viewButton: {
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },

  viewText: {
    color: '#374151',
    fontWeight: '700',
  },

  editButton: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
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
    textAlignVertical: 'center',
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
    maxWidth: 680,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },

  detailsModalCard: {
    width: '100%',
    maxWidth: 650,
    maxHeight: '90%',
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

  modalTitleContainer: {
    flex: 1,
    paddingRight: 15,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },

  modalSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
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

  detailsContent: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },

  detailsTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 10,
  },

  detailsLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 5,
    textTransform: 'uppercase',
  },

  detailsValue: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 21,
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
    height: 105,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  option: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  optionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },

  optionText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  optionTextSelected: {
    color: '#1D4ED8',
  },

  priorityOption: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  priorityOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },

  assignHint: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 13,
    marginTop: 18,
  },

  assignHintTitle: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13,
  },

  assignHintText: {
    color: '#4B5563',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
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
    marginTop: 2,
  },

  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
});
