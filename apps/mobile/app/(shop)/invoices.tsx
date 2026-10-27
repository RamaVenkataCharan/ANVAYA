import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { api } from '../../services/api';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth';
import { escapeHtml } from '@anvaya/shared';

interface ShopInvoiceMedicineItem {
  id?: string;
  medicine: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ShopInvoiceItem {
  id: string;
  billNumber: string;
  patientId?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
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
  items?: ShopInvoiceMedicineItem[];
}

export default function ShopInvoicesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const shop = user?.shopProfile;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<ShopInvoiceItem | null>(null);
  const [isSharingPdf, setIsSharingPdf] = useState(false);

  // Fetch bills
  const {
    data: bills = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<ShopInvoiceItem[]>({
    queryKey: ['bills'],
    queryFn: async () => {
      const response = await api.get('/billing/bills');
      return response.data?.data || [];
    },
  });

  const filteredBills = bills.filter((b: ShopInvoiceItem) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const matchNumber = b.billNumber?.toLowerCase().includes(query);
    const matchPatient = b.patient?.user?.name?.toLowerCase().includes(query);
    const matchMethod = b.paymentMethod?.toLowerCase().includes(query);
    return Boolean(matchNumber || matchPatient || matchMethod);
  });

  // Share PDF generator
  const handleShareInvoicePdf = async (invoice: ShopInvoiceItem) => {
    try {
      setIsSharingPdf(true);
      const itemsHtml = (invoice.items || [])
        .map(
          (item: ShopInvoiceMedicineItem) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${escapeHtml(item.medicine)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px;">${escapeHtml(item.quantity)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px;">₹${escapeHtml(item.unitPrice)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 13px;">₹${escapeHtml(item.totalPrice)}</td>
          </tr>
        `
        )
        .join('');

      const patientName = escapeHtml(invoice.patient?.user?.name || 'Walk-in Customer');
      const patientPhone = escapeHtml(invoice.patient?.user?.phone || 'N/A');
      const shopName = escapeHtml(shop?.shopName || 'ANVAYA Pharmacy');
      const shopLicense = escapeHtml(shop?.licenseNo || 'DL-ANV-RETAIL');
      const shopAddress = escapeHtml(shop?.address || 'Healthcare Partner');
      const billNumber = escapeHtml(invoice.billNumber);
      const paymentMethod = escapeHtml(invoice.paymentMethod);
      const paymentStatus = escapeHtml(invoice.paymentStatus);
      const invoiceNotes = invoice.notes ? escapeHtml(invoice.notes) : '';
      const subtotal = escapeHtml(invoice.subtotal);
      const tax = escapeHtml(invoice.tax);
      const total = escapeHtml(invoice.total);
      const formattedDate = escapeHtml(
        new Date(invoice.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Tax Invoice - ${invoice.billNumber}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 30px;
                color: #1e293b;
                background-color: #ffffff;
              }
              .header {
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 15px;
                margin-bottom: 20px;
              }
              .pharmacy-title {
                font-size: 24px;
                font-weight: 800;
                color: #1e293b;
                margin: 0 0 4px 0;
              }
              .pharmacy-sub {
                font-size: 12px;
                color: #64748b;
                margin: 2px 0;
              }
              .invoice-tag {
                text-align: right;
              }
              .invoice-number {
                font-size: 18px;
                font-weight: 800;
                color: #2563eb;
                margin: 0 0 4px 0;
              }
              .meta-box {
                display: flex;
                justify-content: space-between;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 14px;
                margin-bottom: 24px;
                font-size: 13px;
              }
              .table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 24px;
              }
              .th {
                background: #f1f5f9;
                padding: 10px;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #475569;
                border-bottom: 2px solid #cbd5e1;
              }
              .totals-section {
                width: 45%;
                margin-left: auto;
                margin-bottom: 30px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                font-size: 14px;
              }
              .grand-total {
                border-top: 2px solid #0f172a;
                font-weight: 800;
                font-size: 18px;
                color: #0f172a;
                padding-top: 8px;
                margin-top: 6px;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px dashed #cbd5e1;
                text-align: center;
                font-size: 11px;
                color: #94a3b8;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1 class="pharmacy-title">${shopName}</h1>
                <p class="pharmacy-sub">Drug License: ${shopLicense}</p>
                <p class="pharmacy-sub">${shopAddress}</p>
              </div>
              <div class="invoice-tag">
                <h2 class="invoice-number">${billNumber}</h2>
                <p class="pharmacy-sub">Date: ${formattedDate}</p>
                <p class="pharmacy-sub">Method: <strong>${paymentMethod}</strong></p>
              </div>
            </div>

            <div class="meta-box">
              <div>
                <strong>Billed To:</strong><br />
                <span>${patientName}</span><br />
                <span style="color: #64748b;">Phone: ${patientPhone}</span>
              </div>
              <div>
                <strong>Status:</strong> ${paymentStatus}<br />
                ${invoiceNotes ? `<span style="color: #64748b;">Note: ${invoiceNotes}</span>` : ''}
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th class="th" style="text-align: left;">Item / Medicine</th>
                  <th class="th" style="text-align: center;">Qty</th>
                  <th class="th" style="text-align: right;">Unit Price</th>
                  <th class="th" style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>₹${subtotal}</span>
              </div>
              ${
                invoice.tax > 0
                  ? `<div class="total-row"><span>GST / Tax:</span><span>₹${tax}</span></div>`
                  : ''
              }
              <div class="total-row grand-total">
                <span>Grand Total:</span>
                <span>₹${total}</span>
              </div>
            </div>

            <div class="footer">
              <p>Verified electronically via ANVAYA Unified Digital Health Platform.</p>
              <p>Thank you for choosing ${shopName}!</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Share Invoice ${invoice.billNumber}`,
        });
      } else {
        Alert.alert('Notice', 'PDF sharing is not available on this platform.');
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      Alert.alert('Sharing Failed', errorObj.message || 'Could not generate invoice PDF.');
    } finally {
      setIsSharingPdf(false);
    }
  };

  const renderInvoiceItem = ({ item }: { item: ShopInvoiceItem }) => {
    const isCredit = item.paymentMethod === 'KHATA_CREDIT';
    const isPaid = item.paymentStatus === 'PAID';
    const formattedDate = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.invoiceCard}
        onPress={() => setSelectedInvoice(item)}
        activeOpacity={0.8}
      >
        <View style={styles.invoiceHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.billNumber}>{item.billNumber}</Text>
            <Text style={styles.billDate}>{formattedDate}</Text>
          </View>
          <View
            style={[
              styles.statusPill,
              isCredit
                ? styles.statusPillCredit
                : isPaid
                ? styles.statusPillPaid
                : styles.statusPillPending,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isCredit
                  ? styles.statusPillCreditText
                  : isPaid
                  ? styles.statusPillPaidText
                  : styles.statusPillPendingText,
              ]}
            >
              {isCredit ? 'Khata Credit' : item.paymentMethod}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceDetailRow}>
          <Text style={styles.patientName}>
            👤 {item.patient?.user?.name || 'Walk-in Customer'}
          </Text>
          <Text style={styles.billTotal}>₹{item.total}</Text>
        </View>

        <View style={styles.invoiceFooterRow}>
          <Text style={styles.itemsCount}>
            {item.items?.length || 0} item{item.items?.length === 1 ? '' : 's'}
          </Text>
          <TouchableOpacity
            style={styles.quickShareBtn}
            onPress={(e) => {
              e.stopPropagation();
              handleShareInvoicePdf(item);
            }}
            disabled={isSharingPdf}
          >
            <Text style={styles.quickShareText}>Share PDF 📤</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>ACCOUNTING & BILLS</Text>
          <Text style={styles.headerTitle}>Invoices</Text>
        </View>
        <TouchableOpacity
          style={styles.createBillNavBtn}
          onPress={() => router.push('/(shop)/billing')}
          activeOpacity={0.8}
        >
          <Text style={styles.createBillNavBtnText}>+ New Bill</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by invoice #, customer name, method..."
          placeholderTextColor={Colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Invoices List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.roles.shop} size="large" />
          <Text style={styles.loadingText}>Loading pharmacy invoices...</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not load invoices</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🧾</Text>
          <Text style={styles.emptyTitle}>No Invoices Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'No bills match your current search query.'
              : 'Create your first bill to record medication sales and generate receipts.'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push('/(shop)/billing')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionText}>Start Billing →</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoiceItem}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}

      {/* DETAIL MODAL */}
      <Modal
        visible={!!selectedInvoice}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedInvoice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedInvoice?.billNumber}
                </Text>
                <Text style={styles.modalSubtitle}>Invoice Details</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedInvoice(null)}
                style={styles.closeModalBtn}
              >
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {selectedInvoice && (
                <>
                  <View style={styles.modalMetaCard}>
                    <View style={styles.modalMetaRow}>
                      <Text style={styles.metaLabel}>Customer</Text>
                      <Text style={styles.metaValue}>
                        {selectedInvoice.patient?.user?.name || 'Walk-in Customer'}
                      </Text>
                    </View>
                    <View style={styles.modalMetaRow}>
                      <Text style={styles.metaLabel}>Payment Mode</Text>
                      <Text style={styles.metaValueHighlight}>
                        {selectedInvoice.paymentMethod}
                      </Text>
                    </View>
                    <View style={styles.modalMetaRow}>
                      <Text style={styles.metaLabel}>Payment Status</Text>
                      <Text
                        style={[
                          styles.metaValue,
                          {
                            color:
                              selectedInvoice.paymentStatus === 'PAID'
                                ? Colors.status.success
                                : Colors.status.warning,
                            fontWeight: '800',
                          },
                        ]}
                      >
                        {selectedInvoice.paymentStatus}
                      </Text>
                    </View>
                    <View style={styles.modalMetaRow}>
                      <Text style={styles.metaLabel}>Date Issued</Text>
                      <Text style={styles.metaValue}>
                        {new Date(selectedInvoice.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    {selectedInvoice.notes && (
                      <View style={styles.modalMetaRow}>
                        <Text style={styles.metaLabel}>Notes</Text>
                        <Text style={styles.metaValue}>
                          {selectedInvoice.notes}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.modalSectionTitle}>Items Billed</Text>
                  {selectedInvoice.items?.map((item: ShopInvoiceMedicineItem, i: number) => (
                    <View key={i} style={styles.modalItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalItemName}>{item.medicine}</Text>
                        <Text style={styles.modalItemSub}>
                          {item.quantity} × ₹{item.unitPrice}
                        </Text>
                      </View>
                      <Text style={styles.modalItemTotal}>
                        ₹{item.totalPrice}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.divider} />

                  <View style={styles.modalMetaRow}>
                    <Text style={styles.metaLabel}>Subtotal</Text>
                    <Text style={styles.metaValue}>₹{selectedInvoice.subtotal}</Text>
                  </View>
                  {selectedInvoice.tax > 0 && (
                    <View style={styles.modalMetaRow}>
                      <Text style={styles.metaLabel}>Tax</Text>
                      <Text style={styles.metaValue}>₹{selectedInvoice.tax}</Text>
                    </View>
                  )}
                  <View style={[styles.modalMetaRow, { marginTop: 8 }]}>
                    <Text style={styles.modalGrandLabel}>Grand Total</Text>
                    <Text style={styles.modalGrandValue}>
                      ₹{selectedInvoice.total}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalShareBtn}
                    onPress={() => handleShareInvoicePdf(selectedInvoice)}
                    disabled={isSharingPdf}
                    activeOpacity={0.8}
                  >
                    {isSharingPdf ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalShareBtnText}>
                        Generate & Share PDF 📤
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
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
    marginBottom: 14,
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
  createBillNavBtn: {
    backgroundColor: Colors.roles.shop,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBillNavBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: 13,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 28,
    padding: 6,
  },
  clearSearchText: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
    paddingBottom: 40,
  },
  invoiceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  invoiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  billDate: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillPaid: {
    backgroundColor: Colors.status.successBackground,
    borderColor: Colors.status.success,
    borderWidth: 1,
  },
  statusPillPaidText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.status.success,
  },
  statusPillCredit: {
    backgroundColor: Colors.status.warningBackground,
    borderColor: Colors.status.warning,
    borderWidth: 1,
  },
  statusPillCreditText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.status.warning,
  },
  statusPillPending: {
    backgroundColor: Colors.status.infoBackground,
    borderColor: Colors.status.info,
    borderWidth: 1,
  },
  statusPillPendingText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.status.info,
  },
  invoiceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  billTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.roles.shop,
  },
  invoiceFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  itemsCount: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  quickShareBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickShareText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  errorEmoji: {
    fontSize: 32,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  retryBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryBtnText: {
    color: Colors.primaryLight,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 12,
    backgroundColor: Colors.roles.shop,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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
    maxHeight: '85%',
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
    gap: 14,
  },
  modalMetaCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  metaValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.roles.shop,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 6,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalItemSub: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  modalItemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  modalGrandLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  modalGrandValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.roles.shop,
  },
  modalShareBtn: {
    marginTop: 16,
    backgroundColor: Colors.roles.shop,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalShareBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
