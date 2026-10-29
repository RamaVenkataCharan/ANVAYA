import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui';

const { width } = Dimensions.get('window');

export default function WelcomeOnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      id: 'slide-1',
      icon: '📜',
      title: t('onboarding.slide1Title'),
      desc: t('onboarding.slide1Desc'),
      accent: Colors.primaryLight,
    },
    {
      id: 'slide-2',
      icon: '🏥',
      title: t('onboarding.slide2Title'),
      desc: t('onboarding.slide2Desc'),
      accent: Colors.status.success,
    },
    {
      id: 'slide-3',
      icon: '💳',
      title: t('onboarding.slide3Title'),
      desc: t('onboarding.slide3Desc'),
      accent: Colors.roles.patient,
    },
  ];

  const handleComplete = async () => {
    try {
      await SecureStore.setItemAsync('has_seen_onboarding', 'true');
    } catch {
      // Ignore storage errors in dev
    }
    router.replace('/(auth)/login');
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== currentIndex && index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>ANVAYA</Text>
        <TouchableOpacity
          onPress={() => void handleComplete()}
          style={styles.skipButton}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.skip')}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.carousel}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { borderColor: slide.accent }]}>
              <Text style={styles.icon}>{slide.icon}</Text>
            </View>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDesc}>{slide.desc}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, i) => (
          <View
            key={`dot-${i}`}
            style={[
              styles.dot,
              currentIndex === i ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Action Footer */}
      <View style={styles.footer}>
        <Button
          label={
            currentIndex === slides.length - 1
              ? t('onboarding.getStarted')
              : t('onboarding.next')
          }
          onPress={() => {
            if (currentIndex === slides.length - 1) {
              void handleComplete();
            } else {
              setCurrentIndex((prev) => prev + 1);
            }
          }}
          variant="primary"
          accessibilityLabel={
            currentIndex === slides.length - 1
              ? t('onboarding.getStarted')
              : t('onboarding.next')
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primaryLight,
    letterSpacing: 2,
  },
  skipButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  carousel: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  icon: {
    fontSize: 52,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  slideDesc: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primaryLight,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.border,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
