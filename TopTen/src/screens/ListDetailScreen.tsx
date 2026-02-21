import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { TopTenItem } from '../data/schema';
import { colors, spacing, borderRadius } from '../theme';

export const ListDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { listId } = route.params;
  const { lists, updateListItems, deleteList } = useListContext();
  const list = lists.find((l) => l.id === listId);

  const buildSlots = useCallback((): string[] => {
    const slots = Array(10).fill('');
    list?.items.forEach((item) => {
      if (item.rank >= 1 && item.rank <= 10) {
        slots[item.rank - 1] = item.title;
      }
    });
    return slots;
  }, [list]);

  const [slots, setSlots] = useState<string[]>(buildSlots);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeSlotIndex, setTypeSlotIndex] = useState<number | null>(null);
  const [typedValue, setTypedValue] = useState('');

  useEffect(() => {
    setSlots(buildSlots());
  }, [buildSlots]);

  useEffect(() => {
    if (list) {
      navigation.setOptions({ title: list.title });
    }
  }, [list, navigation]);

  const persistSlots = (updated: string[]) => {
    setSlots(updated);
    const items: TopTenItem[] = updated
      .map((title, i) => ({
        id: `${listId}-${i + 1}`,
        rank: i + 1,
        title,
      }))
      .filter((item) => item.title.trim() !== '');
    updateListItems(listId, items);
  };

  const setSlotValue = (index: number, text: string) => {
    const updated = [...slots];
    updated[index] = text;
    persistSlots(updated);
  };

  const moveSlot = (from: number, to: number) => {
    if (to < 0 || to >= 10) return;
    const updated = [...slots];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    persistSlots(updated);
  };

  const openChoiceSheet = (index: number) => {
    setActiveSlot(index);
  };

  const openTypeModal = (index: number) => {
    setActiveSlot(null);
    setTypeSlotIndex(index);
    setTypedValue('');
    setShowTypeModal(true);
  };

  const openSearch = (index: number) => {
    const rank = index + 1;
    const category = list?.category ?? '';
    setActiveSlot(null);
    navigation.navigate('Search', { listId, rank, category });
  };

  const handleDeleteList = () => {
    Alert.alert(
      'Delete List',
      'Are you sure you want to delete this list? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteList(listId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (!list) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={slots}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const isEmpty = !item;
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openChoiceSheet(index)}
              style={[styles.row, isEmpty && styles.emptyRow]}
            >
              <View style={[styles.rankBadge, isEmpty && styles.emptyRankBadge]}>
                <Text style={[styles.rankText, isEmpty && styles.emptyRankText]}>{index + 1}</Text>
              </View>

              {isEmpty ? (
                <>
                  <Text style={styles.emptyText}>Add an item</Text>
                  <Ionicons name="add" size={16} color={colors.border} />
                </>
              ) : (
                <>
                  <Text style={styles.title} numberOfLines={1}>{item}</Text>
                  <View style={styles.moveButtons}>
                    <TouchableOpacity
                      onPress={() => moveSlot(index, index - 1)}
                      disabled={index === 0}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={20}
                        color={index === 0 ? colors.border : colors.secondaryText}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveSlot(index, index + 1)}
                      disabled={index === 9}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={index === 9 ? colors.border : colors.secondaryText}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteList}>
            <Text style={styles.deleteText}>Delete List</Text>
          </TouchableOpacity>
        }
      />

      {/* Choice Modal — Type or Find */}
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

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setActiveSlot(null)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Type Item Modal */}
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
              onSubmitEditing={() => {
                if (typedValue.trim() && typeSlotIndex !== null) {
                  setSlotValue(typeSlotIndex, typedValue.trim());
                  setShowTypeModal(false);
                  setTypedValue('');
                }
              }}
            />
            <TouchableOpacity
              style={[styles.saveButton, !typedValue.trim() && styles.saveDisabled]}
              disabled={!typedValue.trim()}
              onPress={() => {
                if (typeSlotIndex !== null) {
                  setSlotValue(typeSlotIndex, typedValue.trim());
                  setShowTypeModal(false);
                  setTypedValue('');
                }
              }}
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
  list: {
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    gap: spacing.md,
  },
  emptyRow: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.activeTab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRankBadge: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyRankText: {
    color: colors.secondaryText,
    fontWeight: '400',
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
  },
  emptyText: {
    flex: 1,
    fontSize: 16,
    color: colors.secondaryText,
  },
  moveButtons: {
    alignItems: 'center',
    gap: 2,
  },
  deleteButton: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  keyboardAvoid: {
    flex: 1,
  },
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
  sheetOptionText: {
    fontSize: 17,
    color: colors.primaryText,
  },
  cancelButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelText: {
    fontSize: 17,
    color: colors.secondaryText,
  },
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
  saveDisabled: {
    opacity: 0.4,
  },
  saveText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
