import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES } from '../data/categories';
import { colors, spacing, borderRadius } from '../theme';

interface Props {
  visible: boolean;
  selected: string;
  onSelect: (category: string) => void;
  onClose: () => void;
}

export const CategoryFilterSheet: React.FC<Props> = ({
  visible,
  selected,
  onSelect,
  onClose,
}) => {
  const handleSelect = (cat: string) => {
    onSelect(cat);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Filter by Category</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          {/* All option */}
          <TouchableOpacity
            style={[styles.cell, selected === 'All' && styles.cellActive]}
            onPress={() => handleSelect('All')}
            activeOpacity={0.7}
          >
            <View style={[styles.cellIcon, selected === 'All' && { backgroundColor: colors.activeTab }]}>
              <Ionicons
                name="apps-outline"
                size={20}
                color={selected === 'All' ? '#FFF' : colors.secondaryText}
              />
            </View>
            <Text style={[styles.cellLabel, selected === 'All' && styles.cellLabelActive]}>
              All
            </Text>
          </TouchableOpacity>

          {/* Category cells */}
          {CATEGORIES.map((cat) => {
            const active = selected === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                style={[styles.cell, active && styles.cellActive]}
                onPress={() => handleSelect(cat.label)}
                activeOpacity={0.7}
              >
                <View style={[styles.cellIcon, { backgroundColor: active ? cat.color : cat.color + '22' }]}>
                  <Ionicons
                    name={cat.icon as any}
                    size={20}
                    color={active ? '#FFF' : cat.color}
                  />
                </View>
                <Text style={[styles.cellLabel, active && styles.cellLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  cell: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    backgroundColor: colors.cardBackground,
  },
  cellActive: {
    backgroundColor: colors.cardBackground,
  },
  cellIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondaryText,
    textAlign: 'center',
  },
  cellLabelActive: {
    fontWeight: '700',
    color: colors.primaryText,
  },
});
