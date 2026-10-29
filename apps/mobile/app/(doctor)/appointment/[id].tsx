import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../constants/colors';
import { Card, Button, StatusBadge } from '../../../components/ui';
import { api } from '../../../services/api';

export default function DoctorAppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    data: appointment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['doctor', 'appointment', id],
    queryFn: async () => {
      const res = await api.get(`/appointments/${id}`);
      return res.data?.data || res.data;
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await api.patch(`/appointments/${id}/status`, { status: newStatus });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'appointment', id] });
      void queryClient.invalidateQueries({ queryKey: ['doctor', 'appointments'] });
      Alert.alert(t('common.success'), t('doctorAppointment.statusUpdated'));
    },
    onError: (err: any) => {
      Alert.alert(
        t('common.error'),
        err.response?.data?.message || 'Could not update appointment status'
      );
    },
  });

  const handleUpdateStatus = (status: string) => {
    statusMutation.mutate(status);
  };

  const handleCancel = () => {
    Alert.alert(
      t('doctorAppointment.cancelAppointment'),
      t('doctorAppointment.cancelConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('doctorAppointment.cancelAppointment'),
          style: 'destructive',
          onPress: () => handleUpdateStatus('CANCELLED'),
        },
      ]
    );
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  const patient = appointment?.patient;
  const user = patient?.user;

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
        <Text style={styles.headerTitle}>{t('doctorAppointment.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.roles.doctor} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : error || !appointment ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('common.error')}</Text>
          <Text style={styles.errorSubtitle}>
            {error instanceof Error ? error.message : 'Appointment not found'}
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
          {/* Patient Card */}
          <Card style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={styles.patientAvatar}>
                <Text style={styles.avatarLetter}>
                  {user?.name ? user.name[0].toUpperCase() : 'P'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{user?.name || 'Walk-in Patient'}</Text>
                <Text style={styles.patientSubtext}>
                  {user?.phone ? `Phone: ${user.phone}` : 'Patient ID: ' + appointment.patientId.slice(0, 8)}
                </Text>
              </View>
              <StatusBadge status={appointment.status} />
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('doctorAppointment.scheduledTime')}:</Text>
              <Text style={styles.detailValue}>{formatDateTime(appointment.dateTime)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('doctorAppointment.chiefComplaint')}:</Text>
              <Text style={styles.detailValue}>{appointment.reason || 'General Health Consultation'}</Text>
            </View>

            {appointment.notes ? (
              <View style={styles.notesBlock}>
                <Text style={styles.detailLabel}>{t('doctorAppointment.notes')}:</Text>
                <Text style={styles.notesText}>{appointment.notes}</Text>
              </View>
            ) : null}
          </Card>

          {/* Clinical Actions */}
          <View style={styles.actionsSection}>
            {appointment.status === 'SCHEDULED' && (
              <Button
                label={t('doctorAppointment.markCheckedIn')}
                variant="primary"
                onPress={() => handleUpdateStatus('CHECKED_IN')}
                isLoading={statusMutation.isPending}
                style={styles.actionBtn}
              />
            )}

            {appointment.status === 'CHECKED_IN' && (
              <Button
                label={t('doctorAppointment.startConsultation')}
                variant="primary"
                onPress={() => handleUpdateStatus('IN_CONSULTATION')}
                isLoading={statusMutation.isPending}
                style={styles.actionBtn}
              />
            )}

            {appointment.status === 'IN_CONSULTATION' && (
              <Button
                label={t('doctorAppointment.markCompleted')}
                variant="primary"
                onPress={() => handleUpdateStatus('COMPLETED')}
                isLoading={statusMutation.isPending}
                style={styles.actionBtn}
              />
            )}

            <Button
              label={t('doctorAppointment.writePrescription')}
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/(doctor)/new-prescription',
                  params: {
                    patientId: appointment.patientId,
                    patientName: user?.name,
                    appointmentId: appointment.id,
                  },
                } as any)
              }
              style={styles.actionBtn}
            />

            <Button
              label={t('doctorAppointment.viewClinicalHistory')}
              variant="outline"
              onPress={() =>
                router.push(`/(doctor)/patient/${appointment.patientId}` as any)
              }
              style={styles.actionBtn}
            />

            {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
              <Button
                label={t('doctorAppointment.cancelAppointment')}
                variant="destructive"
                onPress={handleCancel}
                isLoading={statusMutation.isPending}
                style={[styles.actionBtn, { marginTop: 8 }]}
              />
            )}
          </View>
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
  card: {
    padding: 18,
    marginBottom: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.roles.doctor,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  patientSubtext: {
    fontSize: 13,
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
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  notesBlock: {
    marginTop: 8,
    backgroundColor: Colors.surfaceLight,
    padding: 12,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 18,
    marginTop: 4,
  },
  actionsSection: {
    gap: 12,
  },
  actionBtn: {
    minHeight: 48,
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

