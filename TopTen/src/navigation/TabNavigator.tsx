import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MyListsScreen } from '../screens/MyListsScreen';
import { ListDetailScreen } from '../screens/ListDetailScreen';
import { CreateListScreen } from '../screens/CreateListScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MyListsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="MyListsHome"
      component={MyListsScreen}
      options={{ title: 'My Lists', headerLargeTitle: true }}
    />
    <Stack.Screen
      name="ListDetail"
      component={ListDetailScreen}
      options={{ title: 'List' }}
    />
    <Stack.Screen
      name="CreateList"
      component={CreateListScreen}
      options={{ presentation: 'modal', title: 'New List' }}
    />
    <Stack.Screen
      name="Search"
      component={SearchScreen}
      options={{ title: 'Search' }}
    />
  </Stack.Navigator>
);

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarActiveTintColor: colors.activeTab,
      tabBarInactiveTintColor: colors.inactiveTab,
    }}
  >
    <Tab.Screen
      name="MyLists"
      component={MyListsStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="list" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Discover"
      component={DiscoverScreen}
      options={{
        headerShown: true,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="compass-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        headerShown: true,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="settings-outline" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);
