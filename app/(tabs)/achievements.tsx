import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import ConfettiCannon from 'react-native-confetti-cannon';

// Badge definitions with XP requirements
const BADGE_DEFINITIONS = [
  {
    id: 'first_step',
    name: "First Step",
    image: require('../../assets/images/img/first_step.png'),
    desc: "Complete your first lesson",
    xpRequired: 0,
    color: "#10B981"
  },
  {
    id: 'alphabet_star',
    name: "Alphabet Star",
    image: require('../../assets/images/img/alphabet_star.png'),
    desc: "Learn all 26 FSL alphabet signs",
    xpRequired: 50,
    color: "#F59E0B"
  },
  {
    id: 'streak_starter',
    name: "Streak Starter",
    image: require('../../assets/images/img/streak1.png'),
    desc: "Practice 3 days in a row",
    xpRequired: 30,
    color: "#EF4444"
  },
  {
    id: 'greeter',
    name: "Greeter",
    image: require('../../assets/images/img/greetings.png'),
    desc: "Complete the Greetings module",
    xpRequired: 100,
    color: "#06B6D4"
  },
  {
    id: 'quiz_whiz',
    name: "Quiz Whiz",
    image: require('../../assets/images/img/greetings.png'), // Using existing image as placeholder
    desc: "Score 100% on any quiz",
    xpRequired: 150,
    color: "#8B5CF6"
  },
  {
    id: 'sign_detective',
    name: "Sign Detective",
    image: require('../../assets/images/img/first_step.png'), // Using existing image as placeholder
    desc: "Use gesture recognition 10 times",
    xpRequired: 200,
    color: "#2563EB"
  },
  {
    id: 'number_ninja',
    name: "Number Ninja",
    image: require('../../assets/images/img/numbers.png'),
    desc: "Learn numbers 1–10",
    xpRequired: 80,
    color: "#F97316"
  },
  {
    id: 'week_warrior',
    name: "Week Warrior",
    image: require('../../assets/images/img/greetings.png'), // Using existing image as placeholder
    desc: "7-day learning streak",
    xpRequired: 250,
    color: "#EC4899"
  },
];


const MILESTONES = [
  { label: "50 XP", xp: 50 },
  { label: "100 XP", xp: 100 },
  { label: "250 XP", xp: 250 },
  { label: "500 XP", xp: 500 },
  { label: "1000 XP", xp: 1000 },
];

function MilestoneIcon({ done }: { done: boolean }) {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {done ? (
        <>
          <Circle cx="12" cy="12" r="10" fill="#D97706" />
          <Polyline points="8 12 11 15 16 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <Circle cx="12" cy="12" r="10" stroke="#9CA3AF" strokeWidth="2" />
          <Path d="M8 8L16 16M16 8L8 16" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

export default function Achievements() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [streakDays, setStreakDays] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [filter, setFilter] = useState('all');
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [newlyEarned, setNewlyEarned] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);


  useEffect(() => {
    fetchStudentData();
  }, []);

  useEffect(() => {
    if (newlyEarned) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [newlyEarned]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const student = user.student;
        setStudentName(`${student?.first_name || ''} ${student?.last_name || ''}`.trim());
      }

      // Fetch latest XP data from API
      const response = await api.getStudentLessons();
      if (response.success && response.student) {
        setTotalXP(response.student.total_xp || 0);
        setLevel(response.student.level || 1);
        setStreakDays(response.student.streak_days || 0);
        calculateEarnedBadges(response.student.total_xp || 0);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEarnedBadges = (xp: number) => {
    const earned = BADGE_DEFINITIONS
      .filter(badge => xp >= badge.xpRequired)
      .map(badge => badge.id);
    setEarnedBadges(earned);
  };

  const isBadgeEarned = (badgeId: string) => earnedBadges.includes(badgeId);

  const getBadgeStatus = (badgeId: string) => {
    if (isBadgeEarned(badgeId)) return 'earned';
    return 'locked';
  };

  const xpToNext = 500 - totalXP;
  const earned = earnedBadges.length;

  const filteredBadges = BADGE_DEFINITIONS.filter(b =>
    filter === "all" ? true :
      filter === "earned" ? isBadgeEarned(b.id) :
        !isBadgeEarned(b.id)
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E4F8A" />
        <Text style={styles.loadingText}>Loading achievements...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.logoText}>SEÑAS</Text>
          <View style={styles.topBarRight}>
            <View style={styles.streakBadge}>
              <Svg width="14" height="14" viewBox="0 0 24 24" fill="#fb923c">
                <Path d="M12 2c0 6-8 8-8 14a8 8 0 0016 0C20 10 12 8 12 2z" />
              </Svg>
              <Text style={styles.streakText}>{streakDays}</Text>
            </View>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.section}>
          <GlassCard style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.heroTextContent}>
                <Text style={styles.heroSubtitle}>{studentName}'s collection</Text>
                <Text style={styles.heroTitle}>Achievements</Text>
                <View style={styles.heroBadgesRow}>
                  <View style={styles.heroBadgeOrange}>
                    <Image source={require('../../assets/images/img/badges.png')} style={{ width: 16, height: 16 }} />
                    <Text style={styles.heroBadgeTextOrange}>{earned}/{BADGE_DEFINITIONS.length} badges</Text>
                  </View>
                  <View style={styles.heroBadgeBlue}>
                    <Text style={styles.heroBadgeTextBlue}>⚡ {totalXP} XP</Text>
                  </View>
                  <View style={[styles.heroBadgeBlue, { backgroundColor: 'rgba(239,68,68,0.10)' }]}>
                    <Text style={[styles.heroBadgeTextBlue, { color: '#EF4444' }]}>Level {level}</Text>
                  </View>
                </View>
              </View>
              <Image source={require('../../assets/images/img/senya_blue.png')} style={styles.senyaHero} contentFit="contain" />
            </View>
          </GlassCard>
        </View>

        {/* XP Milestones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>XP Milestones</Text>
            <View style={styles.xpToNextBadge}>
              <Text style={styles.xpToNextText}>{xpToNext > 0 ? `${xpToNext} XP to next` : '🎉 Max Level!'}</Text>
            </View>
          </View>
          <GlassCard style={styles.milestoneCard}>
            <View style={styles.milestoneRow}>
              {MILESTONES.map((m, i) => {
                const done = totalXP >= m.xp;
                return (
                  <View key={i} style={[styles.milestoneItem, i < MILESTONES.length - 1 && { flex: 1 }]}>
                    <View style={[styles.milestoneCircle, done ? styles.milestoneDone : styles.milestoneUndone]}>
                      <MilestoneIcon done={done} />
                    </View>
                    {i < MILESTONES.length - 1 && (
                      <View style={[styles.milestoneLine, MILESTONES[i + 1]?.xp <= totalXP && styles.milestoneLineDone]} />
                    )}
                  </View>
                );
              })}
            </View>
            <View style={styles.milestoneLabelsRow}>
              {MILESTONES.map((m, i) => (
                <Text key={i} style={[styles.milestoneLabel, totalXP >= m.xp ? { color: '#92400E' } : { color: '#9CA3AF' }, i < MILESTONES.length - 1 && { flex: 1 }]}>{m.label}</Text>
              ))}
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>CURRENT PROGRESS</Text>
                <Text style={styles.progressValue}>{totalXP} / 500 XP</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min((totalXP / 500) * 100, 100)}%` }]} />
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          {[
            { key: "all", label: `All (${BADGE_DEFINITIONS.length})` },
            { key: "earned", label: `Earned (${earned})` },
            { key: "locked", label: `Locked (${BADGE_DEFINITIONS.length - earned})` },
          ].map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => setFilter(tab.key)}
              style={[styles.filterBtn, filter === tab.key && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, filter === tab.key && styles.filterTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.gridSection}>
          <View style={styles.grid}>
            {filteredBadges.map((b, i) => {
              const earned = isBadgeEarned(b.id);
              return (
                <GlassCard key={i} style={[styles.badgeCard, !earned && { opacity: 0.85 }]}>
                  {earned && (
                    <View style={styles.earnedRibbon}>
                      <Text style={styles.earnedRibbonText}>✓ EARNED</Text>
                    </View>
                  )}

                  <View style={styles.badgeIconBox}>
                    {earned ? (
                      <View style={[styles.customBadgeBox, { shadowColor: b.color }]}>
                        <Image source={b.image as any} style={{ width: 40, height: 40 }} contentFit="contain" />
                      </View>
                    ) : (
                      <View style={styles.lockedBadgeBox}>
                        <Image source={require('../../assets/images/img/locked.png')} style={{ width: 40, height: 40, opacity: 0.7 }} contentFit="contain" />
                      </View>
                    )}
                  </View>

                  <Text style={[styles.badgeName, earned ? { color: '#0f3172' } : { color: '#9CA3AF' }]}>{b.name}</Text>
                  <Text style={styles.badgeDesc}>{b.desc}</Text>

                  <View style={[styles.badgeXpTag, earned ? { backgroundColor: `${b.color}15` } : { backgroundColor: 'rgba(15,49,114,0.06)' }]}>
                    <Text style={[styles.badgeXpText, earned ? { color: b.color } : { color: '#9CA3AF' }]}>
                      {earned ? '✅ ' : '🔒 '}{b.xpRequired} XP required
                    </Text>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        </View>


      </ScrollView>
      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
          fallSpeed={3000}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eaf5fd' },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf5fd' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#666' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  logoText: { color: '#0f3172', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakBadge: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  streakText: { color: '#0f3172', fontSize: 13, fontWeight: '700' },

  section: { paddingHorizontal: 16, marginTop: 14 },
  heroCard: { padding: 18 },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between' },
  heroTextContent: { flex: 1, paddingRight: 8 },
  heroSubtitle: { color: '#4b7bbb', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#0f3172', marginBottom: 10 },
  heroBadgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroBadgeOrange: { backgroundColor: 'rgba(245,158,11,0.13)', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroBadgeTextOrange: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  heroBadgeBlue: { backgroundColor: 'rgba(37,99,235,0.10)', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 12 },
  heroBadgeTextBlue: { fontSize: 12, fontWeight: '800', color: '#1848c8' },
  senyaHero: { width: 90, height: 90 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f3172' },
  xpToNextBadge: { backgroundColor: 'rgba(15,49,114,0.08)', borderRadius: 99, paddingVertical: 3, paddingHorizontal: 10 },
  xpToNextText: { fontSize: 11, fontWeight: '700', color: '#4b7bbb' },

  milestoneCard: { padding: 18 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center' },
  milestoneItem: { flexDirection: 'row', alignItems: 'center' },
  milestoneCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  milestoneDone: { backgroundColor: '#D97706' },
  milestoneUndone: { backgroundColor: 'rgba(15,49,114,0.08)', borderWidth: 2, borderColor: 'rgba(15,49,114,0.15)' },
  milestoneLine: { flex: 1, height: 4, backgroundColor: 'rgba(15,49,114,0.10)', borderRadius: 99 },
  milestoneLineDone: { backgroundColor: '#F59E0B' },
  milestoneLabelsRow: { flexDirection: 'row', marginTop: 8 },
  milestoneLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center', minWidth: 36 },

  progressSection: { marginTop: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressTitle: { fontSize: 10, fontWeight: '700', color: '#4b7bbb', letterSpacing: 0.8 },
  progressValue: { fontSize: 11, fontWeight: '800', color: '#0f3172' },
  progressTrack: { backgroundColor: 'rgba(15,49,114,0.10)', borderRadius: 99, height: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 99 },

  filterSection: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16 },
  filterBtn: { flex: 1, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.62)', borderColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderRadius: 12, alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#1848c8', borderWidth: 0 },
  filterText: { fontSize: 12, fontWeight: '700', color: '#4b7bbb' },
  filterTextActive: { color: '#fff' },

  gridSection: { paddingHorizontal: 16, marginTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  badgeCard: { width: '48%', padding: 16, overflow: 'hidden' },
  earnedRibbon: { position: 'absolute', top: 0, right: 0, backgroundColor: '#10B981', borderBottomLeftRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  earnedRibbonText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  badgeIconBox: { alignItems: 'center', marginBottom: 10, marginTop: 10 },
  customBadgeBox: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  lockedBadgeBox: { width: 56, height: 56, borderRadius: 20, backgroundColor: 'rgba(156,163,175,0.15)', alignItems: 'center', justifyContent: 'center' },
  badgeName: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  badgeDesc: { fontSize: 10.5, color: '#6B7280', lineHeight: 14, marginBottom: 8 },
  badgeXpTag: { alignSelf: 'flex-start', borderRadius: 99, paddingVertical: 3, paddingHorizontal: 10 },
  badgeXpText: { fontSize: 11, fontWeight: '800' },
});