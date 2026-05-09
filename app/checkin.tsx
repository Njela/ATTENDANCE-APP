import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { getStudent, logout } from '../src/services/authService';
import { COLORS, GEOFENCE_RADIUS } from '../src/utils/constants';

const CLASS_LOCATION = { latitude: -1.2864, longitude: 36.8172 };

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CheckInScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [insideZone, setInsideZone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [attended, setAttended] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    loadStudent();
    getLocation();
  }, []);

  const loadStudent = async () => {
    const data = await getStudent();
    setStudent(data);
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required.');
      setLoading(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);
    const dist = getDistance(
      loc.coords.latitude, loc.coords.longitude,
      CLASS_LOCATION.latitude, CLASS_LOCATION.longitude
    );
    setDistance(Math.round(dist));
    setInsideZone(dist <= GEOFENCE_RADIUS);
    setLoading(false);
  };

  const handleMarkAttendance = async () => {
    if (!insideZone) {
      Alert.alert('Outside Geofence', 'You must be within the classroom to mark attendance.');
      return;
    }
    setMarking(true);
    setTimeout(() => {
      setMarking(false);
      setAttended(true);
      Alert.alert('Success ✅', 'Attendance marked successfully!');
    }, 1500);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            setProfileVisible(false);
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>GPS Check-in</Text>
          <Text style={styles.headerSub}>
            Welcome, {student?.name || 'Student'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => setProfileVisible(true)}
        >
          <Ionicons name="person" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>

        {/* Map Placeholder */}
        <View style={styles.mapBox}>
          <View style={styles.mapInner}>
            <View style={styles.geofenceCircle}>
              <View style={styles.pinDot} />
            </View>
            <View style={styles.gpsBadge}>
              <View style={styles.gpsDot} />
              <Text style={styles.gpsText}>Active</Text>
            </View>
            <View style={styles.radiusLabel}>
              <Text style={styles.radiusText}>
                Geofence radius: {GEOFENCE_RADIUS}m
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>

          {/* Class Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>CLASS INFO</Text>
              <View style={styles.sessionBadge}>
                <Text style={styles.sessionText}>In Session</Text>
              </View>
            </View>
            <Text style={styles.className}>Mobile Computing — SMA2418</Text>
            <Text style={styles.classTime}>PAM Lab B · 8:00am – 11:00am</Text>
          </View>

          {/* Location Status */}
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.statusRow}>
              <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Your Location</Text>
                <Text style={[
                  styles.statusValue,
                  { color: insideZone ? COLORS.success : COLORS.danger }
                ]}>
                  {insideZone ? 'Inside Zone' : 'Outside Zone'}
                </Text>
              </View>
              <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Distance</Text>
                <Text style={styles.statusValue}>
                  {distance !== null ? `${distance}m Away` : '—'}
                </Text>
              </View>
            </View>
          )}

          {/* Mark Attendance Button */}
          <TouchableOpacity
            style={[styles.markBtn, attended && styles.markBtnDone]}
            onPress={handleMarkAttendance}
            disabled={marking || attended}
          >
            {marking ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name={attended ? 'checkmark-circle' : 'location'}
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.markText}>
                  {attended ? 'Attendance Marked ✓' : 'Mark Attendance'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Warning Banner */}
          <View style={styles.warning}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#F57C00"
            />
            <Text style={styles.warningText}>
              You must be within the geofence to mark attendance.
              Proxy sign-ins are not permitted.
            </Text>
          </View>

        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/checkin')}
        >
          <Ionicons name="location" size={22} color={COLORS.primary} />
          <Text style={[styles.navLabel, { color: COLORS.primary }]}>
            Check-in
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/reports')}
        >
          <Ionicons name="document-text-outline" size={22} color={COLORS.muted} />
          <Text style={styles.navLabel}>Reports</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Modal */}
      <Modal
        visible={profileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfileVisible(false)}
        >
          <View style={styles.modalCard}>

            {/* Profile Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalAvatar}>
                <Ionicons name="person" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.modalName}>
                {student?.name || 'Student'}
              </Text>
              <Text style={styles.modalId}>
                {student?.studentId || '—'}
              </Text>
              <Text style={styles.modalCourse}>
                {student?.course || 'Mobile Computing'}
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.modalDivider} />

            {/* Options */}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setProfileVisible(false);
                router.push('/reports');
              }}
            >
              <View style={styles.modalOptionIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.modalOptionText}>View Reports</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.muted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setProfileVisible(false);
                router.push('/checkin');
              }}
            >
              <View style={styles.modalOptionIcon}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.modalOptionText}>GPS Check-in</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.muted}
              />
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleLogout}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={COLORS.danger}
                />
              </View>
              <Text style={[styles.modalOptionText, { color: COLORS.danger }]}>
                Logout
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.muted}
              />
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setProfileVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 48,
  },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  mapBox: { height: 200, backgroundColor: '#C8E6C8' },
  mapInner: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', position: 'relative',
  },
  geofenceCircle: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: COLORS.primary,
    borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(26,60,143,0.1)',
  },
  pinDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.primary,
    borderWidth: 3, borderColor: COLORS.white,
  },
  gpsBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.white, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  gpsDot: {
    width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#4CAF50',
  },
  gpsText: { fontSize: 10, color: '#2E7D32', fontWeight: '500' },
  radiusLabel: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: COLORS.white, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  radiusText: { fontSize: 10, color: '#555' },
  body: { padding: 16 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10, padding: 14, marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', marginBottom: 6,
  },
  cardLabel: {
    fontSize: 10, color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sessionBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2,
  },
  sessionText: { fontSize: 10, color: COLORS.success, fontWeight: '500' },
  className: { fontSize: 14, fontWeight: '600', color: '#333' },
  classTime: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statusCard: {
    flex: 1, backgroundColor: COLORS.white,
    borderRadius: 10, padding: 12,
  },
  statusLabel: { fontSize: 10, color: COLORS.muted, marginBottom: 4 },
  statusValue: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  markBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingVertical: 14, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    gap: 8, marginBottom: 12,
  },
  markBtnDone: { backgroundColor: COLORS.success },
  markText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  warning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1, borderColor: '#FFB74D',
    borderRadius: 8, padding: 10,
    backgroundColor: '#FFF8F0',
  },
  warningText: { flex: 1, fontSize: 11, color: '#E65100', lineHeight: 16 },
  navBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    height: 60, paddingBottom: 8,
  },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 10, color: COLORS.muted, marginTop: 2 },

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    alignItems: 'center', paddingVertical: 24,
  },
  modalAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  modalName: {
    fontSize: 18, fontWeight: '600', color: '#333',
  },
  modalId: {
    fontSize: 13, color: COLORS.muted, marginTop: 4,
  },
  modalCourse: {
    fontSize: 12, color: COLORS.primary,
    marginTop: 4, fontWeight: '500',
  },
  modalDivider: {
    height: 1, backgroundColor: COLORS.border,
    marginHorizontal: 16, marginVertical: 4,
  },
  modalOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 12,
  },
  modalOptionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center', alignItems: 'center',
  },
  modalOptionText: {
    flex: 1, fontSize: 15, color: '#333', fontWeight: '500',
  },
  modalClose: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10, paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 15, color: COLORS.muted, fontWeight: '500',
  },
});