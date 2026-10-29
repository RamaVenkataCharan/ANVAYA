import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Button, Input, Card } from '../../components/ui';
import { api } from '../../services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered email or phone number');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password/request', { identifier: identifier.trim() });
      setStep(2);
      setSuccessMessage('Recovery code generated and sent to console (Dev OTP: 123456)');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Unable to send recovery code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (!otp.trim()) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters with upper, lower, and numbers');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password/verify', {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword,
      });
      Alert.alert(
        'Success',
        t('auth.resetSuccess'),
        [{ text: 'Log In', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Invalid or expired code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>← {t('common.back')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
            <Text style={styles.subtitle}>
              {step === 1 ? t('auth.forgotPasswordSubtitle') : t('auth.verifyCodeSubtitle')}
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          <Card style={styles.card}>
            {step === 1 ? (
              <View style={styles.formSection}>
                <Input
                  label="Registered Email or Phone"
                  value={identifier}
                  onChangeText={(val) => {
                    setIdentifier(val);
                    setErrorMessage(null);
                  }}
                  placeholder="name@example.com or 9876543210"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  accessibilityLabel="Registered email or phone number"
                />
                <Button
                  label={t('auth.sendCode')}
                  onPress={() => void handleRequestOtp()}
                  isLoading={isLoading}
                  variant="primary"
                  accessibilityLabel={t('auth.sendCode')}
                />
              </View>
            ) : (
              <View style={styles.formSection}>
                <Input
                  label="6-Digit Verification Code"
                  value={otp}
                  onChangeText={(val) => {
                    setOtp(val);
                    setErrorMessage(null);
                  }}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  accessibilityLabel="6 digit verification code"
                />

                <Input
                  label={t('auth.newPasswordLabel')}
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    setErrorMessage(null);
                  }}
                  placeholder="Min 8 characters (A-Z, a-z, 0-9)"
                  secureTextEntry
                  accessibilityLabel={t('auth.newPasswordLabel')}
                />

                <Input
                  label={t('profile.confirmPassword')}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    setErrorMessage(null);
                  }}
                  placeholder="Re-enter new password"
                  secureTextEntry
                  accessibilityLabel={t('profile.confirmPassword')}
                />

                <Button
                  label={t('auth.resetPasswordBtn')}
                  onPress={() => void handleVerifyAndReset()}
                  isLoading={isLoading}
                  variant="primary"
                  accessibilityLabel={t('auth.resetPasswordBtn')}
                />

                <TouchableOpacity
                  onPress={() => setStep(1)}
                  style={styles.resendBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendText}>Didn't receive code? Try again</Text>
                </TouchableOpacity>
              </View>
            )}
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
    padding: 24,
    flexGrow: 1,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  backArrow: {
    fontSize: 16,
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  card: {
    padding: 20,
  },
  formSection: {
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
    lineHeight: 18,
  },
  successBox: {
    backgroundColor: Colors.status.successBackground,
    borderWidth: 1,
    borderColor: Colors.status.success,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: Colors.status.success,
    fontSize: 13,
    lineHeight: 18,
  },
  resendBtn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
});

