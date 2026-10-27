import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  ViewProps,
} from 'react-native';
import { Colors } from '../../constants/colors';

export interface ListRowProps extends TouchableOpacityProps {
  title: string;
  subtitle?: string;
  leftIcon?: ViewProps['children'];
  leftEmoji?: string;
  rightAccessory?: ViewProps['children'];
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  destructive?: boolean;
}

export function ListRow({
  title,
  subtitle,
  leftIcon,
  leftEmoji,
  rightAccessory,
  showChevron = false,
  style,
  titleStyle,
  subtitleStyle,
  destructive = false,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}: ListRowProps) {
  const isPressable = Boolean(onPress) && !disabled;

  const content = (
    <View style={styles.innerRow}>
      {leftEmoji ? (
        <View style={styles.emojiContainer}>
          <Text style={styles.emojiText}>{leftEmoji}</Text>
        </View>
      ) : leftIcon ? (
        <View style={styles.iconContainer}>{leftIcon}</View>
      ) : null}

      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            destructive && styles.titleDestructive,
            titleStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAccessory ? <View style={styles.rightAccessory}>{rightAccessory}</View> : null}

      {showChevron ? (
        <Text style={styles.chevron} accessibilityElementsHidden={true}>
          ›
        </Text>
      ) : null}
    </View>
  );

  if (isPressable) {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        {...rest}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, style]} {...rest}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52, // Accessible tap target
    justifyContent: 'center',
    marginBottom: 10,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 18,
  },
  iconContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  titleDestructive: {
    color: Colors.status.error,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  rightAccessory: {
    marginLeft: 8,
  },
  chevron: {
    fontSize: 22,
    color: Colors.text.muted,
    fontWeight: '300',
    marginLeft: 4,
  },
});
