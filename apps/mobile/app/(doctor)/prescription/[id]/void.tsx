import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../../constants/colors';
import { Card, Button, Input } from '../../../../components/ui';
import { api } from '../../../../services/api';

export default function VoidPrescriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const voidMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/prescriptions/${id}/cancel`, { reason });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'prescription', id] });
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'prescriptions'] });
      Alert.alert(t('common.success'), t('doctorPrescription.cancelSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => router.replace('/(doctor)/prescriptions'),
        },
      ]);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Could not cancel prescription';
      Alert.alert(t('common.error'), msg);
    },
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError(t('doctorPrescription.cancellationReason'));
      return;
    }
    setError(null);

    Alert.alert(
      t('doctorPrescription.cancelRx'),
      t('doctorPrescription.cancelConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('doctorPrescription.cancelRx'),
          style: 'destructive',
          onPress: () => voidMutation.mutate(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Text style={styles.backBtnText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('doctorPrescription.voidTitle')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Warning Banner */}
        <Card style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>Permanent Clinical Cancellation</Text>
          <Text style={styles.warningText}>
            Cancelling this prescription will invalidate its secure cryptographic QR token
            immediately. Any pharmacy attempting to dispense will receive an INVALIDated status.
          </Text>
        </Card>

        {/* Reason Form */}
        <Card style={styles.formCard}>
          <Text style={styles.fieldLabel}>
            {t('doctorPrescription.cancellationReason')} *
          </Text>
          <Input
            placeholder="e.g. Patient allergic reaction, revised diagnosis, dosage error..."
            value={reason}
            onChangeText={(txt) => {
              setReason(txt);
              if (error) setError(null);
            }}
            multiline
            numberOfLines={4}
            error={error}
            style={styles.reasonInput}
          />

          <Button
            label={t('doctorPrescription.cancelRx')}
            variant="destructive"
            onPress={handleSubmit}
            isLoading={voidMutation.isPending}
            style={{ marginTop: 20 }}
          />
        </Card>
      </ScrollView>
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
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: {
    color: Colors.roles.doctor,
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
  warningCard: {
    padding: 18,
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.status.error,
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  formCard: {
    padding: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  reasonInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

