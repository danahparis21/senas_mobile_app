import { Tabs } from 'expo-router';
import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Colors } from '../../constants/Colors';

function HomeIcon({ active }: { active: boolean }) {
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <Path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" fill={active ? Colors.blue600 : Colors.text3} />
    </Svg>
  );
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" fill={active ? Colors.blue600 : Colors.text3} />
      <Path d="M7 8H17M7 12H13M7 16H15" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function HandIcon({ active }: { active: boolean }) {
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <Path d="M9 3V14M12 5V14M15 7V14M18 10V14C18 17.314 15.314 20 12 20C8.686 20 6 17.314 6 14V3" stroke={active ? Colors.blue600 : Colors.text3} strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function StarIcon({ active }: { active: boolean }) {
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill={active ? Colors.warning : Colors.text3} />
    </Svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" fill={active ? Colors.blue600 : Colors.text3} />
      <Path d="M4 20C4 16.686 7.582 14 12 14C16.418 14 20 16.686 20 20" stroke={active ? Colors.blue600 : Colors.text3} strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.blue600,
        tabBarInactiveTintColor: Colors.text3,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 16,
          paddingTop: 8,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'sans-serif',
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <HomeIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: 'Learn',
          tabBarIcon: ({ focused }) => <BookIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="gesture"
        options={{
          title: 'Practice',
          tabBarIcon: ({ focused }) => <HandIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Badges',
          tabBarIcon: ({ focused }) => <StarIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Me',
          tabBarIcon: ({ focused }) => <UserIcon active={focused} />,
        }}
      />
    </Tabs>
  );
}
