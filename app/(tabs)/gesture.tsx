// app/(tabs)/gesture.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import GestureTutorialModal, { shouldShowGestureTutorial, markGestureTutorialSeen } from '../../components/GestureTutorialModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH * 0.76;
const CARD_MARGIN = 10;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN * 2;
const SIDE_OFFSET = (SCREEN_WIDTH - CARD_WIDTH - CARD_MARGIN * 2) / 2;

const DEFAULT_MODULES = [
  // 1. Alphabet Part 1
  {
    id: 'alphabet_part1',
    title: 'Alphabet Part 1',
    subtitle: 'A-M',
    category: 'beginners',
    color: ['#FF6B6B', '#FF8E8E'] as const,
    icon: 'book',
    description: 'Learn letters A through M',
    progress: 0,
    xp: 40,
    locked: false,
    route: '/gesture/webview-camera',
    image: require('../../assets/images/img/alphabet.png'),
    lessons: 13,
    isCompleted: false,
    display_name: 'Alphabet Part 1 (A-M)',
  },
  // 2. Alphabet Part 2
  {
    id: 'alphabet_part2',
    title: 'Alphabet Part 2',
    subtitle: 'N-Z',
    category: 'beginners',
    color: ['#4ECDC4', '#45B7AA'] as const,
    icon: 'ribbon',
    description: 'Learn letters N through Z',
    progress: 0,
    xp: 40,
    locked: false,
    route: '/gesture/alphabet2',
    image: require('../../assets/images/img/alphabet_star.png'),
    lessons: 13,
    isCompleted: false,
    display_name: 'Alphabet Part 2 (N-Z)',
  },
  // 3. Numbers (NEW - replacing the old fingerspelling position)
  {
    id: 'level1_numbers',
    title: 'Numbers 1-10',
    subtitle: 'Learn to count',
    category: 'beginners',
    color: ['#34D399', '#10B981'] as const,
    icon: 'grid',
    description: 'Learn numbers 1 to 10 in FSL',
    progress: 0,
    xp: 40,
    locked: true,
    route: '/gesture/level3-gestures',
    image: require('../../assets/images/img/numbers.png'),
    lessons: 10,
    isCompleted: false,
    display_name: 'Level 1 Numbers',
  },
  // 4. Greetings
  {
    id: 'level2_greetings',
    title: 'Greetings',
    subtitle: 'Everyday Signs & Phrases',
    category: 'intermediate',
    color: ['#FFB6C1', '#FF8E9E'] as const,
    icon: 'chatbubble-ellipses',
    description: 'Learn common greetings and phrases',
    progress: 0,
    xp: 50,
    locked: true,
    route: '/gesture/webview-greetings',
    image: require('../../assets/images/img/greetings.png'),
    lessons: 5,
    isCompleted: false,
    display_name: 'Level 2 Greetings',
  },
  // 5. Survival
  {
    id: 'level3_survival',
    title: 'Survival Phrases',
    subtitle: 'Essential Signs',
    category: 'advanced',
    color: ['#F87171', '#EF4444'] as const,
    icon: 'shield-checkmark',
    description: 'Essential survival phrases for everyday situations',
    progress: 0,
    xp: 60,
    locked: true,
    route: '/gesture/level2-gestures',
    image: require('../../assets/images/img/greetings.png'),
    lessons: 10,
    isCompleted: false,
    display_name: 'Level 3 Survival',
  },
];

const CATEGORIES = [
  { id: 'all', title: 'All', icon: 'grid-outline' },
  { id: 'beginners', title: 'Beginners', icon: 'school-outline' },
  { id: 'intermediate', title: 'Intermediate', icon: 'trending-up-outline' },
  { id: 'advanced', title: 'Advanced', icon: 'ribbon-outline' },
];

const generateSenyaMessage = (modules: any[]): string => {
  // Get completed modules
  const completedModules = modules.filter(m => m.isCompleted);
  const inProgressModules = modules.filter(m => m.progress > 0 && m.progress < 100);
  const lockedModules = modules.filter(m => m.locked);
  const totalModules = modules.length;
  const completedCount = completedModules.length;
  const progressCount = inProgressModules.length;

  // If all modules are completed
  if (completedCount === totalModules && totalModules > 0) {
    const messages = [
      "🌟 You've mastered ALL gestures! You're a true Sign Language pro! 🎉",
      "🏆 Incredible! You've completed every single module! Time to celebrate! 🎊",
      "👏 You're officially a Sign Language master! Amazing dedication! 💪",
      "🎯 Perfect score! You've conquered all the gestures! Senya is so proud! 🌟",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // If nothing is started yet
  if (completedCount === 0 && progressCount === 0) {
    const messages = [
      "👋 Ready to start your Sign Language journey? Let's learn together! 🌟",
      "📚 The adventure begins! Pick a module and let's start signing! 💪",
      "🌟 Every expert was once a beginner. Let's start your journey today! 👋",
      "🤗 I'm so excited to teach you! Let's learn your first signs together! 🌈",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // If user has completed some modules
  if (completedCount > 0) {
    const completedNames = completedModules.map(m => m.title).join(', ');

    if (completedCount === 1) {
      const messages = [
        `🎉 You completed ${completedModules[0].title}! You're on fire! Keep going! 🔥`,
        `🌟 Great job on ${completedModules[0].title}! You're a natural signer! 👏`,
        `💪 ${completedModules[0].title} done! One step closer to becoming fluent! 🌟`,
        `🤗 Wonderful work on ${completedModules[0].title}! Ready for the next challenge? 🎯`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }

    if (completedCount >= 3) {
      const messages = [
        `🎉 You've completed ${completedCount} modules! You're becoming a fluent signer! 🌟`,
        `🔥 ${completedCount} modules done! Your dedication is truly inspiring! 💪`,
        `🏆 Amazing progress! ${completedCount} modules mastered! Keep crushing it! 🎯`,
        `🌟 You've completed ${completedCount} modules! Senya is so proud of you! 👏`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }

    const messages = [
      `🌟 Great job on ${completedNames}! You're doing amazing! Keep going! 💪`,
      `🎯 ${completedCount} modules down! You're building great signing skills! 👏`,
      `🔥 You've completed ${completedNames}! What's next on your journey? 🌟`,
      `💪 Fantastic work on ${completedNames}! You're making Senya so proud! 🤗`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // If user has some progress but no completions
  if (progressCount > 0) {
    const progressModule = inProgressModules[0];
    const messages = [
      `📚 You're making progress on ${progressModule.title}! ${progressModule.progress}% done! Keep going! 💪`,
      `🌟 ${progressModule.title} is coming along great! ${progressModule.progress}% complete! You got this! 🎯`,
      `👏 ${progressModule.progress}% through ${progressModule.title}! Practice makes perfect! 🌟`,
      `💪 You're working hard on ${progressModule.title}! Almost there, keep signing! 🤗`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Fallback message
  return "🌟 Let's practice some gestures together! Pick a module to start! 👋";
};

// Individual module card component
function ModuleCard({
  module,
  onPress,
  isActive,
}: {
  module: any;
  onPress: () => void;
  isActive: boolean;
}) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isActive ? 1.0 : 0.92,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(opacity, {
        toValue: isActive ? 1.0 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const getLockIcon = () => {
    if (module.lockReason?.type === 'level') {
      return <Ionicons name="school" size={24} color="#0F3172" />;
    }
    return <Ionicons name="lock-closed" size={24} color="#0F3172" />;
  };

  // Helper to get lock message
  const getLockMessage = () => {
    if (module.lockReason?.type === 'level') {
      return module.lockReason.message || 'Requires higher level to unlock!';
    }
    if (module.lockReason?.type === 'progress') {
      return module.lockReason.message || 'Complete previous modules to unlock!';
    }
    return 'Complete previous modules to unlock!';
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={styles.cardTouchable}
        disabled={module.locked}
      >
        <LinearGradient
          colors={module.color}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardImageContainer}>
            <Image
              source={module.image}
              style={styles.cardImage}
              contentFit="cover"
            />
            <View style={styles.cardFloatingHeader}>
              <View style={styles.cardIconBadge}>
                <Ionicons name={module.icon as any} size={20} color="#FFF" />
              </View>
              {module.isCompleted && (
                <View style={[styles.cardProgressBadge, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="checkmark-circle" size={12} color="#FFF" />
                  <Text style={styles.cardProgressBadgeText}>Complete!</Text>
                </View>
              )}
              {!module.isCompleted && module.progress > 0 && (
                <View style={styles.cardProgressBadge}>
                  <Text style={styles.cardProgressBadgeText}>{module.progress}% Done</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardOverlayDetails}>
            <View style={styles.cardHeaderInfo}>
              <Ionicons name="book-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={styles.cardInfoText}>{module.lessons} Lessons</Text>
              <Text style={styles.cardInfoDivider}>•</Text>
              <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.cardInfoText}>{module.xp} XP</Text>
            </View>

            <Text style={styles.cardMainTitle} numberOfLines={1}>{module.title}</Text>
            <Text style={styles.cardDescription} numberOfLines={1}>{module.description}</Text>

            <View style={styles.cardFooterRow}>
              {module.locked ? (
                <View style={styles.lockedRow}>
                  {module.lockReason?.type === 'level' ? (
                    <Ionicons name="school" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                  ) : (
                    <Ionicons name="lock-closed" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                  )}
                  <Text style={styles.lockedText}>
                    {module.lockReason?.type === 'level' ? 'Level Locked' : 'Progress Locked'}
                  </Text>
                </View>
              ) : (
                <View style={styles.progressBarWrapper}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(module.progress, 100)}%`, backgroundColor: module.color[0] }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressPctText}>{module.progress}% Complete</Text>
                </View>
              )}

              {!module.locked && module.progress < 100 && (
                <View style={[styles.playIndicatorButton, { backgroundColor: module.color[0] }]}>
                  <Ionicons name="play" size={14} color="#FFF" />
                </View>
              )}
              {module.isCompleted && (
                <View style={[styles.playIndicatorButton, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                </View>
              )}
            </View>
          </View>

          {module.locked && (
            <View style={styles.lockedCardOverlay}>
              <View style={styles.lockedIconCircle}>
                {getLockIcon()}
              </View>
              <Text style={styles.lockedOverlayText}>{getLockMessage()}</Text>
              {module.lockReason?.type === 'level' && (
                <Text style={styles.lockedSubText}>
                  Your level: {module.student_level || 'Beginner'} • Required: {module.requires_level || 'Intermediate'}
                </Text>
              )}
              {module.lockReason?.type === 'progress' && (
                <Text style={styles.lockedSubText}>
                  Need 40% completion of previous module
                </Text>
              )}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Carousel dots
function CarouselDots({ currentIndex, total }: { currentIndex: number; total: number }) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            currentIndex === index && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}
function ModeTile({
  title,
  tagLabel,
  description,
  gradientColors,
  iconSource,
  onPress,
  disabled,
}: {
  title: string;
  tagLabel: string;
  description: string;
  gradientColors: readonly [string, string];
  iconSource: any;
  onPress: () => void;
  disabled?: boolean;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.95, friction: 7, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.modeTileWrapper, { transform: [{ scale: pressScale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={({ pressed }) => [{ opacity: disabled && !pressed ? 0.6 : 1 }]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modeTileGradient}
        >
          <View style={styles.modeTileTag}>
            <Text style={styles.modeTileTagText}>{tagLabel}</Text>
          </View>

          <View style={styles.modeTileSpacer} />

          <Text style={styles.modeTileTitle}>{title}</Text>
          <Text style={styles.modeTileDesc} numberOfLines={2}>
            {description}
          </Text>

          <View style={styles.modeTileStartRow}>
            <Text style={styles.modeTileStartText}>Start</Text>
            <View style={styles.modeTileStartIcon}>
              <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
            </View>
          </View>
        </LinearGradient>

        {/* Icon badge overflows out of the top of the tile */}
        <View style={styles.modeTileIconBadge}>
          <Image source={iconSource} style={styles.modeTileIconImage} contentFit="contain" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function ChallengeModal({
  visible,
  onClose,
  onSelectMode,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'master' | 'infinite') => void;
  isLoading?: boolean;
}) {
  // Animation for entrance
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.95);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalHeaderIconCircle}>
              <Ionicons name="game-controller" size={19} color="#0F3172" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Choose Your Challenge</Text>
              <Text style={styles.modalSubtitle}>Pick a mode and start learning</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* ─── MODE TILES ─────────────────────────────────────────────── */}
          <View style={styles.modeTilesRow}>
            <ModeTile
              title="Master Mode"
              tagLabel="Recommended"
              description="Focus on signs you need to improve"
              gradientColors={['#FFCB47', '#FF9F1C'] as const}
              iconSource={require('../../assets/images/img/trophy.png')}
              onPress={() => onSelectMode('master')}
              disabled={isLoading}
            />
            <ModeTile
              title="Infinite Mode"
              tagLabel="Practice"
              description="Practice random signs, no pressure"
              gradientColors={['#4ECDC4', '#0D9488'] as const}
              iconSource={require('../../assets/images/img/practice.png')}
              onPress={() => onSelectMode('infinite')}
              disabled={isLoading}
            />
          </View>

          {isLoading && (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="small" color="#0F3172" />
              <Text style={styles.modalLoadingText}>Starting challenge...</Text>
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={styles.modalCancelButton} activeOpacity={0.7}>
            <Text style={styles.modalCancelText}>Maybe Later</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function GestureMain() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Update the fetchGestureProgress function
  const fetchGestureProgress = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.getGestureProgress();
      if (response && response.success) {
        // Map API data to module format
        const updatedModules = DEFAULT_MODULES.map(defaultModule => {
          const apiModule = response.modules?.find((m: any) => m.name === defaultModule.id);

          if (apiModule) {
            return {
              ...defaultModule,
              progress: apiModule.progress || 0,
              isCompleted: apiModule.is_completed || false,
              locked: apiModule.is_locked || false,
              xp: apiModule.xp_available || defaultModule.xp,
              description: apiModule.description || defaultModule.description,
              display_name: apiModule.display_name || defaultModule.display_name,
              // 🔥 NEW: Store lock reason
              lockReason: apiModule.lock_reason || null,
              requires_level: apiModule.requires_level || null,
              student_level: apiModule.student_level || null,
            };
          }
          return defaultModule;
        });

        setModules(updatedModules);
      }
    } catch (error) {
      console.error('❌ Error fetching gesture progress:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check if tutorial should show on first visit
  const checkTutorialStatus = async () => {
    const shouldShow = await shouldShowGestureTutorial();
    if (shouldShow) {
      setTutorialVisible(true);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchGestureProgress();
      checkTutorialStatus();
    }, [])
  );

  // Manual refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGestureProgress();
  };

  const handleModulePress = (module: any) => {
    if (module.locked) {
      return;
    }
    router.push(module.route as any);
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    setCurrentIndex(index);
  };

  const scrollToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  const handleChallengeMode = async (mode: 'master' | 'infinite') => {
    setChallengeLoading(true);

    try {
      const unlockedModules = modules.filter(m => !m.locked);

      if (unlockedModules.length === 0) {
        setChallengeLoading(false);
        setChallengeModalVisible(false);
        Alert.alert('No Modules', 'Complete at least one module to start a challenge!');
        return;
      }

      const priorityOrder = ['beginners', 'intermediate', 'advanced'];
      let selectedModule = unlockedModules.find(m => m.category === 'beginners');

      if (!selectedModule) {
        for (const category of priorityOrder) {
          const found = unlockedModules.find(m => m.category === category);
          if (found) {
            selectedModule = found;
            break;
          }
        }
      }

      if (!selectedModule) {
        selectedModule = unlockedModules[0];
      }

      router.push({
        pathname: '/gesture/challenge',
        params: {
          mode: mode,
          moduleType: selectedModule.category,
          moduleId: selectedModule.id,
        },
      });

      setChallengeModalVisible(false);
    } catch (error) {
      console.error('❌ Challenge start error:', error);
    } finally {
      setChallengeLoading(false);
    }
  };

  // Filter modules based on category
  const filteredModules = selectedCategory === 'all'
    ? modules
    : modules.filter((m) => m.category === selectedCategory);

  // Loading state
  if (loading) {
    return (
      <LinearGradient
        colors={['#EAF5FD', '#DDECFB', '#CBE0F8']}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F3172" />
            <Text style={styles.loadingText}>Loading your progress...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#EAF5FD', '#DDECFB', '#CBE0F8']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header - With tutorial button */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.greeting}>Let's Practice </Text>
              <Text style={styles.title}>Gestures</Text>
            </View>
            <TouchableOpacity
              style={styles.tutorialButton}
              onPress={() => setTutorialVisible(true)}
              hitSlop={8}
            >
              <LinearGradient
                colors={['#4B7BBB', '#6FA8E6']}
                style={styles.tutorialButtonGradient}
              >
                <Ionicons name="help-circle" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Category Filters */}
          <View style={styles.categoriesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContent}
            >
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      isSelected && styles.categoryButtonActive,
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setCurrentIndex(0);
                    }}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={18}
                      color={isSelected ? '#FFFFFF' : '#4B7BBB'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextActive,
                      ]}
                    >
                      {cat.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Carousel Section */}
          <View style={styles.carouselSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Modules</Text>
              {filteredModules.length > 1 && (
                <View style={styles.carouselNavSimple}>
                  <TouchableOpacity
                    style={[styles.arrowButton, currentIndex === 0 && styles.arrowButtonDisabled]}
                    onPress={() => scrollToIndex(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={currentIndex === 0 ? 'rgba(15, 49, 114, 0.25)' : '#0F3172'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.arrowButton,
                      currentIndex === filteredModules.length - 1 && styles.arrowButtonDisabled,
                    ]}
                    onPress={() => scrollToIndex(Math.min(filteredModules.length - 1, currentIndex + 1))}
                    disabled={currentIndex === filteredModules.length - 1}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={currentIndex === filteredModules.length - 1 ? 'rgba(15, 49, 114, 0.25)' : '#0F3172'}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {filteredModules.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={40} color="#4B7BBB" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No modules in this category yet!</Text>
              </View>
            ) : (
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={flatListRef}
                  data={filteredModules}
                  renderItem={({ item, index }) => (
                    <ModuleCard
                      module={item}
                      onPress={() => handleModulePress(item)}
                      isActive={currentIndex === index}
                    />
                  )}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  snapToInterval={SNAP_INTERVAL}
                  snapToAlignment="center"
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingHorizontal: SIDE_OFFSET }}
                  style={styles.carousel}
                />

                <CarouselDots currentIndex={currentIndex} total={filteredModules.length} />
              </View>
            )}
          </View>

          {/* Quick Access - ONLY Challenge + Fingerspelling */}
          <View style={styles.quickAccess}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickAccessGrid}>
              {/* Challenge Button */}
              <TouchableOpacity
                style={[styles.quickAccessItem, styles.challengeButton]}
                onPress={() => setChallengeModalVisible(true)}
              >
                <View style={[styles.quickAccessIconContainer, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                  <Ionicons name="trophy" size={28} color="#FFD700" />
                </View>
                <Text style={[styles.quickAccessText, styles.challengeText]}>Challenge</Text>
                <View style={styles.challengeBadge}>
                  <Text style={styles.challengeBadgeText}>NEW</Text>
                </View>
              </TouchableOpacity>

              {/* Fingerspelling Button */}
              <TouchableOpacity
                style={styles.quickAccessItem}
                onPress={() => router.push('/gesture/fingerspelling')}
              >
                <View style={[styles.quickAccessIconContainer, { backgroundColor: 'rgba(168, 230, 207, 0.3)' }]}>
                  <Ionicons name="hand-left" size={28} color="#10B981" />
                </View>
                <Text style={styles.quickAccessText}>Fingerspelling</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Senya's Tip */}
          <View style={styles.tipCard}>
            <Image
              source={require('../../assets/images/img/senya_teaching.png')}
              style={styles.tipImage}
              contentFit="contain"
            />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>💬 Senya Says</Text>
              <Text style={styles.tipText}>
                {generateSenyaMessage(modules)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Challenge Modal */}
      <ChallengeModal
        visible={challengeModalVisible}
        onClose={() => setChallengeModalVisible(false)}
        onSelectMode={handleChallengeMode}
        isLoading={challengeLoading}
      />

      {/* Tutorial Modal */}
      <GestureTutorialModal
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#4B7BBB',
    marginTop: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  greeting: {
    fontSize: 14,
    color: '#4B7BBB',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F3172',
    marginTop: 2,
  },
  tutorialButton: {
    marginLeft: 8,
  },
  tutorialButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoriesContainer: {
    marginVertical: 8,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 49, 114, 0.12)',
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryButtonActive: {
    backgroundColor: '#0F3172',
    borderColor: '#0F3172',
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B7BBB',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  carouselSection: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F3172',
  },
  carouselNavSimple: {
    flexDirection: 'row',
    gap: 8,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 49, 114, 0.12)',
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  arrowButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderColor: 'rgba(15, 49, 114, 0.06)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(15, 49, 114, 0.08)',
  },
  emptyText: {
    color: '#4B7BBB',
    fontSize: 14,
    fontWeight: '500',
  },
  carouselContainer: {
    position: 'relative',
  },
  carousel: {
    height: 360,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: 340,
    marginHorizontal: CARD_MARGIN,
    borderRadius: 24,
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTouchable: {
    flex: 1,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImageContainer: {
    height: 180,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFloatingHeader: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardProgressBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cardProgressBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  cardOverlayDetails: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardInfoText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardInfoDivider: {
    marginHorizontal: 6,
    color: '#D1D5DB',
  },
  cardMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F3172',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarWrapper: {
    flex: 1,
    marginRight: 10,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPctText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 4,
  },
  playIndicatorButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  lockedCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  lockedIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(15, 49, 114, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(15, 49, 114, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  lockedOverlayText: {
    color: '#4B7BBB',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 49, 114, 0.2)',
  },
  dotActive: {
    backgroundColor: '#0F3172',
    width: 18,
  },
  quickAccess: {
    marginTop: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAccessItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 49, 114, 0.1)',
    position: 'relative',
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickAccessItemLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderColor: 'rgba(15, 49, 114, 0.06)',
    opacity: 0.7,
  },
  quickAccessIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickAccessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F3172',
  },
  quickAccessLock: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(15, 49, 114, 0.1)',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tipImage: {
    width: 56,
    height: 56,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D97706',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: '#4B7BBB',
    fontWeight: '600',
    lineHeight: 18,
  },
  // ─── MODAL STYLES ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 49, 114, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '100%',
    maxWidth: 380,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  modalHeaderIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#FFF3D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F3172',
    lineHeight: 22,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#8A94A6',
    fontWeight: '600',
    marginTop: 1,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── MODE TILES ────────────────────────────────────────────────────────
  modeTilesRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  modeTileWrapper: {
    flex: 1,
  },
  modeTileGradient: {
    borderRadius: 22,
    paddingTop: 30,
    paddingBottom: 14,
    paddingHorizontal: 14,
    minHeight: 168,
    justifyContent: 'flex-end',
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  modeTileSpacer: {
    flex: 1,
  },
  modeTileTag: {
    position: 'absolute',
    top: 46,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  modeTileTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  modeTileTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modeTileDesc: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 14,
    marginBottom: 12,
  },
  modeTileStartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeTileStartText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modeTileStartIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icon badge that pops out of the top of the tile
  modeTileIconBadge: {
    position: 'absolute',
    top: -26,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  modeTileIconImage: {
    width: 64,
    height: 64,
  },

  modalLoadingContainer: {
    paddingTop: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalLoadingText: {
    fontSize: 12,
    color: '#4B7BBB',
    fontWeight: '600',
  },
  modalCancelButton: {
    marginTop: 14,
    marginHorizontal: 20,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F5F6F8',
  },
  modalCancelText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  // Quick Access - Challenge Button
  challengeButton: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFFDF0',
    position: 'relative',
  },
  challengeText: {
    color: '#D97706',
  },
  challengeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  challengeBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  lockedSubText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },


});