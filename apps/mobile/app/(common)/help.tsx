import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Card, Input, Button } from '../../components/ui';

export default function HelpScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('q1');

  const faqs = [
    { id: 'q1', q: t('help.q1'), a: t('help.a1') },
    { id: 'q2', q: t('help.q2'), a: t('help.a2') },
    { id: 'q3', q: t('help.q3'), a: t('help.a3') },
  ];

  const filteredFaqs = faqs.filter(
    (item) =>
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
  );

  const handleContact = () => {
    void Linking.openURL('mailto:support@anvaya.health?subject=ANVAYA%20Mobile%20Support');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search questions or topics..."
          accessibilityLabel="Search help questions"
        />

        <Text style={styles.sectionTitle}>{t('help.faqTitle')}</Text>

        <View style={styles.faqList}>
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <Card key={faq.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => setExpandedId(isExpanded ? null : faq.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={faq.q}
                >
                  <Text style={styles.questionText}>{faq.q}</Text>
                  <Text style={styles.expandIcon}>{isExpanded ? '−' : '+'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>{faq.a}</Text>
                  </View>
                )}
              </Card>
            );
          })}
        </View>

        {/* Contact Support CTA */}
        <Card style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need assistance?</Text>
          <Text style={styles.contactDesc}>
            Our clinical support team is available Monday through Saturday, 9 AM – 7 PM IST.
          </Text>
          <Button
            label="Email Support Desk"
            onPress={handleContact}
            variant="secondary"
            accessibilityLabel="Email Support Desk"
          />
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 8,
  },
  faqList: {
    gap: 12,
  },
  faqCard: {
    padding: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  expandIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  answerContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  answerText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  contactCard: {
    padding: 20,
    gap: 12,
    marginTop: 8,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  contactDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});

