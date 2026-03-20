import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Linking,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { resolveCommunityList } from '../data/dynamicListRegistry';
import { TOP_500_CITY_SLUG_SET } from '../data/topCities';
import { useCommunity } from '../context/CommunityContext';
import { fetchCommunityImage } from '../services/featuredContentService';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { ShareModal } from '../components/ShareModal';
import { PublishModal, PublishableList } from '../components/PublishModal';
import { ReportIssueModal } from '../components/ReportIssueModal';
import { useAuth } from '../context/AuthContext';
import { usePostHog } from 'posthog-react-native';

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

  const list = resolveCommunityList(communityListId);
  const { user } = useAuth();
  const posthog = usePostHog();
  const [activeTab, setActiveTab] = useState<'community' | 'yours'>('community');
  const [showVoteOrderModal, setShowVoteOrderModal] = useState(false);
  const [loadingScores, setLoadingScores] = useState(true);
  const [submitConfirmed, setSubmitConfirmed] = useState(false);
  const [showVoteHint, setShowVoteHint] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
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

  // Show vote hint for first 10 submitted votes
  useEffect(() => {
    AsyncStorage.getItem('@topten_vote_submit_count').then((val) => {
      setShowVoteHint((parseInt(val ?? '0', 10) < 10));
    });
  }, []);

  // Set navigator title so the Search screen back button reads the list name
  useEffect(() => {
    if (list) navigation.setOptions({ title: list.title });
  }, [list, navigation]);

  // Track list view
  useEffect(() => {
    if (!list) return;
    posthog?.capture('local_list_viewed', {
      list_id: communityListId,
      list_title: list.title,
      category: list.category,
      city: (list as any).region ?? null,
      is_local: communityListId.startsWith('local-'),
    });
  }, [communityListId]);

  // Fetch scores on mount — 6 second timeout fallback to seed scores
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setLoadingScores(false);
    }, 6000);
    fetchLiveScores(communityListId).finally(() => {
      clearTimeout(timeout);
      if (!cancelled) {
        hasFetched.current = true;
        setLoadingScores(false);
      }
    });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [communityListId, fetchLiveScores]);

  // Vote-order preference: show once, then remember choice
  // Skip entirely if user has already voted on this list
  useEffect(() => {
    if (submitted) return; // already voted — go straight to community tab
    AsyncStorage.getItem('@topten_vote_order_pref').then(pref => {
      if (pref === 'vote_first') {
        setActiveTab('yours');
      } else if (!pref) {
        setShowVoteOrderModal(true);
      }
      // 'see_first' → stay on community (default)
    });
  }, []);

  const handleVoteOrderChoice = useCallback((choice: 'vote_first' | 'see_first') => {
    AsyncStorage.setItem('@topten_vote_order_pref', choice);
    setShowVoteOrderModal(false);
    if (choice === 'vote_first') setActiveTab('yours');
  }, []);

  // Re-fetch when switching to community tab (after first mount)
  useEffect(() => {
    if (activeTab === 'community' && hasFetched.current) {
      fetchLiveScores(communityListId);
    }
  }, [activeTab, communityListId, fetchLiveScores]);

  // Fetch hero image
  useEffect(() => {
    if (!list) return;
    fetchCommunityImage(list.id, list.imageQuery, list.category, list.items[0]?.title, list.staticImageUrl)
      .then(setHeroImageUrl);
  }, [communityListId]);

  if (!list) return null;

  // A "seeded" list is an In Your Area list for one of the top-500 cities.
  // Only these show pre-populated vote counts and scores.
  // Any other city or any national community list starts from zero.
  const citySlug = (list.region ?? '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const isSeededList = communityListId.startsWith('local-') && TOP_500_CITY_SLUG_SET.has(citySlug);

  // Score lookup: live Supabase scores take priority.
  // Non-seeded lists ignore seedScore entirely — they start from scratch.
  const cachedScores = liveScoreCache[communityListId];
  const getScore = (itemTitle: string): number => {
    const key = itemTitle.toLowerCase().trim();
    if (cachedScores && cachedScores[key] !== undefined) return cachedScores[key];
    if (!isSeededList) return 0;
    const item = list.items.find((i) => i.title.toLowerCase().trim() === key);
    return item?.seedScore ?? 0;
  };

  // Merge seed items with any live-voted items not already in the list (e.g. user-added golf courses)
  const allItems = useMemo(() => {
    const base = [...list.items];
    if (cachedScores) {
      Object.keys(cachedScores).forEach((key) => {
        if (!base.find((i) => i.title.toLowerCase().trim() === key)) {
          // Title-case user-submitted items so "parc" → "Parc", "jean-georges" → "Jean-Georges"
          const display = key.replace(/\b\w/g, (c) => c.toUpperCase());
          base.push({ id: `live-${key}`, title: display, seedScore: 0 });
        }
      });
    }
    return base;
  }, [list.items, cachedScores]);

  const filledCount = userSlots.filter((s) => s.trim()).length;

  const communityRanked = [...allItems].sort((a, b) => getScore(b.title) - getScore(a.title));
  const maxScore = communityRanked.length > 0 ? (getScore(communityRanked[0].title) || 1) : 1;
  // Seeded lists (top-500 In Your Area): use seed count as fallback.
  // Everything else: only real Supabase votes count.
  const rawParticipantCount = isSeededList
    ? (participantCounts[communityListId] ?? list.participantCount)
    : (participantCounts[communityListId] ?? 0);
  // Force to 0 when no items exist — catches stale cached data with a non-zero seed count
  const participantCount = communityRanked.length === 0 ? 0 : rawParticipantCount;
  // Normalize to leader then scale by votes × 8 — gives ~40–70 pts for 5–8 voters,
  // works regardless of whether seed data is old (100-based) or new (28-based).
  const displayScore = (raw: number) =>
    participantCount > 0 ? Math.round((raw / maxScore) * participantCount * 8) : 0;

  const participantDisplay = participantCount.toLocaleString();

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
      listTitle: list.title,
      region: list.region,
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

    // Track vote count for hint visibility
    AsyncStorage.getItem('@topten_vote_submit_count').then((val) => {
      const next = parseInt(val ?? '0', 10) + 1;
      AsyncStorage.setItem('@topten_vote_submit_count', String(next));
      if (next >= 10) setShowVoteHint(false);
    });

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
    }, 2500);
  };

  // ── Hero ─────────────────────────────────────────────────────────────────

  const Hero = (
    <View style={[styles.hero, { paddingTop: insets.top + 70 }]}>
      <LinearGradient
        colors={['#000000', list.color]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      {heroImageUrl && (
        <Image source={{ uri: heroImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      <View style={[StyleSheet.absoluteFill, styles.heroScrim]} />

      <View style={[styles.heroNav, { top: insets.top + 6 }]}>
        <TouchableOpacity
          style={styles.heroNavBtnWrap}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <BlurView intensity={40} tint="dark" style={styles.heroNavBtn}>
            <View style={styles.heroNavBtnInner}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </View>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.heroNavCategory} numberOfLines={1} pointerEvents="none">
          {list.category.toUpperCase()}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.heroContent}>
        <Text style={styles.heroTitle} numberOfLines={2}>{list.title}</Text>
        <Text style={styles.heroDescription}>{list.description}</Text>
        <View style={styles.heroMeta}>
          <Ionicons name="people" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={styles.heroMetaText}>{participantDisplay} voted</Text>
          {submitted && (
            <View style={styles.heroVotedPill}>
              <Text style={styles.heroVotedPillText}>✓ You voted</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // ── Tab switcher ──────────────────────────────────────────────────────────

  const TabSwitcher = (
    <View style={styles.tabRow}>
      {(['community', 'yours'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tabPill,
            activeTab === tab && { backgroundColor: list.color, borderColor: list.color },
          ]}
          onPress={() => setActiveTab(tab)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>
            {tab === 'community' ? 'Community' : 'My Vote'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: activeTab === 'yours' ? insets.bottom + 140 : insets.bottom + spacing.xxl }}
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
                color={list.color}
                style={styles.loadingIndicator}
              />
            ) : (
              <>
              {list.sponsored && (
                <TouchableOpacity
                  style={styles.sponsoredRow}
                  onPress={() => {
                    posthog?.capture('sponsored_tap', {
                      list_id: communityListId,
                      sponsor_name: list.sponsored!.name,
                      city: (list as any).region ?? null,
                    });
                    Linking.openURL(list.sponsored!.url);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.sponsoredLabel}>SPONSORED</Text>
                  <View style={styles.sponsoredContent}>
                    <Text style={styles.sponsoredName}>{list.sponsored.name}</Text>
                    <Text style={[styles.sponsoredCta, { color: list.color }]}>{list.sponsored.cta}</Text>
                    <Ionicons name="open-outline" size={20} color={list.color} />
                  </View>
                </TouchableOpacity>
              )}
              {participantCount === 0 && (
                <View style={styles.emptyVoteState}>
                  <Ionicons name="trophy-outline" size={44} color={colors.border} />
                  <Text style={styles.emptyVoteTitle}>No votes yet</Text>
                  <Text style={styles.emptyVoteBody}>
                    Be the first to rank this list and set the standard for your city.
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyVoteButton, { backgroundColor: list.color }]}
                    onPress={() => setActiveTab('yours')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.emptyVoteButtonText}>Cast Your Vote</Text>
                  </TouchableOpacity>
                </View>
              )}
              {participantCount > 0 && communityRanked.slice(0, showAllItems ? 50 : 10).map((item, idx) => {
                const score = getScore(item.title);
                const barWidth = (score / maxScore) * SCORE_BAR_MAX_WIDTH;
                const subtitle = item.location ?? item.artist ?? null;
                return (
                  <View key={item.id} style={styles.communityRow}>
                    <Text style={styles.rankNum}>{idx + 1}</Text>
                    <View style={styles.communityItemInfo}>
                      <Text style={styles.communityItemTitle} numberOfLines={1}>{item.title}</Text>
                      {subtitle && (
                        <Text style={styles.communityItemArtist} numberOfLines={1}>{subtitle}</Text>
                      )}
                    </View>
                    <View style={styles.scoreCol}>
                      <View style={[styles.scoreBar, { width: barWidth, backgroundColor: list.color }]} />
                      <Text style={styles.scorePts}>{displayScore(score)} pts</Text>
                    </View>
                  </View>
                );
              })}
              {participantCount > 0 && communityRanked.length > 10 && !showAllItems && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAllItems(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showMoreText}>Show more ({Math.min(communityRanked.length, 50) - 10} more)</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.secondaryText} />
                </TouchableOpacity>
              )}
              </>
            )}
            {!loadingScores && participantCount > 0 && communityRanked.length > 0 && (
              <>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: list.color }]}
                  onPress={() => setShowShareModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="share-outline" size={18} color="#FFF" />
                  <Text style={styles.shareButtonText}>Share This List</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => setShowReportModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flag-outline" size={13} color={colors.secondaryText} />
                  <Text style={styles.reportButtonText}>Report an issue</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Yours tab ── */}
        {activeTab === 'yours' && (
          <View style={styles.section}>
            {userSlots.map((slotTitle, idx) => {
              const isEmpty = !slotTitle.trim();

              if (isEmpty) {
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    onPress={() => openChoiceSheet(idx)}
                    style={[styles.yoursRow, styles.yoursRowEmpty]}
                  >
                    <Text style={[styles.rankNum, styles.rankNumEmpty]}>{idx + 1}</Text>
                    <Text style={styles.emptyText}>Add an item</Text>
                    <Ionicons name="add" size={16} color={colors.border} />
                  </TouchableOpacity>
                );
              }

              return (
                <Swipeable
                  key={idx}
                  friction={2}
                  rightThreshold={40}
                  renderRightActions={() => (
                    <TouchableOpacity
                      style={styles.swipeDeleteAction}
                      onPress={() => {
                        const updated = [...userSlots];
                        updated[idx] = '';
                        setUserSlots(communityListId, updated);
                      }}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FFF" />
                    </TouchableOpacity>
                  )}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => openChoiceSheet(idx)}
                    style={styles.yoursRow}
                  >
                    <Text style={styles.rankNum}>{idx + 1}</Text>
                    <View style={styles.yoursItemInfo}>
                      <Text style={styles.yoursItemTitle} numberOfLines={1}>{slotTitle}</Text>
                      {(() => {
                        const match = list.items.find(
                          i => i.title.toLowerCase() === slotTitle.toLowerCase()
                        );
                        const sub = match?.location ?? match?.artist;
                        return sub ? (
                          <Text style={styles.communityItemArtist} numberOfLines={1}>{sub}</Text>
                        ) : null;
                      })()}
                    </View>
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
                  </TouchableOpacity>
                </Swipeable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky submit footer (Yours tab only) ── */}
      {activeTab === 'yours' && (
        <View style={[styles.stickyFooter, { paddingBottom: 8 }]}>
          <TouchableOpacity onPress={handleSubmit} activeOpacity={0.9} disabled={submitConfirmed}>
            <Animated.View style={[styles.submitButton, { transform: [{ scale: buttonScale }], backgroundColor: submitConfirmed ? '#2ECC71' : list.color }]}>
              <Text style={styles.submitButtonText}>
                {submitConfirmed ? '✓ Submitted!' : submitted ? 'Update My Vote' : 'Submit My Vote'}
              </Text>
            </Animated.View>
          </TouchableOpacity>
          {submitConfirmed ? (
            <Text style={styles.batchNotice}>
              Community scores update overnight — check back tomorrow!
            </Text>
          ) : showVoteHint && filledCount < 10 ? (
            <View style={styles.voteHintRow}>
              <Ionicons name="bulb-outline" size={13} color={colors.secondaryText} />
              <Text style={styles.voteHint}>
                {filledCount === 0
                  ? "No need to fill all 10 — submit with as few as 1 pick."
                  : `${filledCount} pick${filledCount === 1 ? '' : 's'} · submit now or keep adding`}
              </Text>
            </View>
          ) : null}
          {user && filledCount > 0 && (
            <TouchableOpacity
              style={styles.postToFeedButton}
              onPress={() => setShowPublishModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="megaphone-outline" size={15} color={list.color} />
              <Text style={[styles.postToFeedText, { color: list.color }]}>Post my rankings to Community Feed</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={list.title}
        category={list.category}
        items={communityRanked.map((i) => i.title)}
      />
      <PublishModal
        visible={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        list={{
          id: list.id,
          title: list.title,
          category: list.category,
          items: userSlots.filter(s => s.trim()).map(title => ({ title })),
          coverImageUri: heroImageUrl,
        }}
      />
      <ReportIssueModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        listTitle={list.title}
        listType="Community"
      />

      {/* ── Vote order preference modal ── */}
      <Modal visible={showVoteOrderModal} transparent animationType="fade">
        <BlurView intensity={70} tint="dark" style={styles.voteOrderOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => handleVoteOrderChoice('see_first')} />
          <Pressable style={styles.voteOrderSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.voteOrderIcon}>
              <Ionicons name="podium-outline" size={28} color="#555" />
            </View>
            <Text style={styles.voteOrderTitle}>How do you like to rank?</Text>
            <Text style={styles.voteOrderBody}>
              Vote first for a more unbiased pick, or jump straight to see how others ranked.
            </Text>
            <TouchableOpacity
              style={styles.voteOrderBtn}
              onPress={() => handleVoteOrderChoice('vote_first')}
              activeOpacity={0.85}
            >
              <Text style={styles.voteOrderBtnText}>Vote First</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.voteOrderBtnSecondary}
              onPress={() => handleVoteOrderChoice('see_first')}
              activeOpacity={0.7}
            >
              <Text style={styles.voteOrderBtnSecondaryText}>See Results</Text>
            </TouchableOpacity>
          </Pressable>
        </BlurView>
      </Modal>

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
              <Ionicons name="pencil-outline" size={22} color={list.color} />
              <Text style={styles.sheetOptionText}>Type an item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => activeSlot !== null && openSearch(activeSlot)}
            >
              <Ionicons name="search-outline" size={22} color={list.color} />
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
            <Pressable style={[styles.sheet, list.suggestedOptions && styles.sheetTall]} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>
                {list.suggestedOptions ? 'Pick or type' : `Enter item for #${typeSlotIndex !== null ? typeSlotIndex + 1 : ''}`}
              </Text>
              <TextInput
                style={styles.typeInput}
                value={typedValue}
                onChangeText={setTypedValue}
                placeholder={list.suggestedOptions ? 'Search chains…' : 'Type a name…'}
                placeholderTextColor={colors.secondaryText}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => { if (typedValue.trim()) saveSlot(); }}
              />
              {list.suggestedOptions ? (
                <>
                  <FlatList
                    data={list.suggestedOptions.filter((opt, idx, arr) =>
                      arr.indexOf(opt) === idx && // dedupe
                      (!typedValue.trim() || opt.toLowerCase().includes(typedValue.toLowerCase()))
                    )}
                    keyExtractor={(item) => item}
                    style={styles.suggestionList}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.suggestionRow}
                        onPress={() => {
                          if (typeSlotIndex === null) return;
                          const updated = [...userSlots];
                          updated[typeSlotIndex] = item;
                          setUserSlots(communityListId, updated);
                          setShowTypeModal(false);
                          setTypedValue('');
                        }}
                      >
                        <Text style={styles.suggestionText}>{item}</Text>
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.suggestionSep} />}
                  />
                  {typedValue.trim() && (
                    <TouchableOpacity
                      style={[styles.saveButton, { backgroundColor: list.color }]}
                      onPress={saveSlot}
                    >
                      <Text style={styles.saveText}>Use "{typedValue.trim()}"</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.sheetHint}>
                    We try our best to match submissions, but type verbatim for the best chance of landing on the community list.
                  </Text>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: list.color }, !typedValue.trim() && styles.saveDisabled]}
                    disabled={!typedValue.trim()}
                    onPress={saveSlot}
                  >
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </>
              )}
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
  heroScrim: { backgroundColor: 'rgba(0,0,0,0.42)' },
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
  heroNavBtnWrap: {
    padding: 10,
    marginLeft: -10,
    marginTop: -10,
  },
  heroNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  heroNavBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNavCategory: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 26,
    marginBottom: 4,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  heroMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  heroVotedPill: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.lg,
    marginLeft: 2,
  },
  heroVotedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
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
  tabPillActive: { backgroundColor: 'transparent' }, // color applied inline via list.color
  tabPillText: { fontSize: 14, fontWeight: '600', color: colors.primaryText },
  tabPillTextActive: { color: '#FFF' },

  /* ── Shared ── */
  section: { marginHorizontal: spacing.lg },
  loadingIndicator: { marginTop: spacing.xxl },

  /* ── Sponsored row ── */
  sponsoredRow: {
    flexDirection: 'column',
    gap: 5,
    backgroundColor: 'rgba(255,200,0,0.06)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  sponsoredLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 1,
  },
  sponsoredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sponsoredName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  sponsoredCta: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },

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
  communityItemInfo: { flex: 1, gap: 1 },
  communityItemTitle: { fontSize: 15, fontWeight: '500', color: colors.primaryText },
  communityItemArtist: { fontSize: 12, color: colors.secondaryText },
  scoreCol: { alignItems: 'flex-end', gap: 3 },
  scoreBar: { height: 4, borderRadius: 2, minWidth: 4 }, // backgroundColor applied inline via list.color
  scorePts: { fontSize: 11, color: colors.secondaryText, fontWeight: '500' },

  /* ── Empty vote state ── */
  emptyVoteState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyVoteTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryText,
  },
  emptyVoteBody: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  emptyVoteButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyVoteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* ── Yours tab ── */
  yoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    ...shadow,
    shadowOpacity: 0.05,
  },
  swipeDeleteAction: {
    backgroundColor: '#FF3B30',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
  },
  yoursRowEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  yoursItemInfo: { flex: 1, gap: 1 },
  yoursItemTitle: { fontSize: 14, color: colors.primaryText },
  emptyText: { flex: 1, fontSize: 14, color: colors.secondaryText },
  moveButtons: { alignItems: 'center', gap: 2 },
  stickyFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.cardBackground,
    ...shadow,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  voteHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
  },
  submitButton: {
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    alignItems: 'center',
  }, // backgroundColor applied inline via list.color
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  voteHint: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  batchNotice: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  }, // backgroundColor applied inline via list.color
  shareButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  showMoreText: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  postToFeedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  postToFeedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  reportButtonText: {
    fontSize: 12,
    color: colors.secondaryText,
  },

  /* ── Modals ── */
  keyboardAvoid: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  voteOrderOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  voteOrderSheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl + 8,
    alignItems: 'center',
  },
  voteOrderIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  voteOrderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  voteOrderBody: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  voteOrderBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: borderRadius.squircle,
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: '#1C1C1E',
  },
  voteOrderBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  voteOrderBtnSecondary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: borderRadius.squircle,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  voteOrderBtnSecondaryText: {
    color: colors.secondaryText,
    fontSize: 15,
    fontWeight: '600',
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
    marginBottom: spacing.sm,
  },
  sheetHint: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 17,
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
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    alignItems: 'center',
  }, // backgroundColor applied inline via list.color
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  sheetTall: { maxHeight: '75%' },
  suggestionList: { flexGrow: 0, maxHeight: 300, marginBottom: spacing.sm },
  suggestionRow: { paddingVertical: 11, paddingHorizontal: spacing.sm },
  suggestionText: { fontSize: 15, color: colors.primaryText },
  suggestionSep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
