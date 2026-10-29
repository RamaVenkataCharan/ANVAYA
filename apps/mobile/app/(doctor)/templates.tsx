import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Card, Button } from '../../components/ui';

interface ClinicalTemplate {
  id: string;
  name: string;
  category: string;
  diagnosis: string;
  items: {
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
}

const DEFAULT_TEMPLATES: ClinicalTemplate[] = [
  {
    id: 'tpl_uri',
    name: 'Acute Upper Respiratory Infection',
    category: 'Respiratory',
    diagnosis: 'Acute viral pharyngitis with cough',
    items: [
      {
        medicineName: 'Paracetamol 650mg',
        dosage: '1 tablet',
        frequency: 'TDS (Three times daily)',
        duration: '5 days',
        instructions: 'Post meals for fever and body ache',
      },
      {
        medicineName: 'Cetirizine 10mg',
        dosage: '1 tablet',
        frequency: 'OD (Once daily at night)',
        duration: '5 days',
        instructions: 'Take before sleep',
      },
      {
        medicineName: 'Ambroxol Syrup',
        dosage: '10 ml',
        frequency: 'TDS',
        duration: '5 days',
        instructions: 'For productive cough',
      },
    ],
  },
  {
    id: 'tpl_htn',
    name: 'Hypertension - Stage 1 Maintenance',
    category: 'Cardiovascular',
    diagnosis: 'Primary hypertension',
    items: [
      {
        medicineName: 'Telmisartan 40mg',
        dosage: '1 tablet',
        frequency: 'OD (Morning)',
        duration: '30 days',
        instructions: 'Take consistently with water after breakfast',
      },
      {
        medicineName: 'Amlodipine 5mg',
        dosage: '1 tablet',
        frequency: 'OD (Night)',
        duration: '30 days',
        instructions: 'Monitor blood pressure weekly',
      },
    ],
  },
  {
    id: 'tpl_t2d',
    name: 'Type 2 Diabetes Mellitus - Standard',
    category: 'Endocrinology',
    diagnosis: 'Type 2 Diabetes without complications',
    items: [
      {
        medicineName: 'Metformin 500mg (SR)',
        dosage: '1 tablet',
        frequency: 'BD (Twice daily)',
        duration: '30 days',
        instructions: 'Take immediately after breakfast and dinner',
      },
      {
        medicineName: 'Glimepiride 1mg',
        dosage: '1 tablet',
        frequency: 'OD (Morning)',
        duration: '30 days',
        instructions: 'Take 15 minutes before breakfast',
      },
    ],
  },
  {
    id: 'tpl_gerd',
    name: 'Acid Peptic Disease / GERD',
    category: 'Gastroenterology',
    diagnosis: 'Gastroesophageal reflux with dyspepsia',
    items: [
      {
        medicineName: 'Pantoprazole 40mg + Domperidone 30mg',
        dosage: '1 capsule',
        frequency: 'OD (Morning)',
        duration: '14 days',
        instructions: 'Strictly empty stomach 30 mins before food',
      },
      {
        medicineName: 'Sucralfate Suspension',
        dosage: '10 ml',
        frequency: 'TDS',
        duration: '7 days',
        instructions: 'Take 1 hour before meals',
      },
    ],
  },
];

export default function DoctorTemplatesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = DEFAULT_TEMPLATES.filter((tpl) =>
    tpl.name.toLowerCase().includes(search.toLowerCase()) ||
    tpl.category.toLowerCase().includes(search.toLowerCase()) ||
    tpl.diagnosis.toLowerCase().includes(search.toLowerCase())
  );

  const handleApplyTemplate = (tpl: ClinicalTemplate) => {
    router.push({
      pathname: '/(doctor)/new-prescription',
      params: {
        templateId: tpl.id,
        diagnosis: tpl.diagnosis,
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Text style={styles.backBtnText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('doctorTemplates.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates by condition or category..."
          placeholderTextColor={Colors.text.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Templates List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card style={styles.templateCard}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.templateCategory}>{item.category.toUpperCase()}</Text>
                <Text style={styles.templateName}>{item.name}</Text>
                <Text style={styles.templateDiagnosis}>{item.diagnosis}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.medsList}>
              {item.items.map((m, idx) => (
                <View key={idx} style={styles.medRow}>
                  <Text style={styles.medBullet}>💊</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>
                      {m.medicineName} ({m.dosage})
                    </Text>
                    <Text style={styles.medMeta}>
                      {m.frequency} • {m.duration}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <Button
              label={t('doctorTemplates.apply')}
              variant="outline"
              onPress={() => handleApplyTemplate(item)}
              style={styles.applyBtn}
            />
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: {
    color: Colors.roles.doctor,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 14,
  },
  clearBtn: {
    color: Colors.text.muted,
    fontSize: 16,
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  templateCard: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  templateCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.roles.doctor,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  templateDiagnosis: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  medsList: {
    gap: 8,
    marginBottom: 14,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  medBullet: {
    fontSize: 14,
    marginTop: 2,
  },
  medName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  medMeta: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  applyBtn: {
    minHeight: 44,
  },
});
