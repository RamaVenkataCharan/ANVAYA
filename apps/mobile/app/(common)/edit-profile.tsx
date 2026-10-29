import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
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
import { Button, Input, Card } from '../../components/ui';
import { api } from '../../services/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, role, refreshMe } = useAuthStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Common fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Patient fields
  const [address, setAddress] = useState(user?.patientProfile?.address || '');
  const [bloodGroup, setBloodGroup] = useState(user?.patientProfile?.bloodGroup || '');
  const [emergencyContact, setEmergencyContact] = useState(
    user?.patientProfile?.emergencyContact || ''
  );

  // Doctor fields
  const [specialization, setSpecialization] = useState(
    user?.doctorProfile?.specialization || ''
  );
  const [clinicAddress, setClinicAddress] = useState(
    user?.doctorProfile?.clinicAddress || ''
  );

  // Shop fields
  const [shopName, setShopName] = useState(user?.shopProfile?.shopName || '');
  const [shopAddress, setShopAddress] = useState(user?.shopProfile?.address || '');
  const [timings, setTimings] = useState(user?.shopProfile?.timings || '');

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshMe();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim(),
      };

      if (role === Role.PATIENT) {
        payload.address = address.trim();
        payload.bloodGroup = bloodGroup.trim();
        payload.emergencyContact = emergencyContact.trim();
      } else if (role === Role.DOCTOR) {
        payload.specialization = specialization.trim();
        payload.clinicAddress = clinicAddress.trim();
      } else if (role === Role.SHOP) {
        payload.shopName = shopName.trim();
        payload.address = shopAddress.trim();
        payload.timings = timings.trim();
      }

      await api.patch('/users/profile', payload);
      await refreshMe();
      Alert.alert(t('common.success'), t('profile.updateSuccess'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Colors.primaryLight}
            />
          }
        >
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.formGroup}>
              <Input
                label={t('profile.fullName')}
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                accessibilityLabel={t('profile.fullName')}
              />
              <Input
                label={t('profile.email')}
                value={user?.email || ''}
                editable={false}
                placeholder="Email Address"
                accessibilityLabel={t('profile.email')}
              />
              <Input
                label={t('profile.phone')}
                value={phone}
                onChangeText={setPhone}
                placeholder="+919876543210"
                keyboardType="phone-pad"
                accessibilityLabel={t('profile.phone')}
              />
            </View>
          </Card>

          {role === Role.PATIENT && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Medical & Contact Details</Text>
              <View style={styles.formGroup}>
                <Input
                  label={t('profile.address')}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street, City, Postal Code"
                  accessibilityLabel={t('profile.address')}
                />
                <Input
                  label={t('profile.bloodGroup')}
                  value={bloodGroup}
                  onChangeText={setBloodGroup}
                  placeholder="e.g. O+, A+, B+, AB-"
                  autoCapitalize="characters"
                  maxLength={5}
                  accessibilityLabel={t('profile.bloodGroup')}
                />
                <Input
                  label={t('profile.emergencyContact')}
                  value={emergencyContact}
                  onChangeText={setEmergencyContact}
                  placeholder="Emergency phone number"
                  keyboardType="phone-pad"
                  accessibilityLabel={t('profile.emergencyContact')}
                />
              </View>
            </Card>
          )}

          {role === Role.DOCTOR && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Clinical Practice Details</Text>
              <View style={styles.formGroup}>
                <Input
                  label={t('profile.specialization')}
                  value={specialization}
                  onChangeText={setSpecialization}
                  placeholder="e.g. General Physician, Cardiology"
                  accessibilityLabel={t('profile.specialization')}
                />
                <Input
                  label={t('profile.registrationNo')}
                  value={user?.doctorProfile?.registrationNo || ''}
                  editable={false}
                  placeholder="Registration Number"
                  accessibilityLabel={t('profile.registrationNo')}
                />
                <Input
                  label={t('profile.clinicAddress')}
                  value={clinicAddress}
                  onChangeText={setClinicAddress}
                  placeholder="Clinic Name, Suite, Street"
                  accessibilityLabel={t('profile.clinicAddress')}
                />
              </View>
            </Card>
          )}

          {role === Role.SHOP && (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Pharmacy Store Information</Text>
              <View style={styles.formGroup}>
                <Input
                  label={t('profile.shopName')}
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder="Pharmacy Name"
                  accessibilityLabel={t('profile.shopName')}
                />
                <Input
                  label={t('profile.licenseNo')}
                  value={user?.shopProfile?.licenseNo || ''}
                  editable={false}
                  placeholder="Drug License Number"
                  accessibilityLabel={t('profile.licenseNo')}
                />
                <Input
                  label={t('profile.address')}
                  value={shopAddress}
                  onChangeText={setShopAddress}
                  placeholder="Store Address"
                  accessibilityLabel={t('profile.address')}
                />
                <Input
                  label={t('profile.timings')}
                  value={timings}
                  onChangeText={setTimings}
                  placeholder="e.g. 08:00 AM - 10:30 PM"
                  accessibilityLabel={t('profile.timings')}
                />
              </View>
            </Card>
          )}

          <View style={styles.actionSection}>
            <Button
              label={t('common.save')}
              onPress={() => void handleSave()}
              isLoading={isSaving}
              variant="primary"
              accessibilityLabel={t('common.save')}
            />
          </View>
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
    padding: 20,
    gap: 16,
  },
  card: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  formGroup: {
    gap: 14,
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
  actionSection: {
    marginTop: 8,
    marginBottom: 24,
  },
});

