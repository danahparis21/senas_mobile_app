import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState(0);

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(-0.35)).current; // -20deg in radians ~ -0.35

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(12)).current;

  const bgInterpolate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let t1 = setTimeout(() => {
      setPhase(1);
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 0, duration: 700, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),
      ]).start();
    }, 700);

    let t2 = setTimeout(() => {
      setPhase(2);
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(taglineTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 1500);

    let t3 = setTimeout(() => {
      setPhase(3);
      Animated.parallel([
        Animated.timing(bgInterpolate, { toValue: 1, duration: 500, useNativeDriver: false }), // bg color cannot use native driver
        Animated.timing(logoScale, { toValue: 0.7, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 2800);

    let t4 = setTimeout(() => {
      router.replace('/onboarding');
    }, 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const bgColor = bgInterpolate.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1035a0', '#ffffff']
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Background Blobs (Static approximations for native) */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Logo */}
      <Animated.View style={{
        transform: [
          { scale: logoScale },
          { rotate: logoRotate.interpolate({ inputRange: [-0.35, 0], outputRange: ['-20deg', '0deg'] }) }
        ],
        opacity: logoOpacity,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Image
          source={require('../assets/images/img/senyas_logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>

      {/* App Name */}
      <Animated.View style={{
        opacity: textOpacity,
        transform: [{ translateY: textTranslateY }],
        alignItems: 'center',
        marginTop: 24,
      }}>
        <Text style={styles.title}>SEÑAS</Text>
        <Text style={styles.subtitle}>Filipino Sign Language</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{
        opacity: taglineOpacity,
        transform: [{ translateY: taglineTranslateY }],
        alignItems: 'center',
        marginTop: 16,
      }}>
        <Text style={styles.tagline}>Learn · Practice · Connect</Text>
      </Animated.View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: '-15%',
    left: '-10%',
    width: width * 0.55,
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(96,165,250,0.12)',
  },
  blob2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: width * 0.5,
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  logo: {
    width: 130,
    height: 130,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 6,
    color: '#fff',
    lineHeight: 42,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 24,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tagline: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  }
});
