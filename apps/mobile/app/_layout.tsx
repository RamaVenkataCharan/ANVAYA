import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Role, VerificationStatus } from '@anvaya/shared';
import { useAuthStore } from '../store/auth';
import { Colors } from '../constants/colors';
import { registerPushTokenWithBackend } from '../services/notifications';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineNotice } from '../components/OfflineNotice';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function SplashScreen() {
  return (
    <View style={splashStyles.container}>
      <StatusBar style="light" />
      <View style={splashStyles.logoContainer}>
        <View style={splashStyles.logoGlow}>
          <Text style={splashStyles.logoSymbol}>⚕</Text>
        </View>
        <Text style={splashStyles.title}>ANVAYA</Text>
        <Text style={splashStyles.subtitle}>
          Secure Paperless Healthcare Ecosystem
        </Text>
      </View>

      <View style={splashStyles.loadingSection}>
        <ActivityIndicator color={Colors.primaryLight} size="large" />
        <Text style={splashStyles.loadingText}>Restoring session...</Text>
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 80,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoGlow: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoSymbol: {
    fontSize: 44,
    color: Colors.primaryLight,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  loadingSection: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.text.muted,
  },
});

function RootNavigationLayout() {
  const { user, role, verificationStatus, isLoading, restoreSession } =
    useAuthStore();
  const rootNavigationState = useRootNavigationState();
  const segments = useSegments();
  const router = useRouter();

  // Restore tokens from expo-secure-store on initial launch
  useEffect(() => {
    restoreSession();
  }, []);

  // Register device for push notifications when user logs in
  useEffect(() => {
    if (user) {
      registerPushTokenWithBackend();
    }
  }, [user?.id]);

  // Handle route protection and role-based redirects
  useEffect(() => {
    if (!rootNavigationState?.key || isLoading) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const currentScreen = segs[1];

    if (!user) {
      // 1. Not logged in -> redirect to (auth)/login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      const isPending =
        (role === Role.DOCTOR || role === Role.SHOP) &&
        verificationStatus === VerificationStatus.PENDING;

      if (isPending) {
        // 2. DOCTOR or SHOP with status PENDING -> (auth)/pending-verification
        if (currentScreen !== 'pending-verification') {
          router.replace('/(auth)/pending-verification');
        }
      } else {
        // 3. Otherwise -> (doctor) | (shop) | (patient) based on role
        if (inAuthGroup || segs.length === 0) {
          if (role === Role.DOCTOR) {
            router.replace('/(doctor)');
          } else if (role === Role.SHOP) {
            router.replace('/(shop)');
          } else if (role === Role.PATIENT) {
            router.replace('/(patient)');
          } else {
            router.replace('/(doctor)');
          }
        }
      }
    }
  }, [
    user,
    role,
    verificationStatus,
    isLoading,
    segments,
    rootNavigationState?.key,
  ]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(doctor)" options={{ headerShown: false }} />
      <Stack.Screen name="(shop)" options={{ headerShown: false }} />
      <Stack.Screen name="(patient)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <OfflineNotice />
          <RootNavigationLayout />
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
