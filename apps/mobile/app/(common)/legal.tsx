import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui';

export default function LegalScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Prominent Mandatory Legal Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>⚠️ IMPORTANT NOTICE — DRAFT ONLY</Text>
          <Text style={styles.disclaimerBody}>{t('legal.draftDisclaimer')}</Text>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'terms' && styles.tabBtnActive]}
            onPress={() => setActiveTab('terms')}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'terms' }}
          >
            <Text
              style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}
            >
              {t('legal.termsTitle')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'privacy' && styles.tabBtnActive]}
            onPress={() => setActiveTab('privacy')}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'privacy' }}
          >
            <Text
              style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}
            >
              {t('legal.privacyTitle')}
            </Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.card}>
          {activeTab === 'terms' ? (
            <View style={styles.legalBody}>
              <Text style={styles.heading}>1. Acceptance of Terms (DRAFT)</Text>
              <Text style={styles.paragraph}>{t('legal.termsText')}</Text>

              <Text style={styles.heading}>2. Practitioner Clinical Discretion</Text>
              <Text style={styles.paragraph}>
                Healthcare providers retain sole discretion and professional liability for all electronic prescriptions, dosages, and clinical instructions generated through the application.
              </Text>

              <Text style={styles.heading}>3. Pharmacy Verification Responsibility</Text>
              <Text style={styles.paragraph}>
                Licensed pharmacies must verify prescription validity through cryptographic QR verification or direct patient authentication before dispensing scheduled medications.
              </Text>

              <Text style={styles.heading}>4. Platform Disclaimer</Text>
              <Text style={styles.paragraph}>
                This system provides administrative coordination and paperless transmission. It does not provide medical diagnoses or replace emergency medical interventions.
              </Text>
            </View>
          ) : (
            <View style={styles.legalBody}>
              <Text style={styles.heading}>1. Data Protection & Privacy (DRAFT)</Text>
              <Text style={styles.paragraph}>{t('legal.privacyText')}</Text>

              <Text style={styles.heading}>2. Patient Consent & Auditability</Text>
              <Text style={styles.paragraph}>
                Diagnostic reports and clinical records are restricted to practitioners who have been granted active consent by the patient. Every record access is logged to an immutable security audit trail.
              </Text>

              <Text style={styles.heading}>3. Data Subject Rights</Text>
              <Text style={styles.paragraph}>
                Users have the right to request an export of their stored consultation history or request account deactivation at any time via Settings.
              </Text>

              <Text style={styles.heading}>4. Security Architecture</Text>
              <Text style={styles.paragraph}>
                All communication is conducted over encrypted TLS channels with session token revocation and access control layers.
              </Text>
            </View>
          )}
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
    padding: 20,
    gap: 16,
  },
  disclaimerBox: {
    backgroundColor: Colors.status.warningBackground,
    borderWidth: 1,
    borderColor: Colors.status.warning,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.status.warning,
  },
  disclaimerBody: {
    fontSize: 12,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.text.primary,
  },
  card: {
    padding: 20,
  },
  legalBody: {
    gap: 12,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 4,
  },
  paragraph: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});

