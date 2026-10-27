import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { PrescriptionModel, PrescriptionStatus } from '@anvaya/shared';
import { api } from '../../../services/api';
import { Colors } from '../../../constants/colors';

export default function PrescriptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: prescription,
    isLoading,
    error,
    refetch,
  } = useQuery<PrescriptionModel>({
    queryKey: ['prescription', id],
    queryFn: async () => {
      const response = await api.get(`/prescriptions/${id}`);
      return response.data?.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator color={Colors.roles.patient} size="large" />
          <Text style={styles.loadingText}>Loading prescription details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !prescription) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>Prescription not found or inaccessible</Text>
          <TouchableOpacity style={[styles.backButton, { marginBottom: 12 }]} onPress={() => { void refetch(); }}>
            <Text style={styles.backButtonText}>🔄 Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isDispensed = prescription.status === PrescriptionStatus.DISPENSED;
  const isCancelled = prescription.status === PrescriptionStatus.CANCELLED;
  const isDimmed = isDispensed || isCancelled;

  const formattedIssuedDate = new Date(
    prescription.issuedAt || prescription.createdAt
  ).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedDispensedDate = prescription.dispensedAt
    ? new Date(prescription.dispensedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={Colors.roles.patient}
          />
        }
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backNavBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backNavText}>← Back to Wallet</Text>
          </TouchableOpacity>
          <View
            style={[
              styles.statusTag,
              isDispensed
                ? styles.statusTagDispensed
                : isCancelled
                ? styles.statusTagCancelled
                : styles.statusTagIssued,
            ]}
          >
            <Text
              style={[
                styles.statusTagText,
                isDispensed
                  ? styles.statusTextDispensed
                  : isCancelled
                  ? styles.statusTextCancelled
                  : styles.statusTextIssued,
              ]}
            >
              {prescription.status}
            </Text>
          </View>
        </View>

        {/* QR Code Presentation Box */}
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>Prescription QR Token</Text>
          <Text style={styles.qrSubtitle}>
            Present this code at any verified pharmacy to dispense your medications
          </Text>

          <View style={styles.qrWrapper}>
            <View style={[styles.qrCodeContainer, isDimmed && styles.qrDimmed]}>
              {/* Encodes the qrToken only as specified */}
              <QRCode
                value={prescription.qrToken}
                size={210}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>

            {/* Dispensed or Cancelled Overlay */}
            {isDispensed && (
              <View style={styles.overlayBanner}>
                <Text style={styles.overlayIcon}>✓</Text>
                <Text style={styles.overlayTitle}>ALREADY DISPENSED</Text>
                {formattedDispensedDate && (
                  <Text style={styles.overlaySubtitle}>
                    Fulfilled on {formattedDispensedDate}
                  </Text>
                )}
              </View>
            )}

            {isCancelled && (
              <View style={[styles.overlayBanner, styles.overlayBannerCancelled]}>
                <Text style={styles.overlayIcon}>✕</Text>
                <Text style={styles.overlayTitle}>PRESCRIPTION CANCELLED</Text>
                <Text style={styles.overlaySubtitle}>
                  This prescription is no longer valid
                </Text>
              </View>
            )}
          </View>

          {/* Human Readable Code underneath */}
          <View style={styles.humanCodeBox}>
            <Text style={styles.humanCodeLabel}>HUMAN-READABLE VERIFICATION CODE</Text>
            <Text style={styles.humanCodeText}>{prescription.code}</Text>
          </View>
        </View>

        {/* Doctor Information Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Prescribing Practitioner</Text>
          <View style={styles.doctorHeader}>
            <View style={styles.docAvatar}>
              <Text style={styles.docAvatarText}>🩺</Text>
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docName}>
                Dr. {prescription.doctor?.user?.name || 'Practitioner'}
              </Text>
              <Text style={styles.docSpecialization}>
                {prescription.doctor?.specialization || 'Clinical Specialist'}
              </Text>
              <Text style={styles.docReg}>
                Reg. No: {prescription.doctor?.registrationNo || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Clinic Address</Text>
            <Text style={styles.infoValue}>
              {prescription.doctor?.clinicAddress || 'Not specified'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Issued Date</Text>
            <Text style={styles.infoValue}>{formattedIssuedDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Diagnosis</Text>
            <Text style={styles.infoValueHighlight}>{prescription.diagnosis}</Text>
          </View>

          {prescription.notes && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Doctor's Advice</Text>
              <Text style={styles.infoValue}>{prescription.notes}</Text>
            </View>
          )}
        </View>

        {/* Dispensed Pharmacy Details (if dispensed) */}
        {prescription.shop && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>Dispensing Pharmacy</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pharmacy Name</Text>
              <Text style={styles.infoValue}>{prescription.shop.shopName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{prescription.shop.address}</Text>
            </View>
          </View>
        )}

        {/* Prescribed Medicines List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>
            Prescribed Medications ({prescription.items?.length || 0})
          </Text>

          {prescription.items?.map((item, index) => (
            <View key={item.id || index} style={styles.medItemCard}>
              <View style={styles.medHeaderRow}>
                <Text style={styles.medName}>{item.medicine}</Text>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>Qty: {item.quantity}</Text>
                </View>
              </View>

              <View style={styles.medDetailsGrid}>
                <View style={styles.medCol}>
                  <Text style={styles.medLabel}>Dosage</Text>
                  <Text style={styles.medVal}>{item.dosage}</Text>
                </View>
                <View style={styles.medCol}>
                  <Text style={styles.medLabel}>Frequency</Text>
                  <Text style={styles.medVal}>{item.frequency}</Text>
                </View>
                <View style={styles.medCol}>
                  <Text style={styles.medLabel}>Duration</Text>
                  <Text style={styles.medVal}>{item.duration}</Text>
                </View>
              </View>

              {item.instructions && (
                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionText}>
                    Note: {item.instructions}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
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
    padding: 18,
    paddingBottom: 48,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backNavBtn: {
    paddingVertical: 6,
  },
  backNavText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.roles.patient,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusTagIssued: {
    backgroundColor: Colors.status.warningBackground,
    borderColor: Colors.status.warning,
  },
  statusTagDispensed: {
    backgroundColor: Colors.status.successBackground,
    borderColor: Colors.status.success,
  },
  statusTagCancelled: {
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextIssued: {
    color: '#FBBF24',
  },
  statusTextDispensed: {
    color: '#34D399',
  },
  statusTextCancelled: {
    color: '#F87171',
  },
  qrCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  qrSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 17,
    marginBottom: 20,
  },
  qrWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
  },
  qrDimmed: {
    opacity: 0.18,
  },
  overlayBanner: {
    position: 'absolute',
    backgroundColor: 'rgba(6, 78, 59, 0.95)',
    borderWidth: 1.5,
    borderColor: Colors.status.success,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    maxWidth: 240,
  },
  overlayBannerCancelled: {
    backgroundColor: 'rgba(127, 29, 29, 0.95)',
    borderColor: Colors.status.error,
  },
  overlayIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '900',
    marginBottom: 2,
  },
  overlayTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  overlaySubtitle: {
    fontSize: 11,
    color: '#D1FAE5',
    marginTop: 2,
    textAlign: 'center',
  },
  humanCodeBox: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  humanCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.muted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  humanCodeText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primaryLight,
    letterSpacing: 1.5,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 14,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.roles.doctorBackground,
    borderWidth: 1,
    borderColor: Colors.roles.doctor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docAvatarText: {
    fontSize: 22,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  docSpecialization: {
    fontSize: 13,
    color: Colors.primaryLight,
  },
  docReg: {
    fontSize: 11,
    color: Colors.text.muted,
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
    maxWidth: '65%',
    textAlign: 'right',
  },
  infoValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  medItemCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  medHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  qtyBadge: {
    backgroundColor: Colors.roles.patientBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.roles.patient,
  },
  medDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  medCol: {
    flex: 1,
  },
  medLabel: {
    fontSize: 11,
    color: Colors.text.muted,
    marginBottom: 2,
  },
  medVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  instructionsBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  instructionText: {
    fontSize: 11,
    color: Colors.text.muted,
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.text.muted,
    fontSize: 13,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  errorText: {
    color: Colors.text.secondary,
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.roles.patient,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
