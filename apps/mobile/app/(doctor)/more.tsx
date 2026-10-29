import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { ListRow, StatusBadge } from '../../components/ui';
import { useAuthStore } from '../../store/auth';

export default function DoctorMoreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, role, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleSignOut = () => {
    Alert.alert(t('common.signOut'), t('more.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.signOut'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primaryLight}
          />
        }
      >
        {/* Header / Doctor Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'D'}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{user?.name || 'Doctor'}</Text>
            <Text style={styles.userContact}>{user?.phone || user?.email || ''}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge status="ACTIVE" label={role || 'DOCTOR'} variant="success" />
            </View>
          </View>
        </View>

        {/* Section: Clinical Tools */}
        <Text style={styles.sectionTitle}>{t('more.doctorSection')}</Text>
        <ListRow
          leftEmoji="📝"
          title={t('more.newRx')}
          subtitle={t('more.newRxSubtitle')}
          showChevron
          onPress={() => router.push('/(doctor)/new-prescription')}
          accessibilityLabel={t('more.newRx')}
        />

        {/* Section: Account & Security */}
        <Text style={styles.sectionTitle}>{t('more.accountSection')}</Text>
        <ListRow
          leftEmoji="👤"
          title={t('more.profile')}
          subtitle={t('more.profileSubtitle')}
          showChevron
          onPress={() => router.push('/(common)/edit-profile')}
          accessibilityLabel={t('more.profile')}
        />
        <ListRow
          leftEmoji="🔒"
          title={t('more.changePassword')}
          subtitle={t('more.changePasswordSubtitle')}
          showChevron
          onPress={() => router.push('/(common)/change-password')}
          accessibilityLabel={t('more.changePassword')}
        />
        <ListRow
          leftEmoji="🔔"
          title={t('more.notifications')}
          subtitle={t('more.notificationsSubtitle')}
          showChevron
          onPress={() => router.push('/(common)/notifications')}
          accessibilityLabel={t('more.notifications')}
        />
        <ListRow
          leftEmoji="⚙️"
          title={t('more.settings')}
          subtitle={t('more.settingsSubtitle')}
          showChevron
          onPress={() => router.push('/(common)/settings')}
          accessibilityLabel={t('more.settings')}
        />

        {/* Section: Data & Privacy */}
        <Text style={styles.sectionTitle}>{t('more.dataSection')}</Text>
        <ListRow
          leftEmoji="📦"
          title={t('more.accountActions')}
          subtitle={t('more.accountActionsSubtitle')}
          showChevron
          onPress={() => router.push('/(common)/account-actions')}
          accessibilityLabel={t('more.accountActions')}
        />

        {/* Section: Support & Legal */}
        <Text style={styles.sectionTitle}>{t('more.supportSection')}</Text>
        <ListRow
          leftEmoji="❓"
          title={t('more.help')}
          subtitle={t('more.helpSubtitle')}
          showChevron
          onPress={() => router.push('/(common)/help')}
          accessibilityLabel={t('more.help')}
        />
        <ListRow
          leftEmoji="ℹ️"
          title={t('more.about')}
          subtitle={t('more.aboutSubtitle')}
          showChevron
          onPress={() => router.push('/(common)/about')}
          accessibilityLabel={t('more.about')}
        />
        <ListRow
          leftEmoji="📜"
          title={t('more.legal')}
          subtitle={t('more.legalSubtitle')}
          showChevron
          onPress={() => router.push('/(common)/legal')}
          accessibilityLabel={t('more.legal')}
        />

        {/* Sign Out Row */}
        <View style={styles.signOutBox}>
          <ListRow
            leftEmoji="🚪"
            title={t('more.signOut')}
            subtitle={t('more.signOutSubtitle')}
            destructive
            onPress={handleSignOut}
            accessibilityLabel={t('more.signOut')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  userContact: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  signOutBox: {
    marginTop: 16,
  },
});

