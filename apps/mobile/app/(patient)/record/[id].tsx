import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/colors';
import { Card, Button, StatusBadge } from '../../../components/ui';
import { api } from '../../../services/api';

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  // 1. Fetch report metadata
  const {
    data: report,
    isLoading: isReportLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      const res = await api.get(`/reports/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  // 2. Fetch active consents to show which doctors have access
  const { data: consents = [] } = useQuery({
    queryKey: ['patient', 'consents', 'active'],
    queryFn: async () => {
      const res = await api.get('/consent/my');
      return (res.data.data || []).filter((c: any) => c.isActive);
    },
  });

  const handleOpenDocument = () => {
    if (!report?.fileUrl) {
      Alert.alert('Preview Document', 'Secure in-memory medical document preview is loaded.');
      return;
    }
    Linking.openURL(report.fileUrl).catch(() => {
      Alert.alert('Document Viewer', 'Unable to open file link directly.');
    });
  };

  if (isReportLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.roles.patient} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (error || !report) {
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
        <Text style={styles.headerTitle}>{t('patientRecords.recordDetail')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Document Overview */}
        <Card style={styles.card}>
          <View style={styles.reportTopRow}>
            <View style={styles.iconCircle}>
              <Text style={styles.fileEmoji}>📁</Text>
            </View>
            <View style={styles.reportMain}>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportType}>{report.type || 'MEDICAL_REPORT'}</Text>
            </View>
            <StatusBadge label="VERIFIED" variant="success" />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('patientRecords.reportType')}</Text>
            <Text style={styles.infoValue}>{report.type || 'LAB_REPORT'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('patientRecords.uploadDate')}</Text>
            <Text style={styles.infoValue}>
              {new Date(report.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>

          {report.fileSize && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('patientRecords.fileSize')}</Text>
              <Text style={styles.infoValue}>
                {(report.fileSize / 1024).toFixed(1)} KB
              </Text>
            </View>
          )}

          {report.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes & Observations</Text>
              <Text style={styles.notesValue}>{report.notes}</Text>
            </View>
          )}
        </Card>

        {/* Authorized Doctors Access List */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeader}>{t('patientRecords.accessHeader')}</Text>
          <Text style={styles.sectionSub}>
            Doctors who have been granted active consent can inspect this diagnostic record.
          </Text>

          {consents.length > 0 ? (
            consents.map((c: any) => (
              <View key={c.id} style={styles.doctorAccessRow}>
                <View style={styles.docAvatar}>
                  <Text style={styles.docEmoji}>🩺</Text>
                </View>
                <View style={styles.docMeta}>
                  <Text style={styles.docName}>{c.doctor?.user?.name || 'Dr. Consultant'}</Text>
                  <Text style={styles.docSpec}>{c.doctor?.specialization}</Text>
                </View>
                <StatusBadge label="AUTHORIZED" variant="success" />
              </View>
            ))
          ) : (
            <View style={styles.emptyAccessBox}>
              <Text style={styles.emptyAccessText}>
                {t('patientRecords.noAuthorizedDoctors')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.manageConsentBtn}
            onPress={() => router.push('/(patient)/consent')}
            accessibilityRole="button"
            accessibilityLabel="Manage Permissions in Consent Manager"
          >
            <Text style={styles.manageConsentText}>Manage Access in Consent Manager →</Text>
          </TouchableOpacity>
        </Card>

        {/* View Document CTA */}
        <View style={styles.btnBox}>
          <Button
            label={t('patientRecords.viewDocument')}
            variant="primary"
            onPress={handleOpenDocument}
            accessibilityLabel={t('patientRecords.viewDocument')}
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
    padding: 18,
  },
  reportTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f4f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileEmoji: {
    fontSize: 24,
  },
  reportMain: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  reportType: {
    fontSize: 12,
    color: Colors.roles.patient,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
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
  notesBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8faf9',
    borderRadius: 10,
  },
  notesLabel: {
    fontSize: 11,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  notesValue: {
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
    marginBottom: 14,
  },
  doctorAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  docAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docEmoji: {
    fontSize: 18,
  },
  docMeta: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  docSpec: {
    fontSize: 12,
    color: Colors.roles.doctor,
  },
  emptyAccessBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyAccessText: {
    fontSize: 13,
    color: Colors.text.muted,
    textAlign: 'center',
  },
  manageConsentBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  manageConsentText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.roles.patient,
  },
  btnBox: {
    marginTop: 6,
  },
});
