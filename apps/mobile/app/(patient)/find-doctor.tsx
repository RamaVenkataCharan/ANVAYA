import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Card, Button, Input } from '../../components/ui';
import { api } from '../../services/api';

export default function FindDoctorScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('10:00 AM');
  const [reason, setReason] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Fetch verified doctors list
  const {
    data: doctors = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['doctors', 'directory'],
    queryFn: async () => {
      const res = await api.get('/users/doctors');
      return res.data.data || [];
    },
  });

  // Filter doctors by search keyword
  const filteredDoctors = doctors.filter((doc: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const nameMatch = doc.user?.name?.toLowerCase().includes(q);
    const specMatch = doc.specialization?.toLowerCase().includes(q);
    return nameMatch || specMatch;
  });

  // Generate 4 upcoming business days for date picker
  const upcomingDates = [1, 2, 3, 4].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      iso: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    };
  });

  const timeSlots = [
    '09:30 AM',
    '10:30 AM',
    '11:30 AM',
    '02:30 PM',
    '03:30 PM',
    '04:30 PM',
  ];

  const bookMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/appointments', payload);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient', 'appointments'] });
      setIsModalVisible(false);
      Alert.alert(
        t('findDoctor.bookingSuccess'),
        `Your consultation with ${selectedDoctor?.user?.name || 'Dr.'} is confirmed.`,
        [
          {
            text: 'View My Visits',
            onPress: () => router.push('/(patient)/appointments'),
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert(
        'Booking Failed',
        err.response?.data?.message || 'Unable to schedule consultation.'
      );
    },
  });

  const handleOpenBooking = (doctor: any) => {
    setSelectedDoctor(doctor);
    setSelectedDate(upcomingDates[0].iso);
    setSelectedTime(timeSlots[1]);
    setReason('');
    setIsModalVisible(true);
  };

  const handleConfirmBooking = () => {
    if (!selectedDoctor || !selectedDate) return;

    // Combine date and time slot into ISO timestamp
    const [time, period] = selectedTime.split(' ');
    const [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(hours, parseInt(minutesStr, 10), 0, 0);

    bookMutation.mutate({
      doctorId: selectedDoctor.id,
      dateTime: scheduledDate.toISOString(),
      reason: reason.trim() || 'General Consultation',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('findDoctor.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Input
          placeholder={t('findDoctor.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          leftAccessory={<Text style={{ fontSize: 16 }}>🔍</Text>}
          clearButtonMode="while-editing"
          accessibilityLabel={t('findDoctor.searchPlaceholder')}
        />
      </View>

      {/* Doctors List */}
      <FlatList
        data={filteredDoctors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={Colors.roles.patient}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.doctorCard}>
            <View style={styles.doctorCardHeader}>
              <View style={styles.doctorAvatarCircle}>
                <Text style={styles.doctorEmoji}>👨‍⚕️</Text>
              </View>
              <View style={styles.doctorInfoCol}>
                <Text style={styles.docName}>{item.user?.name || 'Dr. Practitioner'}</Text>
                <Text style={styles.docSpecialty}>{item.specialization}</Text>
                <Text style={styles.docRegNo}>Reg: {item.registrationNo}</Text>
              </View>
            </View>

            <View style={styles.addressRow}>
              <Text style={styles.addressIcon}>📍</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {item.clinicAddress}
              </Text>
            </View>

            <Button
              label={t('findDoctor.bookConsultation')}
              variant="primary"
              size="sm"
              onPress={() => handleOpenBooking(item)}
              accessibilityLabel={`${t('findDoctor.bookConsultation')} with ${item.user?.name}`}
            />
          </Card>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🩺</Text>
              <Text style={styles.emptyTitle}>{t('findDoctor.emptySearch')}</Text>
            </View>
          ) : null
        }
      />

      {/* Booking Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('findDoctor.bookConsultation')}</Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.modalDocName}>
                {selectedDoctor?.user?.name || 'Dr. Practitioner'}
              </Text>
              <Text style={styles.modalDocSpec}>{selectedDoctor?.specialization}</Text>

              {/* Date Selection */}
              <Text style={styles.pickerSectionTitle}>{t('findDoctor.selectDateTime')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                {upcomingDates.map((d) => (
                  <TouchableOpacity
                    key={d.iso}
                    style={[styles.dateChip, selectedDate === d.iso && styles.chipActive]}
                    onPress={() => setSelectedDate(d.iso)}
                  >
                    <Text style={[styles.chipText, selectedDate === d.iso && styles.chipTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Time Slots */}
              <Text style={styles.pickerSectionTitle}>{t('findDoctor.selectTimeSlot')}</Text>
              <View style={styles.timeGrid}>
                {timeSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeChip, selectedTime === slot && styles.chipActive]}
                    onPress={() => setSelectedTime(slot)}
                  >
                    <Text style={[styles.chipText, selectedTime === slot && styles.chipTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Reason */}
              <View style={styles.reasonBox}>
                <Input
                  label={t('findDoctor.reasonLabel')}
                  placeholder={t('findDoctor.reasonPlaceholder')}
                  value={reason}
                  onChangeText={setReason}
                />
              </View>

              <Button
                label={t('findDoctor.confirmBooking')}
                variant="primary"
                onPress={handleConfirmBooking}
                isLoading={bookMutation.isPending}
                accessibilityLabel={t('findDoctor.confirmBooking')}
              />
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 24,
    color: Colors.text.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  doctorCard: {
    marginBottom: 14,
    padding: 16,
  },
  doctorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  doctorAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eaf4f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorEmoji: {
    fontSize: 24,
  },
  doctorInfoCol: {
    flex: 1,
  },
  docName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  docSpecialty: {
    fontSize: 13,
    color: Colors.roles.doctor,
    fontWeight: '600',
    marginBottom: 2,
  },
  docRegNo: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  addressIcon: {
    fontSize: 13,
  },
  addressText: {
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: Colors.text.muted,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  modalDocName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalDocSpec: {
    fontSize: 13,
    color: Colors.roles.doctor,
    marginBottom: 16,
  },
  pickerSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginRight: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  timeChip: {
    width: '31%',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#0c3832',
    borderColor: '#0c3832',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  reasonBox: {
    marginBottom: 20,
  },
});
