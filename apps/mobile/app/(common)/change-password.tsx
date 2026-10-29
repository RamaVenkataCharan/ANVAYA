import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Button, Input, Card } from '../../components/ui';
import { api } from '../../services/api';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setErrorMessage('Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters (with uppercase, lowercase, and numbers)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      Alert.alert(t('common.success'), t('profile.passwordSuccess'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to change password. Please check your current password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <Card style={styles.card}>
            <Text style={styles.title}>{t('profile.changePassword')}</Text>
            <Text style={styles.subtitle}>
              Protect your account by choosing a strong password with at least 8 characters.
            </Text>

            <View style={styles.formGroup}>
              <Input
                label={t('profile.currentPassword')}
                value={currentPassword}
                onChangeText={(val) => {
                  setCurrentPassword(val);
                  setErrorMessage(null);
                }}
                secureTextEntry
                placeholder="Enter current password"
                accessibilityLabel={t('profile.currentPassword')}
              />

              <Input
                label={t('profile.newPassword')}
                value={newPassword}
                onChangeText={(val) => {
                  setNewPassword(val);
                  setErrorMessage(null);
                }}
                secureTextEntry
                placeholder="Min 8 chars with A-Z, a-z, 0-9"
                accessibilityLabel={t('profile.newPassword')}
              />

              <Input
                label={t('profile.confirmPassword')}
                value={confirmPassword}
                onChangeText={(val) => {
                  setConfirmPassword(val);
                  setErrorMessage(null);
                }}
                secureTextEntry
                placeholder="Re-enter new password"
                accessibilityLabel={t('profile.confirmPassword')}
              />

              <Button
                label={t('profile.changePassword')}
                onPress={() => void handleChangePassword()}
                isLoading={isLoading}
                variant="primary"
                accessibilityLabel={t('profile.changePassword')}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  formGroup: {
    gap: 16,
  },
  errorBox: {
    backgroundColor: Colors.status.errorBackground,
    borderWidth: 1,
    borderColor: Colors.status.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: 13,
  },
});

