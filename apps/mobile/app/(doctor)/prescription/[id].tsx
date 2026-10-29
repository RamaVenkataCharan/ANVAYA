import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/colors';
import { Card, Button, StatusBadge } from '../../../components/ui';
import { api } from '../../../services/api';

export default function DoctorPrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const {
    data: prescription,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['doctor', 'prescription', id],
    queryFn: async () => {
      const res = await api.get(`/prescriptions/${id}`);
      return res.data?.data || res.data;
    },
    enabled: !!id,
  });

  const isCancelable = prescription?.status === 'ACTIVE';

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
        <Text style={styles.headerTitle}>{t('doctorPrescription.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.roles.doctor} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : error || !prescription ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('common.error')}</Text>
          <Text style={styles.errorSubtitle}>
            {error instanceof Error ? error.message : 'Prescription not found'}
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
          {/* Header Card */}
          <Card style={styles.mainCard}>
            <View style={styles.cardTopRow}>
              <View>
                <Text style={styles.rxNumber}>Rx #{prescription.id.slice(0, 8)}</Text>
                <Text style={styles.rxDate}>
                  {t('doctorPrescription.issuedDate')}:{' '}
                  {new Date(prescription.createdAt).toLocaleDateString('en-IN')}
                </Text>
              </View>
              <StatusBadge status={prescription.status} />
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('doctorPrescription.patient')}:</Text>
              <Text style={styles.detailValue}>
                {prescription.patient?.user?.name || 'Assigned Patient'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Diagnosis / Notes:</Text>
              <Text style={styles.detailValue}>
                {prescription.diagnosis || 'Routine clinical prescription'}
              </Text>
            </View>
          </Card>

          {/* Medicines List */}
          <Text style={styles.sectionHeader}>{t('doctorPrescription.medications')}</Text>
          {(prescription.items || []).map((item: any, idx: number) => (
            <Card key={idx} style={styles.medicineCard}>
              <View style={styles.medHeaderRow}>
                <Text style={styles.medicineName}>{item.medicineName}</Text>
                <Text style={styles.medicineDosage}>{item.dosage}</Text>
              </View>
              <View style={styles.medMetaRow}>
                <Text style={styles.medMetaText}>
                  {t('doctorPrescription.frequency')}: {item.frequency}
                </Text>
                <Text style={styles.medMetaText}>
                  {t('doctorPrescription.duration')}: {item.duration}
                </Text>
              </View>
              {item.instructions ? (
                <Text style={styles.medInstructions}>
                  📌 {item.instructions}
                </Text>
              ) : null}
            </Card>
          ))}

          {/* Cancellation section */}
          {isCancelable ? (
            <Button
              label={t('doctorPrescription.cancelRx')}
              variant="destructive"
              onPress={() =>
                router.push(`/(doctor)/prescription/${prescription.id}/void` as any)
              }
              style={{ marginTop: 20 }}
            />
          ) : prescription.status === 'DISPENSED' ? (
            <View style={styles.dispensedNoticeBox}>
              <Text style={styles.dispensedNoticeText}>
                ✓ {t('doctorPrescription.cannotCancelDispensed')}
              </Text>
            </View>
          ) : null}
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
  mainCard: {
    padding: 18,
    marginBottom: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rxNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.roles.doctor,
    marginBottom: 4,
  },
  rxDate: {
    fontSize: 12,
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
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  medicineCard: {
    padding: 14,
    marginBottom: 10,
  },
  medHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  medicineDosage: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.roles.doctor,
  },
  medMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  medMetaText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  medInstructions: {
    fontSize: 12,
    color: Colors.status.info,
    marginTop: 4,
  },
  dispensedNoticeBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: Colors.status.successBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.status.success,
  },
  dispensedNoticeText: {
    fontSize: 13,
    color: Colors.status.success,
    textAlign: 'center',
    fontWeight: '600',
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
});
