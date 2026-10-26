import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';

interface DoctorData {
  id: string;
  specialization: string;
  clinicAddress: string;
  user?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface ConsentItem {
  id: string;
  patientId: string;
  doctorId: string;
  isActive: boolean;
  grantedAt: string;
  revokedAt?: string | null;
  notes?: string | null;
  doctor?: DoctorData;
}

export default function PatientConsentScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [isGrantModalVisible, setIsGrantModalVisible] = useState(false);
  const [revokingDoctorId, setRevokingDoctorId] = useState<string | null>(null);

  // Grant form states
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorData | null>(null);
  const [grantNotes, setGrantNotes] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Fetch patient's consent records
  const {
    data: consents = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<ConsentItem[]>({
    queryKey: ['consent', 'patient'],
    queryFn: async () => {
      const res = await api.get('/consent/my');
      return res.data?.data || [];
    },
  });

  // 2. Fetch doctors for consent granting
  const { data: doctors = [], isLoading: isLoadingDoctors } = useQuery<DoctorData[]>({
    queryKey: ['doctors', 'consent', doctorSearch],
    queryFn: async () => {
      const res = await api.get('/doctors', {
        params: doctorSearch ? { q: doctorSearch } : undefined,
      });
      return res.data?.data || [];
    },
    enabled: isGrantModalVisible,
  });

  // 3. Grant consent mutation
  const grantMutation = useMutation({
    mutationFn: async (payload: { doctorId: string; notes?: string }) => {
      const res = await api.post('/consent/grant', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent'] });
      setIsGrantModalVisible(false);
      resetGrantForm();
      Alert.alert(
        'Consent Granted',
        'The doctor can now securely view your clinical documents and test reports.'
      );
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to grant consent. Please try again.';
      setFormError(msg);
    },
  });

  // 4. Revoke consent mutation
  const revokeMutation = useMutation({
    mutationFn: async (doctorId: string) => {
      setRevokingDoctorId(doctorId);
      const res = await api.post('/consent/revoke', { doctorId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent'] });
      Alert.alert(
        'Consent Revoked',
        'Clinical access has been revoked. The doctor can no longer view your health reports.'
      );
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to revoke consent.';
      Alert.alert('Error', msg);
    },
    onSettled: () => {
      setRevokingDoctorId(null);
    },
  });

  const resetGrantForm = () => {
    setSelectedDoctor(null);
    setGrantNotes('');
    setFormError('');
  };

  const handleRevoke = (consent: ConsentItem) => {
    const doctorName = consent.doctor?.user?.name || 'this doctor';
    Alert.alert(
      'Revoke Clinical Consent',
      `Are you sure you want to revoke Dr. ${doctorName}'s access to your medical vault?`,
      [
        { text: 'Keep Access', style: 'cancel' },
        {
          text: 'Revoke Access',
          style: 'destructive',
          onPress: () => revokeMutation.mutate(consent.doctorId),
        },
      ]
    );
  };

  const handleGrantSubmit = () => {
    setFormError('');
    if (!selectedDoctor) {
      setFormError('Please select a physician to grant access.');
      return;
    }
    grantMutation.mutate({
      doctorId: selectedDoctor.id,
      notes: grantNotes.trim() || undefined,
    });
  };

  const activeConsents = consents.filter((c) => c.isActive);
  const pastConsents = consents.filter((c) => !c.isActive);
  const displayedConsents = activeTab === 'active' ? activeConsents : pastConsents;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clinical Consent</Text>
          <Text style={styles.headerSubtitle}>
            Control which doctors can access your health records
          </Text>
        </View>
        <TouchableOpacity
          style={styles.grantBtn}
          onPress={() => {
            resetGrantForm();
            setIsGrantModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.grantBtnText}>+ Grant</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.tabTextActive,
            ]}
          >
            Active Access ({activeConsents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && styles.tabTextActive,
            ]}
          >
            Revoked History ({pastConsents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notice Card */}
      <View style={styles.privacyNotice}>
        <Text style={styles.privacyNoticeIcon}>🛡️</Text>
        <Text style={styles.privacyNoticeText}>
          Under ANVAYA's zero-knowledge consent architecture, doctors can only view
          your reports if you grant explicit permission. You can revoke it anytime.
        </Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.roles.patient} />
          <Text style={styles.loadingText}>Loading consent permissions...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load consents</Text>
          <Text style={styles.errorSubtitle}>
            Please pull down to retry or check your network connection.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : displayedConsents.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'active'
              ? 'No Active Doctor Access'
              : 'No Revocation History'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'active'
              ? 'None of your medical records are shared with any doctors right now.'
              : 'Previously revoked consent permissions will be archived here.'}
          </Text>
          {activeTab === 'active' && (
            <TouchableOpacity
              style={styles.emptyGrantBtn}
              onPress={() => {
                resetGrantForm();
                setIsGrantModalVisible(true);
              }}
            >
              <Text style={styles.emptyGrantBtnText}>Grant Access to a Doctor</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayedConsents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.roles.patient}
              colors={[Colors.roles.patient]}
            />
          }
          renderItem={({ item }) => {
            const grantedDate = new Date(item.grantedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const revokedDate = item.revokedAt
              ? new Date(item.revokedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null;
            const isRevoking = revokingDoctorId === item.doctorId;

            return (
              <View style={styles.consentCard}>
                <View style={styles.consentCardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.doctorName}>
                      Dr. {item.doctor?.user?.name || 'Physician'}
                    </Text>
                    <Text style={styles.doctorSpec}>
                      {item.doctor?.specialization || 'Clinical Specialist'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      item.isActive ? styles.statusPillActive : styles.statusPillRevoked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.isActive ? styles.statusTextActive : styles.statusTextRevoked,
                      ]}
                    >
                      {item.isActive ? 'AUTHORIZED' : 'REVOKED'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {item.doctor?.clinicAddress ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Clinic:</Text>
                    <Text style={styles.metaValue}>{item.doctor.clinicAddress}</Text>
                  </View>
                ) : null}

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Granted:</Text>
                  <Text style={styles.metaValue}>{grantedDate}</Text>
                </View>

                {revokedDate ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Revoked:</Text>
                    <Text style={[styles.metaValue, { color: Colors.status.error }]}>
                      {revokedDate}
                    </Text>
                  </View>
                ) : null}

                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>Consent Note: {item.notes}</Text>
                  </View>
                ) : null}

                {item.isActive && (
                  <TouchableOpacity
                    style={styles.revokeBtn}
                    onPress={() => handleRevoke(item)}
                    disabled={isRevoking}
                  >
                    {isRevoking ? (
                      <ActivityIndicator size="small" color={Colors.status.error} />
                    ) : (
                      <Text style={styles.revokeBtnText}>Revoke Clinical Access</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Grant Consent Modal */}
      <Modal
        visible={isGrantModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsGrantModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Grant Doctor Access</Text>
                <TouchableOpacity
                  onPress={() => setIsGrantModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {formError ? (
                  <View style={styles.errorAlert}>
                    <Text style={styles.errorAlertText}>{formError}</Text>
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>Search Doctor *</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Doctor name, specialization or clinic..."
                  placeholderTextColor={Colors.text.muted}
                  value={doctorSearch}
                  onChangeText={setDoctorSearch}
                />

                {isLoadingDoctors ? (
                  <ActivityIndicator
                    size="small"
                    color={Colors.roles.patient}
                    style={{ marginVertical: 12 }}
                  />
                ) : doctors.length === 0 ? (
                  <Text style={styles.hintText}>No verified doctors found.</Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.doctorPillsContainer}
                  >
                    {doctors.map((doc) => {
                      const isSelected = selectedDoctor?.id === doc.id;
                      return (
                        <TouchableOpacity
                          key={doc.id}
                          style={[
                            styles.doctorPill,
                            isSelected && styles.doctorPillSelected,
                          ]}
                          onPress={() => setSelectedDoctor(doc)}
                        >
                          <Text
                            style={[
                              styles.doctorPillName,
                              isSelected && styles.doctorPillNameSelected,
                            ]}
                          >
                            Dr. {doc.user?.name || 'Physician'}
                          </Text>
                          <Text
                            style={[
                              styles.doctorPillSpec,
                              isSelected && styles.doctorPillSpecSelected,
                            ]}
                          >
                            {doc.specialization}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {selectedDoctor && (
                  <View style={styles.selectedDoctorBox}>
                    <Text style={styles.selectedDoctorTitle}>
                      Granting to: Dr. {selectedDoctor.user?.name}
                    </Text>
                    <Text style={styles.selectedDoctorSubtitle}>
                      {selectedDoctor.specialization} • {selectedDoctor.clinicAddress}
                    </Text>
                  </View>
                )}

                <Text style={styles.fieldLabel}>Consultation Scope / Purpose</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g. Second opinion for cardiology report, prescription consultation..."
                  placeholderTextColor={Colors.text.muted}
                  value={grantNotes}
                  onChangeText={setGrantNotes}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[
                    styles.submitGrantBtn,
                    (!selectedDoctor || grantMutation.isPending) && styles.btnDisabled,
                  ]}
                  onPress={handleGrantSubmit}
                  disabled={!selectedDoctor || grantMutation.isPending}
                >
                  {grantMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitGrantBtnText}>Authorize Clinical Access</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
  grantBtn: {
    backgroundColor: Colors.roles.patient,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
  },
  tabTextActive: {
    color: Colors.text.primary,
  },
  privacyNotice: {
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
  privacyNoticeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  consentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  consentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  doctorSpec: {
    fontSize: 12,
    color: Colors.roles.patient,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPillRevoked: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextActive: {
    color: Colors.status.success,
  },
  statusTextRevoked: {
    color: Colors.status.error,
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
    width: 70,
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
  },
  notesText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  revokeBtn: {
    marginTop: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.status.error,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  revokeBtnText: {
    color: Colors.status.error,
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  emptyGrantBtn: {
    backgroundColor: Colors.roles.patient,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyGrantBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
    paddingBottom: 24,
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
  },
  errorAlert: {
    backgroundColor: Colors.status.errorBackground,
    borderWidth: 1,
    borderColor: Colors.status.error,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorAlertText: {
    color: Colors.status.error,
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
    marginTop: 10,
  },
  searchInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  hintText: {
    color: Colors.text.muted,
    fontSize: 12,
    marginTop: 4,
  },
  doctorPillsContainer: {
    marginVertical: 10,
    flexDirection: 'row',
  },
  doctorPill: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    minWidth: 140,
  },
  doctorPillSelected: {
    borderColor: Colors.roles.patient,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  doctorPillName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  doctorPillNameSelected: {
    color: Colors.roles.patient,
  },
  doctorPillSpec: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 2,
  },
  doctorPillSpecSelected: {
    color: Colors.text.secondary,
  },
  selectedDoctorBox: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: Colors.roles.patient,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  selectedDoctorTitle: {
    color: Colors.roles.patient,
    fontWeight: '700',
    fontSize: 13,
  },
  selectedDoctorSubtitle: {
    color: Colors.text.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  submitGrantBtn: {
    backgroundColor: Colors.roles.patient,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitGrantBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
