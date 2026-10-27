import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PrescriptionModel, PrescriptionStatus } from '@anvaya/shared';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';
import { StatusBadge, Button } from '../../components/ui';

export default function DoctorPrescriptionsScreen() {
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Fetch prescriptions for the doctor
  const {
    data: prescriptions,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<PrescriptionModel[]>({
    queryKey: ['prescriptions', 'doctor'],
    queryFn: async () => {
      const response = await api.get('/prescriptions');
      return response.data?.data || [];
    },
  });

  // Cancel prescription mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      setCancellingId(id);
      const res = await api.patch(`/prescriptions/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      Alert.alert('Success', 'Prescription has been cancelled.');
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        'Unable to cancel this prescription.';
      Alert.alert('Cancellation Failed', msg);
    },
    onSettled: () => {
      setCancellingId(null);
    },
  });

  const handleCancel = (prescription: PrescriptionModel) => {
    Alert.alert(
      'Cancel Prescription',
      `Are you sure you want to cancel prescription ${prescription.code}? Once cancelled, it can no longer be dispensed by any pharmacy.`,
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(prescription.id),
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: PrescriptionModel }) => {
    const formattedDate = new Date(item.issuedAt || item.createdAt).toLocaleDateString(
      undefined,
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );

    const isCancelling = cancellingId === item.id;

    return (
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.codeText}>{item.code}</Text>
            <Text style={styles.dateText}>Issued on {formattedDate}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.divider} />

        {/* Patient Details */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Patient</Text>
          <Text style={styles.infoValue}>
            {item.patient?.user?.name || 'Patient'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Diagnosis</Text>
          <Text style={styles.infoValueBold}>{item.diagnosis}</Text>
        </View>

        {/* Medicines Summary */}
        <View style={styles.medicinesBox}>
          <Text style={styles.medicinesTitle}>
            Medicines ({item.items?.length || 0})
          </Text>
          {item.items?.map((med, idx) => (
            <Text key={idx} style={styles.medicineLine}>
              • {med.medicine} ({med.dosage}) — {med.frequency} for {med.duration} [Qty: {med.quantity}]
            </Text>
          ))}
        </View>

        {/* Actions */}
        {item.status === PrescriptionStatus.ISSUED && (
          <View style={styles.cardActions}>
            <Button
              variant="destructive"
              size="sm"
              title="Cancel Prescription"
              loading={isCancelling}
              onPress={() => handleCancel(item)}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Prescriptions</Text>
          <Text style={styles.subtitle}>
            Manage and track all clinical prescriptions issued by you
          </Text>
        </View>

        {/* Body */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={Colors.primaryLight} size="large" />
            <Text style={styles.loadingText}>Loading issued prescriptions...</Text>
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
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.primaryLight}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>No Prescriptions Issued</Text>
                <Text style={styles.emptySubtitle}>
                  You haven't issued any e-prescriptions yet. Go to the "New Rx" tab to
                  create one.
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
    color: Colors.text.secondary,
  },
  infoValueBold: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  medicinesBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  medicinesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryLight,
    marginBottom: 4,
  },
  medicineLine: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  cardActions: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.status.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.status.error,
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
    backgroundColor: Colors.primary,
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
});
