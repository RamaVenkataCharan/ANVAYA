import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Role, VerificationStatus } from '@anvaya/shared';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';

export default function PendingVerificationScreen() {
  const { user, role, refreshMe, logout } = useAuthStore();
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatusMessage(null);
    try {
      const updatedUser = await refreshMe();
      if (!updatedUser) {
        setStatusMessage('Unable to connect to verification service.');
        return;
      }

      let freshStatus: VerificationStatus | undefined;
      if (updatedUser.role === Role.DOCTOR) {
        freshStatus = updatedUser.doctorProfile?.verificationStatus;
      } else if (updatedUser.role === Role.SHOP) {
        freshStatus = updatedUser.shopProfile?.verificationStatus;
      }

      if (freshStatus === VerificationStatus.APPROVED) {
        setStatusMessage('🎉 Your account has been verified! Redirecting...');
        // app/_layout.tsx will react to verificationStatus change and route to dashboard
      } else if (freshStatus === VerificationStatus.REJECTED) {
        const reason =
          updatedUser.doctorProfile?.rejectionReason ||
          updatedUser.shopProfile?.rejectionReason ||
          'Verification was declined.';
        setStatusMessage(`Verification rejected: ${reason}`);
      } else {
        setStatusMessage('Your credentials are still under review. Please check back shortly.');
      }
    } catch (err: any) {
      setStatusMessage('Failed to check status. Please check your network connection.');
    } finally {
      setIsChecking(false);
    }
  };

  const regOrLicense =
    role === Role.DOCTOR
      ? user?.doctorProfile?.registrationNo
      : user?.shopProfile?.licenseNo;

  const roleName = role === Role.DOCTOR ? 'Medical Doctor' : 'Pharmacy / Shop';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⏳</Text>
        </View>

        <Text style={styles.title}>Credential Review</Text>
        <Text style={styles.subtitle}>
          Your professional registration is pending administrative review
        </Text>

        {/* Verification Status Card */}
        <View style={styles.card}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>PENDING VERIFICATION</Text>
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>{roleName}</Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Identifier</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>

          {regOrLicense && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {role === Role.DOCTOR ? 'Registration No.' : 'Drug License No.'}
              </Text>
              <Text style={styles.infoValueHighlight}>{regOrLicense}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Status</Text>
            <Text style={styles.statusValuePending}>Under Clinical Review</Text>
          </View>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeIcon}>ℹ️</Text>
            <Text style={styles.noticeText}>
              In accordance with national healthcare compliance, doctor and pharmacy
              credentials must be verified by an administrator before issuing or
              dispensing electronic prescriptions.
            </Text>
          </View>

          {/* Feedback message */}
          {statusMessage && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{statusMessage}</Text>
            </View>
          )}

          {/* Refresh Action */}
          <TouchableOpacity
            style={[styles.checkButton, isChecking && styles.buttonDisabled]}
            onPress={handleCheckStatus}
            disabled={isChecking}
            activeOpacity={0.8}
          >
            {isChecking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.checkButtonText}>🔄 Check Verification Status</Text>
            )}
          </TouchableOpacity>

          {/* Logout Action */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => logout()}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.status.warningBackground,
    borderWidth: 1.5,
    borderColor: Colors.status.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 24,
    lineHeight: 20,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.status.warningBackground,
    borderColor: Colors.status.warning,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.status.warning,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.status.warning,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  infoValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  statusValuePending: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.status.warning,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  noticeIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 17,
  },
  messageBox: {
    backgroundColor: Colors.status.infoBackground,
    borderColor: Colors.status.info,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 13,
    color: '#BAE6FD',
    textAlign: 'center',
  },
  checkButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutButtonText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
