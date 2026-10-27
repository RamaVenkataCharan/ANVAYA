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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppointmentStatus } from '@anvaya/shared';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';

interface AppointmentItem {
  id: string;
  doctorId: string;
  patientId: string;
  dateTime: string;
  status: AppointmentStatus;
  reason: string;
  notes?: string | null;
  patient?: {
    id: string;
    user?: {
      name: string;
      email: string;
      phone: string;
    };
  };
}

export default function DoctorAppointmentsScreen() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // 1. Fetch doctor's appointments
  const {
    data: appointments = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<AppointmentItem[]>({
    queryKey: ['appointments', 'doctor'],
    queryFn: async () => {
      const res = await api.get('/appointments');
      return res.data?.data || [];
    },
  });

  // 2. Update status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      setUpdatingId(id);
      const res = await api.patch(`/appointments/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Alert.alert('Status Updated', `Appointment marked as ${variables.status}.`);
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        'Failed to update appointment status.';
      Alert.alert('Update Failed', msg);
    },
    onSettled: () => {
      setUpdatingId(null);
    },
  });

  const handleUpdateStatus = (
    item: AppointmentItem,
    newStatus: AppointmentStatus,
    actionName: string
  ) => {
    Alert.alert(
      `${actionName} Appointment`,
      `Are you sure you want to mark this appointment as ${newStatus}?`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: `Yes, ${actionName}`,
          style: newStatus === AppointmentStatus.CANCELLED ? 'destructive' : 'default',
          onPress: () => statusMutation.mutate({ id: item.id, status: newStatus }),
        },
      ]
    );
  };

  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter === 'ALL') return true;
    return a.status === statusFilter;
  });

  const getStatusBadge = (status: AppointmentStatus) => {
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
          <Text style={styles.headerTitle}>Clinic Schedule</Text>
          <Text style={styles.headerSubtitle}>Manage patient consultation requests</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterScroll}>
        {(['ALL', AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED] as const).map(
          (filter) => {
            const isSelected = statusFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setStatusFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryLight} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load appointments</Text>
          <Text style={styles.errorSubtitle}>
            Please pull down to retry or verify your network connection.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredAppointments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🩺</Text>
          <Text style={styles.emptyTitle}>No Appointments Found</Text>
          <Text style={styles.emptySubtitle}>
            {statusFilter === 'ALL'
              ? 'You do not have any patient consultation bookings right now.'
              : `No appointments with status "${statusFilter}".`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
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
            const statusStyle = getStatusBadge(item.status);
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

            const isPendingAction = updatingId === item.id;
            const canConfirm = item.status === AppointmentStatus.SCHEDULED;
            const canComplete =
              item.status === AppointmentStatus.SCHEDULED ||
              item.status === AppointmentStatus.CONFIRMED;
            const canCancel =
              item.status === AppointmentStatus.SCHEDULED ||
              item.status === AppointmentStatus.CONFIRMED;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>
                      {item.patient?.user?.name || 'Registered Patient'}
                    </Text>
                    {item.patient?.user?.phone ? (
                      <Text style={styles.patientPhone}>
                        📞 {item.patient.user.phone}
                      </Text>
                    ) : null}
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

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Scheduled:</Text>
                  <Text style={styles.infoValue}>
                    {formattedDate} at {formattedTime}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Reason:</Text>
                  <Text style={styles.infoValue}>{item.reason}</Text>
                </View>

                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>Patient note: {item.notes}</Text>
                  </View>
                ) : null}

                {/* Role-based action transitions */}
                {(canConfirm || canComplete || canCancel) && (
                  <View style={styles.actionRow}>
                    {canConfirm && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.confirmBtn]}
                        onPress={() =>
                          handleUpdateStatus(
                            item,
                            AppointmentStatus.CONFIRMED,
                            'Confirm'
                          )
                        }
                        disabled={isPendingAction}
                      >
                        <Text style={styles.confirmBtnText}>✓ Confirm</Text>
                      </TouchableOpacity>
                    )}

                    {canComplete && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.completeBtn]}
                        onPress={() =>
                          handleUpdateStatus(
                            item,
                            AppointmentStatus.COMPLETED,
                            'Complete'
                          )
                        }
                        disabled={isPendingAction}
                      >
                        <Text style={styles.completeBtnText}>★ Complete</Text>
                      </TouchableOpacity>
                    )}

                    {canCancel && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.cancelBtn]}
                        onPress={() =>
                          handleUpdateStatus(
                            item,
                            AppointmentStatus.CANCELLED,
                            'Cancel'
                          )
                        }
                        disabled={isPendingAction}
                      >
                        <Text style={styles.cancelBtnText}>✕ Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {isPendingAction && (
                  <ActivityIndicator
                    size="small"
                    color={Colors.primaryLight}
                    style={{ marginTop: 8 }}
                  />
                )}
              </View>
            );
          }}
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
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryLight,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
  patientInfo: {
    flex: 1,
    marginRight: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  patientPhone: {
    fontSize: 12,
    color: Colors.text.muted,
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
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    width: 80,
    fontSize: 12,
    color: Colors.text.muted,
  },
  infoValue: {
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: Colors.status.success,
  },
  confirmBtnText: {
    color: Colors.status.success,
    fontSize: 12,
    fontWeight: '700',
  },
  completeBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  completeBtnText: {
    color: Colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: Colors.status.error,
  },
  cancelBtnText: {
    color: Colors.status.error,
    fontSize: 12,
    fontWeight: '700',
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
