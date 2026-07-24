import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, SafeAreaView, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { GlassCard } from '../components/ui/GlassCard';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: 0,
    senya: require('../assets/images/img/senya_blue.png'),
    accent: '#2563EB',
    accentLight: 'rgba(37,99,235,0.10)',
    tag: 'Welcome',
    title: 'Your gateway to Filipino Sign Language',
    body: 'SEÑAS is a learning platform that makes FSL accessible to everyone — students, teachers, and curious learners alike.',
    bubbleText: "Hi, I'm Senya! I'll be with you every step of the way. 👋",
    bg: '#daeefb',
  },
  {
    id: 1,
    senya: require('../assets/images/img/senya_teaching.png'),
    accent: '#059669',
    accentLight: 'rgba(5,150,105,0.10)',
    tag: 'Learn',
    title: 'Interactive lessons at your own pace',
    body: 'Work through structured modules on the FSL alphabet, greetings, numbers, and more. Each lesson builds on the last.',
    bubbleText: "Every expert was once a beginner. Let's start small! ✏️",
    bg: '#dafaed',
    highlights: ['FSL Alphabet', 'Greetings', 'Numbers', 'Classroom Signs'],
  },
  {
    id: 2,
    senya: require('../assets/images/img/senya_magnify.png'),
    accent: '#F59E0B',
    accentLight: 'rgba(245,158,11,0.10)',
    tag: 'Practice',
    title: 'Real-time hand sign recognition',
    body: 'Use your camera to practice hand signs. SEÑAS watches your gestures and gives you instant feedback on your form.',
    bubbleText: "Hold your hand steady and I'll tell you how you did! 🔍",
    bg: '#fefce8',
    highlights: ['Camera detection', 'Live scoring', 'Form feedback'],
  },
  {
    id: 3,
    senya: require('../assets/images/img/senya_blue.png'),
    accent: '#8B5CF6',
    accentLight: 'rgba(139,92,246,0.10)',
    tag: 'Achieve',
    title: 'Earn badges, level up, stay motivated',
    body: 'Track your XP, collect achievement badges, and maintain learning streaks. Celebrate every milestone on your FSL journey.',
    bubbleText: "I'll cheer you on every step of the way! 🏆",
    bg: '#f5f3ff',
    highlights: ['XP system', 'Achievement badges', 'Daily streaks'],
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      router.replace('/role');
    } else {
      const nextIndex = current + 1;
      setCurrent(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
        viewPosition: 0.5
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
        viewPosition: 0.5
      });
    }
  };

  const onScroll = (event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    // Calculate which slide is centered based on the slide width
    const slideWidth = width;
    const index = Math.round(offset / slideWidth);
    if (index !== current && index >= 0 && index < SLIDES.length) {
      setCurrent(index);
    }
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={styles.slideContainer}>
      <GlassCard style={styles.card}>
        <View style={[styles.cardTopStrip, { backgroundColor: item.accent }]} />

        <View style={[styles.tagContainer, { backgroundColor: item.accentLight }]}>
          <View style={[styles.tagDot, { backgroundColor: item.accent }]} />
          <Text style={[styles.tagText, { color: item.accent }]}>{item.tag.toUpperCase()}</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>

        {item.highlights && (
          <View style={styles.highlightsContainer}>
            {item.highlights.map((h, i) => (
              <View key={i} style={[styles.highlightChip, { backgroundColor: item.accentLight, borderColor: `${item.accent}22` }]}>
                <Text style={[styles.highlightText, { color: item.accent }]}>✦ {h}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.imageContainer}>
          <Image source={item.senya} style={styles.senyaImage} contentFit="contain" />
        </View>
      </GlassCard>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: slide.bg }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.logoText}>SEÑAS</Text>
        {!isLast && (
          <Pressable style={styles.skipBtn} onPress={() => router.replace('/role')}>
            <Text style={styles.skipText}>Skip</Text>
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
                width: i === current ? 24 : 8,
                backgroundColor: i <= current ? slide.accent : 'rgba(15,49,114,0.15)',
              },
            ]}
          />
        ))}
      </View>

      {/* Swipeable Main Card - Using FlatList */}
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
          contentContainerStyle={{ paddingHorizontal: 16 }}
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
        <GlassCard style={styles.bubbleCard}>
          <Text style={styles.bubbleText}>{slide.bubbleText}</Text>
        </GlassCard>
      </View>

      {/* Navigation */}
      <View style={styles.navContainer}>
        {current > 0 && (
          <Pressable style={styles.backBtn} onPress={back}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.nextBtn, isLast && styles.nextBtnLast]}
          onPress={next}
        >
          <Text style={styles.nextBtnText}>{isLast ? 'Get Started 🤙' : 'Next'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logoText: { color: '#0f3172', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  skipBtn: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  skipText: { color: '#4b7bbb', fontSize: 13, fontWeight: '600' },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  dot: { height: 8, borderRadius: 99 },
  mainContent: { flex: 1, paddingVertical: 16 },
  slideContainer: {
    width: width,
    paddingHorizontal: 16,
    flex: 1,
  },
  card: {
    flex: 1,
    padding: 20,
    paddingTop: 22,
  },
  cardTopStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f3172',
    lineHeight: 28,
    marginBottom: 10,
  },
  body: { fontSize: 14, color: '#334155', lineHeight: 22, marginBottom: 14 },
  highlightsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  highlightChip: { borderWidth: 1, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 12 },
  highlightText: { fontSize: 12, fontWeight: '700' },
  imageContainer: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end' },
  senyaImage: { width: 160, height: 160 },
  speechContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  senyaMini: { width: 52, height: 52 },
  bubbleCard: { flex: 1, padding: 12, borderRadius: 14, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 12.5, color: '#0f3172', fontWeight: '500', lineHeight: 18 },
  navContainer: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28 },
  backBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderRadius: 60,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#0f3172', fontSize: 15, fontWeight: '700' },
  nextBtn: {
    flex: 2,
    backgroundColor: '#2563EB',
    borderRadius: 60,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnLast: { backgroundColor: '#F59E0B' },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});