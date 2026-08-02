import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Polyline, Rect, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import ConfettiCannon from 'react-native-confetti-cannon';

// ICON MAPPING - Map backend achievement codes to local images
const ACHIEVEMENT_IMAGES: Record<string, any> = {
  'xp_50': require('../../assets/images/img/first_step.png'),
  'xp_100': require('../../assets/images/img/alphabet_star.png'),
  'xp_250': require('../../assets/images/img/streak1.png'),
  'xp_500': require('../../assets/images/img/greetings.png'),
  'xp_1000': require('../../assets/images/img/numbers.png'),
  'beginner_welcome': require('../../assets/images/img/first_step.png'),
  'alphabet_master': require('../../assets/images/img/alphabet_star.png'),
  'streak_3': require('../../assets/images/img/streak1.png'),
  'streak_7': require('../../assets/images/img/greetings.png'),
  'numbers_master': require('../../assets/images/img/numbers.png'),
  'intermediate_reached': require('../../assets/images/img/greetings.png'),
  'advanced_reached': require('../../assets/images/img/greetings.png'),
  'graduated': require('../../assets/images/img/greetings.png'),
  'quiz_whiz': require('../../assets/images/img/greetings.png'),
  'leaderboard_top': require('../../assets/images/img/greetings.png'),
  'greetings_master': require('../../assets/images/img/greetings.png'),
};

// Default image for achievements without specific mapping
const DEFAULT_IMAGE = require('../../assets/images/img/badges.png');

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

// ── ICONS (no emoji) ────────────────────────────────────────────────
function LightningIcon({ size = 12, color = '#1848c8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13 2 4.5 13.5H11L10 22 19.5 10.5H13L13 2Z" />
    </Svg>
  );
}

function CheckIcon({ size = 11, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockIcon({ size = 11, color = '#9CA3AF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="10" width="16" height="10" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M7 10V7a5 5 0 0 1 10 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function TrophyIcon({ size = 12, color = '#4b7bbb' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <Path d="M17 5h3a2 2 0 0 1-2 4M7 5H4a2 2 0 0 0 2 4" />
    </Svg>
  );
}

function CloseIcon({ size = 16, color = '#4b5563' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}


// Achievement Type from Backend
interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  is_unlocked: boolean;
  unlocked_at: string | null;
  progress: {
    current: number;
    target: number;
    percentage: number;
  } | null;
}

export default function Achievements() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [streakDays, setStreakDays] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [filter, setFilter] = useState('all');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newlyEarned, setNewlyEarned] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openAchievementModal = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setModalVisible(true);
  };

  const closeAchievementModal = () => {
    // Only hide — don't clear selectedAchievement yet, so the card's
    // content stays rendered through the fade-out instead of vanishing
    // and leaving an empty rounded rectangle behind for the animation
    // to fade out on its own.
    setModalVisible(false);
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  useEffect(() => {
    if (newlyEarned) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [newlyEarned]);

  const fetchAchievements = async () => {
    try {
      setLoading(true);

      // Get student name from storage
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const student = user.student;
        setStudentName(`${student?.first_name || ''} ${student?.last_name || ''}`.trim());
      }

      // Fetch achievements from backend
      const response = await api.getAchievements();

      if (response.success) {
        setAchievements(response.achievements || []);

        // Update XP, level, streak from the response
        // The response includes student summary
        if (response.summary) {
          // We'll get XP from the student data in the response
          // Or from the getStudentLessons call
        }
      }

      // Also fetch XP data
      const lessonsResponse = await api.getStudentLessons();
      if (lessonsResponse.success && lessonsResponse.student) {
        setTotalXP(lessonsResponse.student.total_xp || 0);
        setLevel(lessonsResponse.student.level || 1);
        setStreakDays(lessonsResponse.student.streak_days || 0);
      }

    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementImage = (code: string) => {
    return ACHIEVEMENT_IMAGES[code] || DEFAULT_IMAGE;
  };

  const earnedCount = achievements.filter(a => a.is_unlocked).length;
  const totalCount = achievements.length;

  const filteredAchievements = achievements.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'earned') return a.is_unlocked;
    if (filter === 'locked') return !a.is_unlocked;
    return true;
  });

  // Sort: unlocked first, then by order
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.is_unlocked && !b.is_unlocked) return -1;
    if (!a.is_unlocked && b.is_unlocked) return 1;
    return (a.id || 0) - (b.id || 0);
  });

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

        {/* Top Bar
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
        </View> */}

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
                    <Text style={styles.heroBadgeTextOrange}>{earnedCount}/{totalCount} badges</Text>
                  </View>
                  <View style={styles.heroBadgeBlue}>
                    <LightningIcon size={12} color="#1848c8" />
                    <Text style={styles.heroBadgeTextBlue}>{totalXP} XP</Text>
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
              {totalXP >= 500 && <TrophyIcon size={12} color="#4b7bbb" />}
              <Text style={styles.xpToNextText}>
                {totalXP < 500 ? `${500 - totalXP} XP to next` : 'Max Level!'}
              </Text>
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
            { key: "all", label: `All (${totalCount})` },
            { key: "earned", label: `Earned (${earnedCount})` },
            { key: "locked", label: `Locked (${totalCount - earnedCount})` },
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
            {sortedAchievements.map((achievement) => {
              const earned = achievement.is_unlocked;
              const progress = achievement.progress;
              const progressPercent = progress?.percentage || 0;

              return (
                <Pressable
                  key={achievement.id}
                  style={styles.badgeCardPressable}
                  onPress={() => openAchievementModal(achievement)}
                >
                  <GlassCard style={[styles.badgeCard, !earned && { opacity: 0.85 }]}>
                    {earned && (
                      <View style={styles.earnedRibbon}>
                        <CheckIcon size={9} color="#fff" />
                        <Text style={styles.earnedRibbonText}>EARNED</Text>
                      </View>
                    )}

                    <View style={styles.badgeIconBox}>
                      {earned ? (
                        <View style={[styles.customBadgeBox, { shadowColor: achievement.color }]}>
                          <Image
                            source={getAchievementImage(achievement.code)}
                            style={{ width: 56, height: 56 }}
                            contentFit="contain"
                          />
                        </View>
                      ) : (
                        <View style={styles.lockedBadgeBox}>
                          <Image
                            source={require('../../assets/images/img/locked.png')}
                            style={{ width: 52, height: 52, opacity: 0.7 }}
                            contentFit="contain"
                          />
                          {/* Show progress bar for locked achievements */}
                          {progress && progress.target > 0 && (
                            <View style={styles.progressMiniTrack}>
                              <View
                                style={[
                                  styles.progressMiniFill,
                                  { width: `${Math.min(progressPercent, 100)}%` }
                                ]}
                              />
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    <Text
                      style={[styles.badgeName, earned ? { color: '#0f3172' } : { color: '#9CA3AF' }]}
                      numberOfLines={1}
                    >
                      {achievement.name}
                    </Text>
                    <Text style={styles.badgeDesc} numberOfLines={2}>{achievement.description}</Text>

                    <View style={styles.progressTextSlot}>
                      {!earned && progress && progress.target > 0 && (
                        <Text style={styles.progressText}>
                          {progress.current} / {progress.target}
                        </Text>
                      )}
                    </View>

                    <View style={[styles.badgeXpTag, earned ? { backgroundColor: `${achievement.color}15` } : { backgroundColor: 'rgba(15,49,114,0.06)' }]}>
                      {earned ? (
                        <CheckIcon size={10} color={achievement.color} />
                      ) : (
                        <LockIcon size={10} color="#9CA3AF" />
                      )}
                      <Text style={[styles.badgeXpText, earned ? { color: achievement.color } : { color: '#9CA3AF' }]}>
                        {progress?.target ? `${progress.target} required` : (earned ? 'Achieved' : 'Achievement')}
                      </Text>
                    </View>
                  </GlassCard>
                </Pressable>
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

      {/* Achievement detail modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAchievementModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeAchievementModal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedAchievement && (() => {
              const isEarned = selectedAchievement.is_unlocked;
              const modalProgress = selectedAchievement.progress;
              const modalProgressPercent = modalProgress?.percentage || 0;

              return (
                <>
                  <Pressable
                    style={styles.modalCloseBtn}
                    onPress={closeAchievementModal}
                  >
                    <CloseIcon size={16} color="#4b5563" />
                  </Pressable>

                  {isEarned ? (
                    <View style={[styles.modalBadgeBox, { shadowColor: selectedAchievement.color }]}>
                      <Image
                        source={getAchievementImage(selectedAchievement.code)}
                        style={{ width: 72, height: 72 }}
                        contentFit="contain"
                      />
                    </View>
                  ) : (
                    <View style={styles.modalLockedBadgeBox}>
                      <Image
                        source={require('../../assets/images/img/locked.png')}
                        style={{ width: 72, height: 72, opacity: 0.7 }}
                        contentFit="contain"
                      />
                    </View>
                  )}

                  <Text style={styles.modalName}>{selectedAchievement.name}</Text>

                  <View style={[
                    styles.modalStatusPill,
                    isEarned ? styles.modalStatusPillEarned : styles.modalStatusPillLocked,
                  ]}>
                    {isEarned ? <CheckIcon size={11} color="#fff" /> : <LockIcon size={11} color="#6B7280" />}
                    <Text style={[styles.modalStatusText, { color: isEarned ? '#fff' : '#6B7280' }]}>
                      {isEarned ? 'Earned' : 'Locked'}
                    </Text>
                  </View>

                  <Text style={styles.modalDesc}>{selectedAchievement.description}</Text>

                  {isEarned && selectedAchievement.unlocked_at && (
                    <Text style={styles.modalUnlockedDate}>
                      Unlocked on {new Date(selectedAchievement.unlocked_at).toLocaleDateString('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </Text>
                  )}

                  {!isEarned && modalProgress && modalProgress.target > 0 && (
                    <View style={styles.modalProgressSection}>
                      <View style={styles.modalProgressHeader}>
                        <Text style={styles.modalProgressLabel}>PROGRESS</Text>
                        <Text style={styles.modalProgressValue}>
                          {modalProgress.current} / {modalProgress.target}
                        </Text>
                      </View>
                      <View style={styles.modalProgressTrack}>
                        <View style={[styles.modalProgressFill, { width: `${Math.min(modalProgressPercent, 100)}%` }]} />
                      </View>
                    </View>
                  )}

                  {selectedAchievement.category && (
                    <View style={styles.modalCategoryTag}>
                      <Text style={styles.modalCategoryText}>{selectedAchievement.category}</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
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
  heroCard: { padding: 18, paddingRight: 10, overflow: 'hidden' },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTextContent: { flex: 1, paddingRight: 4 },
  heroSubtitle: { color: '#4b7bbb', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#0f3172', marginBottom: 10 },
  heroBadgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroBadgeOrange: { backgroundColor: 'rgba(245,158,11,0.13)', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroBadgeTextOrange: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  heroBadgeBlue: { backgroundColor: 'rgba(37,99,235,0.10)', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroBadgeTextBlue: { fontSize: 12, fontWeight: '800', color: '#1848c8' },
  senyaHero: { width: 140, height: 140, marginVertical: -18, marginRight: -12 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f3172' },
  xpToNextBadge: { backgroundColor: 'rgba(15,49,114,0.08)', borderRadius: 99, paddingVertical: 3, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  badgeCardPressable: { width: '48%' },
  badgeCard: { padding: 16, overflow: 'hidden' },
  earnedRibbon: { position: 'absolute', top: 0, right: 0, backgroundColor: '#10B981', borderBottomLeftRadius: 12, paddingVertical: 4, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  earnedRibbonText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  badgeIconBox: { alignItems: 'center', marginBottom: 10, marginTop: 8 },
  customBadgeBox: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  lockedBadgeBox: { width: 76, height: 76, borderRadius: 24, backgroundColor: 'rgba(156,163,175,0.15)', alignItems: 'center', justifyContent: 'center' },
  badgeName: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  badgeDesc: { fontSize: 10.5, color: '#6B7280', lineHeight: 14, height: 28, marginBottom: 0 },
  badgeXpTag: { alignSelf: 'flex-start', borderRadius: 99, paddingVertical: 3, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeXpText: { fontSize: 11, fontWeight: '800' },
  progressTextSlot: { height: 16, marginBottom: 2, alignItems: 'center', justifyContent: 'center' },
  progressText: { fontSize: 10, color: '#6B7280', textAlign: 'center' },
  progressMiniTrack: { width: 40, height: 4, backgroundColor: 'rgba(156,163,175,0.3)', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressMiniFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 2 },

  // Achievement detail modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,26,46,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15,49,114,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBadgeBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modalLockedBadgeBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(156,163,175,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  modalName: { fontSize: 19, fontWeight: '800', color: '#0f3172', textAlign: 'center', marginBottom: 8 },
  modalStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  modalStatusPillEarned: { backgroundColor: '#10B981' },
  modalStatusPillLocked: { backgroundColor: 'rgba(156,163,175,0.18)' },
  modalStatusText: { fontSize: 12, fontWeight: '800' },
  modalDesc: { fontSize: 13.5, color: '#4b5563', textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  modalUnlockedDate: { fontSize: 11.5, color: '#9CA3AF', fontWeight: '600', marginBottom: 4 },
  modalProgressSection: { width: '100%', marginTop: 4, marginBottom: 14 },
  modalProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  modalProgressLabel: { fontSize: 10, fontWeight: '700', color: '#4b7bbb', letterSpacing: 0.6 },
  modalProgressValue: { fontSize: 11, fontWeight: '800', color: '#0f3172' },
  modalProgressTrack: { height: 8, borderRadius: 99, backgroundColor: 'rgba(15,49,114,0.10)', overflow: 'hidden' },
  modalProgressFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 99 },
  modalCategoryTag: { marginTop: 2, backgroundColor: 'rgba(15,49,114,0.06)', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 12 },
  modalCategoryText: { fontSize: 10.5, fontWeight: '700', color: '#4b7bbb', textTransform: 'capitalize' },
});