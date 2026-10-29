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

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch appointment details
  const {
    data: appointment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const res = await api.get(`/appointments/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch(`/appointments/${id}/status`, {
        status: 'CANCELLED',
      });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient', 'appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      Alert.alert(
        'Appointment Cancelled',
        t('patientAppointments.cancelSuccess')
      );
    },
    onError: (err: any) => {
      Alert.alert(
        'Action Failed',
        err.response?.data?.message || 'Unable to cancel appointment.'
      );
    },
  });

  const handleCancel = () => {
    Alert.alert(
      t('patientAppointments.cancelAppointment'),
      t('patientAppointments.cancelConfirmPrompt'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('patientAppointments.cancelAppointment'),
          style: 'destructive',
          onPress: () => cancelMutation.mutate(),
        },
      ]
    );
  };

  const handleReschedule = () => {
    Alert.alert(
      t('patientAppointments.rescheduleRequest'),
      `${t('patientAppointments.reschedulePrompt')}\nPlease select an alternative time in Find a Doctor or contact the clinic directly.`,
      [
        {
          text: 'Find Alternative Slot',
          onPress: () => router.push('/(patient)/find-doctor'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.roles.patient} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (error || !appointment) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>{t('common.errorTitle')}</Text>
        <Button label={t('common.retry')} onPress={() => void refetch()} />
      </SafeAreaView>
    );
  }

  const isCancellable =
    appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED';

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

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
        <Text style={styles.headerTitle}>{t('patientAppointments.detailTitle')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Doctor Overview Card */}
        <Card style={styles.card}>
          <View style={styles.doctorHeaderRow}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.avatarEmoji}>👨‍⚕️</Text>
            </View>
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>
                {appointment.doctor?.user?.name || 'Dr. Practitioner'}
              </Text>
              <Text style={styles.doctorSpec}>
                {appointment.doctor?.specialization || 'Consultant'}
              </Text>
              <Text style={styles.regNo}>
                Reg: {appointment.doctor?.registrationNo || 'MCI-VERIFIED'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statusRow}>
            <Text style={styles.sectionLabel}>{t('patientAppointments.status')}</Text>
            <StatusBadge
              status={appointment.status}
              label={appointment.status}
              variant={
                appointment.status === 'CONFIRMED' || appointment.status === 'COMPLETED'
                  ? 'success'
                  : appointment.status === 'CANCELLED'
                  ? 'error'
                  : 'neutral'
              }
            />
          </View>
        </Card>

        {/* Schedule & Clinic Details */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Consultation Schedule</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>{t('patientAppointments.dateTime')}</Text>
              <Text style={styles.infoValue}>{formatDateTime(appointment.dateTime)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>{t('patientAppointments.clinic')}</Text>
              <Text style={styles.infoValue}>
                {appointment.doctor?.clinicAddress || 'Clinic Address'}
              </Text>
            </View>
          </View>

          {appointment.reason && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📝</Text>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>{t('patientAppointments.notes')}</Text>
                <Text style={styles.infoValue}>{appointment.reason}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Actions */}
        {isCancellable && (
          <View style={styles.actionsContainer}>
            <Button
              label={t('patientAppointments.rescheduleRequest')}
              variant="outline"
              onPress={handleReschedule}
              style={{ marginBottom: 12 }}
              accessibilityLabel={t('patientAppointments.rescheduleRequest')}
            />
            <Button
              label={t('patientAppointments.cancelAppointment')}
              variant="destructive"
              onPress={handleCancel}
              isLoading={cancelMutation.isPending}
              accessibilityLabel={t('patientAppointments.cancelAppointment')}
            />
          </View>
        )}
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
    backgroundColor: Colors.background,
    padding: 20,
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
  doctorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e6f3ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  doctorSpec: {
    fontSize: 13,
    color: Colors.roles.doctor,
    fontWeight: '600',
    marginBottom: 2,
  },
  regNo: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  infoIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
    fontWeight: '500',
  },
  actionsContainer: {
    marginTop: 10,
  },
});
