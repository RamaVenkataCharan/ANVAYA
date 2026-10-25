import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Role } from '@anvaya/shared';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';

type SelectedRole = Role.DOCTOR | Role.SHOP | Role.PATIENT;

export default function RegisterScreen() {
  const { login } = useAuthStore();

  const [role, setRole] = useState<SelectedRole>(Role.DOCTOR);

  // Common user fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Doctor specific fields
  const [registrationNo, setRegistrationNo] = useState('');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [clinicAddress, setClinicAddress] = useState('');

  // Shop specific fields
  const [shopName, setShopName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [timings, setTimings] = useState('09:00 AM - 09:00 PM');

  // Patient specific fields
  const [dob, setDob] = useState('1995-01-01');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [patientAddress, setPatientAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);

    // Basic validation
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone || !/^[+]?[0-9]{10,15}$/.test(cleanPhone)) {
      setErrorMessage('Phone number must be 10-15 digits (e.g. 9876543210).');
      return;
    }
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setErrorMessage(
        'Password must be at least 8 characters and contain uppercase, lowercase, and a number.'
      );
      return;
    }

    let payload: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      password,
      role,
    };

    if (role === Role.DOCTOR) {
      if (!registrationNo.trim() || registrationNo.trim().length < 3) {
        setErrorMessage('Medical registration number is required (min 3 chars).');
        return;
      }
      if (!specialization.trim() || specialization.trim().length < 2) {
        setErrorMessage('Specialization is required.');
        return;
      }
      if (!clinicAddress.trim() || clinicAddress.trim().length < 5) {
        setErrorMessage('Clinic/hospital address is required (min 5 chars).');
        return;
      }
      payload = {
        ...payload,
        registrationNo: registrationNo.trim(),
        specialization: specialization.trim(),
        clinicAddress: clinicAddress.trim(),
      };
    } else if (role === Role.SHOP) {
      if (!licenseNo.trim() || licenseNo.trim().length < 3) {
        setErrorMessage('Drug license number is required (min 3 chars).');
        return;
      }
      if (!shopName.trim() || shopName.trim().length < 2) {
        setErrorMessage('Pharmacy/Shop name is required.');
        return;
      }
      if (!shopAddress.trim() || shopAddress.trim().length < 5) {
        setErrorMessage('Pharmacy address is required (min 5 chars).');
        return;
      }
      payload = {
        ...payload,
        licenseNo: licenseNo.trim(),
        shopName: shopName.trim(),
        address: shopAddress.trim(),
        timings: timings.trim() || '09:00 AM - 09:00 PM',
      };
    } else if (role === Role.PATIENT) {
      if (!dob.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
        setErrorMessage('Date of birth must be in YYYY-MM-DD format (e.g. 1995-01-15).');
        return;
      }
      if (!patientAddress.trim() || patientAddress.trim().length < 5) {
        setErrorMessage('Address is required (min 5 chars).');
        return;
      }
      payload = {
        ...payload,
        dob: dob.trim(),
        gender,
        address: patientAddress.trim(),
        bloodGroup: bloodGroup.trim() || undefined,
      };
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/register', payload);
      const authData = response.data?.data;

      if (authData?.user && authData?.tokens) {
        await login(authData);
        // Navigation will be automatically resolved by app/_layout.tsx
      } else {
        throw new Error('Unexpected response format from server');
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Registration failed. Please verify your details.';
      setErrorMessage(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join the ANVAYA integrated healthcare network
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Role Picker */}
            <Text style={styles.label}>Select Your Role</Text>
            <View style={styles.rolePickerContainer}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === Role.DOCTOR && styles.roleButtonActiveDoctor,
                ]}
                onPress={() => setRole(Role.DOCTOR)}
                disabled={isSubmitting}
              >
                <Text style={styles.roleIcon}>🩺</Text>
                <Text
                  style={[
                    styles.roleButtonText,
                    role === Role.DOCTOR && styles.roleButtonTextActive,
                  ]}
                >
                  Doctor
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === Role.SHOP && styles.roleButtonActiveShop,
                ]}
                onPress={() => setRole(Role.SHOP)}
                disabled={isSubmitting}
              >
                <Text style={styles.roleIcon}>💊</Text>
                <Text
                  style={[
                    styles.roleButtonText,
                    role === Role.SHOP && styles.roleButtonTextActive,
                  ]}
                >
                  Medical Shop
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === Role.PATIENT && styles.roleButtonActivePatient,
                ]}
                onPress={() => setRole(Role.PATIENT)}
                disabled={isSubmitting}
              >
                <Text style={styles.roleIcon}>👤</Text>
                <Text
                  style={[
                    styles.roleButtonText,
                    role === Role.PATIENT && styles.roleButtonTextActive,
                  ]}
                >
                  Patient
                </Text>
              </TouchableOpacity>
            </View>

            {/* Common Fields */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder={
                  role === Role.DOCTOR ? 'Dr. Sarah Connor' : 'John Doe'
                }
                placeholderTextColor={Colors.text.muted}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={Colors.text.muted}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                placeholderTextColor={Colors.text.muted}
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="phone-pad"
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.showHideText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="At least 8 chars, 1 uppercase, 1 digit"
                placeholderTextColor={Colors.text.muted}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isSubmitting}
              />
            </View>

            {/* Role Specific Fields */}
            {role === Role.DOCTOR && (
              <View style={styles.roleFieldsBox}>
                <Text style={styles.roleSectionTitle}>Clinical Credentials</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Medical Registration Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. MCI-2024-8842"
                    placeholderTextColor={Colors.text.muted}
                    value={registrationNo}
                    onChangeText={(t) => {
                      setRegistrationNo(t);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="characters"
                    editable={!isSubmitting}
                  />
                  <Text style={styles.hintText}>
                    Subject to administrative verification before dispensing/issuing
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Specialization</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Cardiology, General Medicine"
                    placeholderTextColor={Colors.text.muted}
                    value={specialization}
                    onChangeText={setSpecialization}
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Clinic / Hospital Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Suite 402, Apex Medical Center"
                    placeholderTextColor={Colors.text.muted}
                    value={clinicAddress}
                    onChangeText={setClinicAddress}
                    editable={!isSubmitting}
                  />
                </View>
              </View>
            )}

            {role === Role.SHOP && (
              <View style={styles.roleFieldsBox}>
                <Text style={styles.roleSectionTitle}>Pharmacy Credentials</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Drug License Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. DL-2026-KA-4521"
                    placeholderTextColor={Colors.text.muted}
                    value={licenseNo}
                    onChangeText={(t) => {
                      setLicenseNo(t);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="characters"
                    editable={!isSubmitting}
                  />
                  <Text style={styles.hintText}>
                    Subject to administrative verification before QR dispensing
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pharmacy / Shop Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Apollo MedPlus Pharmacy"
                    placeholderTextColor={Colors.text.muted}
                    value={shopName}
                    onChangeText={setShopName}
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Pharmacy Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 12th Main Road, Indiranagar"
                    placeholderTextColor={Colors.text.muted}
                    value={shopAddress}
                    onChangeText={setShopAddress}
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Operating Timings</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 09:00 AM - 10:00 PM"
                    placeholderTextColor={Colors.text.muted}
                    value={timings}
                    onChangeText={setTimings}
                    editable={!isSubmitting}
                  />
                </View>
              </View>
            )}

            {role === Role.PATIENT && (
              <View style={styles.roleFieldsBox}>
                <Text style={styles.roleSectionTitle}>Patient Profile</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1995-05-20"
                    placeholderTextColor={Colors.text.muted}
                    value={dob}
                    onChangeText={setDob}
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.genderRow}>
                    {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderButton,
                          gender === g && styles.genderButtonActive,
                        ]}
                        onPress={() => setGender(g)}
                      >
                        <Text
                          style={[
                            styles.genderText,
                            gender === g && styles.genderTextActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Blood Group</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. O+, A+, B+"
                    placeholderTextColor={Colors.text.muted}
                    value={bloodGroup}
                    onChangeText={setBloodGroup}
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Residential Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Flat 301, Lakeview Residency"
                    placeholderTextColor={Colors.text.muted}
                    value={patientAddress}
                    onChangeText={setPatientAddress}
                    editable={!isSubmitting}
                  />
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Register as {role === Role.DOCTOR ? 'Doctor' : role === Role.SHOP ? 'Medical Shop' : 'Patient'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity disabled={isSubmitting}>
                  <Text style={styles.loginLink}> Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.errorBackground,
    borderColor: Colors.status.error,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  rolePickerContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    marginTop: 6,
  },
  roleButton: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  roleButtonActiveDoctor: {
    borderColor: Colors.roles.doctor,
    backgroundColor: Colors.roles.doctorBackground,
  },
  roleButtonActiveShop: {
    borderColor: Colors.roles.shop,
    backgroundColor: Colors.roles.shopBackground,
  },
  roleButtonActivePatient: {
    borderColor: Colors.roles.patient,
    backgroundColor: Colors.roles.patientBackground,
  },
  roleIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  roleButtonTextActive: {
    color: Colors.text.primary,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  showHideText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  hintText: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.text.primary,
  },
  roleFieldsBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    marginTop: 4,
  },
  roleSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryLight,
    marginBottom: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genderButtonActive: {
    borderColor: Colors.roles.patient,
    backgroundColor: Colors.roles.patientBackground,
  },
  genderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  genderTextActive: {
    color: Colors.text.primary,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryLight,
  },
});
