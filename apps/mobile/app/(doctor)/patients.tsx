import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ReportType } from '@anvaya/shared';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';
import { StatusBadge, Button } from '../../components/ui';
import { ReportViewModal } from '../../components/ReportViewModal';

interface ConsentingPatient {
  id: string; // consent id
  patientId: string;
  doctorId: string;
  isActive: boolean;
  grantedAt: string;
  notes?: string | null;
  patient?: {
    id: string;
    dob?: string | null;
    gender?: string | null;
    user?: {
      id: string;
      name: string;
      email: string;
      phone: string;
    } | null;
  } | null;
}

interface PatientReport {
  id: string;
  patientId: string;
  title: string;
  fileUrl: string;
  type: ReportType;
  notes?: string | null;
  uploadedAt: string;
}

export default function DoctorPatientsScreen() {
  const [selectedPatient, setSelectedPatient] = useState<ConsentingPatient | null>(null);
  const [viewingReport, setViewingReport] = useState<PatientReport | null>(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  // 1. Fetch patients who granted consent to this doctor
  const {
    data: consentingPatients = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<ConsentingPatient[]>({
    queryKey: ['consentingPatients'],
    queryFn: async () => {
      const res = await api.get('/consent/patients');
      return res.data?.data || [];
    },
  });

  // 2. Fetch reports for the selected patient
  const {
    data: patientReports = [],
    isLoading: isLoadingReports,
    error: reportsError,
    refetch: refetchReports,
  } = useQuery<PatientReport[]>({
    queryKey: ['patientReports', selectedPatient?.patientId],
    queryFn: async () => {
      if (!selectedPatient?.patientId) return [];
      const res = await api.get('/reports', {
        params: { patientId: selectedPatient.patientId },
      });
      return res.data?.data || [];
    },
    enabled: !!selectedPatient,
  });

  const handleOpenReport = (report: PatientReport) => {
    setViewingReport(report);
    setIsReportModalVisible(true);
  };

  const getReportTypeBadge = (type: ReportType) => {
    switch (type) {
      case ReportType.LAB_REPORT:
        return { label: 'Lab Report', color: Colors.roles.doctor };
      case ReportType.IMAGING:
        return { label: 'Imaging / Scan', color: Colors.accent };
      case ReportType.DISCHARGE_SUMMARY:
        return { label: 'Discharge Summary', color: Colors.roles.patient };
      default:
        return { label: 'Clinical Document', color: Colors.text.secondary };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Consenting Patients</Text>
          <Text style={styles.headerSubtitle}>
            Patients who authorized clinical vault access
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Security notice */}
      <View style={styles.securityBanner}>
        <Text style={styles.securityIcon}>🔐</Text>
        <Text style={styles.securityText}>
          Audit Notice: Viewing patient reports records a compliance audit entry as
          mandated by healthcare data guidelines.
        </Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryLight} />
          <Text style={styles.loadingText}>Retrieving authorized patients...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load patients</Text>
          <Text style={styles.errorSubtitle}>
            Please pull down to retry or verify your doctor credentials.
          </Text>
          <Button
            variant="outline"
            size="sm"
            title="Retry"
            onPress={() => refetch()}
            style={{ marginTop: 12 }}
          />
        </View>
      ) : consentingPatients.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No Authorized Patients</Text>
          <Text style={styles.emptySubtitle}>
            When a patient grants you clinical access from their ANVAYA app, their
            profile and digital reports will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={consentingPatients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primaryLight}
              colors={[Colors.primaryLight]}
            />
          }
          renderItem={({ item }) => {
            const grantedDate = new Date(item.grantedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const patientName = item.patient?.user?.name || 'Registered Patient';
            const phone = item.patient?.user?.phone;
            const email = item.patient?.user?.email;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.patientName}>{patientName}</Text>
                    {phone ? (
                      <Text style={styles.patientContact}>📞 {phone}</Text>
                    ) : null}
                    {email ? (
                      <Text style={styles.patientContact}>✉️ {email}</Text>
                    ) : null}
                  </View>
                  <StatusBadge label="ACTIVE ACCESS" variant="success" />
                </View>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Authorized:</Text>
                  <Text style={styles.metaValue}>{grantedDate}</Text>
                </View>

                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>Scope: {item.notes}</Text>
                  </View>
                ) : null}

                {/* View Vault Button */}
                <Button
                  variant="secondary"
                  title="📂 View Clinical Reports"
                  onPress={() => setSelectedPatient(item)}
                  style={{ marginTop: 12 }}
                />
              </View>
            );
          }}
        />
      )}

      {/* Patient Reports Modal */}
      <Modal
        visible={!!selectedPatient}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPatient(null)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {selectedPatient?.patient?.user?.name || 'Patient'}'s Vault
                  </Text>
                  <Text style={styles.modalSubtitle}>Authorized clinical documents</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedPatient(null)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {isLoadingReports ? (
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.primaryLight} />
                    <Text style={styles.loadingText}>Fetching reports...</Text>
                  </View>
                ) : reportsError ? (
                  <View style={styles.centerContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorTitle}>Access Restricted</Text>
                    <Text style={styles.errorSubtitle}>
                      Consent may have expired or was revoked by the patient.
                    </Text>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => refetchReports()}
                    >
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : patientReports.length === 0 ? (
                  <View style={styles.centerContainer}>
                    <Text style={styles.emptyIcon}>📄</Text>
                    <Text style={styles.emptyTitle}>No Uploaded Reports</Text>
                    <Text style={styles.emptySubtitle}>
                      This patient has not uploaded any reports to their vault yet.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    {patientReports.map((report) => {
                      const badge = getReportTypeBadge(report.type);
                      const uploadedDate = new Date(report.uploadedAt).toLocaleDateString(
                        'en-IN',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      );

                      return (
                        <View key={report.id} style={styles.reportItemCard}>
                          <View style={styles.reportItemHeader}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={styles.reportItemTitle}>{report.title}</Text>
                              <Text style={styles.reportItemDate}>
                                Uploaded on {uploadedDate}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.typeBadge,
                                {
                                  borderColor: badge.color,
                                  backgroundColor: 'rgba(255,255,255,0.05)',
                                },
                              ]}
                            >
                              <Text style={[styles.typeBadgeText, { color: badge.color }]}>
                                {badge.label}
                              </Text>
                            </View>
                          </View>

                          {report.notes ? (
                            <View style={styles.reportNotesBox}>
                              <Text style={styles.reportNotesText}>{report.notes}</Text>
                            </View>
                          ) : null}

                          <TouchableOpacity
                            style={styles.openDocBtn}
                            onPress={() => handleOpenReport(report)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.openDocBtnText}>
                              👁️ Open Document / File
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Authenticated In-App Report Viewer Modal */}
      <ReportViewModal
        visible={isReportModalVisible}
        report={viewingReport}
        onClose={() => {
          setIsReportModalVisible(false);
          setViewingReport(null);
        }}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  refreshBtn: {
    padding: 8,
  },
  refreshBtnText: {
    fontSize: 18,
  },
  securityBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    alignItems: 'center',
  },
  securityIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
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
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  patientContact: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  consentBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: Colors.status.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  consentBadgeText: {
    color: Colors.status.success,
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  metaLabel: {
    width: 80,
    fontSize: 12,
    color: Colors.text.muted,
  },
  metaValue: {
    flex: 1,
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  notesBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  viewVaultBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  viewVaultBtnText: {
    color: Colors.primaryLight,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: Colors.text.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
    minHeight: 250,
  },
  reportItemCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  reportItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reportItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  reportItemDate: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 2,
  },
  typeBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reportNotesBox: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  reportNotesText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  openDocBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  openDocBtnText: {
    color: Colors.primaryLight,
    fontWeight: '600',
    fontSize: 12,
  },
});
