import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: null,
    isLogo: true,
    title: 'Rank everything\nthat matters.',
    subtitle: 'Your personal top tens, always organized and always with you.',
  },
  {
    id: '2',
    icon: 'list-outline' as const,
    isLogo: false,
    title: 'Build your\ntop tens.',
    subtitle: 'Movies, food, travel, music — create ranked lists for anything across 16 categories.',
  },
  {
    id: '3',
    icon: 'people-outline' as const,
    isLogo: false,
    title: 'See how you\ncompare.',
    subtitle: 'Vote on community lists and discover how your picks stack up against everyone else.',
  },
];

interface Props {
  onDone: () => void;
}

export const OnboardingScreen: React.FC<Props> = ({ onDone }) => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      onDone();
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {item.isLogo ? (
              <View style={styles.logoContainer}>
                <View style={styles.logoRow}>
                  <Text style={styles.logoTop}>Top</Text>
                  <Text style={styles.logoTen}>Ten</Text>
                </View>
              </View>
            ) : (
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon!} size={56} color={colors.activeTab} />
              </View>
            )}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* CTA button */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          {isLast ? 'Get Started' : 'Next'}
        </Text>
        {!isLast && <Ionicons name="arrow-forward" size={16} color="#FFF" />}
      </TouchableOpacity>

      {/* Skip on first two slides */}
      {!isLast && (
        <TouchableOpacity style={styles.skip} onPress={onDone} activeOpacity={0.6}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl * 2,
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  logoTop: {
    fontSize: 64,
    fontWeight: '300',
    color: colors.primaryText,
    letterSpacing: -1,
  },
  logoTen: {
    fontSize: 64,
    fontWeight: '800',
    color: '#CC0000',
    letterSpacing: -1,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primaryText,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#CC0000',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg,
    backgroundColor: '#CC0000',
    marginBottom: spacing.md,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  skip: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  skipText: {
    fontSize: 15,
    color: colors.secondaryText,
    fontWeight: '500',
  },
});
