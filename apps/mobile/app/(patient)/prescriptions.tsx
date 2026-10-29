import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Card, StatusBadge } from '../../components/ui';
import { api } from '../../services/api';

export default function PatientPrescriptionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DISPENSED' | 'CANCELLED'>('ALL');

  const {
    data: prescriptions = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['patient', 'prescriptions'],
    queryFn: async () => {
      const res = await api.get('/prescriptions');
      return res.data.data || [];
    },
  });

  const filteredList = prescriptions.filter((item: any) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

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
        <Text style={styles.headerTitle}>{t('patientPrescriptions.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Filter Chips */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['ALL', 'ACTIVE', 'DISPENSED', 'CANCELLED'] as const).map((key) => {
            const labelMap: Record<string, string> = {
              ALL: t('patientPrescriptions.filterAll'),
              ACTIVE: t('patientPrescriptions.filterActive'),
              DISPENSED: t('patientPrescriptions.filterDispensed'),
              CANCELLED: t('patientPrescriptions.filterCancelled'),
            };
            const isActive = filter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {labelMap[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Prescriptions List */}
      <FlatList
        data={filteredList}
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
          <TouchableOpacity
            onPress={() => router.push(`/(patient)/prescription/${item.id}` as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Prescription ${item.code}`}
          >
            <Card style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{item.code}</Text>
                  <Text style={styles.dateText}>
                    {formatDate(item.createdAt || item.issuedAt)}
                  </Text>
                </View>
                <StatusBadge
                  status={item.status}
                  label={item.status}
                  variant={
                    item.status === 'ACTIVE'
                      ? 'success'
                      : item.status === 'DISPENSED'
                      ? 'neutral'
                      : 'error'
                  }
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.doctorRow}>
                <Text style={styles.docIcon}>👨‍⚕️</Text>
                <View style={styles.docInfo}>
                  <Text style={styles.docName}>{item.doctor?.user?.name || 'Dr. Practitioner'}</Text>
                  <Text style={styles.docSpec}>
                    {item.doctor?.specialization || 'Consultant'}
                  </Text>
                </View>
              </View>

              {item.diagnosis && (
                <Text style={styles.diagnosisText} numberOfLines={2}>
                  {item.diagnosis}
                </Text>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.itemCountText}>
                  💊 {item.items?.length || 0} {t('patientPrescriptions.itemsCount')}
                </Text>
                <Text style={styles.viewDetailArrow}>View Details →</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>{t('patientPrescriptions.noPrescriptions')}</Text>
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
  filterBar: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    minHeight: 38,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#0c3832',
    borderColor: '#0c3832',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 14,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeBox: {
    flex: 1,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  docIcon: {
    fontSize: 18,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  docSpec: {
    fontSize: 12,
    color: Colors.roles.doctor,
  },
  diagnosisText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  viewDetailArrow: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.roles.patient,
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
