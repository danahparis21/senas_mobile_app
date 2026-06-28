import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const tips = [
  {
    img: require('../assets/images/img/senyas_logo.png'),
    title: "Hi, I'm Senya!",
    body: "I'm your friendly guide on this FSL learning journey. I'll be right here whenever you need help!",
    color: '#3B82F6',
    iconImg: require('../assets/images/img/greet.png'),
  },
  {
    img: require('../assets/images/img/senya_teaching.png'),
    title: 'Watch & Learn',
    body: "Each lesson shows you how a sign looks. Watch carefully, then try it yourself!",
    color: '#F59E0B',
    iconImg: require('../assets/images/img/lesson.png'),
  },
  {
    img: require('../assets/images/img/senya_magnify.png'),
    title: 'Practice Makes Perfect',
    body: "Use the camera to practice your signs and get real-time feedback. Don't worry, you got this!",
    color: '#10B981',
    iconImg: require('../assets/images/img/camera.png'),
  },
  {
    img: require('../assets/images/img/senya_blue.png'),
    title: 'Earn Badges!',
    body: 'Complete lessons and quizzes to earn XP and unlock badges. Every sign learned is a victory!',
    color: '#8B5CF6',
    iconImg: require('../assets/images/img/badges.png'),
  },
];

// Darken map
const darkenMap: Record<string, string> = {
  '#3B82F6': '#1D4ED8',
  '#F59E0B': '#B45309',
  '#10B981': '#047857',
  '#8B5CF6': '#6D28D9',
};

export default function Tutorial() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [showList, setShowList] = useState(false);

  const tip = tips[step];
  const darkerColor = darkenMap[tip.color] || '#1D4ED8';

  if (showList) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.listContent}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back to Dashboard</Text>
          </Pressable>

          <Text style={styles.listTitle}>Senya's Tips</Text>
          <Text style={styles.listSubtitle}>Tap a tip to learn more from your guide.</Text>

          <View style={styles.tipList}>
            {tips.map((t, i) => (
              <Pressable key={i} style={styles.tipListItem} onPress={() => { setStep(i); setShowList(false); }}>
                <View style={[styles.tipListIconBox, { backgroundColor: t.color + '20' }]}>
                  <Image source={t.iconImg} style={styles.tipListIcon} contentFit="contain" />
                </View>
                <View style={styles.tipListText}>
                  <Text style={styles.tipListItemTitle}>{t.title}</Text>
                  <Text style={styles.tipListItemSub}>Tap to view tip</Text>
                </View>
                <Text style={styles.tipListChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.fullContainer, { backgroundColor: tip.color + '10' }]}>
      {/* Skip button */}
      <SafeAreaView>
        <View style={styles.topRow}>
          <Pressable style={styles.allTipsBtn} onPress={() => setShowList(true)}>
            <Text style={styles.allTipsBtnText}>All Tips ↗</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Senya image */}
      <View style={styles.senyaImgWrapper}>
        <View style={[styles.senyaGlow, { backgroundColor: tip.color + '30', shadowColor: tip.color }]}>
          <Image source={tip.img} style={styles.senyaImg} contentFit="contain" />
        </View>
      </View>

      {/* Speech bubble card */}
      <View style={styles.cardWrapper}>
        {/* bubble tail */}
        <View style={styles.bubbleTail}>
          <View style={styles.bubbleTailInner} />
        </View>

        <View style={styles.speechCard}>
          {/* Icon + Title */}
          <View style={styles.cardIconRow}>
            <View style={[styles.cardIconBox, { backgroundColor: tip.color + '20' }]}>
              <Image source={tip.iconImg} style={styles.cardIcon} contentFit="contain" />
            </View>
            <Text style={styles.cardTitle}>{tip.title}</Text>
          </View>

          {/* Body */}
          <Text style={styles.cardBody}>{tip.body}</Text>

          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {tips.map((_, i) => (
              <Pressable key={i} onPress={() => setStep(i)}>
                <View style={[
                  styles.dot,
                  i === step
                    ? { width: 28, backgroundColor: tip.color }
                    : { width: 8, backgroundColor: 'rgba(15,49,114,0.2)' }
                ]} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Navigation buttons */}
      <View style={styles.navBtns}>
        {step > 0 && (
          <Pressable style={styles.backNavBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.backNavText}>← Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.nextBtn,
            { flex: step > 0 ? 2 : 1, backgroundColor: tip.color, shadowColor: tip.color }
          ]}
          onPress={() => {
            if (step < tips.length - 1) setStep(step + 1);
            else router.push('/(tabs)/dashboard');
          }}
        >
          <Text style={styles.nextBtnText}>
            {step < tips.length - 1 ? 'Got it! Next →' : 'Start Learning →'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eaf5fd' },
  fullContainer: { flex: 1 },

  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 12 },
  allTipsBtn: {
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
  },
  allTipsBtnText: { fontSize: 13, fontWeight: '600', color: '#4b7bbb' },

  senyaImgWrapper: { alignItems: 'center', paddingVertical: 16 },
  senyaGlow: {
    width: 200, height: 200, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 12,
  },
  senyaImg: { width: 170, height: 170 },

  cardWrapper: { paddingHorizontal: 20, flex: 1 },
  bubbleTail: { alignItems: 'center', marginBottom: -1 },
  bubbleTailInner: {
    width: 20, height: 12,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    marginBottom: -6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
  },
  speechCard: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 28, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 8,
  },
  cardIconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { width: 28, height: 28 },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#0f3172', flex: 1 },
  cardBody: { fontSize: 15, color: '#334155', lineHeight: 25, fontWeight: '500', marginBottom: 24 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { height: 8, borderRadius: 4 },

  navBtns: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },
  backNavBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
  },
  backNavText: { fontSize: 15, fontWeight: '600', color: '#0f3172' },
  nextBtn: {
    paddingVertical: 14, borderRadius: 60, alignItems: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  nextBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // List view
  listContent: { padding: 24, paddingBottom: 60 },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16,
    alignSelf: 'flex-start', marginBottom: 24,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#0f3172' },
  listTitle: { fontSize: 24, fontWeight: '800', color: '#0f3172', marginBottom: 4 },
  listSubtitle: { fontSize: 14, color: '#4b7bbb', fontWeight: '500', marginBottom: 20 },
  tipList: { gap: 12 },
  tipListItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tipListIconBox: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipListIcon: { width: 32, height: 32 },
  tipListText: { flex: 1 },
  tipListItemTitle: { fontSize: 16, fontWeight: '800', color: '#0f3172', marginBottom: 2 },
  tipListItemSub: { fontSize: 12, color: '#6B7280' },
  tipListChevron: { color: '#9CA3AF', fontSize: 20 },
});
