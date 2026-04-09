import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Share,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '../services/supabase';
import { FeedPost } from '../data/feedTypes';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { rowToPost } from '../hooks/useCityFeedPreview';
import { useAuth } from '../context/AuthContext';
import { FollowButton } from '../components/FollowButton';
import { ReactionBar, ReactionType } from '../components/ReactionBar';

function timeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(epochMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgoShort(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(epochMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  body: string;
  created_at: string;
  hidden?: boolean;
}

type CommentReactionState = {
  counts: { like: number; hot: number; debatable: number; agree: number };
  myReaction: ReactionType | null;
};

const ZERO_COUNTS = { like: 0, hot: 0, debatable: 0, agree: 0 };

const REACTION_EMOJIS: { type: ReactionType; emoji: string }[] = [
  { type: 'like', emoji: '❤️' },
  { type: 'hot', emoji: '🔥' },
  { type: 'debatable', emoji: '🤔' },
  { type: 'agree', emoji: '💯' },
];

const CommentReactionRow: React.FC<{
  state: CommentReactionState;
  onReact: (type: ReactionType) => void;
}> = ({ state, onReact }) => (
  <View style={crStyles.row}>
    {REACTION_EMOJIS.map(({ type, emoji }) => (
      <TouchableOpacity key={type} onPress={() => onReact(type)} activeOpacity={0.6}>
        <Text style={[crStyles.item, state.myReaction === type && crStyles.itemActive]}>
          {emoji}{state.counts[type] > 0 ? ` ${state.counts[type]}` : ''}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const crStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 5,
  },
  item: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  itemActive: {
    color: colors.activeTab,
    fontWeight: '700',
  },
});

export const PublishedListScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { postId } = route.params as { postId: string };
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);

  // Reactions state
  const [reactionCounts, setReactionCounts] = useState({ like: 0, hot: 0, debatable: 0, agree: 0 });
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentReactions, setCommentReactions] = useState<Record<string, CommentReactionState>>({});
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase
      .from('community_feed_posts')
      .select('*')
      .eq('id', postId)
      .single()
      .then(({ data }) => {
        if (data) setPost(rowToPost(data));
        setLoading(false);
      });
  }, [postId]);

  // Load reactions
  useEffect(() => {
    if (!supabase) return;
    Promise.resolve(
      supabase.from('post_reactions').select('reaction_type, user_id').eq('post_id', postId)
    ).then(({ data }) => {
      const rows = data ?? [];
      const counts = { like: 0, hot: 0, debatable: 0, agree: 0 };
      for (const row of rows) {
        const t = row.reaction_type as ReactionType;
        if (t in counts) counts[t]++;
      }
      setReactionCounts(counts);
      if (user) {
        const mine = rows.find((r: any) => r.user_id === user.id);
        setMyReaction(mine ? (mine.reaction_type as ReactionType) : null);
      }
    }).catch(() => {});
  }, [postId, user?.id]);

  // Load comments + comment reactions
  useEffect(() => {
    if (!supabase) return;
    Promise.resolve(
      supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('hidden', false)
        .order('created_at', { ascending: true })
        .limit(50)
    ).then(({ data }) => {
      const loadedComments = (data ?? []) as Comment[];
      setComments(loadedComments);
      if (loadedComments.length === 0) return;
      const ids = loadedComments.map((c) => c.id);
      Promise.resolve(
        supabase!.from('comment_reactions').select('comment_id, reaction_type, user_id').in('comment_id', ids)
      ).then(({ data: rxData }) => {
        const rows = rxData ?? [];
        const map: Record<string, CommentReactionState> = {};
        for (const id of ids) {
          map[id] = { counts: { ...ZERO_COUNTS }, myReaction: null };
        }
        for (const row of rows) {
          const cid = row.comment_id as string;
          const t = row.reaction_type as ReactionType;
          if (map[cid] && t in map[cid].counts) map[cid].counts[t]++;
          if (user && row.user_id === user.id) map[cid].myReaction = t;
        }
        setCommentReactions(map);
      }).catch(() => {});
    }).catch(() => {});
  }, [postId, user?.id]);

  const handleReact = (type: ReactionType | null) => {
    if (!user) { navigation.navigate('AuthScreen'); return; }

    setReactionCounts((prev) => {
      const next = { ...prev };
      if (myReaction && myReaction in next) next[myReaction] = Math.max(0, next[myReaction] - 1);
      if (type && type in next) next[type]++;
      return next;
    });
    setMyReaction(type);

    if (!supabase) return;
    if (type === null) {
      Promise.resolve(
        supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', user.id)
      ).catch(() => {});
    } else {
      Promise.resolve(
        supabase.from('post_reactions').upsert(
          { post_id: postId, user_id: user.id, reaction_type: type },
          { onConflict: 'post_id,user_id' }
        )
      ).catch(() => {});
    }
  };

  const handleSubmitComment = async () => {
    const body = commentText.trim();
    if (!body || !user || !supabase) return;
    setSubmittingComment(true);

    // AI pre-moderation — fail open
    try {
      const { data: mod } = await supabase.functions.invoke('moderate-comment', { body: { body } });
      if (mod && !mod.allowed) {
        Alert.alert('Comment not allowed', mod.reason ?? 'This violates our community guidelines.');
        setSubmittingComment(false);
        return;
      }
    } catch { /* fail open */ }

    const newComment: Omit<Comment, 'id' | 'created_at' | 'hidden'> = {
      post_id: postId,
      user_id: user.id,
      username: userProfile?.username ?? null,
      avatar_url: userProfile?.avatar_url ?? null,
      body,
    };

    const { data, error } = await supabase.from('post_comments').insert(newComment).select().single();
    if (!error && data) {
      const inserted = data as Comment;
      setComments((prev) => [...prev, inserted]);
      setCommentReactions((prev) => ({ ...prev, [inserted.id]: { counts: { ...ZERO_COUNTS }, myReaction: null } }));
      setCommentText('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
    setSubmittingComment(false);
  };

  const handleCommentReact = (commentId: string, type: ReactionType) => {
    if (!user) { navigation.navigate('AuthScreen'); return; }

    let nextType: ReactionType | null = type;
    setCommentReactions((prev) => {
      const cur = prev[commentId] ?? { counts: { ...ZERO_COUNTS }, myReaction: null };
      const next = { ...cur, counts: { ...cur.counts }, myReaction: cur.myReaction };
      if (next.myReaction === type) {
        next.counts[type] = Math.max(0, next.counts[type] - 1);
        next.myReaction = null;
        nextType = null;
      } else {
        if (next.myReaction && next.myReaction in next.counts) {
          next.counts[next.myReaction] = Math.max(0, next.counts[next.myReaction] - 1);
        }
        next.counts[type]++;
        next.myReaction = type;
      }
      return { ...prev, [commentId]: next };
    });

    if (!supabase) return;
    if (nextType === null) {
      Promise.resolve(supabase.from('comment_reactions').delete().eq('comment_id', commentId).eq('user_id', user.id)).catch(() => {});
    } else {
      Promise.resolve(supabase.from('comment_reactions').upsert({ comment_id: commentId, user_id: user.id, reaction_type: nextType }, { onConflict: 'comment_id,user_id' })).catch(() => {});
    }
  };

  const handleLongPressComment = (comment: Comment) => {
    const isOwn = user?.id === comment.user_id;
    if (isOwn) {
      Alert.alert('Comment', undefined, [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Delete comment?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  setComments((prev) => prev.filter((c) => c.id !== comment.id));
                  if (supabase) {
                    Promise.resolve(
                      supabase.from('post_comments').delete().eq('id', comment.id)
                    ).catch(() => {});
                  }
                },
              },
            ]);
          },
        },
        { text: 'Report', onPress: () => promptReport(comment.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Comment', undefined, [
        { text: 'Report', onPress: () => promptReport(comment.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const promptReport = (commentId: string) => {
    Alert.alert('Report comment', 'Why are you reporting this comment?', [
      {
        text: 'Spam',
        onPress: () => submitReport(commentId, 'Spam'),
      },
      {
        text: 'Offensive language',
        onPress: () => submitReport(commentId, 'Offensive language'),
      },
      {
        text: 'Harassment',
        onPress: () => submitReport(commentId, 'Harassment'),
      },
      {
        text: 'Other',
        onPress: () => submitReport(commentId, 'Other'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitReport = (commentId: string, reason: string) => {
    if (!user || !supabase) return;
    Promise.resolve(
      supabase.from('comment_reports').insert({ comment_id: commentId, reporter_id: user.id, reason })
    ).then(() => {
      Alert.alert('Thanks', "We'll review this comment.");
    }).catch(() => {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    });
  };

  const isOwner = !!user && post?.userId === user.id;

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Remove this post from the community feed? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase!.from('community_feed_posts').delete().eq('id', postId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    if (!post) return;
    const text = [
      `${post.title} — shared from TopX`,
      ...post.items.slice(0, 5).map((item, i) => `${i + 1}. ${item}`),
    ].join('\n');
    Share.share({ message: text });
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.activeTab} style={{ marginTop: spacing.xxl }} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtnAbs} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <BlurView intensity={50} tint="light" style={styles.backBtnInner}>
            <Ionicons name="chevron-back" size={20} color={colors.primaryText} />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.notFound}>Post not found.</Text>
      </View>
    );
  }

  const categoryColor = CATEGORY_COLORS[post.category] ?? '#CC0000';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 52 }]}>
          {post.coverImageUri ? (
            <Image source={{ uri: post.coverImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <>
              <LinearGradient
                colors={['#000000', categoryColor]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </>
          )}
          <View style={[StyleSheet.absoluteFill, styles.heroScrim]} />

          {/* Nav */}
          <View style={[styles.heroNav, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.heroNavBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
              <BlurView intensity={60} tint="dark" style={styles.heroNavBtnInner}>
                <Ionicons name="chevron-back" size={20} color="#FFF" />
              </BlurView>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {isOwner && (
                <TouchableOpacity style={styles.heroNavBtn} onPress={handleDelete} activeOpacity={0.75}>
                  <BlurView intensity={60} tint="dark" style={styles.heroNavBtnInner}>
                    <Ionicons name="trash-outline" size={17} color="#FF6B6B" />
                  </BlurView>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.heroNavBtn} onPress={handleShare} activeOpacity={0.75}>
                <BlurView intensity={60} tint="dark" style={styles.heroNavBtnInner}>
                  <Ionicons name="share-outline" size={18} color="#FFF" />
                </BlurView>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero content */}
          <View style={styles.heroContent}>
            <Text style={styles.heroCategory}>{post.category.toUpperCase()}</Text>
            <Text style={styles.heroTitle} numberOfLines={3}>{post.title.replace(/\s+/g, ' ').trim()}</Text>
          </View>
        </View>

        {/* Publisher row */}
        <View style={styles.publisherRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('UserProfile', { userId: post.userId })}
            activeOpacity={0.8}
            style={styles.publisherTouchable}
          >
            {post.avatarUrl ? (
              <Image source={{ uri: post.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={16} color={colors.secondaryText} />
              </View>
            )}
            <View style={styles.publisherInfo}>
              <Text style={styles.publisherName}>{post.username ?? 'Anonymous'}</Text>
              <Text style={styles.publisherMeta}>{timeAgo(post.publishedAt)} · {post.cityName}</Text>
            </View>
          </TouchableOpacity>
          <FollowButton targetUserId={post.userId} />
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{post.category}</Text>
          </View>
        </View>

        {/* Blurb */}
        {!!post.blurb && (
          <Text style={styles.blurb}>{post.blurb!.replace(/\s+/g, ' ').trim()}</Text>
        )}

        {/* Numbered items */}
        <View style={styles.itemsList}>
          {post.items.map((item, i) => (
            <React.Fragment key={i}>
              <View style={styles.itemRow}>
                <Text style={styles.itemRank}>{i + 1}</Text>
                <Text style={styles.itemTitle}>{item.replace(/\s+/g, ' ').trim()}</Text>
              </View>
              {i < post.items.length - 1 && <View style={styles.itemDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Reaction bar */}
        <View style={styles.reactionSection}>
          <ReactionBar
            postId={postId}
            counts={reactionCounts}
            myReaction={myReaction}
            onReact={handleReact}
          />
        </View>

        {/* Comments section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>Comments</Text>
          {comments.length === 0 && (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          )}
          {comments.map((c) => (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.85}
              onLongPress={() => handleLongPressComment(c)}
            >
              <View style={styles.commentRow}>
                {c.avatar_url ? (
                  <Image source={{ uri: c.avatar_url }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatar, styles.commentAvatarFallback]}>
                    <Ionicons name="person" size={13} color={colors.secondaryText} />
                  </View>
                )}
                <View style={styles.commentBody}>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentUsername}>{c.username ?? 'Anonymous'}</Text>
                    <Text style={styles.commentTime}>{timeAgoShort(new Date(c.created_at).getTime())}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.body}</Text>
                  <CommentReactionRow
                    state={commentReactions[c.id] ?? { counts: ZERO_COUNTS, myReaction: null }}
                    onReact={(type) => handleCommentReact(c.id, type)}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Comment input bar — only shown for signed-in users */}
      {user && (
        <View style={[styles.commentInputBar, { paddingBottom: insets.bottom + 4 }]}>
          <TextInput
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment…"
            placeholderTextColor={colors.secondaryText}
            returnKeyType="send"
            onSubmitEditing={handleSubmitComment}
            blurOnSubmit={false}
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!commentText.trim() || submittingComment) && styles.sendBtnDisabled]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submittingComment}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={18} color={commentText.trim() ? colors.activeTab : colors.secondaryText} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notFound: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    color: colors.secondaryText,
    fontSize: 15,
  },
  hero: {
    minHeight: 200,
    justifyContent: 'flex-end',
  },
  heroScrim: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroNav: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroNavBtn: {},
  heroNavBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  heroCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  publisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  publisherTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publisherInfo: {
    flex: 1,
    flexShrink: 1,
  },
  publisherName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  publisherMeta: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  categoryPill: {
    backgroundColor: 'rgba(204,0,0,0.08)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.activeTab,
  },
  blurb: {
    fontSize: 15,
    fontStyle: 'italic',
    color: colors.secondaryText,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  itemsList: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 22 + spacing.md,
  },
  itemRank: {
    width: 22,
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
    textAlign: 'right',
    marginTop: 2,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
    lineHeight: 22,
  },
  backBtnAbs: {
    margin: spacing.lg,
  },
  backBtnInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
  },

  /* ── Reactions ── */
  reactionSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.lg,
  },

  /* ── Comments ── */
  commentsSection: {
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  commentsHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: spacing.md,
  },
  noComments: {
    fontSize: 14,
    color: colors.secondaryText,
    paddingVertical: spacing.sm,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginTop: 2,
  },
  commentAvatarFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  commentTime: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  commentText: {
    fontSize: 14,
    color: colors.primaryText,
    lineHeight: 20,
  },

  /* ── Comment input bar ── */
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.cardBackground,
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    fontSize: 15,
    color: colors.primaryText,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 38,
  },
  sendBtn: {
    padding: 8,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
