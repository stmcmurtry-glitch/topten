import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ListProvider } from './src/data/ListContext';
import { TabNavigator } from './src/navigation/TabNavigator';

export default function App() {
  return (
    <ListProvider>
      <NavigationContainer>
        <TabNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </ListProvider>
  );
}
