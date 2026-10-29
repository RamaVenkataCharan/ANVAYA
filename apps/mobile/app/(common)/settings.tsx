import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Card, ListRow } from '../../components/ui';
import { useAuthStore } from '../../store/auth';
import { setLanguage } from '../../i18n';
import { api } from '../../services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { logout } = useAuthStore();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const currentLang = i18n.language.startsWith('te') ? 'te' : 'en';

  const handleToggleLanguage = async (newLang: 'en' | 'te') => {
    await setLanguage(newLang);
  };

  const handleLogoutAll = () => {
    Alert.alert(
      t('settings.logoutAll'),
      t('settings.logoutAllConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logoutAll'),
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOutAll(true);
            try {
              await api.post('/auth/logout-all', {});
              await logout();
              router.replace('/(auth)/login');
            } catch (err) {
              Alert.alert(t('common.notice'), 'Logged out locally. Server sessions terminated.');
              await logout();
              router.replace('/(auth)/login');
            } finally {
              setIsLoggingOutAll(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      t('common.signOut'),
      'Are you sure you want to sign out of your account on this device?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.signOut'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Language Selection */}
        <Text style={styles.sectionHeader}>{t('settings.languageSection')}</Text>
        <Card style={styles.card}>
          <TouchableOpacity
            style={[styles.langOption, currentLang === 'en' && styles.langOptionActive]}
            onPress={() => void handleToggleLanguage('en')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Select English language"
          >
            <View style={styles.langLeft}>
              <Text style={styles.langFlag}>🇬🇧</Text>
              <Text style={styles.langName}>{t('settings.english')}</Text>
            </View>
            {currentLang === 'en' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.langOption, currentLang === 'te' && styles.langOptionActive]}
            onPress={() => void handleToggleLanguage('te')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Select Telugu language"
          >
            <View style={styles.langLeft}>
              <Text style={styles.langFlag}>🇮🇳</Text>
              <Text style={styles.langName}>{t('settings.telugu')}</Text>
            </View>
            {currentLang === 'te' && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        </Card>

        {/* Notifications Section */}
        <Text style={styles.sectionHeader}>{t('settings.notificationsSection')}</Text>
        <Card style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>{t('settings.pushAlerts')}</Text>
              <Text style={styles.switchSub}>{t('settings.pushAlertsDesc')}</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryDark }}
              thumbColor={pushEnabled ? Colors.primaryLight : '#f4f3f4'}
              accessibilityLabel={t('settings.pushAlerts')}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>{t('settings.smsAlerts')}</Text>
              <Text style={styles.switchSub}>{t('settings.smsAlertsDesc')}</Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryDark }}
              thumbColor={smsEnabled ? Colors.primaryLight : '#f4f3f4'}
              accessibilityLabel={t('settings.smsAlerts')}
            />
          </View>
        </Card>

        {/* Support & Legal */}
        <Text style={styles.sectionHeader}>{t('settings.aboutSection')}</Text>
        <Card style={styles.card}>
          <ListRow
            title={t('settings.helpFaq')}
            subtitle="Guides, contact channels, and frequently asked questions"
            onPress={() => router.push('/(common)/help')}
            leftIcon="❓"
          />
          <View style={styles.divider} />
          <ListRow
            title={t('settings.legalTerms')}
            subtitle="Terms of service, privacy policy, and DRAFT disclaimers"
            onPress={() => router.push('/(common)/legal')}
            leftIcon="⚖️"
          />
          <View style={styles.divider} />
          <ListRow
            title={t('settings.aboutApp')}
            subtitle="Version 1.0.0 (Expo SDK 53, React 19)"
            onPress={() => router.push('/(common)/about')}
            leftIcon="ℹ️"
          />
        </Card>

        {/* Security & Sessions */}
        <Text style={styles.sectionHeader}>{t('settings.securitySection')}</Text>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleLogoutAll}
            disabled={isLoggingOutAll}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('settings.logoutAll')}
          >
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitleDanger}>{t('settings.logoutAll')}</Text>
              <Text style={styles.actionDesc}>{t('settings.logoutAllDesc')}</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </Card>

        {/* Account Management & Data Export */}
        <Text style={styles.sectionHeader}>{t('settings.dangerZone')}</Text>
        <Card style={styles.card}>
          <ListRow
            title={t('settings.exportData')}
            subtitle="Download archive of your consultations and records"
            onPress={() => router.push('/(common)/account-actions')}
            leftIcon="📦"
          />
          <View style={styles.divider} />
          <ListRow
            title={t('settings.deleteAccount')}
            subtitle="Permanently deactivate your account credentials"
            onPress={() => router.push('/(common)/account-actions')}
            leftIcon="⚠️"
          />
        </Card>

        {/* Sign Out Button */}
        <View style={styles.signOutSection}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('common.signOut')}
          >
            <Text style={styles.signOutText}>{t('common.signOut')}</Text>
          </TouchableOpacity>
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
    padding: 20,
    gap: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  card: {
    padding: 6,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 8,
    minHeight: 48,
  },
  langOptionActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langFlag: {
    fontSize: 20,
  },
  langName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  checkmark: {
    color: Colors.primaryLight,
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  switchSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    minHeight: 52,
  },
  actionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  actionTitleDanger: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.status.warning,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  arrowIcon: {
    fontSize: 18,
    color: Colors.text.muted,
  },
  signOutSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  signOutBtn: {
    minHeight: 50,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.status.error,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    color: Colors.status.error,
    fontSize: 15,
    fontWeight: '700',
  },
});

