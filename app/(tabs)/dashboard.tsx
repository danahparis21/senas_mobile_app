// app/(tabs)/dashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

// Types
// Types
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
  is_locked?: boolean; // 🔥 Add this optional property
  score?: number | null; // 🔥 Add this too for score tracking
  progress: {
    current_step: number;
    lesson_completed: boolean;
    quiz_completed: boolean;
    quiz_score: number | null;
  } | null;
}

const quickActions = [
  { label: "Multiple Choice", icon: require('../../assets/images/img/multiple_choice.png'), color: "#2563EB", screen: "/quiz/mc" },
  { label: "Drag & Drop", icon: require('../../assets/images/img/dragNdrop.png'), color: "#1D4ED8", screen: "/quiz/dnd" },
  { label: "Gesture Cam", icon: require('../../assets/images/img/camera.png'), color: "#0f3172", screen: "/(tabs)/gesture" },
  { label: "My Badges", icon: require('../../assets/images/img/badges.png'), color: "#fbbf24", screen: "/(tabs)/achievements" },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning!";
  if (h < 17) return "Good afternoon!";
  return "Good evening!";
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
  const [studentName, setStudentName] = useState<string>('Student');
  const [studentLevel, setStudentLevel] = useState<string>('Beginner');
  const [xp, setXp] = useState<number>(0);
  const [xpMax, setXpMax] = useState<number>(100);
  const [streak, setStreak] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [teacherLessons, setTeacherLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState<boolean>(true);
  const flatListRef = useRef<FlatList>(null);
  const [levelName, setLevelName] = useState<string>('Novice Signer');

  useEffect(() => {
    fetchStudentData();
    fetchTeacherLessons();
  }, []);

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
        // ✅ ADD THIS - Get level name from stored data if available
        if (student?.level_name) {
          setLevelName(student.level_name);
        }

        const levelXpMap: Record<number, number> = {
          1: 100,
          2: 250,
          3: 500,
          4: 800,
          5: 1200,
        };
        const maxXp = levelXpMap[student?.level || 1] || 100;
        setXpMax(maxXp);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherLessons = async (): Promise<void> => {
    try {
      setLoadingLessons(true);
      const response = await api.getAllLessons();

      console.log('📚 Dashboard - All lessons response:', JSON.stringify(response, null, 2));

      if (response.success) {
        const allLessons = response.lessons || [];
        setTeacherLessons(allLessons);

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
          // ✅ ADD THIS - Get the level name from the API
          if (response.student.level_name) {
            setLevelName(response.student.level_name);
          }

          const levelXpMap: Record<number, number> = {
            1: 100,
            2: 250,
            3: 500,
            4: 800,
            5: 1200,
          };
          const maxXp = levelXpMap[response.student.level || 1] || 100;
          setXpMax(maxXp);

          if (response.student.fsl_mastery_level) {
            setStudentLevel(response.student.fsl_mastery_level);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching teacher lessons:', error);
    } finally {
      setLoadingLessons(false);
    }
  };

  const getLessonStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#f59e0b';
      default: return '#2563EB';
    }
  };

  const getLessonStatusText = (status: string): string => {
    switch (status) {
      case 'completed': return '✅ Completed';
      case 'in_progress': return '⏳ In Progress';
      default: return '📖 Pending';
    }
  };

  const renderTeacherLesson = ({ item }: { item: Lesson }) => {
    const progress = item.progress;
    const progressPercent = progress && item.total_steps > 0
      ? Math.round((progress.current_step / item.total_steps) * 100)
      : 0;

    const statusColor = getLessonStatusColor(item.status);
    const isCompleted = item.status === 'completed' || progress?.lesson_completed;
    const isPerfect = progress?.quiz_score === 100;

    return (
      <Pressable
        style={styles.teacherLessonCard}
        onPress={() => router.push(`/lesson/${item.lesson_id}`)}
      >
        <View style={styles.tlMainContent}>
          <View style={styles.tlIconBox}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </Svg>
          </View>

          <View style={styles.tlTextContent}>
            <View style={styles.tlHeaderRow}>
              <View style={styles.tlBadgeRow}>
                <View style={[styles.tlDifficultyTag, { backgroundColor: '#F1F5F9' }]}>
                  <Text style={styles.tlDifficultyText}>
                    {item.difficulty ? item.difficulty.toUpperCase() : 'LESSON'}
                  </Text>
                </View>
                {item.has_quiz && (
                  <View style={[styles.tlDifficultyTag, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.tlDifficultyText, { color: '#059669' }]}>📝 QUIZ</Text>
                  </View>
                )}
              </View>
              {progress?.quiz_completed && progress?.quiz_score !== null ? (
                <View style={[styles.tlMiniScoreBadge, { backgroundColor: isPerfect ? '#FEF3C7' : '#D1FAE5' }]}>
                  <Text style={[styles.tlMiniScoreText, { color: isPerfect ? '#D97706' : '#059669' }]}>
                    {isPerfect ? '🌟 ' : ''}{progress.quiz_score}%
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
        <ActivityIndicator size="large" color="#1E4F8A" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }

  // const getLevelDisplay = (levelNum: number): string => {
  //   const levelNames: Record<number, string> = {
  //     1: 'Novice Signer',
  //     2: 'Beginner Signer',
  //     3: 'Intermediate Signer',
  //     4: 'Advanced Signer',
  //     5: 'Expert Signer',
  //   };
  //   return levelNames[levelNum] || 'Novice Signer';
  // };


  // Get the next recommended lesson (first unlocked, not-completed lesson)
  const nextRecommendedLesson = teacherLessons
    .filter(lesson => {
      const isLocked = lesson.is_locked === true || lesson.status === 'locked';
      const isCompleted = lesson.status === 'completed' || lesson.progress?.lesson_completed;
      return !isLocked && !isCompleted;
    })


  const carouselLessons = teacherLessons
    .filter(lesson => {
      const isLocked = lesson.is_locked === true || lesson.status === 'locked';
      if (isLocked) return false;

      // Show if not completed
      const isCompleted = lesson.status === 'completed' || lesson.progress?.lesson_completed;
      if (!isCompleted) return true;

      // Show if completed but not perfect (score < 100)
      const score = lesson.score ?? lesson.progress?.quiz_score ?? 0;
      return score < 100;
    })
    .sort((a, b) => {
      // Sort: Not completed first, then completed but not perfect
      const aCompleted = a.status === 'completed' || a.progress?.lesson_completed;
      const bCompleted = b.status === 'completed' || b.progress?.lesson_completed;

      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && !bCompleted) return 1;
      return 0;
    });
  // Get completed lessons for "Continue Learning"
  const completedLessons = teacherLessons
    .filter(lesson => lesson.status === 'completed' || lesson.progress?.lesson_completed)
    .slice(0, 3);

  // Use completed lessons for Continue Learning
  const continueLearningLessons = completedLessons;
  const sectionTitle = continueLearningLessons.length > 0 ? 'Continue Learning' : 'Completed Lessons';

  // Debug logging
  console.log('📚 Teacher Lessons total:', teacherLessons.length);
  console.log('📚 Next Recommended Lesson:', nextRecommendedLesson.length);
  console.log('📚 Continue Learning (completed):', continueLearningLessons.length);
  console.log('📚 Carousel Lessons:', carouselLessons.length);

  // Get unlocked lessons (not completed, not locked)
  const unlockedLessons = teacherLessons.filter(lesson => {
    const isLocked = lesson.is_locked === true || lesson.status === 'locked';
    const isCompleted = lesson.status === 'completed' || lesson.progress?.lesson_completed;
    return !isLocked && !isCompleted;
  });

  // Show continue learning if available, otherwise show completed
  const displayLessons = continueLearningLessons.length > 0 ? continueLearningLessons : completedLessons;

  // Debug logging
  console.log('📚 Teacher Lessons total:', teacherLessons.length);
  console.log('📚 Continue Learning:', continueLearningLessons.length);
  console.log('📚 Completed Lessons:', completedLessons.length);
  console.log('📚 Display Lessons:', displayLessons.length);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.logoText}>SEÑAS</Text>
          <View style={styles.topBarRight}>
            <View style={styles.streakBadge}>
              <Svg width="15" height="15" viewBox="0 0 24 24" fill="#fb923c">
                <Path d="M12 2c0 6-8 8-8 14a8 8 0 0016 0C20 10 12 8 12 2z" />
              </Svg>
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          </View>
        </View>

        {/* Hero Card */}
        <View style={styles.section}>
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.heroTextContent}>
                <Text style={styles.greetingText}>{getGreeting()}</Text>
                <Text style={styles.nameText}>Hello, {studentName}!</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.smallBadgeBlue}>
                    <Svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24">
                      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </Svg>
                    <Text style={styles.smallBadgeTextBlue}>{studentLevel}</Text>
                  </View>
                  <View style={styles.smallBadgeOrange}>
                    <Svg width="11" height="11" viewBox="0 0 24 24" fill="#fb923c">
                      <Path d="M12 2c0 6-8 8-8 14a8 8 0 0016 0C20 10 12 8 12 2z" />
                    </Svg>
                    <Text style={styles.smallBadgeTextOrange}>{streak} day streak</Text>
                  </View>
                </View>
              </View>
              <Image source={require('../../assets/images/img/senya_blue.png')} style={styles.senyaHero} contentFit="contain" />
            </View>

            <View style={styles.divider} />
            <View style={styles.levelSection}>
              <View style={styles.levelIconBox}>
                <Image source={require('../../assets/images/img/level_1.png')} style={styles.levelIcon} contentFit="contain" />
              </View>
              <View style={styles.levelInfo}>
                <View style={styles.levelHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.levelTag}>
                      <Text style={styles.levelTagText}>LEVEL {level}</Text>
                    </View>
                    <Text style={styles.levelTitle}>{levelName}</Text>
                  </View>
                  <Text style={styles.xpPctText}>{Math.round(xpPct)}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${xpPct}%` }]} />
                </View>
                <Text style={styles.xpStatusText}>{xp} / {xpMax} XP · {Math.max(0, xpMax - xp)} XP to next level</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Uploaded by Teacher Section - Show Next Recommended Lesson */}
        {!loadingLessons && carouselLessons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f3172" strokeWidth="2">
                  <Path d="M12 6v6l4 2" />
                  <Circle cx="12" cy="12" r="10" />
                </Svg>
                <Text style={styles.sectionTitle}> Your Lessons</Text>
              </View>
              <Pressable onPress={() => router.push('/lessons')}>
                <Text style={styles.seeAllText}>See All →</Text>
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

        {/* Daily Challenge */}
        <View style={styles.section}>
          <Pressable style={styles.dailyCard} onPress={() => router.push('/assessment')}>
            <View style={styles.dailyHeader}>
              <View style={styles.dailyIconBox}>
                <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
                  <Circle cx="12" cy="12" r="6" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
                  <Circle cx="12" cy="12" r="2" fill="#fff" />
                </Svg>
              </View>
              <Text style={styles.dailyLabel}>DAILY CHALLENGE</Text>
              <View style={styles.dailyXpBadge}>
                <Text style={styles.dailyXpText}>+50 XP</Text>
              </View>
            </View>
            <View style={styles.dailyContent}>
              <View style={styles.dailyTextContent}>
                <Text style={styles.dailyTitle}>Practice Your Signs</Text>
                <Text style={styles.dailyDesc}>Complete a lesson today to earn your daily streak bonus.</Text>
                <View style={styles.dailyDots}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <View key={n} style={[styles.dailyDot, { backgroundColor: n <= 2 ? '#fbbf24' : 'rgba(255,255,255,0.2)' }]} />
                  ))}
                </View>
                <Text style={styles.dailyStatusText}>Practice daily to build your streak!</Text>
              </View>
              <View style={styles.dailyActionBox}>
                <View style={styles.dailyStartBtn}>
                  <Text style={styles.dailyStartText}>Start</Text>
                  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78350f" strokeWidth="2.5">
                    <Line x1="5" y1="12" x2="19" y2="12" /><Polyline points="12 5 19 12 12 19" />
                  </Svg>
                </View>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Continue Learning Section - RESTORED with dynamic data */}
        {displayLessons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{sectionTitle}</Text>
              <Pressable onPress={() => router.push('/lessons')}>
                <Text style={styles.seeAllText}>See All →</Text>
              </Pressable>
            </View>

            <View style={styles.lessonsList}>
              {displayLessons.map((lesson) => {
                const progress = lesson.progress;
                const progressPercent = progress && lesson.total_steps > 0
                  ? Math.round((progress.current_step / lesson.total_steps) * 100)
                  : 0;
                const statusTag = getStatusTag(lesson.status, progress);
                const isLocked = statusTag === 'Pending' && progressPercent === 0;
                const isCompleted = statusTag === 'Completed';
                const icon = getLessonIcon(lesson.lesson_type);

                return (
                  <Pressable
                    key={lesson.lesson_id}
                    style={[styles.lessonCard, isLocked && { opacity: 0.5 }]}
                    disabled={isLocked}
                    onPress={() => router.push(`/lesson/${lesson.lesson_id}`)}
                  >
                    <View style={[styles.lessonIconBox, { backgroundColor: isLocked ? 'rgba(15,49,114,0.06)' : 'rgba(37,99,235,0.10)' }]}>
                      {isCompleted ? (
                        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5">
                          <Polyline points="20 6 9 17 4 12" />
                        </Svg>
                      ) : isLocked ? (
                        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                          <Rect x="3" y="11" width="18" height="11" rx="2" />
                          <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </Svg>
                      ) : icon ? (
                        <Image source={icon} style={styles.lessonIcon} contentFit="contain" />
                      ) : (
                        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                          <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </Svg>
                      )}
                    </View>
                    <View style={styles.lessonInfo}>
                      <View style={styles.lessonRow}>
                        <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.title}</Text>
                        <View style={[styles.lessonTag, {
                          backgroundColor: isCompleted ? 'rgba(37,99,235,0.12)' :
                            isLocked ? 'rgba(15,49,114,0.07)' :
                              'rgba(251,191,36,0.18)'
                        }]}>
                          <Text style={[styles.lessonTagText, {
                            color: isCompleted ? '#1848c8' :
                              isLocked ? '#6B7280' :
                                '#92400E'
                          }]}>
                            {statusTag}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.lessonProgressTrack}>
                        <View style={[styles.lessonProgressFill, {
                          width: `${Math.min(progressPercent, 100)}%`,
                          backgroundColor: isCompleted ? '#2563EB' : '#f59e0b'
                        }]} />
                      </View>
                      <Text style={styles.lessonProgressText}>{Math.min(progressPercent, 100)}% complete</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}



        {/* Quick Practice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Practice</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((q, i) => (
              <Pressable key={i} style={styles.quickCard} onPress={() => router.push(q.screen as any)}>
                <View style={styles.quickIconBox}>
                  <Image source={q.icon} style={styles.quickIcon} contentFit="contain" />
                </View>
                <Text style={styles.quickText}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eaf5fd' },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#666' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  logoText: { color: '#0f3172', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakBadge: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  streakText: { color: '#0f3172', fontSize: 13, fontWeight: '700' },
  section: { paddingHorizontal: 16, marginBottom: 14 },
  heroCard: { backgroundColor: 'white', borderRadius: 24, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 20, elevation: 2, borderWidth: 1, borderColor: '#EAECF0' },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between' },
  heroTextContent: { flex: 1, paddingRight: 8 },
  greetingText: { color: '#4b7bbb', fontSize: 13, fontWeight: '600' },
  nameText: { color: '#0f3172', fontSize: 26, fontWeight: '800', marginTop: 2, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  smallBadgeBlue: { backgroundColor: 'rgba(15,49,114,0.10)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  smallBadgeTextBlue: { fontSize: 11, fontWeight: '700', color: '#0f3172' },
  smallBadgeOrange: { backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  smallBadgeTextOrange: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  senyaHero: { width: 100, height: 100, marginTop: -6 },
  divider: { height: 1, backgroundColor: 'rgba(15,49,114,0.08)', marginVertical: 14 },
  levelSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(251,191,36,0.15)', alignItems: 'center', justifyContent: 'center' },
  levelIcon: { width: 36, height: 36 },
  levelInfo: { flex: 1 },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  levelTag: { backgroundColor: '#1848c8', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8, marginRight: 6 },
  levelTagText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  levelTitle: { fontSize: 14, fontWeight: '800', color: '#0f3172' },
  xpPctText: { fontSize: 11, fontWeight: '700', color: '#4b7bbb' },
  progressTrack: { backgroundColor: 'rgba(15,49,114,0.12)', borderRadius: 99, height: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 99 },
  xpStatusText: { fontSize: 10, color: '#4b7bbb', fontWeight: '600', marginTop: 4 },

  dailyCard: { backgroundColor: '#2563EB', borderRadius: 20, padding: 20, shadowColor: '#0f3172', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 24, elevation: 8 },
  dailyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dailyIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  dailyLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 1 },
  dailyXpBadge: { marginLeft: 'auto', backgroundColor: 'rgba(251,191,36,0.25)', borderRadius: 99, paddingVertical: 3, paddingHorizontal: 10 },
  dailyXpText: { fontSize: 11, fontWeight: '800', color: '#fde68a' },
  dailyContent: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  dailyTextContent: { flex: 1, paddingRight: 12 },
  dailyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 },
  dailyDesc: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500', lineHeight: 18 },
  dailyDots: { flexDirection: 'row', gap: 5, marginTop: 12 },
  dailyDot: { width: 28, height: 6, borderRadius: 99 },
  dailyStatusText: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 5 },
  dailyActionBox: { alignItems: 'center', gap: 10 },
  dailyStartBtn: { backgroundColor: '#fbbf24', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dailyStartText: { color: '#78350f', fontWeight: '800', fontSize: 14 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f3172' },
  seeAllText: { color: '#2563EB', fontSize: 13, fontWeight: '700', paddingVertical: 4 },

  // Continue Learning styles
  lessonsList: { gap: 10 },
  lessonCard: { backgroundColor: 'rgba(255,255,255,0.62)', borderColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lessonIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lessonIcon: { width: 36, height: 36 },
  lessonInfo: { flex: 1 },
  lessonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  lessonTitle: { fontSize: 14, fontWeight: '700', color: '#0f3172', flex: 1 },
  lessonTag: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 99 },
  lessonTagText: { fontSize: 10, fontWeight: '700' },
  lessonProgressTrack: { backgroundColor: 'rgba(15,49,114,0.10)', borderRadius: 99, height: 5, marginTop: 7, overflow: 'hidden' },
  lessonProgressFill: { height: '100%', borderRadius: 99 },
  lessonProgressText: { fontSize: 10, color: '#4b7bbb', marginTop: 3, fontWeight: '600' },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.62)', borderColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', gap: 7 },
  quickIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(37,99,235,0.10)', alignItems: 'center', justifyContent: 'center' },
  quickIcon: { width: 40, height: 40 },
  quickText: { fontSize: 12, fontWeight: '700', color: '#0f3172' },

  // Teacher Lesson Cards
  teacherLessonsCarousel: {
    paddingRight: 16,
    gap: 12,
  },
  teacherLessonCard: {
    width: screenWidth * 0.78,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  tlMainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  tlIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(37,99,235,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlTextContent: {
    flex: 1,
  },
  tlHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tlBadgeRow: {
    flexDirection: 'row',
    gap: 5,
  },
  tlDifficultyTag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tlDifficultyText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  tlMiniScoreBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tlMiniScoreText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tlDateText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tlTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f3172',
    lineHeight: 18,
  },
  tlProgressSection: {
    marginBottom: 14,
  },
  tlProgressTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 99,
    overflow: 'hidden',
  },
  tlProgressFill: {
    height: '100%',
    borderRadius: 99,
  },
  tlProgressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tlProgressInfoText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
  tlButtonSection: {
    flexDirection: 'row',
    gap: 8,
  },
  tlCardActionBtn: {
    flex: 1.3,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tlCardActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  tlCardHistoryBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlCardHistoryBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },

  emptyLessons: {
    width: screenWidth * 0.75,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#EAECF0',
    borderStyle: 'dashed',
  },
  emptyLessonsText: {
    fontSize: 14,
    color: '#9AA1B0',
    fontWeight: '600',
  },
});