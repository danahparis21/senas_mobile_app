// app/(tabs)/dashboard.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Animated,
  Easing,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Line, Polyline, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import PromotionModal from '../../components/PromotionModal';
import AchievementModal from '../../components/AchievementModal';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ── SUNNY SKY PALETTE ────────────────────────────────────────────────
const GRADIENT = {
  start: '#c1eaffff',
  mid: '#BFE7FB',
  mid2: '#E6F4FE',
  end: '#F8FCFF',
};

const C = {
  ink: '#123A6B',
  inkSoft: '#5B84B1',
  blue: '#2F86D8',
  blueDeep: '#1E63B8',
  sun: '#FBBF24',
  sunDeep: '#B4700A',
  card: 'rgba(255,255,255,0.92)',
  cardLine: 'rgba(255,255,255,0.9)',
  mint: '#E6F7EF',
  lilac: '#EFEBFC',
  peach: '#FFF1DC',
  sky: '#E6F1FF',
};

interface ChallengeGoal {
  id: string;
  type: string;
  title: string;
  description: string;
  target: number;
  xp_reward: number;
  icon: string;
  current: number;
  is_completed: boolean;
  completed_at: string | null;
}

interface DailyChallengeData {
  id: number;
  date: string;
  theme: string;
  is_completed: boolean;
  completed_at: string | null;
  goals: ChallengeGoal[];
  summary: {
    completed: number;
    total: number;
    progress_percentage: number;
    xp_earned_so_far: number;
    bonus_xp_available: number;
  };
}

// ── DAILY CHALLENGE GOAL ICONS ──────────────────────────────────────
// One real image per goal type instead of the backend's emoji field.
// Swap any path below to change an icon — nothing else needs to change.
const GOAL_ICONS: Record<string, any> = {
  time_spent: require('../../assets/images/img/time.png'),
  gesture_practice: require('../../assets/images/img/greet.png'),
  bonus_practice: require('../../assets/images/img/few.png'),
  lesson_completion: require('../../assets/images/img/lesson.png'),
  quiz_attempt: require('../../assets/images/img/badges.png'),
};
// Used for any goal type the map above doesn't recognize.
const DEFAULT_GOAL_ICON = require('../../assets/images/img/everything.png');
// Shown on the "all goals complete" bonus banner.
const CHALLENGE_COMPLETE_ICON = require('../../assets/images/img/experienced.png');

const getGoalIcon = (type: string) => GOAL_ICONS[type] ?? DEFAULT_GOAL_ICON;

// ── SMALL ICONS (no emoji) ───────────────────────────────────────────
function CheckIcon({ size = 11, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2 L14.3 9.7 L22 12 L14.3 14.3 L12 22 L9.7 14.3 L2 12 L9.7 9.7 Z"
        fill="#FBBF24"
      />
    </Svg>
  );
}


// ── ANIMATED CLOUD ───────────────────────────────────────────────────
function AnimatedCloud({ scale = 1, opacity = 0.4 }) {
  return (
    <Svg width={120 * scale} height={60 * scale} viewBox="0 0 120 60" opacity={opacity}>
      <Defs>
        <LinearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.55" />
        </LinearGradient>
      </Defs>
      <Path
        d="M20 40 C10 40 5 30 12 22 C8 12 20 5 30 10 C38 2 52 2 60 8 C68 3 80 5 85 14 C95 12 105 18 100 28 C110 35 108 48 95 50 L25 50 C18 50 14 45 20 40Z"
        fill="url(#cloudGrad)"
      />
    </Svg>
  );
}

// ── RING PROGRESS ────────────────────────────────────────────────────
function ProgressRing({ pct, size = 86, stroke = 9 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(Math.max(pct, 0), 100) / 100) * circumference;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(47,134,216,0.15)" strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#2F86D8"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${dash}, ${circumference}`}
        transform={`rotate(-90, ${size / 2}, ${size / 2})`}
      />
    </Svg>
  );
}

interface Lesson {
  lesson_id: number;
  title: string;
  description: string;
  lesson_type: string;
  difficulty: string;
  status: string;
  assigned_at: string;
  has_quiz: boolean;
  total_steps: number;
  is_locked?: boolean;
  is_next_lesson?: boolean;
  score?: number | null;
  progress: {
    current_step: number;
    lesson_completed: boolean;
    quiz_completed: boolean;
    quiz_score: number | null;
  } | null;
}

// One row per teacher module for "Continue Learning" — aggregated from
// api.getStudentLessons(), the same source lessons.tsx uses to build its
// per-module lesson map.
interface ModuleSummary {
  module_id: number;
  title: string;
  totalCount: number;
  doneCount: number;
  percent: number;
}

// Module card accents — shades of blue only, matching the app's brand.
const MODULE_ACCENT_COLORS = [C.blue, '#4FA3E3', C.blueDeep];

const quickActions = [
  { label: "Multiple Choice", icon: require('../../assets/images/img/multiple_choice.png'), tint: C.sky, screen: "/quiz/mc" },
  { label: "Drag & Drop", icon: require('../../assets/images/img/dragNdrop.png'), tint: C.lilac, screen: "/quiz/dnd" },
  { label: "Gesture Cam", icon: require('../../assets/images/img/camera.png'), tint: C.mint, screen: "/(tabs)/gesture" },
  { label: "My Badges", icon: require('../../assets/images/img/badges.png'), tint: C.peach, screen: "/(tabs)/achievements" },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

// Map lesson type to icon - using only existing assets
const getLessonIcon = (lessonType: string): any => {
  const iconMap: Record<string, any> = {
    'alphabet': require('../../assets/images/img/alphabet.png'),
    'greetings': require('../../assets/images/img/greetings.png'),
    'greet': require('../../assets/images/img/greet.png'),
    'numbers': require('../../assets/images/img/numbers.png'),
    'classroom': require('../../assets/images/img/classroom.png'),
    'conversation': require('../../assets/images/img/conversation.png'),
    'gesture': require('../../assets/images/img/camera.png'),
    'lesson': require('../../assets/images/img/lesson.png'),
    'badge': require('../../assets/images/img/badges.png'),
  };
  return iconMap[lessonType?.toLowerCase()] || null;
};

// Get status tag
const getStatusTag = (status: string, progress: any): string => {
  if (status === 'completed' || progress?.lesson_completed) return 'Completed';
  if (status === 'in_progress' || (progress && progress.current_step > 0)) return 'In Progress';
  return 'Pending';
};

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>('Student');
  const [studentLevel, setStudentLevel] = useState<string>('Beginner');
  const [xp, setXp] = useState<number>(0);
  const [xpMax, setXpMax] = useState<number>(100);
  const [streak, setStreak] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [learningPathLessons, setLearningPathLessons] = useState<Lesson[]>([]);
  const [fallbackLessons, setFallbackLessons] = useState<Lesson[]>([]);
  const [teacherModules, setTeacherModules] = useState<ModuleSummary[]>([]);
  const [loadingLessons, setLoadingLessons] = useState<boolean>(true);
  const [loadingModules, setLoadingModules] = useState<boolean>(true);
  const flatListRef = useRef<FlatList>(null);
  const [levelName, setLevelName] = useState<string>('Novice Signer');

  // ── DAILY CHALLENGE STATE ──
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeData | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState<boolean>(true);

  // ── ANIMATION FOR CHALLENGE COMPLETION ──
  const challengeProgressAnim = useRef(new Animated.Value(0)).current;
  const bonusXpAnim = useRef(new Animated.Value(0)).current;

  // ── XP COUNT-UP + GOAL-COMPLETION SPARKLE EFFECT ──
  // Smoothly counts the "Today's Goal" XP number up instead of snapping,
  // and remembers each goal's last-known completion state so we only
  // celebrate the moment a goal actually finishes (not on every refresh).
  const [displayXp, setDisplayXp] = useState<number>(0);
  const displayXpAnim = useRef(new Animated.Value(0)).current;
  const prevXpRef = useRef<number | null>(null);
  const xpPopAnim = useRef(new Animated.Value(1)).current;
  const xpDisplayRef = useRef<View | null>(null);
  const goalIconRefs = useRef<Record<string, View | null>>({});
  const goalCheckAnims = useRef<Record<string, Animated.Value>>({});
  const prevGoalCompletionRef = useRef<Record<string, boolean>>({});
  const [sparkles, setSparkles] = useState<Array<{
    key: string;
    anim: Animated.Value;
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>>([]);

  const getGoalCheckAnim = (goalId: string, isCompleted: boolean) => {
    if (!goalCheckAnims.current[goalId]) {
      goalCheckAnims.current[goalId] = new Animated.Value(isCompleted ? 1 : 0);
    }
    return goalCheckAnims.current[goalId];
  };

  const [promotionVisible, setPromotionVisible] = useState(false);
  const [promotionData, setPromotionData] = useState<any>(null);
  const [checkingPromotion, setCheckingPromotion] = useState(false);
  const [showEnvelope, setShowEnvelope] = useState(true);

  // Animated values for disappearing envelope card
  const envelopeHeight = useRef(new Animated.Value(92)).current;
  const envelopeOpacity = useRef(new Animated.Value(1)).current;
  const envelopeScale = useRef(new Animated.Value(1)).current;

  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const [achievementModalVisible, setAchievementModalVisible] = useState(false);
  const [checkingAchievements, setCheckingAchievements] = useState(false);

  // ── Cloud Animations ──
  const cloud1Anim = useRef(new Animated.Value(-200)).current;
  const cloud2Anim = useRef(new Animated.Value(screenWidth + 200)).current;
  const cloud3Anim = useRef(new Animated.Value(-250)).current;
  const cloud4Anim = useRef(new Animated.Value(screenWidth + 250)).current;

  // Pulsing animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // ── CLOUD ANIMATIONS ──
  useEffect(() => {
    const startCloud1 = () => {
      cloud1Anim.setValue(-200);
      Animated.timing(cloud1Anim, {
        toValue: screenWidth + 200,
        duration: 45000,
        useNativeDriver: true,
      }).start(() => startCloud1());
    };

    const startCloud2 = () => {
      cloud2Anim.setValue(screenWidth + 200);
      Animated.timing(cloud2Anim, {
        toValue: -200,
        duration: 55000,
        useNativeDriver: true,
      }).start(() => startCloud2());
    };

    const startCloud3 = () => {
      cloud3Anim.setValue(-250);
      Animated.timing(cloud3Anim, {
        toValue: screenWidth + 250,
        duration: 50000,
        useNativeDriver: true,
      }).start(() => startCloud3());
    };

    const startCloud4 = () => {
      cloud4Anim.setValue(screenWidth + 250);
      Animated.timing(cloud4Anim, {
        toValue: -250,
        duration: 60000,
        useNativeDriver: true,
      }).start(() => startCloud4());
    };

    startCloud1();
    startCloud2();
    startCloud3();
    startCloud4();

    return () => {
      // Cleanup
    };
  }, []);

  // Drives the animated {displayXp} number shown in "Today's Goal".
  useEffect(() => {
    const id = displayXpAnim.addListener(({ value }) => setDisplayXp(Math.round(value)));
    return () => displayXpAnim.removeListener(id);
  }, []);

  // Whenever the real xp value changes: snap instantly on first load, but
  // count up smoothly afterwards (e.g. after a goal awards XP).
  useEffect(() => {
    if (prevXpRef.current === null) {
      displayXpAnim.setValue(xp);
      setDisplayXp(xp);
    } else if (xp !== prevXpRef.current) {
      Animated.timing(displayXpAnim, {
        toValue: xp,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    prevXpRef.current = xp;
  }, [xp]);

  // Small bounce on the XP number when a sparkle lands.
  const triggerXpPop = () => {
    Animated.sequence([
      Animated.spring(xpPopAnim, { toValue: 1.18, friction: 4, useNativeDriver: true }),
      Animated.spring(xpPopAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  // Flies a few sparkles from a completed goal's icon to the XP display,
  // then pops the XP number once they land.
  const fireSparkleForGoal = (goalId: string) => {
    const sourceNode = goalIconRefs.current[goalId];
    const destNode = xpDisplayRef.current;
    if (!sourceNode || !destNode) return;

    sourceNode.measureInWindow((sx, sy, sw, sh) => {
      destNode.measureInWindow((dx, dy, dw, dh) => {
        const from = { x: sx + sw / 2, y: sy + sh / 2 };
        const to = { x: dx + dw / 2, y: dy + dh / 2 };

        const sparkleCount = 3;
        for (let i = 0; i < sparkleCount; i++) {
          const anim = new Animated.Value(0);
          const key = `${goalId}_${Date.now()}_${i}`;
          const jitteredFrom = { x: from.x + (i - 1) * 8, y: from.y + (i - 1) * 4 };

          setTimeout(() => {
            setSparkles((prev) => [...prev, { key, anim, from: jitteredFrom, to }]);
            Animated.timing(anim, {
              toValue: 1,
              duration: 700,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start(() => {
              setSparkles((prev) => prev.filter((s) => s.key !== key));
              if (i === sparkleCount - 1) triggerXpPop();
            });
          }, i * 90);
        }
      });
    });
  };

  // ── ADD DAILY CHALLENGE FETCH FUNCTION ──
  const fetchDailyChallenge = async () => {
    try {
      setLoadingChallenge(true);
      const response = await api.getDailyChallenge();

      if (response.success) {
        setDailyChallenge(response.challenge);

        // Celebrate any goal that just flipped from incomplete to complete
        // since our last known state — not goals that were already done
        // (e.g. finished yesterday, or already done before this screen
        // first loaded today).
        const goals: ChallengeGoal[] = response.challenge.goals || [];
        const nextCompletionMap: Record<string, boolean> = {};
        goals.forEach((goal) => {
          const wasCompleted = prevGoalCompletionRef.current[goal.id];
          nextCompletionMap[goal.id] = goal.is_completed;

          if (goal.is_completed && wasCompleted === false) {
            Animated.spring(getGoalCheckAnim(goal.id, false), {
              toValue: 1,
              friction: 5,
              tension: 140,
              useNativeDriver: true,
            }).start();
            fireSparkleForGoal(goal.id);
          }
        });
        prevGoalCompletionRef.current = nextCompletionMap;

        // Animate progress if challenge is partially completed
        const progress = response.challenge.summary.progress_percentage;
        Animated.timing(challengeProgressAnim, {
          toValue: progress / 100,
          duration: 1000,
          useNativeDriver: false,
        }).start();

        // If all goals completed, show bonus animation
        if (response.challenge.is_completed) {
          Animated.sequence([
            Animated.timing(bonusXpAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: false,
            }),
            Animated.timing(bonusXpAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: false,
            }),
          ]).start();
        }
      }
    } catch (error) {
      console.error('Error fetching daily challenge:', error);
      // Fallback: show static challenge if API fails
      setDailyChallenge(null);
    } finally {
      setLoadingChallenge(false);
    }
  };

  // ── UPDATE CHALLENGE GOAL ──
  const updateChallengeGoal = async (goalId: string, incrementBy: number = 1) => {
    try {
      const response = await api.updateChallengeProgress(goalId, incrementBy);

      if (response.success) {
        // Refresh challenge data
        await fetchDailyChallenge();

        // Update XP if earned
        if (response.xp_earned > 0 || response.bonus_xp > 0) {
          // Refresh student data to update XP display
          await fetchStudentData();
        }
      }
    } catch (error) {
      console.error('Error updating challenge goal:', error);
    }
  };

  // ── TRACK CHALLENGE TIME ──
  const trackChallengeTime = async (minutes: number) => {
    try {
      const response = await api.trackChallengeTime(minutes);

      if (response.success) {
        await fetchDailyChallenge();
        if (response.xp_earned > 0 || response.bonus_xp > 0) {
          await fetchStudentData();
        }
      }
    } catch (error) {
      console.error('Error tracking challenge time:', error);
    }
  };

  // ── UPDATE REFRESH ALL DATA ──
  const refreshAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchStudentData(),
        fetchLearningPathLessons(),
        fetchFallbackLessons(),
        fetchTeacherModules(),
        fetchDailyChallenge(), // ← ADD THIS
        checkForPromotion(),
        checkForNewAchievements()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ── UPDATE USEEFFECT ──
  useEffect(() => {
    refreshAllData();
    startPulseAnimation();
  }, []);

  // ── RENDER DAILY CHALLENGE GOALS ──
  const renderChallengeGoal = (goal: ChallengeGoal, index: number) => {
    const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
    const isCompleted = goal.is_completed;
    const checkAnim = getGoalCheckAnim(goal.id, isCompleted);

    return (
      <View key={goal.id} style={styles.challengeGoalItem}>
        <View style={styles.challengeGoalRow}>
          <View
            ref={(el) => { goalIconRefs.current[goal.id] = el; }}
            style={[styles.challengeGoalIcon, isCompleted && styles.challengeGoalIconCompleted]}
          >
            <Image source={getGoalIcon(goal.type)} style={styles.challengeGoalIconImg} contentFit="contain" />
            <Animated.View
              style={[
                styles.goalCheckBadge,
                { transform: [{ scale: checkAnim }], opacity: checkAnim },
              ]}
            >
              <CheckIcon />
            </Animated.View>
          </View>
          <View style={styles.challengeGoalContent}>
            <View style={styles.challengeGoalHeader}>
              <Text style={[styles.challengeGoalTitle, isCompleted && styles.challengeGoalCompleted]}>
                {goal.title}
              </Text>
              <View style={styles.challengeGoalXpBadge}>
                <Text style={styles.challengeGoalXpText}>+{goal.xp_reward} XP</Text>
              </View>
            </View>
            <Text style={styles.challengeGoalDesc}>{goal.description}</Text>
            <View style={styles.challengeGoalProgressWrap}>
              <View style={styles.challengeGoalProgressTrack}>
                <View
                  style={[
                    styles.challengeGoalProgressFill,
                    { width: `${progress}%` },
                    isCompleted && styles.challengeGoalProgressComplete
                  ]}
                />
              </View>
              <Text style={[styles.challengeGoalProgressText, isCompleted && styles.challengeGoalProgressTextDone]}>
                {isCompleted ? 'Done' : `${Math.round(progress)}%`}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!loading && !refreshing) {
        refreshAllData();
      }
    }, [])
  );

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.8, duration: 1000, useNativeDriver: false }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  };

  const fetchStudentData = async (): Promise<void> => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const student = user.student;
        const fullName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim();
        setStudentName(fullName || 'Student');
        setStudentLevel(student?.fsl_mastery_level || 'Beginner');

        if (student?.total_xp !== undefined && student?.total_xp !== null) {
          setXp(student.total_xp);
        }
        if (student?.streak_days !== undefined && student?.streak_days !== null) {
          setStreak(student.streak_days);
        }
        if (student?.level !== undefined && student?.level !== null) {
          setLevel(student.level);
        }
        if (student?.level_name) {
          setLevelName(student.level_name);
        }

        const levelXpMap: Record<number, number> = { 1: 100, 2: 250, 3: 500, 4: 800, 5: 1200 };
        const maxXp = levelXpMap[student?.level || 1] || 100;
        setXpMax(maxXp);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForPromotion = async () => {
    try {
      setCheckingPromotion(true);
      const response = await api.checkPromotion();

      if (response.has_promotion) {
        setPromotionData(response.promotion);
        setShowEnvelope(true);
        envelopeHeight.setValue(92);
        envelopeOpacity.setValue(1);
        envelopeScale.setValue(1);
      }
    } catch (error) {
      console.error('Error checking promotion:', error);
    } finally {
      setCheckingPromotion(false);
    }
  };

  const handlePromotionClose = async () => {
    if (promotionData) {
      try {
        await api.markPromotionViewed(promotionData.id);
      } catch (error) {
        console.error('Error marking promotion viewed:', error);
      }

      Animated.parallel([
        Animated.timing(envelopeOpacity, { toValue: 0, duration: 350, useNativeDriver: false }),
        Animated.timing(envelopeScale, { toValue: 0.8, duration: 350, useNativeDriver: false }),
        Animated.timing(envelopeHeight, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]).start(() => {
        setShowEnvelope(false);
        setPromotionData(null);
      });
    }
    setPromotionVisible(false);
  };

  // "Your Lessons" carousel — pulls from the student's personalized
  // Learning Path (same source as the "My Learning Path" tab in
  // lessons.tsx), not a flat next-lesson-per-module list.
  const fetchLearningPathLessons = async (): Promise<void> => {
    try {
      setLoadingLessons(true);
      const response = await api.getRecommendedLessons();

      console.log('🎯 Dashboard - Learning path lessons response:', JSON.stringify(response, null, 2));

      if (response.success) {
        const rawLessons = response.lessons || [];

        // Normalize into the same Lesson shape the carousel card expects.
        // The learning-path endpoint returns done/active/locked booleans
        // directly (see lessons.tsx's own transform of this same
        // endpoint) rather than the status/progress shape getAllLessons()
        // used, so we map defensively with fallbacks either way.
        const normalized: Lesson[] = rawLessons.map((lesson: any) => ({
          lesson_id: lesson.lesson_id ?? lesson.id,
          title: lesson.title,
          description: lesson.description || lesson.recommended_reason || '',
          lesson_type: lesson.lesson_type || lesson.category || lesson.difficulty || 'default',
          difficulty: lesson.difficulty || '',
          status: lesson.status || (lesson.done ? 'completed' : lesson.active ? 'in_progress' : 'pending'),
          assigned_at: lesson.assigned_at || '',
          has_quiz: !!lesson.has_quiz,
          total_steps: lesson.total_steps || 0,
          is_locked: !!lesson.locked,
          is_next_lesson: !!lesson.active,
          score: lesson.score ?? null,
          progress: lesson.progress ?? null,
        }));

        setLearningPathLessons(normalized);
      }
    } catch (error) {
      console.error('Error fetching learning path lessons:', error);
    } finally {
      setLoadingLessons(false);
    }
  };

  // Fallback for "Your Lessons" when the Learning Path has nothing left to
  // show (e.g. everything in it is already done/mastered) — falls back to
  // the flat assigned-lessons list, filtered to what still needs
  // attention: not yet done, or done but scored under 100 and worth
  // reviewing. This is exactly what the carousel showed before the
  // Learning Path was wired in.
  const fetchFallbackLessons = async (): Promise<void> => {
    try {
      const response = await api.getAllLessons();

      if (response.success) {
        setFallbackLessons(response.lessons || []);
      }
    } catch (error) {
      console.error('Error fetching fallback lessons:', error);
    }
  };

  // "Continue Learning" — the teacher's assigned curriculum, grouped by
  // module (Module 1, Module 2, ...), same source lessons.tsx uses to
  // build its module lesson map.
  const fetchTeacherModules = async (): Promise<void> => {
    try {
      setLoadingModules(true);
      const response = await api.getStudentLessons();

      console.log('📚 Dashboard - Student modules response:', JSON.stringify(response, null, 2));

      if (response.success && response.modules) {
        const summaries: ModuleSummary[] = response.modules.map((module: any) => {
          const lessons = module.lessons || [];
          const totalCount = lessons.length;
          const doneCount = lessons.filter(
            (l: any) => l.status === 'completed' && (l.score ?? 0) >= 60
          ).length;
          const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

          return {
            module_id: module.module_id,
            title: module.title,
            totalCount,
            doneCount,
            percent,
          };
        });

        setTeacherModules(summaries);

        if (response.student) {
          if (response.student.total_xp !== undefined && response.student.total_xp !== null) {
            setXp(response.student.total_xp);
          }
          if (response.student.streak_days !== undefined && response.student.streak_days !== null) {
            setStreak(response.student.streak_days);
          }
          if (response.student.level !== undefined && response.student.level !== null) {
            setLevel(response.student.level);
          }
          if (response.student.level_name) {
            setLevelName(response.student.level_name);
          }

          const levelXpMap: Record<number, number> = { 1: 100, 2: 250, 3: 500, 4: 800, 5: 1200 };
          const maxXp = levelXpMap[response.student.level || 1] || 100;
          setXpMax(maxXp);

          if (response.student.fsl_mastery_level) {
            setStudentLevel(response.student.fsl_mastery_level);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching teacher modules:', error);
    } finally {
      setLoadingModules(false);
    }
  };

  const checkForNewAchievements = async () => {
    try {
      setCheckingAchievements(true);
      const response = await api.checkAchievements();

      if (response.success && response.newly_unlocked && response.newly_unlocked.length > 0) {
        console.log('🏆 New achievements unlocked:', response.newly_unlocked);
        setNewAchievements(response.newly_unlocked);
        setAchievementModalVisible(true);
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    } finally {
      setCheckingAchievements(false);
    }
  };

  const getLessonStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#34C77B';
      case 'in_progress': return '#F5A524';
      default: return C.blue;
    }
  };

  const renderTeacherLesson = ({ item }: { item: Lesson }) => {
    const progress = item.progress;
    const isCompleted = item.status === 'completed' || !!progress?.lesson_completed;
    // The learning-path endpoint doesn't return step-level progress (no
    // progress.current_step), only a completion state — so fall back to
    // 100%/0% by completion instead of always reading as 0%.
    const progressPercent = progress && item.total_steps > 0
      ? Math.round((progress.current_step / item.total_steps) * 100)
      : isCompleted
        ? 100
        : 0;

    const statusColor = getLessonStatusColor(item.status);
    const displayScore = progress?.quiz_score ?? item.score ?? null;
    const isPerfect = displayScore === 100;
    const icon = getLessonIcon(item.lesson_type);

    return (
      <Pressable
        style={styles.teacherLessonCard}
        onPress={() => router.push(`/lesson/${item.lesson_id}`)}
      >
        <View style={styles.tlMainContent}>
          <View style={styles.tlIconBox}>
            {icon ? (
              <Image source={icon} style={styles.tlIconImg} contentFit="contain" />
            ) : (
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </Svg>
            )}
          </View>

          <View style={styles.tlTextContent}>
            <View style={styles.tlHeaderRow}>
              <View style={styles.tlBadgeRow}>
                <View style={[styles.tlDifficultyTag, { backgroundColor: C.sky }]}>
                  <Text style={styles.tlDifficultyText}>
                    {item.difficulty ? item.difficulty.toUpperCase() : 'LESSON'}
                  </Text>
                </View>
                {item.has_quiz && (
                  <View style={[styles.tlDifficultyTag, { backgroundColor: C.mint }]}>
                    <Text style={[styles.tlDifficultyText, { color: '#1E8A5F' }]}>QUIZ</Text>
                  </View>
                )}
              </View>
              {(progress?.quiz_completed || (item.has_quiz && displayScore !== null)) ? (
                <View style={[styles.tlMiniScoreBadge, { backgroundColor: isPerfect ? C.peach : C.mint }]}>
                  <Text style={[styles.tlMiniScoreText, { color: isPerfect ? C.sunDeep : '#1E8A5F' }]}>
                    {isPerfect ? '🌟 ' : ''}{displayScore}%
                  </Text>
                </View>
              ) : (
                <Text style={styles.tlDateText}>
                  {item.assigned_at ? new Date(item.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not assigned'}
                </Text>
              )}
            </View>

            <Text style={styles.tlTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </View>

        <View style={styles.tlProgressSection}>
          <View style={styles.tlProgressTrack}>
            <View
              style={[
                styles.tlProgressFill,
                { width: `${Math.min(progressPercent, 100)}%`, backgroundColor: statusColor },
              ]}
            />
          </View>
          <View style={styles.tlProgressInfoRow}>
            <Text style={styles.tlProgressInfoText}>{Math.min(progressPercent, 100)}% completed</Text>
            <Text style={styles.tlProgressInfoText}>{item.total_steps || 0} steps</Text>
          </View>
        </View>

        <View style={styles.tlButtonSection}>
          <Pressable
            style={[styles.tlCardActionBtn, { backgroundColor: statusColor }]}
            onPress={() => router.push(`/lesson/${item.lesson_id}`)}
          >
            <Text style={styles.tlCardActionBtnText}>
              {isCompleted ? 'Review' : progressPercent > 0 ? 'Continue' : 'Start'}
            </Text>
          </Pressable>

          {item.has_quiz && (
            <Pressable
              style={styles.tlCardHistoryBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                router.push(`/lesson/history/${item.lesson_id}` as any);
              }}
            >
              <Text style={styles.tlCardHistoryBtnText}>Attempts</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const xpPct = xpMax > 0 ? Math.min((xp / xpMax) * 100, 100) : 0;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={C.blueDeep} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }

  // Get carousel lessons. Always show at least 3 (a single card looks
  // empty) by layering three tiers, deduped by lesson_id:
  //   1. Learning Path picks that aren't locked or already mastered
  //   2. anything else assigned that still needs review (not done, or
  //      done with a low score)
  //   3. if still short, pad with whatever's left — including lessons
  //      already at 100% — just so the row isn't sparse
  const MIN_CAROUSEL_LESSONS = 3;

  const learningPathCandidates = learningPathLessons.filter((lesson) => {
    if (lesson.is_locked) return false;
    const isCompleted = lesson.status === 'completed' || lesson.progress?.lesson_completed;
    if (!isCompleted) return true;
    const score = lesson.score ?? lesson.progress?.quiz_score ?? 0;
    return score < 100;
  });

  const needsReviewCandidates = fallbackLessons
    .filter((lesson) => {
      const isActuallyLocked = lesson.is_locked === true && lesson.is_next_lesson !== true;
      if (isActuallyLocked) return false;

      const isCompleted = lesson.status === 'completed' || lesson.progress?.lesson_completed;
      if (!isCompleted) return true;

      const score = lesson.score ?? lesson.progress?.quiz_score ?? 0;
      return score < 100;
    })
    .sort((a, b) => {
      const aCompleted = a.status === 'completed' || a.progress?.lesson_completed;
      const bCompleted = b.status === 'completed' || b.progress?.lesson_completed;

      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && !bCompleted) return 1;
      return 0;
    });

  const usedLessonIds = new Set<number>();
  const takeUnique = (source: Lesson[], count: number): Lesson[] => {
    const picked: Lesson[] = [];
    for (const lesson of source) {
      if (picked.length >= count) break;
      if (usedLessonIds.has(lesson.lesson_id)) continue;
      usedLessonIds.add(lesson.lesson_id);
      picked.push(lesson);
    }
    return picked;
  };

  let carouselLessons: Lesson[] = takeUnique(learningPathCandidates, MIN_CAROUSEL_LESSONS);

  if (carouselLessons.length < MIN_CAROUSEL_LESSONS) {
    carouselLessons = carouselLessons.concat(
      takeUnique(needsReviewCandidates, MIN_CAROUSEL_LESSONS - carouselLessons.length)
    );
  }

  if (carouselLessons.length < MIN_CAROUSEL_LESSONS) {
    // Everything left is already at 100% — pad with those anyway rather
    // than showing fewer than 3 cards.
    carouselLessons = carouselLessons.concat(
      takeUnique(
        [...learningPathLessons, ...fallbackLessons],
        MIN_CAROUSEL_LESSONS - carouselLessons.length
      )
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Sunny Sky Gradient Background ── */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg width={screenWidth} height={screenHeight}>
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={GRADIENT.start} stopOpacity="1" />
              <Stop offset="30%" stopColor={GRADIENT.mid} stopOpacity="0.9" />
              <Stop offset="70%" stopColor={GRADIENT.mid2} stopOpacity="0.85" />
              <Stop offset="100%" stopColor={GRADIENT.end} stopOpacity="0.95" />
            </LinearGradient>
          </Defs>
          <Rect width={screenWidth} height={screenHeight} fill="url(#bgGrad)" />
        </Svg>
      </View>

      {/* ── Floating Clouds ── */}
      <View style={styles.floatingSky} pointerEvents="none">
        <Animated.View style={[styles.cloudWrapper, { top: 40, transform: [{ translateX: cloud1Anim }] }]}>
          <AnimatedCloud scale={1.5} opacity={0.4} />
        </Animated.View>
        <Animated.View style={[styles.cloudWrapper, { top: 180, transform: [{ translateX: cloud2Anim }] }]}>
          <AnimatedCloud scale={1.2} opacity={0.3} />
        </Animated.View>
        <Animated.View style={[styles.cloudWrapper, { top: 350, transform: [{ translateX: cloud3Anim }] }]}>
          <AnimatedCloud scale={1.8} opacity={0.35} />
        </Animated.View>
        <Animated.View style={[styles.cloudWrapper, { top: 500, transform: [{ translateX: cloud4Anim }] }]}>
          <AnimatedCloud scale={1.3} opacity={0.3} />
        </Animated.View>
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshAllData}
              colors={[C.blueDeep, C.blue]}
              tintColor={C.blueDeep}
              title="Refreshing..."
              titleColor={C.blueDeep}
            />
          }
        >
          {/* ── Hero Greeting + Senya ── */}
          <View style={styles.heroWrap}>
            <View style={styles.heroText}>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.nameText} numberOfLines={2}>{studentName}! 👋</Text>
              <Text style={styles.heroSub}>You've got this. Let's{"\n"}make it a signing day!</Text>
            </View>
            <Image
              source={require('../../assets/images/img/senya_blue.png')}
              style={styles.senyaHero}
              contentFit="contain"
            />
          </View>

          {/* ── Today's Goal Card (ring + level progress) ── */}
          <View style={styles.section}>
            <View style={styles.goalCard}>
              <View style={styles.goalRingSide}>
                <View style={styles.goalRingWrap}>
                  <ProgressRing pct={xpPct} />
                  <View style={styles.goalRingCenter}>
                    <Text style={styles.goalRingPct}>{Math.round(xpPct)}%</Text>
                  </View>
                </View>
                <Text style={styles.goalRingLabel}>Progress</Text>
              </View>

              <View style={styles.goalInfo}>
                <Text style={styles.goalTitle}>Today's Goal</Text>
                <View style={styles.goalXpRow} ref={xpDisplayRef}>
                  <Animated.Text style={[styles.goalXpBig, { transform: [{ scale: xpPopAnim }] }]}>
                    {displayXp}
                  </Animated.Text>
                  <Text style={styles.goalXpSmall}> / {xpMax} XP</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${xpPct}%` }]} />
                </View>
                <View style={styles.goalTagRow}>
                  <View style={styles.levelTag}>
                    <Text style={styles.levelTagText}>LEVEL {level}</Text>
                  </View>
                  <Text style={styles.levelTitle} numberOfLines={1}>{levelName}</Text>
                </View>
                <Text style={styles.xpStatusText}>
                  {studentLevel} · {Math.max(0, xpMax - xp)} XP to next level 💪
                </Text>
              </View>
            </View>
          </View>

          {/* ── Promotion Banner Card ── */}
          {promotionData && showEnvelope && (
            <Animated.View style={[
              styles.section,
              {
                opacity: envelopeOpacity,
                transform: [{ scale: envelopeScale }],
                height: envelopeHeight,
                overflow: 'hidden',
                marginBottom: 8,
              }
            ]}>
              <Pressable
                onPress={() => setPromotionVisible(true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
              >
                <Animated.View style={[styles.envelopeCardEnhanced, { transform: [{ scale: pulseAnim }] }]}>
                  <ExpoLinearGradient
                    colors={['#1E63B8', '#2F86D8', '#68C0F0', '#A8E0FA'] as const}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFill} />
                  <View style={styles.envelopeGlassTint} />

                  <Animated.View
                    pointerEvents="none"
                    style={[styles.envelopeBorderGlow, { opacity: glowOpacity }]}
                  />

                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.envelopeShimmerSweep,
                      {
                        transform: [
                          {
                            translateX: shimmerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-220, 260],
                            }),
                          },
                          { rotate: '18deg' },
                        ],
                      },
                    ]}
                  />

                  <View style={styles.envelopeRow}>
                    <View style={styles.envelopeIconWrap}>
                      <View style={styles.envelopeIconGlow} />
                      <ExpoLinearGradient
                        colors={['#FDE68A', '#F59E0B', '#D97706'] as const}
                        start={{ x: 0.2, y: 0.1 }}
                        end={{ x: 0.8, y: 0.9 }}
                        style={styles.envelopeIconCircle}
                      >
                        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                            fill="#FFFBEB"
                            stroke="#FDE68A"
                            strokeWidth="0.5"
                          />
                        </Svg>
                      </ExpoLinearGradient>
                    </View>

                    <View style={styles.envelopeTextContent}>
                      <Text style={styles.envelopeTitle} numberOfLines={1}>You leveled up! 🎉</Text>
                      <Text style={styles.envelopeSubtitle} numberOfLines={1}>Tap to open your certificate</Text>
                    </View>

                    <View style={styles.envelopeArrowCircle}>
                      <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <Polyline points="9 18 15 12 9 6" />
                      </Svg>
                    </View>
                  </View>
                </Animated.View>
              </Pressable>
            </Animated.View>
          )}

          {/* ── Your Lessons carousel ── */}
          {!loadingLessons && carouselLessons.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2">
                    <Path d="M12 6v6l4 2" />
                    <Circle cx="12" cy="12" r="10" />
                  </Svg>
                  <Text style={styles.sectionTitle}>Your Lessons</Text>
                </View>
                <Pressable onPress={() => router.push('/lessons')}>
                  <Text style={styles.seeAllText}>See all</Text>
                </Pressable>
              </View>

              <FlatList
                ref={flatListRef}
                data={carouselLessons}
                renderItem={renderTeacherLesson}
                keyExtractor={(item) => item.lesson_id?.toString() || Math.random().toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={screenWidth * 0.78 + 14}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={styles.teacherLessonsCarousel}
                ListEmptyComponent={
                  <View style={styles.emptyLessons}>
                    <Text style={styles.emptyLessonsText}>No lessons available</Text>
                  </View>
                }
              />
            </View>
          )}



          {/* ── DAILY CHALLENGE (hero + goals list as one connected card) ── */}
          <View style={styles.section}>
            <View style={styles.dailyChallengeCard}>
              <Pressable
                style={styles.dailyCardTop}
                onPress={() => {
                  // Navigate to gesture practice or challenge view
                  router.push('/(tabs)/gesture');
                }}
              >
                <ExpoLinearGradient
                  colors={['#2F86D8', '#1E63B8'] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.dailyHeader}>
                  <View style={styles.dailyIconBox}>
                    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
                      <Circle cx="12" cy="12" r="6" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                      <Circle cx="12" cy="12" r="2" fill="#fff" />
                    </Svg>
                  </View>
                  <Text style={styles.dailyLabel}>DAILY CHALLENGE</Text>

                  {/* Dynamic XP Badge */}
                  {dailyChallenge && dailyChallenge.summary.bonus_xp_available > 0 ? (
                    <Animated.View style={[
                      styles.dailyXpBadge,
                      {
                        transform: [{
                          scale: bonusXpAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [1, 1.3, 1],
                          }),
                        }],
                      },
                    ]}>
                      <Image source={CHALLENGE_COMPLETE_ICON} style={styles.dailyXpBadgeIcon} contentFit="contain" />
                      <Text style={styles.dailyXpText}>+{dailyChallenge.summary.bonus_xp_available} Bonus!</Text>
                    </Animated.View>
                  ) : (
                    <View style={styles.dailyXpBadge}>
                      <Text style={styles.dailyXpText}>
                        {(dailyChallenge?.summary?.xp_earned_so_far ?? 0) > 0
                          ? `+${dailyChallenge?.summary?.xp_earned_so_far ?? 0} XP`
                          : '+50 XP'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.dailyContent}>
                  <View style={styles.dailyTextContent}>
                    {/* Dynamic Title based on challenge */}
                    <Text style={styles.dailyTitle}>
                      {dailyChallenge?.theme
                        ? `Practice ${dailyChallenge.theme.replace('_', ' & ')}`
                        : 'Practice Your Signs'}
                    </Text>

                    {/* Dynamic Description */}
                    <Text style={styles.dailyDesc}>
                      {dailyChallenge?.is_completed
                        ? 'Challenge complete! Amazing work today!'
                        : (dailyChallenge?.summary?.total ?? 0) > 0
                          ? `${dailyChallenge?.summary?.completed ?? 0} of ${dailyChallenge?.summary?.total ?? 0} goals completed`
                          : 'Complete goals to earn XP and build your streak!'}
                    </Text>

                    {/* Progress Dots - Dynamic based on goals */}
                    <View style={styles.dailyDots}>
                      {dailyChallenge ? (
                        dailyChallenge.goals.map((goal, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.dailyDot,
                              {
                                backgroundColor: goal.is_completed
                                  ? '#FBBF24'
                                  : 'rgba(255,255,255,0.25)'
                              }
                            ]}
                          />
                        ))
                      ) : (
                        // Fallback dots if no challenge data
                        [1, 2, 3, 4, 5].map((n) => (
                          <View key={n} style={[styles.dailyDot, { backgroundColor: n <= 2 ? '#FBBF24' : 'rgba(255,255,255,0.25)' }]} />
                        ))
                      )}
                    </View>

                    {/* Status Text */}
                    <Text style={styles.dailyStatusText}>
                      {dailyChallenge?.is_completed
                        ? 'All goals complete! You earned bonus XP!'
                        : dailyChallenge
                          ? `${Math.round(dailyChallenge.summary.progress_percentage)}% complete • Tap to practice!`
                          : 'Practice daily to build your streak!'}
                    </Text>
                  </View>

                  <View style={styles.dailyActionBox}>
                    <View style={styles.dailyStartBtn}>
                      <Text style={styles.dailyStartText}>
                        {dailyChallenge?.is_completed ? 'Done!' : 'Start'}
                      </Text>
                      {!dailyChallenge?.is_completed && (
                        <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78350F" strokeWidth="2.5">
                          <Line x1="5" y1="12" x2="19" y2="12" />
                          <Polyline points="12 5 19 12 12 19" />
                        </Svg>
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>

              {/* ── Goals list: an extension of the card above, not a separate one ── */}
              {dailyChallenge && dailyChallenge.goals.length > 0 && (
                <View style={styles.challengeGoalsPanel}>
                  <View style={styles.challengeGoalsHeader}>
                    <Text style={styles.challengeGoalsTitle}>Today's Goals</Text>
                    <Text style={styles.challengeGoalsCount}>
                      {dailyChallenge?.summary?.completed ?? 0}/{dailyChallenge?.summary?.total ?? 0}
                    </Text>
                  </View>

                  {/* Animated Progress Bar */}
                  <View style={styles.challengeGoalsProgressTrack}>
                    <Animated.View
                      style={[
                        styles.challengeGoalsProgressFill,
                        {
                          width: challengeProgressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>

                  {dailyChallenge.goals.map((goal, index) => renderChallengeGoal(goal, index))}
                </View>
              )}
            </View>
          </View>

          {/* ── Continue Learning (per-module, colored — distinct from Today's Goals) ── */}
          {!loadingModules && teacherModules.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Continue Learning</Text>
              </View>

              <View style={styles.moduleList}>
                {teacherModules.map((module, index) => {
                  const accent = MODULE_ACCENT_COLORS[index % MODULE_ACCENT_COLORS.length];
                  return (
                    <Pressable
                      key={module.module_id}
                      style={[styles.moduleCard, { backgroundColor: accent }]}
                      onPress={() => router.push(`/lessons?tab=modules&moduleId=${module.module_id}` as any)}
                    >
                      <View style={styles.moduleCardInfo}>
                        <Text style={styles.moduleCardTitle} numberOfLines={1}>{module.title}</Text>
                        <Text style={styles.moduleCardStats}>
                          {module.percent}% · {module.doneCount} lessons/{module.totalCount}
                        </Text>
                        <View style={styles.moduleCardProgressTrack}>
                          <View style={[styles.moduleCardProgressFill, { width: `${module.percent}%` }]} />
                        </View>
                      </View>
                      <View style={styles.moduleArrowCircle}>
                        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <Line x1="5" y1="12" x2="19" y2="12" />
                          <Polyline points="12 5 19 12 12 19" />
                        </Svg>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Quick Practice ──
          <View style={styles.section}>
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.sectionTitle}>Quick Practice</Text>
              </View>
              <View style={styles.quickRow}>
                {quickActions.map((q, i) => (
                  <Pressable key={i} style={styles.quickItem} onPress={() => router.push(q.screen as any)}>
                    <View style={[styles.quickIconBox, { backgroundColor: q.tint }]}>
                      <Image source={q.icon} style={styles.quickIcon} contentFit="contain" />
                    </View>
                    <Text style={styles.quickText} numberOfLines={2}>{q.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View> */}

        </ScrollView>
      </SafeAreaView>

      <PromotionModal
        visible={promotionVisible}
        promotionData={promotionData}
        onClose={handlePromotionClose}
        studentName={studentName}
      />
      <AchievementModal
        visible={achievementModalVisible}
        achievements={newAchievements}
        onClose={() => {
          setAchievementModalVisible(false);
          setNewAchievements([]);
        }}
      />

      {/* ── Goal-completion sparkles flying to the XP display ── */}
      <View style={styles.sparkleOverlay} pointerEvents="none">
        {sparkles.map((s) => {
          const translateX = s.anim.interpolate({ inputRange: [0, 1], outputRange: [s.from.x, s.to.x] });
          const translateY = s.anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [s.from.y, Math.min(s.from.y, s.to.y) - 70, s.to.y],
          });
          const scale = s.anim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0.4, 1.15, 1, 0.3] });
          const opacity = s.anim.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });

          return (
            <Animated.View
              key={s.key}
              style={[
                styles.sparkleParticle,
                { transform: [{ translateX }, { translateY }, { scale }], opacity },
              ]}
            >
              <SparkleIcon />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: '#1E63B8',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.10,
  shadowRadius: 20,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  safeArea: { flex: 1 },
  floatingSky: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' },
  cloudWrapper: { position: 'absolute', left: 0 },
  scrollContent: { paddingBottom: 110, zIndex: 1 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  loadingText: { marginTop: 16, fontSize: 14, color: C.inkSoft, fontWeight: '600' },

  // Hero greeting
  heroWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 6, zIndex: 1 },
  heroText: { flex: 1, paddingRight: 6 },
  greetingText: { color: C.ink, fontSize: 26, fontWeight: '800', lineHeight: 32 },
  nameText: { color: C.blueDeep, fontSize: 28, fontWeight: '900', lineHeight: 36, marginBottom: 8 },
  heroSub: { color: C.inkSoft, fontSize: 13.5, fontWeight: '600', lineHeight: 20 },
  senyaHero: { width: 148, height: 168, marginRight: -5 },

  section: { paddingHorizontal: 16, marginBottom: 14, zIndex: 1 },

  // Today's goal card
  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 26, padding: 16, gap: 14, borderWidth: 1, borderColor: C.cardLine, ...CARD_SHADOW },
  goalRingSide: { alignItems: 'center', paddingRight: 14, borderRightWidth: 1, borderRightColor: 'rgba(18,58,107,0.08)' },
  goalRingWrap: { alignItems: 'center', justifyContent: 'center' },
  goalRingCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  goalRingPct: { fontSize: 19, fontWeight: '900', color: C.ink },
  goalRingLabel: { fontSize: 11, fontWeight: '700', color: C.inkSoft, marginTop: 6 },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: '800', color: C.ink, marginBottom: 4 },
  goalXpRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  goalXpBig: { fontSize: 22, fontWeight: '900', color: C.blue },
  goalXpSmall: { fontSize: 13, fontWeight: '700', color: C.inkSoft },
  progressTrack: { backgroundColor: 'rgba(18,58,107,0.10)', borderRadius: 99, height: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.sun, borderRadius: 99 },
  goalTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  levelTag: { backgroundColor: C.blue, borderRadius: 7, paddingVertical: 3, paddingHorizontal: 8 },
  levelTagText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  levelTitle: { fontSize: 13, fontWeight: '800', color: C.ink, flex: 1 },
  xpStatusText: { fontSize: 10.5, color: C.inkSoft, fontWeight: '700', marginTop: 5 },

  // Generic white panel
  panel: { backgroundColor: C.card, borderRadius: 26, padding: 16, borderWidth: 1, borderColor: C.cardLine, ...CARD_SHADOW },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 16.5, fontWeight: '800', color: C.ink },
  seeAllText: { color: C.blue, fontSize: 13, fontWeight: '800', paddingVertical: 4 },

  // Quick practice
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { width: '23%', alignItems: 'center', gap: 8 },
  quickIconBox: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickIcon: { width: 34, height: 34 },
  quickText: { fontSize: 10.5, fontWeight: '700', color: C.ink, textAlign: 'center', lineHeight: 14 },

  // Continue learning
  lessonsList: { gap: 10 },
  lessonRowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  lessonIconBox: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  lessonIcon: { width: 30, height: 30 },
  lessonInfo: { flex: 1, minWidth: 0 },
  lessonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  lessonTitle: { fontSize: 14, fontWeight: '800', color: C.ink, flex: 1 },
  lessonTag: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 99 },
  lessonTagText: { fontSize: 10, fontWeight: '800' },
  lessonProgressTrack: { backgroundColor: 'rgba(18,58,107,0.09)', borderRadius: 99, height: 5, marginTop: 7, overflow: 'hidden' },
  lessonProgressFill: { height: '100%', borderRadius: 99 },
  lessonProgressText: { fontSize: 10, color: C.inkSoft, marginTop: 4, fontWeight: '700' },

  // Daily challenge
  dailyCardTop: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, overflow: 'hidden' },
  dailyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dailyIconBox: { width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  dailyLabel: { fontSize: 10.5, fontWeight: '900', color: 'rgba(255,255,255,0.85)', letterSpacing: 1.2 },
  dailyXpBadge: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(251,191,36,0.28)', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 11 },
  dailyXpText: { fontSize: 11, fontWeight: '900', color: '#FDE68A' },
  dailyContent: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  dailyTextContent: { flex: 1, paddingRight: 12 },
  dailyTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 6 },
  dailyDesc: { fontSize: 12, color: 'rgba(255,255,255,0.78)', fontWeight: '500', lineHeight: 18 },
  dailyDots: { flexDirection: 'row', gap: 5, marginTop: 12 },
  dailyDot: { width: 28, height: 6, borderRadius: 99 },
  dailyStatusText: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 6 },
  dailyActionBox: { alignItems: 'center', gap: 10 },
  dailyStartBtn: { backgroundColor: '#FBBF24', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dailyStartText: { color: '#78350F', fontWeight: '900', fontSize: 14 },

  // Teacher Lessons carousel
  teacherLessonsCarousel: { paddingRight: 16, paddingLeft: 2, paddingVertical: 4 },

  // Continue Learning — colorful per-module cards, distinct from the white
  // Today's Goals card above.
  moduleList: { gap: 12 },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  moduleCardInfo: { flex: 1, paddingRight: 12 },
  moduleCardTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
  moduleCardStats: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  moduleCardProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  moduleCardProgressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 99 },
  moduleArrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  teacherLessonCard: {
    width: screenWidth * 0.78,
    backgroundColor: C.card,
    borderRadius: 26,
    padding: 16,
    marginRight: 14,
    borderWidth: 1,
    borderColor: C.cardLine,
    ...CARD_SHADOW,
  },
  tlMainContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  tlIconBox: { width: 46, height: 46, borderRadius: 16, backgroundColor: C.sky, alignItems: 'center', justifyContent: 'center' },
  tlIconImg: { width: 30, height: 30 },
  tlTextContent: { flex: 1, minWidth: 0 },
  tlHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tlBadgeRow: { flexDirection: 'row', gap: 5 },
  tlDifficultyTag: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 99 },
  tlDifficultyText: { fontSize: 9, fontWeight: '900', color: C.blueDeep, letterSpacing: 0.4 },
  tlMiniScoreBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 99 },
  tlMiniScoreText: { fontSize: 10, fontWeight: '900' },
  tlDateText: { fontSize: 10, color: C.inkSoft, fontWeight: '700' },
  tlTitle: { fontSize: 14.5, fontWeight: '900', color: C.ink, lineHeight: 19 },
  tlProgressSection: { marginBottom: 14 },
  tlProgressTrack: { height: 6, backgroundColor: 'rgba(18,58,107,0.09)', borderRadius: 99, overflow: 'hidden' },
  tlProgressFill: { height: '100%', borderRadius: 99 },
  tlProgressInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  tlProgressInfoText: { fontSize: 9.5, color: C.inkSoft, fontWeight: '700' },
  tlButtonSection: { flexDirection: 'row', gap: 8 },
  tlCardActionBtn: { flex: 1.3, borderRadius: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  tlCardActionBtnText: { fontSize: 12.5, fontWeight: '900', color: '#fff' },
  tlCardHistoryBtn: { flex: 1, backgroundColor: C.sky, borderRadius: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  tlCardHistoryBtnText: { fontSize: 11.5, fontWeight: '900', color: C.blueDeep },

  emptyLessons: {
    width: screenWidth * 0.75,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    borderStyle: 'dashed',
  },
  emptyLessonsText: { fontSize: 14, color: C.inkSoft, fontWeight: '700' },

  // Promotion envelope
  envelopeCardEnhanced: {
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    minHeight: 88,
    shadowColor: '#2F86D8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  envelopeGlassTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.10)' },
  envelopeBorderGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(168, 224, 250, 0.9)' },
  envelopeShimmerSweep: { position: 'absolute', top: -60, left: 0, width: 60, height: 220, backgroundColor: 'rgba(255,255,255,0.18)' },
  envelopeRow: { flexDirection: 'row', alignItems: 'center' },
  envelopeIconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  envelopeIconGlow: { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(251, 191, 36, 0.35)' },
  envelopeIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  envelopeTextContent: { flex: 1, paddingRight: 8, minWidth: 0 },
  envelopeTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  envelopeSubtitle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  envelopeArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  challengeGoalsPanel: {
    backgroundColor: C.card,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    padding: 16,
    paddingTop: 18,
  },
  challengeGoalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeGoalsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
  },
  challengeGoalsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: C.inkSoft,
  },
  challengeGoalsProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(18,58,107,0.09)',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 16,
  },
  challengeGoalsProgressFill: {
    height: '100%',
    backgroundColor: C.blue,
    borderRadius: 99,
  },
  challengeGoalItem: {
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(18,58,107,0.06)',
  },

  challengeGoalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  challengeGoalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeGoalIconCompleted: {
    backgroundColor: C.mint,
  },
  challengeGoalIconImg: {
    width: 20,
    height: 20,
  },
  goalCheckBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34C77B',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeGoalContent: {
    flex: 1,
  },
  challengeGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  challengeGoalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
  challengeGoalCompleted: {
    color: '#1E8A5F',
  },
  challengeGoalXpBadge: {
    backgroundColor: C.peach,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 99,
  },
  challengeGoalXpText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.sunDeep,
  },
  challengeGoalDesc: {
    fontSize: 11,
    color: C.inkSoft,
    fontWeight: '500',
    marginBottom: 4,
  },
  challengeGoalProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  challengeGoalProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(18,58,107,0.09)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  challengeGoalProgressFill: {
    height: '100%',
    backgroundColor: C.blue,
    borderRadius: 99,
  },
  challengeGoalProgressComplete: {
    backgroundColor: '#34C77B',
  },
  challengeGoalProgressText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.inkSoft,
    minWidth: 40,
    textAlign: 'right',
  },
  challengeGoalProgressTextDone: {
    color: '#1E8A5F',
  },

  // Merged Daily Challenge card (hero + goals as one visual piece)
  dailyChallengeCard: {
    borderRadius: 26,
    backgroundColor: C.card,
    shadowColor: '#1E63B8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
  dailyXpBadgeIcon: {
    width: 14,
    height: 14,
  },

  // Sparkle flight overlay
  sparkleOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
  sparkleParticle: {
    position: 'absolute',
    left: 0,
    top: 0,
    marginLeft: -8,
    marginTop: -8,
  },
});