import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/colors';
import { Card, Button, StatusBadge } from '../../../components/ui';
import { api } from '../../../services/api';

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const {
    data: bill,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bill', id],
    queryFn: async () => {
      const res = await api.get(`/billing/bills/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  const handleShareReceipt = async () => {
    if (!bill) return;

    try {
      const itemsText = (bill.items || [])
        .map(
          (item: any, idx: number) =>
            `${idx + 1}. ${item.medicine} x ${item.quantity} @ ₹${item.unitPrice} = ₹${item.totalPrice}`
        )
        .join('\n');

      const message = `ANVAYA DIGITAL HEALTHCARE RECEIPT\n` +
        `----------------------------------------\n` +
        `Invoice #: ${bill.billNumber}\n` +
        `Pharmacy: ${bill.shop?.shopName || 'ANVAYA Medical'}\n` +
        `License #: ${bill.shop?.licenseNo || 'DL-VERIFIED'}\n` +
        `Date: ${new Date(bill.createdAt).toLocaleDateString()}\n` +
        `Status: ${bill.paymentStatus} (${bill.paymentMethod})\n` +
        `----------------------------------------\n` +
        `ITEMS:\n${itemsText || 'Prescription medication package'}\n` +
        `----------------------------------------\n` +
        `Subtotal: ₹${bill.subtotal || bill.total}\n` +
        `Tax / GST: ₹${bill.tax || 0}\n` +
        `GRAND TOTAL: ₹${bill.total}\n` +
        `----------------------------------------\n` +
        `Verified by ANVAYA Healthcare Platform`;

      await Share.share({
        message,
        title: `Receipt ${bill.billNumber}`,
      });
    } catch {
      Alert.alert('Share Failed', 'Unable to open system share sheet.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.roles.patient} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (error || !bill) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>{t('common.errorTitle')}</Text>
        <Button label={t('common.retry')} onPress={() => void refetch()} />
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>{t('patientBills.billDetail')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Pharmacy Details Card */}
        <Card style={styles.card}>
          <View style={styles.pharmacyHeader}>
            <View style={styles.pharmacyIconBox}>
              <Text style={styles.pharmacyIcon}>🏥</Text>
            </View>
            <View style={styles.pharmacyInfo}>
              <Text style={styles.pharmacyName}>
                {bill.shop?.shopName || 'Partner Pharmacy'}
              </Text>
              <Text style={styles.pharmacyLicense}>
                Lic: {bill.shop?.licenseNo || 'DL-VERIFIED'}
              </Text>
              <Text style={styles.pharmacyAddress}>
                {bill.shop?.address || 'Licensed Pharmacy Location'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Invoice Summary Card */}
        <Card style={styles.card}>
          <View style={styles.invoiceMetaRow}>
            <View>
              <Text style={styles.metaLabel}>{t('patientBills.invoiceNumber')}</Text>
              <Text style={styles.metaValue}>{bill.billNumber}</Text>
            </View>
            <StatusBadge
              status={bill.paymentStatus}
              label={bill.paymentStatus}
              variant={
                bill.paymentStatus === 'PAID'
                  ? 'success'
                  : bill.paymentStatus === 'KHATA_CREDIT'
                  ? 'warning'
                  : 'error'
              }
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date & Time</Text>
            <Text style={styles.infoValue}>
              {new Date(bill.createdAt).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('patientBills.paymentMethod')}</Text>
            <Text style={styles.infoValue}>{bill.paymentMethod || 'CASH'}</Text>
          </View>
        </Card>

        {/* Itemized Breakdown Card */}
        <Card style={styles.card}>
          <Text style={styles.breakdownTitle}>Itemized Medications</Text>

          {(bill.items || []).length > 0 ? (
            bill.items.map((item: any, idx: number) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>{item.medicine}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity} × ₹{item.unitPrice}</Text>
                </View>
                <Text style={styles.itemTotal}>₹{item.totalPrice}</Text>
              </View>
            ))
          ) : (
            <View style={styles.itemRow}>
              <View style={styles.itemMain}>
                <Text style={styles.itemName}>Dispensed Prescription Package</Text>
                <Text style={styles.itemQty}>Package Item</Text>
              </View>
              <Text style={styles.itemTotal}>₹{bill.total}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>{t('patientBills.subtotal')}</Text>
            <Text style={styles.calcValue}>₹{bill.subtotal || bill.total}</Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>{t('patientBills.tax')}</Text>
            <Text style={styles.calcValue}>₹{bill.tax || 0}</Text>
          </View>

          <View style={[styles.calcRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>{t('patientBills.total')}</Text>
            <Text style={styles.grandTotalValue}>₹{bill.total}</Text>
          </View>
        </Card>

        {/* Share Button */}
        <View style={styles.btnBox}>
          <Button
            label={t('patientBills.sharePdf')}
            variant="primary"
            onPress={handleShareReceipt}
            accessibilityLabel={t('patientBills.sharePdf')}
          />
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 16,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pharmacyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f3ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pharmacyIcon: {
    fontSize: 24,
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  pharmacyLicense: {
    fontSize: 12,
    color: Colors.roles.shop,
    fontWeight: '600',
  },
  pharmacyAddress: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 2,
  },
  invoiceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.text.muted,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemMain: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  calcLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  grandTotalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0c3832',
  },
  btnBox: {
    marginTop: 8,
  },
});

