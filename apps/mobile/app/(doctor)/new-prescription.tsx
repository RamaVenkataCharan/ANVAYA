import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  prescriptionItemSchema,
  createPrescriptionSchema,
  PrescriptionItemInput,
} from '@anvaya/shared';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';
import { MedicineAutocomplete } from '../../components/MedicineAutocomplete';

interface PatientLookupResult {
  id: string;
  name: string;
  age: number;
}

const emptyMedicineItem: PrescriptionItemInput = {
  medicine: '',
  dosage: '500mg',
  frequency: '1-0-1 after food',
  duration: '5 days',
  quantity: 10,
  instructions: '',
};

export default function NewPrescriptionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ patientId?: string; patientName?: string; diagnosis?: string }>();

  // Patient lookup state
  const [phone, setPhone] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [patient, setPatient] = useState<PatientLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Prescription fields
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PrescriptionItemInput[]>([{ ...emptyMedicineItem }]);

  useEffect(() => {
    if (params.patientId) {
      setPatient({
        id: params.patientId,
        name: params.patientName || 'Consultation Patient',
        age: 30,
      });
    }
    if (params.diagnosis) {
      setDiagnosis(params.diagnosis);
    }
  }, [params.patientId, params.patientName, params.diagnosis]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  const handleLookup = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setLookupError('Enter a valid 10-15 digit phone number');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    try {
      const response = await api.get('/patients/lookup', {
        params: { phone: cleanPhone },
      });
      const data: PatientLookupResult = response.data?.data;
      if (data && data.id) {
        setPatient(data);
        setLookupError(null);
      } else {
        setPatient(null);
        setLookupError('No patient found with this phone number.');
      }
    } catch (err: unknown) {
      setPatient(null);
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        'No patient found with this phone number.';
      setLookupError(msg);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddMedicine = () => {
    setItems((prev) => [...prev, { ...emptyMedicineItem }]);
  };

  const handleRemoveMedicine = (index: number) => {
    if (items.length <= 1) {
      setSubmitError('Prescription must have at least one medication.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: keyof PrescriptionItemInput, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!patient) {
      setSubmitError('Please look up and select a patient by phone number.');
      return;
    }

    if (!diagnosis.trim() || diagnosis.trim().length < 2) {
      setSubmitError('Clinical diagnosis is required (min 2 characters).');
      return;
    }

    // Validate medicines with zod
    const parsedItems: PrescriptionItemInput[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const parsed = prescriptionItemSchema.safeParse({
        ...item,
        quantity: Number(item.quantity) || 1,
      });

      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || `Error in medicine #${i + 1}`;
        setSubmitError(`Medicine #${i + 1}: ${errorMsg}`);
        return;
      }
      parsedItems.push(parsed.data);
    }

    const payload = {
      patientId: patient.id,
      diagnosis: diagnosis.trim(),
      notes: notes.trim() || undefined,
      items: parsedItems,
    };

    const validatedPayload = createPrescriptionSchema.safeParse(payload);
    if (!validatedPayload.success) {
      setSubmitError(validatedPayload.error.issues[0]?.message || 'Validation error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/prescriptions', payload);
      const created = response.data?.data;

      if (created?.code) {
        setIssuedCode(created.code);
        // Invalidate react-query cache so prescriptions tab gets updated
        await queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      } else {
        throw new Error('Server did not return a valid prescription code');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      const msg =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        'Failed to issue prescription. Please check all fields.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPatient(null);
    setPhone('');
    setDiagnosis('');
    setNotes('');
    setItems([{ ...emptyMedicineItem }]);
    setIssuedCode(null);
    setSubmitError(null);
    setLookupError(null);
  };

  // SUCCESS SCREEN
  if (issuedCode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIconBadge}>
            <Text style={styles.successEmoji}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Prescription Issued!</Text>
          <Text style={styles.successSubtitle}>
            The prescription has been generated with a single-use QR code and stored on the ANVAYA network.
          </Text>

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>PRESCRIPTION CODE</Text>
            <Text style={styles.codeValue}>{issuedCode}</Text>
            <Text style={styles.codeHint}>
              Patient: {patient?.name} ({patient?.age} yrs)
            </Text>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              resetForm();
              router.push('/(doctor)/prescriptions');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.issueAnotherButton}
            onPress={resetForm}
            activeOpacity={0.8}
          >
            <Text style={styles.issueAnotherText}>Issue Another Prescription</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>New Prescription</Text>
            <Text style={styles.subtitle}>
              Issue a verified e-prescription with QR authentication
            </Text>
          </View>

          {/* Submission Error Banner */}
          {submitError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          )}

          {/* Step 1: Patient Lookup */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>1. Patient Verification</Text>
            <Text style={styles.sectionSubtitle}>
              Look up patient by registered phone number (privacy-preserving)
            </Text>

            {!patient ? (
              <View>
                <View style={styles.lookupRow}>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Patient phone (e.g. 9876543210)"
                    placeholderTextColor={Colors.text.muted}
                    value={phone}
                    onChangeText={(t) => {
                      setPhone(t);
                      if (lookupError) setLookupError(null);
                    }}
                    keyboardType="phone-pad"
                    editable={!isLookingUp}
                  />
                  <TouchableOpacity
                    style={[styles.lookupButton, isLookingUp && styles.buttonDisabled]}
                    onPress={handleLookup}
                    disabled={isLookingUp}
                    activeOpacity={0.8}
                  >
                    {isLookingUp ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.lookupButtonText}>Lookup</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {lookupError && (
                  <Text style={styles.lookupErrorText}>{lookupError}</Text>
                )}
              </View>
            ) : (
              <View style={styles.patientVerifiedBox}>
                <View style={styles.patientInfoCol}>
                  <View style={styles.verifiedRow}>
                    <Text style={styles.verifiedDot}>✓</Text>
                    <Text style={styles.patientName}>{patient.name}</Text>
                  </View>
                  <Text style={styles.patientMeta}>
                    Age: {patient.age} years • Phone: {phone}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changePatientBtn}
                  onPress={() => {
                    setPatient(null);
                    setPhone('');
                  }}
                >
                  <Text style={styles.changePatientText}>Change</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Step 2: Diagnosis & Notes */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>2. Clinical Assessment</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Diagnosis *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Acute Upper Respiratory Tract Infection"
                placeholderTextColor={Colors.text.muted}
                value={diagnosis}
                onChangeText={(t) => {
                  setDiagnosis(t);
                  if (submitError) setSubmitError(null);
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Clinical Notes / Observations (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Advised adequate hydration and rest for 3 days"
                placeholderTextColor={Colors.text.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Step 3: Dynamic Medicines List */}
          <View style={styles.sectionCard}>
            <View style={styles.medicinesHeaderRow}>
              <Text style={styles.sectionTitle}>3. Prescribed Medicines</Text>
              <TouchableOpacity
                style={styles.addMedButton}
                onPress={handleAddMedicine}
                activeOpacity={0.8}
              >
                <Text style={styles.addMedButtonText}>+ Add Row</Text>
              </TouchableOpacity>
            </View>

            {items.map((med, index) => (
              <View key={index} style={styles.medCard}>
                <View style={styles.medCardHeader}>
                  <Text style={styles.medIndexLabel}>Medicine #{index + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMedicine(index)}
                      style={styles.removeMedButton}
                    >
                      <Text style={styles.removeMedText}>🗑️ Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Medicine Name with Autocomplete */}
                <MedicineAutocomplete
                  label="Medicine Name *"
                  placeholder="e.g. Amoxicillin 500mg or Paracetamol"
                  value={med.medicine}
                  onChangeText={(val) => updateMedicine(index, 'medicine', val)}
                  accessibilityLabel={`Medicine ${index + 1} Name`}
                />

                {/* Dosage & Quantity Row */}
                <View style={styles.multiColRow}>
                  <View style={styles.col}>
                    <Text style={styles.smallLabel}>Dosage *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 625mg"
                      placeholderTextColor={Colors.text.muted}
                      value={med.dosage}
                      onChangeText={(val) => updateMedicine(index, 'dosage', val)}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.smallLabel}>Quantity *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 10"
                      placeholderTextColor={Colors.text.muted}
                      value={String(med.quantity)}
                      keyboardType="numeric"
                      onChangeText={(val) =>
                        updateMedicine(index, 'quantity', parseInt(val, 10) || 1)
                      }
                    />
                  </View>
                </View>

                {/* Frequency & Duration Row */}
                <View style={styles.multiColRow}>
                  <View style={styles.col}>
                    <Text style={styles.smallLabel}>Frequency *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 1-0-1 after food"
                      placeholderTextColor={Colors.text.muted}
                      value={med.frequency}
                      onChangeText={(val) => updateMedicine(index, 'frequency', val)}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.smallLabel}>Duration *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 5 days"
                      placeholderTextColor={Colors.text.muted}
                      value={med.duration}
                      onChangeText={(val) => updateMedicine(index, 'duration', val)}
                    />
                  </View>
                </View>

                {/* Instructions */}
                <View style={styles.inputGroup}>
                  <Text style={styles.smallLabel}>Special Instructions (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Complete full course, do not skip"
                    placeholderTextColor={Colors.text.muted}
                    value={med.instructions || ''}
                    onChangeText={(val) => updateMedicine(index, 'instructions', val)}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Submit Action */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Issue & Sign Prescription</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
    paddingTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FECACA',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 12,
  },
  lookupRow: {
    flexDirection: 'row',
    gap: 10,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.text.primary,
  },
  lookupButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookupButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  lookupErrorText: {
    fontSize: 12,
    color: Colors.status.error,
    marginTop: 8,
  },
  patientVerifiedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.status.successBackground,
    borderColor: Colors.status.success,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  patientInfoCol: {
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  verifiedDot: {
    color: Colors.status.success,
    fontWeight: '800',
    fontSize: 14,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  patientMeta: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  changePatientBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  changePatientText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  medicinesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addMedButton: {
    backgroundColor: Colors.roles.doctorBackground,
    borderColor: Colors.roles.doctor,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addMedButtonText: {
    color: Colors.primaryLight,
    fontWeight: '700',
    fontSize: 12,
  },
  medCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  medCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medIndexLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  removeMedButton: {
    padding: 4,
  },
  removeMedText: {
    fontSize: 12,
    color: Colors.status.error,
  },
  multiColRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  col: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Success state styles
  successContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.status.successBackground,
    borderWidth: 2,
    borderColor: Colors.status.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successEmoji: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
    marginBottom: 28,
  },
  codeCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    marginBottom: 32,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryLight,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  codeHint: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  doneButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  issueAnotherButton: {
    paddingVertical: 10,
  },
  issueAnotherText: {
    color: Colors.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
});
