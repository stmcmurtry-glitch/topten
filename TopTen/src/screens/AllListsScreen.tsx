import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { TopTenList } from '../data/schema';
import { colors, spacing, borderRadius, shadow } from '../theme';

export const AllListsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { lists, reorderLists } = useListContext();
  const insets = useSafeAreaInsets();
  const [showAll, setShowAll] = React.useState(false);

  const visibleLists = showAll ? lists : lists.slice(0, 10);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...lists];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    reorderLists(next);
  };

  const moveDown = (index: number) => {
    if (index === lists.length - 1) return;
    const next = [...lists];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    reorderLists(next);
  };

  const renderItem = ({ item, index }: { item: TopTenList; index: number }) => {
    const thumbColor = CATEGORY_COLORS[item.category] ?? '#AAAAAA';
    return (
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ListDetail', { listId: item.id })}
          style={styles.rowContent}
          activeOpacity={0.7}
        >
          <Text style={styles.rankNumber}>{index + 1}</Text>
          <View style={[styles.thumbnail, { backgroundColor: thumbColor }]}>
            <Ionicons name={item.icon as any} size={22} color="#FFF" />
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.items.length} of 10 filled</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            onPress={() => moveUp(index)}
            disabled={index === 0}
            hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-up"
              size={20}
              color={index === 0 ? colors.border : colors.secondaryText}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => moveDown(index)}
            disabled={index === lists.length - 1}
            hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={index === lists.length - 1 ? colors.border : colors.secondaryText}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.activeTab} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Lists</Text>
        <View style={{ width: 28 }} />
      </View>
      <FlatList
        data={visibleLists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          !showAll && lists.length > 10 ? (
            <TouchableOpacity style={styles.seeMore} onPress={() => setShowAll(true)} activeOpacity={0.7}>
              <Text style={styles.seeMoreText}>See more</Text>
              <Ionicons name="chevron-down" size={14} color={colors.activeTab} />
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
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
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    ...shadow,
    shadowOpacity: 0.06,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  rankNumber: {
    width: 20,
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondaryText,
    textAlign: 'right',
    flexShrink: 0,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  reorderButtons: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  separator: {
    height: spacing.sm,
  },
  seeMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.lg,
  },
  seeMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.activeTab,
  },
});
