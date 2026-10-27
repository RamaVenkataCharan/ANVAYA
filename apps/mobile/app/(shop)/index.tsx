import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { VerificationStatus } from '@anvaya/shared';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';

export default function ShopDashboard() {
  const router = useRouter();
  const { user, verificationStatus, refreshMe } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const shop = user?.shopProfile;

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMe();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isApproved = verificationStatus === VerificationStatus.APPROVED;
  const isPending = verificationStatus === VerificationStatus.PENDING;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor={Colors.roles.shop}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>PHARMACY TERMINAL</Text>
            <Text style={styles.headerTitle}>{shop?.shopName || user?.name}</Text>
          </View>
          <View
            style={styles.roleBadge}
            accessibilityRole="text"
            accessibilityLabel="Role: Licensed Pharmacy"
          >
            <Text style={styles.roleBadgeText}>💊 Pharmacy</Text>
          </View>
        </View>

        {/* Pharmacy Credential Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>Pharmacy Credentials</Text>
            <View
              style={[
                styles.verifiedTag,
                isApproved
                  ? styles.verifiedTagApproved
                  : isPending
                  ? styles.verifiedTagPending
                  : styles.verifiedTagRejected,
              ]}
              accessibilityRole="text"
              accessibilityLabel={`Verification Status: ${verificationStatus || 'Pending'}`}
            >
              <Text
                style={[
                  styles.verifiedText,
                  isApproved
                    ? styles.verifiedTextApproved
                    : isPending
                    ? styles.verifiedTextPending
                    : styles.verifiedTextRejected,
                ]}
              >
                {isApproved
                  ? '✓ VERIFIED'
                  : isPending
                  ? '⏳ PENDING APPROVAL'
                  : '✕ REJECTED'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Authorized Person</Text>
            <Text style={styles.detailValue}>{user?.name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Drug License No.</Text>
            <Text style={styles.detailValueHighlight}>
              {shop?.licenseNo || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>
              {shop?.address || 'Not specified'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Operating Hours</Text>
            <Text style={styles.detailValue}>
              {shop?.timings || '09:00 AM - 09:00 PM'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user?.email}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeader}>Pharmacy Operations</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(shop)/scan-prescription')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>📷</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Scan & Dispense QR</Text>
              <Text style={styles.actionDesc}>
                Verify patient's QR code or enter ANV code to fulfill and dispense medications
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(shop)/billing')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>💳</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Point-of-Sale Billing</Text>
              <Text style={styles.actionDesc}>
                Generate tax invoices, manage itemized sales, and support Cash, UPI, or Khata credit
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(shop)/invoices')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>🧾</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Past Invoices & Receipts</Text>
              <Text style={styles.actionDesc}>
                Browse sales history, view itemized breakdowns, and export or share PDF receipts
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(shop)/ledger')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>📖</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Khata Credit Ledger</Text>
              <Text style={styles.actionDesc}>
                Track customer balances, credit entries, and record incoming payments
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(shop)/refill-reminders')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>⏰</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Patient Refill Reminders</Text>
              <Text style={styles.actionDesc}>
                Automate cron push notifications to patient devices for medication renewals
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
    color: Colors.roles.shop,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  roleBadge: {
    backgroundColor: Colors.roles.shopBackground,
    borderColor: Colors.roles.shop,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.roles.shop,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  verifiedTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  verifiedTagApproved: {
    backgroundColor: Colors.status.successBackground,
    borderColor: Colors.status.success,
  },
  verifiedTagPending: {
    backgroundColor: Colors.status.warningBackground,
    borderColor: Colors.status.warning,
  },
  verifiedTagRejected: {
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifiedTextApproved: {
    color: Colors.status.success,
  },
  verifiedTextPending: {
    color: Colors.status.warning,
  },
  verifiedTextRejected: {
    color: Colors.status.error,
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
    color: Colors.roles.shop,
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
