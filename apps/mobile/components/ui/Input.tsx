import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
  ViewProps,
} from 'react-native';
import { Colors } from '../../constants/colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  leftAccessory?: ViewProps['children'];
  rightAccessory?: ViewProps['children'];
}

export function Input({
  label,
  error,
  helperText,
  required = false,
  containerStyle,
  inputStyle,
  leftAccessory,
  rightAccessory,
  onFocus,
  onBlur,
  editable = true,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.requiredAsterisk}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      >
        {leftAccessory ? <View style={styles.leftAccessory}>{leftAccessory}</View> : null}

        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={Colors.text.muted}
          editable={editable}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: !editable }}
          {...rest}
        />

        {rightAccessory ? <View style={styles.rightAccessory}>{rightAccessory}</View> : null}
      </View>

      {hasError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  labelRow: {
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  requiredAsterisk: {
    color: Colors.status.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: Colors.primaryLight,
  },
  inputError: {
    borderColor: Colors.status.error,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.surfaceLight,
  },
  input: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  leftAccessory: {
    marginRight: 8,
  },
  rightAccessory: {
    marginLeft: 8,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    color: Colors.text.muted,
    fontSize: 12,
    marginTop: 4,
  },
});
