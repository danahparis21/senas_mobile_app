import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  Dimensions,
  Animated,
  ActivityIndicator,
  Easing,
  StatusBar,
  Platform,
  RefreshControl,
  Modal,
  PanResponder,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { api } from '../../services/api';
import {
  CheckIcon,
  LockIcon,
  StarIcon,
  BookIcon,
  NumbersIcon,
  AlphabetIcon,
  GreetingIcon,
  FlameIcon
} from '../../components/ui/icons';
import { MasteryBadge } from '../../components/MasteryBadge';
import { WeakSkillsSection } from '../../components/WeakSkillsSection';
import { MasterySummary } from '../../components/MasterySummary';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ── SUNNY SKY PALETTE ────────────────────────────────────────────────
const GRADIENT = {
  start: '#c1eaffff',
  mid: '#BFE7FB',
  mid2: '#E6F4FE',
  end: '#F8FCFF',
};
// Mascot asset path
const MascotImage = require('../../assets/images/img/senyas_logo.png');

// Helper to get default initial Senya position near active lesson node
const getDefaultSenyaPos = (activePos: { x: number; y: number }, pathIdx: number) => {
  const cycle = [0.5, 0.76, 0.5, 0.24];
  const xPct = cycle[pathIdx % cycle.length];
  let pos = xPct > 0.5 ? activePos.x - 220 : activePos.x + 100;
  const minLeft = 10;
  const maxLeft = screenWidth - 160;
  if (pos < minLeft) pos = minLeft;
  if (pos > maxLeft) pos = maxLeft;

  let topPos = activePos.y - 140;
  if (Math.abs(xPct - 0.5) < 0.1) {
    topPos = activePos.y - 180;
  }
  const minTop = 40;
  const maxTop = screenHeight - 200;
  if (topPos < minTop) topPos = minTop;
  if (topPos > maxTop) topPos = maxTop;

  return { x: pos, y: topPos };
};

// Design Geometry Constants
const NODE_ROW_HEIGHT = 168;
const NODE_RADIUS = 38;
const HORIZ_PADDING = 44;
const MAP_WIDTH = screenWidth - HORIZ_PADDING * 2;

// Vibrant, kid-friendly accent colors for unlocked/completed nodes
const ACCENT_COLORS = [
  '#FF6B6B',
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
  '#E11D48',
];

// Helper to determine zigzag X, Y coordinates
const getNodePosition = (index: number) => {
  const cycle = [0.5, 0.76, 0.5, 0.24];
  const xPct = cycle[index % cycle.length];
  const x = HORIZ_PADDING + MAP_WIDTH * xPct;
  const y = index * NODE_ROW_HEIGHT + NODE_ROW_HEIGHT / 2;
  return { x, y };
};

// ── PERFORMANCE HELPERS ───────────────────────────────────────────────
// Same thresholds the lesson/exam result screen uses so the map and the
// end-of-quiz celebration never disagree about how many stars were earned.
const getStarsFromScore = (score?: number | null): number => {
  const pct = Math.round(Number(score) || 0);
  if (pct >= 100) return 3;
  if (pct >= 80) return 2;
  if (pct >= 50) return 1;
  return 0;
};

const rankLabel = (rank?: number | null): string => {
  if (!rank || rank < 1) return '';
  return `#${rank}`;
};

// Small reusable star row used on map nodes and inside the detail sheet
function StarsRow({ count, size = 12, muted = false }: { count: number; size?: number; muted?: boolean }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3].map((i) => (
        <Text
          key={i}
          style={[
            styles.starGlyph,
            { fontSize: size },
            i <= count ? null : styles.starGlyphEmpty,
            muted && styles.starGlyphMuted,
          ]}
        >
          {i <= count ? '★' : '☆'}
        </Text>
      ))}
    </View>
  );
}

// Custom Play Icon
function PlayIcon({ color = '#fff', size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}

// ── LINE ICON SET (no emojis anywhere in the UI) ──────────────────────
type IconProps = { color?: string; size?: number };

function TrophyIcon({ color = '#fff', size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <Path d="M7 6H4v1a4 4 0 0 0 3 3.87M17 6h3v1a4 4 0 0 1-3 3.87" />
    </Svg>
  );
}

function ClockIcon({ color = '#475569', size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

function BoltIcon({ color = '#4338CA', size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </Svg>
  );
}

function TargetIcon({ color = '#6366F1', size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Circle cx="12" cy="12" r="9" />
      <Circle cx="12" cy="12" r="5" />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
    </Svg>
  );
}

function ArrowRightIcon({ color = '#3B82F6', size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

function SparkIcon({ color = '#8B5CF6', size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2 14 9l7 3-7 3-2 7-2-7-7-3 7-3 2-7Z" />
    </Svg>
  );
}

function PencilIcon({ color = '#F59E0B', size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    </Svg>
  );
}

function AlertIcon({ color = '#EF4444', size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M12 3 1.8 20.5h20.4L12 3Z" strokeLinejoin="round" />
      <Path d="M12 9v5M12 17.5v.01" />
    </Svg>
  );
}

function RefreshIcon({ color = '#fff', size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5M4 4v4.5h4.5" />
      <Path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.5M20 20v-4.5h-4.5" />
    </Svg>
  );
}

function HistoryIcon({ color = '#2563EB', size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <Path d="M3 3v5h5M12 7v5l3 2" />
    </Svg>
  );
}

// Animated Cloud Component
function AnimatedCloud({ scale = 1, opacity = 0.5 }) {
  return (
    <Svg width={120 * scale} height={60 * scale} viewBox="0 0 120 60" opacity={opacity}>
      <Defs>
        <LinearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.5" />
        </LinearGradient>
      </Defs>
      <Path
        d="M20 40 C10 40 5 30 12 22 C8 12 20 5 30 10 C38 2 52 2 60 8 C68 3 80 5 85 14 C95 12 105 18 100 28 C110 35 108 48 95 50 L25 50 C18 50 14 45 20 40Z"
        fill="url(#cloudGrad)"
      />
    </Svg>
  );
}

// Generate smooth cubic bezier S-curve path
const generateSPath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const cp1y = p1.y + NODE_ROW_HEIGHT * 0.45;
    const cp2y = p2.y - NODE_ROW_HEIGHT * 0.45;
    d += ` C ${p1.x} ${cp1y}, ${p2.x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

// Dynamic Category Icon Resolver
const getCategoryIcon = (category: string, color: string, size: number = 24) => {
  const cleanCat = category.toLowerCase();
  if (cleanCat.includes('greet')) {
    return <GreetingIcon size={size} color={color} />;
  } else if (cleanCat.includes('alpha') || cleanCat.includes('letter')) {
    return <AlphabetIcon size={size} color={color} />;
  } else if (cleanCat.includes('number') || cleanCat.includes('count')) {
    return <NumbersIcon size={size} color={color} />;
  } else {
    return <BookIcon size={size} color={color} />;
  }
};



// ── MODULE/LESSON DATA STRUCTURE ──────────────────────────────────────
interface Lesson {
  id: number;
  lesson_id?: number;
  title: string;
  description?: string;
  difficulty?: string;
  status?: string;
  total_steps?: number;
  has_quiz?: boolean;
  module_id?: number;
  recommended_reason?: string;
  // Display properties
  category: string;
  desc: string;
  color: string;
  iconBg: string;
  duration: string;
  xp: number;
  done: boolean;
  active: boolean;
  locked: boolean;
  // 🆕 NEW FIELDS FOR ADAPTIVE REASONS & CHECKPOINT EXAM
  covered_skills?: WeakSkill[];  // What weak skills this lesson covers
  recommendation_type?: string;  // 'weak_skill_practice', 'new_skill', 'next_in_path'
  priority?: number;            // How many weak skills it covers
  weakest_skill?: WeakSkill | null;  // 🆕
  is_checkpoint_exam?: boolean;
  exam_id?: number;
  total_points?: number;
  passing_score?: number;
  total_questions?: number;
  // Performance
  score?: number;
  best_score?: number;
  attempts?: number;
  stars?: number;
}

interface WeakSkill {
  gesture_id: number;
  gesture_name: string;
  display_name: string;
  mastery: number;
  attempts: number;
  successes: number;
  wrong_attempts: number;
  never_practiced?: boolean;
}

// Update the Module interface
interface Module {
  module_id: number;
  title: string;
  description: string;
  mastery_level?: 'beginner' | 'intermediate' | 'advanced'; // ← ADD THIS
  is_locked?: boolean; // ← ADD THIS
  requires_level?: string; // ← ADD THIS
  student_level?: string; // ← ADD THIS
  lessons: Lesson[];
}

interface Position {
  x: number;
  y: number;
}

export default function Lessons() {
  const router = useRouter();
  // Optional deep-link params: navigating here with ?tab=modules&moduleId=5
  // (e.g. from a "Continue Learning" module card on the dashboard) opens
  // straight to that module's lesson map instead of the default view.
  const params = useLocalSearchParams<{ tab?: string; moduleId?: string }>();
  // Tracks which param combo was last applied. Using a ref instead of a
  // one-time "applied" boolean matters here: expo-router can reuse this
  // same screen instance across navigations (no remount) when re-pushed
  // with new params, so a once-only guard would apply the very first
  // deep link and then silently ignore every later one — leaving the
  // screen stuck wherever it was last, regardless of which module card
  // was tapped. Comparing against the last-applied key re-syncs whenever
  // the incoming params actually change.
  const lastAppliedDeepLinkKeyRef = useRef<string | null>(null);
  // Freshest lesson list, readable from effects without extra deps.
  const currentLessonsRef = useRef<Lesson[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const activePosRef = useRef({ x: 0, y: 0 });

  // Profile status
  const [streak, setStreak] = useState<number>(12);
  const [xp, setXp] = useState<number>(150);

  // Teacher modules state
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState<boolean>(false);

  // My Learning Path state (Tab 0) — personalized, adaptive lesson picks.
  // This is fetched and locked independently of the module map above.
  const [learningPathLessons, setLearningPathLessons] = useState<Lesson[]>([]);
  const [loadingLearningPath, setLoadingLearningPath] = useState<boolean>(false);
  const [goalMastered, setGoalMastered] = useState<boolean>(false);

  // Current module index for tab navigation
  const [currentModuleIndex, setCurrentModuleIndex] = useState<number>(0);

  // Prevent rapid clicking
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const tabFadeAnim = useRef(new Animated.Value(1)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;
  const sunAnim = useRef(new Animated.Value(0)).current;

  // Cloud position anims
  const cloud1Anim = useRef(new Animated.Value(-200)).current;
  const cloud2Anim = useRef(new Animated.Value(screenWidth + 200)).current;
  const cloud3Anim = useRef(new Animated.Value(-250)).current;
  const cloud4Anim = useRef(new Animated.Value(screenWidth + 250)).current;


  // Adaptive Learning State
  const [weakSkills, setWeakSkills] = useState<WeakSkill[]>([]);
  const [masterySummary, setMasterySummary] = useState<any>(null);
  const [loadingMastery, setLoadingMastery] = useState<boolean>(false);
  const [showWeakSkills, setShowWeakSkills] = useState<boolean>(true);

  // ── SELECTED LESSON / EXAM PERFORMANCE ────────────────────────────────
  // Attempt history + ranking for whichever node is currently expanded.
  // Checkpoint exams previously had no history surface here at all even
  // though the backend already exposes attempts for them.
  const [perfAttempts, setPerfAttempts] = useState<any[]>([]);
  const [perfRank, setPerfRank] = useState<number | null>(null);
  const [perfTotalStudents, setPerfTotalStudents] = useState<number | null>(null);
  const [loadingPerf, setLoadingPerf] = useState<boolean>(false);

  const [senyaPosition, setSenyaPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const senyaPosRef = useRef<{ x: number; y: number } | null>(null);
  senyaPosRef.current = senyaPosition;
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePathIdxRef = useRef<number>(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        setIsDragging(true);
        const activePos = activePosRef.current || { x: 0, y: 0 };
        const currentPos =
          senyaPosRef.current ||
          getDefaultSenyaPos(activePos, activePathIdxRef.current);
        startPosRef.current = currentPos;
      },
      onPanResponderMove: (_evt: any, gestureState: any) => {
        let newX = startPosRef.current.x + gestureState.dx;
        let newY = startPosRef.current.y + gestureState.dy;

        const minX = 10;
        const maxX = screenWidth - 160;
        const minY = 20;
        const maxY = Math.max(screenHeight - 150, 4000);

        newX = Math.min(Math.max(newX, minX), maxX);
        newY = Math.min(Math.max(newY, minY), maxY);

        senyaPosRef.current = { x: newX, y: newY };
        setSenyaPosition({ x: newX, y: newY });
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    })
  );

  // ── ERROR STATE ──────────────────────────────────────────────────────────
  const [loadError, setLoadError] = useState<{
    visible: boolean;
    message: string;
    notFound?: boolean;
    accessDenied?: boolean;
  }>({ visible: false, message: '' });

  // ── REFRESH CONTROL ─────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Sun glow animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sunAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(sunAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Cloud animations
  useEffect(() => {
    const startCloud1 = () => {
      cloud1Anim.setValue(-200);
      Animated.timing(cloud1Anim, {
        toValue: screenWidth + 200,
        duration: 45000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => startCloud1());
    };

    const startCloud2 = () => {
      cloud2Anim.setValue(screenWidth + 200);
      Animated.timing(cloud2Anim, {
        toValue: -200,
        duration: 55000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => startCloud2());
    };

    const startCloud3 = () => {
      cloud3Anim.setValue(-250);
      Animated.timing(cloud3Anim, {
        toValue: screenWidth + 250,
        duration: 50000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => startCloud3());
    };

    const startCloud4 = () => {
      cloud4Anim.setValue(screenWidth + 250);
      Animated.timing(cloud4Anim, {
        toValue: -250,
        duration: 60000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => startCloud4());
    };

    startCloud1();
    startCloud2();
    startCloud3();
    startCloud4();
  }, []);

  // Pulse loop for active checkpoint
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Bobbing loop for waving mascot
  useEffect(() => {
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );
    bob.start();
    return () => bob.stop();
  }, [bobAnim]);





  // Load attempts + ranking whenever a node is opened
  useEffect(() => {
    const lesson = currentLessonsRef.current.find((l) => l.id === expandedId);
    if (!lesson) {
      setPerfAttempts([]);
      setPerfRank(null);
      setPerfTotalStudents(null);
      return;
    }

    let cancelled = false;
    const anyApi: any = api;
    const isExam = !!lesson.is_checkpoint_exam;
    const targetId = isExam ? (lesson.exam_id ?? lesson.id) : lesson.id;

    const attemptsFn = isExam
      ? (anyApi.getExamAttempts || anyApi.getCheckpointExamAttempts || anyApi.getAttempts)
      : anyApi.getAttempts;
    const rankFn = isExam
      ? (anyApi.getExamLeaderboard || anyApi.getCheckpointExamLeaderboard || anyApi.getLessonLeaderboard)
      : anyApi.getLessonLeaderboard;

    const run = async () => {
      setLoadingPerf(true);
      setPerfAttempts([]);
      setPerfRank(null);
      setPerfTotalStudents(null);
      try {
        const [attemptsRes, rankRes] = await Promise.all([
          attemptsFn ? attemptsFn.call(anyApi, targetId).catch(() => null) : Promise.resolve(null),
          rankFn ? rankFn.call(anyApi, targetId).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (attemptsRes?.success) {
          setPerfAttempts(attemptsRes.attempts || attemptsRes.attempt_history || []);
        }
        if (rankRes?.success) {
          const ur = rankRes.user_rank;
          setPerfRank(typeof ur === 'object' && ur !== null ? (ur.rank ?? null) : (ur ?? null));
          setPerfTotalStudents((rankRes.rankings || rankRes.leaderboard || []).length || null);
        }
      } catch (error) {
        console.error('Error loading lesson performance:', error);
      } finally {
        if (!cancelled) setLoadingPerf(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [expandedId]);

  // ── PULL-TO-REFRESH HANDLER ─────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadError({ visible: false, message: '' });

    try {
      // Refresh all data
      await Promise.all([
        loadModulesData(),
        loadAdaptiveLessons(),
        loadMasteryData(),
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
      setLoadError({
        visible: true,
        message: 'Failed to refresh. Please try again.',
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ── LOAD MASTERY DATA ──────────────────────────────────────────────────
  const loadMasteryData = async () => {
    try {
      setLoadingMastery(true);
      const response = await api.getMasteryData();

      if (response.success) {
        setWeakSkills(response.weak_skills || []);
        setMasterySummary(response.overall || null);
      }
    } catch (error) {
      console.error('Error loading mastery data:', error);
    } finally {
      setLoadingMastery(false);
    }
  };

  const getLevelLabel = (level: string): string => {
    const labels: Record<string, string> = {
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced'
    };
    return labels[level?.toLowerCase()] || level || 'Unknown';
  };

  // Icon per level (no emojis)
  const LevelIcon = ({ level, size = 14, color }: { level: string; size?: number; color: string }) => {
    const key = (level || '').toLowerCase();
    if (key === 'advanced') return <StarIcon size={size} color={color} />;
    if (key === 'intermediate') return <FlameIcon size={size} color={color} />;
    return <BookIcon size={size} color={color} />;
  };

  // Render a standalone locked module screen (replaces the lesson map)
  const renderLockedModuleScreen = (module: Module) => {
    const levelColors: Record<string, { text: string; border: string; bg: string }> = {
      beginner: { text: '#16A34A', border: '#86EFAC', bg: 'rgba(240,253,244,0.7)' },
      intermediate: { text: '#EA580C', border: '#FED7AA', bg: 'rgba(255,247,237,0.7)' },
      advanced: { text: '#9333EA', border: '#E9D5FF', bg: 'rgba(253,244,255,0.7)' },
    };
    const reqLevel = (module.requires_level || 'beginner').toLowerCase();
    const stuLevel = (module.student_level || 'beginner').toLowerCase();
    const colors = levelColors[reqLevel] || levelColors.beginner;

    return (
      <ScrollView
        style={styles.lockedModuleScroll}
        contentContainerStyle={styles.lockedModuleScreen}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
        }
      >
        {/* 1. Lock mark */}
        <View style={styles.lockedModuleLockCircle}>
          <LockIcon size={40} color="#64748B" />
        </View>

        {/* 2. Eyebrow + Title (primary hierarchy) */}
        <Text style={styles.lockedEyebrow}>MODULE LOCKED</Text>
        <Text style={styles.lockedModuleHeadline} numberOfLines={3}>
          {module.title}
        </Text>

        {/* 3. Requirement (secondary) */}
        <View style={styles.lockedMetaBlock}>
          <Text style={styles.lockedMetaLabel}>REQUIRED LEVEL</Text>
          <View style={[styles.lockedPill, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            <LevelIcon level={reqLevel} color={colors.text} />
            <Text style={[styles.lockedPillText, { color: colors.text }]}>{getLevelLabel(reqLevel)}</Text>
          </View>
        </View>

        <View style={styles.lockedModuleDivider} />

        {/* 4. Current status (tertiary) */}
        <View style={styles.lockedMetaBlock}>
          <Text style={styles.lockedMetaLabel}>YOUR CURRENT LEVEL</Text>
          <View style={[styles.lockedPill, styles.lockedPillNeutral]}>
            <LevelIcon level={stuLevel} color="#2563EB" />
            <Text style={[styles.lockedPillText, { color: '#2563EB' }]}>{getLevelLabel(stuLevel)}</Text>
          </View>
        </View>

        {/* 5. Guidance (supporting) */}
        <Text style={styles.lockedModuleTip}>
          Keep completing lessons to reach {getLevelLabel(reqLevel)} level and unlock this module.
        </Text>
      </ScrollView>
    );
  };

  // ── HANDLE PRACTICE PRESS ─────────────────────────────────────────────
  const handlePracticePress = (skill: WeakSkill) => {
    // Navigate to gesture practice - using the correct route
    router.push({

      pathname: '/lesson/GesturePractice',
      params: {
        gestureId: skill.gesture_id,
        gestureName: skill.display_name || skill.gesture_name,
        mastery: skill.mastery,
      }
    });
  };

  // ── LOAD ADAPTIVE LESSONS ─────────────────────────────────────────────
  const loadAdaptiveLessons = async () => {
    try {
      setLoadingLearningPath(true);
      setLoadError({ visible: false, message: '' });

      const response = await api.getAdaptiveLessons();

      if (response.success) {
        // Transform lessons
        const transformed: Lesson[] = response.lessons.map((lesson: any, index: number) => {
          const color = ACCENT_COLORS[index % ACCENT_COLORS.length];

          // 🆕 Find the WEAKEST skill this lesson covers
          let weakestSkill = null;
          let weakestMastery = 1.0;
          if (lesson.covered_skills && lesson.covered_skills.length > 0) {
            for (const skill of lesson.covered_skills) {
              if (skill.mastery < weakestMastery) {
                weakestMastery = skill.mastery;
                weakestSkill = skill;
              }
            }
          }

          // CHANGED: Always use the original description for the desc field
          // Store recommendation_reason separately for the "Why this lesson?" section
          const recommendationReason = lesson.recommendation_reason || lesson.description || "Picked for you based on your learning path.";
          const lessonDescription = lesson.description || "Picked for you based on your learning path.";

          return {
            id: lesson.lesson_id,
            lesson_id: lesson.lesson_id,
            title: lesson.title,
            description: lesson.description,
            difficulty: lesson.difficulty,
            status: lesson.status,
            total_steps: lesson.total_steps,
            has_quiz: lesson.has_quiz,
            module_id: lesson.module_id,
            recommended_reason: recommendationReason, // Keep this for the "Why" section
            category: lesson.difficulty ? lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1) : "Lesson",
            desc: lessonDescription, // CHANGED: Always use the original description, not the recommendation reason
            color: color,
            iconBg: color + '18',
            duration: lesson.total_steps ? `${lesson.total_steps * 2} min` : "5 min",
            xp: lesson.has_quiz ? 30 : 20,
            done: !!lesson.done,
            active: !!lesson.active,
            locked: !!lesson.locked,
            score: Number(lesson.score ?? lesson.best_score ?? 0),
            best_score: Number(lesson.best_score ?? lesson.score ?? 0),
            attempts: Number(lesson.attempts ?? lesson.total_attempts ?? 0),
            stars: getStarsFromScore(lesson.best_score ?? lesson.score ?? 0),
            // 🆕 Store adaptive data
            covered_skills: lesson.covered_skills || [],
            recommendation_type: lesson.recommendation_type || 'recommended',
            priority: lesson.priority || 0,
            // 🆕 Store the weakest skill for badge display
            weakest_skill: weakestSkill,
          };
        });

        // ✅ FIX: Deduplicate lessons by lesson_id
        const uniqueLessonsMap = new Map<number, Lesson>();
        transformed.forEach(lesson => {
          // Use lesson_id as the key for uniqueness
          const key = lesson.lesson_id || lesson.id;
          if (!uniqueLessonsMap.has(key)) {
            uniqueLessonsMap.set(key, lesson);
          }
        });

        // Convert map back to array
        const uniqueLessons = Array.from(uniqueLessonsMap.values());

        console.log(`📚 Deduplicated lessons: ${transformed.length} → ${uniqueLessons.length} unique`);

        setLearningPathLessons(uniqueLessons);
        setGoalMastered(!!response.learning_path?.goal_mastered);
        if (response.weak_skills) setWeakSkills(response.weak_skills);
        if (response.mastery_summary) setMasterySummary(response.mastery_summary);
      } else {
        setLoadError({
          visible: true,
          message: response.message || 'Failed to load learning path. Pull down to refresh.',
        });
      }
    } catch (error: any) {
      console.error('Error fetching adaptive lessons:', error);
      setLoadError({
        visible: true,
        message: error?.message || 'Failed to load learning path. Pull down to refresh.',
      });
    } finally {
      setLoadingLearningPath(false);
    }
  };


  const loadModulesData = async () => {
    try {
      setLoadingModules(true);
      setLoadError({ visible: false, message: '' });

      const response = await api.getStudentLessons();

      console.log('📚 MODULES DATA:', JSON.stringify(response.modules, null, 2));

      response.modules?.forEach((module: any) => {
        console.log(`📚 Module "${module.title}":`, {
          mastery_level: module.mastery_level,
          is_locked: module.is_locked,
          requires_level: module.requires_level,
          student_level: module.student_level,
          lessons_count: module.lessons?.length || 0,
        });
      });

      if (response.success && response.modules) {
        const transformedModules: Module[] = response.modules.map((module: any) => {
          const lessons = module.lessons || [];

          // 🔥 CRITICAL: Check if this module is locked
          const isModuleLocked = module.is_locked === true;

          const transformedLessons: Lesson[] = lessons.map((lesson: any, index: number) => {
            const isExam = !!lesson.is_checkpoint_exam;
            const color = isExam ? '#F59E0B' : ACCENT_COLORS[index % ACCENT_COLORS.length];

            // 🔥 FIX: If module is locked, ALL lessons are locked
            let isLocked = isModuleLocked;

            // Only apply individual lesson locking if module is NOT locked
            let isNextLesson = false;
            if (!isModuleLocked) {
              const isFirstLesson = index === 0;
              if (index > 0) {
                const prevLesson = lessons[index - 1];
                if (prevLesson && prevLesson.status === 'completed' && (prevLesson.score || 0) >= 60) {
                  isNextLesson = true;
                }
              }

              if (isExam) {
                isLocked = lesson.is_locked === true;
              } else if (isFirstLesson) {
                isLocked = false;
              } else if (lesson.status === 'completed' && (lesson.score || 0) >= 60) {
                isLocked = false;
              } else if (isNextLesson) {
                isLocked = false;
              } else {
                isLocked = (lesson.is_locked === true || lesson.status === 'failed');
              }
            }

            const isDone = lesson.status === 'completed' && (lesson.score || 0) >= 60;
            const isActive = isExam
              ? (!isLocked && !isDone)
              : (lesson.status === 'in_progress' || (isNextLesson && (lesson.status === 'pending' || lesson.status === 'failed')));

            console.log(`📚 Lesson/Exam ${lesson.lesson_id}: "${lesson.title}" - status: ${lesson.status}, is_locked: ${lesson.is_locked}, isExam: ${isExam}, final: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);

            return {
              id: lesson.lesson_id || lesson.id,
              lesson_id: lesson.lesson_id || lesson.id,
              exam_id: lesson.exam_id,
              is_checkpoint_exam: isExam,
              title: lesson.title,
              description: lesson.description,
              difficulty: lesson.difficulty,
              status: lesson.status,
              total_steps: lesson.total_steps,
              total_points: lesson.total_points,
              passing_score: lesson.passing_score,
              total_questions: lesson.total_questions,
              has_quiz: lesson.has_quiz || isExam,
              module_id: lesson.module_id,
              category: isExam ? "Checkpoint Exam" : (lesson.difficulty ? lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1) : "Lesson"),
              desc: lesson.description || (isExam ? "Module Checkpoint Exam" : "Complete the contents and quiz assigned by your teacher."),
              color: color,
              iconBg: color + '18',
              duration: isExam ? `${lesson.total_questions || 10} Qs` : (lesson.total_steps ? `${lesson.total_steps * 2} min` : "5 min"),
              xp: isExam ? (lesson.total_points || 30) : (lesson.has_quiz ? 30 : 20),
              done: isDone,
              active: isActive,
              locked: isLocked,
              score: Number(lesson.score ?? lesson.best_score ?? 0),
              best_score: Number(lesson.best_score ?? lesson.score ?? 0),
              attempts: Number(lesson.attempts ?? lesson.total_attempts ?? 0),
              stars: getStarsFromScore(lesson.best_score ?? lesson.score ?? 0),
            };
          });

          return {
            module_id: module.module_id,
            title: module.title,
            description: module.description || '',
            mastery_level: module.mastery_level,    // ← ADD THESE
            is_locked: module.is_locked,            // ← ADD THESE
            requires_level: module.requires_level,  // ← ADD THESE
            student_level: module.student_level,    // ← ADD THESE
            lessons: transformedLessons,
          };
        });

        setModules(transformedModules);

        if (response.student) {
          setStreak(response.student.streak_days || 0);
          setXp(response.student.total_xp || 0);
        }
      } else {
        setLoadError({
          visible: true,
          message: response.message || 'Failed to load lessons. Pull down to refresh.',
        });
      }
    } catch (error: any) {
      console.error('Error fetching modules and lessons:', error);
      setLoadError({
        visible: true,
        message: error?.message || 'Failed to load lessons. Pull down to refresh.',
      });
    } finally {
      setLoadingModules(false);
    }
  };
  // Loads the personalized "My Learning Path" lessons for Tab 0.
  // Locking/ordering here comes straight from the backend's own
  // sequencing for this curated list — it never touches or reads
  // the module lesson lock state above.
  const loadLearningPathData = async () => {
    try {
      setLoadingLearningPath(true);
      const response = await api.getRecommendedLessons();

      if (response.success && response.lessons) {
        const transformed: Lesson[] = response.lessons.map((lesson: any, index: number) => {
          const color = ACCENT_COLORS[index % ACCENT_COLORS.length];

          const recommendationReason = lesson.recommended_reason || lesson.description || "Picked for you based on your learning path.";
          const lessonDescription = lesson.description || "Picked for you based on your learning path.";

          return {
            id: lesson.lesson_id,
            lesson_id: lesson.lesson_id,
            title: lesson.title,
            description: lesson.description,
            difficulty: lesson.difficulty,
            status: lesson.status,
            total_steps: lesson.total_steps,
            has_quiz: lesson.has_quiz,
            module_id: lesson.module_id,
            recommended_reason: recommendationReason,
            category: lesson.difficulty ? lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1) : "Lesson",
            desc: lessonDescription, // CHANGED: Always use the original description
            color: color,
            iconBg: color + '18',
            duration: lesson.total_steps ? `${lesson.total_steps * 2} min` : "5 min",
            xp: lesson.has_quiz ? 30 : 20,
            done: !!lesson.done,
            active: !!lesson.active,
            locked: !!lesson.locked,
            score: Number(lesson.score ?? lesson.best_score ?? 0),
            best_score: Number(lesson.best_score ?? lesson.score ?? 0),
            attempts: Number(lesson.attempts ?? lesson.total_attempts ?? 0),
            stars: getStarsFromScore(lesson.best_score ?? lesson.score ?? 0),
          };
        });

        setLearningPathLessons(transformed);
        setGoalMastered(!!response.learning_path?.goal_mastered);
      }
    } catch (error) {
      console.error('Error fetching learning path lessons:', error);
    } finally {
      setLoadingLearningPath(false);
    }
  };

  useEffect(() => {
    loadModulesData();
    loadAdaptiveLessons(); // Changed from loadLearningPathData
    loadMasteryData();
  }, []);

  // Once modules are in, honor a ?tab=modules&moduleId=X deep link (if any)
  // by jumping straight to that module. Re-applies whenever the params
  // actually change (see the ref comment above) so tapping a different
  // module card while already on this screen still navigates correctly.
  useEffect(() => {
    if (modules.length === 0) return;

    const wantsModulesTab = params.tab === 'modules' || !!params.moduleId;
    if (!wantsModulesTab) return;

    const key = `${params.tab ?? ''}|${params.moduleId ?? ''}`;
    if (lastAppliedDeepLinkKeyRef.current === key) return;
    lastAppliedDeepLinkKeyRef.current = key;

    setActiveTab(1);

    if (params.moduleId) {
      const targetIndex = modules.findIndex((m) => m.module_id === Number(params.moduleId));
      if (targetIndex !== -1) {
        setCurrentModuleIndex(targetIndex);
      }
    }
  }, [modules, params.tab, params.moduleId]);

  // Compute current lessons based on active tab
  const getCurrentLessons = (): Lesson[] => {
    if (activeTab === 0) {
      return learningPathLessons;
    }

    // Teacher's Modules
    if (modules.length === 0 || currentModuleIndex >= modules.length) {
      return [];
    }

    const currentModule = modules[currentModuleIndex];

    // 🔥 If module is locked, return empty array (no lessons to show)
    if (currentModule.is_locked) {
      return [];
    }

    return currentModule.lessons || [];
  };

  const currentLessons = getCurrentLessons();
  const totalNodes = currentLessons.length;
  // Kept in a ref so the performance effect can read the freshest list
  // without re-running every time the array identity changes.
  currentLessonsRef.current = currentLessons;

  // Get module name for display
  const getModuleDisplayName = (): string => {
    if (activeTab === 0) {
      return "My Learning Path";
    }

    if (modules.length === 0 || currentModuleIndex >= modules.length) {
      return "No Module";
    }

    const module = modules[currentModuleIndex];
    // ❌ Remove this line that adds the lock emoji
    // const lockEmoji = module.is_locked ? '🔒 ' : '';
    // return `${lockEmoji}${module.title}`;

    // ✅ Replace with this:
    return module.title;
  };
  const getModuleDescription = (): string => {
    if (activeTab === 0) {
      if (goalMastered) {
        return "🎉 You've completed your goal lessons! Here's more to keep practicing";
      }
      return "Lessons picked just for you, based on your goals and progress";
    }

    if (modules.length === 0 || currentModuleIndex >= modules.length) {
      return "No lessons available";
    }

    const module = modules[currentModuleIndex];

    if (module.is_locked) {
      return `Requires ${getLevelLabel(module.requires_level || '')} level (Your level: ${getLevelLabel(module.student_level || 'beginner')})`;
    }

    return module.description || "Complete the lessons in this module";
  };

  // Find index of active node
  const getActivePathIndex = () => {
    let lastActiveOrDone = 0;
    for (let i = 0; i < currentLessons.length; i++) {
      if (currentLessons[i].done || currentLessons[i].active) {
        lastActiveOrDone = i;
      }
    }
    return lastActiveOrDone;
  };

  const activePathIndex = getActivePathIndex();


  // Generate node coordinates
  const points = currentLessons.map((_, i) => getNodePosition(i));
  const backgroundPathD = generateSPath(points);
  const progressPathD = generateSPath(points.slice(0, activePathIndex + 1));

  // Update the ref with the actual position
  activePosRef.current = points[activePathIndex] || { x: 0, y: 0 };
  activePathIdxRef.current = activePathIndex;

  const actualActivePos = points[activePathIndex];


  // Switch between Unit 1 and Teacher Modules
  const switchTab = (targetTab: number) => {
    if (targetTab === activeTab || isNavigating) return;
    setIsNavigating(true);
    setExpandedId(null);

    // Immediately update the state, then animate
    setActiveTab(targetTab);
    if (targetTab === 1) {
      setCurrentModuleIndex(0);
    }

    // Simple fade animation
    Animated.sequence([
      Animated.timing(tabFadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(tabFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsNavigating(false);
    });
  };

  // Navigate between modules (using left/right arrows in banner)
  const navigateModule = (direction: 'prev' | 'next') => {
    if (modules.length === 0 || isNavigating) return;

    const newIndex = direction === 'prev'
      ? Math.max(0, currentModuleIndex - 1)
      : Math.min(modules.length - 1, currentModuleIndex + 1);

    if (newIndex !== currentModuleIndex) {
      setIsNavigating(true);
      setExpandedId(null);

      // Immediately update the state, then animate
      setCurrentModuleIndex(newIndex);

      // Simple fade animation
      Animated.sequence([
        Animated.timing(tabFadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(tabFadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsNavigating(false);
      });
    }
  };



  const getProgressPercentage = () => {
    if (totalNodes === 0) return 0;
    const completedCount = currentLessons.filter(l => l.done).length;
    return Math.round((completedCount / totalNodes) * 100);
  };

  const pct = getProgressPercentage();
  const completedNodesCount = currentLessons.filter(l => l.done).length;
  const selectedLesson = currentLessons.find(l => l.id === expandedId);
  // Best score = highest of what the map already knows and what the
  // attempt history returns (exams only carry it in the attempts list).
  const bestAttemptScore = Math.max(
    Number(selectedLesson?.best_score ?? 0),
    Number(selectedLesson?.score ?? 0),
    ...perfAttempts.map((a: any) =>
      Number(
        a.percentage ??
        a.score_percentage ??
        (a.total_points ? (a.score / a.total_points) * 100 : a.score) ??
        0
      ) || 0
    ),
    0
  );

  // Pulse translations
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.45],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 0],
  });

  // Mascot float translations
  const bobY = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  // Sun glow animation
  const sunGlow = sunAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });


  const getMascotMessage = (progress: number, completed: number, total: number): string => {
    if (total === 0) return '🌟 Ready to learn!';

    // Get the current lesson's info if available
    const currentLesson = currentLessons[activePathIndex];
    const lessonName = currentLesson?.title || '';
    const weakSkill = currentLesson?.weakest_skill;

    // If we have a weak skill, give specific advice
    if (weakSkill && !currentLesson?.done) {
      const skillName = weakSkill.display_name || weakSkill.gesture_name;
      const mastery = Math.round(weakSkill.mastery * 100);

      if (mastery < 20) {
        const messages = [
          `💪 Let's practice "${skillName}" together!`,
          `📚 "${skillName}" needs some love! Let's learn!`,
          `🌟 You can master "${skillName}"! Let's go!`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
      } else if (mastery < 40) {
        const messages = [
          `🌟 "${skillName}" - You're getting better! Keep going!`,
          `💪 "${skillName}" is improving! Practice makes perfect!`,
          `📚 You're learning "${skillName}" well! Keep it up!`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
      } else if (mastery < 60) {
        const messages = [
          `⭐ "${skillName}" - Almost there! You're doing great!`,
          `🌟 You're so close with "${skillName}"! Keep going!`,
          `💪 "${skillName}" is getting easier! Way to go!`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
      } else {
        const messages = [
          `🎯 "${skillName}" - You're almost a master!`,
          `⭐ So close with "${skillName}"! You got this!`,
          `🌟 "${skillName}" is looking great! One more push!`
        ];
        return messages[Math.floor(Math.random() * messages.length)];
      }
    }

    // General progress messages
    if (progress === 100) {
      const messages = [
        '🎉 You did it! Amazing job!',
        '⭐ You\'re a superstar! 🏆',
        '🌟 Perfect! You\'re amazing!',
        '🎊 You\'ve mastered everything!'
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }

    if (progress >= 75) {
      const messages = [
        '📈 Almost there! Keep going!',
        '💪 You\'re doing amazing!',
        '⭐ So close! You got this!'
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }

    if (progress >= 50) {
      const messages = [
        '🌟 You\'re making great progress!',
        '📚 Learning so well today!',
        '💪 Keep it up! You\'re awesome!'
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }

    if (progress >= 25) {
      const messages = [
        '🌱 Good start! Let\'s keep going!',
        '📖 You\'re learning! Great job!',
        '💪 Every lesson makes you better!'
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }

    if (completed === 0) {
      const messages = [
        '👋 Ready to learn something new?',
        '🌟 Let\'s start your learning journey!',
        '📚 Your first lesson awaits!'
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }

    const messages = [
      '🌟 You got this! Keep going!',
      '📚 Every lesson counts!',
      '💪 You\'re doing great today!',
      '⭐ You\'re a natural learner!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // ── RENDER ERROR MODAL ──────────────────────────────────────────────────
  const renderErrorModal = () => {
    return (
      <Modal
        visible={loadError.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setLoadError({ visible: false, message: '' });
        }}
      >
        {/* Darkened backdrop */}
        <Pressable
          style={styles.errorBackdrop}
          onPress={() => { }}
        />

        {/* Modal content */}
        <View style={styles.errorModalContainer}>
          <View style={styles.errorCard}>
            <Image
              source={require('../../assets/images/img/senya_magnify.png')}
              style={styles.errorImage}
              contentFit="contain"
            />

            <Text style={styles.errorTitle}>
              {loadError.notFound ? '📚 No Lessons Found' :
                loadError.accessDenied ? '🔒 Access Denied' :
                  '😅 Oops!'}
            </Text>

            <Text style={styles.errorMessage}>{loadError.message}</Text>

            {/* Single button - Pull to Refresh */}
            <Pressable
              style={styles.errorRefreshBtn}
              onPress={() => {
                setLoadError({ visible: false, message: '' });
                onRefresh();
              }}
            >
              <RefreshIcon size={18} color="#fff" />
              <Text style={styles.errorRefreshText}>Pull to Refresh</Text>
            </Pressable>

            <Text style={styles.errorHint}>
              👆 Pull down from the top of the screen to refresh
            </Text>
          </View>
        </View>
      </Modal>
    );
  };




  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.container}>
        {/* Animated Gradient Background */}
        <View style={StyleSheet.absoluteFillObject}>
          <Svg width={screenWidth} height={screenHeight}>
            <Defs>
              <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={GRADIENT.start} stopOpacity="1" />
                <Stop offset="30%" stopColor={GRADIENT.mid} stopOpacity="0.9" />
                <Stop offset="70%" stopColor={GRADIENT.mid2} stopOpacity="0.8" />
                <Stop offset="100%" stopColor={GRADIENT.end} stopOpacity="0.9" />
              </LinearGradient>
            </Defs>
            <Rect width={screenWidth} height={screenHeight} fill="url(#bgGrad)" />
          </Svg>
        </View>

        {/* Sun with animated glow */}
        <Animated.View style={[styles.sunContainer, { opacity: sunGlow }]}>
          <Svg width="120" height="120" viewBox="0 0 120 120">
            <Circle cx="60" cy="60" r="45" fill="#FCD34D" opacity="0.9" />
            <Circle cx="60" cy="60" r="55" fill="#FCD34D" opacity="0.3" />
            <Circle cx="60" cy="60" r="70" fill="#FCD34D" opacity="0.1" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <Rect
                key={i}
                x="54"
                y="5"
                width="12"
                height="20"
                rx="6"
                fill="#FCD34D"
                opacity="0.6"
                transform={`rotate(${angle}, 60, 60)`}
              />
            ))}
          </Svg>
        </Animated.View>

        {/* Floating Clouds */}
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

        {renderErrorModal()}

        {/* Top Bar
        <View style={styles.topBar}>
          <Text style={styles.logoText}>SEÑAS</Text>
          <View style={styles.topBarRight}>
            <View style={styles.xpTopBadge}>
              <Text style={styles.xpTopText}>⚡ {xp} XP</Text>
            </View>
            <View style={styles.streakBadge}>
              <FlameIcon size={16} color="#fb923c" />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          </View>
        </View> */}

        {/* Unit/Module Banner */}
        <View style={styles.unitBanner}>
          <View style={styles.bannerRow}>
            {/* Left Arrow - Navigate to previous module or Unit 1 */}
            <Pressable
              style={[styles.arrowButton, (activeTab === 0 || isNavigating) && styles.arrowButtonDisabled]}
              onPress={() => {
                if (isNavigating) return;
                if (activeTab === 0) return;
                if (currentModuleIndex > 0) {
                  navigateModule('prev');
                } else {
                  // If at first module, go back to Unit 1
                  switchTab(0);
                }
              }}
              disabled={activeTab === 0 || isNavigating}
            >
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTab === 0 ? "#94A3B8" : "#fff"} strokeWidth="3">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </Pressable>

            <View style={styles.bannerTitleContainer}>
              <Text style={styles.unitTitle}>{getModuleDisplayName()}</Text>
              <Text style={styles.unitDesc}>{getModuleDescription()}</Text>

              {/* Module navigation dots */}
              {activeTab === 1 && modules.length > 1 && (
                <View style={styles.moduleDotsContainer}>
                  {modules.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.moduleDot,
                        currentModuleIndex === index && styles.moduleDotActive
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>


            {/* Right Arrow - Navigate to next module or Unit 1 */}
            <Pressable
              style={[
                styles.arrowButton,
                ((activeTab === 1 && currentModuleIndex === modules.length - 1) || isNavigating) && styles.arrowButtonDisabled
              ]}
              onPress={() => {
                if (isNavigating) return;
                if (activeTab === 0) {
                  // Go to first module
                  switchTab(1);
                } else if (currentModuleIndex < modules.length - 1) {
                  navigateModule('next');
                }
              }}
              disabled={(activeTab === 1 && currentModuleIndex === modules.length - 1) || isNavigating}
            >
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={
                (activeTab === 1 && currentModuleIndex === modules.length - 1) ? "#94A3B8" : "#fff"
              } strokeWidth="3">
                <Path d="M9 18l6-6-6-6" />
              </Svg>
            </Pressable>
          </View>

          {totalNodes > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressText}>
                  {completedNodesCount} of {totalNodes} lessons done
                </Text>
                <Text style={styles.progressText}>{pct}% Completed</Text>
              </View>
            </View>
          )}
        </View>

        {/* Main Scroll Content */}
        <Animated.View style={[styles.mapContainer, { opacity: tabFadeAnim }]}>
          {(activeTab === 1 && loadingModules) || (activeTab === 0 && loadingLearningPath) ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loaderText}>
                {activeTab === 0 ? "Building your learning path..." : "Loading modules..."}
              </Text>
            </View>
          ) : totalNodes === 0 ? (
            // 🔒 Locked module takes priority over generic empty state
            activeTab === 1 && modules[currentModuleIndex]?.is_locked ? (
              renderLockedModuleScreen(modules[currentModuleIndex])
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIllustrationBox}>
                  <BookIcon size={64} color="#93C5FD" />
                </View>
                <Text style={styles.emptyTitle}>
                  {activeTab === 0 ? "No Lessons Yet!" : "No Lessons in this Module"}
                </Text>
                <Text style={styles.emptySubText}>
                  {activeTab === 0
                    ? "We don't have enough info to build your path yet. Try a few lessons first!"
                    : "This module doesn't have any lessons assigned yet."}
                </Text>
                <Pressable
                  style={styles.emptyRefreshBtn}
                  onPress={activeTab === 0 ? loadLearningPathData : loadModulesData}
                >
                  <Text style={styles.emptyRefreshBtnText}>Refresh</Text>
                </Pressable>
              </View>
            )
          ) : (
            <ScrollView
              contentContainerStyle={{ height: totalNodes * NODE_ROW_HEIGHT + 70 }}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!isDragging}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#1848c8']}
                  tintColor="#1848c8"
                  title="Pull to refresh..."
                  titleColor="#1848c8"
                />
              }
            >
              {/* SVG Path Connections - only show if module is not locked */}
              {!modules[currentModuleIndex]?.is_locked && (
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                  <Svg width={screenWidth} height={totalNodes * NODE_ROW_HEIGHT}>
                    {/* Background Track */}
                    {backgroundPathD !== '' && (
                      <Path
                        d={backgroundPathD}
                        fill="none"
                        stroke="#93C5FD"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray="8 12"
                        opacity={0.4}
                      />
                    )}
                    {/* Completed Path with Glow */}
                    {progressPathD !== '' && (
                      <>
                        <Path
                          d={progressPathD}
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth="12"
                          strokeLinecap="round"
                          opacity={0.15}
                        />
                        <Path
                          d={progressPathD}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="6"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </Svg>
                </View>
              )}

              {/* Mascot - only show if module is not locked */}
              {!modules[currentModuleIndex]?.is_locked && activePosRef.current && activePosRef.current.x !== 0 && (
                <Animated.View
                  {...panResponder.current.panHandlers}
                  style={[
                    styles.mascotContainer,
                    {
                      left: (() => {
                        if (senyaPosition) return senyaPosition.x;
                        return getDefaultSenyaPos(activePosRef.current, activePathIndex).x;
                      })(),
                      top: (() => {
                        if (senyaPosition) return senyaPosition.y;
                        return getDefaultSenyaPos(activePosRef.current, activePathIndex).y;
                      })(),
                      transform: [{ translateY: isDragging ? 0 : bobY }],
                      opacity: isDragging ? 0.9 : 1,
                      zIndex: isDragging ? 999 : 12,
                    },
                  ]}
                  pointerEvents="auto"
                >
                  <Image
                    source={MascotImage}
                    style={styles.mascotImage}
                    contentFit="contain"
                  />
                  <View style={[styles.mascotBubble, isDragging && styles.mascotBubbleDragging]}>
                    <Text style={styles.mascotBubbleText}>
                      {isDragging ? '👆 Drag me anywhere!' : getMascotMessage(pct, completedNodesCount, totalNodes)}
                    </Text>
                  </View>
                </Animated.View>
              )}

              {/* Module Lock Overlay - handled above in totalNodes===0 branch */}

              {/* LESSONS - ONLY RENDER IF MODULE IS NOT LOCKED */}
              {!modules[currentModuleIndex]?.is_locked && currentLessons.map((lesson, index) => {
                const pos = points[index];
                const isSelected = expandedId === lesson.id;

                let nodeBg = lesson.color;
                let iconColor = '#fff';

                const isLocked = lesson.locked;

                if (isLocked) {
                  nodeBg = '#CBD5E1';
                  iconColor = '#64748B';
                }

                const nodeStars = getStarsFromScore(lesson.best_score ?? lesson.score);
                const showNodeStars = !isLocked && (lesson.done || (lesson.attempts || 0) > 0);

                return (
                  <View
                    key={lesson.id}
                    style={[
                      styles.nodeAbsoluteContainer,
                      {
                        left: pos.x - NODE_RADIUS,
                        top: pos.y - NODE_RADIUS,
                      },
                    ]}
                  >
                    {lesson.active && !isLocked && (
                      <Animated.View
                        style={[
                          styles.pulseRing,
                          {
                            backgroundColor: lesson.color,
                            transform: [{ scale: pulseScale }],
                            opacity: pulseOpacity,
                          },
                        ]}
                      />
                    )}

                    <Pressable
                      onPress={() => {
                        setExpandedId(isSelected ? null : lesson.id);
                      }}
                      style={({ pressed }) => [
                        styles.nodeCircle,
                        {
                          backgroundColor: nodeBg,
                          shadowColor: isLocked ? '#94A3B8' : lesson.color,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        },
                      ]}
                    >
                      {isLocked ? (
                        <LockIcon size={24} color={iconColor} />
                      ) : lesson.done ? (
                        <CheckIcon size={28} color={iconColor} />
                      ) : lesson.is_checkpoint_exam ? (
                        <TrophyIcon size={26} color={iconColor} />
                      ) : lesson.active ? (
                        <PlayIcon color={iconColor} size={24} />
                      ) : (
                        getCategoryIcon(lesson.category, iconColor, 24)
                      )}

                      {/* Step number chip */}
                      <View style={[styles.nodeIndexChip, isLocked && styles.nodeIndexChipLocked]}>
                        <Text style={styles.nodeIndexChipText}>{index + 1}</Text>
                      </View>
                    </Pressable>

                    {/* Stars - only show if not locked */}
                    {showNodeStars && (
                      <View style={styles.nodeStarsBadge} pointerEvents="none">
                        <StarsRow count={nodeStars} size={11} />
                      </View>
                    )}

                    <View style={styles.nodeLabelBox} pointerEvents="box-none">
                      {lesson.active && !isLocked && (
                        <View style={[styles.nextBadge, lesson.is_checkpoint_exam && { backgroundColor: '#F59E0B' }]}>
                          <Text style={styles.nextBadgeText}>{lesson.is_checkpoint_exam ? "EXAM" : "NEXT UP"}</Text>
                        </View>
                      )}

                      {/* Title card */}
                      <Pressable
                        onPress={() => {
                          setExpandedId(isSelected ? null : lesson.id);
                        }}
                        style={({ pressed }) => [
                          styles.nodeTitleCard,
                          lesson.active && !isLocked && { borderColor: lesson.color },
                          isLocked && styles.nodeTitleCardLocked,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.nodeTitleText,
                            lesson.active && !isLocked && styles.nodeTitleTextActive,
                            isLocked && styles.nodeTitleTextLocked,
                          ]}
                          numberOfLines={3}
                          ellipsizeMode="tail"
                        >
                          {lesson.title}
                        </Text>

                        {isLocked && (
                          <View style={styles.lockedLabelContainer}>
                            <LockIcon size={10} color="#94A3B8" />
                            <Text style={styles.lockedLabelText}>Locked</Text>
                          </View>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Animated.View>

        {/* Floating Detail Sheet */}
        {selectedLesson && (
          <View style={styles.overlayContainer}>
            <Pressable style={styles.backdrop} onPress={() => setExpandedId(null)} />

            <View style={styles.bottomCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconContainer, { backgroundColor: selectedLesson.iconBg }]}>
                  {getCategoryIcon(selectedLesson.category, selectedLesson.color, 24)}
                </View>
                <View style={styles.cardHeaderMeta}>
                  <Text style={[styles.cardCategoryText, { color: selectedLesson.color }]}>
                    {selectedLesson.category.toUpperCase()}
                  </Text>
                  <Text style={styles.cardTitleText}>{selectedLesson.title}</Text>
                </View>
                <Pressable style={styles.closeCardBtn} onPress={() => setExpandedId(null)}>
                  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5">
                    <Line x1="18" y1="6" x2="6" y2="18" />
                    <Line x1="6" y1="6" x2="18" y2="18" />
                  </Svg>
                </Pressable>
              </View>

              {/* Everything between the header and the action button scrolls,
                  so the sheet can never grow past half the screen. */}
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                <Text style={styles.cardDescText}>{selectedLesson.desc}</Text>

                {/* ALWAYS show the "Why this lesson?" section if there's a recommendation reason, regardless of completion status */}
                {selectedLesson.recommendation_type &&
                  selectedLesson.recommendation_type !== 'recommended' &&
                  selectedLesson.recommended_reason && (
                    <View style={styles.adaptiveReasonContainer}>
                      <View style={styles.adaptiveReasonTitleRow}>
                        <TargetIcon size={13} color="#0f3172" />
                        <Text style={styles.adaptiveReasonTitle}>Why this lesson?</Text>
                      </View>
                      <Text style={styles.adaptiveReasonSubtitle}>
                        {selectedLesson.covered_skills && selectedLesson.covered_skills.length > 0
                          ? 'This lesson will help you practice these skills:'
                          : selectedLesson.recommended_reason}
                      </Text>
                      {selectedLesson.covered_skills && selectedLesson.covered_skills.length > 0 && (
                        <View style={styles.skillListContainer}>
                          {selectedLesson.covered_skills.map((skill, idx) => {
                            const mastery = Math.round(skill.mastery * 100);
                            const masteryColor = mastery < 20 ? '#EF4444' : mastery < 40 ? '#F59E0B' : mastery < 60 ? '#8B5CF6' : '#10B981';
                            return (
                              <View key={idx} style={styles.skillListItem}>
                                <View style={[styles.skillDot, { backgroundColor: masteryColor }]} />
                                <Text style={styles.skillListText}>
                                  <Text style={styles.skillListName}>{skill.display_name || skill.gesture_name}</Text>
                                  <Text style={[styles.skillListMastery, { color: masteryColor }]}>
                                    {' '}({mastery}% mastery)
                                  </Text>
                                </Text>
                                {mastery < 30 && (
                                  <View style={styles.skillWarnIcon}>
                                    <AlertIcon size={12} color="#EF4444" />
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}


                {/* ── PERFORMANCE SNAPSHOT ───────────────────────────── */}
                {!selectedLesson.locked && (
                  <View style={styles.perfRow}>
                    <View style={styles.perfCard}>
                      <Text style={styles.perfCardLabel}>Stars</Text>
                      <StarsRow count={getStarsFromScore(bestAttemptScore)} size={15} />
                    </View>
                    <View style={styles.perfCard}>
                      <Text style={styles.perfCardLabel}>Best score</Text>
                      <Text style={styles.perfCardValue}>
                        {bestAttemptScore > 0 ? `${Math.round(bestAttemptScore)}%` : '—'}
                      </Text>
                    </View>
                    <View style={styles.perfCard}>
                      <Text style={styles.perfCardLabel}>Rank</Text>
                      <Text style={styles.perfCardValue}>
                        {loadingPerf ? '…' : (rankLabel(perfRank) || '—')}
                      </Text>
                    </View>
                    <View style={styles.perfCard}>
                      <Text style={styles.perfCardLabel}>Attempts</Text>
                      <Text style={styles.perfCardValue}>
                        {loadingPerf ? '…' : (perfAttempts.length || selectedLesson.attempts || 0)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.cardInfoRow}>
                  <View style={styles.cardInfoBadge}>
                    <ClockIcon size={13} color="#475569" />
                    <Text style={styles.cardInfoBadgeText}>{selectedLesson.duration}</Text>
                  </View>
                  <View style={[styles.cardInfoBadge, { backgroundColor: '#EEF2FF' }]}>
                    <BoltIcon size={13} color="#4338CA" />
                    <Text style={[styles.cardInfoBadgeText, { color: '#4338CA' }]}>
                      Up to +{selectedLesson.xp} XP
                    </Text>
                  </View>
                </View>

                {/* Full attempt-history screen (regular lessons only) */}
                {selectedLesson.has_quiz && !selectedLesson.is_checkpoint_exam && (
                  <Pressable
                    style={styles.attemptHistoryBtn}
                    onPress={() => {
                      setExpandedId(null);
                      router.push(`/lesson/history/${selectedLesson.id}` as any);
                    }}
                  >
                    <HistoryIcon size={15} color="#2563EB" />
                    <Text style={styles.attemptHistoryBtnText}>View Full History</Text>
                  </Pressable>
                )}
              </ScrollView>

              <View style={styles.sheetFooter}>
                <Pressable
                  onPress={() => {
                    setExpandedId(null);
                    if (selectedLesson.is_checkpoint_exam) {
                      router.push(`/checkpoint-exam/${selectedLesson.exam_id}` as any);
                    } else {
                      router.push(`/lesson/${selectedLesson.id}` as any);
                    }
                  }}
                  style={[
                    styles.cardActionBtn,
                    { backgroundColor: selectedLesson.locked ? '#CBD5E1' : selectedLesson.color },
                  ]}
                  disabled={selectedLesson.locked}
                >
                  {selectedLesson.locked ? (
                    <LockIcon size={16} color="#fff" />
                  ) : selectedLesson.done ? (
                    <RefreshIcon size={16} color="#fff" />
                  ) : selectedLesson.is_checkpoint_exam ? (
                    <TrophyIcon size={16} color="#fff" />
                  ) : (
                    <PlayIcon size={16} color="#fff" />
                  )}
                  <Text style={styles.cardActionBtnText}>
                    {selectedLesson.locked
                      ? "LOCKED"
                      : selectedLesson.is_checkpoint_exam
                        ? (selectedLesson.done ? "RETAKE EXAM" : "START EXAM")
                        : (selectedLesson.done ? "REVIEW LESSON" : "START LESSON")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

        )}
      </View>
    </SafeAreaView>
  );
}

// ── STYLES ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sunContainer: {
    position: 'absolute',
    top: 60,
    right: -20,
    zIndex: 0,
  },
  floatingSky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  cloudWrapper: {
    position: 'absolute',
    left: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 8,
    zIndex: 5,
  },
  logoText: {
    color: '#0f3172',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpTopBadge: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  xpTopText: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '700',
  },
  streakBadge: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  streakText: {
    color: '#0f3172',
    fontSize: 13,
    fontWeight: '700',
  },

  unitBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    zIndex: 5,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  unitTitle: {
    color: '#0f3172',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 2,
  },
  unitDesc: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  arrowButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  arrowButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Module Dots
  moduleDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  moduleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  moduleDotActive: {
    backgroundColor: '#2563EB',
    width: 16,
  },

  progressSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  progressTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    height: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FCD34D',
    borderRadius: 12,
    shadowColor: '#FCD34D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },

  mapContainer: {
    flex: 1,
    marginTop: 10,
    zIndex: 2,
  },
  nodeAbsoluteContainer: {
    position: 'absolute',
    width: NODE_RADIUS * 2,
    height: NODE_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  nodeCircle: {
    width: NODE_RADIUS * 2,
    height: NODE_RADIUS * 2,
    borderRadius: NODE_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  pulseRing: {
    position: 'absolute',
    width: NODE_RADIUS * 2,
    height: NODE_RADIUS * 2,
    borderRadius: NODE_RADIUS,
    zIndex: -1,
  },
  nodeLabelBox: {
    position: 'absolute',
    top: NODE_RADIUS * 2 + 14,
    width: 156,
    alignItems: 'center',
  },
  nodeStarsBadge: {
    position: 'absolute',
    top: NODE_RADIUS * 2 - 12,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(147, 197, 253, 0.7)',
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 5,
  },
  nodeTitleCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(147, 197, 253, 0.55)',
    alignItems: 'center',
    maxWidth: 156,
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  nodeTitleCardLocked: {
    backgroundColor: 'rgba(241, 245, 249, 0.9)',
    borderColor: 'rgba(203, 213, 225, 0.8)',
    shadowOpacity: 0,
    elevation: 0,
  },
  nodeStarsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  nodeScoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  nodeLockedHint: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  nodeIndexChip: {
    position: 'absolute',
    top: -6,
    left: -6,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#0f3172',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  nodeIndexChipLocked: {
    backgroundColor: '#94A3B8',
  },
  nodeIndexChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starGlyph: {
    color: '#F59E0B',
    fontWeight: '900',
  },
  starGlyphEmpty: {
    color: '#CBD5E1',
  },
  starGlyphMuted: {
    opacity: 0.6,
  },

  // Performance panel inside the detail sheet
  perfRow: {
    flexDirection: 'row',
    gap: 6, // Reduced from 8 to 6
    marginTop: 4,
    marginBottom: 10,
    flexWrap: 'nowrap', // Ensure all items stay on one row
  },
  perfCard: {
    flex: 1,
    minWidth: 0, // Allow flex items to shrink
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6, // Reduced from 8 to 6
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  perfCardLabel: {
    fontSize: 9, // Reduced from 10 to 9
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.3, // Reduced from 0.4
    marginBottom: 4,
    textTransform: 'uppercase',
    textAlign: 'center', // Center the text
  },
  perfCardValue: {
    fontSize: 15, // Reduced from 16 to 15
    fontWeight: '900',
    color: '#0f3172',
    textAlign: 'center',
  },
  historyPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 10,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f3172',
  },
  historyCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  historyScroll: {
    maxHeight: 148,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  historyItemLeft: {
    flex: 1,
    paddingRight: 8,
  },
  historyItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  historyItemDate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyItemScore: {
    fontSize: 13,
    fontWeight: '900',
  },
  historyEmpty: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 10,
  },
  nextBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginBottom: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  nextBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  nodeTitleText: {
    fontSize: 13.5,
    lineHeight: 17,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  nodeTitleTextActive: {
    color: '#0f3172',
    fontWeight: '900',
  },
  nodeTitleTextLocked: {
    color: '#94A3B8',
  },

  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },
  emptyIllustrationBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(226, 232, 240, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f3172',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  emptyRefreshBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyRefreshBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  mascotContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 12,
    width: 150, // Increased from 120
  },
  mascotImage: {
    width: 100, // Increased from 80
    height: 100, // Increased from 80
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mascotBubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18, // Increased from 16
    paddingVertical: 8, // Increased from 6
    paddingHorizontal: 16, // Increased from 14
    borderWidth: 2.5, // Slightly thicker
    borderColor: '#2563EB',
    marginTop: 6, // Increased from 4
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 150, // Increased from 130
  },
  mascotBubbleText: {
    fontSize: 13, // Increased from 11
    fontWeight: '900',
    color: '#2563EB',
    textAlign: 'center',
    lineHeight: 18, // Added for better readability
  },

  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end', // Keep this
    alignItems: 'center',
    zIndex: 999,
    paddingBottom: 0, // Add this
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 49, 114, 0.12)',
  },
  bottomCard: {
    width: screenWidth - 32,
    maxHeight: screenHeight * 0.5,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    marginBottom: 20, // Add small margin from bottom
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderMeta: {
    flex: 1,
    marginLeft: 12,
  },
  cardCategoryText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  cardTitleText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f3172',
    marginTop: 1,
  },
  closeCardBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  cardDescText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  cardInfoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  cardInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  cardInfoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    paddingBottom: 6,
  },
  sheetFooter: {
    paddingTop: 12, // Increased from 10
    paddingBottom: 12, // Increased from 6
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  adaptiveReasonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  skillWarnIcon: {
    marginLeft: 4,
  },
  cardActionBtn: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardActionBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  attemptHistoryBtn: {
    flexDirection: 'row',
    gap: 7,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  attemptHistoryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  skillBadge: {
    position: 'absolute',
    top: NODE_RADIUS * 2 + 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
    maxWidth: 140,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skillBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // ─── ADAPTIVE REASON STYLES ────────────────────────────────────────────
  adaptiveReasonContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  adaptiveReasonTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f3172',
    marginBottom: 2,
  },
  adaptiveReasonSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  skillListContainer: {
    gap: 4,
  },
  skillListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  skillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  skillListText: {
    fontSize: 12,
    flexShrink: 1,
  },
  skillListName: {
    fontWeight: '700',
    color: '#1E293B',
  },
  skillListMastery: {
    fontWeight: '600',
  },
  skillListWarning: {
    fontWeight: '700',
    color: '#EF4444',
  },
  recommendationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  recommendationTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
  },
  adaptiveReasonScrollContainer: {
    maxHeight: 160, // Limit height so it doesn't take over the screen
    marginVertical: 4,
  },

  mascotBubbleDragging: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: '#8B5CF6',
    borderWidth: 3,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  errorBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 49, 114, 0.4)',
    zIndex: 999,
  },
  errorModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  errorCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  errorImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f3172',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  errorRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1848c8',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 200,
    shadowColor: '#1848c8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  errorRefreshText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  errorHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  // ── Locked module full-page screen (transparent, scrollable) ─────
  lockedModuleScroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  lockedModuleScreen: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 64,
    backgroundColor: 'transparent',
  },
  lockedModuleLockCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 2,
    borderColor: 'rgba(100,116,139,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  lockedEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  lockedModuleHeadline: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: '#0f3172',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 26,
    maxWidth: 300,
  },
  lockedMetaBlock: {
    alignItems: 'center',
    gap: 8,
  },
  lockedMetaLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#7C8DA6',
    textTransform: 'uppercase',
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  lockedPillNeutral: {
    borderColor: '#BFDBFE',
    backgroundColor: 'rgba(239,246,255,0.7)',
  },
  lockedPillText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  lockedModuleDivider: {
    width: 56,
    height: 1,
    backgroundColor: 'rgba(100,116,139,0.25)',
    marginVertical: 22,
  },
  lockedModuleTip: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
    marginTop: 26,
    fontWeight: '500',
  },
  // ── Locked lesson node label ────────────────────────────────────────────
  lockedLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lockedLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },


});