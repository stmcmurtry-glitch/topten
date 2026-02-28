import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface BackButtonProps {
  onPress: () => void;
  color?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ onPress, color = colors.primaryText }) => (
  <TouchableOpacity
    style={styles.button}
    onPress={onPress}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    activeOpacity={0.7}
  >
    <Ionicons name="chevron-back" size={24} color={color} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
