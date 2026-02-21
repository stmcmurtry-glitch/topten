import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { RankItem } from '../components/RankItem';
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
  const [typedValue, setTypedValue] = useState('');

  useEffect(() => {
    setSlots(buildSlots());
  }, [buildSlots]);

  useEffect(() => {
    if (list) {
      navigation.setOptions({ title: list.title });
    }
  }, [list, navigation]);

  const setSlotValue = (index: number, text: string) => {
    const updated = [...slots];
    updated[index] = text;
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

  const handleSlotPress = (index: number) => {
    setActiveSlot(index);
  };

  const handleTypeItem = () => {
    if (activeSlot === null) return;
    setActiveSlot(null);
    setTypedValue('');
    setShowTypeModal(true);
  };

  const handleFindItem = () => {
    if (activeSlot === null) return;
    const rank = activeSlot + 1;
    const category = list?.category ?? '';
    const slotIndex = activeSlot;
    setActiveSlot(null);
    navigation.navigate('Search', { listId, rank, category });
  };

  const handleTypeSave = () => {
    if (activeSlot === null && !showTypeModal) return;
    if (typedValue.trim()) {
      // activeSlot was saved before opening type modal, use the stored ref
      const idx = typeSlotRef;
      if (idx !== null) {
        setSlotValue(idx, typedValue.trim());
      }
    }
    setShowTypeModal(false);
    setTypedValue('');
  };

  // We need a ref to track which slot the type modal is for
  const [typeSlotRef, setTypeSlotRef] = useState<number | null>(null);

  const openTypeModal = (index: number) => {
    setActiveSlot(null);
    setTypeSlotRef(index);
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
        renderItem={({ item, index }) => (
          <RankItem
            rank={index + 1}
            title={item}
            isEmpty={!item}
            onPress={() => handleSlotPress(index)}
          />
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteList}>
            <Text style={styles.deleteText}>Delete List</Text>
          </TouchableOpacity>
        }
      />

      {/* Choice Modal — Type or Find */}
      <Modal visible={activeSlot !== null} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setActiveSlot(null)}>
          <View style={styles.sheet}>
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
          </View>
        </Pressable>
      </Modal>

      {/* Type Item Modal */}
      <Modal visible={showTypeModal} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowTypeModal(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              Enter item for #{typeSlotRef !== null ? typeSlotRef + 1 : ''}
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
                if (typedValue.trim() && typeSlotRef !== null) {
                  setSlotValue(typeSlotRef, typedValue.trim());
                  setShowTypeModal(false);
                  setTypedValue('');
                }
              }}
            />
            <TouchableOpacity
              style={[styles.saveButton, !typedValue.trim() && styles.saveDisabled]}
              disabled={!typedValue.trim()}
              onPress={() => {
                if (typeSlotRef !== null) {
                  setSlotValue(typeSlotRef, typedValue.trim());
                  setShowTypeModal(false);
                  setTypedValue('');
                }
              }}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
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
