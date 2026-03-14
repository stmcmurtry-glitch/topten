import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadow } from '../theme';
import {
  DetectedLocation,
  setManualCity,
  clearLocationCache,
  getDetectedLocation,
} from '../services/locationService';
import { searchCities } from '../services/googlePlacesService';

type CityResult = { name: string; secondary: string };

export interface ChangeLocationModalProps {
  visible: boolean;
  currentCity: string;
  onClose: () => void;
  onLocationChanged: (newLoc: DetectedLocation) => void;
}

export const ChangeLocationModal: React.FC<ChangeLocationModalProps> = ({
  visible,
  currentCity,
  onClose,
  onLocationChanged,
}) => {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState(currentCity);
  const [results, setResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setInput(currentCity);
      setResults([]);
      setSearching(false);
    }
  }, [visible, currentCity]);

  const handleQueryChange = useCallback((text: string) => {
    setInput(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const found = await searchCities(text);
      setResults(found);
      setSearching(false);
    }, 350);
  }, []);

  const handleSelect = async (name: string, region?: string) => {
    if (confirming) return;
    setConfirming(true);
    try {
      const newLoc = await setManualCity(name, region);
      onLocationChanged(newLoc);
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  const handleDetect = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await clearLocationCache();
      const newLoc = await getDetectedLocation();
      if (newLoc) onLocationChanged(newLoc);
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  const isTyping = input.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingBottom: insets.bottom + spacing.lg }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Change Location</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={colors.primaryText} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={colors.secondaryText} />
              <TextInput
                style={styles.searchInput}
                value={input}
                onChangeText={handleQueryChange}
                placeholder="Search for a city…"
                placeholderTextColor={colors.secondaryText}
                autoCorrect={false}
                autoCapitalize="words"
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
              {searching && <ActivityIndicator size="small" color={colors.secondaryText} />}
            </View>
          </View>

          {/* Results or empty spacer */}
          {isTyping ? (
            <FlatList
              data={results}
              keyExtractor={(_, i) => String(i)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.resultsList}
              contentContainerStyle={styles.resultsContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                !searching ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>No cities found for "{input}"</Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => handleSelect(item.name, item.secondary.split(',')[0].trim())}
                  activeOpacity={0.7}
                  disabled={confirming}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name="location-sharp" size={18} color={colors.secondaryText} />
                  </View>
                  <View style={styles.resultBody}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    {item.secondary ? (
                      <Text style={styles.resultSecondary}>{item.secondary}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.border} />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.spacer} />
          )}

          {/* Detect automatically */}
          <TouchableOpacity
            style={styles.detectButton}
            onPress={handleDetect}
            activeOpacity={0.7}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator size="small" color={colors.secondaryText} />
            ) : (
              <Text style={styles.detectText}>Use My Detected Location</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primaryText,
  },
  searchBarWrapper: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadow,
    shadowOpacity: 0.06,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
    paddingVertical: spacing.md,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultBody: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primaryText,
  },
  resultSecondary: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 36 + spacing.md,
  },
  emptyRow: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  spacer: {
    flex: 1,
  },
  detectButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  detectText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.secondaryText,
  },
});
