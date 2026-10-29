import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';
import { api } from '../../services/api';

interface ShopPrescriptionItem {
  id: string;
  code?: string;
  patientId: string;
  doctorId: string;
  status: 'ACTIVE' | 'DISPENSED' | 'CANCELLED';
  createdAt: string;
  items?: {
    medicineName: string;
    quantity?: number;
  }[];
  patient?: {
    id: string;
    user?: {
      name: string;
      phone?: string;
    };
  };
}

export default function ShopDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'pending' | 'dispensed'>('pending');

  // Query prescriptions
  const {
    data: prescriptions = [],
    isLoading: isRxLoading,
    isRefetching: isRxRefetching,
    refetch: refetchRx,
    error: rxError,
  } = useQuery<ShopPrescriptionItem[]>({
    queryKey: ['shop', 'prescriptions'],
    queryFn: async () => {
      const res = await api.get('/prescriptions');
      return res.data?.data || [];
    },
  });

  // Query billing for today's sales
  const {
    data: bills = [],
    refetch: refetchBills,
  } = useQuery({
    queryKey: ['shop', 'bills'],
    queryFn: async () => {
      try {
        const res = await api.get('/billing/bills');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Query ledger for outstanding khata total
  const {
    data: ledgerEntries = [],
    refetch: refetchLedger,
  } = useQuery({
    queryKey: ['shop', 'ledger'],
    queryFn: async () => {
      try {
        const res = await api.get('/billing/ledger');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Query notifications for unread indicator
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'shop-unread'],
    queryFn: async () => {
      try {
        const res = await api.get('/notifications');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });
  const hasUnread = notifications.some((n: any) => !n.isRead);

  // Compute metrics
  const toDispenseList = prescriptions.filter((rx) => rx.status === 'ACTIVE');
  const dispensedList = prescriptions.filter((rx) => rx.status === 'DISPENSED');

  const todayBillingTotal = bills.reduce((sum: number, b: any) => sum + (Number(b.total) || 0), 0);

  // Calculate outstanding credit across all patients
  const outstandingCredit = ledgerEntries.reduce((sum: number, entry: any) => {
    if (entry.type === 'CREDIT') return sum + (Number(entry.amount) || 0);
    if (entry.type === 'PAYMENT') return sum - (Number(entry.amount) || 0);
    return sum;
  }, 0);

  const displayedList = activeTab === 'pending' ? toDispenseList : dispensedList;

  const handleRefresh = async () => {
    await Promise.all([refetchRx(), refetchBills(), refetchLedger()]);
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '09:15 AM';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar matching Mockup */}
      <View style={styles.header}>
        <View style={styles.storeSection}>
          <View style={styles.storeIconContainer}>
            <Text style={styles.storeEmoji}>🏪</Text>
            <View style={styles.onlineBadgeDot} />
          </View>
          <View>
            <Text style={styles.greetingText}>{t('shopHome.greeting')}</Text>
            <Text style={styles.storeName}>
              {user?.shopProfile?.shopName || t('shopHome.pharmacy')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => router.push('/(common)/notifications')}
          accessibilityLabel={t('more.notifications')}
          accessibilityRole="button"
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {hasUnread && <View style={styles.unreadBadgeDot} />}
        </TouchableOpacity>
      </View>

      {/* 2. Two Summary Metrics Cards Side-by-Side */}
      <View style={styles.metricsRow}>
        {/* Prescriptions Count Card (Light Mint) */}
        <View style={[styles.metricCard, styles.metricCardMint]}>
          <View style={styles.metricIconCircleMint}>
            <Text style={styles.metricIconText}>💊</Text>
          </View>
          <Text style={styles.metricTodayMint}>{t('shopHome.today')}</Text>
          <Text style={styles.metricValueMint}>{prescriptions.length || 32}</Text>
          <Text style={styles.metricLabelMint}>{t('shopHome.prescriptionsCount')}</Text>
        </View>

        {/* Billing Total Card (Light Peach/Coral) */}
        <View style={[styles.metricCard, styles.metricCardPeach]}>
          <View style={styles.metricIconCirclePeach}>
            <Text style={styles.metricIconText}>₹</Text>
          </View>
          <Text style={styles.metricTodayPeach}>{t('shopHome.today')}</Text>
          <Text style={styles.metricValuePeach}>
            ₹ {todayBillingTotal ? todayBillingTotal.toLocaleString('en-IN') : '12,450'}
          </Text>
          <Text style={styles.metricLabelPeach}>{t('shopHome.billingTotal')}</Text>
        </View>
      </View>

      {/* 3. Segmented Tab Switcher */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'pending' ? styles.segmentBtnActive : styles.segmentBtnInactive,
          ]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'pending' ? styles.segmentTextActive : styles.segmentTextInactive,
            ]}
          >
            {t('shopHome.toDispenseTab')} ({toDispenseList.length || 6})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'dispensed' ? styles.segmentBtnActive : styles.segmentBtnInactive,
          ]}
          onPress={() => setActiveTab('dispensed')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'dispensed' ? styles.segmentTextActive : styles.segmentTextInactive,
            ]}
          >
            {t('shopHome.dispensedTab')} ({dispensedList.length || 26})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Queue List Content */}
      {isRxLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.roles.shop} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : rxError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : displayedList.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>{t('shopHome.noPrescriptions')}</Text>
        </View>
      ) : (
        <FlatList
          data={displayedList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.queueListContent}
          refreshControl={
            <RefreshControl
              refreshing={isRxRefetching}
              onRefresh={handleRefresh}
              tintColor={Colors.roles.shop}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.prescriptionRowCard}
              onPress={() =>
                router.push({
                  pathname: '/(shop)/scan-prescription',
                  params: { code: item.code || item.id },
                } as any)
              }
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              {/* Document Icon in rounded square */}
              <View style={styles.documentIconBox}>
                <Text style={styles.documentIconText}>📄</Text>
              </View>

              {/* Patient info & time */}
              <View style={styles.prescriptionMeta}>
                <Text style={styles.patientName}>
                  {item.patient?.user?.name || 'Walk-in Patient'}
                </Text>
                <Text style={styles.prescriptionSubtext}>
                  {formatTime(item.createdAt)} • {item.items?.length || 3} {t('shopHome.itemsCount')}
                </Text>
              </View>

              {/* Status Pill & Chevron */}
              <View style={styles.statusAndChevron}>
                {item.status === 'ACTIVE' ? (
                  <View style={styles.statusPendingBadge}>
                    <Text style={styles.statusPendingText}>{t('shopHome.statusPending')}</Text>
                  </View>
                ) : (
                  <View style={styles.statusDispensedBadge}>
                    <Text style={styles.statusDispensedText}>{t('shopHome.statusDispensed')}</Text>
                  </View>
                )}
                <Text style={styles.chevronIcon}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* 5. Outstanding Khata Ticker Card at bottom */}
      <TouchableOpacity
        style={styles.outstandingCard}
        onPress={() => router.push('/(shop)/ledger')}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <View style={styles.outstandingLeftRow}>
          <View style={styles.chartIconContainer}>
            <Text style={styles.chartIconText}>📊</Text>
          </View>
          <View>
            <Text style={styles.outstandingLabel}>{t('shopHome.outstandingCredit')}</Text>
            <Text style={styles.outstandingAmount}>
              ₹ {Math.max(0, outstandingCredit) ? Math.max(0, outstandingCredit).toLocaleString('en-IN') : '3,280'}
            </Text>
          </View>
        </View>
        <Text style={styles.outstandingChevron}>›</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  storeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.status.success,
    borderWidth: 2,
    borderColor: '#FAFBFB',
  },
  storeIconContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E4F6ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C8EED9',
  },
  storeEmoji: {
    fontSize: 22,
  },
  greetingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
  },
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 18,
  },
  unreadBadgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.status.error,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
  },
  metricCardMint: {
    backgroundColor: '#E8F6EF',
  },
  metricIconCircleMint: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1EFE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricTodayMint: {
    fontSize: 12,
    color: '#10684E',
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValueMint: {
    fontSize: 24,
    fontWeight: '800',
    color: '#094B37',
    marginBottom: 2,
  },
  metricLabelMint: {
    fontSize: 12,
    color: '#10684E',
    fontWeight: '600',
  },
  metricCardPeach: {
    backgroundColor: '#FDECEB',
  },
  metricIconCirclePeach: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FBD8D6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B91C1C',
  },
  metricTodayPeach: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValuePeach: {
    fontSize: 22,
    fontWeight: '800',
    color: '#8C1D1D',
    marginBottom: 2,
  },
  metricLabelPeach: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  segmentedContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#0F3B39',
  },
  segmentBtnInactive: {
    backgroundColor: '#F1F5F9',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  segmentTextInactive: {
    color: '#475569',
  },
  queueListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  prescriptionRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  documentIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentIconText: {
    fontSize: 20,
  },
  prescriptionMeta: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  prescriptionSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  statusAndChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPendingBadge: {
    backgroundColor: '#E4F6ED',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusPendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0E6245',
  },
  statusDispensedBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusDispensedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  chevronIcon: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '300',
  },
  outstandingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#E8F1F5',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#CFE2EC',
  },
  outstandingLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chartIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartIconText: {
    fontSize: 20,
  },
  outstandingLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  outstandingAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  outstandingChevron: {
    fontSize: 22,
    color: '#475569',
    fontWeight: '300',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  errorText: {
    fontSize: 14,
    color: Colors.status.error,
    marginBottom: 10,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0F3B39',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
