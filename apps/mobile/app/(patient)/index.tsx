import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

export default function PatientDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, refreshMe } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Fetch upcoming appointments
  const {
    data: appointments = [],
    isLoading: isApptsLoading,
    refetch: refetchAppts,
  } = useQuery({
    queryKey: ['patient', 'appointments', 'upcoming'],
    queryFn: async () => {
      const res = await api.get('/appointments');
      return res.data.data || [];
    },
  });

  // 2. Fetch active prescriptions
  const {
    data: prescriptions = [],
    refetch: refetchRx,
  } = useQuery({
    queryKey: ['patient', 'prescriptions'],
    queryFn: async () => {
      const res = await api.get('/prescriptions');
      return res.data.data || [];
    },
  });

  // 3. Fetch notifications for badge indicator
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data || [];
    },
  });

  const unreadNotifsCount = notifications.filter((n: any) => !n.read).length;

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshMe(), refetchAppts(), refetchRx()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Find next upcoming appointment
  const nextVisit = appointments
    .filter((a: any) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED')
    .sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];

  const activeRxCount = prescriptions.filter((p: any) => p.status === 'ACTIVE').length;

  const formatVisitDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatVisitTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor={Colors.roles.patient}
          />
        }
      >
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <View style={styles.userProfileRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
              </Text>
              <View style={styles.onlineBadgeDot} />
            </View>
            <View>
              <Text style={styles.greetingText}>{t('patientHome.greeting')}</Text>
              <Text style={styles.userNameText}>{user?.name || 'Patient'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/(common)/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadNotifsCount > 0 && <View style={styles.unreadBadgeDot} />}
          </TouchableOpacity>
        </View>

        {/* Hero Card: Upcoming Visit */}
        {isApptsLoading ? (
          <View style={styles.heroLoadingBox}>
            <ActivityIndicator size="small" color={Colors.roles.patient} />
          </View>
        ) : nextVisit ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroSubLabel}>{t('patientHome.upcomingVisit')}</Text>
                <Text style={styles.doctorName}>
                  {nextVisit.doctor?.user?.name || 'Dr. Practitioner'}
                </Text>
                <Text style={styles.doctorSpecialty}>
                  {nextVisit.doctor?.specialization || 'Consultant Physician'}
                </Text>
              </View>
              <View style={styles.doctorAvatarBox}>
                <Text style={styles.doctorAvatarEmoji}>🩺</Text>
              </View>
            </View>

            <View style={styles.visitTimeRow}>
              <View style={styles.timeTag}>
                <Text style={styles.timeTagIcon}>📅</Text>
                <Text style={styles.timeTagText}>{formatVisitDate(nextVisit.dateTime)}</Text>
              </View>
              <View style={styles.timeTag}>
                <Text style={styles.timeTagIcon}>⏰</Text>
                <Text style={styles.timeTagText}>{formatVisitTime(nextVisit.dateTime)}</Text>
              </View>
            </View>

            <View style={styles.heroActionRow}>
              <TouchableOpacity
                style={styles.heroPrimaryBtn}
                onPress={() => router.push(`/(patient)/appointment/${nextVisit.id}` as any)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('patientHome.viewDetails')}
              >
                <Text style={styles.heroPrimaryBtnText}>{t('patientHome.viewDetails')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroSecondaryBtn}
                onPress={() => router.push(`/(patient)/appointment/${nextVisit.id}` as any)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('patientHome.reschedule')}
              >
                <Text style={styles.heroSecondaryBtnText}>{t('patientHome.reschedule')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyHeroCard}>
            <Text style={styles.emptyHeroEmoji}>🗓️</Text>
            <Text style={styles.emptyHeroTitle}>{t('patientHome.noUpcomingVisits')}</Text>
            <TouchableOpacity
              style={styles.emptyHeroBtn}
              onPress={() => router.push('/(patient)/find-doctor')}
              accessibilityRole="button"
              accessibilityLabel={t('patientHome.bookFirstConsult')}
            >
              <Text style={styles.emptyHeroBtnText}>{t('patientHome.bookFirstConsult')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions Horizontal Row */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(patient)/find-doctor')}
            accessibilityRole="button"
            accessibilityLabel={t('patientHome.bookAppointment')}
          >
            <View style={styles.quickActionIconBox}>
              <Text style={styles.quickActionEmoji}>📅</Text>
            </View>
            <Text style={styles.quickActionText} numberOfLines={2}>
              {t('patientHome.bookAppointment')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(patient)/appointments')}
            accessibilityRole="button"
            accessibilityLabel={t('patientHome.myVisits')}
          >
            <View style={styles.quickActionIconBox}>
              <Text style={styles.quickActionEmoji}>📋</Text>
            </View>
            <Text style={styles.quickActionText} numberOfLines={2}>
              {t('patientHome.myVisits')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(patient)/prescriptions')}
            accessibilityRole="button"
            accessibilityLabel={t('patientHome.prescriptions')}
          >
            <View style={styles.quickActionIconBox}>
              <Text style={styles.quickActionEmoji}>💊</Text>
            </View>
            <Text style={styles.quickActionText} numberOfLines={2}>
              {t('patientHome.prescriptions')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(patient)/records')}
            accessibilityRole="button"
            accessibilityLabel={t('patientHome.reports')}
          >
            <View style={styles.quickActionIconBox}>
              <Text style={styles.quickActionEmoji}>📁</Text>
            </View>
            <Text style={styles.quickActionText} numberOfLines={2}>
              {t('patientHome.reports')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* "Your health" Section */}
        <Text style={styles.sectionHeading}>{t('patientHome.yourHealth')}</Text>
        <View style={styles.healthCardsRow}>
          <TouchableOpacity
            style={styles.healthCard}
            onPress={() => router.push('/(patient)/records')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('patientHome.vitals')}
          >
            <View style={[styles.healthIconCircle, { backgroundColor: '#ffebe8' }]}>
              <Text style={styles.healthEmoji}>❤️</Text>
            </View>
            <Text style={styles.healthCardTitle}>{t('patientHome.vitals')}</Text>
            <Text style={styles.healthCardSubtitle}>{t('patientHome.vitalsDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.healthCard}
            onPress={() => router.push('/(patient)/records')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('patientHome.labReports')}
          >
            <View style={[styles.healthIconCircle, { backgroundColor: '#e2f4f2' }]}>
              <Text style={styles.healthEmoji}>🧪</Text>
            </View>
            <Text style={styles.healthCardTitle}>{t('patientHome.labReports')}</Text>
            <Text style={styles.healthCardSubtitle}>{t('patientHome.labReportsDesc')}</Text>
          </TouchableOpacity>
        </View>

        {/* Active Prescriptions & Pharmacy Services Shortcut */}
        <View style={styles.servicesBanner}>
          <View style={styles.servicesLeft}>
            <Text style={styles.servicesBannerTitle}>
              {activeRxCount} {t('patientHome.activePrescriptions')}
            </Text>
            <Text style={styles.servicesBannerDesc}>
              View digital QR barcodes for contactless pharmacy dispensing
            </Text>
          </View>
          <TouchableOpacity
            style={styles.servicesBannerBtn}
            onPress={() => router.push('/(patient)/wallet')}
            accessibilityRole="button"
            accessibilityLabel="Open Digital Wallet"
          >
            <Text style={styles.servicesBannerBtnText}>Open QR Wallet →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7faf9',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d8eee8',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0e4a42',
  },
  greetingText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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
  heroLoadingBox: {
    height: 180,
    backgroundColor: '#eaf6f2',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: '#e7f5f0',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#cceadc',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  heroSubLabel: {
    fontSize: 12,
    color: '#346d64',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c3832',
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 13,
    color: '#497e75',
    fontWeight: '500',
  },
  doctorAvatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d2ebdf',
  },
  doctorAvatarEmoji: {
    fontSize: 26,
  },
  visitTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffffcc',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  timeTagIcon: {
    fontSize: 13,
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a4e47',
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroPrimaryBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#0c3832',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  heroSecondaryBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b4ded0',
  },
  heroSecondaryBtnText: {
    color: '#0c3832',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyHeroCard: {
    backgroundColor: '#e7f5f0',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#cceadc',
  },
  emptyHeroEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyHeroTitle: {
    fontSize: 14,
    color: '#2a5a52',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyHeroBtn: {
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: '#0c3832',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHeroBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 88,
    justifyContent: 'center',
  },
  quickActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0f5f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionEmoji: {
    fontSize: 20,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 14,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  healthCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  healthCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  healthIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  healthEmoji: {
    fontSize: 18,
  },
  healthCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  healthCardSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  servicesBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'column',
    gap: 12,
  },
  servicesLeft: {
    flex: 1,
  },
  servicesBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  servicesBannerDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  servicesBannerBtn: {
    height: 44,
    backgroundColor: '#f0f8f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cce5de',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicesBannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0e4a42',
  },
});
