import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export default function CommonLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTintColor: Colors.text.primary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: Colors.background,
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ),
      }}
    />
  );
}

const styles = StyleSheet.create({
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backArrow: {
    color: Colors.primaryLight,
    fontSize: 22,
    fontWeight: '700',
  },
});
