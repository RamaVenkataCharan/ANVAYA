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
import { AppointmentStatus } from '@anvaya/shared';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';

interface DoctorItem {
  id: string;
  specialization: string;
  clinicAddress: string;
  user?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface AppointmentItem {
  id: string;
  doctorId: string;
  patientId: string;
  dateTime: string;
  status: AppointmentStatus;
  reason: string;
  notes?: string | null;
  doctor?: {
    id: string;
    specialization: string;
    clinicAddress: string;
    user?: {
      name: string;
      email: string;
      phone: string;
    };
  };
}

export default function PatientAppointmentsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isBookModalVisible, setIsBookModalVisible] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Form states
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0]; // Tomorrow
  });
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Fetch patient appointments
  const {
    data: appointments = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<AppointmentItem[]>({
    queryKey: ['appointments', 'patient'],
    queryFn: async () => {
      const res = await api.get('/appointments');
      return res.data?.data || [];
    },
  });

  // 2. Fetch verified doctors for booking
  const { data: doctors = [], isLoading: isLoadingDoctors } = useQuery<DoctorItem[]>({
    queryKey: ['doctors', doctorSearch],
    queryFn: async () => {
      const res = await api.get('/doctors', {
        params: doctorSearch ? { q: doctorSearch } : undefined,
      });
      return res.data?.data || [];
    },
    enabled: isBookModalVisible,
  });

  // 3. Book appointment mutation
  const bookMutation = useMutation({
    mutationFn: async (payload: {
      doctorId: string;
      dateTime: string;
      reason: string;
      notes?: string;
    }) => {
      const res = await api.post('/appointments', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsBookModalVisible(false);
      resetForm();
      Alert.alert('Appointment Booked', 'Your appointment has been scheduled successfully.');
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Unable to book appointment. Please try again.';
      setFormError(msg);
    },
  });

  // 4. Cancel appointment mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      setCancellingId(id);
      const res = await api.patch(`/appointments/${id}/status`, {
        status: AppointmentStatus.CANCELLED,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Alert.alert('Cancelled', 'Your appointment has been cancelled.');
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Unable to cancel this appointment.';
      Alert.alert('Cancellation Failed', msg);
    },
    onSettled: () => {
      setCancellingId(null);
    },
  });

  const resetForm = () => {
    setSelectedDoctor(null);
    setReason('');
    setNotes('');
    setFormError('');
  };

  const handleBookSubmit = () => {
    setFormError('');
    if (!selectedDoctor) {
      setFormError('Please select a doctor for your consultation.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setFormError('Please provide a reason for consultation (at least 3 characters).');
      return;
    }

    try {
      // Construct ISO string
      const fullIsoString = new Date(`${appointmentDate}T${appointmentTime}:00`).toISOString();
      bookMutation.mutate({
        doctorId: selectedDoctor.id,
        dateTime: fullIsoString,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
    } catch {
      setFormError('Invalid date or time format.');
    }
  };

  const handleCancel = (item: AppointmentItem) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your consultation with Dr. ${
        item.doctor?.user?.name || 'the doctor'
      }?`,
      [
        { text: 'Keep Appointment', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(item.id),
        },
      ]
    );
  };

  // Filter list
  const upcomingList = appointments.filter(
    (a) =>
      a.status === AppointmentStatus.SCHEDULED || a.status === AppointmentStatus.CONFIRMED
  );
  const pastList = appointments.filter(
    (a) =>
      a.status === AppointmentStatus.COMPLETED || a.status === AppointmentStatus.CANCELLED
  );
  const displayedList = activeTab === 'upcoming' ? upcomingList : pastList;

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return { bg: Colors.status.successBackground, text: Colors.status.success };
      case AppointmentStatus.SCHEDULED:
        return { bg: Colors.status.infoBackground, text: Colors.status.info };
      case AppointmentStatus.COMPLETED:
        return { bg: 'rgba(139, 92, 246, 0.15)', text: Colors.roles.patient };
      case AppointmentStatus.CANCELLED:
        return { bg: Colors.status.errorBackground, text: Colors.status.error };
      default:
        return { bg: Colors.surfaceElevated, text: Colors.text.secondary };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Consultations</Text>
          <Text style={styles.headerSubtitle}>Manage your doctor appointments</Text>
        </View>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => {
            resetForm();
            setIsBookModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.bookButtonText}>+ Book</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'upcoming' && styles.tabTextActive,
            ]}
          >
            Upcoming ({upcomingList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'past' && styles.tabTextActive,
            ]}
          >
            Past & Cancelled ({pastList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.roles.patient} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load appointments</Text>
          <Text style={styles.errorSubtitle}>
            Please check your connection and pull down to retry.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : displayedList.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'upcoming'
              ? 'No Upcoming Appointments'
              : 'No Past Appointments'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'upcoming'
              ? 'Schedule a digital consultation with any verified physician.'
              : 'Your completed and cancelled consultations will show up here.'}
          </Text>
          {activeTab === 'upcoming' && (
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={() => {
                resetForm();
                setIsBookModalVisible(true);
              }}
            >
              <Text style={styles.emptyActionText}>Book Your First Visit</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayedList}
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
            const statusStyle = getStatusColor(item.status);
            const dateObj = new Date(item.dateTime);
            const formattedDate = dateObj.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const formattedTime = dateObj.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const canCancel =
              item.status === AppointmentStatus.SCHEDULED ||
              item.status === AppointmentStatus.CONFIRMED;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>
                      Dr. {item.doctor?.user?.name || 'Consulting Physician'}
                    </Text>
                    <Text style={styles.doctorSpec}>
                      {item.doctor?.specialization || 'General Physician'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusStyle.bg },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusStyle.text }]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.cardRow}>
                  <Text style={styles.metaLabel}>Date & Time:</Text>
                  <Text style={styles.metaValue}>
                    {formattedDate} at {formattedTime}
                  </Text>
                </View>

                {item.doctor?.clinicAddress ? (
                  <View style={styles.cardRow}>
                    <Text style={styles.metaLabel}>Clinic:</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.doctor.clinicAddress}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardRow}>
                  <Text style={styles.metaLabel}>Reason:</Text>
                  <Text style={styles.metaValue} numberOfLines={2}>
                    {item.reason}
                  </Text>
                </View>

                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>Notes: {item.notes}</Text>
                  </View>
                ) : null}

                {canCancel && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancel(item)}
                    disabled={cancellingId === item.id}
                  >
                    {cancellingId === item.id ? (
                      <ActivityIndicator size="small" color={Colors.status.error} />
                    ) : (
                      <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Book Appointment Modal */}
      <Modal
        visible={isBookModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsBookModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Book Consultation</Text>
                <TouchableOpacity
                  onPress={() => setIsBookModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {formError ? (
                  <View style={styles.errorAlert}>
                    <Text style={styles.errorAlertText}>{formError}</Text>
                  </View>
                ) : null}

                {/* Doctor Selection */}
                <Text style={styles.fieldLabel}>Select Physician *</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search doctor by name or specialty..."
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
                  <Text style={styles.hintText}>No verified physicians found.</Text>
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
                  <View style={styles.selectedDoctorCard}>
                    <Text style={styles.selectedDoctorTitle}>
                      Selected: Dr. {selectedDoctor.user?.name}
                    </Text>
                    <Text style={styles.selectedDoctorSubtitle}>
                      {selectedDoctor.specialization} • {selectedDoctor.clinicAddress}
                    </Text>
                  </View>
                )}

                {/* Date Selection */}
                <Text style={styles.fieldLabel}>Appointment Date (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.text.muted}
                  value={appointmentDate}
                  onChangeText={setAppointmentDate}
                />

                {/* Time Selection */}
                <Text style={styles.fieldLabel}>Appointment Time (HH:MM 24h) *</Text>
                <View style={styles.timeSlotsRow}>
                  {['09:00', '10:30', '12:00', '14:30', '16:00', '17:30', '19:00'].map(
                    (slot) => {
                      const isSelected = appointmentTime === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          style={[
                            styles.timeSlot,
                            isSelected && styles.timeSlotSelected,
                          ]}
                          onPress={() => setAppointmentTime(slot)}
                        >
                          <Text
                            style={[
                              styles.timeSlotText,
                              isSelected && styles.timeSlotTextSelected,
                            ]}
                          >
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>

                {/* Reason */}
                <Text style={styles.fieldLabel}>Reason for Visit *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Hypertension checkup, fever, prescription review"
                  placeholderTextColor={Colors.text.muted}
                  value={reason}
                  onChangeText={setReason}
                />

                {/* Notes */}
                <Text style={styles.fieldLabel}>Additional Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any symptoms, current medications, or notes for the doctor..."
                  placeholderTextColor={Colors.text.muted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[
                    styles.submitBookBtn,
                    bookMutation.isPending && styles.btnDisabled,
                  ]}
                  onPress={handleBookSubmit}
                  disabled={bookMutation.isPending}
                >
                  {bookMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBookBtnText}>Confirm Appointment</Text>
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
  bookButton: {
    backgroundColor: Colors.roles.patient,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.muted,
  },
  tabTextActive: {
    color: Colors.text.primary,
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
  doctorInfo: {
    flex: 1,
    marginRight: 8,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  doctorSpec: {
    fontSize: 13,
    color: Colors.roles.patient,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  metaLabel: {
    width: 80,
    fontSize: 12,
    color: Colors.text.muted,
  },
  metaValue: {
    flex: 1,
    fontSize: 13,
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
  cancelButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.status.error,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  cancelButtonText: {
    color: Colors.status.error,
    fontSize: 13,
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
  retryButton: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
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
  emptyActionButton: {
    backgroundColor: Colors.roles.patient,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyActionText: {
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
  selectedDoctorCard: {
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
  timeSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  timeSlot: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timeSlotSelected: {
    borderColor: Colors.roles.patient,
    backgroundColor: Colors.roles.patient,
  },
  timeSlotText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  timeSlotTextSelected: {
    color: '#FFFFFF',
  },
  submitBookBtn: {
    backgroundColor: Colors.roles.patient,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitBookBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
