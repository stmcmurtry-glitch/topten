import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

export type ReactionType = 'like' | 'hot' | 'debatable' | 'agree';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like',      emoji: '❤️',  label: 'Like'      },
  { type: 'hot',       emoji: '🔥',  label: 'Hot take'  },
  { type: 'debatable', emoji: '🤔',  label: 'Debatable' },
  { type: 'agree',     emoji: '💯',  label: 'Agree'     },
];

interface Props {
  postId?: string;
  commentId?: string;
  counts: { like: number; hot: number; debatable: number; agree: number };
  myReaction: string | null;
  onReact: (type: ReactionType | null) => void;
  compact?: boolean;
}

export const ReactionBar: React.FC<Props> = ({ postId, commentId, counts, myReaction, onReact, compact }) => {
  const handlePress = (type: ReactionType) => {
    const next = myReaction === type ? null : type;
    onReact(next);
  };

  return (
    <View style={[styles.bar, compact && styles.barCompact]}>
      {REACTIONS.map(({ type, emoji, label }) => {
        const isActive = myReaction === type;
        const count = counts[type];
        return (
          <TouchableOpacity
            key={type}
            style={[styles.btn, isActive && styles.btnActive, compact && styles.btnCompact]}
            onPress={() => handlePress(type)}
            activeOpacity={0.7}
          >
            <Text style={compact ? styles.emojiCompact : styles.emoji}>{emoji}</Text>
            {(!compact || count > 0) && (
              <Text style={[styles.count, isActive && styles.countActive, compact && styles.countCompact]}>
                {count > 0 ? count : (compact ? null : label)}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  barCompact: {
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
    gap: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  btnActive: {
    backgroundColor: 'rgba(204,0,0,0.08)',
    borderColor: 'rgba(204,0,0,0.3)',
  },
  btnCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emoji: {
    fontSize: 16,
  },
  emojiCompact: {
    fontSize: 12,
  },
  count: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  countActive: {
    color: colors.activeTab,
    fontWeight: '700',
  },
  countCompact: {
    fontSize: 12,
  },
});
