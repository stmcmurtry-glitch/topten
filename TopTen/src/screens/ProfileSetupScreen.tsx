import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, ProfileData } from '../context/AuthContext';
import { CATEGORIES } from '../data/categories';
import { getDetectedLocation, DetectedLocation } from '../services/locationService';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { colors, spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');

const DEFAULT_DOB = new Date(1995, 0, 1);
const MIN_DOB = new Date(1900, 0, 1);
const MAX_DOB = new Date();
const formatDob = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const toDateString = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const GENDERS = ['Man', 'Woman', 'Non-binary', 'Other', 'Prefer not to say'];
const MAX_CATEGORIES = 7;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;


/* ── Main Screen ── */
interface Props {
  navigation: any;
}

export const ProfileSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { updateProfile, userProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const carouselRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const needsUsername = !userProfile?.username;

  // Slide IDs — username slide only for Apple/Google users
  const SLIDE_IDS = [
    ...(needsUsername ? ['username'] : []),
    'age',
    'gender',
    'location',
    'categories',
  ];
  const totalSlides = SLIDE_IDS.length;

  // Form state
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState<Date>(DEFAULT_DOB);
  const [dobSet, setDobSet] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null | undefined>(undefined);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [changeLocationVisible, setChangeLocationVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    getDetectedLocation().then(setDetectedLocation);
  }, []);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
    setFieldError(null);
  };

  const handleNext = async () => {
    setFieldError(null);
    const slideId = SLIDE_IDS[activeIndex];

    // Validate username if on that slide
    if (slideId === 'username') {
      if (!username.trim()) { setFieldError('Please choose a username.'); return; }
      if (!USERNAME_REGEX.test(username)) {
        setFieldError('3–20 characters: letters, numbers, and underscores only.');
        return;
      }
    }

    if (activeIndex < totalSlides - 1) {
      carouselRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      await handleFinish();
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    const profileData: ProfileData = {
      ...(needsUsername && username ? { username: username.trim().toLowerCase() } : {}),
      date_of_birth: dobSet ? toDateString(dob) : undefined,
      gender: gender ?? undefined,
      favorite_categories: selectedCategories,
      location_city: detectedLocation?.city,
      location_region: detectedLocation?.region,
    };
    const err = await updateProfile(profileData);
    setSaving(false);
    if (err) { setFieldError(err); return; }
    navigation.popToTop();
  };

  const handleSkip = async () => {
    setSaving(true);
    await updateProfile({});
    setSaving(false);
    navigation.popToTop();
  };

  const toggleCategory = (label: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(label)) return prev.filter((c) => c !== label);
      if (prev.length >= MAX_CATEGORIES) return prev;
      return [...prev, label];
    });
  };

  const isLast = activeIndex === totalSlides - 1;
  const locationLabel = detectedLocation
    ? `${detectedLocation.city || detectedLocation.region}${detectedLocation.region && detectedLocation.city ? `, ${detectedLocation.region}` : ''}`
    : detectedLocation === null ? 'Unable to detect' : 'Detecting…';

  const renderSlide = ({ item: slideId }: { item: string }) => {
    if (slideId === 'username') {
      return (
        <View style={styles.slide}>
          <View style={styles.iconContainer}>
            <Ionicons name="at" size={48} color={colors.activeTab} />
          </View>
          <Text style={styles.title}>Choose a{'\n'}username.</Text>
          <Text style={styles.subtitle}>This is how others will see you in community rankings.</Text>
          <View style={styles.usernameInputGroup}>
            <Text style={styles.usernameAt}>@</Text>
            <TextInput
              style={styles.usernameInput}
              placeholder="yourname"
              placeholderTextColor={colors.border}
              value={username}
              onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
            />
          </View>
          {!!fieldError && <Text style={styles.fieldError}>{fieldError}</Text>}
        </View>
      );
    }

    if (slideId === 'age') {
      return (
        <View style={styles.slide}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.activeTab} />
          </View>
          <Text style={styles.title}>When's your{'\n'}birthday?</Text>
          <Text style={styles.subtitle}>Helps us tailor content to your stage of life.</Text>
          {dobSet && (
            <Text style={styles.dobSelected}>{formatDob(dob)}</Text>
          )}
          <DateTimePicker
            value={dob}
            mode="date"
            display="spinner"
            onChange={(_, date) => { if (date) { setDob(date); setDobSet(true); } }}
            maximumDate={MAX_DOB}
            minimumDate={MIN_DOB}
            style={styles.datePicker}
          />
        </View>
      );
    }

    if (slideId === 'gender') {
      return (
        <View style={styles.slide}>
          <View style={styles.iconContainer}>
            <Ionicons name="people-outline" size={48} color={colors.activeTab} />
          </View>
          <Text style={styles.title}>What's your{'\n'}gender?</Text>
          <Text style={styles.subtitle}>Optional — helps us personalize your experience.</Text>
          <View style={styles.pillGrid}>
            {GENDERS.map((g) => {
              const selected = gender === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => setGender(selected ? null : g)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (slideId === 'location') {
      return (
        <View style={styles.slide}>
          <View style={styles.iconContainer}>
            <Ionicons name="location-outline" size={48} color={colors.activeTab} />
          </View>
          <Text style={styles.title}>Where are{'\n'}you based?</Text>
          <Text style={styles.subtitle}>Used to surface local lists and picks near you.</Text>
          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => setChangeLocationVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location-sharp" size={16} color={colors.activeTab} />
            <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
            <Text style={styles.locationChange}>Change</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (slideId === 'categories') {
      const count = selectedCategories.length;
      return (
        <View style={[styles.slide, { justifyContent: 'flex-start', paddingTop: spacing.xl }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="grid-outline" size={48} color={colors.activeTab} />
          </View>
          <Text style={styles.title}>What are{'\n'}you into?</Text>
          <Text style={[styles.subtitle, { marginBottom: spacing.lg }]}>
            Pick up to {MAX_CATEGORIES} categories you love.{' '}
            <Text style={[count === MAX_CATEGORIES && { color: '#CC0000', fontWeight: '600' }]}>
              {count}/{MAX_CATEGORIES}
            </Text>
          </Text>
          <View style={styles.chipGrid}>
            {CATEGORIES.map((cat) => {
              const selected = selectedCategories.includes(cat.label);
              const disabled = !selected && count >= MAX_CATEGORIES;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[
                    styles.chip,
                    selected && { backgroundColor: cat.color, borderColor: cat.color },
                    disabled && styles.chipDisabled,
                  ]}
                  onPress={() => toggleCategory(cat.label)}
                  activeOpacity={0.7}
                  disabled={disabled}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={13}
                    color={selected ? '#FFF' : disabled ? colors.border : colors.secondaryText}
                  />
                  <Text style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                    disabled && styles.chipTextDisabled,
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <FlatList
          ref={carouselRef}
          data={SLIDE_IDS}
          keyExtractor={(id) => id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          scrollEnabled={SLIDE_IDS[activeIndex] !== 'categories'}
          renderItem={renderSlide}
        />

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDE_IDS.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        {/* Next / Finish button */}
        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleNext}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{isLast ? 'Finish' : 'Next'}</Text>
          {!isLast && <Ionicons name="arrow-forward" size={16} color="#FFF" />}
        </TouchableOpacity>

        {/* Skip entire setup */}
        <TouchableOpacity style={styles.skip} onPress={handleSkip} activeOpacity={0.6} disabled={saving}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      <ChangeLocationModal
        visible={changeLocationVisible}
        currentCity={detectedLocation?.city || detectedLocation?.region || ''}
        onClose={() => setChangeLocationVisible(false)}
        onLocationChanged={(newLoc) => setDetectedLocation(newLoc)}
      />
    </>
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
    marginBottom: spacing.xl,
  },
  dobSelected: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CC0000',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  datePicker: {
    width: '100%',
  },
  /* Username */
  usernameInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  usernameAt: {
    fontSize: 18,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  usernameInput: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 14,
    fontSize: 18,
    color: colors.primaryText,
  },
  fieldError: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
    textAlign: 'center',
  },
  /* Gender / pill selection */
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  pillSelected: {
    backgroundColor: '#CC0000',
    borderColor: '#CC0000',
  },
  pillText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primaryText,
  },
  pillTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  /* Location */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: colors.primaryText,
    fontWeight: '500',
  },
  locationChange: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CC0000',
  },
  /* Categories */
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  chipDisabled: { opacity: 0.35 },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primaryText,
  },
  chipTextSelected: { color: '#FFF', fontWeight: '600' },
  chipTextDisabled: { color: colors.border },
  /* Bottom controls (matches OnboardingScreen exactly) */
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
  buttonDisabled: { opacity: 0.5 },
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
