import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { NODE_API_URL } from '../constants/api';

type CampusItem = { _id?: string; name?: string; code?: string; status?: string; description?: string; location?: string; floors?: number; roomNumber?: string; type?: string; capacity?: number; floor?: number; head?: string };
type HierarchyItem = { building?: CampusItem; departments?: CampusItem[]; rooms?: CampusItem[]; facilities?: CampusItem[] };
type Statistics = { buildings?: number; departments?: number; rooms?: number; facilities?: number; activeComplaints?: number; urgentComplaints?: number; activeMaintenanceTasks?: number; completedMaintenanceTasks?: number };
type Overview = { campus?: string; statistics?: Statistics; campusHierarchy?: HierarchyItem[]; lastUpdated?: string; updatedAt?: string };

const statCards: { key: keyof Statistics; label: string; icon: string; color: string }[] = [
  { key: 'buildings', label: 'Buildings', icon: '🏢', color: '#DBEAFE' },
  { key: 'departments', label: 'Departments', icon: '🎓', color: '#EDE9FE' },
  { key: 'rooms', label: 'Rooms', icon: '🚪', color: '#D1FAE5' },
  { key: 'facilities', label: 'Facilities', icon: '🏫', color: '#FEF3C7' },
  { key: 'activeComplaints', label: 'Active Complaints', icon: '📋', color: '#FFEDD5' },
  { key: 'urgentComplaints', label: 'Urgent Complaints', icon: '🚨', color: '#FEE2E2' },
  { key: 'activeMaintenanceTasks', label: 'Active Maintenance', icon: '🛠️', color: '#E0E7FF' },
  { key: 'completedMaintenanceTasks', label: 'Completed Tasks', icon: '✅', color: '#D1FAE5' },
];

const titleCase = (value?: string) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Not specified';
const statusColor = (value?: string) => ['active', 'available', 'resolved', 'completed'].includes((value || '').toLowerCase()) ? '#D1FAE5' : ['closed', 'rejected'].includes((value || '').toLowerCase()) ? '#FEE2E2' : '#FEF3C7';

export default function DigitalTwinScreen() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/login'); return; }
      const response = await fetch(`${NODE_API_URL}/api/digital-twin/overview`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.status === 401) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('isLoggedIn');
        router.replace('/login');
        return;
      }
      if (!response.ok) throw new Error(data.message || 'Unable to load Digital Twin overview.');
      setOverview(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to the Node backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const stats = overview?.statistics || {};
  const hierarchy = overview?.campusHierarchy || [];

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOverview(true)} />}>
      <Pressable onPress={() => router.back()} style={s.back}><Text style={s.backText}>‹ Back</Text></Pressable>
      <View style={s.hero}>
        <Text style={s.eyebrow}>SMART CAMPUS • LIVE OVERVIEW</Text>
        <Text style={s.heroTitle}>{overview?.campus || 'Campus Digital Twin'}</Text>
        <Text style={s.heroSubtitle}>A live view of campus buildings, rooms, facilities, complaints and maintenance.</Text>
        <View style={s.live}><View style={s.dot} /><Text style={s.liveText}>MongoDB connected view</Text></View>
      </View>

      {loading ? <View style={s.center}><ActivityIndicator size="large" color="#2563EB" /><Text style={s.muted}>Loading live campus data...</Text></View> :
      error ? <View style={s.error}><Text style={s.errorTitle}>Digital Twin data could not be loaded</Text><Text style={s.errorText}>{error}</Text><Pressable style={s.retry} onPress={() => loadOverview()}><Text style={s.retryText}>Try Again</Text></Pressable></View> :
      <>
        <View style={s.sectionRow}><View style={{ flex: 1 }}><Text style={s.sectionTitle}>Campus at a glance</Text><Text style={s.muted}>Live counts from your Node.js API and MongoDB.</Text></View><Pressable style={s.refresh} onPress={() => loadOverview(true)}><Text style={s.refreshText}>↻ Refresh</Text></Pressable></View>
        <View style={s.grid}>
          {statCards.map(card => <View key={card.key} style={s.statCard}><View style={[s.statIcon, { backgroundColor: card.color }]}><Text style={{ fontSize: 22 }}>{card.icon}</Text></View><Text style={s.statNumber}>{stats[card.key] ?? 0}</Text><Text style={s.statLabel}>{card.label}</Text></View>)}
        </View>

        <View style={s.section}><Text style={s.sectionTitle}>Campus hierarchy</Text><Text style={s.muted}>Buildings and their connected departments, rooms and facilities.</Text></View>
        {hierarchy.length === 0 ? <View style={s.empty}><Text style={s.cardTitle}>No campus hierarchy found</Text><Text style={s.muted}>Add buildings and campus spaces to display them here.</Text></View> :
          hierarchy.map((item, i) => {
            const b = item.building || {};
            const departments = item.departments || [];
            const rooms = item.rooms || [];
            const facilities = item.facilities || [];
            return <View key={b._id || b.code || i} style={s.building}>
              <View style={s.buildingTop}><View style={s.buildingIcon}><Text style={{ fontSize: 25 }}>🏢</Text></View><View style={{ flex: 1 }}><Text style={s.buildingTitle}>{b.name || 'Unnamed Building'}</Text><Text style={s.muted}>{b.code || 'No code'} · {b.location || 'Location not specified'}</Text>{!!b.description && <Text style={s.body}>{b.description}</Text>}</View><View style={[s.status, { backgroundColor: statusColor(b.status) }]}><Text style={s.statusText}>{titleCase(b.status || 'active')}</Text></View></View>
              <View style={s.facts}><Text style={s.fact}>🏬 {b.floors ?? 0} floors</Text><Text style={s.fact}>🎓 {departments.length} departments</Text><Text style={s.fact}>🚪 {rooms.length} rooms</Text><Text style={s.fact}>🧰 {facilities.length} facilities</Text></View>
              {departments.length > 0 && <View style={s.subsection}><Text style={s.subTitle}>Departments</Text><View style={s.chips}>{departments.map((d, j) => <View key={d._id || d.code || j} style={s.chip}><Text style={s.chipTitle}>{d.name || 'Department'}</Text>{!!d.code && <Text style={s.muted}>{d.code}</Text>}{!!d.head && <Text style={s.muted}>Head: {d.head}</Text>}</View>)}</View></View>}
              {rooms.length > 0 && <View style={s.subsection}><Text style={s.subTitle}>Rooms</Text>{rooms.map((r, j) => <View key={r._id || r.roomNumber || j} style={s.itemRow}><Text style={s.itemIcon}>🚪</Text><View style={{ flex: 1 }}><Text style={s.itemTitle}>{r.name || 'Room'}{r.roomNumber ? ` · ${r.roomNumber}` : ''}</Text><Text style={s.muted}>{titleCase(r.type)} · Floor {r.floor ?? '—'} · Capacity {r.capacity ?? 0}</Text></View><View style={[s.status, { backgroundColor: statusColor(r.status) }]}><Text style={s.statusText}>{titleCase(r.status)}</Text></View></View>)}</View>}
              {facilities.length > 0 && <View style={s.subsection}><Text style={s.subTitle}>Facilities</Text>{facilities.map((f, j) => <View key={f._id || f.name || j} style={s.itemRow}><Text style={s.itemIcon}>🧰</Text><View style={{ flex: 1 }}><Text style={s.itemTitle}>{f.name || 'Facility'}</Text><Text style={s.muted}>{titleCase(f.type || f.description)}{f.location ? ` · ${f.location}` : ''}</Text></View><View style={[s.status, { backgroundColor: statusColor(f.status) }]}><Text style={s.statusText}>{titleCase(f.status)}</Text></View></View>)}</View>}
            </View>;
          })}
        <View style={s.footer}><Text style={s.subTitle}>Data source</Text><Text style={s.muted}>Node.js / Express · MongoDB · /api/digital-twin/overview</Text><Text style={s.muted}>Last refreshed: {new Date().toLocaleString()}</Text><Pressable style={s.refreshFooter} onPress={() => loadOverview(true)}><Text style={s.refreshText}>Refresh campus data ↻</Text></Pressable></View>
      </>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7FC' }, content: { padding: 28, paddingBottom: 55 },
  back: { alignSelf: 'flex-start', marginBottom: 20 }, backText: { color: '#2563EB', fontSize: 16, fontWeight: '700' },
  hero: { backgroundColor: '#0F172A', borderRadius: 24, padding: 30, marginBottom: 28 },
  eyebrow: { color: '#93C5FD', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', marginTop: 10 },
  heroSubtitle: { color: '#CBD5E1', fontSize: 16, lineHeight: 24, marginTop: 8, maxWidth: 800 },
  live: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, backgroundColor: '#1E293B', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' }, liveText: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
  center: { alignItems: 'center', paddingVertical: 80 }, muted: { color: '#64748B', fontSize: 13, lineHeight: 20, marginTop: 4 },
  error: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, padding: 22, borderRadius: 18 },
  errorTitle: { color: '#991B1B', fontSize: 19, fontWeight: '800' }, errorText: { color: '#7F1D1D', marginTop: 8 },
  retry: { alignSelf: 'flex-start', backgroundColor: '#DC2626', padding: 12, borderRadius: 10, marginTop: 15 }, retryText: { color: '#FFFFFF', fontWeight: '800' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16 },
  section: { marginTop: 34, marginBottom: 16 }, sectionTitle: { color: '#0F172A', fontSize: 24, fontWeight: '900' },
  refresh: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 11 }, refreshText: { color: '#2563EB', fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 }, statCard: { flexGrow: 1, flexBasis: 190, minWidth: 155, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  statIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, statNumber: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginTop: 14 }, statLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginTop: 3 },
  building: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, padding: 22, marginBottom: 18 },
  buildingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 }, buildingIcon: { width: 54, height: 54, borderRadius: 15, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  buildingTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' }, body: { color: '#475569', marginTop: 7, lineHeight: 21 },
  status: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, alignSelf: 'flex-start' }, statusText: { color: '#334155', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingVertical: 17, marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  fact: { backgroundColor: '#F8FAFC', color: '#475569', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, fontSize: 12, fontWeight: '700' },
  subsection: { marginTop: 20 }, subTitle: { color: '#334155', fontSize: 15, fontWeight: '900', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, chip: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 13, minWidth: 170 },
  chipTitle: { color: '#0F172A', fontWeight: '800' }, itemRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemIcon: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10 }, itemTitle: { color: '#0F172A', fontWeight: '800' },
  empty: { backgroundColor: '#FFFFFF', padding: 26, borderRadius: 18, alignItems: 'center' }, cardTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  footer: { marginTop: 15, padding: 22, backgroundColor: '#EAF0F9', borderRadius: 18 }, refreshFooter: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: '#DBEAFE', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10 },
});
