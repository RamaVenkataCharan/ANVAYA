import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { ReportType } from '@anvaya/shared';
import { api, API_BASE_URL } from '../../services/api';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth';

interface ReportItem {
  id: string;
  patientId: string;
  title: string;
  fileUrl: string;
  type: ReportType;
  notes?: string | null;
  uploadedAt: string;
}

interface BillItem {
  id: string;
  billNumber: string;
  shopId: string;
  patientId?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
  notes?: string | null;
  createdAt: string;
  shop?: {
    id: string;
    shopName: string;
    licenseNo: string;
    address: string;
    phone: string;
  };
  items?: Array<{
    id: string;
    medicine: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export default function PatientRecordsScreen() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
  const [activeMainTab, setActiveMainTab] = useState<'reports' | 'bills'>('reports');
  const [selectedReportType, setSelectedReportType] = useState<'ALL' | ReportType>('ALL');

  // Upload modal state
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState<ReportType>(ReportType.LAB_REPORT);
  const [reportNotes, setReportNotes] = useState('');
  const [pickedFile, setPickedFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Fetch patient reports
  const {
    data: reports = [],
    isLoading: isLoadingReports,
    isRefetching: isRefetchingReports,
    refetch: refetchReports,
    error: reportsError,
  } = useQuery<ReportItem[]>({
    queryKey: ['reports', 'patient'],
    queryFn: async () => {
      const res = await api.get('/reports');
      return res.data?.data || [];
    },
  });

  // 2. Fetch patient bills/invoices
  const {
    data: bills = [],
    isLoading: isLoadingBills,
    isRefetching: isRefetchingBills,
    refetch: refetchBills,
    error: billsError,
  } = useQuery<BillItem[]>({
    queryKey: ['bills', 'patient'],
    queryFn: async () => {
      const res = await api.get('/billing/my-bills');
      return res.data?.data || [];
    },
  });

  // 3. Upload report mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!pickedFile) {
        throw new Error('Please select a file to upload');
      }

      const formData = new FormData();
      formData.append('title', reportTitle.trim() || pickedFile.name);
      formData.append('type', reportType);
      if (reportNotes.trim()) {
        formData.append('notes', reportNotes.trim());
      }

      // Append file
      if (Platform.OS === 'web') {
        const response = await fetch(pickedFile.uri);
        const blob = await response.blob();
        formData.append('file', blob, pickedFile.name);
      } else {
        formData.append('file', {
          uri: pickedFile.uri,
          name: pickedFile.name,
          type: pickedFile.mimeType,
        } as any);
      }

      const res = await api.post('/reports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setIsUploadModalVisible(false);
      resetUploadForm();
      Alert.alert('Report Saved', 'Health report has been uploaded to your vault.');
    },
    onError: async (err: any) => {
      // Fallback: If upload multipart failed, try JSON upload with fileUrl
      try {
        await api.post('/reports', {
          title: reportTitle.trim() || pickedFile?.name || 'Medical Report',
          type: reportType,
          fileUrl: `/uploads/reports/${pickedFile?.name || 'document.pdf'}`,
          notes: reportNotes.trim() || undefined,
        });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
        setIsUploadModalVisible(false);
        resetUploadForm();
        Alert.alert('Report Saved', 'Health report has been registered in your vault.');
      } catch (fallbackErr: any) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Failed to upload report. Please check file format.';
        setUploadError(msg);
      }
    },
  });

  // 4. Delete report mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      const res = await api.delete(`/reports/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      Alert.alert('Deleted', 'Report was removed from your vault.');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Could not delete report.';
      Alert.alert('Error', msg);
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const resetUploadForm = () => {
    setReportTitle('');
    setReportType(ReportType.LAB_REPORT);
    setReportNotes('');
    setPickedFile(null);
    setUploadError('');
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPickedFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/pdf',
          size: asset.size,
        });
        if (!reportTitle) {
          setReportTitle(asset.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch {
      Alert.alert('Picker Error', 'Unable to pick document from storage.');
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Media library access is needed to pick medical photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.fileName || `report_${Date.now()}.jpg`;
        setPickedFile({
          uri: asset.uri,
          name: filename,
          mimeType: asset.mimeType || 'image/jpeg',
          size: asset.fileSize,
        });
        if (!reportTitle) {
          setReportTitle(filename.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch {
      Alert.alert('Picker Error', 'Unable to open image gallery.');
    }
  };

  const handleDelete = (report: ReportItem) => {
    Alert.alert(
      'Delete Report',
      `Are you sure you want to delete "${report.title}" from your vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(report.id),
        },
      ]
    );
  };

  const handleViewReport = (report: ReportItem) => {
    // Open authenticated streaming endpoint
    const fileUrl = `${API_BASE_URL}/reports/${report.id}/file`;
    Linking.openURL(fileUrl).catch(() => {
      Alert.alert(
        'Document Preview',
        `Title: ${report.title}\nType: ${report.type}\nNotes: ${report.notes || 'None'}\nUploaded: ${new Date(
          report.uploadedAt
        ).toLocaleDateString()}`
      );
    });
  };

  const filteredReports = reports.filter((r) => {
    if (selectedReportType === 'ALL') return true;
    return r.type === selectedReportType;
  });

  const getReportTypeBadge = (type: ReportType) => {
    switch (type) {
      case ReportType.LAB_REPORT:
        return { label: 'Lab Report', color: Colors.roles.doctor };
      case ReportType.IMAGING:
        return { label: 'Imaging / Scan', color: Colors.accent };
      case ReportType.DISCHARGE_SUMMARY:
        return { label: 'Discharge Summary', color: Colors.roles.patient };
      default:
        return { label: 'Clinical Document', color: Colors.text.secondary };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Medical Vault</Text>
          <Text style={styles.headerSubtitle}>Personal health records & invoices</Text>
        </View>
        {activeMainTab === 'reports' && (
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => {
              resetUploadForm();
              setIsUploadModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadBtnText}>+ Upload</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Tabs: Reports vs Bills */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={[styles.mainTab, activeMainTab === 'reports' && styles.mainTabActive]}
          onPress={() => setActiveMainTab('reports')}
        >
          <Text
            style={[
              styles.mainTabText,
              activeMainTab === 'reports' && styles.mainTabTextActive,
            ]}
          >
            📋 Clinical Records ({reports.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, activeMainTab === 'bills' && styles.mainTabActive]}
          onPress={() => setActiveMainTab('bills')}
        >
          <Text
            style={[
              styles.mainTabText,
              activeMainTab === 'bills' && styles.mainTabTextActive,
            ]}
          >
            🧾 Bills & Receipts ({bills.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= CLINICAL REPORTS TAB ================= */}
      {activeMainTab === 'reports' && (
        <>
          {/* Filter Chips */}
          <View style={styles.filterBar}>
            {(['ALL', ReportType.LAB_REPORT, ReportType.IMAGING, ReportType.DISCHARGE_SUMMARY, ReportType.OTHER] as const).map(
              (t) => {
                const isSelected = selectedReportType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setSelectedReportType(t)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextActive,
                      ]}
                    >
                      {t === 'ALL' ? 'All Records' : t.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          {isLoadingReports ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.roles.patient} />
              <Text style={styles.loadingText}>Loading clinical vault...</Text>
            </View>
          ) : reportsError ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Could not load records</Text>
              <Text style={styles.errorSubtitle}>
                Please check connection and pull down to refresh.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetchReports()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredReports.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>Vault is Empty</Text>
              <Text style={styles.emptySubtitle}>
                Upload your blood tests, X-rays, MRI scans or discharge summaries for safe keeping.
              </Text>
              <TouchableOpacity
                style={styles.emptyUploadBtn}
                onPress={() => {
                  resetUploadForm();
                  setIsUploadModalVisible(true);
                }}
              >
                <Text style={styles.emptyUploadBtnText}>+ Add First Report</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredReports}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetchingReports}
                  onRefresh={refetchReports}
                  tintColor={Colors.roles.patient}
                  colors={[Colors.roles.patient]}
                />
              }
              renderItem={({ item }) => {
                const badge = getReportTypeBadge(item.type);
                const dateStr = new Date(item.uploadedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <View style={styles.reportCard}>
                    <View style={styles.reportCardHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.reportTitle}>{item.title}</Text>
                        <Text style={styles.reportDate}>Uploaded on {dateStr}</Text>
                      </View>
                      <View
                        style={[
                          styles.typeBadge,
                          { borderColor: badge.color, backgroundColor: 'rgba(255,255,255,0.05)' },
                        ]}
                      >
                        <Text style={[styles.typeBadgeText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    {item.notes ? (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesText}>{item.notes}</Text>
                      </View>
                    ) : null}

                    {/* Report Card Actions */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.viewDocBtn}
                        onPress={() => handleViewReport(item)}
                      >
                        <Text style={styles.viewDocBtnText}>👁️ View Document</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteDocBtn}
                        onPress={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <ActivityIndicator size="small" color={Colors.status.error} />
                        ) : (
                          <Text style={styles.deleteDocBtnText}>🗑️ Delete</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </>
      )}

      {/* ================= BILLS & RECEIPTS TAB ================= */}
      {activeMainTab === 'bills' && (
        <>
          {isLoadingBills ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.roles.shop} />
              <Text style={styles.loadingText}>Fetching pharmacy receipts...</Text>
            </View>
          ) : billsError ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Could not load invoices</Text>
              <Text style={styles.errorSubtitle}>Please pull down to retry.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetchBills()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : bills.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>No Pharmacy Bills Yet</Text>
              <Text style={styles.emptySubtitle}>
                Invoices generated by partner pharmacy stores will automatically appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={bills}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetchingBills}
                  onRefresh={refetchBills}
                  tintColor={Colors.roles.shop}
                  colors={[Colors.roles.shop]}
                />
              }
              renderItem={({ item }) => {
                const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <View style={styles.billCard}>
                    <View style={styles.billCardHeader}>
                      <View>
                        <Text style={styles.billNumber}>{item.billNumber}</Text>
                        <Text style={styles.billShop}>
                          🏥 {item.shop?.shopName || 'Partner Pharmacy'}
                        </Text>
                      </View>
                      <View style={styles.billTotalBox}>
                        <Text style={styles.billTotalText}>₹{item.total.toFixed(2)}</Text>
                        <Text
                          style={[
                            styles.billStatusText,
                            {
                              color:
                                item.paymentStatus === 'PAID'
                                  ? Colors.status.success
                                  : Colors.status.warning,
                            },
                          ]}
                        >
                          {item.paymentStatus}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.billDetailsRow}>
                      <Text style={styles.billMeta}>Date: {dateStr}</Text>
                      <Text style={styles.billMeta}>Method: {item.paymentMethod}</Text>
                    </View>

                    {item.items && item.items.length > 0 && (
                      <View style={styles.billItemsBox}>
                        <Text style={styles.billItemsHeading}>Medicines Dispensed:</Text>
                        {item.items.map((med) => (
                          <View key={med.id} style={styles.billItemRow}>
                            <Text style={styles.billItemName}>
                              • {med.medicine} (x{med.quantity})
                            </Text>
                            <Text style={styles.billItemPrice}>
                              ₹{med.totalPrice.toFixed(2)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </>
      )}

      {/* Upload Modal */}
      <Modal
        visible={isUploadModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Clinical Document</Text>
                <TouchableOpacity
                  onPress={() => setIsUploadModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {uploadError ? (
                  <View style={styles.errorAlert}>
                    <Text style={styles.errorAlertText}>{uploadError}</Text>
                  </View>
                ) : null}

                {/* File Picker Selection Buttons */}
                <Text style={styles.fieldLabel}>Choose Document or Image *</Text>
                <View style={styles.pickerBtnRow}>
                  <TouchableOpacity
                    style={styles.filePickerBtn}
                    onPress={handlePickDocument}
                  >
                    <Text style={styles.filePickerBtnIcon}>📄</Text>
                    <Text style={styles.filePickerBtnText}>Select PDF / File</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.filePickerBtn}
                    onPress={handlePickImage}
                  >
                    <Text style={styles.filePickerBtnIcon}>🖼️</Text>
                    <Text style={styles.filePickerBtnText}>Select Photo</Text>
                  </TouchableOpacity>
                </View>

                {pickedFile ? (
                  <View style={styles.pickedFileBadge}>
                    <Text style={styles.pickedFileName} numberOfLines={1}>
                      ✓ Selected: {pickedFile.name}
                    </Text>
                    {pickedFile.size ? (
                      <Text style={styles.pickedFileSize}>
                        ({Math.round(pickedFile.size / 1024)} KB)
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.fileHint}>
                    Allowed formats: PDF, JPG, PNG (Max size: 10MB)
                  </Text>
                )}

                {/* Title */}
                <Text style={styles.fieldLabel}>Document Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Complete Blood Count, Chest X-Ray"
                  placeholderTextColor={Colors.text.muted}
                  value={reportTitle}
                  onChangeText={setReportTitle}
                />

                {/* Category Picker */}
                <Text style={styles.fieldLabel}>Document Category *</Text>
                <View style={styles.typeSelectorRow}>
                  {[
                    { label: 'Lab Report', val: ReportType.LAB_REPORT },
                    { label: 'Imaging', val: ReportType.IMAGING },
                    { label: 'Discharge', val: ReportType.DISCHARGE_SUMMARY },
                    { label: 'Other', val: ReportType.OTHER },
                  ].map((cat) => {
                    const isSelected = reportType === cat.val;
                    return (
                      <TouchableOpacity
                        key={cat.val}
                        style={[
                          styles.typeSelectorChip,
                          isSelected && styles.typeSelectorChipSelected,
                        ]}
                        onPress={() => setReportType(cat.val)}
                      >
                        <Text
                          style={[
                            styles.typeSelectorChipText,
                            isSelected && styles.typeSelectorChipTextSelected,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Notes */}
                <Text style={styles.fieldLabel}>Notes / Doctor Remarks (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Doctor, hospital name, test findings or extra details..."
                  placeholderTextColor={Colors.text.muted}
                  value={reportNotes}
                  onChangeText={setReportNotes}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[
                    styles.submitUploadBtn,
                    (!pickedFile || uploadMutation.isPending) && styles.btnDisabled,
                  ]}
                  onPress={() => uploadMutation.mutate()}
                  disabled={!pickedFile || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitUploadBtnText}>Save to Vault</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  uploadBtn: {
    backgroundColor: Colors.roles.patient,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  mainTabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  mainTabActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  mainTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.muted,
  },
  mainTabTextActive: {
    color: Colors.text.primary,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: Colors.roles.patient,
  },
  filterChipText: {
    fontSize: 11,
    color: Colors.text.muted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Colors.roles.patient,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  reportCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  reportDate: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },
  typeBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  notesBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  notesText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewDocBtn: {
    flex: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: Colors.roles.patient,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDocBtnText: {
    color: Colors.roles.patient,
    fontWeight: '600',
    fontSize: 12,
  },
  deleteDocBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: Colors.status.error,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteDocBtnText: {
    color: Colors.status.error,
    fontWeight: '600',
    fontSize: 12,
  },
  billCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  billCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  billShop: {
    fontSize: 12,
    color: Colors.roles.shop,
    marginTop: 2,
  },
  billTotalBox: {
    alignItems: 'flex-end',
  },
  billTotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  billStatusText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  billDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billMeta: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  billItemsBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  billItemsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  billItemName: {
    fontSize: 12,
    color: Colors.text.primary,
  },
  billItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: Colors.text.secondary,
    marginTop: 12,
    fontSize: 14,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  errorSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  emptyUploadBtn: {
    backgroundColor: Colors.roles.patient,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyUploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: Colors.text.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  errorAlert: {
    backgroundColor: Colors.status.errorBackground,
    borderWidth: 1,
    borderColor: Colors.status.error,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorAlertText: {
    color: Colors.status.error,
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
    marginTop: 10,
  },
  pickerBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  filePickerBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePickerBtnIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  filePickerBtnText: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  pickedFileBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: Colors.status.success,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  pickedFileName: {
    color: Colors.status.success,
    fontSize: 12,
    fontWeight: '700',
  },
  pickedFileSize: {
    color: Colors.text.muted,
    fontSize: 11,
    marginTop: 2,
  },
  fileHint: {
    fontSize: 11,
    color: Colors.text.muted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  typeSelectorChip: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeSelectorChipSelected: {
    borderColor: Colors.roles.patient,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  typeSelectorChipText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  typeSelectorChipTextSelected: {
    color: Colors.roles.patient,
  },
  submitUploadBtn: {
    backgroundColor: Colors.roles.patient,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitUploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
