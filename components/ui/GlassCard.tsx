import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';

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
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderColor: 'rgba(255,255,255,0.90)',
        borderWidth: 1,
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
      },
      android: {
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(215, 235, 252, 0.8)',
        borderWidth: 1,
        elevation: 3,
      },
    }),
  },
});
