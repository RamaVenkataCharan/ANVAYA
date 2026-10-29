import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Button, Card, StatusBadge } from '../../components/ui';
import { useAuthStore } from '../../store/auth';

export default function SuspendedAccountScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { logout } = useAuthStore();

  const handleContactSupport = () => {
    void Linking.openURL('mailto:compliance@anvaya.health?subject=Account%20Suspension%20Appeal');
  };

  const handleSignOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🛑</Text>
        </View>

        <StatusBadge label="ACCOUNT SUSPENDED" variant="error" />

        <Text style={styles.title}>{t('auth.suspendedTitle')}</Text>
        <Text style={styles.desc}>{t('auth.suspendedDesc')}</Text>

        <Card style={styles.card}>
          <Text style={styles.helpHeader}>Compliance & Appeals</Text>
          <Text style={styles.helpText}>
            If you believe this restriction was made in error or need assistance restoring your credentials, contact our clinical operations desk.
          </Text>
          <Button
            label="Email Compliance Support"
            onPress={handleContactSupport}
            variant="secondary"
            accessibilityLabel="Email Compliance Support"
          />
        </Card>

        <View style={styles.footer}>
          <Button
            label={t('common.signOut')}
            onPress={() => void handleSignOut()}
            variant="outline"
            accessibilityLabel={t('common.signOut')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.status.errorBackground,
    borderWidth: 1,
    borderColor: Colors.status.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  card: {
    padding: 20,
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  helpHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  helpText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  footer: {
    width: '100%',
    marginTop: 16,
  },
});
