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

const sharedStackOptions = {
  headerLargeTitle: true,
  headerLargeTitleStyle: { fontFamily: 'System', fontWeight: '700' as const },
  headerTitleStyle: { fontFamily: 'System', fontWeight: '600' as const },
};

const MyListsStack = () => (
  <Stack.Navigator screenOptions={sharedStackOptions}>
    <Stack.Screen
      name="MyListsHome"
      component={MyListsScreen}
      options={{ title: 'My Lists' }}
    />
    <Stack.Screen
      name="ListDetail"
      component={ListDetailScreen}
      options={{ title: 'List', headerLargeTitle: false }}
    />
    <Stack.Screen
      name="CreateList"
      component={CreateListScreen}
      options={{ presentation: 'modal', title: 'New List', headerLargeTitle: false }}
    />
    <Stack.Screen
      name="Search"
      component={SearchScreen}
      options={{ title: 'Search', headerLargeTitle: false }}
    />
  </Stack.Navigator>
);

const DiscoverStack = () => (
  <Stack.Navigator screenOptions={sharedStackOptions}>
    <Stack.Screen
      name="DiscoverHome"
      component={DiscoverScreen}
      options={{ title: 'Discover' }}
    />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator screenOptions={sharedStackOptions}>
    <Stack.Screen
      name="SettingsHome"
      component={SettingsScreen}
      options={{ title: 'Settings' }}
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
      component={DiscoverStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="compass-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsStack}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="settings-outline" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);
