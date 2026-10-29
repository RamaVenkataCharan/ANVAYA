import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <SafeAreaView style={styles.container}>
        <Text style={styles.icon}>🔍</Text>
        <Text style={styles.title}>{t('notFound.title')}</Text>
        <Text style={styles.desc}>{t('notFound.desc')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('notFound.backHome')}</Text>
        </Link>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  icon: {
    fontSize: 54,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    maxWidth: 280,
  },
  link: {
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
