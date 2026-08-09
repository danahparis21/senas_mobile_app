import { Audio } from 'expo-av';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';

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
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 6,
          tension: 60,
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
 * Letter-by-letter text animation with sign language images ABOVE the letters
 * Order: S, E, Ñ (N + Y), A, S
 */
function AnimatedTextWithSigns({
  text,
  style,
  delay = 0,
  stagger = 500,
  onComplete,
}: {
  text: string;
  style: any;
  delay?: number;
  stagger?: number;
  onComplete?: () => void;
}) {
  // Split text into characters
  const letters = text.split('');
  const anims = useRef(letters.map(() => new Animated.Value(0))).current;

  // Define sign image paths for each SIGN position
  const getSignImagesForPosition = (signIndex: number) => {
    const imageMap: { [key: number]: any[] } = {
      0: [require('../assets/images/img/letter/S.png')],
      1: [require('../assets/images/img/letter/E.png')],
      2: [require('../assets/images/img/letter/N.png')],
      3: [require('../assets/images/img/letter/Y.png')],
      4: [require('../assets/images/img/letter/A.png')],
      5: [require('../assets/images/img/letter/S.png')],
    };
    return imageMap[signIndex] || [];
  };

  // Map each letter position to its corresponding sign positions
  const getSignIndicesForLetter = (letterIndex: number) => {
    if (letterIndex === 0) return [0]; // S
    if (letterIndex === 1) return [1]; // E
    if (letterIndex === 2) return [2, 3]; // Ñ (N + Y)
    if (letterIndex === 3) return [4]; // A
    if (letterIndex === 4) return [5]; // S
    return [];
  };

  useEffect(() => {
    const animations = anims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 480,
        delay: delay + index * stagger,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start(() => {
      if (onComplete) onComplete();
    });
  }, []);

  // Calculate total sign images needed for spacing
  const totalSignSlots = letters.reduce((total, letter, index) => {
    const indices = getSignIndicesForLetter(index);
    return total + indices.length;
  }, 0);

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Row for sign images - positioned above the letters */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 4, height: 50 }}>
        {letters.map((letter, letterIndex) => {
          const signIndices = getSignIndicesForLetter(letterIndex);
          const isDoubleSign = signIndices.length === 2;
          
          return (
            <View 
              key={`sign-${letterIndex}`} 
              style={{ 
                width: isDoubleSign ? 90 : 45, // Double width for Ñ
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <Animated.View
                style={{
                  opacity: anims[letterIndex],
                  transform: [
                    {
                      translateY: anims[letterIndex].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                {signIndices.map((signIndex) => {
                  const images = getSignImagesForPosition(signIndex);
                  return images.map((img, imgIndex) => (
                    <Image
                      key={`${signIndex}-${imgIndex}`}
                      source={img}
                      style={styles.signImage}
                      contentFit="contain"
                    />
                  ));
                })}
              </Animated.View>
            </View>
          );
        })}
      </View>

      {/* Row for text letters - completely separate */}
      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        {letters.map((letter, letterIndex) => (
          <View key={`letter-${letterIndex}`} style={{ width: 45, alignItems: 'center' }}>
            <Animated.Text
              style={[
                style,
                {
                  opacity: anims[letterIndex],
                  transform: [
                    {
                      translateY: anims[letterIndex].interpolate({
                        inputRange: [0, 1],
                        outputRange: [22, 0],
                      }),
                    },
                    {
                      scale: anims[letterIndex].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.55, 1],
                      }),
                    },
                  ],
                  textAlign: 'center',
                },
              ]}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </Animated.Text>
          </View>
        ))}
      </View>
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

  const washOpacity = useRef(new Animated.Value(0)).current;

  const [showLogo, setShowLogo] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  // Load and play twinkle sound
  useEffect(() => {
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/music/twinkle.mp3'),
          { shouldPlay: true, volume: 0.8, isLooping: false }
        );
        soundRef.current = sound;
      } catch (error) {
        console.log('Error loading sound:', error);
      }
    }
    loadSound();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Load transition sound
  useEffect(() => {
    async function loadTransitionSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/music/clouds-transition.mp3'),
          { shouldPlay: false, volume: 0.9 }
        );
        transitionSoundRef.current = sound;
      } catch (error) {
        console.log('Error loading transition sound:', error);
      }
    }
    loadTransitionSound();

    return () => {
      if (transitionSoundRef.current) {
        transitionSoundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    // Show elements with slower timing to match music
    const timers = [
      setTimeout(() => setShowLogo(true), 400),
      setTimeout(() => setShowTitle(true), 1000),
      setTimeout(() => setShowSubtitle(true), 1600),
      setTimeout(() => setShowSparkles(true), 600),
    ];

    // Logo animation
    const logoAnimation = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]).start();
    }, 400);

    // Subtitle animation - slower
    const subtitleAnimation = setTimeout(() => {
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(subtitleTranslateY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 1400);

    // Start wash animation with transition sound
    const washAnimation = setTimeout(async () => {
      // Play transition sound
      try {
        if (transitionSoundRef.current) {
          await transitionSoundRef.current.playAsync();
        }
      } catch (error) {
        console.log('Error playing transition sound:', error);
      }

      Animated.parallel([
        Animated.timing(washOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 0.7, duration: 800, useNativeDriver: true }),
      ]).start();
    }, 4500);

    const transition = setTimeout(() => {
      router.replace('/onboarding');
    }, 5800);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(logoAnimation);
      clearTimeout(subtitleAnimation);
      clearTimeout(washAnimation);
      clearTimeout(transition);
    };
  }, []);

  // Sparkle positions
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
    { x: width * 0.55, y: height * 0.3, delay: 200, size: 4 },
    { x: width * 0.35, y: height * 0.5, delay: 800, size: 5 },
    { x: width * 0.65, y: height * 0.6, delay: 1100, size: 6 },
    { x: width * 0.25, y: height * 0.1, delay: 1300, size: 4 },
    { x: width * 0.75, y: height * 0.8, delay: 1400, size: 5 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      <LinearGradient
        colors={[NAVY, '#24408f', BLUE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* glow blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Cloud layers */}
      <CloudBank
        bottom={height * 0.28}
        scale={0.8}
        duration={120000}
        opacity={1.0}
        color={CLOUD_FAR}
        reverse
        delay={0}
      />
      <CloudBank
        bottom={height * 0.16}
        scale={1.25}
        duration={95000}
        opacity={1.0}
        color={CLOUD_FAR}
        delay={80}
      />
      <CloudBank
        bottom={height * 0.08}
        scale={1.05}
        duration={62000}
        opacity={1.0}
        color={CLOUD_MID}
        reverse
        delay={160}
      />
      <CloudBank
        bottom={-height * 0.02}
        scale={0.9}
        duration={40000}
        opacity={1.0}
        color={CLOUD_NEAR}
        delay={240}
      />
      <CloudBank
        bottom={height * 0.22}
        scale={0.7}
        duration={80000}
        opacity={1.0}
        color={CLOUD_MID}
        delay={120}
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

      {/* Centered Brand Hero Container */}
      <View style={styles.heroCenterContainer}>
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
              marginBottom: 8,
            }}
          >
            <Image
              source={require('../assets/images/img/senyas_logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </Animated.View>
        )}

        {/* App Name - Letter by letter with sign language images ABOVE */}
        {showTitle && (
          <View style={styles.titleWrapper}>
            <AnimatedTextWithSigns
              text="SEÑAS"
              style={styles.title}
              delay={0}
              stagger={140}
            />
          </View>
        )}

        {/* Subtitle */}
        {showSubtitle && (
          <Animated.View
            style={[
              styles.subtitleWrapper,
              {
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslateY }],
              }
            ]}
          >
            <Text style={styles.subtitleMain}>Filipino Sign Language</Text>
            <Text style={styles.subtitleTag}>Learning Platform</Text>
          </Animated.View>
        )}
      </View>

      {/* Hand-off wash into the app */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: NAVY, opacity: washOpacity, zIndex: 20 }]}
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
  heroCenterContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -210,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  logo: { width: 140, height: 140 },
  titleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 7,
    color: '#fff',
    lineHeight: 50,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  signImage: {
    width: 40,
    height: 40,
    marginHorizontal: 1,
  },
  subtitleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  subtitleMain: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitleTag: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});