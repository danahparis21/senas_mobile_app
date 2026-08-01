// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import CustomTabBar from '../../components/CustomTabBar';
import { AppHeader } from '../../components/AppHeader';
import { View, StyleSheet } from 'react-native';

// Tabs that should show the header (all tabs)
const TABS_WITH_HEADER = ['dashboard', 'lessons', 'gesture', 'achievements', 'profile'];

export default function TabLayout() {
  return (
    <View style={styles.container}>
      {/* Header - shown on all tabs */}
      <AppHeader showNotifications={true} />

      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
        <Tabs.Screen name="lessons" options={{ title: 'Learn' }} />
        <Tabs.Screen name="gesture" options={{ title: 'Practice' }} />
        <Tabs.Screen name="achievements" options={{ title: 'Badges' }} />
        <Tabs.Screen name="profile" options={{ title: 'Me' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF5FD',
  },
});