import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ListProvider } from './src/data/ListContext';
import { TabNavigator } from './src/navigation/TabNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ListProvider>
        <NavigationContainer>
          <TabNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </ListProvider>
    </GestureHandlerRootView>
  );
}
