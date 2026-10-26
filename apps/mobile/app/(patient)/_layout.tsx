import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Text, Platform } from 'react-native';
import { Role } from '@anvaya/shared';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';

export default function PatientLayout() {
  const { user, role, isLoading } = useAuthStore();

  if (isLoading) {
    return null;
  }

  // Block unauthenticated users
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Block non-patients
  if (role !== Role.PATIENT) {
    if (role === Role.DOCTOR) return <Redirect href="/(doctor)" />;
    if (role === Role.SHOP) return <Redirect href="/(shop)" />;
    return <Redirect href="/(auth)/login" />;
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
        tabBarActiveTintColor: Colors.roles.patient,
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
          title: 'Visits',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>📅</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>📱</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>📁</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="shops"
        options={{
          title: 'Shops',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>🏥</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="consent"
        options={{
          title: 'Consent',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>🛡️</Text>
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
      <Tabs.Screen
        name="prescription/[id]"
        options={{
          href: null, // Hidden from bottom tab bar
        }}
      />
    </Tabs>
  );
}
