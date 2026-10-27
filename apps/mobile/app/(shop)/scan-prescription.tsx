import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useQueryClient } from '@tanstack/react-query';
import { PrescriptionModel, PrescriptionStatus } from '@anvaya/shared';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';

interface VerifyResult {
  isValid: boolean;
  status: PrescriptionStatus;
  prescription: PrescriptionModel;
}

export default function ScanPrescriptionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');

  const [isVerifying, setIsVerifying] = useState(false);
  const [isDispensing, setIsDispensing] = useState(false);
  const [currentCodeOrToken, setCurrentCodeOrToken] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dispenseSuccess, setDispenseSuccess] = useState(false);

  const verifyCodeOrToken = async (codeOrToken: string) => {
    const cleanToken = codeOrToken.trim();
    if (!cleanToken) {
      setErrorMessage('Please enter or scan a valid prescription code.');
      return;
    }

    setIsVerifying(true);
    setResult(null);
    setErrorMessage(null);
    setDispenseSuccess(false);
    setCurrentCodeOrToken(cleanToken);

    try {
      const response = await api.post('/prescriptions/verify', {
        codeOrToken: cleanToken,
      });

      const data: VerifyResult = response.data?.data;
      if (data) {
        setResult(data);
      } else {
        throw new Error('No data received from verification service');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; error?: string } } };
      if (axiosErr.response?.status === 429) {
        setErrorMessage(
          'Too many verification requests. Security rate limit active: please wait 10 minutes before retrying.'
        );
      } else {
        const msg =
          axiosErr.response?.data?.message ||
          axiosErr.response?.data?.error ||
          'Prescription not found or invalid QR token.';
        setErrorMessage(msg);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBarcodeScanned = (barcodeResult: BarcodeScanningResult) => {
    if (scanned || isVerifying || isDispensing) return;
    setScanned(true);
    verifyCodeOrToken(barcodeResult.data);
  };

  const handleDispense = () => {
    if (!currentCodeOrToken || !result?.prescription) return;

    Alert.alert(
      'Confirm Dispensing',
      `Fulfill prescription ${result.prescription.code} for ${result.prescription.patient?.user?.name || 'the patient'}? This will irreversibly lock the prescription.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fulfill & Dispense',
          style: 'default',
          onPress: async () => {
            setIsDispensing(true);
            setErrorMessage(null);
            try {
              await api.post('/prescriptions/dispense', {
                codeOrToken: currentCodeOrToken,
              });

              setDispenseSuccess(true);
              // Invalidate caches
              await queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
            } catch (dispenseErr: unknown) {
              const axiosErr = dispenseErr as {
                response?: { status?: number; data?: { message?: string; error?: string } };
              };
              if (axiosErr.response?.status === 400) {
                const msg =
                  axiosErr.response?.data?.message ||
                  'Prescription has already been dispensed or cannot be fulfilled.';
                setErrorMessage(`❌ Dispense Blocked: ${msg}`);
              } else if (axiosErr.response?.status === 429) {
                setErrorMessage(
                  'Rate limit reached: Too many dispense attempts. Please wait.'
                );
              } else {
                const msg =
                  axiosErr.response?.data?.message ||
                  'An error occurred while dispensing. Please try again.';
                setErrorMessage(msg);
              }
            } finally {
              setIsDispensing(false);
            }
          },
        },
      ]
    );
  };

  const resetScanner = () => {
    setScanned(false);
    setResult(null);
    setErrorMessage(null);
    setCurrentCodeOrToken(null);
    setManualCode('');
    setDispenseSuccess(false);
  };

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
            <Text style={styles.title}>Scan & Dispense</Text>
            <Text style={styles.subtitle}>
              Verify patient QR code or enter ANV prescription code to fulfill medication
            </Text>
          </View>

          {/* Mode Switcher */}
          {!result && !dispenseSuccess && (
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'camera' && styles.tabBtnActive]}
                onPress={() => setActiveTab('camera')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'camera' && styles.tabBtnTextActive,
                  ]}
                >
                  📷 Camera Scanner
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'manual' && styles.tabBtnActive]}
                onPress={() => setActiveTab('manual')}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'manual' && styles.tabBtnTextActive,
                  ]}
                >
                  ⌨️ Manual Code
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Verification in Progress */}
          {isVerifying && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.roles.shop} size="large" />
              <Text style={styles.loadingText}>Verifying with ANVAYA network...</Text>
            </View>
          )}

          {/* SUCCESSFUL DISPENSE BANNER */}
          {dispenseSuccess && (
            <View style={styles.successDispensedCard}>
              <View style={styles.successBadgeCircle}>
                <Text style={styles.successEmoji}>✓</Text>
              </View>
              <Text style={styles.successCardTitle}>Prescription Dispensed!</Text>
              <Text style={styles.successCardSubtitle}>
                Medication fulfillment is confirmed and recorded on the ledger. This
                prescription is now locked to DISPENSED.
              </Text>

              <View style={{ width: '100%', gap: 10 }}>
                <TouchableOpacity
                  style={styles.scanNextButton}
                  onPress={() =>
                    router.push({
                      pathname: '/(shop)/billing',
                      params: {
                        prescriptionId: result?.prescription?.id,
                        patientId: result?.prescription?.patientId,
                        patientName: result?.prescription?.patient?.user?.name || '',
                        patientPhone: result?.prescription?.patient?.user?.phone || '',
                      },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.scanNextButtonText}>
                    Create Bill for this Prescription 💳
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.scanNextButton,
                    {
                      backgroundColor: Colors.surfaceElevated,
                      borderColor: Colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/(shop)/refill-reminders',
                      params: {
                        prescriptionId: result?.prescription?.id,
                        patientName: result?.prescription?.patient?.user?.name || '',
                        prescriptionCode: result?.prescription?.code || '',
                      },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.scanNextButtonText,
                      { color: Colors.roles.shop },
                    ]}
                  >
                    Schedule Refill Reminder ⏰
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.scanNextButton,
                    {
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: Colors.border,
                    },
                  ]}
                  onPress={resetScanner}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.scanNextButtonText,
                      { color: Colors.text.muted },
                    ]}
                  >
                    Scan Next Prescription
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* VERIFICATION RESULT CARD */}
          {result && !dispenseSuccess && (
            <View style={styles.resultCard}>
              {/* Status Header */}
              {result.isValid ? (
                <View style={styles.validStatusBanner}>
                  <Text style={styles.validStatusEmoji}>✓</Text>
                  <View style={styles.statusCol}>
                    <Text style={styles.validStatusTitle}>READY TO DISPENSE</Text>
                    <Text style={styles.validStatusSubtitle}>
                      Prescription is valid and active
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.invalidStatusBanner}>
                  <Text style={styles.invalidStatusEmoji}>⚠️</Text>
                  <View style={styles.statusCol}>
                    <Text style={styles.invalidStatusTitle}>
                      STATUS: {result.status}
                    </Text>
                    <Text style={styles.invalidStatusSubtitle}>
                      {result.status === PrescriptionStatus.DISPENSED
                        ? 'Already fulfilled by another pharmacy'
                        : 'This prescription has been cancelled'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Prescription Code */}
              <View style={styles.codeRow}>
                <Text style={styles.infoLabel}>Prescription Code</Text>
                <Text style={styles.codeValueText}>{result.prescription.code}</Text>
              </View>

              <View style={styles.divider} />

              {/* Patient & Doctor details */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Patient Name</Text>
                <Text style={styles.infoValueHighlight}>
                  {result.prescription.patient?.user?.name || 'Patient'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Doctor</Text>
                <Text style={styles.infoValue}>
                  Dr. {result.prescription.doctor?.user?.name || 'Doctor'}
                </Text>
              </View>

              {/* Medications List */}
              <Text style={styles.medicationsTitle}>
                Medications to Dispense ({result.prescription.items?.length || 0}):
              </Text>

              {result.prescription.items?.map((item, idx) => (
                <View key={item.id || idx} style={styles.medRow}>
                  <View style={styles.medMainInfo}>
                    <Text style={styles.medNameText}>{item.medicine}</Text>
                    <Text style={styles.medDosageText}>
                      {item.dosage} • {item.frequency} • {item.duration}
                    </Text>
                    {item.instructions && (
                      <Text style={styles.medNoteText}>Note: {item.instructions}</Text>
                    )}
                  </View>
                  <View style={styles.medQtyBadge}>
                    <Text style={styles.medQtyText}>Qty: {item.quantity}</Text>
                  </View>
                </View>
              ))}

              {/* Actions */}
              {result.isValid ? (
                <TouchableOpacity
                  style={[styles.dispenseButton, isDispensing && styles.buttonDisabled]}
                  onPress={handleDispense}
                  disabled={isDispensing}
                  activeOpacity={0.8}
                >
                  {isDispensing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.dispenseButtonText}>
                      ✓ Mark as Dispensed
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.cancelVerifyBtn}
                onPress={resetScanner}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelVerifyText}>Scan Another Code</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SCANNER VIEW (CAMERA OR MANUAL) */}
          {!result && !dispenseSuccess && !isVerifying && (
            <View>
              {activeTab === 'camera' ? (
                <View style={styles.scannerWrapper}>
                  {!permission ? (
                    <View style={styles.permissionBox}>
                      <ActivityIndicator color={Colors.roles.shop} />
                    </View>
                  ) : !permission.granted ? (
                    <View style={styles.permissionBox}>
                      <Text style={styles.permIcon}>📷</Text>
                      <Text style={styles.permTitle}>Camera Access Required</Text>
                      <Text style={styles.permDesc}>
                        Please enable camera permissions to scan prescription QR codes
                        presented by patients.
                      </Text>
                      <TouchableOpacity
                        style={styles.permButton}
                        onPress={requestPermission}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.permButtonText}>Grant Camera Access</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.switchManualBtn}
                        onPress={() => setActiveTab('manual')}
                      >
                        <Text style={styles.switchManualText}>
                          Or enter code manually
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.cameraContainer}>
                      <CameraView
                        style={styles.camera}
                        barcodeScannerSettings={{
                          barcodeTypes: ['qr'],
                        }}
                        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                      />
                      {/* Viewfinder Target Overlay */}
                      <View style={styles.viewfinderOverlay}>
                        <View style={styles.viewfinderBox} />
                        <Text style={styles.viewfinderText}>
                          Align QR code inside the target box
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                /* Manual Entry Tab */
                <View style={styles.manualCard}>
                  <Text style={styles.manualLabel}>Enter Prescription Code</Text>
                  <Text style={styles.manualHint}>
                    Format: ANV-xxxx-xxxx (e.g. ANV-1234-5678)
                  </Text>
                  <TextInput
                    style={styles.manualInput}
                    placeholder="ANV-xxxx-xxxx"
                    placeholderTextColor={Colors.text.muted}
                    value={manualCode}
                    onChangeText={(t) => {
                      setManualCode(t.toUpperCase());
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[
                      styles.verifyButton,
                      !manualCode.trim() && styles.buttonDisabled,
                    ]}
                    onPress={() => verifyCodeOrToken(manualCode)}
                    disabled={!manualCode.trim()}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.verifyButtonText}>Verify Prescription</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
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
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.muted,
  },
  tabBtnTextActive: {
    color: Colors.text.primary,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  errorIcon: {
    fontSize: 18,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FECACA',
    lineHeight: 18,
  },
  loadingBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  scannerWrapper: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cameraContainer: {
    height: 380,
    position: 'relative',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 15, 25, 0.4)',
  },
  viewfinderBox: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: Colors.roles.shop,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  viewfinderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  permissionBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  permTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  permDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 260,
  },
  permButton: {
    backgroundColor: Colors.roles.shop,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  switchManualBtn: {
    marginTop: 14,
  },
  switchManualText: {
    fontSize: 13,
    color: Colors.roles.shop,
    fontWeight: '600',
  },
  manualCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  manualLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  manualHint: {
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 14,
  },
  manualInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  verifyButton: {
    backgroundColor: Colors.roles.shop,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Result Card styles
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  validStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.successBackground,
    borderColor: Colors.status.success,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  validStatusEmoji: {
    fontSize: 22,
    color: Colors.status.success,
    fontWeight: '900',
  },
  validStatusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.status.success,
    letterSpacing: 0.5,
  },
  validStatusSubtitle: {
    fontSize: 12,
    color: '#A7F3D0',
  },
  invalidStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  invalidStatusEmoji: {
    fontSize: 22,
  },
  invalidStatusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.status.error,
    letterSpacing: 0.5,
  },
  invalidStatusSubtitle: {
    fontSize: 12,
    color: '#FECACA',
  },
  statusCol: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  codeValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primaryLight,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  infoValue: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  infoValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  medicationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 10,
    marginBottom: 10,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    alignItems: 'center',
  },
  medMainInfo: {
    flex: 1,
  },
  medNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  medDosageText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  medNoteText: {
    fontSize: 11,
    color: Colors.text.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  medQtyBadge: {
    backgroundColor: Colors.roles.shopBackground,
    borderColor: Colors.roles.shop,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  medQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.roles.shop,
  },
  dispenseButton: {
    backgroundColor: Colors.roles.shop,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Colors.roles.shop,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  dispenseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelVerifyBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelVerifyText: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  // Success Dispensed Card
  successDispensedCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: Colors.roles.shop,
    alignItems: 'center',
  },
  successBadgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.status.successBackground,
    borderWidth: 2,
    borderColor: Colors.roles.shop,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 32,
    color: Colors.roles.shop,
    fontWeight: '900',
  },
  successCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  successCardSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 24,
  },
  scanNextButton: {
    width: '100%',
    backgroundColor: Colors.roles.shop,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanNextButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
