import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';
import { api } from '../../services/api';

interface DoctorAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  dateTime: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  notes?: string;
  patient?: {
    id: string;
    bloodGroup?: string;
    user?: {
      name: string;
      phone?: string;
      email: string;
    };
  };
}

export default function DoctorDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Date navigation handlers
  const handlePrevDay = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Format date strings
  const isToday =
    selectedDate.toDateString() === new Date().toDateString();

  const formattedDate = selectedDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Query appointments
  const {
    data: appointments = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<DoctorAppointment[]>({
    queryKey: ['doctor', 'appointments', selectedDate.toISOString().slice(0, 10)],
    queryFn: async () => {
      const res = await api.get('/appointments');
      const all: DoctorAppointment[] = res.data?.data || [];
      // Filter for the selected date
      const targetDateStr = selectedDate.toISOString().slice(0, 10);
      return all.filter((a) => {
        if (!a.dateTime) return false;
        return a.dateTime.slice(0, 10) === targetDateStr;
      });
    },
  });

  // Query notifications for unread dot
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'doctor-unread'],
    queryFn: async () => {
      try {
        const res = await api.get('/notifications');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });
  const hasUnread = notifications.some((n: any) => !n.isRead);

  // Compute metrics
  const totalCount = appointments.length;
  const followUpCount = appointments.filter((a) =>
    (a.reason || '').toLowerCase().includes('follow')
  ).length;
  const newPatientCount = Math.max(0, totalCount - followUpCount);

  // Format appointment time
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '09:00 AM';
    }
  };

  // Render status badge style & label
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return (
          <View style={[styles.statusBadge, styles.statusCheckedIn]}>
            <Text style={styles.statusTextCheckedIn}>{t('doctorHome.statusCheckedIn')}</Text>
          </View>
        );
      case 'IN_CONSULTATION':
        return (
          <View style={[styles.statusBadge, styles.statusInConsultation]}>
            <Text style={styles.statusTextInConsultation}>{t('doctorHome.statusInConsultation')}</Text>
          </View>
        );
      case 'COMPLETED':
        return (
          <View style={[styles.statusBadge, styles.statusCompleted]}>
            <Text style={styles.statusTextCompleted}>{t('doctorHome.statusCompleted')}</Text>
          </View>
        );
      case 'CANCELLED':
        return (
          <View style={[styles.statusBadge, styles.statusCancelled]}>
            <Text style={styles.statusTextCancelled}>{t('doctorHome.statusCancelled')}</Text>
          </View>
        );
      case 'WAITING':
        return (
          <View style={[styles.statusBadge, styles.statusWaiting]}>
            <Text style={styles.statusTextWaiting}>{t('doctorHome.statusWaiting')}</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, styles.statusScheduled]}>
            <Text style={styles.statusTextScheduled}>{t('doctorHome.statusScheduled')}</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar matching Mockup */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>👨‍⚕️</Text>
            <View style={styles.onlineBadgeDot} />
          </View>
          <View>
            <Text style={styles.greetingText}>{t('doctorHome.greeting')}</Text>
            <Text style={styles.doctorName}>Dr. {user?.name || 'Arjun Mehta'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => router.push('/(common)/notifications')}
          accessibilityLabel={t('more.notifications')}
          accessibilityRole="button"
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {hasUnread && <View style={styles.unreadBadgeDot} />}
        </TouchableOpacity>
      </View>

      {/* 2. Date Navigator Bar (< Today >) */}
      <View style={styles.dateNavContainer}>
        <View style={styles.dateNavControls}>
          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={handlePrevDay}
            accessibilityLabel="Previous day"
          >
            <Text style={styles.dateArrowText}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleToday} activeOpacity={0.7}>
            <Text style={styles.todayLabel}>{isToday ? t('doctorHome.today') : 'Selected Date'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={handleNextDay}
            accessibilityLabel="Next day"
          >
            <Text style={styles.dateArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateDisplayRow}>
          <Text style={styles.formattedDateText}>{formattedDate}</Text>
          <TouchableOpacity onPress={handleToday} style={styles.calendarIconBtn}>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Three Summary Metrics Cards Side-by-Side */}
      <View style={styles.metricsRow}>
        {/* Card 1: Appointments (Dark forest teal) */}
        <View style={[styles.metricCard, styles.metricCardDark]}>
          <Text style={styles.metricNumberDark}>{totalCount}</Text>
          <Text style={styles.metricLabelDark}>{t('doctorHome.appointmentsCount')}</Text>
        </View>

        {/* Card 2: Follow ups (Light mint) */}
        <View style={[styles.metricCard, styles.metricCardMint]}>
          <Text style={styles.metricNumberMint}>{followUpCount}</Text>
          <Text style={styles.metricLabelMint}>{t('doctorHome.followUpsCount')}</Text>
        </View>

        {/* Card 3: New patient (Soft coral) */}
        <View style={[styles.metricCard, styles.metricCardCoral]}>
          <Text style={styles.metricNumberCoral}>{newPatientCount}</Text>
          <Text style={styles.metricLabelCoral}>{t('doctorHome.newPatientsCount')}</Text>
        </View>
      </View>

      {/* 4. Patient Queue Section */}
      <View style={styles.queueHeaderRow}>
        <Text style={styles.queueTitle}>{t('doctorHome.queueTitle')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/(doctor)/new-prescription')}
          style={styles.writeRxHeaderBtn}
        >
          <Text style={styles.writeRxHeaderText}>+ {t('doctorHome.writeRx')}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.roles.doctor} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🗓️</Text>
          <Text style={styles.emptyTitle}>{t('doctorHome.noAppointmentsToday')}</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.queueListContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.roles.doctor}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.patientRowCard}
              onPress={() => router.push(`/(doctor)/appointment/${item.id}` as any)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              {/* Patient Avatar Circle */}
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>
                  {item.patient?.user?.name ? item.patient.user.name[0].toUpperCase() : 'P'}
                </Text>
              </View>

              {/* Patient Time & Name */}
              <View style={styles.patientInfo}>
                <Text style={styles.appointmentTime}>{formatTime(item.dateTime)}</Text>
                <Text style={styles.patientName}>
                  {item.patient?.user?.name || 'Walk-in Patient'}
                </Text>
                <Text style={styles.patientReason} numberOfLines={1}>
                  {item.reason || 'General Consultation'}
                </Text>
              </View>

              {/* Status Badge & Chevron */}
              <View style={styles.statusAndChevron}>
                {renderStatusBadge(item.status)}
                <Text style={styles.chevronIcon}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.status.success,
    borderWidth: 2,
    borderColor: '#FAFBFB',
  },
  avatarCircle: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F1F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D0E3EB',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  greetingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 18,
  },
  unreadBadgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.status.error,
  },
  dateNavContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dateNavControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  dateArrowBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
  },
  todayLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 40,
    paddingRight: 6,
  },
  formattedDateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  calendarIconBtn: {
    padding: 4,
  },
  calendarIcon: {
    fontSize: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: 'center',
  },
  metricCardDark: {
    backgroundColor: '#0F3B39',
  },
  metricNumberDark: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metricLabelDark: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D1E7E4',
  },
  metricCardMint: {
    backgroundColor: '#E4F6ED',
  },
  metricNumberMint: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0E6245',
    marginBottom: 4,
  },
  metricLabelMint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#135841',
  },
  metricCardCoral: {
    backgroundColor: '#FDECEB',
  },
  metricNumberCoral: {
    fontSize: 26,
    fontWeight: '800',
    color: '#B91C1C',
    marginBottom: 4,
  },
  metricLabelCoral: {
    fontSize: 11,
    fontWeight: '600',
    color: '#842020',
  },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  writeRxHeaderBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#0F3B39',
    borderRadius: 12,
  },
  writeRxHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  queueListContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  patientRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientAvatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
  },
  patientInfo: {
    flex: 1,
  },
  appointmentTime: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  patientReason: {
    fontSize: 12,
    color: '#64748B',
  },
  statusAndChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  statusCheckedIn: {
    backgroundColor: '#E4F6ED',
  },
  statusTextCheckedIn: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0E6245',
  },
  statusWaiting: {
    backgroundColor: '#FDECEB',
  },
  statusTextWaiting: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
  },
  statusScheduled: {
    backgroundColor: '#EDF2F7',
  },
  statusTextScheduled: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  statusInConsultation: {
    backgroundColor: '#E0F2FE',
  },
  statusTextInConsultation: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  statusCompleted: {
    backgroundColor: '#F1F5F9',
  },
  statusTextCompleted: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  statusCancelled: {
    backgroundColor: '#FEF2F2',
  },
  statusTextCancelled: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  chevronIcon: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '300',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  errorText: {
    fontSize: 14,
    color: Colors.status.error,
    marginBottom: 10,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0F3B39',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
