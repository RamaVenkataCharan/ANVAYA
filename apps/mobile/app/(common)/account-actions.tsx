import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Button, Input, Card } from '../../components/ui';
import { useAuthStore } from '../../store/auth';
import { api } from '../../services/api';

export default function AccountActionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'export' | 'delete'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await api.post('/users/export-data', {});
      setExportResult(JSON.stringify(res.data.data, null, 2));
      Alert.alert('Data Export Ready', t('accountActions.exportSuccess'));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to generate data export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!password) {
      setDeleteError(t('accountActions.passwordConfirm'));
      return;
    }

    Alert.alert(
      t('accountActions.deleteTitle'),
      'Are you absolutely sure you want to permanently delete your account? This action cannot be reversed.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            setDeleteError(null);
            try {
              await api.post('/users/delete-account', { password, reason });
              Alert.alert('Account Deactivated', 'Your account has been deactivated.', [
                {
                  text: 'OK',
                  onPress: async () => {
                    await logout();
                    router.replace('/(auth)/login');
                  },
                },
              ]);
            } catch (err: any) {
              setDeleteError(err.response?.data?.message || 'Incorrect password.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'export' && styles.tabBtnActive]}
              onPress={() => setActiveTab('export')}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'export' }}
            >
              <Text style={[styles.tabText, activeTab === 'export' && styles.tabTextActive]}>
                📦 {t('accountActions.exportTitle')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'delete' && styles.tabBtnActive]}
              onPress={() => setActiveTab('delete')}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'delete' }}
            >
              <Text style={[styles.tabText, activeTab === 'delete' && styles.tabTextActiveDanger]}>
                ⚠️ {t('accountActions.deleteTitle')}
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'export' ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('accountActions.exportTitle')}</Text>
              <Text style={styles.cardDesc}>{t('accountActions.exportDesc')}</Text>

              <Button
                label={t('accountActions.exportBtn')}
                onPress={() => void handleExportData()}
                isLoading={isExporting}
                variant="primary"
                accessibilityLabel={t('accountActions.exportBtn')}
              />

              {exportResult && (
                <View style={styles.exportPreviewBox}>
                  <Text style={styles.previewHeader}>Exported JSON Payload Preview:</Text>
                  <Text style={styles.previewText} numberOfLines={12}>
                    {exportResult}
                  </Text>
                </View>
              )}
            </Card>
          ) : (
            <Card style={styles.card}>
              <View style={styles.warningBanner}>
                <Text style={styles.warningTitle}>Permanent Deactivation Warning</Text>
                <Text style={styles.warningText}>{t('accountActions.deleteWarning')}</Text>
              </View>

              {deleteError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{deleteError}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Input
                  label={t('accountActions.passwordConfirm')}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setDeleteError(null);
                  }}
                  secureTextEntry
                  placeholder="Enter current password"
                  accessibilityLabel={t('accountActions.passwordConfirm')}
                />

                <Input
                  label={t('accountActions.reasonPrompt')}
                  value={reason}
                  onChangeText={setReason}
                  placeholder="Tell us why you are leaving"
                  accessibilityLabel={t('accountActions.reasonPrompt')}
                />

                <Button
                  label={t('accountActions.confirmDeleteBtn')}
                  onPress={handleDeleteAccount}
                  isLoading={isDeleting}
                  variant="primary"
                  accessibilityLabel={t('accountActions.confirmDeleteBtn')}
                />
              </View>
            </Card>
          )}
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
    gap: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.text.primary,
  },
  tabTextActiveDanger: {
    color: Colors.status.error,
  },
  card: {
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  warningBanner: {
    backgroundColor: Colors.status.errorBackground,
    borderWidth: 1,
    borderColor: Colors.status.error,
    borderRadius: 8,
    padding: 14,
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.status.error,
  },
  warningText: {
    fontSize: 12,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  formGroup: {
    gap: 14,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: Colors.status.errorBackground,
    borderWidth: 1,
    borderColor: Colors.status.error,
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: 13,
  },
  exportPreviewBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 6,
  },
  previewHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.muted,
  },
  previewText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: Colors.text.secondary,
  },
});
