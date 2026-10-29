import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Card, StatusBadge } from '../../components/ui';
import { api } from '../../services/api';

export default function PatientRefillsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    data: refills = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['patient', 'refills'],
    queryFn: async () => {
      const res = await api.get('/refills');
      return res.data.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/refills/${id}`);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient', 'refills'] });
      Alert.alert('Reminder Dismissed', 'The refill reminder has been removed.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to dismiss reminder.');
    },
  });

  const handleDismiss = (id: string, name: string) => {
    Alert.alert(
      t('patientRefills.dismissReminder'),
      `${t('patientRefills.dismissConfirm')} (${name})`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
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
        <Text style={styles.headerTitle}>{t('patientRefills.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={refills}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={Colors.roles.patient}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.medicineIconBox}>
                <Text style={styles.medicineEmoji}>💊</Text>
              </View>
              <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>
                  {item.medicine || item.medicineName || 'Prescription Medicine'}
                </Text>
                <Text style={styles.dueText}>
                  {t('patientRefills.dueIn')}: {formatDate(item.remindAt)}
                </Text>
              </View>
              <StatusBadge
                status={item.status || 'SCHEDULED'}
                label={item.status || 'ACTIVE'}
                variant="warning"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.bottomRow}>
              <Text style={styles.scheduleText}>
                {item.intervalDays ? `Every ${item.intervalDays} days` : 'Periodic course'}
              </Text>
              <TouchableOpacity
                onPress={() => handleDismiss(item.id, item.medicine || 'Medicine')}
                style={styles.dismissBtn}
                accessibilityRole="button"
                accessibilityLabel={t('patientRefills.dismissReminder')}
              >
                <Text style={styles.dismissBtnText}>{t('patientRefills.dismissReminder')}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>⏰</Text>
              <Text style={styles.emptyTitle}>{t('patientRefills.noRefills')}</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 14,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  medicineIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff4e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineEmoji: {
    fontSize: 20,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  dueText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleText: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  dismissBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fee4e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.status.error,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
