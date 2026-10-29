import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors } from '../../constants/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  label?: string;
  children?: TouchableOpacityProps['children'];
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: TouchableOpacityProps['children'];
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  label,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}: ButtonProps) {
  const isBusy = loading || isLoading;
  const isDisabled = disabled || isBusy;
  const displayTitle = title ?? label;

  const getVariantContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'destructive':
        return styles.destructiveContainer;
      case 'ghost':
        return styles.ghostContainer;
      case 'primary':
      default:
        return styles.primaryContainer;
    }
  };

  const getVariantTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'destructive':
        return styles.destructiveText;
      case 'ghost':
        return styles.ghostText;
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  const getSizeContainerStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSmContainer;
      case 'lg':
        return styles.sizeLgContainer;
      case 'md':
      default:
        return styles.sizeMdContainer;
    }
  };

  const getSizeTextStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSmText;
      case 'lg':
        return styles.sizeLgText;
      case 'md':
      default:
        return styles.sizeMdText;
    }
  };

  const spinnerColor =
    variant === 'outline' || variant === 'ghost'
      ? Colors.primaryLight
      : variant === 'destructive'
      ? '#FFFFFF'
      : '#FFFFFF';

  const content = children || (
    <Text
      style={[
        styles.baseText,
        getVariantTextStyle(),
        getSizeTextStyle(),
        isDisabled && styles.disabledText,
        textStyle,
      ]}
    >
      {displayTitle}
    </Text>
  );

  return (
    <TouchableOpacity
      style={[
        styles.baseContainer,
        getVariantContainerStyle(),
        getSizeContainerStyle(),
        isDisabled && styles.disabledContainer,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof displayTitle === 'string' ? displayTitle : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: isBusy }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon}
          {content}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 44, // Minimum touch target 44pt
    minWidth: 44,
    gap: 8,
  },
  sizeSmContainer: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 8,
  },
  sizeMdContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 48,
  },
  sizeLgContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 54,
    borderRadius: 14,
  },
  primaryContainer: {
    backgroundColor: Colors.primary,
  },
  secondaryContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  destructiveContainer: {
    backgroundColor: Colors.status.error,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  disabledContainer: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  sizeSmText: {
    fontSize: 13,
  },
  sizeMdText: {
    fontSize: 15,
  },
  sizeLgText: {
    fontSize: 16,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: Colors.text.primary,
  },
  outlineText: {
    color: Colors.primaryLight,
  },
  destructiveText: {
    color: '#FFFFFF',
  },
  ghostText: {
    color: Colors.text.secondary,
  },
  disabledText: {
    color: Colors.text.muted,
  },
});
