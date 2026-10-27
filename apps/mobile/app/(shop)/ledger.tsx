import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LedgerType, CreateLedgerEntryInput } from '@anvaya/shared';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';

interface PatientBalanceSummary {
  patientId: string;
  patientName: string;
  patientPhone: string;
  balance: number;
  totalCredit: number;
  totalPayment: number;
  lastActivity: string;
}

interface ShopLedgerEntry {
  id: string;
  shopId: string;
  patientId: string;
  type: LedgerType;
  amount: number;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
  patient?: {
    id: string;
    user?: {
      name: string;
      email: string;
      phone: string;
    };
  };
}

export default function ShopLedgerScreen() {
  const queryClient = useQueryClient();

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [recordPaymentModalVisible, setRecordPaymentModalVisible] = useState(false);

  // Record payment form states
  const [paymentPatientId, setPaymentPatientId] = useState('');
  const [paymentPatientName, setPaymentPatientName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('Payment settlement received');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Patient phone lookup in payment modal
  const [lookupPhone, setLookupPhone] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Fetch all ledger entries for the shop
  const {
    data: ledgerEntries = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<ShopLedgerEntry[]>({
    queryKey: ['ledger'],
    queryFn: async () => {
      const response = await api.get('/billing/ledger');
      return response.data?.data || [];
    },
  });

  // Aggregate entries per patient to display patient Khata balance cards
  const patientMap = new Map<string, PatientBalanceSummary>();
  let totalKhataOutstanding = 0;

  ledgerEntries.forEach((entry: ShopLedgerEntry) => {
    const pId = entry.patientId;
    const pName = entry.patient?.user?.name || 'Customer';
    const pPhone = entry.patient?.user?.phone || '';
    const amt = Number(entry.amount) || 0;
    const isCredit = entry.type === LedgerType.CREDIT;

    if (!patientMap.has(pId)) {
      patientMap.set(pId, {
        patientId: pId,
        patientName: pName,
        patientPhone: pPhone,
        balance: 0,
        totalCredit: 0,
        totalPayment: 0,
        lastActivity: entry.createdAt,
      });
    }

    const patientSummary = patientMap.get(pId)!;
    if (isCredit) {
      patientSummary.totalCredit += amt;
      patientSummary.balance += amt;
    } else {
      patientSummary.totalPayment += amt;
      patientSummary.balance -= amt;
    }
  });

  const patientSummaries = Array.from(patientMap.values());
  patientSummaries.forEach((p) => {
    totalKhataOutstanding += Math.max(0, p.balance);
  });

  // Filter entries if a patient is selected
  const displayedEntries = selectedPatientId
    ? ledgerEntries.filter((e: ShopLedgerEntry) => e.patientId === selectedPatientId)
    : ledgerEntries;

  // Selected patient balance details
  const activePatientSummary = selectedPatientId
    ? patientMap.get(selectedPatientId)
    : null;

  // Open Record Payment Modal pre-filled
  const openRecordPayment = (patientId?: string, patientName?: string) => {
    if (patientId && patientName) {
      setPaymentPatientId(patientId);
      setPaymentPatientName(patientName);
    } else if (selectedPatientId && activePatientSummary) {
      setPaymentPatientId(selectedPatientId);
      setPaymentPatientName(activePatientSummary.patientName);
    } else {
      setPaymentPatientId('');
      setPaymentPatientName('');
    }
    setPaymentAmount('');
    setPaymentDesc('Payment settlement received');
    setPaymentError(null);
    setLookupError(null);
    setRecordPaymentModalVisible(true);
  };

  // Lookup Patient by phone inside Record Payment modal
  const handleLookupPatient = async () => {
    const cleanPhone = lookupPhone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setLookupError('Enter a valid 10-15 digit phone number');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    try {
      const res = await api.get('/patients/lookup', {
        params: { phone: cleanPhone },
      });
      const data = res.data?.data;
      if (data && data.id) {
        setPaymentPatientId(data.id);
        setPaymentPatientName(data.name);
      } else {
        setLookupError('No patient found with this phone number.');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setLookupError(axiosErr.response?.data?.message || 'Patient not found.');
    } finally {
      setIsLookingUp(false);
    }
  };

  // Submit payment
  const handleSubmitPayment = async () => {
    if (!paymentPatientId) {
      setPaymentError('Please select or lookup a patient.');
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Enter a valid payment amount greater than ₹0.');
      return;
    }

    if (!paymentDesc.trim()) {
      setPaymentError('Payment description is required.');
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError(null);

    try {
      const payload: CreateLedgerEntryInput = {
        patientId: paymentPatientId,
        amount: amt,
        type: LedgerType.PAYMENT,
        description: paymentDesc.trim(),
      };

      await api.post('/billing/ledger', payload);

      // Invalidate ledger query
      await queryClient.invalidateQueries({ queryKey: ['ledger'] });

      setRecordPaymentModalVisible(false);
      Alert.alert(
        'Payment Recorded',
        `₹${amt.toFixed(2)} received from ${paymentPatientName} has been credited to their Khata.`
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setPaymentError(
        axiosErr.response?.data?.message || 'Failed to record payment entry.'
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const renderEntryItem = ({ item }: { item: ShopLedgerEntry }) => {
    const isCredit = item.type === LedgerType.CREDIT;
    const formattedDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryIconBox}>
          <Text style={styles.entryIcon}>{isCredit ? '📤' : '📥'}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.entryTopRow}>
            <Text style={styles.entryPatient}>
              {item.patient?.user?.name || 'Customer'}
            </Text>
            <Text
              style={[
                styles.entryAmount,
                isCredit ? styles.amountCredit : styles.amountPayment,
              ]}
            >
              {isCredit ? `+₹${item.amount}` : `-₹${item.amount}`}
            </Text>
          </View>

          <Text style={styles.entryDesc}>{item.description}</Text>

          <View style={styles.entryBottomRow}>
            <Text style={styles.entryDate}>{formattedDate}</Text>
            <View
              style={[
                styles.typePill,
                isCredit ? styles.typePillCredit : styles.typePillPayment,
              ]}
            >
              <Text
                style={[
                  styles.typePillText,
                  isCredit
                    ? styles.typePillCreditText
                    : styles.typePillPaymentText,
                ]}
              >
                {isCredit ? 'CREDIT GIVEN' : 'PAYMENT RECEIVED'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>CREDIT & KHATA</Text>
          <Text style={styles.headerTitle}>Khata Ledger</Text>
        </View>
        <TouchableOpacity
          style={styles.recordPaymentBtn}
          onPress={() => openRecordPayment()}
          activeOpacity={0.8}
        >
          <Text style={styles.recordPaymentBtnText}>+ Record Payment</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Outstanding Total Card */}
        <View style={styles.summaryBanner}>
          <View>
            <Text style={styles.bannerSubtitle}>TOTAL KHATA RECEIVABLES</Text>
            <Text style={styles.bannerTotal}>
              ₹{totalKhataOutstanding.toFixed(2)}
            </Text>
            <Text style={styles.bannerDesc}>
              Across {patientSummaries.length} customer accounts
            </Text>
          </View>
          <View style={styles.bannerIconBox}>
            <Text style={styles.bannerIcon}>📖</Text>
          </View>
        </View>

        {/* Patient Horizontal Filter Chips */}
        {patientSummaries.length > 0 && (
          <View style={styles.patientChipsSection}>
            <Text style={styles.sectionTitle}>Customer Accounts</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <TouchableOpacity
                style={[
                  styles.patientChip,
                  selectedPatientId === null && styles.patientChipActive,
                ]}
                onPress={() => setSelectedPatientId(null)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedPatientId === null && styles.chipTextActive,
                  ]}
                >
                  All Accounts ({patientSummaries.length})
                </Text>
              </TouchableOpacity>

              {patientSummaries.map((p) => {
                const isSelected = selectedPatientId === p.patientId;
                return (
                  <TouchableOpacity
                    key={p.patientId}
                    style={[
                      styles.patientChip,
                      isSelected && styles.patientChipActive,
                    ]}
                    onPress={() =>
                      setSelectedPatientId(isSelected ? null : p.patientId)
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {p.patientName} (₹{p.balance})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Active Patient Details Banner (if filtered) */}
        {activePatientSummary && (
          <View style={styles.activePatientCard}>
            <View style={styles.activePatientHeader}>
              <View>
                <Text style={styles.activePatientName}>
                  {activePatientSummary.patientName}
                </Text>
                <Text style={styles.activePatientPhone}>
                  {activePatientSummary.patientPhone || 'No phone registered'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.payNowBtn}
                onPress={() =>
                  openRecordPayment(
                    activePatientSummary.patientId,
                    activePatientSummary.patientName
                  )
                }
              >
                <Text style={styles.payNowBtnText}>Collect Payment</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.patientStatsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Billed (Credit)</Text>
                <Text style={styles.statValCredit}>
                  ₹{activePatientSummary.totalCredit.toFixed(2)}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Paid Back</Text>
                <Text style={styles.statValPayment}>
                  ₹{activePatientSummary.totalPayment.toFixed(2)}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Due Balance</Text>
                <Text style={styles.statValDue}>
                  ₹{activePatientSummary.balance.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Ledger Entries List */}
        <View style={styles.entriesSection}>
          <View style={styles.entriesHeaderRow}>
            <Text style={styles.sectionTitle}>
              {selectedPatientId ? 'Patient Ledger History' : 'All Recent Transactions'}
            </Text>
            {isRefetching && (
              <ActivityIndicator color={Colors.roles.shop} size="small" />
            )}
          </View>

          {isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={Colors.roles.shop} size="large" />
              <Text style={styles.loadingText}>Loading ledger records...</Text>
            </View>
          ) : isError ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorEmoji}>⚠️</Text>
              <Text style={styles.errorText}>Could not load Khata entries.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : displayedEntries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📖</Text>
              <Text style={styles.emptyTitle}>No Khata Records</Text>
              <Text style={styles.emptySubtitle}>
                When bills are created with payment method &ldquo;Khata Credit&rdquo;,
                they automatically appear here.
              </Text>
            </View>
          ) : (
            displayedEntries.map((item: ShopLedgerEntry) => (
              <View key={item.id}>{renderEntryItem({ item })}</View>
            ))
          )}
        </View>
      </ScrollView>

      {/* RECORD PAYMENT MODAL */}
      <Modal
        visible={recordPaymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRecordPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Payment</Text>
                <Text style={styles.modalSubtitle}>
                  Credit received towards customer Khata
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRecordPaymentModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {/* Patient Selection in Modal */}
              <Text style={styles.fieldLabel}>Customer / Patient</Text>
              {paymentPatientId ? (
                <View style={styles.selectedPatientBanner}>
                  <Text style={styles.selectedPatientText}>
                    👤 {paymentPatientName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setPaymentPatientId('');
                      setPaymentPatientName('');
                    }}
                  >
                    <Text style={styles.changePatientText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.lookupContainer}>
                  <View style={styles.lookupInputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Lookup customer by phone"
                      placeholderTextColor={Colors.text.muted}
                      keyboardType="phone-pad"
                      value={lookupPhone}
                      onChangeText={setLookupPhone}
                    />
                    <TouchableOpacity
                      style={styles.lookupButton}
                      onPress={handleLookupPatient}
                      disabled={isLookingUp}
                    >
                      {isLookingUp ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.lookupButtonText}>Lookup</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {lookupError && (
                    <Text style={styles.errorSubText}>⚠️ {lookupError}</Text>
                  )}
                </View>
              )}

              {/* Amount */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.fieldLabel}>Amount Received (₹)</Text>
                <TextInput
                  style={[styles.input, { fontSize: 18, fontWeight: '800' }]}
                  placeholder="0.00"
                  placeholderTextColor={Colors.text.muted}
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
              </View>

              {/* Description */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.fieldLabel}>Payment Mode / Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Cash payment at counter, GPay transfer"
                  placeholderTextColor={Colors.text.muted}
                  value={paymentDesc}
                  onChangeText={setPaymentDesc}
                />
              </View>

              {paymentError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>⚠️ {paymentError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitPaymentBtn,
                  isSubmittingPayment && styles.buttonDisabled,
                ]}
                onPress={handleSubmitPayment}
                disabled={isSubmittingPayment}
                activeOpacity={0.8}
              >
                {isSubmittingPayment ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitPaymentBtnText}>
                    Confirm & Record Payment ✓
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.roles.shop,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  recordPaymentBtn: {
    backgroundColor: Colors.status.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  recordPaymentBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bannerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.status.warning,
    letterSpacing: 1,
    marginBottom: 4,
  },
  bannerTotal: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text.primary,
  },
  bannerDesc: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 4,
  },
  bannerIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bannerIcon: {
    fontSize: 26,
  },
  patientChipsSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  patientChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  patientChipActive: {
    backgroundColor: Colors.roles.shopBackground,
    borderColor: Colors.roles.shop,
  },
  chipText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.roles.shop,
    fontWeight: '700',
  },
  activePatientCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.roles.shop,
    gap: 14,
  },
  activePatientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activePatientName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  activePatientPhone: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  payNowBtn: {
    backgroundColor: Colors.status.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  patientStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.text.muted,
    marginBottom: 4,
  },
  statValCredit: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.status.warning,
  },
  statValPayment: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.status.success,
  },
  statValDue: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.text.primary,
  },
  entriesSection: {
    gap: 10,
  },
  entriesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  entryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryIcon: {
    fontSize: 18,
  },
  entryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryPatient: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  entryAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  amountCredit: {
    color: Colors.status.warning,
  },
  amountPayment: {
    color: Colors.status.success,
  },
  entryDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  entryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  entryDate: {
    fontSize: 10,
    color: Colors.text.muted,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  typePillCredit: {
    backgroundColor: Colors.status.warningBackground,
  },
  typePillPayment: {
    backgroundColor: Colors.status.successBackground,
  },
  typePillCreditText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.status.warning,
  },
  typePillPaymentText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.status.success,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  errorEmoji: {
    fontSize: 28,
  },
  errorText: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  retryBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  retryText: {
    color: Colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalText: {
    color: Colors.text.muted,
    fontWeight: '800',
    fontSize: 14,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
    marginBottom: 6,
  },
  selectedPatientBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.roles.shop,
    borderRadius: 10,
    padding: 12,
  },
  selectedPatientText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  changePatientText: {
    fontSize: 12,
    color: Colors.roles.shop,
    fontWeight: '600',
  },
  lookupContainer: {
    gap: 6,
  },
  lookupInputWrapper: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 13,
  },
  lookupButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  lookupButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  errorSubText: {
    fontSize: 11,
    color: Colors.status.error,
  },
  errorBox: {
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  errorBoxText: {
    fontSize: 12,
    color: Colors.status.error,
  },
  submitPaymentBtn: {
    marginTop: 20,
    backgroundColor: Colors.status.success,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitPaymentBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
