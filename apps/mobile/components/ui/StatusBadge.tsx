import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';

export interface StatusBadgeProps {
  status?: string;
  label?: string;
  variant?: StatusVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function StatusBadge({
  status,
  label,
  variant,
  style,
  textStyle,
}: StatusBadgeProps) {
  const normalizedStatus = (status || label || '').toUpperCase();

  const resolveVariant = (): StatusVariant => {
    if (variant) return variant;

    switch (normalizedStatus) {
      case 'APPROVED':
      case 'VERIFIED':
      case 'PAID':
      case 'DISPENSED':
      case 'ACTIVE':
      case 'CONFIRMED':
        return 'success';

      case 'PENDING':
      case 'PENDING APPROVAL':
      case 'ISSUED':
      case 'SCHEDULED':
      case 'PARTIAL':
        return 'warning';

      case 'REJECTED':
      case 'CANCELLED':
      case 'OVERDUE':
      case 'REVOKED':
        return 'error';

      case 'COMPLETED':
        return 'purple';

      default:
        return 'info';
    }
  };

  const currentVariant = resolveVariant();

  const getContainerStyle = () => {
    switch (currentVariant) {
      case 'success':
        return styles.successContainer;
      case 'warning':
        return styles.warningContainer;
      case 'error':
        return styles.errorContainer;
      case 'purple':
        return styles.purpleContainer;
      case 'neutral':
        return styles.neutralContainer;
      case 'info':
      default:
        return styles.infoContainer;
    }
  };

  const getTextStyle = () => {
    switch (currentVariant) {
      case 'success':
        return styles.successText;
      case 'warning':
        return styles.warningText;
      case 'error':
        return styles.errorText;
      case 'purple':
        return styles.purpleText;
      case 'neutral':
        return styles.neutralText;
      case 'info':
      default:
        return styles.infoText;
    }
  };

  const displayText = label || status || '';

  return (
    <View
      style={[styles.badge, getContainerStyle(), style]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${displayText}`}
    >
      <Text style={[styles.text, getTextStyle(), textStyle]}>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  successContainer: {
    backgroundColor: Colors.status.successBackground,
    borderColor: Colors.status.success,
  },
  successText: {
    color: Colors.status.success,
  },
  warningContainer: {
    backgroundColor: Colors.status.warningBackground,
    borderColor: Colors.status.warning,
  },
  warningText: {
    color: Colors.status.warning,
  },
  errorContainer: {
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
  },
  errorText: {
    color: Colors.status.error,
  },
  infoContainer: {
    backgroundColor: Colors.status.infoBackground,
    borderColor: Colors.status.info,
  },
  infoText: {
    color: Colors.status.info,
  },
  purpleContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8B5CF6',
  },
  purpleText: {
    color: '#8B5CF6',
  },
  neutralContainer: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
  },
  neutralText: {
    color: Colors.text.secondary,
  },
});
