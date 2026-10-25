import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';

export default function PatientDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const patient = user?.patientProfile;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>PATIENT WALLET</Text>
            <Text style={styles.headerTitle}>{user?.name}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>👤 Patient</Text>
          </View>
        </View>

        {/* Patient Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Personal Health Profile</Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user?.email}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{user?.phone}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>{patient?.gender || 'Not specified'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Blood Group</Text>
            <Text style={styles.detailValueHighlight}>
              {patient?.bloodGroup || 'Not provided'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>
              {patient?.address || 'Not specified'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeader}>Prescriptions & Wallet</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(patient)/wallet')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>📱</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Digital Prescription Wallet</Text>
              <Text style={styles.actionDesc}>
                View active e-prescriptions, medications, and show dynamic QR tokens at pharmacies
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.roles.patient,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  roleBadge: {
    backgroundColor: Colors.roles.patientBackground,
    borderColor: Colors.roles.patient,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.roles.patient,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  detailValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.roles.patient,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  actionsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 14,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: Colors.text.muted,
    lineHeight: 16,
  },
});
