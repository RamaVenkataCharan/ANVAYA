import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';
import { useTranslation } from 'react-i18next';

interface ShopItem {
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

export default function PatientShopsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch verified shops
  const {
    data: shops = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<ShopItem[]>({
    queryKey: ['shops', searchTerm],
    queryFn: async () => {
      const res = await api.get('/shops', {
        params: searchTerm.trim() ? { q: searchTerm.trim() } : undefined,
      });
      return res.data?.data || [];
    },
  });

  const handleCall = async (phone: string) => {
    if (!phone) {
      Alert.alert(t('common.notice'), 'No phone number is registered for this pharmacy.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const url = `tel:${cleanPhone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), `Cannot place calls to ${phone} from this device.`);
      }
    } catch {
      Alert.alert(t('common.error'), `Could not initiate call to ${phone}.`);
    }
  };

  const handleOpenMaps = async (shop: ShopItem) => {
    const query = encodeURIComponent(`${shop.shopName}, ${shop.address}`);
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
        <Text style={styles.headerTitle}>Pharmacy Directory</Text>
        <Text style={styles.headerSubtitle}>
          Find verified medical stores and dispense centers
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by shop name, address or landmark..."
          placeholderTextColor={Colors.text.muted}
          value={searchTerm}
          onChangeText={setSearchTerm}
          clearButtonMode="while-editing"
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.roles.shop} />
          <Text style={styles.loadingText}>Locating verified pharmacies...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load pharmacy directory</Text>
          <Text style={styles.errorSubtitle}>
            Please check your internet connection and pull down to refresh.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : shops.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyTitle}>No Pharmacies Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchTerm
              ? `No verified pharmacy matched "${searchTerm}". Try a different keyword.`
              : 'No verified pharmacies are currently available in the directory.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.roles.shop}
              colors={[Colors.roles.shop]}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => router.push(`/(patient)/shop/${item.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.shopTitleRow}>
                  <Text style={styles.shopIcon}>🏥</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{item.shopName}</Text>
                    <Text style={styles.licenseNo}>License: {item.licenseNo}</Text>
                  </View>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📍</Text>
                <Text style={styles.infoText}>{item.address}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🕒</Text>
                <Text style={styles.infoText}>Timings: {item.timings || '9:00 AM - 10:00 PM'}</Text>
              </View>

              {item.phone ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📞</Text>
                  <Text style={styles.infoText}>{item.phone}</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.callButton]}
                  onPress={() => handleCall(item.phone)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.callButtonText}>📞 Call Store</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.directionsButton]}
                  onPress={() => handleOpenMaps(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.directionsButtonText}>🗺️ Directions</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: Colors.text.primary,
    fontSize: 14,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: Colors.text.muted,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
  },
  shopIcon: {
    fontSize: 24,
    marginRight: 10,
    marginTop: 2,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  licenseNo: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: Colors.roles.shop,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: Colors.roles.shop,
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    fontSize: 14,
    width: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: Colors.roles.shop,
  },
  callButtonText: {
    color: Colors.roles.shop,
    fontWeight: '700',
    fontSize: 13,
  },
  directionsButton: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  directionsButtonText: {
    color: Colors.text.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: Colors.text.secondary,
    marginTop: 12,
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  errorSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
  },
});
