import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { CATEGORY_COLORS } from './FeedRow';

const SCREEN_W = Dimensions.get('window').width;
export const CARD_WIDTH = SCREEN_W - 48;
export const CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9));

interface Props {
  title: string;
  category: string;
  items: string[]; // only filled slots, in rank order
}

export const ShareCard = React.forwardRef<View, Props>(({ title, category, items }, ref) => {
  const accentColor = CATEGORY_COLORS[category] ?? '#CC0000';
  const filled = items.filter((t) => t.trim());

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* Top accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>TT</Text>
        </View>
        <Text style={styles.logoLabel}>TOP TEN</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Category + Title */}
      <Text style={[styles.category, { color: accentColor }]}>{category.toUpperCase()}</Text>
      <Text style={styles.title} numberOfLines={3}>{title}</Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Items */}
      <View style={styles.itemsContainer}>
        {filled.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={[styles.rank, { color: accentColor }]}>
              {String(idx + 1).padStart(2, '0')}
            </Text>
            <Text style={styles.itemText} numberOfLines={1}>{item}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        <Text style={styles.footerText}>topten.app</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#0F0F0F',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 28,
    paddingTop: 0,
    justifyContent: 'flex-start',
  },

  /* Top accent */
  accentBar: {
    height: 4,
    marginHorizontal: -28,
    marginBottom: 24,
  },

  /* Logo */
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#CC0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  logoLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 3,
  },

  /* Divider */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
  },

  /* Category + Title */
  category: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 20,
  },

  /* Items */
  itemsContainer: {
    flex: 1,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rank: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    width: 22,
    textAlign: 'right',
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: -0.1,
  },

  /* Footer */
  footer: {
    marginTop: 'auto',
    paddingTop: 4,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5,
    fontWeight: '500',
  },
});
