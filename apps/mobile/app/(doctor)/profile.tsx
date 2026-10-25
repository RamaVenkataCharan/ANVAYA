import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';

export default function DoctorProfileScreen() {
  const { user, logout } = useAuthStore();
  const doctor = user?.doctorProfile;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of ANVAYA?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Doctor Profile</Text>
          <Text style={styles.subtitle}>Verified Practitioner Account</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>🩺</Text>
          </View>
          <Text style={styles.userName}>Dr. {user?.name}</Text>
          <Text style={styles.specialization}>
            {doctor?.specialization || 'Clinical Practitioner'}
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ VERIFIED PRACTITIONER</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Medical Registration No.</Text>
            <Text style={styles.infoValueHighlight}>
              {doctor?.registrationNo || 'N/A'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Clinic Address</Text>
            <Text style={styles.infoValue}>
              {doctor?.clinicAddress || 'Not specified'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user?.phone}</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    paddingTop: 8,
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.roles.doctorBackground,
    borderWidth: 2,
    borderColor: Colors.roles.doctor,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 34,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  specialization: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  verifiedBadge: {
    backgroundColor: Colors.status.successBackground,
    borderColor: Colors.status.success,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.status.success,
    letterSpacing: 0.5,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  infoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  infoValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.status.error,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: Colors.status.error,
    fontSize: 15,
    fontWeight: '700',
  },
});
