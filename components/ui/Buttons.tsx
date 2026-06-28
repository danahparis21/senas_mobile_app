import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { Colors, Radius, Shadows } from '../../constants/Colors';

interface ButtonProps {
  onPress: () => void;
  title?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}

export function PrimaryButton({ onPress, title, children, style, textStyle, disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {title ? <Text style={[styles.primaryText, textStyle]}>{title}</Text> : children}
    </Pressable>
  );
}

export function YellowButton({ onPress, title, children, style, textStyle, disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.yellowBtn,
        disabled && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {title ? <Text style={[styles.yellowText, textStyle]}>{title}</Text> : children}
    </Pressable>
  );
}

export function GhostButton({ onPress, title, children, style, textStyle, disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.ghostBtn,
        disabled && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {title ? <Text style={[styles.ghostText, textStyle]}>{title}</Text> : children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    backgroundColor: Colors.blue600,
    borderRadius: Radius.full,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...Shadows.md,
    shadowColor: Colors.blue500, // custom shadow color from CSS
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  yellowBtn: {
    backgroundColor: Colors.yellow500,
    borderRadius: Radius.full,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...Shadows.md,
    shadowColor: Colors.yellow500,
  },
  yellowText: {
    color: '#1a1200',
    fontSize: 16,
    fontWeight: '800',
  },
  ghostBtn: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
    borderWidth: 2,
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ghostText: {
    color: Colors.text2,
    fontSize: 15,
    fontWeight: '600',
  },
});
