import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../src/utils/constants';

const ATTENDANCE_DATA = [
  { week: 1,  date: 'Jan 20', status: 'present', time: '8:02am' },
  { week: 2,  date: 'Jan 27', status: 'present', time: '8:05am' },
  { week: 3,  date: 'Feb 3',  status: 'absent',  time: '—' },
  { week: 4,  date: 'Feb 10', status: 'present', time: '7:58am' },
  { week: 5,  date: 'Feb 17', status: 'present', time: '8:01am' },
  { week: 6,  date: 'Feb 24', status: 'absent',  time: '—' },
  { week: 7,  date: 'Mar 3',  status: 'present', time: '8:00am' },
  { week: 8,  date: 'Mar 10', status: 'present', time: '8:03am' },
  { week: 9,  date: 'Mar 17', status: 'present', time: '7:55am' },
  { week: 10, date: 'Mar 24', status: 'absent',  time: '—' },
  { week: 11, date: 'Mar 31', status: 'present', time: '9:58am' },
  { week: 12, date: 'Apr 7',  status: 'present', time: '8:10am' },
  { week: 13, date: 'Apr 14', status: 'present', time: '8:01am' },
  { week: 14, date: 'Apr 21', status: 'present', time: '8:04am' },
];

export default function ReportsScreen() {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const present = ATTENDANCE_DATA.filter(d => d.status === 'present').length;
  const absent  = ATTENDANCE_DATA.filter(d => d.status === 'absent').length;
  const rate    = ((present / ATTENDANCE_DATA.length) * 100).toFixed(1);

  const displayedRows = showAll
    ? [...ATTENDANCE_DATA].reverse()
    : ATTENDANCE_DATA.slice(-3).reverse();

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance Reports</Text>
        <Text style={styles.headerSub}>Mobile Computing — SMA2418</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.body}>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.summaryNum, { color: '#1B5E20' }]}>{present}</Text>
              <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Present</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
              <Text style={[styles.summaryNum, { color: '#B71C1C' }]}>{absent}</Text>
              <Text style={[styles.summaryLabel, { color: COLORS.danger }]}>Absent</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.summaryNum, { color: '#0D47A1' }]}>{rate}%</Text>
              <Text style={[styles.summaryLabel, { color: '#1565C0' }]}>Rate</Text>
            </View>
          </View>

          {/* Bar Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Semester Attendance (14 Weeks)</Text>
            <View style={styles.chartBars}>
              {ATTENDANCE_DATA.map((item) => (
                <View key={item.week} style={styles.barGroup}>
                  <View style={[
                    styles.bar,
                    {
                      height: item.status === 'present' ? 50 : 16,
                      backgroundColor: item.status === 'present'
                        ? COLORS.primary : '#E53935',
                    }
                  ]} />
                  <Text style={styles.barLabel}>{item.week}</Text>
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E53935' }]} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
            </View>
          </View>

          {/* Sessions Table */}
          <View style={styles.tableSection}>
            <View style={styles.tableTopRow}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
              <TouchableOpacity onPress={() => setShowAll(!showAll)}>
                <Text style={styles.viewAll}>{showAll ? 'Show less' : 'View all'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.table}>

              {/* Header Row */}
              <View style={[styles.tableRow, styles.tableHeadRow]}>
                <Text style={[styles.colDate,   styles.headText]}>Date</Text>
                <Text style={[styles.colWeek,   styles.headText]}>Week</Text>
                <Text style={[styles.colTime,   styles.headText]}>Time</Text>
                <Text style={[styles.colStatus, styles.headText]}>Status</Text>
              </View>

              {/* Data Rows */}
              {displayedRows.map((item, index) => (
                <View
                  key={item.week}
                  style={[
                    styles.tableRow,
                    index < displayedRows.length - 1 && styles.rowBorder,
                  ]}
                >
                  <Text style={styles.colDate}>{item.date}</Text>
                  <Text style={styles.colWeek}>Wk {item.week}</Text>
                  <Text style={styles.colTime}>{item.time}</Text>
                  <View style={styles.colStatus}>
                    <View style={[
                      styles.pill,
                      {
                        backgroundColor: item.status === 'present'
                          ? '#E8F5E9' : '#FFEBEE',
                      }
                    ]}>
                      <Text style={[
                        styles.pillText,
                        {
                          color: item.status === 'present'
                            ? COLORS.success : COLORS.danger,
                        }
                      ]}>
                        {item.status === 'present' ? 'Present' : 'Absent'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Export Button */}
          <TouchableOpacity style={styles.exportBtn}>
            <Ionicons name="download-outline" size={18} color={COLORS.primary} />
            <Text style={styles.exportText}>Export Report (PDF)</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/checkin')}>
          <Ionicons name="location-outline" size={22} color={COLORS.muted} />
          <Text style={styles.navLabel}>Check-in</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/reports')}>
          <Ionicons name="document-text" size={22} color={COLORS.primary} />
          <Text style={[styles.navLabel, { color: COLORS.primary, fontWeight: '600' }]}>
            Reports
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 48,
  },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },

  body: { padding: 16 },

  // Summary
  summaryRow:   { flexDirection: 'row', gap: 10, marginBottom: 12 },
  summaryCard:  { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  summaryNum:   { fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontSize: 11, marginTop: 2 },

  // Chart
  chartCard:  { backgroundColor: COLORS.white, borderRadius: 10, padding: 14, marginBottom: 12 },
  chartTitle: { fontSize: 11, fontWeight: '500', color: COLORS.muted, marginBottom: 12 },
  chartBars:  { flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 3 },
  barGroup:   { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  bar:        { width: '100%', borderRadius: 2 },
  barLabel:   { fontSize: 6, color: COLORS.muted },
  legend:     { flexDirection: 'row', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 9, color: COLORS.muted },

  // Table section
  tableSection: { marginBottom: 12 },
  tableTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#333' },
  viewAll:      { fontSize: 11, color: COLORS.primary },

  table: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  tableHeadRow: { backgroundColor: COLORS.background },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  headText: { fontWeight: '600', color: COLORS.muted, fontSize: 10 },

  // Column widths — flex so they fill the full table width evenly
  colDate:   { flex: 2.2, fontSize: 11, color: '#333' },
  colWeek:   { flex: 1.5, fontSize: 11, color: '#333' },
  colTime:   { flex: 1.8, fontSize: 11, color: '#333' },
  colStatus: { flex: 1.8, alignItems: 'flex-start' },

  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  pillText: { fontSize: 9, fontWeight: '600' },

  // Export
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  exportText: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },

  // Nav
  navBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 60,
    paddingBottom: 8,
  },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
});