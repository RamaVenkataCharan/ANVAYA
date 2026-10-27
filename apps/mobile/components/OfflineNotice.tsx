import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStore } from '../store/network';

export function OfflineNotice() {
  const insets = useSafeAreaInsets();
  const {
    isServerReachable,
    isChecking,
    checkHealth,
    getNextBackoffSeconds,
    backoffAttempt,
  } = useNetworkStore();

  // Automatic background reconnection retry with exponential backoff (5s -> 8s -> 11s -> up to 30s)
  useEffect(() => {
    if (isServerReachable) return;

    const intervalSeconds = getNextBackoffSeconds();
    const timer = setTimeout(() => {
      void checkHealth();
    }, intervalSeconds * 1000);

    return () => clearTimeout(timer);
  }, [isServerReachable, backoffAttempt, getNextBackoffSeconds, checkHealth]);

  if (isServerReachable) {
    return null;
  }

  return (
    <View
      style={[styles.container, { paddingTop: Math.max(insets.top, 8) + 4 }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.contentRow}>
        <Text style={styles.icon}>📡</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Server Unreachable / Offline</Text>
          <Text style={styles.subtitle}>
            Working in offline mode. Cached records remain viewable.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            void checkHealth();
          }}
          disabled={isChecking}
          accessibilityRole="button"
          accessibilityLabel="Retry server connection"
          accessibilityHint="Attempts to reconnect to the ANVAYA health service"
          activeOpacity={0.8}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.retryText}>Retry</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#7F1D1D', // High-contrast crimson
    borderBottomWidth: 1,
    borderBottomColor: '#B91C1C',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 9999,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#FECACA',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
