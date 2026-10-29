import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Role } from '@anvaya/shared';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';
import { Button, Input, Card, StatusBadge } from '../../components/ui';
import { api } from '../../services/api';

export default function RejectedVerificationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, role, logout, refreshMe } = useAuthStore();

  const isDoc = role === Role.DOCTOR;
  const isShop = role === Role.SHOP;
  const rejectionReason =
    user?.doctorProfile?.rejectionReason ||
    user?.shopProfile?.rejectionReason ||
    'Additional verification details required by administration.';

  // Doctor state
  const [specialization, setSpecialization] = useState(
    user?.doctorProfile?.specialization || ''
  );
  const [registrationNo, setRegistrationNo] = useState(
    user?.doctorProfile?.registrationNo || ''
  );
  const [clinicAddress, setClinicAddress] = useState(
    user?.doctorProfile?.clinicAddress || ''
  );

  // Shop state
  const [shopName, setShopName] = useState(user?.shopProfile?.shopName || '');
  const [licenseNo, setLicenseNo] = useState(user?.shopProfile?.licenseNo || '');
  const [address, setAddress] = useState(user?.shopProfile?.address || '');
  const [timings, setTimings] = useState(user?.shopProfile?.timings || '');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResubmit = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const payload: Record<string, any> = {};
      if (isDoc) {
        payload.specialization = specialization.trim();
        payload.registrationNo = registrationNo.trim();
        payload.clinicAddress = clinicAddress.trim();
      } else if (isShop) {
        payload.shopName = shopName.trim();
        payload.licenseNo = licenseNo.trim();
        payload.address = address.trim();
        payload.timings = timings.trim();
      }

      await api.post('/auth/resubmit-verification', payload);
      await refreshMe();
      Alert.alert('Submitted', t('auth.resubmitSuccess'), [
        { text: 'OK', onPress: () => router.replace('/(auth)/pending-verification') },
      ]);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to resubmit credentials. Please check all fields.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.statusBadgeRow}>
              <StatusBadge label="VERIFICATION REJECTED" variant="error" />
            </View>
            <Text style={styles.title}>{t('auth.rejectedTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.rejectedDesc')}</Text>
          </View>

          {/* Rejection Reason Notice Box */}
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>⚠️ {t('auth.rejectionReason')}</Text>
            <Text style={styles.rejectionReasonText}>{rejectionReason}</Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Correct Details</Text>
            <View style={styles.formGroup}>
              {isDoc && (
                <>
                  <Input
                    label={t('profile.specialization')}
                    value={specialization}
                    onChangeText={setSpecialization}
                    placeholder="e.g. Cardiology"
                    accessibilityLabel={t('profile.specialization')}
                  />
                  <Input
                    label={t('profile.registrationNo')}
                    value={registrationNo}
                    onChangeText={setRegistrationNo}
                    placeholder="MCI / State Council Number"
                    accessibilityLabel={t('profile.registrationNo')}
                  />
                  <Input
                    label={t('profile.clinicAddress')}
                    value={clinicAddress}
                    onChangeText={setClinicAddress}
                    placeholder="Clinic Address"
                    accessibilityLabel={t('profile.clinicAddress')}
                  />
                </>
              )}

              {isShop && (
                <>
                  <Input
                    label={t('profile.shopName')}
                    value={shopName}
                    onChangeText={setShopName}
                    placeholder="Pharmacy Name"
                    accessibilityLabel={t('profile.shopName')}
                  />
                  <Input
                    label={t('profile.licenseNo')}
                    value={licenseNo}
                    onChangeText={setLicenseNo}
                    placeholder="Drug License Number"
                    accessibilityLabel={t('profile.licenseNo')}
                  />
                  <Input
                    label={t('profile.address')}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Store Address"
                    accessibilityLabel={t('profile.address')}
                  />
                  <Input
                    label={t('profile.timings')}
                    value={timings}
                    onChangeText={setTimings}
                    placeholder="e.g. 08:00 AM - 10:00 PM"
                    accessibilityLabel={t('profile.timings')}
                  />
                </>
              )}

              <Button
                label={t('auth.resubmitBtn')}
                onPress={() => void handleResubmit()}
                isLoading={isLoading}
                variant="primary"
                accessibilityLabel={t('auth.resubmitBtn')}
              />
            </View>
          </Card>

          <Button
            label={t('common.signOut')}
            onPress={() => void handleSignOut()}
            variant="outline"
            accessibilityLabel={t('common.signOut')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  header: {
    marginTop: 8,
  },
  statusBadgeRow: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  rejectionBox: {
    backgroundColor: Colors.status.errorBackground,
    borderWidth: 1,
    borderColor: Colors.status.error,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  rejectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.status.error,
  },
  rejectionReasonText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  card: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  formGroup: {
    gap: 16,
  },
  errorBox: {
    backgroundColor: Colors.status.errorBackground,
    borderWidth: 1,
    borderColor: Colors.status.error,
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: 13,
  },
});

