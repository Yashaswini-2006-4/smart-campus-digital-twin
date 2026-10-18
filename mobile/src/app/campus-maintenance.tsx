import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import RoleGuard from '../components/auth/RoleGuard';
import { NODE_API_URL } from '../constants/api';

type Role = 'student' | 'faculty' | 'admin' | 'maintenance';
type UserInfo = { id?: string; _id?: string; name?: string; email?: string; role?: Role };
type Complaint = { _id: string; title: string; description: string; category: string; location: string; priority: 'low'|'medium'|'high'|'urgent'; status: 'pending'|'assigned'|'in_progress'|'resolved'|'rejected'; reportedBy?: { _id?: string; name?: string; email?: string; role?: string } | null; assignedTo?: { _id?: string; name?: string; email?: string; role?: string } | null; resolutionNote?: string; resolvedAt?: string|null; createdAt?: string };
type MaintenanceTask = { _id: string; complaint: { _id: string; title: string; category: string; location: string; priority: string; status: string; resolvedAt?: string|null }; assignedTo: { _id: string; name: string; email: string; role: string }; taskDescription: string; status: 'assigned'|'in_progress'|'completed'; scheduledDate?: string|null; completedAt?: string|null; notes?: string; createdAt?: string; updatedAt?: string };
type FormState = { complaint: string; taskDescription: string; scheduledDate: string; notes: string };
const emptyForm: FormState = { complaint: '', taskDescription: '', scheduledDate: '', notes: '' };

function decodeJwtPayload(token: string): { userId?: string; role?: Role } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || typeof globalThis.atob !== 'function') return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(globalThis.atob(padded));
  } catch { return null; }
}

function formatDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

async function confirmAction(title: string, message: string) {
  if (Platform.OS === 'web') return window.confirm(`${title}\n\n${message}`);
  return new Promise<boolean>(resolve => Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
  ]));
}

export default function CampusMaintenanceScreen() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentRole, setCurrentRole] = useState<Role | ''>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsTask, setDetailsTask] = useState<MaintenanceTask | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const isAdmin = currentRole === 'admin';
  const canManage = currentRole === 'maintenance' || currentRole === 'admin';
  const unresolvedComplaints = useMemo(() => complaints.filter(c => c.status !== 'resolved' && c.status !== 'rejected'), [complaints]);

  const loadSession = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) { router.replace('/login'); return null; }
    const payload = decodeJwtPayload(token);
    let storedUser: UserInfo | null = null;
    const raw = await AsyncStorage.getItem('user');
    if (raw) { try { storedUser = JSON.parse(raw); } catch { storedUser = null; } }
    const userId = payload?.userId || storedUser?.id || storedUser?._id || '';
    const role = payload?.role || storedUser?.role || '';
    setUser(storedUser); setCurrentUserId(userId); setCurrentRole(role as Role);
    return { token, userId, role: role as Role };
  }, []);

  const loadData = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError('');
    try {
      const session = await loadSession();
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };
      const [tasksResponse, complaintsResponse] = await Promise.all([
        fetch(`${NODE_API_URL}/api/maintenance`, { headers }),
        fetch(`${NODE_API_URL}/api/complaints`, { headers }),
      ]);
      const tasksData = await tasksResponse.json();
      const complaintsData = await complaintsResponse.json();
      if (!tasksResponse.ok) {
        if (tasksResponse.status === 401) { await AsyncStorage.removeItem('token'); await AsyncStorage.removeItem('user'); router.replace('/login'); return; }
        throw new Error(tasksData.message || 'Failed to load maintenance tasks.');
      }
      if (!complaintsResponse.ok) {
        if (complaintsResponse.status === 401) { await AsyncStorage.removeItem('token'); await AsyncStorage.removeItem('user'); router.replace('/login'); return; }
        throw new Error(complaintsData.message || 'Failed to load complaints.');
      }
      setTasks(tasksData.tasks || []); setComplaints(complaintsData.complaints || []);
    } catch (e) {
      console.error('Campus maintenance load error:', e);
      setError(e instanceof Error ? e.message : 'Unable to connect to the Node backend.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [loadSession]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreateModal = () => {
    if (!canManage) return showMessage('Access denied', 'Only maintenance staff or admins can create maintenance tasks.');
    if (!currentUserId) return showMessage('Logged-in user information is missing', 'Please log out and log in again so the current user ID can be loaded.');
    if (!unresolvedComplaints.length) return showMessage('No unresolved complaints', 'There are no pending, assigned or in-progress complaints available for a new maintenance task.');
    setForm({ ...emptyForm, complaint: unresolvedComplaints[0]._id }); setModalVisible(true);
  };

  const createTask = async () => {
    if (!form.complaint) return showMessage('Required', 'Please select a complaint.');
    if (!form.taskDescription.trim()) return showMessage('Required', 'Please enter a task description.');
    if (!currentUserId) return showMessage('Logged-in user information is missing', 'Please log out and log in again.');
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/login'); return; }
      const payload: Record<string, unknown> = { complaint: form.complaint, assignedTo: currentUserId, taskDescription: form.taskDescription.trim(), notes: form.notes.trim(), scheduledDate: null };
      if (form.scheduledDate.trim()) {
        const date = new Date(form.scheduledDate.trim());
        if (Number.isNaN(date.getTime())) { showMessage('Invalid date', 'Use a valid date and time, for example 2026-10-09 10:00.'); return; }
        payload.scheduledDate = date.toISOString();
      }
      const response = await fetch(`${NODE_API_URL}/api/maintenance`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) { await AsyncStorage.removeItem('token'); await AsyncStorage.removeItem('user'); router.replace('/login'); return; }
        throw new Error(data.message || 'Failed to create maintenance task.');
      }
      setModalVisible(false); setForm(emptyForm); await loadData(true); showMessage('Success', 'Maintenance task created successfully.');
    } catch (e) { showMessage('Unable to create task', e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setSaving(false); }
  };

  const updateTaskStatus = async (task: MaintenanceTask, status: MaintenanceTask['status']) => {
    if (!canManage) return;
    if (!(await confirmAction('Update maintenance task', `Change this task to "${status.replace('_', ' ')}"?`))) return;
    try {
      setUpdatingId(task._id); const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/login'); return; }
      const response = await fetch(`${NODE_API_URL}/api/maintenance/${task._id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update maintenance task.');
      await loadData(true);
      showMessage(status === 'completed' ? 'Task completed' : 'Updated', status === 'completed' ? 'The maintenance task is completed and the linked complaint has been marked as resolved.' : 'Maintenance task status updated successfully.');
    } catch (e) { showMessage('Unable to update task', e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setUpdatingId(''); }
  };

  const deleteTask = async (task: MaintenanceTask) => {
    if (!isAdmin) return showMessage('Access denied', 'Only admins can delete maintenance tasks.');
    if (!(await confirmAction('Delete maintenance task', 'Are you sure you want to permanently delete this task?'))) return;
    try {
      setUpdatingId(task._id); const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/login'); return; }
      const response = await fetch(`${NODE_API_URL}/api/maintenance/${task._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete maintenance task.');
      await loadData(true); showMessage('Deleted', 'Maintenance task deleted successfully.');
    } catch (e) { showMessage('Unable to delete task', e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setUpdatingId(''); }
  };

  const displayName = user?.name || user?.email || (currentUserId ? 'Current logged-in user' : 'User');
  const displayRole = currentRole ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1) : 'Unknown';
  const selectedComplaint = unresolvedComplaints.find(c => c._id === form.complaint);

  return (
    <RoleGuard allowedRole="maintenance">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Campus Maintenance</Text>
            <Text style={styles.subtitle}>Manage complaint-linked maintenance work</Text>
            <Text style={styles.loggedIn}>Logged in as {displayName} · {displayRole}</Text>
          </View>
          <View style={styles.countBadge}><Text style={styles.countNumber}>{tasks.length}</Text><Text style={styles.countLabel}>Tasks</Text></View>
        </View>

        {canManage && <Pressable style={styles.primaryButton} onPress={openCreateModal}><Text style={styles.primaryButtonText}>+ Create Maintenance Task</Text></Pressable>}

        {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.loadingText}>Loading maintenance tasks...</Text></View> : error ? <View style={styles.errorCard}><Text style={styles.errorTitle}>Unable to load data</Text><Text style={styles.errorText}>{error}</Text><Pressable style={styles.retryButton} onPress={() => loadData()}><Text style={styles.retryText}>Try Again</Text></Pressable></View> : tasks.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No maintenance tasks</Text><Text style={styles.emptyText}>Create a task from an unresolved campus complaint.</Text></View> : <View style={styles.list}>
          {tasks.map(task => <View key={task._id} style={styles.taskCard}>
            <View style={styles.taskTop}><View style={styles.taskTitleWrap}><Text style={styles.taskTitle}>{task.complaint?.title || 'Maintenance Task'}</Text><Text style={styles.taskLocation}>📍 {task.complaint?.location || 'Location not available'}</Text></View><View style={[styles.statusBadge, task.status === 'assigned' ? styles.assignedBadge : task.status === 'in_progress' ? styles.progressBadge : styles.completedBadge]}><Text style={styles.statusText}>{task.status.replace('_', ' ')}</Text></View></View>
            <View style={styles.divider} />
            <Text style={styles.label}>TASK DESCRIPTION</Text><Text style={styles.value}>{task.taskDescription}</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>Assigned To</Text><Text style={styles.infoValue}>{task.assignedTo?.name || 'Not assigned'}</Text></View>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>Priority</Text><Text style={styles.infoValue}>{task.complaint?.priority || 'Medium'}</Text></View>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>Scheduled</Text><Text style={styles.infoValue}>{formatDate(task.scheduledDate)}</Text></View>
              <View style={styles.infoItem}><Text style={styles.infoLabel}>Completed</Text><Text style={styles.infoValue}>{formatDate(task.completedAt)}</Text></View>
            </View>
            {!!task.notes && <><Text style={styles.label}>NOTES</Text><Text style={styles.value}>{task.notes}</Text></>}
            <View style={styles.actions}>
              <Pressable style={styles.secondaryButton} onPress={() => setDetailsTask(task)}><Text style={styles.secondaryButtonText}>View Details</Text></Pressable>
              {canManage && task.status === 'assigned' && <Pressable style={styles.actionButton} disabled={updatingId === task._id} onPress={() => updateTaskStatus(task, 'in_progress')}><Text style={styles.actionButtonText}>{updatingId === task._id ? 'Updating...' : 'Start Task'}</Text></Pressable>}
              {canManage && task.status === 'in_progress' && <Pressable style={styles.completeButton} disabled={updatingId === task._id} onPress={() => updateTaskStatus(task, 'completed')}><Text style={styles.completeButtonText}>{updatingId === task._id ? 'Updating...' : 'Complete Task'}</Text></Pressable>}
              {isAdmin && <Pressable style={styles.deleteButton} disabled={updatingId === task._id} onPress={() => deleteTask(task)}><Text style={styles.deleteButtonText}>Delete</Text></Pressable>}
            </View>
          </View>)}
        </View>}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => !saving && setModalVisible(false)}>
        <View style={styles.overlay}><View style={styles.modal}>
          <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Create Maintenance Task</Text><Text style={styles.modalSubtitle}>Link the task to an unresolved complaint</Text></View><Pressable onPress={() => !saving && setModalVisible(false)}><Text style={styles.closeText}>×</Text></Pressable></View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.formLabel}>Complaint *</Text>
            {unresolvedComplaints.length === 0 ? <View style={styles.noComplaintBox}><Text style={styles.noComplaintText}>No unresolved complaints are available.</Text></View> : <View style={styles.complaintOptions}>
              {unresolvedComplaints.map(complaint => <Pressable key={complaint._id} style={[styles.complaintOption, form.complaint === complaint._id && styles.complaintOptionSelected]} onPress={() => setForm(f => ({ ...f, complaint: complaint._id }))}>
                <View style={styles.complaintOptionTop}><Text style={styles.complaintTitle}>{complaint.title}</Text><Text style={styles.complaintPriority}>{complaint.priority}</Text></View>
                <Text style={styles.complaintLocation}>📍 {complaint.location}</Text><Text style={styles.complaintStatus}>Status: {complaint.status.replace('_', ' ')}</Text>
              </Pressable>)}
            </View>}
            {selectedComplaint && <View style={styles.selectedComplaintBox}><Text style={styles.selectedTitle}>Selected Complaint</Text><Text style={styles.selectedText}>{selectedComplaint.title}</Text><Text style={styles.selectedText}>{selectedComplaint.location}</Text></View>}
            <Text style={styles.formLabel}>Assigned To</Text><View style={styles.userBox}><Text style={styles.userName}>{displayName}</Text><Text style={styles.userRole}>{displayRole}</Text></View>
            <Text style={styles.formLabel}>Task Description *</Text><TextInput style={[styles.input, styles.multilineInput]} placeholder="Describe the maintenance work" placeholderTextColor="#94A3B8" value={form.taskDescription} onChangeText={value => setForm(f => ({ ...f, taskDescription: value }))} multiline />
            <Text style={styles.formLabel}>Scheduled Date & Time</Text><TextInput style={styles.input} placeholder="2026-10-09 10:00" placeholderTextColor="#94A3B8" value={form.scheduledDate} onChangeText={value => setForm(f => ({ ...f, scheduledDate: value }))} /><Text style={styles.formHint}>Leave blank if no schedule is needed.</Text>
            <Text style={styles.formLabel}>Notes</Text><TextInput style={[styles.input, styles.notesInput]} placeholder="Add maintenance notes" placeholderTextColor="#94A3B8" value={form.notes} onChangeText={value => setForm(f => ({ ...f, notes: value }))} multiline />
            <Pressable style={[styles.primaryButton, saving && styles.disabledButton]} onPress={createTask} disabled={saving}><Text style={styles.primaryButtonText}>{saving ? 'Creating...' : 'Create Task'}</Text></Pressable>
          </ScrollView>
        </View></View>
      </Modal>

      <Modal visible={!!detailsTask} animationType="fade" transparent onRequestClose={() => setDetailsTask(null)}>
        <View style={styles.overlay}><View style={styles.detailsModal}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Maintenance Details</Text><Pressable onPress={() => setDetailsTask(null)}><Text style={styles.closeText}>×</Text></Pressable></View>
          {detailsTask && <ScrollView contentContainerStyle={styles.detailsContent}>
            <View style={styles.detailsStatusRow}><View style={[styles.statusBadge, detailsTask.status === 'assigned' ? styles.assignedBadge : detailsTask.status === 'in_progress' ? styles.progressBadge : styles.completedBadge]}><Text style={styles.statusText}>{detailsTask.status.replace('_', ' ')}</Text></View><View style={styles.priorityBadge}><Text style={styles.priorityText}>{detailsTask.complaint?.priority || 'medium'}</Text></View></View>
            <Text style={styles.detailsTitle}>{detailsTask.complaint?.title}</Text>
            <Text style={styles.detailsLabel}>LOCATION</Text><Text style={styles.detailsValue}>{detailsTask.complaint?.location || 'Not available'}</Text>
            <Text style={styles.detailsLabel}>TASK</Text><Text style={styles.detailsValue}>{detailsTask.taskDescription}</Text>
            <Text style={styles.detailsLabel}>ASSIGNED TO</Text><Text style={styles.detailsValue}>{detailsTask.assignedTo?.name || 'Not assigned'}</Text>
            <Text style={styles.detailsLabel}>SCHEDULED</Text><Text style={styles.detailsValue}>{formatDate(detailsTask.scheduledDate)}</Text>
            <Text style={styles.detailsLabel}>COMPLETED AT</Text><Text style={styles.detailsValue}>{formatDate(detailsTask.completedAt)}</Text>
            <Text style={styles.detailsLabel}>NOTES</Text><Text style={styles.detailsValue}>{detailsTask.notes || 'No notes yet.'}</Text>
            <Text style={styles.detailsLabel}>COMPLAINT STATUS</Text><Text style={styles.detailsValue}>{detailsTask.complaint?.status?.replace('_', ' ') || 'Not available'}</Text>
            <Pressable style={styles.closeButton} onPress={() => setDetailsTask(null)}><Text style={styles.closeButtonText}>Close</Text></Pressable>
          </ScrollView>}
        </View></View>
      </Modal>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#F5F7FB'}, content:{padding:28,paddingBottom:60}, back:{color:'#2563EB',fontSize:16,fontWeight:'600',marginBottom:22}, header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:20}, headerText:{flex:1}, title:{fontSize:34,fontWeight:'800',color:'#0F172A'}, subtitle:{marginTop:6,fontSize:17,color:'#64748B'}, loggedIn:{marginTop:10,fontSize:14,fontWeight:'600',color:'#2563EB'}, countBadge:{minWidth:90,paddingVertical:14,paddingHorizontal:18,borderRadius:16,backgroundColor:'#DBEAFE',alignItems:'center'}, countNumber:{fontSize:24,fontWeight:'800',color:'#2563EB'}, countLabel:{marginTop:2,color:'#2563EB',fontSize:12,fontWeight:'600'}, primaryButton:{marginTop:24,alignSelf:'flex-start',backgroundColor:'#2563EB',paddingHorizontal:22,paddingVertical:14,borderRadius:12}, primaryButtonText:{color:'#FFF',fontSize:16,fontWeight:'800'}, disabledButton:{opacity:.6}, center:{alignItems:'center',paddingVertical:80}, loadingText:{marginTop:12,color:'#64748B'}, errorCard:{marginTop:26,backgroundColor:'#FEF2F2',borderRadius:16,padding:22,borderWidth:1,borderColor:'#FECACA'}, errorTitle:{fontSize:18,fontWeight:'800',color:'#991B1B'}, errorText:{marginTop:8,color:'#7F1D1D',lineHeight:21}, retryButton:{marginTop:16,alignSelf:'flex-start',backgroundColor:'#DC2626',paddingHorizontal:18,paddingVertical:10,borderRadius:10}, retryText:{color:'#FFF',fontWeight:'700'}, emptyCard:{marginTop:26,backgroundColor:'#FFF',borderRadius:18,padding:30,alignItems:'center'}, emptyTitle:{fontSize:20,fontWeight:'800',color:'#0F172A'}, emptyText:{marginTop:8,color:'#64748B',textAlign:'center'}, list:{marginTop:26,gap:18}, taskCard:{backgroundColor:'#FFF',borderRadius:18,padding:22,borderWidth:1,borderColor:'#E2E8F0'}, taskTop:{flexDirection:'row',justifyContent:'space-between',gap:20}, taskTitleWrap:{flex:1}, taskTitle:{fontSize:21,fontWeight:'800',color:'#0F172A'}, taskLocation:{marginTop:7,color:'#64748B'}, statusBadge:{paddingHorizontal:12,paddingVertical:7,borderRadius:999,alignSelf:'flex-start'}, assignedBadge:{backgroundColor:'#FEF3C7'}, progressBadge:{backgroundColor:'#DBEAFE'}, completedBadge:{backgroundColor:'#DCFCE7'}, statusText:{color:'#334155',fontSize:12,fontWeight:'800',textTransform:'capitalize'}, divider:{height:1,backgroundColor:'#E2E8F0',marginVertical:18}, label:{fontSize:12,fontWeight:'800',color:'#94A3B8',marginTop:8,marginBottom:6,letterSpacing:.5}, value:{fontSize:15,color:'#334155',lineHeight:22}, infoGrid:{flexDirection:'row',flexWrap:'wrap',marginTop:18,gap:12}, infoItem:{minWidth:180,flexGrow:1,backgroundColor:'#F8FAFC',borderRadius:12,padding:14}, infoLabel:{color:'#94A3B8',fontSize:12,fontWeight:'700'}, infoValue:{marginTop:5,color:'#0F172A',fontWeight:'700'}, actions:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:20}, secondaryButton:{borderWidth:1,borderColor:'#94A3B8',paddingHorizontal:16,paddingVertical:10,borderRadius:10}, secondaryButtonText:{color:'#334155',fontWeight:'700'}, actionButton:{borderWidth:1,borderColor:'#2563EB',paddingHorizontal:16,paddingVertical:10,borderRadius:10}, actionButtonText:{color:'#2563EB',fontWeight:'700'}, completeButton:{backgroundColor:'#16A34A',paddingHorizontal:16,paddingVertical:10,borderRadius:10}, completeButtonText:{color:'#FFF',fontWeight:'700'}, deleteButton:{borderWidth:1,borderColor:'#EF4444',paddingHorizontal:16,paddingVertical:10,borderRadius:10}, deleteButtonText:{color:'#DC2626',fontWeight:'700'}, overlay:{flex:1,backgroundColor:'rgba(15,23,42,.48)',justifyContent:'center',padding:18}, modal:{width:'100%',maxWidth:900,maxHeight:'94%',alignSelf:'center',backgroundColor:'#FFF',borderRadius:22,overflow:'hidden'}, detailsModal:{width:'100%',maxWidth:760,maxHeight:'90%',alignSelf:'center',backgroundColor:'#FFF',borderRadius:22,overflow:'hidden'}, modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',paddingHorizontal:28,paddingTop:24,paddingBottom:18,borderBottomWidth:1,borderBottomColor:'#E2E8F0'}, modalTitle:{fontSize:27,fontWeight:'800',color:'#0F172A'}, modalSubtitle:{marginTop:5,color:'#64748B',fontSize:15}, closeText:{fontSize:34,lineHeight:30,color:'#64748B',fontWeight:'300'}, modalScroll:{flexGrow:0}, modalContent:{padding:28,paddingBottom:40}, formLabel:{marginTop:16,marginBottom:8,color:'#334155',fontSize:14,fontWeight:'800'}, formHint:{color:'#94A3B8',fontSize:12,marginTop:5}, input:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,paddingHorizontal:16,paddingVertical:13,fontSize:16,color:'#0F172A',backgroundColor:'#FFF'}, multilineInput:{minHeight:90,textAlignVertical:'top'}, notesInput:{minHeight:100,textAlignVertical:'top'}, complaintOptions:{gap:10}, complaintOption:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:13,padding:14,backgroundColor:'#FFF'}, complaintOptionSelected:{borderColor:'#2563EB',backgroundColor:'#EFF6FF'}, complaintOptionTop:{flexDirection:'row',justifyContent:'space-between',gap:10}, complaintTitle:{flex:1,color:'#0F172A',fontSize:15,fontWeight:'800'}, complaintPriority:{color:'#2563EB',fontSize:12,fontWeight:'800',textTransform:'capitalize'}, complaintLocation:{marginTop:6,color:'#64748B'}, complaintStatus:{marginTop:5,color:'#94A3B8',fontSize:12,textTransform:'capitalize'}, selectedComplaintBox:{marginTop:14,backgroundColor:'#EFF6FF',borderRadius:12,padding:14}, selectedTitle:{color:'#2563EB',fontSize:12,fontWeight:'800'}, selectedText:{marginTop:4,color:'#1E3A8A'}, noComplaintBox:{borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,padding:18,backgroundColor:'#F8FAFC'}, noComplaintText:{color:'#64748B'}, userBox:{borderRadius:12,padding:16,backgroundColor:'#F8FAFC',borderWidth:1,borderColor:'#E2E8F0'}, userName:{color:'#0F172A',fontSize:16,fontWeight:'800'}, userRole:{marginTop:4,color:'#64748B',textTransform:'capitalize'}, detailsContent:{padding:28,paddingBottom:34}, detailsStatusRow:{flexDirection:'row',gap:10,marginBottom:18}, priorityBadge:{backgroundColor:'#FEF3C7',paddingHorizontal:12,paddingVertical:7,borderRadius:999}, priorityText:{color:'#92400E',fontWeight:'800',fontSize:12,textTransform:'capitalize'}, detailsTitle:{fontSize:24,fontWeight:'800',color:'#0F172A',marginBottom:20}, detailsLabel:{marginTop:16,marginBottom:5,color:'#94A3B8',fontSize:12,fontWeight:'800'}, detailsValue:{color:'#334155',fontSize:16,lineHeight:23}, closeButton:{marginTop:28,borderWidth:1,borderColor:'#CBD5E1',borderRadius:12,paddingVertical:13,alignItems:'center'}, closeButtonText:{color:'#334155',fontWeight:'800'}
});
