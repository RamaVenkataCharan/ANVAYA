import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Card, StatusBadge } from '../../components/ui';
import { api } from '../../services/api';

export default function PatientBillsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const {
    data: bills = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['patient', 'bills'],
    queryFn: async () => {
      const res = await api.get('/billing/my-bills');
      return res.data.data || [];
    },
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('patientBills.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={Colors.roles.patient}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(patient)/bill/${item.id}` as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Bill ${item.billNumber}`}
          >
            <Card style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.leftCol}>
                  <Text style={styles.billNumber}>{item.billNumber}</Text>
                  <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>
                <StatusBadge
                  status={item.paymentStatus}
                  label={item.paymentStatus}
                  variant={
                    item.paymentStatus === 'PAID'
                      ? 'success'
                      : item.paymentStatus === 'KHATA_CREDIT'
                      ? 'warning'
                      : 'error'
                  }
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.shopRow}>
                <Text style={styles.shopIcon}>🏥</Text>
                <View style={styles.shopInfo}>
                  <Text style={styles.shopName}>
                    {item.shop?.shopName || 'Partner Pharmacy'}
                  </Text>
                  <Text style={styles.paymentMethod}>
                    Mode: {item.paymentMethod || 'Cash'}
                  </Text>
                </View>
                <View style={styles.amountBox}>
                  <Text style={styles.amountLabel}>Total</Text>
                  <Text style={styles.amountValue}>₹{item.total || item.totalAmount || 0}</Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.itemsBadge}>
                  🧾 {item.items?.length || 1} items
                </Text>
                <Text style={styles.viewDetailText}>View Receipt & Share →</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyTitle}>{t('patientBills.noBills')}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 24,
    color: Colors.text.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 14,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1,
  },
  billNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  shopIcon: {
    fontSize: 20,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  paymentMethod: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  amountBox: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    color: Colors.text.muted,
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  itemsBadge: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.roles.patient,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

