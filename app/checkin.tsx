import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomTabBar } from '../src/components/ui/BottomTabBar';
import { Card } from '../src/components/ui/Card';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { Screen } from '../src/components/ui/Screen';
import { fetchActiveClassForWeek, markAttendance } from '../src/services/attendanceService';
import {
  fetchIsStaff,
  getSession,
  getStudent,
  logout,
  type StudentProfile,
} from '../src/services/authService';
import { SEMESTER_WEEKS, theme } from '../src/utils/constants';

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CheckInScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [week, setWeek] = useState(1);
  const [klass, setKlass] = useState<Awaited<ReturnType<typeof fetchActiveClassForWeek>>>(null);
  const [loc, setLoc] = useState<Location.LocationObject | null>(null);
  const [distPreview, setDistPreview] = useState<number | null>(null);
  const [insidePreview, setInsidePreview] = useState(false);
  const [locLoading, setLocLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfile(await getStudent());
  }, []);

  const loadClass = useCallback(async (w: number) => {
    setClassLoading(true);
    try {
      const row = await fetchActiveClassForWeek(w);
      setKlass(row);
    } finally {
      setClassLoading(false);
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    setLocLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location', 'Allow location to verify classroom attendance.');
      setLoc(null);
      setDistPreview(null);
      setInsidePreview(false);
      setLocLoading(false);
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLoc(position);
    setLocLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
    void refreshLocation();
  }, [loadProfile, refreshLocation]);

  useEffect(() => {
    void loadClass(week);
  }, [week, loadClass]);

  useEffect(() => {
    if (!loc || !klass) {
      setDistPreview(null);
      setInsidePreview(false);
      return;
    }
    const d = haversineM(
      loc.coords.latitude,
      loc.coords.longitude,
      klass.latitude,
      klass.longitude
    );
    setDistPreview(Math.round(d));
    setInsidePreview(d <= klass.geofence_radius_m);
  }, [loc, klass]);

  const handleMark = async () => {
    if (!loc) {
      Alert.alert('Location', 'Waiting for GPS fix. Try again.');
      return;
    }
    if (!klass) {
      Alert.alert('No class', 'There is no active class for this week in the system.');
      return;
    }
    if (klass.attendance_period_open !== true) {
      Alert.alert(
        'Registration closed',
        'Your lecturer has not opened attendance for this week yet. Try again after they open registration on the staff dashboard.'
      );
      return;
    }
    setMarking(true);
    try {
      const res = await markAttendance(week, loc.coords.latitude, loc.coords.longitude);
      if (!res.ok) {
        Alert.alert('Could not mark', res.message ?? res.error ?? 'Try again.');
        return;
      }
      Alert.alert('Marked', res.message ?? 'Attendance saved for this week.');
    } finally {
      setMarking(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Leave AttendTrack on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          const session = await getSession();
          const staff = session?.user?.id ? await fetchIsStaff(session.user.id, session) : false;
          await logout();
          setProfileOpen(false);
          router.replace(staff ? '/staff/login' : '/login');
        },
      },
    ]);
  };

  const bumpWeek = (delta: number) => {
    setWeek((w) => Math.min(SEMESTER_WEEKS, Math.max(1, w + delta)));
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Check in</Text>
          <Text style={styles.headerSub}>{profile?.full_name ?? 'Student'}</Text>
        </View>
        <Pressable
          style={styles.avatar}
          onPress={() => setProfileOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Account"
        >
          <Ionicons name="person" size={18} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.weekBar}>
          <Pressable onPress={() => bumpWeek(-1)} style={styles.weekBtn}>
            <Ionicons name="remove" size={22} color={theme.colors.accent} />
          </Pressable>
          <View style={styles.weekMid}>
            <Text style={styles.weekLabel}>Week</Text>
            <Text style={styles.weekNum}>{week}</Text>
            <Text style={styles.weekOf}>of {SEMESTER_WEEKS}</Text>
          </View>
          <Pressable onPress={() => bumpWeek(1)} style={styles.weekBtn}>
            <Ionicons name="add" size={22} color={theme.colors.accent} />
          </Pressable>
        </View>

        <View style={styles.mapCard}>
          <View style={styles.ring}>
            <View style={styles.pin} />
          </View>
          <View style={styles.live}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>GPS</Text>
          </View>
          <Text style={styles.mapCaption}>
            {klass
              ? `Target: class geofence (${klass.geofence_radius_m}m)`
              : 'No active class for this week'}
          </Text>
        </View>

        {classLoading ? (
          <ActivityIndicator style={{ marginVertical: 16 }} color={theme.colors.accent} />
        ) : klass ? (
          <Card style={{ marginBottom: theme.space.lg }}>
            <View style={styles.rowBetween}>
              <Text style={styles.kicker}>This week</Text>
              <View
                style={[
                  styles.badge,
                  klass.attendance_period_open === true ? styles.badgeOk : styles.badgeWarn,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    klass.attendance_period_open === true ? styles.badgeTextOk : styles.badgeTextWarn,
                  ]}
                >
                  {klass.attendance_period_open === true ? 'Registration open' : 'Registration closed'}
                </Text>
              </View>
            </View>
            <Text style={styles.classTitle}>
              {klass.name} · {klass.code}
            </Text>
            <Text style={styles.classMeta}>
              {klass.room} · {klass.start_time} – {klass.end_time}
            </Text>
            {klass.attendance_period_open !== true ? (
              <Text style={styles.periodNote}>
                You cannot mark attendance until your lecturer opens registration for this week.
              </Text>
            ) : null}
          </Card>
        ) : (
          <Card style={{ marginBottom: theme.space.lg }}>
            <Text style={styles.warn}>
              No active class row for week {week}. Add one in Supabase (`attendtrack.course_classes`)
              or pick another week.
            </Text>
          </Card>
        )}

        <View style={styles.statusRow}>
          <Card style={styles.statusCard}>
            <Text style={styles.kicker}>You</Text>
            {locLoading ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : (
              <Text
                style={[
                  styles.statusValue,
                  { color: insidePreview ? theme.colors.success : theme.colors.danger },
                ]}
              >
                {loc ? (insidePreview ? 'Inside zone' : 'Outside zone') : 'No GPS'}
              </Text>
            )}
          </Card>
          <Card style={styles.statusCard}>
            <Text style={styles.kicker}>Distance</Text>
            <Text style={styles.statusValue}>
              {distPreview != null ? `${distPreview} m` : '—'}
            </Text>
          </Card>
        </View>

        <PrimaryButton
          title={marking ? 'Submitting…' : 'Mark attendance'}
          loading={marking}
          onPress={handleMark}
          disabled={
            !klass || !loc || locLoading || klass.attendance_period_open !== true
          }
        />

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.warning} />
          <Text style={styles.noteText}>
            Attendance is verified on the server using your GPS coordinates and the class geofence.
            Proxy sign-in from outside the room is blocked.
          </Text>
        </View>
      </ScrollView>

      <BottomTabBar active="checkin" />

      <Modal visible={profileOpen} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setProfileOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetAvatar}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
            <Text style={styles.sheetName}>{profile?.full_name}</Text>
            <Text style={styles.sheetMeta}>{profile?.student_id}</Text>
            <Text style={styles.sheetCourse}>{profile?.course}</Text>
            <PrimaryButton title="Reports" variant="secondary" onPress={() => { setProfileOpen(false); router.push('/reports'); }} />
            <View style={{ height: 12 }} />
            <PrimaryButton title="Sign out" variant="ghost" onPress={handleLogout} />
            <PrimaryButton title="Close" variant="secondary" onPress={() => setProfileOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.space.xl,
    paddingTop: 12,
    paddingBottom: theme.space.lg,
    backgroundColor: theme.colors.accent,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: theme.font.small, marginTop: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: theme.space.xl, paddingBottom: 120 },
  weekBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.space.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  weekBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekMid: { flex: 1, alignItems: 'center' },
  weekLabel: { fontSize: theme.font.micro, color: theme.colors.textMuted, fontWeight: '600' },
  weekNum: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  weekOf: { fontSize: theme.font.small, color: theme.colors.textMuted },
  mapCard: {
    height: 200,
    borderRadius: theme.radius.lg,
    backgroundColor: '#D8F3E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.lg,
    overflow: 'hidden',
  },
  ring: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,60,143,0.06)',
  },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.accent,
    borderWidth: 3,
    borderColor: '#fff',
  },
  live: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success },
  liveText: { fontSize: 11, fontWeight: '600', color: theme.colors.text },
  mapCaption: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    textAlign: 'center',
    fontSize: theme.font.micro,
    color: theme.colors.textMuted,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  kicker: {
    fontSize: theme.font.micro,
    color: theme.colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeOk: { backgroundColor: theme.colors.successBg },
  badgeWarn: { backgroundColor: '#FFF7ED' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextOk: { color: theme.colors.success },
  badgeTextWarn: { color: theme.colors.warning },
  periodNote: {
    marginTop: theme.space.md,
    fontSize: theme.font.small,
    color: theme.colors.warning,
    lineHeight: 20,
  },
  classTitle: { fontSize: theme.font.subtitle, fontWeight: '700', color: theme.colors.text },
  classMeta: { marginTop: 4, color: theme.colors.textMuted, fontSize: theme.font.small },
  warn: { color: theme.colors.textMuted, lineHeight: 20 },
  statusRow: { flexDirection: 'row', gap: theme.space.md, marginBottom: theme.space.lg },
  statusCard: { flex: 1, padding: theme.space.md },
  statusValue: { marginTop: 8, fontSize: theme.font.subtitle, fontWeight: '700', color: theme.colors.accent },
  note: {
    flexDirection: 'row',
    gap: 10,
    marginTop: theme.space.xl,
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  noteText: { flex: 1, color: theme.colors.warning, fontSize: theme.font.small, lineHeight: 20 },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: theme.space.xl,
    paddingBottom: 32,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.space.lg,
  },
  sheetAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.accent,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.md,
  },
  sheetName: { textAlign: 'center', fontSize: 20, fontWeight: '700', color: theme.colors.text },
  sheetMeta: { textAlign: 'center', color: theme.colors.textMuted, marginTop: 4 },
  sheetCourse: {
    textAlign: 'center',
    color: theme.colors.accent,
    fontWeight: '600',
    marginBottom: theme.space.lg,
  },
});
