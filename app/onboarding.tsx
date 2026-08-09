import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, SafeAreaView, Pressable, FlatList, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: 0,
    senya: require('../assets/images/img/senya_blue.png'),
    tag: 'Welcome',
    title: 'Your gateway to Filipino Sign Language',
    body: 'SEÑAS is a learning platform that makes FSL accessible to everyone — students, teachers, and curious learners alike.',
    bubbleText: "Hi, I'm Senya! I'll be with you every step of the way. \ud83d\udc4b",
    gradient: ['#193072', '#24408f', '#3757d8'] as const,
    cloudColor: '#5b7de8',   // slightly lighter than bg — visible but harmonious
    isDark: true,            // dark bg → white text
  },
  {
    id: 1,
    senya: require('../assets/images/img/senya_teaching.png'),
    tag: 'Learn',
    title: 'Interactive lessons at your own pace',
    body: 'Work through structured modules on the FSL alphabet, greetings, numbers, and more. Each lesson builds on the last.',
    bubbleText: "Every expert was once a beginner. Let's start small! \u270f\ufe0f",
    gradient: ['#3757d8', '#6a8be5', '#9ab5f0'] as const,
    cloudColor: '#7fa3ef',
    isDark: true,
  },
  {
    id: 2,
    senya: require('../assets/images/img/senya_magnify.png'),
    tag: 'Practice',
    title: 'Real-time hand sign recognition',
    body: 'Use your camera to practice hand signs. SEÑAS watches your gestures and gives you instant feedback on your form.',
    bubbleText: "Hold your hand steady and I'll tell you how you did! \ud83d\udd0d",
    gradient: ['#9ab5f0', '#c1eaff', '#d4f0ff'] as const,
    cloudColor: '#a8d8f5',   // slightly deeper teal-blue — visible on sky bg
    isDark: false,           // light bg → dark navy text
  },
  {
    id: 3,
    senya: require('../assets/images/img/senya_blue.png'),
    tag: 'Achieve',
    title: 'Earn badges, level up, stay motivated',
    body: 'Track your XP, collect achievement badges, and maintain learning streaks. Celebrate every milestone on your FSL journey.',
    bubbleText: "I'll cheer you on every step of the way! \ud83c\udfc6",
    gradient: ['#c1eaff', '#d4f0ff', '#e8f8ff'] as const,
    cloudColor: '#b0d8f2',
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
        <View
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
      {puffs.map((puff, index) => (
        <View
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
      <View
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

export default function Onboarding() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  // ── Derived theme based on slide brightness ──────────────────────────────
  const textColor     = slide.isDark ? '#ffffff' : '#0f3172';
  const textColorSub  = slide.isDark ? 'rgba(255,255,255,0.75)' : 'rgba(15,49,114,0.65)';
  const tagDotColor   = slide.isDark ? '#fff' : '#3757d8';
  const logoColor     = slide.isDark ? 'rgba(255,255,255,0.9)' : '#0f3172';
  const skipBg        = slide.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,49,114,0.12)';
  const skipBorder    = slide.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,49,114,0.2)';
  const skipTxtColor  = slide.isDark ? 'rgba(255,255,255,0.8)' : '#0f3172';
  const dotActive     = slide.isDark ? 'rgba(255,255,255,0.9)' : '#3757d8';
  const dotInactive   = slide.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,49,114,0.2)';
  const bubbleBg      = slide.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,49,114,0.1)';
  const bubbleBorder  = slide.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,49,114,0.12)';
  const bubbleTxtClr  = slide.isDark ? '#fff' : '#0f3172';
  const btnBg         = slide.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,49,114,0.15)';
  const btnBorder     = slide.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,49,114,0.15)';
  const btnTxtColor   = slide.isDark ? '#fff' : '#0f3172';
  const lastBtnBg     = slide.isDark ? 'rgba(255,255,255,0.9)' : '#0f3172';
  const lastBtnTxt    = slide.isDark ? '#0f3172' : '#fff';

  // ── Smooth gradient cross-fade ───────────────────────────────────────────
  // Keep track of prev/current gradient for cross-fade
  const [prevSlideId, setPrevSlideId]           = useState(0);
  const [displayedGrad, setDisplayedGrad]       = useState(SLIDES[0].gradient);
  const [incomingGrad, setIncomingGrad]         = useState(SLIDES[0].gradient);
  const crossFade                               = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const prev = prevSlideId;
    if (current === prev) return;
    // Set incoming gradient and cross-fade to it
    setIncomingGrad(SLIDES[current].gradient);
    crossFade.setValue(0);
    Animated.timing(crossFade, {
      toValue: 1,
      duration: 700,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false, // opacity on non-native layer — required for LinearGradient
    }).start(() => {
      // Once done, promote incoming → displayed so memory is freed
      setDisplayedGrad(SLIDES[current].gradient);
      setPrevSlideId(current);
    });
  }, [current]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideDownAnim = useRef(new Animated.Value(0)).current;

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
      router.replace('/role');
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

  const onScroll = (event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / width);
    if (index !== current && index >= 0 && index < SLIDES.length) {
      setCurrent(index);
    }
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={styles.slideContainer}>
      <View style={styles.contentWrapper}>
        {/* Tag */}
        <View style={styles.tagContainer}>
          <View style={[styles.tagDot, { backgroundColor: tagDotColor }]} />
          <Text style={[styles.tagText, { color: textColorSub }]}>{item.tag.toUpperCase()}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: textColor }]}>{item.title}</Text>

        {/* Body */}
        <Text style={[styles.body, { color: textColorSub }]}>{item.body}</Text>

        {/* Senya Image */}
        <View style={styles.imageContainer}>
          <Image source={item.senya} style={styles.senyaImage} contentFit="contain" />
        </View>
      </View>
    </View>
  );

  // Get the gradient for the current slide
  const gradientColors = slide.gradient;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideDownAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      {/* Base (previous) gradient */}
      <LinearGradient
        colors={displayedGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Incoming gradient fades on top */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: crossFade }]}>
        <LinearGradient
          colors={incomingGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Clouds — solid, visible, colour-matched per slide */}
      <OnboardingCloud
        bottom={height * 0.3}
        scale={0.8}
        duration={120000}
        opacity={0.70}
        color={slide.cloudColor}
        reverse
        delay={0}
      />
      <OnboardingCloud
        bottom={height * 0.2}
        scale={1.2}
        duration={95000}
        opacity={0.80}
        color={slide.cloudColor}
        delay={300}
      />
      <OnboardingCloud
        bottom={height * 0.1}
        scale={1.0}
        duration={62000}
        opacity={0.75}
        color={slide.cloudColor}
        reverse
        delay={600}
      />
      <OnboardingCloud
        bottom={height * 0.0}
        scale={0.9}
        duration={40000}
        opacity={0.85}
        color={slide.cloudColor}
        delay={900}
      />
      <OnboardingCloud
        bottom={height * 0.25}
        scale={0.7}
        duration={80000}
        opacity={0.65}
        color={slide.cloudColor}
        delay={200}
      />
      <OnboardingCloud
        bottom={height * 0.4}
        scale={0.6}
        duration={70000}
        opacity={0.60}
        color={slide.cloudColor}
        reverse
        delay={500}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={[styles.logoText, { color: logoColor }]}>SEÑAS</Text>
        {!isLast && (
          <Pressable style={[styles.skipBtn, { backgroundColor: skipBg, borderColor: skipBorder }]} onPress={() => router.replace('/role')}>
            <Text style={[styles.skipText, { color: skipTxtColor }]}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: i === current ? 32 : 8,
                backgroundColor: i <= current ? dotActive : dotInactive,
              },
            ]}
          />
        ))}
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
          onScroll={onScroll}
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
        <View style={[styles.bubbleCard, { backgroundColor: bubbleBg, borderColor: bubbleBorder }]}>
          <Text style={[styles.bubbleText, { color: bubbleTxtClr }]}>{slide.bubbleText}</Text>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.navContainer}>
        {current > 0 && (
          <Pressable style={[styles.backBtn, { backgroundColor: btnBg, borderColor: btnBorder }]} onPress={back}>
            <Text style={[styles.backBtnText, { color: btnTxtColor }]}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.nextBtn,
            { backgroundColor: btnBg, borderColor: btnBorder },
            isLast && { backgroundColor: lastBtnBg, borderColor: lastBtnBg },
          ]}
          onPress={next}
        >
          <Text style={[styles.nextBtnText, { color: isLast ? lastBtnTxt : btnTxtColor }]}>
            {isLast ? 'Get Started 🤙' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cloudPuff: { position: 'absolute', borderRadius: 999 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
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
    marginTop: 20,
  },
  dot: { height: 8, borderRadius: 99 },
  mainContent: { flex: 1, paddingVertical: 10 },
  slideContainer: {
    width: width,
    paddingHorizontal: 24,
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 10,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tagDot: { width: 8, height: 8, borderRadius: 4 },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 38,
    marginBottom: 12,
    maxWidth: width * 0.85,
  },
  body: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
    marginBottom: 20,
    maxWidth: width * 0.85,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 10,
  },
  senyaImage: { width: 180, height: 180 },
  speechContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 8,
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
  },
  bubbleText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
    lineHeight: 19,
  },
  navContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
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
  },
  nextBtnLast: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(255,255,255,0.9)',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});