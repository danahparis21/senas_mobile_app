import React, { useState, useEffect, useRef } from 'react';
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
  Platform
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

// Design Geometry Constants
const NODE_ROW_HEIGHT = 145;
const NODE_RADIUS = 36;
const HORIZ_PADDING = 50;
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

// Custom Play Icon
function PlayIcon({ color = '#fff', size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
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

interface Module {
  module_id: number;
  title: string;
  description: string;
  lessons: Lesson[];
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
  const [activeTab, setActiveTab] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
            recommended_reason: lesson.recommendation_reason,
            category: lesson.difficulty ? lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1) : "Lesson",
            desc: lesson.recommendation_reason || lesson.description || "Picked for you based on your learning path.",
            color: color,
            iconBg: color + '18',
            duration: lesson.total_steps ? `${lesson.total_steps * 2} min` : "5 min",
            xp: lesson.has_quiz ? 30 : 20,
            done: !!lesson.done,
            active: !!lesson.active,
            locked: !!lesson.locked,
            // 🆕 Store adaptive data
            covered_skills: lesson.covered_skills || [],
            recommendation_type: lesson.recommendation_type || 'recommended',
            priority: lesson.priority || 0,
            // 🆕 Store the weakest skill for badge display
            weakest_skill: weakestSkill,
          };
        });

        setLearningPathLessons(transformed);
        setGoalMastered(!!response.learning_path?.goal_mastered);

        // Also update weak skills from the response
        if (response.weak_skills) {
          setWeakSkills(response.weak_skills);
        }
        if (response.mastery_summary) {
          setMasterySummary(response.mastery_summary);
        }
      }
    } catch (error) {
      console.error('Error fetching adaptive lessons:', error);
    } finally {
      setLoadingLearningPath(false);
    }
  };

  const loadModulesData = async () => {
    try {
      setLoadingModules(true);
      const response = await api.getStudentLessons();

      if (response.success && response.modules) {
        const transformedModules: Module[] = response.modules.map((module: any) => {
          const lessons = module.lessons || [];

          const transformedLessons: Lesson[] = lessons.map((lesson: any, index: number) => {
            const isExam = !!lesson.is_checkpoint_exam;
            const color = isExam ? '#F59E0B' : ACCENT_COLORS[index % ACCENT_COLORS.length];

            // Check if this is the first lesson in the module
            const isFirstLesson = index === 0;

            // Check if previous lesson is completed with passing score
            let isNextLesson = false;
            if (index > 0) {
              const prevLesson = lessons[index - 1];
              if (prevLesson && prevLesson.status === 'completed' && (prevLesson.score || 0) >= 60) {
                isNextLesson = true;
              }
            }

            // Logic for locking:
            let isLocked = false;

            if (isExam) {
              isLocked = lesson.is_locked === true;
            } else if (isFirstLesson) {
              isLocked = false; // First lesson always unlocked
            } else if (lesson.status === 'completed' && (lesson.score || 0) >= 60) {
              isLocked = false; // Completed lessons are unlocked
            } else if (isNextLesson) {
              isLocked = false; // Next lesson after a completed one is unlocked (to retry)
            } else {
              isLocked = (lesson.is_locked === true || lesson.status === 'failed');
            }

            const isDone = lesson.status === 'completed' && (lesson.score || 0) >= 60;
            const isActive = isExam ? (!isLocked && !isDone) : (lesson.status === 'in_progress' || (isNextLesson && (lesson.status === 'pending' || lesson.status === 'failed')));

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
            };
          });

          return {
            module_id: module.module_id,
            title: module.title,
            description: module.description || '',
            lessons: transformedLessons,
          };
        });

        setModules(transformedModules);

        if (response.student) {
          setStreak(response.student.streak_days || 0);
          setXp(response.student.total_xp || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching modules and lessons:', error);
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
            recommended_reason: lesson.recommended_reason,
            category: lesson.difficulty ? lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1) : "Lesson",
            desc: lesson.recommended_reason || lesson.description || "Picked for you based on your learning path.",
            color: color,
            iconBg: color + '18',
            duration: lesson.total_steps ? `${lesson.total_steps * 2} min` : "5 min",
            xp: lesson.has_quiz ? 30 : 20,
            done: !!lesson.done,
            active: !!lesson.active,
            locked: !!lesson.locked,
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
    return currentModule.lessons || [];
  };

  const currentLessons = getCurrentLessons();
  const totalNodes = currentLessons.length;

  // Get module name for display
  const getModuleDisplayName = (): string => {
    if (activeTab === 0) {
      return "My Learning Path";
    }

    if (modules.length === 0 || currentModuleIndex >= modules.length) {
      return "No Module";
    }

    return modules[currentModuleIndex].title;
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

    return modules[currentModuleIndex].description || "Complete the lessons in this module";
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

  const activePos = points[activePathIndex];



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
          ) : (
            <ScrollView
              contentContainerStyle={{ height: totalNodes * NODE_ROW_HEIGHT + 70 }}
              showsVerticalScrollIndicator={false}
            >
              {/* SVG Path Connections */}
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

              {/* Bobbing Mascot */}
              {activePos && (
                <Animated.View
                  style={[
                    styles.mascotContainer,
                    {
                      left: (() => {
                        const cycle = [0.5, 0.76, 0.5, 0.24];
                        const xPct = cycle[activePathIndex % cycle.length];
                        return xPct > 0.5 ? activePos.x - 95 : activePos.x + 50;
                      })(),
                      top: activePos.y - 75,
                      transform: [{ translateY: bobY }],
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Image
                    source={MascotImage}
                    style={styles.mascotImage}
                    contentFit="contain"
                  />
                  <View style={styles.mascotBubble}>
                    <Text style={styles.mascotBubbleText}>🌟 You got this!</Text>
                  </View>
                </Animated.View>
              )}

              {currentLessons.map((lesson, index) => {
                const pos = points[index];
                const isSelected = expandedId === lesson.id;

                let nodeBg = lesson.color;
                let iconColor = '#fff';

                if (lesson.locked) {
                  nodeBg = '#CBD5E1';
                  iconColor = '#64748B';
                }

                // 🆕 Determine badge text
                let badgeText = '';
                let badgeColor = '#F59E0B';
                if (lesson.recommendation_type === 'weak_skill_practice' && lesson.weakest_skill) {
                  const skillName = lesson.weakest_skill.display_name || lesson.weakest_skill.gesture_name;
                  const mastery = Math.round(lesson.weakest_skill.mastery * 100);
                  badgeText = `✏️ ${skillName} (${mastery}%)`;
                  badgeColor = mastery < 20 ? '#EF4444' : mastery < 40 ? '#F59E0B' : '#10B981';
                } else if (lesson.recommendation_type === 'new_skill') {
                  badgeText = '🌟 New Skill';
                  badgeColor = '#8B5CF6';
                } else if (lesson.recommendation_type === 'next_in_path') {
                  badgeText = '➡️ Next Lesson';
                  badgeColor = '#3B82F6';
                }

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
                    {lesson.active && !lesson.locked && (
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
                      onPress={() => setExpandedId(isSelected ? null : lesson.id)}
                      style={({ pressed }) => [
                        styles.nodeCircle,
                        {
                          backgroundColor: nodeBg,
                          shadowColor: lesson.locked ? '#94A3B8' : lesson.color,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        },
                      ]}
                    >
                      {lesson.locked ? (
                        <LockIcon size={24} color={iconColor} />
                      ) : lesson.done ? (
                        <CheckIcon size={26} color={iconColor} />
                      ) : lesson.is_checkpoint_exam ? (
                        <Text style={{ fontSize: 24 }}>🏆</Text>
                      ) : lesson.active ? (
                        <PlayIcon color={iconColor} size={24} />
                      ) : (
                        getCategoryIcon(lesson.category, iconColor, 24)
                      )}
                    </Pressable>

                    <View style={styles.nodeLabelBox}>
                      {lesson.active && !lesson.locked && (
                        <View style={[styles.nextBadge, lesson.is_checkpoint_exam && { backgroundColor: '#F59E0B' }]}>
                          <Text style={styles.nextBadgeText}>{lesson.is_checkpoint_exam ? "EXAM 🏆" : "NEXT UP"}</Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.nodeTitleText,
                          lesson.active && styles.nodeTitleTextActive,
                          lesson.locked && styles.nodeTitleTextLocked,
                        ]}
                        numberOfLines={1}
                      >
                        {lesson.title}
                      </Text>
                    </View>

                    {/* 🆕 SKILL BADGE - below the lesson title */}
                    {badgeText && !lesson.done && !lesson.locked && (
                      <View style={[styles.skillBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
                        <Text style={[styles.skillBadgeText, { color: badgeColor }]} numberOfLines={1}>
                          {badgeText}
                        </Text>
                      </View>
                    )}
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

              <Text style={styles.cardDescText}>{selectedLesson.desc}</Text>

              {/* 🆕 RECOMMENDATION TYPE BADGE */}
              {selectedLesson.recommendation_type && (
                <View style={styles.recommendationTypeContainer}>
                  <Text style={styles.recommendationTypeText}>
                    {selectedLesson.recommendation_type === 'weak_skill_practice' && '📝 Practice Lesson'}
                    {selectedLesson.recommendation_type === 'new_skill' && '🌟 New Skill Lesson'}
                    {selectedLesson.recommendation_type === 'goal_match' && '🎯 Matches Your Goal'}
                    {selectedLesson.recommendation_type === 'next_in_path' && '➡️ Next in Path'}
                    {selectedLesson.recommendation_type === 'recommended' && '📚 Recommended'}
                  </Text>
                </View>
              )}

              {/* 🆕 ADAPTIVE REASON SECTION - Now SCROLLABLE
                  Previously gated on covered_skills.length > 0, which hid
                  this whole panel for 'goal_match' and 'next_in_path'
                  recommendations — those never populate covered_skills
                  since they're not skill-driven, even though they always
                  have a perfectly good recommended_reason string. That's
                  why new students (whose picks mostly come from those two
                  types before enough mastery data exists) saw an empty
                  "Why this lesson?" panel. Now it shows whenever there's
                  a reason at all, with the skill breakdown as an optional
                  extra when covered_skills is actually populated. */}
              {selectedLesson.recommended_reason && (
                <ScrollView
                  style={styles.adaptiveReasonScrollContainer}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <View style={styles.adaptiveReasonContainer}>
                    <Text style={styles.adaptiveReasonTitle}>🎯 Why this lesson?</Text>
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
                                {mastery < 30 && <Text style={styles.skillListWarning}> ⚠️ Needs practice!</Text>}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}

              <View style={styles.cardInfoRow}>
                <View style={styles.cardInfoBadge}>
                  <Text style={styles.cardInfoBadgeText}>⏱️ {selectedLesson.duration}</Text>
                </View>
                <View style={[styles.cardInfoBadge, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={[styles.cardInfoBadgeText, { color: '#4338CA' }]}>
                    ⚡ Up to +{selectedLesson.xp} XP
                  </Text>
                </View>
              </View>

              {/* Attempt History Button - Only show if regular lesson has a quiz */}
              {selectedLesson.has_quiz && !selectedLesson.is_checkpoint_exam && (
                <Pressable
                  style={styles.attemptHistoryBtn}
                  onPress={() => {
                    setExpandedId(null);
                    router.push(`/lesson/history/${selectedLesson.id}` as any);
                  }}
                >
                  <Text style={styles.attemptHistoryBtnText}>📊 Attempt History</Text>
                </Pressable>
              )}

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
                <Text style={styles.cardActionBtnText}>
                  {selectedLesson.locked
                    ? "🔒 LOCKED"
                    : selectedLesson.is_checkpoint_exam
                      ? (selectedLesson.done ? "🔄 RETAKE EXAM" : "🏆 START EXAM")
                      : (selectedLesson.done ? "🔄 REVIEW LESSON" : "🚀 START LESSON")}
                </Text>
              </Pressable>
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
    top: NODE_RADIUS * 2 + 6,
    width: 140,
    alignItems: 'center',
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
    fontSize: 12,
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
    width: 85,
  },
  mascotImage: {
    width: 60,
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mascotBubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#2563EB',
    marginTop: 2,
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  mascotBubbleText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2563EB',
    textAlign: 'center',
  },

  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 49, 114, 0.12)',
  },
  bottomCard: {
    width: screenWidth - 32,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
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
  cardActionBtn: {
    borderRadius: 16,
    paddingVertical: 14,
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  attemptHistoryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  skillBadge: {
    position: 'absolute',
    top: NODE_RADIUS * 2 + 32,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
    maxWidth: 120,
    alignSelf: 'center',
  },
  skillBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#F59E0B',
    textAlign: 'center',
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

});