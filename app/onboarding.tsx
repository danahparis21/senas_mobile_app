import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 0,
    senya: require('../assets/images/img/happy-senya.png'),
    tag: 'Welcome',
    title: 'Your gateway to Filipino Sign Language',
    body: 'SEÑAS is a learning platform that makes FSL accessible to everyone — students, teachers, and curious learners alike.',
    bubbleText: "Hi, I'm Senya! I'll be with you every step of the way.",
    bubbleIcon: 'hand-wave' as const,
    gradient: ['#193072', '#24408f', '#3757d8'] as const,
    cloudFar: '#2f49aa',
    cloudMid: '#5174e2',
    cloudNear: '#8ba6f7',
    isDark: true,
  },
  {
    id: 1,
    senya: require('../assets/images/img/two-senya.png'),
    tag: 'Learn',
    title: 'Interactive lessons at your own pace',
    body: 'Work through structured modules on the FSL alphabet, greetings, numbers, and more. Each lesson builds on the last.',
    bubbleText: "Every expert was once a beginner. Let's start small!",
    bubbleIcon: 'pencil' as const,
    gradient: ['#3757d8', '#6a8be5', '#9ab5f0'] as const,
    cloudFar: '#4f71ce',
    cloudMid: '#779ceb',
    cloudNear: '#c9dcfb',
    isDark: true,
  },
  {
    id: 2,
    senya: require('../assets/images/img/few.png'),
    tag: 'Practice',
    title: 'Real-time hand sign recognition',
    body: 'Use your camera to practice hand signs. SEÑAS watches your gestures and gives you instant feedback on your form.',
    bubbleText: "Hold your hand steady and I'll tell you how you did!",
    bubbleIcon: 'magnify' as const,
    gradient: ['#9ab5f0', '#c1eaff', '#d4f0ff'] as const,
    cloudFar: '#7fb7e0',
    cloudMid: '#a4d6f5',
    cloudNear: '#ffffff',
    isDark: false,
  },
  {
    id: 3,
    senya: require('../assets/images/img/experienced.png'),
    tag: 'Achieve',
    title: 'Earn badges, level up, stay motivated',
    body: 'Track your XP, collect achievement badges, and maintain learning streaks. Celebrate every milestone on your FSL journey.',
    bubbleText: "I'll cheer you on every step of the way!",
    bubbleIcon: 'trophy-outline' as const,
    gradient: ['#c1eaff', '#d4f0ff', '#e8f8ff'] as const,
    cloudFar: '#8dc2e8',
    cloudMid: '#aed6f2',
    cloudNear: '#ffffff',
    isDark: false,
  },
];

/**
 * Floating cloud component for the onboarding
 */
function OnboardingCloud({
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
  color: Animated.AnimatedInterpolation<string | number> | string;
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

  const unit = width / 2.2;
  const puffs = [
    { left: -unit * 0.25, bottom: -unit * 0.5 * scale, width: unit * 1.1 * scale, height: unit * 1.1 * scale },
    { left: unit * 0.55, bottom: -unit * 0.3 * scale, width: unit * 0.85 * scale, height: unit * 0.85 * scale },
    { left: unit * 1.15, bottom: -unit * 0.45 * scale, width: unit * 1.05 * scale, height: unit * 1.05 * scale },
    { left: unit * 1.85, bottom: -unit * 0.25 * scale, width: unit * 0.7 * scale, height: unit * 0.7 * scale },
  ];

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom,
        left: 0,
        width: width * 2,
        height: height * 0.3,
        opacity,
        transform: [{ translateX }],
      }}
    >
      {puffs.map((puff, index) => (
        <Animated.View
          key={index}
          style={[
            styles.cloudPuff,
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
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: -2,
          bottom: -unit * 2,
          height: unit * 2,
          backgroundColor: color,
        }}
      />
      {puffs.map((puff, index) => (
        <Animated.View
          key={`dup-${index}`}
          style={[
            styles.cloudPuff,
            {
              backgroundColor: color,
              width: puff.width,
              height: puff.height,
              left: puff.left + width,
              bottom: puff.bottom,
            },
          ]}
        />
      ))}
      <Animated.View
        style={{
          position: 'absolute',
          left: width,
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
 * Star component for background
 */
function Star({
  x,
  y,
  size = 3,
  opacity = 0.6,
  delay = 0,
}: {
  x: number;
  y: number;
  size?: number;
  opacity?: number;
  delay?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1500 + Math.random() * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1500 + Math.random() * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: '#fff',
        opacity: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [opacity * 0.3, opacity],
        }),
        transform: [
          {
            scale: anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.5, 1.2, 0.5],
            }),
          },
        ],
      }}
    />
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  const scrollX = useRef(new Animated.Value(0)).current;

  // ─── Native-driver opacity interpolations per slide ─────────────────────
  // Each slide's gradient gets its own opacity driven by scrollX with
  // useNativeDriver: true so ALL crossfades run on the GPU thread (no JS lag).
  const slideOpacities = SLIDES.map((_, i) =>
    scrollX.interpolate({
      inputRange: [
        (i - 1) * width,
        i * width,
        (i + 1) * width,
      ],
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    })
  );

  // JS-thread interpolations only for UI elements (not background)
  const gradientInputRange = SLIDES.map((_, i) => i * width);
  const interpColor = (extract: (s: typeof SLIDES[0]) => string) =>
    scrollX.interpolate({ inputRange: gradientInputRange, outputRange: SLIDES.map(extract) });

  // Cloud colors — still JS-thread but updating slowly compared to gradient
  const cloudFarAnim = interpColor((s) => s.cloudFar);
  const cloudMidAnim = interpColor((s) => s.cloudMid);
  const cloudNearAnim = interpColor((s) => s.cloudNear);

  const logoColorAnim = interpColor((s) => (s.isDark ? 'rgba(255,255,255,0.9)' : '#0f3172'));
  const skipBgAnim = interpColor((s) => (s.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,49,114,0.12)'));
  const skipBorderAnim = interpColor((s) => (s.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,49,114,0.2)'));
  const skipTxtAnim = interpColor((s) => (s.isDark ? 'rgba(255,255,255,0.8)' : '#0f3172'));
  const dotActiveAnim = interpColor((s) => (s.isDark ? 'rgba(255,255,255,0.9)' : '#3757d8'));
  const bubbleBgAnim = interpColor((s) => (s.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,49,114,0.1)'));
  const bubbleBorderAnim = interpColor((s) => (s.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,49,114,0.12)'));
  const bubbleTxtAnim = interpColor((s) => (s.isDark ? '#ffffff' : '#0f3172'));
  const btnBgAnim = interpColor((s) => (s.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,49,114,0.15)'));
  const btnBorderAnim = interpColor((s) => (s.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,49,114,0.15)'));
  const btnTxtAnim = interpColor((s) => (s.isDark ? '#ffffff' : '#0f3172'));

  const lastBtnBg = slide.isDark ? 'rgba(255,255,255,0.9)' : '#0f3172';
  const lastBtnTxt = slide.isDark ? '#0f3172' : '#fff';

  const AnimatedPressable = useRef(Animated.createAnimatedComponent(Pressable)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideDownAnim = useRef(new Animated.Value(0)).current;

  // Track active slide index continuously during swipe for instant smooth pagination update
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    const listenerId = scrollX.addListener(({ value }) => {
      const activeIndex = Math.round(value / width);
      if (activeIndex !== currentRef.current && activeIndex >= 0 && activeIndex < SLIDES.length) {
        currentRef.current = activeIndex;
        setCurrent(activeIndex);
      }
    });
    return () => {
      scrollX.removeListener(listenerId);
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
      Animated.spring(slideDownAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const next = () => {
    if (isLast) {
      router.replace('/login');
    } else {
      const nextIndex = current + 1;
      setCurrent(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }
  };

  const back = () => {
    if (current > 0) {
      const prevIndex = current - 1;
      setCurrent(prevIndex);
      flatListRef.current?.scrollToIndex({
        index: prevIndex,
        animated: true,
      });
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / width);
    if (index !== current && index >= 0 && index < SLIDES.length) {
      setCurrent(index);
    }
  };

  const getImageSize = (id: number) => {
    switch (id) {
      case 1: // Slide 2 (two-senya) - FAR bigger!
        return { width: 330, height: 320, maxHeight: 320 };
      case 2: // Slide 3 (few) - bigger!
        return { width: 290, height: 280, maxHeight: 280 };
      case 3: // Slide 4 (experienced) - bigger!
        return { width: 290, height: 280, maxHeight: 280 };
      default: // Slide 1 (happy-senya)
        return { width: 255, height: 255, maxHeight: 255 };
    }
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => {
    const itemText = item.isDark ? '#ffffff' : '#0f3172';
    const itemTextSub = item.isDark ? 'rgba(255,255,255,0.75)' : 'rgba(15,49,114,0.65)';
    const itemTagDot = item.isDark ? '#fff' : '#3757d8';
    return (
      <View style={styles.slideContainer}>
        <View style={styles.contentWrapper}>
          {/* Tag */}
          <View style={styles.tagContainer}>
            <View style={[styles.tagDot, { backgroundColor: itemTagDot }]} />
            <Text style={[styles.tagText, { color: itemTextSub }]}>{item.tag.toUpperCase()}</Text>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: itemText }]}>{item.title}</Text>
          </View>

          {/* Body */}
          <Text style={[styles.body, { color: itemTextSub }]}>{item.body}</Text>

          {/* Senya Image - custom enlarged size per slide */}
          <View style={styles.imageContainer}>
            <Image
              source={item.senya}
              style={[styles.senyaImage, getImageSize(item.id)]}
              contentFit="contain"
            />
          </View>
        </View>
      </View>
    );
  };

  // Generate stars
  const stars = Array.from({ length: 30 }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height * 0.6,
    size: 2 + Math.random() * 3,
    opacity: 0.3 + Math.random() * 0.5,
    delay: Math.random() * 2000,
  }));

  const iconColor = slide.isDark ? '#ffffff' : '#0f3172';
  const btnIconColor = isLast ? lastBtnTxt : (slide.isDark ? '#ffffff' : '#0f3172');

  return (
    <View style={styles.outerContainer}>
      <StatusBar style={slide.isDark ? 'light' : 'dark'} translucent />

      {/* Background gradients — one per slide, crossfade via native-driver opacity.
           This avoids JS-thread color interpolation which causes frame drops. */}
      {SLIDES.map((s, i) => (
        <Animated.View
          key={`bg-${i}`}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: slideOpacities[i] }]}
        >
          <LinearGradient
            colors={s.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ))}

      {/* Stars */}
      {stars.map((star, index) => (
        <Star key={index} {...star} />
      ))}

      {/* Multi-layered Cloud Formations with distinct depth colors */}
      {/* Back Layer (Far Cloud) */}
      <OnboardingCloud
        bottom={height * 0.35}
        scale={0.7}
        duration={120000}
        opacity={1.0}
        color={cloudFarAnim}
        reverse
        delay={0}
      />
      <OnboardingCloud
        bottom={height * 0.26}
        scale={0.9}
        duration={95000}
        opacity={1.0}
        color={cloudFarAnim}
        delay={300}
      />

      {/* Mid Layer (Middle Cloud) */}
      <OnboardingCloud
        bottom={height * 0.16}
        scale={1.2}
        duration={70000}
        opacity={1.0}
        color={cloudMidAnim}
        reverse
        delay={500}
      />
      <OnboardingCloud
        bottom={height * 0.08}
        scale={1.05}
        duration={80000}
        opacity={1.0}
        color={cloudMidAnim}
        delay={200}
      />

      {/* Front Layer (Near Cloud) */}
      <OnboardingCloud
        bottom={height * 0.0}
        scale={0.9}
        duration={45000}
        opacity={1.0}
        color={cloudNearAnim}
        delay={900}
      />
      <OnboardingCloud
        bottom={-height * 0.03}
        scale={1.25}
        duration={55000}
        opacity={1.0}
        color={cloudNearAnim}
        reverse
        delay={600}
      />

      {/* Safe area wraps only the foreground content */}
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.foreground,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideDownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Animated.Text style={[styles.logoText, { color: logoColorAnim }]}>SEÑAS</Animated.Text>
            {!isLast && (
              <AnimatedPressable
                style={[styles.skipBtn, { backgroundColor: skipBgAnim, borderColor: skipBorderAnim }]}
                onPress={() => router.replace('/login')}
              >
                <Animated.Text style={[styles.skipText, { color: skipTxtAnim }]}>Skip</Animated.Text>
              </AnimatedPressable>
            )}
          </View>

          {/* Continuous 60fps Interpolated Pagination Dots */}
          <View style={styles.dotsContainer}>
            {SLIDES.map((_, i) => {
              const dotWidth = scrollX.interpolate({
                inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                outputRange: [8, 32, 8],
                extrapolate: 'clamp',
              });
              const dotOpacity = scrollX.interpolate({
                inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                outputRange: [0.35, 1, 0.35],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity: dotOpacity,
                      backgroundColor: dotActiveAnim,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Swipeable Main Content */}
          <View style={styles.mainContent}>
            <FlatList
              ref={flatListRef}
              data={SLIDES}
              renderItem={renderSlide}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              scrollEventThrottle={16}
              keyExtractor={(item) => item.id.toString()}
              decelerationRate="fast"
              snapToInterval={width}
              snapToAlignment="center"
              getItemLayout={(data, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
            />
          </View>

          {/* Speech Bubble */}
          <View style={styles.speechContainer}>
            <Image source={require('../assets/images/img/senyas_logo.png')} style={styles.senyaMini} />
            <Animated.View style={[styles.bubbleCard, { backgroundColor: bubbleBgAnim, borderColor: bubbleBorderAnim }]}>
              <Animated.Text style={[styles.bubbleText, { color: bubbleTxtAnim }]}>{slide.bubbleText}</Animated.Text>
              <MaterialCommunityIcons
                name={slide.bubbleIcon}
                size={16}
                color={iconColor}
                style={styles.bubbleIcon}
              />
            </Animated.View>
          </View>

          {/* Navigation */}
          <View style={styles.navContainer}>
            {current > 0 && (
              <AnimatedPressable style={[styles.backBtn, { backgroundColor: btnBgAnim, borderColor: btnBorderAnim }]} onPress={back}>
                <Animated.Text style={[styles.backBtnText, { color: btnTxtAnim }]}>Back</Animated.Text>
              </AnimatedPressable>
            )}
            <AnimatedPressable
              style={[
                styles.nextBtn,
                { backgroundColor: btnBgAnim, borderColor: btnBorderAnim },
                isLast && { backgroundColor: lastBtnBg, borderColor: lastBtnBg },
              ]}
              onPress={next}
            >
              <Animated.Text style={[styles.nextBtnText, { color: isLast ? lastBtnTxt : btnTxtAnim }]}>
                {isLast ? 'Get Started' : 'Next'}
              </Animated.Text>
              <Feather
                name="arrow-right"
                size={18}
                color={btnIconColor}
                style={styles.nextBtnIcon}
              />
            </AnimatedPressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#193072' },
  safeArea: { flex: 1 },
  cloudPuff: { position: 'absolute', borderRadius: 999 },
  foreground: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  logoText: { fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  skipBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  skipText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  dot: { height: 8, borderRadius: 99 },
  mainContent: { flex: 1, paddingVertical: 6 },
  slideContainer: {
    width: width,
    paddingHorizontal: 24,
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 6,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
  },
  titleContainer: {
    minHeight: 74,
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 35,
    maxWidth: width * 0.85,
  },
  body: {
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: 10,
    maxWidth: width * 0.85,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 6,
  },
  senyaImage: { width: 255, height: 255 },
  speechContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 6,
  },
  senyaMini: { width: 44, height: 44, borderRadius: 22 },
  bubbleCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bubbleText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
    lineHeight: 19,
    flex: 1,
  },
  bubbleIcon: {
    marginLeft: 8,
  },
  navContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 10,
  },
  backBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderRadius: 60,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  nextBtn: {
    flex: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 60,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    gap: 8,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  nextBtnIcon: {
    marginLeft: 4,
  },
});