import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Text, Platform } from 'react-native';
import { Role, VerificationStatus } from '@anvaya/shared';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';

export default function DoctorLayout() {
  const { user, role, verificationStatus, isLoading } = useAuthStore();

  if (isLoading) {
    return null;
  }

  // Block unauthenticated users
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Block users with a different role
  if (role !== Role.DOCTOR) {
    if (role === Role.SHOP) return <Redirect href="/(shop)" />;
    if (role === Role.PATIENT) return <Redirect href="/(patient)" />;
    return <Redirect href="/(auth)/login" />;
  }

  // Block unverified doctors
  if (verificationStatus === VerificationStatus.PENDING) {
    return <Redirect href="/(auth)/pending-verification" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primaryLight,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>🩺</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="new-prescription"
        options={{
          title: 'New Rx',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>📝</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{
          title: 'Prescriptions',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>👥</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
