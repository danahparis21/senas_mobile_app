import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, style }: GlassCardProps) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderRadius: 20,
    // Note: backdropFilter is not fully supported in React Native natively without blurring libraries like expo-blur,
    // so we simulate the look with background opacity and shadow.
    shadowColor: 'rgba(15,49,114,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
});
