import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
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
  const { userRankings, getLiveScores, setUserOrder, submitRanking } = useCommunity();

  const list = COMMUNITY_LISTS.find((l) => l.id === communityListId);
  const [activeTab, setActiveTab] = useState<'community' | 'yours'>('community');

  const ranking = userRankings[communityListId];
  const submitted = ranking?.submitted ?? false;

  const userOrderedIds: string[] = useMemo(() => {
    if (ranking?.orderedIds?.length) return ranking.orderedIds;
    return list ? list.items.map((i) => i.id) : [];
  }, [ranking, list]);

  const liveScores = useMemo(
    () => getLiveScores(communityListId),
    [getLiveScores, communityListId, ranking]
  );

  if (!list) return null;

  // Community tab: items sorted by live score desc
  const communityRanked = useMemo(() => {
    return [...list.items].sort((a, b) => (liveScores[b.id] ?? 0) - (liveScores[a.id] ?? 0));
  }, [list, liveScores]);

  const maxScore = communityRanked.length > 0 ? (liveScores[communityRanked[0].id] ?? 1) : 1;

  // Yours tab: items in user's current order
  const yoursItems = useMemo(() => {
    return userOrderedIds
      .map((id) => list.items.find((i) => i.id === id))
      .filter(Boolean) as typeof list.items;
  }, [userOrderedIds, list]);

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= yoursItems.length) return;
    const updated = [...userOrderedIds];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setUserOrder(communityListId, updated);
  };

  const participantDisplay = list.participantCount.toLocaleString();

  const Hero = (
    <View style={[styles.hero, { paddingTop: insets.top + 46 }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: list.color }]} />
      <View style={[StyleSheet.absoluteFill, styles.heroScrim]} />

      {/* Nav bar */}
      <View style={[styles.heroNav, { top: insets.top + 6 }]}>
        <TouchableOpacity style={styles.heroNavBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.heroNavTitle} numberOfLines={1}>{list.title}</Text>
        <View style={styles.heroBadge}>
          {submitted && (
            <View style={styles.votedBadge}>
              <Text style={styles.votedBadgeText}>Voted ✓</Text>
            </View>
          )}
          {!submitted && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{participantDisplay} voted</Text>
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      <View style={styles.heroContent}>
        <Text style={styles.heroDescription}>{list.description}</Text>
      </View>
    </View>
  );

  const TabSwitcher = (
    <View style={styles.tabRow}>
      <TouchableOpacity
        style={[styles.tabPill, activeTab === 'community' && styles.tabPillActive]}
        onPress={() => setActiveTab('community')}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabPillText, activeTab === 'community' && styles.tabPillTextActive]}>
          Community
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabPill, activeTab === 'yours' && styles.tabPillActive]}
        onPress={() => setActiveTab('yours')}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabPillText, activeTab === 'yours' && styles.tabPillTextActive]}>
          Yours
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {Hero}
        {TabSwitcher}

        {activeTab === 'community' && (
          <View style={styles.section}>
            {communityRanked.map((item, idx) => {
              const score = liveScores[item.id] ?? 0;
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
            })}
          </View>
        )}

        {activeTab === 'yours' && (
          <View style={styles.section}>
            {yoursItems.map((item, idx) => (
              <View key={item.id} style={styles.yoursRow}>
                <Text style={styles.rankNum}>{idx + 1}</Text>
                <Text style={styles.yoursItemTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.moveButtons}>
                  <TouchableOpacity
                    onPress={() => moveItem(idx, idx - 1)}
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
                    onPress={() => moveItem(idx, idx + 1)}
                    disabled={idx === yoursItems.length - 1}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={idx === yoursItems.length - 1 ? colors.border : colors.secondaryText}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => submitRanking(communityListId)}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {submitted ? 'Update My Ranking' : 'Submit My Ranking'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Hero ── */
  hero: {
    justifyContent: 'flex-end',
  },
  heroScrim: {
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  heroNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.2,
  },
  heroBadge: {
    width: 80,
    alignItems: 'flex-end',
  },
  votedBadge: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.lg,
  },
  votedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  countBadge: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.lg,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
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

  /* ── Tab switcher ── */
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
  tabPillActive: {
    backgroundColor: '#CC0000',
    borderColor: '#CC0000',
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  tabPillTextActive: {
    color: '#FFF',
  },

  /* ── Shared section ── */
  section: {
    marginHorizontal: spacing.lg,
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
  communityItemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.primaryText,
  },
  scoreCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  scoreBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CC0000',
    minWidth: 4,
  },
  scorePts: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: '500',
  },

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
  yoursItemTitle: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
  },
  moveButtons: {
    alignItems: 'center',
    gap: 2,
  },
  submitButton: {
    backgroundColor: '#CC0000',
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
