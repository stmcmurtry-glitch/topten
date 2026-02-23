import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MyListsScreen } from '../screens/MyListsScreen';
import { MyListsTabScreen } from '../screens/MyListsTabScreen';
import { ListDetailScreen } from '../screens/ListDetailScreen';
import { CreateListScreen } from '../screens/CreateListScreen';
import { AllListsScreen } from '../screens/AllListsScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { ContactScreen } from '../screens/ContactScreen';
import { FeaturedListScreen } from '../screens/FeaturedListScreen';
import { CommunityListScreen } from '../screens/CommunityListScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const sharedStackOptions = {
  headerLargeTitle: true,
  headerLargeTitleStyle: { fontFamily: 'System', fontWeight: '700' as const },
  headerTitleStyle: { fontFamily: 'System', fontWeight: '600' as const },
};

const HomeStack = () => (
  <Stack.Navigator screenOptions={sharedStackOptions}>
    <Stack.Screen
      name="MyListsHome"
      component={MyListsScreen}
      options={{ headerShown: false, title: 'Home' }}
    />
    <Stack.Screen
      name="ListDetail"
      component={ListDetailScreen}
      options={{ headerShown: false, title: '' }}
    />
    <Stack.Screen
      name="CreateList"
      component={CreateListScreen}
      options={{ presentation: 'modal', title: 'New List', headerLargeTitle: false }}
    />
    <Stack.Screen
      name="AllLists"
      component={AllListsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Search"
      component={SearchScreen}
      options={{ title: 'Search', headerLargeTitle: false }}
    />
    <Stack.Screen
      name="FeaturedList"
      component={FeaturedListScreen}
      options={{ title: '', headerLargeTitle: false, headerTransparent: true, headerTintColor: '#FFF' }}
    />
    <Stack.Screen
      name="CommunityList"
      component={CommunityListScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const MyListsStack = () => (
  <Stack.Navigator screenOptions={sharedStackOptions}>
    <Stack.Screen
      name="MyListsTabHome"
      component={MyListsTabScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AllLists"
      component={AllListsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ListDetail"
      component={ListDetailScreen}
      options={{ headerShown: false, title: '' }}
    />
    <Stack.Screen
      name="CreateList"
      component={CreateListScreen}
      options={{ presentation: 'modal', title: 'New List', headerLargeTitle: false }}
    />
  </Stack.Navigator>
);

const DiscoverStack = () => (
  <Stack.Navigator screenOptions={sharedStackOptions}>
    <Stack.Screen
      name="DiscoverHome"
      component={DiscoverScreen}
      options={{ headerShown: false, title: 'Discover' }}
    />
    <Stack.Screen
      name="ListDetail"
      component={ListDetailScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="FeaturedList"
      component={FeaturedListScreen}
      options={{ title: '', headerLargeTitle: false, headerTransparent: true, headerTintColor: '#FFF' }}
    />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator screenOptions={sharedStackOptions}>
    <Stack.Screen
      name="SettingsHome"
      component={SettingsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ title: 'Notifications', headerLargeTitle: false }}
    />
    <Stack.Screen
      name="PrivacyPolicy"
      component={PrivacyPolicyScreen}
      options={{ title: 'Privacy Policy', headerLargeTitle: false }}
    />
    <Stack.Screen
      name="About"
      component={AboutScreen}
      options={{ title: 'About', headerLargeTitle: false }}
    />
    <Stack.Screen
      name="Contact"
      component={ContactScreen}
      options={{ title: 'Contact Us', headerLargeTitle: false }}
    />
  </Stack.Navigator>
);

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: true,
      tabBarActiveTintColor: colors.activeTab,
      tabBarInactiveTintColor: colors.inactiveTab,
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeStack}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="MyLists"
      component={MyListsStack}
      options={{
        tabBarLabel: 'My Lists',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="list" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Discover"
      component={DiscoverStack}
      options={{
        tabBarLabel: 'Discover',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="compass-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsStack}
      options={{
        tabBarLabel: 'Account',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person-circle-outline" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);
