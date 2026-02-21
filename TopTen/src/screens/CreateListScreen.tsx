import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useListContext } from '../data/ListContext';
import { colors, spacing, borderRadius } from '../theme';

export const CreateListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [name, setName] = useState('');
  const { addList } = useListContext();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          disabled={!name.trim()}
          onPress={() => {
            const id = addList(name.trim());
            navigation.replace('ListDetail', { listId: id });
          }}
        >
          <Text style={[styles.headerButton, styles.createButton, !name.trim() && styles.disabled]}>
            Create
          </Text>
        </TouchableOpacity>
      ),
      title: 'New List',
    });
  }, [navigation, name, addList]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>List Name</Text>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Restaurants, Albums, TV Shows…"
        placeholderTextColor={colors.secondaryText}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={() => {
          if (name.trim()) {
            const id = addList(name.trim());
            navigation.replace('ListDetail', { listId: id });
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    fontSize: 17,
    color: colors.primaryText,
  },
  headerButton: {
    fontSize: 17,
    color: colors.activeTab,
  },
  createButton: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
});
