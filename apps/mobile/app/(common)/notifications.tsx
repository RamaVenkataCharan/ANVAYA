import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Card, Button, StatusBadge } from '../../components/ui';
import { api } from '../../services/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/all/read', {});
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const notifications = data || [];
  const hasUnread = notifications.some((n) => !n.read);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return '📅';
      case 'PRESCRIPTION':
        return '📋';
      case 'BILL':
        return '💳';
      case 'SECURITY':
        return '🔒';
      default:
        return '🔔';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      {hasUnread && (
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.markReadBtn}
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.markAllRead')}
          >
            <Text style={styles.markReadText}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primaryLight} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('common.errorTitle')}</Text>
          <Text style={styles.errorSubtitle}>{t('common.errorMessage')}</Text>
          <Button
            label={t('common.retry')}
            onPress={() => void refetch()}
            variant="secondary"
            accessibilityLabel={t('common.retry')}
          />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
          <Text style={styles.emptyDesc}>{t('notifications.emptyDesc')}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Colors.primaryLight}
            />
          }
          renderItem={({ item }) => (
            <Card style={[styles.notifCard, !item.read && styles.notifCardUnread]}>
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <Text style={styles.typeIcon}>{getIconForType(item.type)}</Text>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                </View>
                {!item.read && <StatusBadge label="NEW" variant="info" />}
              </View>
              <Text style={styles.notifMessage}>{item.message}</Text>
              <Text style={styles.timestamp}>
                {new Date(item.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </Text>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  markReadBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  notifCard: {
    padding: 16,
  },
  notifCardUnread: {
    borderColor: Colors.primaryLight,
    borderWidth: 1,
    backgroundColor: Colors.surfaceElevated,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  typeIcon: {
    fontSize: 18,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  notifMessage: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  errorSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
