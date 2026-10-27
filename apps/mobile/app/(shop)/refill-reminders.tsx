import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateRefillReminderInput } from '@anvaya/shared';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';
import { StatusBadge } from '../../components/ui';

interface RefillMedicineItem {
  id?: string;
  medicine: string;
}

interface ShopRefillReminderItem {
  id: string;
  shopId: string;
  prescriptionId: string;
  remindAt: string;
  sent: boolean;
  notes?: string | null;
  patient?: {
    id: string;
    user?: {
      name: string;
      phone: string;
    };
  };
  prescription?: {
    id: string;
    code: string;
    patient?: {
      user?: {
        name: string;
      };
    };
    items?: RefillMedicineItem[];
  };
}

export default function ShopRefillRemindersScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    prescriptionId?: string;
    patientName?: string;
    prescriptionCode?: string;
  }>();

  const [createModalVisible, setCreateModalVisible] = useState(
    !!params.prescriptionId
  );
  const [prescriptionId, setPrescriptionId] = useState(
    params.prescriptionId || ''
  );
  const patientDisplayName = params.patientName || '';
  const [daysAhead, setDaysAhead] = useState(30);
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [useCustomDate, setUseCustomDate] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // Fetch shop's refill reminders
  const {
    data: reminders = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<ShopRefillReminderItem[]>({
    queryKey: ['refills'],
    queryFn: async () => {
      const response = await api.get('/refills');
      return response.data?.data || [];
    },
  });

  // Calculate target reminder date
  const computeTargetIsoDate = () => {
    if (useCustomDate && customDate) {
      const parsed = new Date(customDate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString();
  };

  // Submit new reminder
  const handleCreateReminder = async () => {
    if (!prescriptionId.trim()) {
      setCreateError('Valid prescription ID is required.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const payload: CreateRefillReminderInput = {
        prescriptionId: prescriptionId.trim(),
        remindAt: computeTargetIsoDate(),
      };

      await api.post('/refills', payload);

      await queryClient.invalidateQueries({ queryKey: ['refills'] });

      setCreateModalVisible(false);
      Alert.alert(
        'Refill Reminder Scheduled',
        `An automated push notification will be sent to the patient when due.`
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setCreateError(
        axiosErr.response?.data?.message ||
          'Failed to schedule refill reminder. Ensure prescription exists and was dispensed.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel reminder
  const handleCancelReminder = (id: string) => {
    Alert.alert(
      'Cancel Reminder',
      'Are you sure you want to cancel this scheduled patient refill reminder?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Reminder',
          style: 'destructive',
          onPress: async () => {
            setCancelingId(id);
            try {
              await api.delete(`/refills/${id}`);
              await queryClient.invalidateQueries({ queryKey: ['refills'] });
            } catch (err: unknown) {
              const axiosErr = err as { response?: { data?: { message?: string } } };
              Alert.alert(
                'Error',
                axiosErr.response?.data?.message || 'Could not cancel reminder.'
              );
            } finally {
              setCancelingId(null);
            }
          },
        },
      ]
    );
  };

  const renderReminderItem = ({ item }: { item: ShopRefillReminderItem }) => {
    const isSent = item.sent;
    const remindDate = new Date(item.remindAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const patientName =
      item.prescription?.patient?.user?.name ||
      item.patient?.user?.name ||
      'Patient';
    const medList = (item.prescription?.items || [])
      .map((m: RefillMedicineItem) => m.medicine)
      .join(', ');

    return (
      <View style={styles.reminderCard}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>👤 {patientName}</Text>
            <Text style={styles.prescriptionCode}>
              {item.prescription?.code || 'Prescription Refill'}
            </Text>
          </View>
          <StatusBadge
            label={isSent ? '✓ PUSH SENT' : '⏳ SCHEDULED'}
            variant={isSent ? 'success' : 'warning'}
          />
        </View>

        {medList ? (
          <Text style={styles.medicationList} numberOfLines={2}>
            💊 {medList}
          </Text>
        ) : null}

        <View style={styles.cardFooterRow}>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Due Date</Text>
            <Text style={styles.dateValue}>{remindDate}</Text>
          </View>

          {!isSent && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancelReminder(item.id)}
              disabled={cancelingId === item.id}
            >
              {cancelingId === item.id ? (
                <ActivityIndicator color={Colors.status.error} size="small" />
              ) : (
                <Text style={styles.cancelBtnText}>Cancel</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>PATIENT ADHERENCE</Text>
          <Text style={styles.headerTitle}>Refill Reminders</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => {
            setCreateError(null);
            setCreateModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.createBtnText}>+ New Reminder</Text>
        </TouchableOpacity>
      </View>

      {/* Info Notice */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoIcon}>🔔</Text>
        <Text style={styles.infoText}>
          When due, the ANVAYA automated cron daemon dispatches an Expo push
          notification directly to the patient’s device.
        </Text>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.roles.shop} size="large" />
          <Text style={styles.loadingText}>Loading refill schedule...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load reminders</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : reminders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>⏰</Text>
          <Text style={styles.emptyTitle}>No Reminders Scheduled</Text>
          <Text style={styles.emptySubtitle}>
            Help patients stay on course with their maintenance medications by
            setting scheduled refill notifications after dispensing.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => {
              setCreateError(null);
              setCreateModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyActionText}>Schedule First Reminder →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={renderReminderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}

      {/* CREATE REMINDER MODAL */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Schedule Refill Alert</Text>
                <Text style={styles.modalSubtitle}>
                  Push notification sent to patient on due date
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {/* Prescription ID Field */}
              <View>
                <Text style={styles.fieldLabel}>Dispensed Prescription ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="UUID of dispensed prescription"
                  placeholderTextColor={Colors.text.muted}
                  value={prescriptionId}
                  onChangeText={setPrescriptionId}
                />
                {patientDisplayName ? (
                  <Text style={styles.helperText}>
                    Patient: {patientDisplayName}
                  </Text>
                ) : null}
              </View>

              {/* Schedule Presets */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.fieldLabel}>Remind In</Text>
                <View style={styles.presetRow}>
                  {[15, 30, 45, 60].map((days) => {
                    const isSelected = !useCustomDate && daysAhead === days;
                    return (
                      <TouchableOpacity
                        key={days}
                        style={[
                          styles.presetChip,
                          isSelected && styles.presetChipActive,
                        ]}
                        onPress={() => {
                          setDaysAhead(days);
                          setUseCustomDate(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected && styles.presetChipTextActive,
                          ]}
                        >
                          {days} Days
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Custom Date Input */}
              <View style={{ marginTop: 14 }}>
                <TouchableOpacity
                  style={styles.customDateToggle}
                  onPress={() => setUseCustomDate(!useCustomDate)}
                >
                  <Text style={styles.customDateToggleText}>
                    {useCustomDate ? '✓ Using Custom Date' : 'Specify Custom Date (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>

                {useCustomDate && (
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.text.muted}
                    value={customDate}
                    onChangeText={setCustomDate}
                  />
                )}
              </View>

              {/* Target Notification Preview */}
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Scheduled Target Date</Text>
                <Text style={styles.previewDate}>
                  {new Date(computeTargetIsoDate()).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              {createError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>⚠️ {createError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  isSubmitting && styles.submitBtnDisabled,
                ]}
                onPress={handleCreateReminder}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    Confirm & Schedule Push Alert 🔔
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
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
    paddingTop: 8,
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.roles.shop,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  createBtn: {
    backgroundColor: Colors.roles.shop,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 10,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  reminderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  prescriptionCode: {
    fontSize: 12,
    color: Colors.roles.shop,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeSent: {
    backgroundColor: Colors.status.successBackground,
    borderColor: Colors.status.success,
    borderWidth: 1,
  },
  badgeSentText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.status.success,
  },
  badgePending: {
    backgroundColor: Colors.status.warningBackground,
    borderColor: Colors.status.warning,
    borderWidth: 1,
  },
  badgePendingText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.status.warning,
  },
  medicationList: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dateCol: {
    gap: 2,
  },
  dateLabel: {
    fontSize: 10,
    color: Colors.text.muted,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.status.errorBackground,
  },
  cancelBtnText: {
    color: Colors.status.error,
    fontSize: 11,
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 30,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  errorEmoji: {
    fontSize: 28,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  retryBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  retryBtnText: {
    color: Colors.primaryLight,
    fontWeight: '600',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyActionBtn: {
    marginTop: 12,
    backgroundColor: Colors.roles.shop,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalText: {
    color: Colors.text.muted,
    fontWeight: '800',
    fontSize: 14,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 13,
  },
  helperText: {
    fontSize: 11,
    color: Colors.roles.shop,
    marginTop: 4,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetChipActive: {
    borderColor: Colors.roles.shop,
    backgroundColor: Colors.roles.shopBackground,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  presetChipTextActive: {
    color: Colors.roles.shop,
    fontWeight: '700',
  },
  customDateToggle: {
    paddingVertical: 4,
  },
  customDateToggleText: {
    fontSize: 12,
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  previewBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  previewLabel: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  previewDate: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.roles.shop,
  },
  errorBox: {
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  errorBoxText: {
    fontSize: 12,
    color: Colors.status.error,
  },
  submitBtn: {
    marginTop: 20,
    backgroundColor: Colors.roles.shop,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
