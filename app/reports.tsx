import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomTabBar } from '../src/components/ui/BottomTabBar';
import { Card } from '../src/components/ui/Card';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { Screen } from '../src/components/ui/Screen';
import { StatusPill } from '../src/components/ui/StatusPill';
import {
  getMyAttendanceReport,
  type ReportResult,
  type WeeklyRow,
} from '../src/services/attendanceService';
import { getStudent, type StudentProfile } from '../src/services/authService';
import { theme } from '../src/theme/tokens';

export default function ReportsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    const r = await getMyAttendanceReport();
    setReport(r);
  }, []);

  useEffect(() => {
    void getStudent().then(setProfile);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await load();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const retry = useCallback(async () => {
    setLoading(true);
    await load();
    setLoading(false);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    void getStudent().then(setProfile);
    setRefreshing(false);
  };

  const weekly: WeeklyRow[] = report?.weeklyData ?? [];
  const summary = report?.summary;
  const recent = (report?.recentSessions ?? []) as Record<string, unknown>[];

  const rows = showAll ? [...weekly].reverse() : [...weekly].slice(-5).reverse();

  const exportPdf = async () => {
    if (!report?.ok || !summary) {
      Alert.alert('Nothing to export', 'Load your report first.');
      return;
    }
    setExporting(true);
    try {
      const rowsHtml = weekly
        .map(
          (w) =>
            `<tr><td>${w.week}</td><td>${w.status}</td><td>${w.time}</td></tr>`
        )
        .join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
        body{font-family:system-ui;padding:24px;color:#111;}
        h1{font-size:20px;} table{border-collapse:collapse;width:100%;margin-top:16px;}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px;}
        th{background:#f3f4f6;}
      </style></head><body>
        <h1>AttendTrack — Attendance report</h1>
        <p>Present: ${summary.present} · Absent: ${summary.absent} · Rate: ${String(summary.rate)}%</p>
        <table><thead><tr><th>Week</th><th>Status</th><th>Time</th></tr></thead>
        <tbody>${rowsHtml}</tbody></table>
      </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        Alert.alert('Exported', `PDF saved to ${uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSub}>
            14-week overview · {profile?.full_name ?? 'Student'}
          </Text>
        </View>
        <Pressable
          style={styles.headerBtn}
          onPress={() => router.replace('/checkin')}
          accessibilityRole="button"
          accessibilityLabel="Go to check-in"
        >
          <Ionicons name="navigate" size={20} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : !report?.ok ? (
        <View style={styles.center}>
          <Text style={styles.err}>{report?.error ?? 'Could not load report.'}</Text>
          <PrimaryButton title="Retry" onPress={() => void retry()} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.summaryRow}>
            <Card style={[styles.sumCard, { backgroundColor: theme.colors.successBg }]}>
              <Text style={[styles.sumNum, { color: '#0f766e' }]}>{summary?.present ?? 0}</Text>
              <Text style={styles.sumLabel}>Present</Text>
            </Card>
            <Card style={[styles.sumCard, { backgroundColor: theme.colors.dangerBg }]}>
              <Text style={[styles.sumNum, { color: '#991b1b' }]}>{summary?.absent ?? 0}</Text>
              <Text style={styles.sumLabel}>Absent</Text>
            </Card>
            <Card style={[styles.sumCard, { backgroundColor: '#E0E7FF' }]}>
              <Text style={[styles.sumNum, { color: '#3730a3' }]}>{summary?.rate ?? '0'}%</Text>
              <Text style={styles.sumLabel}>Rate</Text>
            </Card>
          </View>

          <Card style={{ marginBottom: theme.space.lg }}>
            <Text style={styles.chartTitle}>Semester (weeks 1–14)</Text>
            <View style={styles.chart}>
              {weekly.map((item) => (
                <View key={item.week} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: item.status === 'present' ? 52 : 14,
                        backgroundColor:
                          item.status === 'present' ? theme.colors.accent : theme.colors.danger,
                      },
                    ]}
                  />
                  <Text style={styles.barLab}>{item.week}</Text>
                </View>
              ))}
            </View>
          </Card>

          <View style={styles.tableHead}>
            <Text style={styles.sectionTitle}>Sessions</Text>
            <Pressable onPress={() => setShowAll((v) => !v)}>
              <Text style={styles.link}>{showAll ? 'Less' : 'All weeks'}</Text>
            </Pressable>
          </View>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <View style={styles.trHead}>
              <Text style={[styles.th, { flex: 1.2 }]}>Week</Text>
              <Text style={[styles.th, { flex: 1.4 }]}>Status</Text>
              <Text style={[styles.th, { flex: 1.2 }]}>Time</Text>
            </View>
            {rows.map((item, i) => (
              <View
                key={`${item.week}-${i}`}
                style={[styles.tr, i < rows.length - 1 && styles.trBorder]}
              >
                <Text style={[styles.td, { flex: 1.2 }]}>W{item.week}</Text>
                <View style={{ flex: 1.4 }}>
                  <StatusPill status={item.status} compact />
                </View>
                <Text style={[styles.td, { flex: 1.2 }]}>{item.time}</Text>
              </View>
            ))}
          </Card>

          {recent.length > 0 ? (
            <Card style={{ marginTop: theme.space.lg }}>
              <Text style={styles.sectionTitle}>Recent marks</Text>
              {recent.map((r, idx) => {
                const cls = r.class as Record<string, string> | undefined;
                const rowKey = r.id != null ? String(r.id) : `recent-${idx}`;
                return (
                  <Text key={rowKey} style={styles.recentLine}>
                    Week {String(r.week_number)} · {cls?.name ?? 'Class'} ·{' '}
                    {r.marked_at ? new Date(String(r.marked_at)).toLocaleString() : '—'}
                  </Text>
                );
              })}
            </Card>
          ) : null}

          <PrimaryButton
            title={exporting ? 'Preparing PDF…' : 'Export PDF'}
            variant="secondary"
            loading={exporting}
            onPress={exportPdf}
            style={{ marginTop: theme.space.lg }}
          />
        </ScrollView>
      )}

      <BottomTabBar active="reports" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl,
    paddingTop: 12,
    paddingBottom: theme.space.lg,
    backgroundColor: theme.colors.accent,
  },
  headerText: { flex: 1, paddingRight: theme.space.md },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', marginTop: 2, fontSize: theme.font.small },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  err: { color: theme.colors.danger, textAlign: 'center' },
  body: { padding: theme.space.xl, paddingBottom: 120 },
  summaryRow: { flexDirection: 'row', gap: theme.space.md, marginBottom: theme.space.lg },
  sumCard: { flex: 1, alignItems: 'center', paddingVertical: theme.space.md },
  sumNum: { fontSize: 22, fontWeight: '800' },
  sumLabel: { marginTop: 4, fontSize: theme.font.small, color: theme.colors.textMuted },
  chartTitle: {
    fontSize: theme.font.small,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: theme.space.lg,
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 64, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { width: '100%', borderRadius: 4 },
  barLab: { fontSize: 9, color: theme.colors.textMuted },
  tableHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.space.sm,
  },
  sectionTitle: { fontWeight: '700', color: theme.colors.text },
  link: { color: theme.colors.accent, fontWeight: '600', fontSize: theme.font.small },
  trHead: {
    flexDirection: 'row',
    paddingHorizontal: theme.space.lg,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceAlt,
  },
  th: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: 12 },
  trBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  td: { fontSize: 13, color: theme.colors.text },
  recentLine: { marginTop: 8, color: theme.colors.textMuted, fontSize: theme.font.small },
});
