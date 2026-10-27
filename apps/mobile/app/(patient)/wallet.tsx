import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PrescriptionModel, PrescriptionStatus } from '@anvaya/shared';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';
import { StatusBadge, Button } from '../../components/ui';

interface PatientRefillItem {
  id?: string;
  medicine: string;
}

interface PatientRefillReminder {
  id: string;
  prescriptionId: string;
  remindAt: string;
  sent: boolean;
  notes?: string | null;
  prescription?: {
    id: string;
    code: string;
    items?: PatientRefillItem[];
  };
}

export default function PatientWalletScreen() {
  const router = useRouter();

  // Fetch patient's prescriptions
  const {
    data: prescriptions,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<PrescriptionModel[]>({
    queryKey: ['prescriptions', 'patient'],
    queryFn: async () => {
      const response = await api.get('/prescriptions');
      return response.data?.data || [];
    },
  });

  // Fetch patient's refill reminders
  const { data: refillReminders = [] } = useQuery<PatientRefillReminder[]>({
    queryKey: ['refills', 'patient'],
    queryFn: async () => {
      const response = await api.get('/refills');
      return response.data?.data || [];
    },
  });

  const renderItem = ({ item }: { item: PrescriptionModel }) => {
    const formattedDate = new Date(item.issuedAt || item.createdAt).toLocaleDateString(
      undefined,
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );

    const isDispensed = item.status === PrescriptionStatus.DISPENSED;

    return (
      <TouchableOpacity
        style={[styles.card, isDispensed && styles.cardDispensed]}
        onPress={() => router.push(`/(patient)/prescription/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.codeText}>{item.code}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.divider} />

        {/* Doctor Info */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Prescribing Doctor</Text>
          <Text style={styles.infoValue}>
            Dr. {item.doctor?.user?.name || 'Doctor'}
          </Text>
        </View>

        {item.doctor?.specialization && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Specialization</Text>
            <Text style={styles.infoValueSecondary}>
              {item.doctor.specialization}
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Diagnosis</Text>
          <Text style={styles.infoValueBold}>{item.diagnosis}</Text>
        </View>

        {/* Medicines Pill Count */}
        <View style={styles.medicinesFooter}>
          <View style={styles.pillBadge}>
            <Text style={styles.pillText}>
              💊 {item.items?.length || 0} {item.items?.length === 1 ? 'medication' : 'medications'}
            </Text>
          </View>
          <Text style={styles.viewQrText}>View QR Code →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Prescription Wallet</Text>
          <Text style={styles.subtitle}>
            Your digital prescriptions with single-use QR codes for pharmacy dispensing
          </Text>
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={Colors.roles.patient} size="large" />
            <Text style={styles.loadingText}>Loading prescriptions...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>Unable to load prescriptions</Text>
            <Button
              variant="outline"
              size="sm"
              title="Retry"
              onPress={() => refetch()}
            />
          </View>
        ) : (
          <FlatList
            data={prescriptions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              refillReminders.length > 0 ? (
                <View style={styles.remindersSection}>
                  <Text style={styles.remindersTitle}>⏰ Refill Reminders</Text>
                  {refillReminders.map((reminder: PatientRefillReminder) => {
                    const isSent = reminder.sent;
                    const remindDate = new Date(reminder.remindAt).toLocaleDateString(
                      undefined,
                      {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    );
                    const meds = (reminder.prescription?.items || [])
                      .map((m: PatientRefillItem) => m.medicine)
                      .join(', ');

                    return (
                      <TouchableOpacity
                        key={reminder.id}
                        style={styles.reminderCard}
                        onPress={() => {
                          if (reminder.prescriptionId) {
                            router.push(`/(patient)/prescription/${reminder.prescriptionId}`);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.reminderHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.reminderPrescriptionCode}>
                              {reminder.prescription?.code || 'Maintenance Refill'}
                            </Text>
                            {meds ? (
                              <Text style={styles.reminderMeds} numberOfLines={1}>
                                💊 {meds}
                              </Text>
                            ) : null}
                          </View>
                          <StatusBadge
                            label={isSent ? '✓ Alert Sent' : '⏳ Scheduled'}
                            variant={isSent ? 'success' : 'warning'}
                          />
                        </View>
                        <Text style={styles.reminderDateText}>
                          Due Date:{' '}
                          <Text style={{ color: Colors.text.primary, fontWeight: '700' }}>
                            {remindDate}
                          </Text>
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.roles.patient}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📱</Text>
                <Text style={styles.emptyTitle}>Your Wallet is Empty</Text>
                <Text style={styles.emptySubtitle}>
                  You don't have any prescriptions issued yet. When a doctor writes you a
                  prescription, it will appear here instantly.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDispensed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  infoValueSecondary: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  infoValueBold: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  medicinesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pillBadge: {
    backgroundColor: Colors.roles.patientBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.roles.patient,
  },
  viewQrText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.text.muted,
    fontSize: 13,
  },
  errorEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  errorText: {
    color: Colors.text.secondary,
    fontSize: 14,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.roles.patient,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.text.muted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  remindersSection: {
    marginBottom: 20,
    gap: 10,
  },
  remindersTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  reminderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reminderPrescriptionCode: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  reminderMeds: {
    fontSize: 12,
    color: Colors.roles.shop,
    marginTop: 2,
  },
  reminderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  reminderStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeSuccess: {
    backgroundColor: Colors.status.successBackground,
    borderColor: Colors.status.success,
  },
  textSuccess: {
    color: Colors.status.success,
  },
  badgePending: {
    backgroundColor: Colors.status.warningBackground,
    borderColor: Colors.status.warning,
  },
  textPending: {
    color: Colors.status.warning,
  },
  reminderDateText: {
    fontSize: 11,
    color: Colors.text.muted,
  },
});
