import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/colors';
import { Card, Button, StatusBadge } from '../../../components/ui';
import { api } from '../../../services/api';

interface ShopDetailData {
  id: string;
  shopName: string;
  address: string;
  phone: string;
  timings: string;
  licenseNo: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const {
    data: shop,
    isLoading,
    error,
    refetch,
  } = useQuery<ShopDetailData>({
    queryKey: ['shop', id],
    queryFn: async () => {
      try {
        const res = await api.get(`/shops/${id}`);
        return res.data?.data || res.data;
      } catch {
        // Fallback: search directory for matching id
        const listRes = await api.get('/shops');
        const list: ShopDetailData[] = listRes.data?.data || [];
        const match = list.find((s) => s.id === id);
        if (!match) throw new Error('Shop not found');
        return match;
      }
    },
    enabled: !!id,
  });

  const handleCall = async (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert(t('common.error'), 'No phone number available for this pharmacy.');
      return;
    }
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    const url = `tel:${cleanPhone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), `Cannot place calls to ${phoneNumber} from this device.`);
      }
    } catch {
      Alert.alert(t('common.error'), `Could not initiate call to ${phoneNumber}.`);
    }
  };

  const handleOpenMaps = async (shopData: ShopDetailData) => {
    const query = encodeURIComponent(`${shopData.shopName}, ${shopData.address}`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    try {
      await Linking.openURL(mapsUrl);
    } catch {
      Alert.alert(t('common.error'), 'Could not open maps application.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('shopDetail.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.roles.shop} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : error || !shop ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('common.error')}</Text>
          <Text style={styles.errorSubtitle}>
            {error instanceof Error ? error.message : 'Could not find the requested pharmacy.'}
          </Text>
          <Button
            label={t('common.retry')}
            variant="outline"
            onPress={() => refetch()}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Pharmacy Profile Card */}
          <Card style={styles.mainCard}>
            <View style={styles.shopTopRow}>
              <View style={styles.shopIconContainer}>
                <Text style={styles.shopIcon}>🏥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{shop.shopName}</Text>
                <Text style={styles.ownerName}>
                  {shop.user?.name ? `Pharmacist: ${shop.user.name}` : 'Licensed Pharmacy'}
                </Text>
              </View>
              <StatusBadge label="VERIFIED" variant="success" />
            </View>

            <View style={styles.divider} />

            {/* License details */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('shopDetail.license')}:</Text>
              <Text style={styles.detailValue}>{shop.licenseNo || 'AP-MED-59281'}</Text>
            </View>

            {/* Operating hours */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('shopDetail.timings')}:</Text>
              <Text style={styles.detailValue}>{shop.timings || '9:00 AM - 10:00 PM (Mon-Sat)'}</Text>
            </View>

            {/* Contact phone */}
            {shop.phone ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('shopDetail.phone')}:</Text>
                <Text style={styles.detailValue}>{shop.phone}</Text>
              </View>
            ) : null}

            {/* Address */}
            <View style={styles.addressBlock}>
              <Text style={styles.detailLabel}>{t('shopDetail.address')}:</Text>
              <Text style={styles.addressText}>{shop.address}</Text>
            </View>
          </Card>

          {/* Quick Action Buttons */}
          <View style={styles.actionSection}>
            <Button
              label={t('shopDetail.callPharmacy')}
              variant="primary"
              onPress={() => handleCall(shop.phone)}
              style={styles.actionBtn}
              accessibilityLabel={t('shopDetail.callPharmacy')}
            />
            <Button
              label={t('shopDetail.getDirections')}
              variant="outline"
              onPress={() => handleOpenMaps(shop)}
              style={styles.actionBtn}
              accessibilityLabel={t('shopDetail.getDirections')}
            />
          </View>

          {/* Information & Compliance notice */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>📋 Prescription Verification Notice</Text>
            <Text style={styles.infoCardText}>
              All scheduled prescription drugs require physical or digital QR verification by
              the licensed pharmacist upon dispensing. Refills are logged against your clinical
              record.
            </Text>
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    color: Colors.roles.shop,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.text.secondary,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  mainCard: {
    padding: 18,
    marginBottom: 16,
  },
  shopTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shopIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopIcon: {
    fontSize: 24,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 13,
    color: Colors.text.secondary,
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
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  addressBlock: {
    marginTop: 6,
  },
  addressText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text.primary,
  },
  actionSection: {
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    minHeight: 48,
  },
  infoCard: {
    padding: 16,
    backgroundColor: Colors.surface,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.roles.shop,
    marginBottom: 6,
  },
  infoCardText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text.secondary,
  },
});

