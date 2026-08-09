import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

/* SEÑAS palette (same as the landing hero) */
const BLUE = '#3757d8';
const CLOUD_NEAR = '#f2f4ff';
const CLOUD_MID = '#dfe4fb';
const CLOUD_FAR = '#cdd5f5';
const NAVY = '#193072';
const AMBER = '#F5A623';
const PAPER = '#EDF1FA';

/**
 * Sparkle component
 */
function Sparkle({
  x,
  y,
  delay,
  size = 6,
  duration = 2000
}: {
  x: number;
  y: number;
  delay: number;
  size?: number;
  duration?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(duration * 0.6),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Reset and loop
        opacity.setValue(0);
        scale.setValue(0);
        animate();
      });
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

/**
 * A complete cloud formation (all puffs together)
 */
function CloudFormation({
  color,
  scale: layerScale,
  position,
  delay = 0,
}: {
  color: string;
  scale: number;
  position: { bottom: number; left?: number };
  delay?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const unit = width / 2.2;
  const puffs = [
    { left: -unit * 0.25, bottom: -unit * 0.5 * layerScale, width: unit * 1.1 * layerScale, height: unit * 1.1 * layerScale },
    { left: unit * 0.55, bottom: -unit * 0.3 * layerScale, width: unit * 0.85 * layerScale, height: unit * 0.85 * layerScale },
    { left: unit * 1.15, bottom: -unit * 0.45 * layerScale, width: unit * 1.05 * layerScale, height: unit * 1.05 * layerScale },
    { left: unit * 1.85, bottom: -unit * 0.25 * layerScale, width: unit * 0.7 * layerScale, height: unit * 0.7 * layerScale },
  ];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: position.bottom,
        left: position.left || 0,
        opacity,
        transform: [{ translateY }],
      }}
    >
      {puffs.map((puff, index) => (
        <View
          key={index}
          style={[
            styles.puff,
            {
              backgroundColor: color,
              width: puff.width,
              height: puff.height,
              left: puff.left,
              bottom: puff.bottom,
            },
          ]}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: -2,
          bottom: -unit * 2,
          height: unit * 2,
          backgroundColor: color,
        }}
      />
    </Animated.View>
  );
}

/**
 * Cloud bank that drifts sideways
 */
function CloudBank({
  bottom,
  scale,
  duration,
  opacity,
  color,
  reverse = false,
  delay = 0,
}: {
  bottom: number;
  scale: number;
  duration: number;
  opacity: number;
  color: string;
  reverse?: boolean;
  delay?: number;
}) {
  const drift = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const translateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? [-width, 0] : [0, -width],
  });

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom,
        left: 0,
        width: width * 2,
        height: height * 0.42,
        opacity,
        transform: [{ translateX }],
      }}
    >
      <CloudFormation color={color} scale={scale} position={{ bottom: 0, left: 0 }} delay={0} />
      <CloudFormation color={color} scale={scale} position={{ bottom: 0, left: width }} delay={0} />
    </Animated.View>
  );
}

/**
 * Letter-by-letter text animation with bounce
 * Now properly handles Ñ character
 */
function AnimatedText({
  text,
  style,
  delay = 0,
  duration = 150,
}: {
  text: string;
  style: any;
  delay?: number;
  duration?: number;
}) {
  const [letters] = useState(text.split(''));
  const [visibleLetters, setVisibleLetters] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      letters.forEach((_, index) => {
        setTimeout(() => {
          setVisibleLetters(prev => [...prev, letters[index]]);
        }, index * duration);
      });
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
      {letters.map((letter, index) => (
        <Animated.Text
          key={index}
          style={[
            style,
            {
              opacity: visibleLetters[index] ? 1 : 0,
              transform: [
                {
                  translateY: visibleLetters[index] ? 0 : 30,
                },
                {
                  scale: visibleLetters[index] ? 1 : 0.5,
                },
              ],
            },
          ]}
        >
          {letter}
        </Animated.Text>
      ))}
    </View>
  );
}

export default function SplashScreen() {
  const router = useRouter();
  const soundRef = useRef<Audio.Sound | null>(null);
  const transitionSoundRef = useRef<Audio.Sound | null>(null);

  // All hooks at top level
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(-0.35)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(12)).current;

  const washOpacity = useRef(new Animated.Value(0)).current;

  const [showLogo, setShowLogo] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  // Load and play sound
  useEffect(() => {
    async function loadSounds() {
      try {
        // Main app start sound
        const { sound: mainSound } = await Audio.Sound.createAsync(
          require('../assets/music/app-start.mp3'),
          { shouldPlay: true, volume: 0.8 }
        );
        soundRef.current = mainSound;
      } catch (error) {
        console.log('Error loading main sound:', error);
      }
    }
    loadSounds();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (transitionSoundRef.current) {
        transitionSoundRef.current.unloadAsync();
      }
    };
  }, []);

  // Load transition sound when transitioning
  useEffect(() => {
    async function loadTransitionSound() {
      try {
        const { sound: transitionSound } = await Audio.Sound.createAsync(
          require('../assets/music/clouds-transition.mp3'),
          { shouldPlay: false, volume: 0.9 }
        );
        transitionSoundRef.current = transitionSound;
      } catch (error) {
        console.log('Error loading transition sound:', error);
      }
    }
    loadTransitionSound();
  }, []);

  useEffect(() => {
    // Extended timeline for better readability
    const timers = [
      setTimeout(() => setShowLogo(true), 2800),
      setTimeout(() => setShowTitle(true), 3400),
      setTimeout(() => setShowSubtitle(true), 4600),
      setTimeout(() => setShowTagline(true), 5200),
      setTimeout(() => setShowSparkles(true), 2800),
    ];

    // Logo animation with extended duration
    const logoAnimation = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 0, duration: 800, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]).start();
    }, 2800);

    // Subtitle animation
    const subtitleAnimation = setTimeout(() => {
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(subtitleTranslateY, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]).start();
    }, 4600);

    // Tagline animation
    const taglineAnimation = setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(taglineTranslateY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 5200);

    // Play transition sound and start wash animation
    const washAnimation = setTimeout(async () => {
      // Play the clouds transition sound
      try {
        if (transitionSoundRef.current) {
          await transitionSoundRef.current.playAsync();
        }
      } catch (error) {
        console.log('Error playing transition sound:', error);
      }

      Animated.parallel([
        Animated.timing(washOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
      ]).start();
    }, 6200);

    const transition = setTimeout(() => {
      router.replace('/onboarding');
    }, 7500);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(logoAnimation);
      clearTimeout(subtitleAnimation);
      clearTimeout(taglineAnimation);
      clearTimeout(washAnimation);
      clearTimeout(transition);
    };
  }, []);

  // Sparkle positions - more sparkles
  const sparkles = [
    { x: width * 0.1, y: height * 0.15, delay: 0, size: 8 },
    { x: width * 0.85, y: height * 0.1, delay: 300, size: 6 },
    { x: width * 0.2, y: height * 0.4, delay: 600, size: 5 },
    { x: width * 0.75, y: height * 0.35, delay: 900, size: 7 },
    { x: width * 0.05, y: height * 0.6, delay: 1200, size: 4 },
    { x: width * 0.9, y: height * 0.55, delay: 1500, size: 6 },
    { x: width * 0.15, y: height * 0.75, delay: 300, size: 5 },
    { x: width * 0.8, y: height * 0.7, delay: 800, size: 4 },
    { x: width * 0.5, y: height * 0.05, delay: 500, size: 7 },
    { x: width * 0.45, y: height * 0.85, delay: 1000, size: 5 },
    { x: width * 0.3, y: height * 0.25, delay: 400, size: 6 },
    { x: width * 0.7, y: height * 0.45, delay: 700, size: 5 },
    // Additional sparkles
    { x: width * 0.55, y: height * 0.3, delay: 200, size: 4 },
    { x: width * 0.35, y: height * 0.5, delay: 800, size: 5 },
    { x: width * 0.65, y: height * 0.6, delay: 1100, size: 6 },
    { x: width * 0.25, y: height * 0.1, delay: 1300, size: 4 },
    { x: width * 0.75, y: height * 0.8, delay: 1400, size: 5 },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[NAVY, '#24408f', BLUE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* glow blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Cloud layers — solid, fully visible */}
      <CloudBank
        bottom={height * 0.28}
        scale={0.8}
        duration={120000}
        opacity={0.60}
        color={CLOUD_FAR}
        reverse
        delay={0}
      />
      <CloudBank
        bottom={height * 0.16}
        scale={1.25}
        duration={95000}
        opacity={0.70}
        color={CLOUD_FAR}
        delay={400}
      />
      <CloudBank
        bottom={height * 0.08}
        scale={1.05}
        duration={62000}
        opacity={0.78}
        color={CLOUD_MID}
        reverse
        delay={1000}
      />
      <CloudBank
        bottom={-height * 0.02}
        scale={0.9}
        duration={40000}
        opacity={0.85}
        color={CLOUD_NEAR}
        delay={1600}
      />
      <CloudBank
        bottom={height * 0.22}
        scale={0.7}
        duration={80000}
        opacity={0.65}
        color={CLOUD_MID}
        delay={600}
      />

      {/* Sparkles */}
      {showSparkles && sparkles.map((sparkle, index) => (
        <Sparkle
          key={index}
          x={sparkle.x}
          y={sparkle.y}
          delay={sparkle.delay}
          size={sparkle.size}
        />
      ))}

      {/* Logo */}
      {showLogo && (
        <Animated.View
          style={{
            transform: [
              { scale: logoScale },
              { rotate: logoRotate.interpolate({ inputRange: [-0.35, 0], outputRange: ['-20deg', '0deg'] }) },
            ],
            opacity: logoOpacity,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Image
            source={require('../assets/images/img/senyas_logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>
      )}

      {/* App Name - Letter by letter with proper Ñ */}
      {showTitle && (
        <View style={styles.titleContainer}>
          <AnimatedText
            text="SEÑAS"
            style={styles.title}
            delay={0}
            duration={150}
          />
        </View>
      )}

      {/* Subtitle */}
      {showSubtitle && (
        <Animated.View
          style={{
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleTranslateY }],
            alignItems: 'center',
            marginTop: 8,
            zIndex: 10,
          }}
        >
          <Text style={styles.subtitle}>Filipino Sign Language</Text>
        </Animated.View>
      )}

      {/* Tagline */}
      {showTagline && (
        <Animated.View
          style={{
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
            alignItems: 'center',
            marginTop: 16,
            zIndex: 10,
          }}
        >
          <Text style={styles.tagline}>Learn · Practice · Connect</Text>
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Hand-off wash into the app */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: PAPER, opacity: washOpacity, zIndex: 20 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  puff: { position: 'absolute', borderRadius: 999 },
  sparkle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  blob1: {
    position: 'absolute',
    top: '-15%',
    left: '-10%',
    width: width * 0.55,
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(96,165,250,0.14)',
  },
  blob2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: width * 0.5,
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(245,166,35,0.10)',
  },
  logo: { width: 130, height: 130 },
  titleContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 6,
    color: '#fff',
    lineHeight: 48,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tagline: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: '500', lineHeight: 22 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 18 },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: AMBER, opacity: 0.9 },
});