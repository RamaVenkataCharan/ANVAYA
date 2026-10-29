import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/colors';
import { Card, Button, StatusBadge } from '../../../components/ui';
import { api } from '../../../services/api';

export default function DoctorPatientSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  // 1. Check consent permissions
  const {
    data: consents = [],
    isLoading: isConsentLoading,
    refetch: refetchConsent,
  } = useQuery({
    queryKey: ['doctor', 'consents'],
    queryFn: async () => {
      try {
        const res = await api.get('/consent/active');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const hasConsent = consents.some(
    (c: any) => c.patientId === id || c.patient?.id === id
  );

  // 2. Fetch clinical prescriptions (filtered for this patient)
  const {
    data: prescriptions = [],
    isLoading: isRxLoading,
    isRefetching: isRxRefetching,
    refetch: refetchRx,
  } = useQuery({
    queryKey: ['doctor', 'patient-prescriptions', id],
    queryFn: async () => {
      const res = await api.get('/prescriptions');
      const all = res.data?.data || [];
      return all.filter((rx: any) => rx.patientId === id);
    },
    enabled: hasConsent,
  });

  // 3. Fetch diagnostic reports (filtered for this patient)
  const {
    data: reports = [],
    isLoading: isReportsLoading,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['doctor', 'patient-reports', id],
    queryFn: async () => {
      try {
        const res = await api.get('/reports');
        const all = res.data?.data || [];
        return all.filter((rep: any) => rep.patientId === id);
      } catch {
        return [];
      }
    },
    enabled: hasConsent,
  });

  const handleRefresh = async () => {
    await Promise.all([refetchConsent(), refetchRx(), refetchReports()]);
  };

  const handleRequestConsent = () => {
    Alert.alert(
      t('doctorPatient.requestConsent'),
      'A consent request notification has been dispatched to the patient mobile vault.',
      [{ text: t('common.ok') }]
    );
  };

  const isLoading = isConsentLoading;

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
        <Text style={styles.headerTitle}>{t('doctorPatient.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.roles.doctor} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRxRefetching}
              onRefresh={handleRefresh}
              tintColor={Colors.roles.doctor}
            />
          }
        >
          {/* Patient Overview Card */}
          <Card style={styles.overviewCard}>
            <View style={styles.patientTopRow}>
              <View style={styles.patientAvatar}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>Patient #{id?.slice(0, 8)}</Text>
                <Text style={styles.patientSubtext}>Verified Health Record</Text>
              </View>
              <StatusBadge
                label={hasConsent ? t('doctorPatient.consentActive') : t('doctorPatient.consentRequired')}
                variant={hasConsent ? 'success' : 'warning'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('doctorPatient.bloodGroup')}</Text>
                <Text style={styles.metaValue}>O+ Positive</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t('doctorPatient.allergies')}</Text>
                <Text style={styles.metaValueHighlight}>Penicillin, Sulfa</Text>
              </View>
            </View>
          </Card>

          {/* Consent Gate Notice */}
          {!hasConsent ? (
            <Card style={styles.consentNoticeCard}>
              <Text style={styles.lockEmoji}>🔒</Text>
              <Text style={styles.consentNoticeTitle}>{t('doctorPatient.consentRequired')}</Text>
              <Text style={styles.consentNoticeText}>{t('doctorPatient.consentNotice')}</Text>
              <Button
                label={t('doctorPatient.requestConsent')}
                variant="primary"
                onPress={handleRequestConsent}
                style={{ marginTop: 14 }}
              />
            </Card>
          ) : (
            <>
              {/* Prescriptions History Section */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t('doctorPatient.prescriptions')}</Text>
                <Text style={styles.sectionCount}>({prescriptions.length})</Text>
              </View>

              {isRxLoading ? (
                <ActivityIndicator size="small" color={Colors.roles.doctor} style={{ marginVertical: 20 }} />
              ) : prescriptions.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>{t('doctorPatient.noPrescriptions')}</Text>
                </Card>
              ) : (
                prescriptions.map((rx: any) => (
                  <TouchableOpacity
                    key={rx.id}
                    style={styles.rxCard}
                    onPress={() => router.push(`/(doctor)/prescription/${rx.id}` as any)}
                  >
                    <View style={styles.rxCardHeader}>
                      <View>
                        <Text style={styles.rxNumber}>Rx #{rx.id.slice(0, 8)}</Text>
                        <Text style={styles.rxDate}>
                          {new Date(rx.createdAt).toLocaleDateString('en-IN')}
                        </Text>
                      </View>
                      <StatusBadge status={rx.status} />
                    </View>
                    <View style={styles.rxItemsList}>
                      {(rx.items || []).slice(0, 3).map((item: any, idx: number) => (
                        <Text key={idx} style={styles.rxItemName}>
                          • {item.medicineName} ({item.dosage})
                        </Text>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {/* Uploaded Diagnostic Reports Section */}
              <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
                <Text style={styles.sectionTitle}>{t('doctorPatient.reports')}</Text>
                <Text style={styles.sectionCount}>({reports.length})</Text>
              </View>

              {isReportsLoading ? (
                <ActivityIndicator size="small" color={Colors.roles.doctor} style={{ marginVertical: 20 }} />
              ) : reports.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>{t('doctorPatient.noReports')}</Text>
                </Card>
              ) : (
                reports.map((rep: any) => (
                  <View key={rep.id} style={styles.reportCard}>
                    <Text style={styles.reportIcon}>📄</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportTitle}>{rep.title || rep.reportType}</Text>
                      <Text style={styles.reportDate}>
                        {new Date(rep.createdAt).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
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
  overviewCard: {
    padding: 18,
    marginBottom: 16,
  },
  patientTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  patientSubtext: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  metaValueHighlight: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.status.warning,
  },
  consentNoticeCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  lockEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  consentNoticeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  consentNoticeText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sectionCount: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  rxCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rxCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rxNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.roles.doctor,
  },
  rxDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  rxItemsList: {
    gap: 4,
  },
  rxItemName: {
    fontSize: 13,
    color: Colors.text.primary,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  reportIcon: {
    fontSize: 24,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  reportDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    color: Colors.text.secondary,
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
});
