import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>⚕</Text>
          </View>
          <Text style={styles.appName}>ANVAYA</Text>
          <Text style={styles.appTagline}>
            Paperless Healthcare Ecosystem Connecting Doctors, Medical Shops & Patients
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Application Information</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Version</Text>
            <Text style={styles.value}>1.0.0 (Release Candidate)</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Framework</Text>
            <Text style={styles.value}>React Native 0.79 / Expo SDK 53</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Engine</Text>
            <Text style={styles.value}>Hermes Bytecode Engine</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Target Platform</Text>
            <Text style={styles.value}>Android (Google Play) & iOS</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Security & Privacy Architecture</Text>
          <Text style={styles.bodyText}>
            • Cryptographically signed e-prescriptions with dynamic single-use verification tokens.
          </Text>
          <Text style={styles.bodyText}>
            • Strict role-based access control (RBAC) and explicit patient consent enforcement.
          </Text>
          <Text style={styles.bodyText}>
            • Zero third-party analytics trackers or commercial data sales.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 38,
    color: Colors.primaryLight,
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: 2,
    marginBottom: 6,
  },
  appTagline: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  card: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 28,
  },
  label: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  bodyText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});
