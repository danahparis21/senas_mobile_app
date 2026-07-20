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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH * 0.76;
const CARD_MARGIN = 10;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN * 2;
const SIDE_OFFSET = (SCREEN_WIDTH - CARD_WIDTH - CARD_MARGIN * 2) / 2;

const DEFAULT_MODULES = [
  // 1. Alphabet Part 1 (keep as is)
  {
    id: 'alphabet_part1',
    title: 'Alphabet Part 1',
    subtitle: 'A-M',
    category: 'alphabet',
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
  // 2. Alphabet Part 2 (keep as is)
  {
    id: 'alphabet_part2',
    title: 'Alphabet Part 2',
    subtitle: 'N-Z',
    category: 'alphabet',
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
    category: 'numbers', // NEW category
    color: ['#34D399', '#10B981'] as const,
    icon: 'grid',
    description: 'Learn numbers 1 to 10 in FSL',
    progress: 0,
    xp: 40,
    locked: true, // Locked until alphabets are done
    route: '/gesture/level3-gestures',
    image: require('../../assets/images/img/numbers.png'),
    lessons: 10,
    isCompleted: false,
    display_name: 'Level 1 Numbers',
  },
  // 4. Greetings (renamed from 'greetings' to 'level2_greetings')
  {
    id: 'level2_greetings',
    title: 'Greetings',
    subtitle: 'Everyday Signs & Phrases',
    category: 'greetings',
    color: ['#FFB6C1', '#FF8E9E'] as const,
    icon: 'chatbubble-ellipses',
    description: 'Learn common greetings and phrases',
    progress: 0,
    xp: 50,
    locked: true, // Locked until numbers are done
    route: '/gesture/webview-greetings',
    image: require('../../assets/images/img/greetings.png'),
    lessons: 5,
    isCompleted: false,
    display_name: 'Level 2 Greetings',
  },
  // 5. Survival (NEW)
  {
    id: 'level3_survival',
    title: 'Survival Phrases',
    subtitle: 'Essential Signs',
    category: 'survival', // NEW category
    color: ['#F87171', '#EF4444'] as const,
    icon: 'shield-checkmark',
    description: 'Essential survival phrases for everyday situations',
    progress: 0,
    xp: 60,
    locked: true, // Locked until greetings are done
    route: '/gesture/level2-gestures',
    image: require('../../assets/images/img/greetings.png'),
    lessons: 10,
    isCompleted: false,
    display_name: 'Level 3 Survival',
  },

  {
    id: 'fingerspelling',
    title: 'Fingerspelling',
    subtitle: 'Practice spelling words',
    category: 'practice',
    color: ['#A8E6CF', '#88D8B0'] as const,
    icon: 'hand-left',
    description: 'Spell words using signs',
    progress: 0,
    xp: 40,
    locked: true,
    route: '/gesture/fingerspelling',
    image: require('../../assets/images/img/senya_magnify.png'),
    lessons: 10,
    isCompleted: false,
    display_name: 'Fingerspelling',
  },
];

// UPDATE CATEGORIES to include the new ones
const CATEGORIES = [
  { id: 'all', title: 'All', icon: 'grid-outline' },
  { id: 'alphabet', title: 'Alphabet', icon: 'text-outline' },
  { id: 'numbers', title: 'Numbers', icon: 'grid-outline' }, // NEW
  { id: 'greetings', title: 'Greetings', icon: 'chatbubbles-outline' },
  { id: 'survival', title: 'Survival', icon: 'shield-outline' }, // NEW
  { id: 'practice', title: 'Practice', icon: 'hand-left-outline' },
];

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
                  <Ionicons name="lock-closed" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                  <Text style={styles.lockedText}>Locked</Text>
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
                <Ionicons name="lock-closed" size={26} color="#0F3172" />
              </View>
              <Text style={styles.lockedOverlayText}>Complete previous modules to unlock!</Text>
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

// Challenge Modal Component
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
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏆 Gesture Challenge</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#0F3172" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Choose your challenge mode and test your skills!
          </Text>

          {/* Master Mode Option */}
          <TouchableOpacity
            style={[styles.modeOption, styles.masterMode]}
            onPress={() => onSelectMode('master')}
            disabled={isLoading}
          >
            <View style={styles.modeIconContainer}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E8E']}
                style={styles.modeIconGradient}
              >
                <Ionicons name="trophy" size={28} color="#FFF" />
              </LinearGradient>
            </View>
            <View style={styles.modeContent}>
              <View style={styles.modeHeader}>
                <Text style={styles.modeTitle}>Master Mode</Text>
                <View style={styles.modeBadge}>
                  <Text style={styles.modeBadgeText}>Recommended</Text>
                </View>
              </View>
              <Text style={styles.modeDescription}>
                Focus on signs you need to improve. Master each sign one by one.
              </Text>
              <View style={styles.modeFeatures}>
                <View style={styles.modeFeature}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.modeFeatureText}>Personalized learning</Text>
                </View>
                <View style={styles.modeFeature}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.modeFeatureText}>Track your progress</Text>
                </View>
                <View style={styles.modeFeature}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.modeFeatureText}>Complete all signs</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" style={styles.modeArrow} />
          </TouchableOpacity>

          {/* Infinite Mode Option */}
          <TouchableOpacity
            style={[styles.modeOption, styles.infiniteMode]}
            onPress={() => onSelectMode('infinite')}
            disabled={isLoading}
          >
            <View style={styles.modeIconContainer}>
              <LinearGradient
                colors={['#4ECDC4', '#45B7AA']}
                style={styles.modeIconGradient}
              >
                <Ionicons name="infinite" size={28} color="#FFF" />
              </LinearGradient>
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Infinite Mode</Text>
              <Text style={styles.modeDescription}>
                Practice random signs continuously. No pressure, just practice!
              </Text>
              <View style={styles.modeFeatures}>
                <View style={styles.modeFeature}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.modeFeatureText}>Endless practice</Text>
                </View>
                <View style={styles.modeFeature}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.modeFeatureText}>Build muscle memory</Text>
                </View>
                <View style={styles.modeFeature}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.modeFeatureText}>Stop anytime</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" style={styles.modeArrow} />
          </TouchableOpacity>

          {isLoading && (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="small" color="#0F3172" />
              <Text style={styles.modalLoadingText}>Starting challenge...</Text>
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={styles.modalCancelButton}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


export default function GestureMain() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Fetch gesture progress from API
  const fetchGestureProgress = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.getGestureProgress();
      if (response && response.success) {
        setTotalXp(response.student?.total_xp || 0);

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

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchGestureProgress();
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
        // Show alert
        Alert.alert('No Modules', 'Complete at least one module to start a challenge!');
        return;
      }

      // Determine which module to use
      // Priority: alphabet → numbers → greetings → survival
      const priorityOrder = ['alphabet', 'numbers', 'greetings', 'survival'];
      let selectedModule = unlockedModules.find(m => m.category === 'alphabet');

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

      // Navigate to challenge screen
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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Let's Practice</Text>
              <Text style={styles.title}>Gestures</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.xpBadge}>
                <Ionicons name="star" size={16} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.xpBadgeText}>{totalXp} XP</Text>
              </View>
              <TouchableOpacity style={styles.settingsButton}>
                <Ionicons name="options-outline" size={22} color="#0F3172" />
              </TouchableOpacity>
            </View>
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

          <View style={styles.quickAccess}>
            <Text style={styles.sectionTitle}>Quick Start</Text>
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

              {/* First unlocked non-alphabet module */}
              {modules
                .filter(m => !m.locked && m.category !== 'alphabet')
                .slice(0, 1)
                .map((module) => (
                  <TouchableOpacity
                    key={module.id}
                    style={styles.quickAccessItem}
                    onPress={() => router.push(module.route as any)}
                  >
                    <View style={[styles.quickAccessIconContainer, { backgroundColor: `${module.color[0]}20` }]}>
                      <Ionicons name={module.icon as any} size={24} color={module.color[0]} />
                    </View>
                    <Text style={styles.quickAccessText}>{module.title}</Text>
                  </TouchableOpacity>
                ))}

              {/* Next locked module */}
              {modules
                .filter(m => m.locked)
                .slice(0, 1)
                .map((module) => (
                  <TouchableOpacity
                    key={module.id}
                    style={[styles.quickAccessItem, styles.quickAccessItemLocked]}
                    disabled
                  >
                    <View style={[styles.quickAccessIconContainer, { backgroundColor: 'rgba(156, 163, 175, 0.1)' }]}>
                      <Ionicons name={module.icon as any} size={24} color="#9CA3AF" />
                    </View>
                    <Text style={styles.quickAccessText}>{module.title}</Text>
                    <Ionicons name="lock-closed" size={12} color="#9CA3AF" style={styles.quickAccessLock} />
                  </TouchableOpacity>
                ))}
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
              <Text style={styles.tipTitle}>💡 Senya Says</Text>
              <Text style={styles.tipText}>
                {modules.some(m => m.isCompleted)
                  ? "Great job! Keep practicing to master all gestures! 🌟"
                  : "Complete Alphabet Part 1 to unlock more modules! Practice makes perfect! 🌟"}
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
    paddingTop: 16,
    paddingBottom: 8,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 49, 114, 0.15)',
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  xpBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F3172',
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 49, 114, 0.15)',
    shadowColor: '#0F3172',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoriesContainer: {
    marginVertical: 12,
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
    marginVertical: 12,
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
    marginTop: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
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
    marginVertical: 16,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(15, 49, 114, 0.1)',
    alignItems: 'center',
    gap: 14,
    marginBottom: 30,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F3172',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  masterMode: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  infiniteMode: {
    borderColor: '#4ECDC4',
    backgroundColor: '#F0FDFA',
  },
  modeIconContainer: {
    marginRight: 14,
  },
  modeIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeContent: {
    flex: 1,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  modeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F3172',
  },
  modeBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  modeBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0F3172',
    letterSpacing: 0.5,
  },
  modeDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 18,
  },
  modeFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modeFeatureText: {
    fontSize: 11,
    color: '#4B7BBB',
    fontWeight: '500',
  },
  modeArrow: {
    marginLeft: 4,
  },
  modalLoadingContainer: {
    marginTop: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  modalLoadingText: {
    fontSize: 14,
    color: '#4B7BBB',
    fontWeight: '600',
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '600',
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

});