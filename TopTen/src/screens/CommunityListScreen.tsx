import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COMMUNITY_LISTS } from '../data/communityLists';
import { useCommunity } from '../context/CommunityContext';
import { colors, spacing, borderRadius, shadow } from '../theme';

const SCORE_BAR_MAX_WIDTH = 100;

export const CommunityListScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { communityListId } = route.params as { communityListId: string };
  const insets = useSafeAreaInsets();
  const {
    userRankings,
    liveScoreCache,
    participantCounts,
    fetchLiveScores,
    setUserSlots,
    submitRanking,
  } = useCommunity();

  const list = COMMUNITY_LISTS.find((l) => l.id === communityListId);
  const [activeTab, setActiveTab] = useState<'community' | 'yours'>('community');
  const [loadingScores, setLoadingScores] = useState(true);
  const [submitConfirmed, setSubmitConfirmed] = useState(false);
  const hasFetched = useRef(false);
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Choice sheet (tap a slot)
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  // Type modal
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeSlotIndex, setTypeSlotIndex] = useState<number | null>(null);
  const [typedValue, setTypedValue] = useState('');

  const ranking = userRankings[communityListId];
  const submitted = ranking?.submitted ?? false;

  const userSlots: string[] = useMemo(() => {
    if (ranking?.slots?.length === 10) return ranking.slots;
    return Array(10).fill('');
  }, [ranking]);

  // Set navigator title so the Search screen back button reads the list name
  useEffect(() => {
    if (list) navigation.setOptions({ title: list.title });
  }, [list, navigation]);

  // Fetch scores on mount
  useEffect(() => {
    let cancelled = false;
    fetchLiveScores(communityListId).finally(() => {
      if (!cancelled) {
        hasFetched.current = true;
        setLoadingScores(false);
      }
    });
    return () => { cancelled = true; };
  }, [communityListId, fetchLiveScores]);

  // Re-fetch when switching to community tab (after first mount)
  useEffect(() => {
    if (activeTab === 'community' && hasFetched.current) {
      fetchLiveScores(communityListId);
    }
  }, [activeTab, communityListId, fetchLiveScores]);

  if (!list) return null;

  // Score lookup: liveScoreCache keyed by lower(trim(title)), fallback to seedScore
  const cachedScores = liveScoreCache[communityListId];
  const getScore = (itemTitle: string): number => {
    const key = itemTitle.toLowerCase().trim();
    if (cachedScores && cachedScores[key] !== undefined) return cachedScores[key];
    const item = list.items.find((i) => i.title.toLowerCase().trim() === key);
    return item?.seedScore ?? 0;
  };

  const communityRanked = [...list.items].sort((a, b) => getScore(b.title) - getScore(a.title));
  const maxScore = communityRanked.length > 0 ? (getScore(communityRanked[0].title) || 1) : 1;

  const participantDisplay = (
    participantCounts[communityListId] ?? list.participantCount
  ).toLocaleString();

  // ── Yours tab helpers ────────────────────────────────────────────────────

  const openChoiceSheet = (index: number) => setActiveSlot(index);

  const openTypeModal = (index: number) => {
    setActiveSlot(null);
    setTypeSlotIndex(index);
    setTypedValue('');
    setShowTypeModal(true);
  };

  const openSearch = (index: number) => {
    setActiveSlot(null);
    navigation.navigate('Search', {
      communityListId,
      slotIndex: index,
      rank: index + 1,
      category: list.category,
    });
  };

  const saveSlot = () => {
    if (typeSlotIndex === null) return;
    const updated = [...userSlots];
    updated[typeSlotIndex] = typedValue.trim();
    setUserSlots(communityListId, updated);
    setShowTypeModal(false);
    setTypedValue('');
  };

  const moveSlot = (from: number, to: number) => {
    if (to < 0 || to >= 10) return;
    const updated = [...userSlots];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setUserSlots(communityListId, updated);
  };

  const handleSubmit = async () => {
    await submitRanking(communityListId);

    // Haptic + quick visual confirm, then flip to Community tab
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(buttonScale, { toValue: 0.94, useNativeDriver: true, speed: 40 }),
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    setSubmitConfirmed(true);
    setTimeout(() => {
      setSubmitConfirmed(false);
      setActiveTab('community');
    }, 1200);
  };

  // ── Hero ─────────────────────────────────────────────────────────────────

  const Hero = (
    <View style={[styles.hero, { paddingTop: insets.top + 46 }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: list.color }]} />
      <View style={[StyleSheet.absoluteFill, styles.heroScrim]} />

      <View style={[styles.heroNav, { top: insets.top + 6 }]}>
        <TouchableOpacity style={styles.heroNavBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.heroNavTitle} numberOfLines={1}>{list.title}</Text>
        <View style={styles.heroBadge}>
          {submitted ? (
            <View style={styles.votedBadge}>
              <Text style={styles.votedBadgeText}>Voted ✓</Text>
            </View>
          ) : (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{participantDisplay} voted</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.heroContent}>
        <Text style={styles.heroDescription}>{list.description}</Text>
      </View>
    </View>
  );

  // ── Tab switcher ──────────────────────────────────────────────────────────

  const TabSwitcher = (
    <View style={styles.tabRow}>
      {(['community', 'yours'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
          onPress={() => setActiveTab(tab)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>
            {tab === 'community' ? 'Community' : 'Yours'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {Hero}
        {TabSwitcher}

        {/* ── Community tab ── */}
        {activeTab === 'community' && (
          <View style={styles.section}>
            {loadingScores ? (
              <ActivityIndicator
                size="large"
                color={colors.activeTab}
                style={styles.loadingIndicator}
              />
            ) : (
              communityRanked.map((item, idx) => {
                const score = getScore(item.title);
                const barWidth = (score / maxScore) * SCORE_BAR_MAX_WIDTH;
                return (
                  <View key={item.id} style={styles.communityRow}>
                    <Text style={styles.rankNum}>{idx + 1}</Text>
                    <Text style={styles.communityItemTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.scoreCol}>
                      <View style={[styles.scoreBar, { width: barWidth }]} />
                      <Text style={styles.scorePts}>{score.toLocaleString()} pts</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Yours tab ── */}
        {activeTab === 'yours' && (
          <View style={styles.section}>
            {userSlots.map((slotTitle, idx) => {
              const isEmpty = !slotTitle.trim();
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => openChoiceSheet(idx)}
                  style={[styles.yoursRow, isEmpty && styles.yoursRowEmpty]}
                >
                  <Text style={[styles.rankNum, isEmpty && styles.rankNumEmpty]}>{idx + 1}</Text>
                  {isEmpty ? (
                    <>
                      <Text style={styles.emptyText}>Add an item</Text>
                      <Ionicons name="add" size={16} color={colors.border} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.yoursItemTitle} numberOfLines={1}>{slotTitle}</Text>
                      <View style={styles.moveButtons}>
                        <TouchableOpacity
                          onPress={() => moveSlot(idx, idx - 1)}
                          disabled={idx === 0}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="chevron-up"
                            size={20}
                            color={idx === 0 ? colors.border : colors.secondaryText}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveSlot(idx, idx + 1)}
                          disabled={idx === 9}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={20}
                            color={idx === 9 ? colors.border : colors.secondaryText}
                          />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity onPress={handleSubmit} activeOpacity={0.9} disabled={submitConfirmed}>
              <Animated.View style={[styles.submitButton, { transform: [{ scale: buttonScale }], backgroundColor: submitConfirmed ? '#2ECC71' : '#CC0000' }]}>
                <Text style={styles.submitButtonText}>
                  {submitConfirmed ? '✓ Submitted!' : submitted ? 'Update My Ranking' : 'Submit My Ranking'}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Choice sheet ── */}
      <Modal visible={activeSlot !== null} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setActiveSlot(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>
              Rank #{activeSlot !== null ? activeSlot + 1 : ''}
            </Text>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => activeSlot !== null && openTypeModal(activeSlot)}
            >
              <Ionicons name="pencil-outline" size={22} color={colors.activeTab} />
              <Text style={styles.sheetOptionText}>Type an item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => activeSlot !== null && openSearch(activeSlot)}
            >
              <Ionicons name="search-outline" size={22} color={colors.activeTab} />
              <Text style={styles.sheetOptionText}>Find your item in a list</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setActiveSlot(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Type modal ── */}
      <Modal visible={showTypeModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.overlay} onPress={() => setShowTypeModal(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>
                Enter item for #{typeSlotIndex !== null ? typeSlotIndex + 1 : ''}
              </Text>
              <TextInput
                style={styles.typeInput}
                value={typedValue}
                onChangeText={setTypedValue}
                placeholder="Type a name…"
                placeholderTextColor={colors.secondaryText}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => { if (typedValue.trim()) saveSlot(); }}
              />
              <TouchableOpacity
                style={[styles.saveButton, !typedValue.trim() && styles.saveDisabled]}
                disabled={!typedValue.trim()}
                onPress={saveSlot}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Hero ── */
  hero: { justifyContent: 'flex-end' },
  heroScrim: { backgroundColor: 'rgba(0,0,0,0.22)' },
  heroNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNavTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.2,
  },
  heroBadge: { flexShrink: 0, alignItems: 'flex-end' },
  votedBadge: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.lg,
  },
  votedBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  countBadge: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.lg,
  },
  countBadgeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  heroContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 18,
    paddingTop: spacing.sm,
  },
  heroDescription: {
    fontSize: 13,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },

  /* ── Tabs ── */
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tabPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  tabPillActive: { backgroundColor: '#CC0000', borderColor: '#CC0000' },
  tabPillText: { fontSize: 14, fontWeight: '600', color: colors.primaryText },
  tabPillTextActive: { color: '#FFF' },

  /* ── Shared ── */
  section: { marginHorizontal: spacing.lg },
  loadingIndicator: { marginTop: spacing.xxl },

  /* ── Community tab ── */
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    ...shadow,
    shadowOpacity: 0.05,
  },
  rankNum: {
    width: 20,
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textAlign: 'right',
    flexShrink: 0,
  },
  rankNumEmpty: { opacity: 0.4 },
  communityItemTitle: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.primaryText },
  scoreCol: { alignItems: 'flex-end', gap: 3 },
  scoreBar: { height: 4, borderRadius: 2, backgroundColor: '#CC0000', minWidth: 4 },
  scorePts: { fontSize: 11, color: colors.secondaryText, fontWeight: '500' },

  /* ── Yours tab ── */
  yoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    ...shadow,
    shadowOpacity: 0.05,
  },
  yoursRowEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  yoursItemTitle: { flex: 1, fontSize: 16, color: colors.primaryText },
  emptyText: { flex: 1, fontSize: 16, color: colors.secondaryText },
  moveButtons: { alignItems: 'center', gap: 2 },
  submitButton: {
    backgroundColor: '#CC0000',
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  /* ── Modals ── */
  keyboardAvoid: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl + 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetOptionText: { fontSize: 17, color: colors.primaryText },
  cancelButton: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { fontSize: 17, color: colors.secondaryText },
  typeInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    fontSize: 17,
    color: colors.primaryText,
    marginBottom: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.activeTab,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
});
