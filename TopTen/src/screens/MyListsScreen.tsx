import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { ListCard } from '../components/ListCard';
import { colors, spacing } from '../theme';

export const MyListsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { lists } = useListContext();

  const handleAddCustom = () => {
    navigation.navigate('CreateList');
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={lists}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <ListCard
            list={item}
            onPress={() => navigation.navigate('ListDetail', { listId: item.id })}
          />
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.addButton} onPress={handleAddCustom}>
            <Ionicons name="add-circle-outline" size={24} color={colors.activeTab} />
            <Text style={styles.addText}>Add Custom List</Text>
          </TouchableOpacity>
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
  grid: {
    padding: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    margin: spacing.sm,
    gap: spacing.sm,
  },
  addText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.activeTab,
  },
});
