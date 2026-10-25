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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
  PaymentStatus,
  BillItemInput,
  CreateBillInput,
} from '@anvaya/shared';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';

interface PatientLookupResult {
  id: string;
  name: string;
  age: number;
}

interface BillLineItem {
  id: string;
  medicine: string;
  quantity: string;
  unitPrice: string;
}

export default function ShopBillingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    prescriptionId?: string;
    patientId?: string;
    patientName?: string;
    patientPhone?: string;
  }>();

  // Patient state
  const [phone, setPhone] = useState(params.patientPhone || '');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [patient, setPatient] = useState<PatientLookupResult | null>(
    params.patientId
      ? {
          id: params.patientId,
          name: params.patientName || 'Linked Patient',
          age: 0,
        }
      : null
  );
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Line items state
  const [items, setItems] = useState<BillLineItem[]>([
    { id: '1', medicine: '', quantity: '1', unitPrice: '10' },
  ]);

  // Billing calculation states
  const [discountStr, setDiscountStr] = useState('0');
  const [taxPercentStr, setTaxPercentStr] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'KHATA_CREDIT'>('UPI');
  const [notes, setNotes] = useState('');

  // Submission & Results
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);

  // Prefill from prescription if prescriptionId is passed
  const { data: prescriptionData, isLoading: isLoadingPrescription } = useQuery({
    queryKey: ['prescription-for-bill', params.prescriptionId],
    queryFn: async () => {
      if (!params.prescriptionId) return null;
      const res = await api.get(`/prescriptions/${params.prescriptionId}`);
      return res.data?.data;
    },
    enabled: !!params.prescriptionId,
  });

  useEffect(() => {
    if (prescriptionData) {
      if (prescriptionData.patient?.user) {
        setPatient({
          id: prescriptionData.patientId,
          name: prescriptionData.patient.user.name,
          age: 0,
        });
        if (prescriptionData.patient.user.phone) {
          setPhone(prescriptionData.patient.user.phone);
        }
      }
      if (prescriptionData.items && prescriptionData.items.length > 0) {
        const mappedItems: BillLineItem[] = prescriptionData.items.map(
          (item: any, idx: number) => ({
            id: String(idx + 1),
            medicine: item.medicine,
            quantity: String(item.quantity || 1),
            unitPrice: '15', // reasonable default unit price for prefilled meds
          })
        );
        setItems(mappedItems);
      }
    }
  }, [prescriptionData]);

  // Patient Phone Lookup
  const handleLookupPatient = async () => {
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
    } catch (err: any) {
      setPatient(null);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'No patient found with this phone number.';
      setLookupError(msg);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Add / Remove / Change Line Items
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), medicine: '', quantity: '1', unitPrice: '10' },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      Alert.alert('Required', 'A bill must have at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof BillLineItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Calculations
  const calculatedItems = items.map((item) => {
    const q = Math.max(0, parseInt(item.quantity, 10) || 0);
    const p = Math.max(0, parseFloat(item.unitPrice) || 0);
    return {
      medicine: item.medicine.trim(),
      quantity: q,
      unitPrice: p,
      totalPrice: q * p,
    };
  });

  const subtotal = calculatedItems.reduce((acc, i) => acc + i.totalPrice, 0);
  const discount = Math.max(0, parseFloat(discountStr) || 0);
  const taxPercent = Math.max(0, parseFloat(taxPercentStr) || 0);
  const tax = Number(((Math.max(0, subtotal - discount) * taxPercent) / 100).toFixed(2));
  const grandTotal = Number(Math.max(0, subtotal - discount + tax).toFixed(2));

  // Submit Bill
  const handleSubmitBill = async () => {
    setSubmitError(null);

    // Validation checks
    if (paymentMethod === 'KHATA_CREDIT' && !patient?.id) {
      setSubmitError('Patient must be selected for Khata Credit transactions.');
      return;
    }

    const invalidItem = calculatedItems.find(
      (i) => !i.medicine || i.quantity <= 0 || i.unitPrice <= 0
    );
    if (invalidItem) {
      setSubmitError('Please ensure all items have a name, quantity > 0, and unit price > 0.');
      return;
    }

    if (grandTotal <= 0) {
      setSubmitError('Grand total must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateBillInput = {
        patientId: patient?.id,
        prescriptionId: params.prescriptionId || undefined,
        items: calculatedItems.map((i) => ({
          medicine: i.medicine,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
        subtotal,
        tax,
        total: grandTotal,
        paymentStatus:
          paymentMethod === 'KHATA_CREDIT'
            ? PaymentStatus.PENDING
            : PaymentStatus.PAID,
        paymentMethod,
        notes: notes.trim() || undefined,
      };

      const response = await api.post('/billing/bills', payload);
      const invoiceData = response.data?.data;

      // Invalidate relevant queries
      await queryClient.invalidateQueries({ queryKey: ['bills'] });
      await queryClient.invalidateQueries({ queryKey: ['ledger'] });

      setCreatedInvoice(invoiceData);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to generate invoice. Please check the inputs.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCreatedInvoice(null);
    setPatient(null);
    setPhone('');
    setItems([{ id: '1', medicine: '', quantity: '1', unitPrice: '10' }]);
    setDiscountStr('0');
    setTaxPercentStr('0');
    setPaymentMethod('UPI');
    setNotes('');
    setSubmitError(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSubtitle}>POINT OF SALE</Text>
              <Text style={styles.headerTitle}>Pharmacy Billing</Text>
            </View>
            <TouchableOpacity
              style={styles.invoicesNavBtn}
              onPress={() => router.push('/(shop)/invoices')}
              activeOpacity={0.8}
            >
              <Text style={styles.invoicesNavBtnText}>Past Invoices 🧾</Text>
            </TouchableOpacity>
          </View>

          {/* Linked Prescription Banner */}
          {params.prescriptionId && (
            <View style={styles.prescriptionNotice}>
              <Text style={styles.noticeIcon}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.noticeTitle}>
                  Prefilled from Dispensed Prescription
                </Text>
                <Text style={styles.noticeDesc}>
                  Items and patient details automatically imported.
                </Text>
              </View>
              {isLoadingPrescription && (
                <ActivityIndicator color={Colors.roles.shop} size="small" />
              )}
            </View>
          )}

          {/* INVOICE SUCCESS MODAL / SUMMARY CARD */}
          {createdInvoice ? (
            <View style={styles.successCard}>
              <View style={styles.successHeader}>
                <View style={styles.successBadge}>
                  <Text style={styles.successBadgeText}>✓ INVOICE GENERATED</Text>
                </View>
                <Text style={styles.invoiceNumberText}>
                  {createdInvoice.billNumber}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Customer / Patient</Text>
                <Text style={styles.summaryValue}>
                  {createdInvoice.patient?.user?.name || patient?.name || 'Walk-in Customer'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Method</Text>
                <View style={styles.paymentMethodPill}>
                  <Text style={styles.paymentMethodText}>
                    {createdInvoice.paymentMethod}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Status</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        createdInvoice.paymentStatus === 'PAID'
                          ? Colors.status.success
                          : Colors.status.warning,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {createdInvoice.paymentStatus}
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Purchased Items</Text>
              {createdInvoice.items?.map((item: any, idx: number) => (
                <View key={idx} style={styles.invoiceItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceItemName}>{item.medicine}</Text>
                    <Text style={styles.invoiceItemSub}>
                      {item.quantity} × ₹{item.unitPrice}
                    </Text>
                  </View>
                  <Text style={styles.invoiceItemTotal}>₹{item.totalPrice}</Text>
                </View>
              ))}

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{createdInvoice.subtotal}</Text>
              </View>
              {createdInvoice.tax > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax</Text>
                  <Text style={styles.summaryValue}>₹{createdInvoice.tax}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, { marginTop: 6 }]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>₹{createdInvoice.total}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.successActions}>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => router.push('/(shop)/invoices')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionText}>View in Invoices & Share</Text>
                </TouchableOpacity>

                {createdInvoice.paymentMethod === 'KHATA_CREDIT' && (
                  <TouchableOpacity
                    style={styles.secondaryActionButton}
                    onPress={() => router.push('/(shop)/ledger')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryActionText}>
                      Open Khata Ledger 📖
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.tertiaryActionButton}
                  onPress={resetForm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tertiaryActionText}>+ Create New Bill</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Patient Selection Card */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Patient Selection</Text>
                  <Text style={styles.optionalBadge}>
                    {paymentMethod === 'KHATA_CREDIT' ? 'REQUIRED' : 'OPTIONAL'}
                  </Text>
                </View>
                <Text style={styles.cardSubtitle}>
                  Lookup by mobile number to attach to patient record or Khata credit.
                </Text>

                {patient ? (
                  <View style={styles.patientSelectedBox}>
                    <View style={styles.patientAvatar}>
                      <Text style={styles.avatarText}>👤</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>{patient.name}</Text>
                      <Text style={styles.patientMeta}>
                        ID: {patient.id.slice(0, 8)}... • Age: {patient.age || 'N/A'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setPatient(null);
                        setPhone('');
                      }}
                      style={styles.clearPatientBtn}
                    >
                      <Text style={styles.clearPatientText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.lookupContainer}>
                    <View style={styles.lookupInputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="Patient phone number"
                        placeholderTextColor={Colors.text.muted}
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                      />
                      <TouchableOpacity
                        style={styles.lookupButton}
                        onPress={handleLookupPatient}
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
                      <Text style={styles.errorText}>⚠️ {lookupError}</Text>
                    )}
                  </View>
                )}
              </View>

              {/* Line Items Card */}
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Bill Line Items</Text>
                  <TouchableOpacity
                    style={styles.addItemBtn}
                    onPress={handleAddItem}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addItemBtnText}>+ Add Medicine</Text>
                  </TouchableOpacity>
                </View>

                {items.map((item, index) => {
                  const qty = parseInt(item.quantity, 10) || 0;
                  const price = parseFloat(item.unitPrice) || 0;
                  const lineTotal = qty * price;

                  return (
                    <View key={item.id} style={styles.itemRowCard}>
                      <View style={styles.itemHeaderRow}>
                        <Text style={styles.itemIndexLabel}>Item #{index + 1}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveItem(item.id)}
                          style={styles.removeItemBtn}
                        >
                          <Text style={styles.removeItemText}>✕ Remove</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Medicine Name */}
                      <TextInput
                        style={styles.input}
                        placeholder="Medicine name (e.g. Paracetamol 500mg)"
                        placeholderTextColor={Colors.text.muted}
                        value={item.medicine}
                        onChangeText={(val) =>
                          handleItemChange(item.id, 'medicine', val)
                        }
                      />

                      {/* Quantity & Unit Price Row */}
                      <View style={styles.inputsRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>Quantity</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Qty"
                            placeholderTextColor={Colors.text.muted}
                            keyboardType="numeric"
                            value={item.quantity}
                            onChangeText={(val) =>
                              handleItemChange(item.id, 'quantity', val)
                            }
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>Unit Price (₹)</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Price"
                            placeholderTextColor={Colors.text.muted}
                            keyboardType="numeric"
                            value={item.unitPrice}
                            onChangeText={(val) =>
                              handleItemChange(item.id, 'unitPrice', val)
                            }
                          />
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                          <Text style={styles.fieldLabel}>Line Total</Text>
                          <Text style={styles.itemTotalVal}>₹{lineTotal.toFixed(2)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Payment Method Selector */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Payment Method</Text>
                <Text style={styles.cardSubtitle}>
                  Select settlement method or credit to customer khata ledger.
                </Text>

                <View style={styles.paymentMethodGrid}>
                  {(['UPI', 'CASH', 'CARD', 'KHATA_CREDIT'] as const).map((method) => {
                    const isSelected = paymentMethod === method;
                    const isCredit = method === 'KHATA_CREDIT';
                    return (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.methodChip,
                          isSelected && styles.methodChipActive,
                          isCredit && isSelected && styles.methodChipCreditActive,
                        ]}
                        onPress={() => setPaymentMethod(method)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.methodIcon}>
                          {method === 'UPI'
                            ? '📱'
                            : method === 'CASH'
                            ? '💵'
                            : method === 'CARD'
                            ? '💳'
                            : '📒'}
                        </Text>
                        <Text
                          style={[
                            styles.methodChipText,
                            isSelected && styles.methodChipTextActive,
                          ]}
                        >
                          {method === 'KHATA_CREDIT' ? 'Khata Credit' : method}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {paymentMethod === 'KHATA_CREDIT' && (
                  <View style={styles.creditWarningBox}>
                    <Text style={styles.warningIcon}>ℹ️</Text>
                    <Text style={styles.creditWarningText}>
                      Khata credit automatically creates a pending ledger entry under the
                      selected patient’s account.
                    </Text>
                  </View>
                )}
              </View>

              {/* Totals & Notes */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Bill Summary & Adjustments</Text>

                <View style={styles.totalsInputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Discount (₹)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={Colors.text.muted}
                      keyboardType="numeric"
                      value={discountStr}
                      onChangeText={setDiscountStr}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Tax (%)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={Colors.text.muted}
                      keyboardType="numeric"
                      value={taxPercentStr}
                      onChangeText={setTaxPercentStr}
                    />
                  </View>
                </View>

                <View style={styles.notesWrapper}>
                  <Text style={styles.fieldLabel}>Notes / Reference (Optional)</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 46 }]}
                    placeholder="e.g. UPI Ref #, Batch notes"
                    placeholderTextColor={Colors.text.muted}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                <View style={styles.divider} />

                {/* Calculation breakdown */}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Discount</Text>
                    <Text style={[styles.summaryValue, { color: Colors.status.success }]}>
                      -₹{discount.toFixed(2)}
                    </Text>
                  </View>
                )}
                {tax > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax ({taxPercent}%)</Text>
                    <Text style={styles.summaryValue}>₹{tax.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                  <Text style={styles.grandTotalLabel}>Net Payable Total</Text>
                  <Text style={styles.grandTotalValue}>₹{grandTotal.toFixed(2)}</Text>
                </View>
              </View>

              {/* Submit Error */}
              {submitError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>⚠️ {submitError}</Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitBill}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Generate Bill (₹{grandTotal.toFixed(2)}) →
                  </Text>
                )}
              </TouchableOpacity>
            </>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
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
  invoicesNavBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  invoicesNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.roles.shop,
  },
  prescriptionNotice: {
    flexDirection: 'row',
    backgroundColor: Colors.roles.shopBackground,
    borderColor: Colors.roles.shop,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  noticeIcon: {
    fontSize: 22,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  noticeDesc: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 12,
  },
  optionalBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text.muted,
    letterSpacing: 0.5,
  },
  patientSelectedBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.roles.shop,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.roles.shopBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  patientMeta: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  clearPatientBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
  },
  clearPatientText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  lookupContainer: {
    gap: 8,
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
  errorText: {
    fontSize: 11,
    color: Colors.status.error,
  },
  addItemBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addItemBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.roles.shop,
  },
  itemRowCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    gap: 8,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemIndexLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.muted,
  },
  removeItemBtn: {
    paddingVertical: 2,
  },
  removeItemText: {
    fontSize: 11,
    color: Colors.status.error,
    fontWeight: '600',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.muted,
    marginBottom: 4,
  },
  itemTotalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.roles.shop,
    marginTop: 6,
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: '45%',
    flex: 1,
  },
  methodChipActive: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryGlow,
  },
  methodChipCreditActive: {
    borderColor: Colors.status.warning,
    backgroundColor: Colors.status.warningBackground,
  },
  methodIcon: {
    fontSize: 16,
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  methodChipTextActive: {
    color: Colors.text.primary,
    fontWeight: '700',
  },
  creditWarningBox: {
    flexDirection: 'row',
    backgroundColor: Colors.status.warningBackground,
    borderColor: Colors.status.warning,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  warningIcon: {
    fontSize: 16,
  },
  creditWarningText: {
    fontSize: 11,
    color: Colors.status.warning,
    flex: 1,
    lineHeight: 15,
  },
  totalsInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  notesWrapper: {
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.roles.shop,
  },
  errorBox: {
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBoxText: {
    fontSize: 12,
    color: Colors.status.error,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.roles.shop,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.roles.shop,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Success Card
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.roles.shop,
  },
  successHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successBadge: {
    backgroundColor: Colors.status.successBackground,
    borderColor: Colors.status.success,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  successBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.status.success,
  },
  invoiceNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.roles.shop,
  },
  paymentMethodPill: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  invoiceItemSub: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  invoiceItemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  successActions: {
    gap: 10,
    marginTop: 20,
  },
  primaryActionButton: {
    backgroundColor: Colors.roles.shop,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionButton: {
    backgroundColor: Colors.status.warningBackground,
    borderColor: Colors.status.warning,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: Colors.status.warning,
    fontSize: 14,
    fontWeight: '700',
  },
  tertiaryActionButton: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tertiaryActionText: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
