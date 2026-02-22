import 'react-native-url-polyfill/auto';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ListProvider } from './src/data/ListContext';
import { CommunityProvider } from './src/context/CommunityContext';
import { TabNavigator } from './src/navigation/TabNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ListProvider>
        <CommunityProvider>
          <NavigationContainer>
            <TabNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </CommunityProvider>
      </ListProvider>
    </GestureHandlerRootView>
  );
}
