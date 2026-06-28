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
  Easing
} from 'react-native';
import { useRouter } from 'expo-router';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

// Animated Cloud Component - Clean and simple
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

// Default Baseline Lessons (Tab 0)
const defaultLessonsData = [
  {
    id: 1,
    category: "Greetings",
    title: "Hello & Goodbye",
    desc: "Essential everyday greetings in FSL",
    color: "#FF6B6B",
    iconBg: "#FFEBEB",
    duration: "4 min",
    xp: 15,
    done: true,
    active: false,
    locked: false
  },
  {
    id: 2,
    category: "Alphabet",
    title: "Letters A–E",
    desc: "Learn the first 5 letters of the FSL alphabet",
    color: "#8B5CF6",
    iconBg: "#F5F3FF",
    duration: "5 min",
    xp: 20,
    done: true,
    active: false,
    locked: false
  },
  {
    id: 3,
    category: "Greetings",
    title: "Thank You & Please",
    desc: "Polite expressions used in everyday conversations",
    color: "#10B981",
    iconBg: "#ECFDF5",
    duration: "4 min",
    xp: 15,
    done: false,
    active: true,
    locked: false
  },
  {
    id: 4,
    category: "Numbers",
    title: "Numbers 1–5",
    desc: "Count from one to five in FSL",
    color: "#F59E0B",
    iconBg: "#FEF3C7",
    duration: "6 min",
    xp: 25,
    done: false,
    active: false,
    locked: true
  },
  {
    id: 5,
    category: "Alphabet",
    title: "Letters F–J",
    desc: "Continue with the next 5 alphabet signs",
    color: "#EC4899",
    iconBg: "#FDF2F8",
    duration: "5 min",
    xp: 20,
    done: false,
    active: false,
    locked: true
  },
];

export default function Lessons() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Profile status
  const [streak, setStreak] = useState<number>(12);
  const [xp, setXp] = useState<number>(150);

  // Teacher lessons state
  const [teacherLessons, setTeacherLessons] = useState<any[]>([]);
  const [loadingTeacher, setLoadingTeacher] = useState<boolean>(false);

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

  // Load Teacher lessons from API
  const loadLessonsData = async () => {
    try {
      setLoadingTeacher(true);
      const response = await api.getStudentLessons();
      if (response.success && response.lessons) {
        setTeacherLessons(response.lessons);
        if (response.student) {
          setStreak(response.student.streak_days || 0);
          setXp(response.student.total_xp || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching teacher lessons:', error);
    } finally {
      setLoadingTeacher(false);
    }
  };

  useEffect(() => {
    loadLessonsData();
  }, []);

  // Compute lesson node lists
  const getLessonsList = () => {
    if (activeTab === 0) {
      return defaultLessonsData;
    }

    if (!teacherLessons || teacherLessons.length === 0) return [];

    const hasInProgress = teacherLessons.some(l => l.status === 'in_progress');
    const firstPendingIndex = teacherLessons.findIndex(l => l.status === 'pending');

    return teacherLessons.map((item, index) => {
      const isDone = item.status === 'completed';
      let isActive = item.status === 'in_progress';
      let isLocked = item.status === 'pending';

      if (!hasInProgress && index === firstPendingIndex) {
        isActive = true;
        isLocked = false;
      }
      if (teacherLessons.every(l => l.status === 'pending') && index === 0) {
        isActive = true;
        isLocked = false;
      }

      const color = ACCENT_COLORS[index % ACCENT_COLORS.length];
      return {
        id: item.lesson_id,
        category: item.difficulty ? item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1) : "Lesson",
        title: item.title,
        desc: item.description || "Complete the contents and quiz assigned by your teacher.",
        color,
        iconBg: color + '18',
        duration: item.total_steps ? `${item.total_steps * 2} min` : "5 min",
        xp: item.has_quiz ? 30 : 20,
        done: isDone,
        active: isActive,
        locked: isLocked,
      };
    });
  };

  const currentLessons = getLessonsList();
  const totalNodes = currentLessons.length;

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

  // Switch tabs
  const switchTab = (targetTab: number) => {
    if (targetTab === activeTab) return;
    setExpandedId(null);
    Animated.timing(tabFadeAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(targetTab);
      if (targetTab === 1) {
        loadLessonsData();
      }
      Animated.timing(tabFadeAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }).start();
    });
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
    <View style={styles.container}>
      {/* Animated Gradient Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg width={screenWidth} height={screenHeight}>
          <Defs>
            <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#87CEEB" stopOpacity="1" />
              <Stop offset="30%" stopColor="#B3E5FC" stopOpacity="0.9" />
              <Stop offset="70%" stopColor="#E3F2FD" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#F5F9FF" stopOpacity="0.9" />
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
          {/* Sun rays */}
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

      {/* Top Bar */}
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
      </View>

      {/* Unit Banner */}
      <View style={styles.unitBanner}>
        <View style={styles.bannerRow}>
          <Pressable
            style={[styles.arrowButton, activeTab === 0 && styles.arrowButtonDisabled]}
            onPress={() => activeTab === 1 && switchTab(0)}
            disabled={activeTab === 0}
          >
            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTab === 0 ? "#94A3B8" : "#fff"} strokeWidth="3">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </Pressable>

          <View style={styles.bannerTitleContainer}>
            <Text style={styles.unitTitle}>
              {activeTab === 0 ? "Unit 1: Basics" : "Teacher's Lessons"}
            </Text>
            <Text style={styles.unitDesc}>
              {activeTab === 0
                ? "Master the alphabet and essential greetings"
                : "Assigned lessons from your instructor"}
            </Text>
          </View>

          <Pressable
            style={[styles.arrowButton, activeTab === 1 && styles.arrowButtonDisabled]}
            onPress={() => activeTab === 0 && switchTab(1)}
            disabled={activeTab === 1}
          >
            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTab === 1 ? "#94A3B8" : "#fff"} strokeWidth="3">
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
        {activeTab === 1 && loadingTeacher ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loaderText}>Loading lessons...</Text>
          </View>
        ) : totalNodes === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustrationBox}>
              <BookIcon size={64} color="#93C5FD" />
            </View>
            <Text style={styles.emptyTitle}>No Lessons Yet!</Text>
            <Text style={styles.emptySubText}>
              Your teacher hasn't uploaded any lessons yet. Check back later!
            </Text>
            <Pressable style={styles.emptyRefreshBtn} onPress={loadLessonsData}>
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
                    left: (cycle => {
                      const xPct = cycle[activePathIndex % cycle.length];
                      return xPct > 0.5 ? activePos.x - 95 : activePos.x + 50;
                    })([0.5, 0.76, 0.5, 0.24]),
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

            {/* Checkpoint Nodes */}
            {currentLessons.map((lesson, index) => {
              const pos = points[index];
              const isSelected = expandedId === lesson.id;

              let nodeBg = lesson.color;
              let iconColor = '#fff';

              if (lesson.locked) {
                nodeBg = '#CBD5E1';
                iconColor = '#64748B';
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
                    ) : lesson.active ? (
                      <PlayIcon color={iconColor} size={24} />
                    ) : (
                      getCategoryIcon(lesson.category, iconColor, 24)
                    )}
                  </Pressable>

                  <View style={styles.nodeLabelBox}>
                    {lesson.active && !lesson.locked && (
                      <View style={styles.nextBadge}>
                        <Text style={styles.nextBadgeText}>NEXT UP</Text>
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

            <View style={styles.cardInfoRow}>
              <View style={styles.cardInfoBadge}>
                <Text style={styles.cardInfoBadgeText}>⏱️ {selectedLesson.duration}</Text>
              </View>
              <View style={[styles.cardInfoBadge, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[styles.cardInfoBadgeText, { color: '#4338CA' }]}>⚡ +{selectedLesson.xp} XP</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setExpandedId(null);
                router.push(`/lesson/${selectedLesson.id}` as any);
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
                  : selectedLesson.done
                    ? "🔄 REVIEW LESSON"
                    : "🚀 START LESSON"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F2FD',
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
    paddingTop: 16,
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
});