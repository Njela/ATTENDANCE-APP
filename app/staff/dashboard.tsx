import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { Card } from '../../src/components/ui/Card';
import { JkuatMapPicker } from '../../src/components/staff/JkuatMapPicker';
import { fetchStaffProfile, getSession, logout } from '../../src/services/authService';
import {
  staffAttendanceOverview,
  staffListClasses,
  staffSetAttendancePeriod,
  staffSetWeekActive,
  staffUpsertClass,
  type RecentMark,
  type StaffCourseClass,
  type WeekOverview,
} from '../../src/services/staffService';
import { theme } from '../../src/theme/tokens';
import { JKUAT_CAMPUS } from '../../src/utils/jkuatCampus';

const WEEKS = Array.from({ length: 14 }, (_, i) => i + 1);

export default function StaffDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [classes, setClasses] = useState<StaffCourseClass[]>([]);
  const [weekStats, setWeekStats] = useState<WeekOverview[]>([]);
  const [recent, setRecent] = useState<RecentMark[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editWeek, setEditWeek] = useState(1);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formStart, setFormStart] = useState('9:00am');
  const [formEnd, setFormEnd] = useState('11:00am');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');
  const [formRadius, setFormRadius] = useState('50');
  const [formActive, setFormActive] = useState(true);
  const [formPeriodOpen, setFormPeriodOpen] = useState(false);

  const snapshot = useMemo(() => {
    let present = 0;
    let absent = 0;
    let marked = 0;
    weekStats.forEach((w) => {
      present += w.present;
      absent += w.absent;
      marked += w.marked;
    });
    const denom = present + absent;
    const rate = denom > 0 ? Math.round((100 * present) / denom) : 0;
    return { present, absent, marked, rate };
  }, [weekStats]);

  const byWeek = useMemo(() => {
    const m = new Map<number, StaffCourseClass>();
    classes.forEach((c) => m.set(c.week_number, c));
    return m;
  }, [classes]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        router.replace('/staff/login');
        return;
      }
      const profile = await fetchStaffProfile(session.user.id);
      setStaffName(profile?.full_name ?? 'Staff');

      const [listRes, overRes] = await Promise.all([staffListClasses(), staffAttendanceOverview()]);
      if (!listRes.ok) {
        Alert.alert('Could not load classes', listRes.error ?? '');
        return;
      }
      if (!overRes.ok) {
        Alert.alert('Could not load overview', overRes.error ?? '');
      }
      setClasses(listRes.classes ?? []);
      setWeekStats(overRes.weeks ?? []);
      setRecent(overRes.recent ?? []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (week: number) => {
    const row = byWeek.get(week);
    setEditWeek(week);
    setFormName(row?.name ?? `Week ${week}`);
    setFormCode(row?.code ?? 'CS101');
    setFormRoom(row?.room ?? 'TBA');
    setFormStart(row?.start_time ?? '9:00am');
    setFormEnd(row?.end_time ?? '11:00am');
    setFormLat(row != null ? String(row.latitude) : String(JKUAT_CAMPUS.latitude));
    setFormLng(row != null ? String(row.longitude) : String(JKUAT_CAMPUS.longitude));
    setFormRadius(String(row?.geofence_radius_m ?? 50));
    setFormActive(row?.is_active ?? true);
    setFormPeriodOpen(row?.attendance_period_open ?? false);
    setEditOpen(true);
  };

  const saveClass = async () => {
    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    const radius = parseInt(formRadius, 10);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert('Coordinates', 'Enter valid latitude and longitude.');
      return;
    }
    if (Number.isNaN(radius) || radius < 10) {
      Alert.alert('Radius', 'Use a radius of at least 10 metres.');
      return;
    }
    const res = await staffUpsertClass({
      week_number: editWeek,
      name: formName,
      code: formCode,
      room: formRoom,
      start_time: formStart,
      end_time: formEnd,
      latitude: lat,
      longitude: lng,
      geofence_radius_m: radius,
      is_active: formActive,
      attendance_period_open: formPeriodOpen,
    });
    if (!res.ok) {
      Alert.alert('Save failed', res.error ?? '');
      return;
    }
    setEditOpen(false);
    await load(true);
  };

  const toggleActive = async (week: number, value: boolean) => {
    const row = byWeek.get(week);
    if (!row) {
      Alert.alert('Add class first', 'Use Edit to create this week before toggling active.');
      return;
    }
    const res = await staffSetWeekActive(week, value);
    if (!res.ok) {
      Alert.alert('Update failed', res.error ?? '');
    }
    await load(true);
  };

  const togglePeriod = async (week: number, value: boolean) => {
    const row = byWeek.get(week);
    if (!row) {
      Alert.alert('Add class first', 'Use Edit to create this week before opening registration.');
      return;
    }
    const res = await staffSetAttendancePeriod(week, value);
    if (!res.ok) {
      Alert.alert('Update failed', res.error ?? '');
    }
    await load(true);
  };

  const statForWeek = (w: number) => weekStats.find((s) => s.week_number === w);

  return (
    <Screen edges={['top']}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>AttendTrack</Text>
          <Text style={styles.h1}>Lecturer dashboard</Text>
          <Text style={styles.muted}>{staffName}</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable onPress={() => void load(true)} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="refresh" size={22} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={() => {
              void logout().then(() => router.replace('/staff/login'));
            }}
            style={styles.iconBtn}
            hitSlop={10}
          >
            <Ionicons name="log-out-outline" size={22} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading dashboard…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
        >
          <Text style={styles.section}>Analytics snapshot</Text>
          <Card style={{ marginBottom: theme.space.lg }}>
            <Text style={styles.snapshotLine}>
              Present marks (all weeks): <Text style={styles.snapshotEm}>{snapshot.present}</Text>
            </Text>
            <Text style={styles.snapshotLine}>
              Absent records: <Text style={styles.snapshotEm}>{snapshot.absent}</Text>
            </Text>
            <Text style={styles.snapshotLine}>
              Total rows with a mark time: <Text style={styles.snapshotEm}>{snapshot.marked}</Text>
            </Text>
            <Text style={[styles.snapshotLine, { marginTop: theme.space.sm }]}>
              Present rate (present ÷ present+absent):{' '}
              <Text style={styles.snapshotEm}>{snapshot.rate}%</Text>
            </Text>
          </Card>

          <Text style={styles.section}>Weekly classes (JKUAT)</Text>
          <Text style={styles.hint}>
            Use Edit to place the pin on campus and set the geofence. “Active” selects this week for
            the timetable. “Registration” opens or closes when students may check in with GPS.
          </Text>
          {WEEKS.map((w) => {
            const row = byWeek.get(w);
            const st = statForWeek(w);
            return (
              <View key={w} style={styles.weekBlock}>
                <View style={styles.weekHead}>
                  <Text style={styles.weekTitle}>Week {w}</Text>
                  <Pressable style={styles.editBtn} onPress={() => openEdit(w)}>
                    <Text style={styles.editBtnText}>Edit & map</Text>
                  </Pressable>
                </View>
                <Text style={styles.weekSub}>
                  {row ? `${row.name} · ${row.room}` : 'Not configured — tap Edit to add this week'}
                  {st ? ` · marks ${st.marked} (P${st.present}/A${st.absent})` : ''}
                </Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Active (timetable)</Text>
                  <Switch
                    disabled={!row}
                    value={row?.is_active ?? false}
                    onValueChange={(v) => void toggleActive(w, v)}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Registration open</Text>
                  <Switch
                    disabled={!row}
                    value={row?.attendance_period_open ?? false}
                    onValueChange={(v) => void togglePeriod(w, v)}
                  />
                </View>
              </View>
            );
          })}

          {recent.length > 0 ? (
            <>
              <Text style={[styles.section, styles.sectionSpaced]}>Recent check-ins</Text>
              {recent.slice(0, 15).map((r) => (
                <Text key={r.id} style={styles.recentLine}>
                  W{r.week_number} · {r.student_id} · {r.status}
                  {r.marked_at ? ` · ${new Date(r.marked_at).toLocaleString()}` : ''}
                </Text>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalWrap}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Week {editWeek}</Text>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.modalScrollTop}
                contentContainerStyle={styles.modalScrollContent}
              >
                <TextField label="Class name" value={formName} onChangeText={setFormName} icon="book-outline" />
                <TextField label="Code" value={formCode} onChangeText={setFormCode} icon="pricetag-outline" />
                <TextField label="Room" value={formRoom} onChangeText={setFormRoom} icon="location-outline" />
                <TextField label="Start" value={formStart} onChangeText={setFormStart} icon="time-outline" />
                <TextField label="End" value={formEnd} onChangeText={setFormEnd} icon="time-outline" />
              </ScrollView>
              <Text style={styles.mapSectionLabel}>Campus map (pin & circle)</Text>
              <View style={styles.mapSlot} collapsable={false}>
                <JkuatMapPicker
                  layoutKey={editOpen ? `week-${editWeek}` : 'closed'}
                  latitude={parseFloat(formLat) || JKUAT_CAMPUS.latitude}
                  longitude={parseFloat(formLng) || JKUAT_CAMPUS.longitude}
                  radiusM={Math.max(10, parseInt(formRadius, 10) || 50)}
                  onChange={(lat: number, lng: number) => {
                    setFormLat(lat.toFixed(6));
                    setFormLng(lng.toFixed(6));
                  }}
                />
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                style={styles.modalScrollBottom}
                contentContainerStyle={styles.modalScrollContent}
              >
                <TextField
                  label="Latitude"
                  value={formLat}
                  onChangeText={setFormLat}
                  icon="map-outline"
                  keyboardType="numbers-and-punctuation"
                />
                <TextField
                  label="Longitude"
                  value={formLng}
                  onChangeText={setFormLng}
                  icon="map-outline"
                  keyboardType="numbers-and-punctuation"
                />
                <TextField
                  label="Geofence (m)"
                  value={formRadius}
                  onChangeText={setFormRadius}
                  icon="radio-outline"
                  keyboardType="number-pad"
                />
                <View style={styles.activeRow}>
                  <Text style={styles.activeLabel}>Active on timetable</Text>
                  <Switch value={formActive} onValueChange={setFormActive} />
                </View>
                <View style={styles.activeRow}>
                  <Text style={styles.activeLabel}>Registration open (students can check in)</Text>
                  <Switch value={formPeriodOpen} onValueChange={setFormPeriodOpen} />
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Cancel"
                  variant="secondary"
                  style={styles.modalBtn}
                  onPress={() => setEditOpen(false)}
                />
                <PrimaryButton title="Save" style={styles.modalBtn} onPress={() => void saveClass()} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.space.xl,
  },
  loadingText: { marginTop: theme.space.md, color: theme.colors.textMuted, fontSize: theme.font.small },
  pad: { paddingHorizontal: theme.space.xl },
  scroll: { paddingHorizontal: theme.space.xl, paddingBottom: 48 },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.space.xl,
    paddingTop: 16,
    paddingBottom: 12,
  },
  kicker: { fontSize: theme.font.micro, color: theme.colors.textMuted, textTransform: 'uppercase' },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
  muted: { color: theme.colors.textMuted, marginTop: 4, fontSize: theme.font.small },
  topActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  section: {
    fontSize: theme.font.small,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.space.md,
  },
  sectionSpaced: { marginTop: theme.space.xl },
  hint: {
    fontSize: theme.font.micro,
    color: theme.colors.textMuted,
    marginBottom: theme.space.lg,
    lineHeight: 18,
  },
  snapshotLine: { fontSize: theme.font.small, color: theme.colors.textMuted, marginBottom: 4 },
  snapshotEm: { fontWeight: '700', color: theme.colors.text },
  weekBlock: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    marginBottom: theme.space.md,
    backgroundColor: theme.colors.surface,
  },
  weekHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.space.sm,
  },
  switchLabel: { fontSize: theme.font.small, color: theme.colors.text, flex: 1, paddingRight: 12 },
  weekTitle: { fontWeight: '600', color: theme.colors.text },
  weekSub: { color: theme.colors.textMuted, fontSize: theme.font.micro, marginTop: 2 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  editBtnText: { color: theme.colors.accent, fontWeight: '600', fontSize: theme.font.small },
  recentLine: {
    fontSize: theme.font.micro,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalKeyboard: { maxHeight: '92%', width: '100%' },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.space.xl,
    paddingBottom: theme.space.md,
    maxHeight: '92%',
  },
  modalScrollTop: { maxHeight: 220 },
  modalScrollBottom: { maxHeight: 280 },
  modalScrollContent: { paddingBottom: theme.space.sm },
  mapSectionLabel: {
    fontSize: theme.font.micro,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: theme.space.xs,
    marginTop: theme.space.sm,
  },
  mapSlot: {
    marginBottom: theme.space.md,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  modalTitle: { fontSize: theme.font.title, fontWeight: '700', marginBottom: theme.space.md },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: theme.space.md,
  },
  activeLabel: { fontWeight: '600', color: theme.colors.text },
  modalActions: { flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.lg },
  modalBtn: { flex: 1 },
});
