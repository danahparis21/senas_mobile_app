import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable,
  ScrollView, Modal, ActivityIndicator, Animated, Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Polyline, Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────
interface Option {
  option_id: number;
  option_text: string;
  is_correct: boolean;
}
interface Question {
  question_id: number;
  question_number: number;
  question_type: string;
  question_text: string;
  media_url: string | null;
  points: number;
  options: Option[];
}
interface Quiz {
  quiz_id: number;
  title: string;
  description: string;
  total_points: number;
  passing_score: number;
  questions: Question[];
}
interface Content {
  content_id: number;
  step_number: number;
  content_type: string;
  title: string;
  content_text: string;
  media_url: string | null;
  gesture_name: string | null;
}
interface Lesson {
  lesson_id: number;
  title: string;
  description: string;
  lesson_type: string;
  difficulty: string;
  status: string;
  contents: Content[];
  quiz: Quiz | null;
  total_steps: number;
  assignment_status: string;
  progress: {
    current_step: number;
    lesson_completed: boolean;
    quiz_completed: boolean;
    quiz_score: number | null;
  } | null;
}
interface QuizAnswer {
  question_id: number;
  selected_option_id: number | null;
  is_correct: boolean;
}

// ─── SVG Icon Components ─────────────────────────────────────────────────────
function StarIcon({ size = 18, color = '#FBBF24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

function TrophyIcon({ size = 28, color = '#FBBF24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" />
      <Path d="M6 2v7a6 6 0 0 0 12 0V2" />
      <Path d="M12 15v7" />
      <Path d="M8 22h8" />
    </Svg>
  );
}

function ZapIcon({ size = 18, color = '#D97706' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}

function AwardIcon({ size = 22, color = '#2563EB' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Circle cx="12" cy="8" r="6" />
      <Path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </Svg>
  );
}

function FlameIcon({ size = 18, color = '#F97316' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2c0 6-8 8-8 14a8 8 0 0016 0C20 10 12 8 12 2z" />
    </Svg>
  );
}

function RefreshIcon({ size = 16, color = '#6B7280' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M23 4v6h-6" />
      <Path d="M1 20v-6h6" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Svg>
  );
}

function HomeIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
}

function HandIcon({ size = 18, color = '#92400E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
      <Path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
      <Path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
      <Path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </Svg>
  );
}

function ClipboardIcon({ size = 32, color = '#2563EB' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </Svg>
  );
}

function BarChartIcon({ size = 18, color = '#2563EB' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Line x1="18" y1="20" x2="18" y2="10" />
      <Line x1="12" y1="20" x2="12" y2="4" />
      <Line x1="6" y1="20" x2="6" y2="14" />
      <Line x1="2" y1="20" x2="22" y2="20" />
    </Svg>
  );
}

function CheckCircleIcon({ size = 22, color = '#059669' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="8 12 11 15 16 9" />
    </Svg>
  );
}

function XCircleIcon({ size = 22, color = '#DC2626' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Circle cx="12" cy="12" r="10" />
      <Line x1="15" y1="9" x2="9" y2="15" />
      <Line x1="9" y1="9" x2="15" y2="15" />
    </Svg>
  );
}

// ─── Animated Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ percentage, passed }: { percentage: number; passed: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, []);

  const ringColor = passed ? '#10B981' : '#F87171';
  const ringBg = passed ? 'rgba(16,185,129,0.12)' : 'rgba(248,113,113,0.12)';

  return (
    <View style={scoreRingStyles.container}>
      <View style={[scoreRingStyles.wrapper, { backgroundColor: ringBg }]}>
        <Animated.View
          style={[
            scoreRingStyles.pulse,
            {
              backgroundColor: ringColor,
              opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.08, 0] }),
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.4] }) }],
            },
          ]}
        />
        {/* Circular SVG Progress Ring */}
        <Svg width="120" height="120" viewBox="0 0 120 120" style={scoreRingStyles.svgRing}>
          <Circle
            cx="60"
            cy="60"
            r="50"
            stroke="#E5E7EB"
            strokeWidth="8"
            fill="none"
          />
          <Circle
            cx="60"
            cy="60"
            r="50"
            stroke={ringColor}
            strokeWidth="8"
            fill="none"
            strokeDasharray="314.159"
            strokeDashoffset={314.159 - (314.159 * percentage) / 100}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </Svg>
        <View style={scoreRingStyles.content}>
          <Text style={[scoreRingStyles.pctText, { color: ringColor }]}>{percentage}%</Text>
          <Text style={scoreRingStyles.label}>{passed ? 'Passed!' : 'Keep Going!'}</Text>
        </View>
      </View>
    </View>
  );
}

const scoreRingStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  wrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  svgRing: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 2,
  },
});

// ─── Attempt Card ─────────────────────────────────────────────────────────────
function AttemptCard({ attempt, index, total }: { attempt: any; index: number; total: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const passed = attempt.percentage >= 60;
  const isPerfect = attempt.percentage === 100;
  const attemptNumber = total - index;

  const barColor = isPerfect ? '#FBBF24' : passed ? '#10B981' : '#F87171';
  const bgColor = isPerfect ? '#FEF3C7' : passed ? '#ECFDF5' : '#FEF2F2';
  const borderColor = isPerfect ? '#F59E0B' : passed ? '#6EE7B7' : '#FCA5A5';

  return (
    <Animated.View
      style={[
        attemptCardStyles.card,
        { backgroundColor: bgColor, borderColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={attemptCardStyles.left}>
        <View style={[attemptCardStyles.numBadge, { backgroundColor: barColor }]}>
          <Text style={attemptCardStyles.numText}>#{attemptNumber}</Text>
        </View>
        <View>
          <Text style={attemptCardStyles.dateText}>
            {new Date(attempt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
          {attempt.xp_earned > 0 && (
            <Text style={attemptCardStyles.xpText}>+{attempt.xp_earned} XP earned</Text>
          )}
        </View>
      </View>

      <View style={attemptCardStyles.right}>
        <View style={[attemptCardStyles.scorePill, { backgroundColor: barColor }]}>
          <Text style={attemptCardStyles.scoreText}>{attempt.percentage}%</Text>
        </View>
        <Text style={[attemptCardStyles.passedText, { color: barColor }]}>
          {isPerfect ? '⭐ Perfect' : passed ? '✅ Pass' : '❌ Fail'}
        </Text>
      </View>
    </Animated.View>
  );
}

const attemptCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  dateText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  xpText: { fontSize: 10, fontWeight: '600', color: '#D97706', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  scorePill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  scoreText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  passedText: { fontSize: 10, fontWeight: '700' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LessonViewer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<{
    score: number; total: number; percentage: number;
    xpEarned: number; totalXp: number; level: number; streakDays: number;
  } | null>(null);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [attemptHistory, setAttemptHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);
  const confettiRef = useRef<any>(null);
  const resultsFadeAnim = useRef(new Animated.Value(0)).current;
  const resultsScaleAnim = useRef(new Animated.Value(0.85)).current;

  const fetchAttemptHistory = async () => {
    try {
      const response = await api.getAttempts(id);
      if (response.success) setAttemptHistory(response.attempts);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    }
  };

  const fetchLesson = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.getLessonById(id);
      if (response.success) {
        setLesson(response.lesson);
        if (response.lesson.progress) {
          setCurrentSlide(response.lesson.progress.current_step || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
      alert('Failed to load lesson. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLesson();
    fetchAttemptHistory();
  }, [id]);

  // Animate results card in and fire confetti
  useEffect(() => {
    if (quizSubmitted && quizResult) {
      Animated.parallel([
        Animated.timing(resultsFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(resultsScaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start();

      if (quizResult.percentage >= 60 && !confettiFired) {
        setTimeout(() => {
          confettiRef.current?.start();
          setConfettiFired(true);
        }, 400);
      }
    }
  }, [quizSubmitted, quizResult]);

  const updateProgress = async (step: number, completed: boolean = false): Promise<void> => {
    try {
      await api.updateLessonProgress(id, { current_step: step, lesson_completed: completed });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleSlideChange = async (newSlide: number): Promise<void> => {
    setCurrentSlide(newSlide);
    if (lesson && newSlide < lesson.contents.length) {
      try { await api.awardSlideXp(id, newSlide); }
      catch (error) { console.error('Error awarding slide XP:', error); }
    }
    await updateProgress(newSlide);
  };

  const handleQuizAnswer = (questionIndex: number, optionIndex: number): void => {
    setQuizAnswers((prev: Record<number, number>) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const submitQuiz = async (): Promise<void> => {
    if (!lesson || !lesson.quiz) return;
    const questions = lesson.quiz.questions;
    let correct = 0;
    const answers: QuizAnswer[] = [];

    questions.forEach((q: Question, index: number) => {
      const selected = quizAnswers[index];
      const isCorrect = selected !== undefined && q.options[selected]?.is_correct === true;
      if (isCorrect) correct++;
      answers.push({
        question_id: q.question_id,
        selected_option_id: selected !== undefined ? q.options[selected].option_id : null,
        is_correct: isCorrect,
      });
    });

    const totalPoints = questions.length;
    const score = correct;
    const percentage = Math.round((score / totalPoints) * 100);

    try {
      const response = await api.submitQuizAttempt(id, {
        quiz_id: lesson.quiz.quiz_id,
        answers,
        score,
        total_points: totalPoints,
        percentage,
      });

      if (response.success) {
        setQuizResult({
          score,
          total: totalPoints,
          percentage,
          xpEarned: response.xp_earned || 0,
          totalXp: response.total_xp || 0,
          level: response.level || 1,
          streakDays: response.streak_days || 0,
        });
        setQuizSubmitted(true);
        await fetchAttemptHistory();

        await api.updateLessonProgress(id, {
          current_step: lesson.total_steps,
          lesson_completed: true,
          quiz_completed: true,
          quiz_score: percentage,
        });
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Failed to submit quiz. Please try again.');
    }
  };

  // ─── Loading / Error ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingInner}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Lesson not found</Text>
        <Pressable onPress={() => router.back()} style={styles.errorBackBtn}>
          <Text style={styles.errorBackBtnText}>← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const totalSlides = lesson.total_steps;
  const isQuizSlide = currentSlide >= lesson.contents.length;
  const progressPercent = Math.round(((currentSlide + 1) / totalSlides) * 100);
  const passed = (quizResult?.percentage || 0) >= 60;
  const isPerfect = (quizResult?.percentage || 0) === 100;

  return (
    <SafeAreaView style={styles.container}>

      {/* Confetti Layer */}
      {passed && (
        <ConfettiCannon
          ref={confettiRef}
          count={160}
          origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
          autoStart={false}
          fadeOut
          explosionSpeed={500}
          fallSpeed={2800}
          colors={['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6FC8', '#845EC2']}
        />
      )}

      {/* ─── Top Bar ─────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Pressable onPress={() => setShowExitModal(true)} style={styles.backBtn}>
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f3172" strokeWidth="2.5">
            <Path d="M19 12H5" /><Path d="M12 19l-7-7 7-7" />
          </Svg>
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>{lesson.title}</Text>
          {/* Progress Bar */}
          <View style={styles.topProgressTrack}>
            <View style={[styles.topProgressFill, { width: `${Math.min(progressPercent, 100)}%` }]} />
          </View>
        </View>

        <View style={styles.slideBadge}>
          <Text style={styles.slideBadgeText}>{Math.min(currentSlide + 1, totalSlides)}/{totalSlides}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ─── Content Slide ─────────────────────────────────────────────── */}
        {!isQuizSlide ? (
          <View style={styles.slideCard}>
            <View style={styles.slideTopRow}>
              <View style={styles.stepPill}>
                <Text style={styles.stepPillText}>Step {currentSlide + 1}</Text>
              </View>
              <View style={styles.typePill}>
                <Text style={styles.typePillText}>
                  {lesson.contents[currentSlide]?.content_type?.toUpperCase() || 'TEXT'}
                </Text>
              </View>
            </View>

            <Text style={styles.slideTitle}>{lesson.contents[currentSlide]?.title || ''}</Text>

            {lesson.contents[currentSlide]?.media_url && (
              <View style={styles.mediaWrapper}>
                <Image
                  source={{ uri: lesson.contents[currentSlide]?.media_url }}
                  style={styles.slideMedia}
                  contentFit="contain"
                />
              </View>
            )}

            <Text style={styles.slideContent}>{lesson.contents[currentSlide]?.content_text || ''}</Text>

            {lesson.contents[currentSlide]?.gesture_name && (
              <View style={styles.gestureHint}>
                <HandIcon size={18} color="#92400E" />
                <Text style={styles.gestureText}>Gesture: {lesson.contents[currentSlide]?.gesture_name}</Text>
              </View>
            )}
          </View>

        ) : (
          // ─── Quiz Slide ─────────────────────────────────────────────────
          <View style={styles.quizContainer}>
            {!quizSubmitted ? (
              <>
                <View style={styles.quizHeader}>
                  <View style={styles.quizIconBox}>
                    <ClipboardIcon size={32} color="#2563EB" />
                  </View>
                  <Text style={styles.quizTitle}>{lesson.quiz?.title || 'Quiz Time!'}</Text>
                  <Text style={styles.quizDescription}>{lesson.quiz?.description || ''}</Text>
                </View>

                {lesson.quiz?.questions.map((q: Question, qIndex: number) => (
                  <View key={qIndex} style={styles.questionCard}>
                    <View style={styles.questionNumRow}>
                      <View style={styles.questionNumBadge}>
                        <Text style={styles.questionNumText}>{qIndex + 1}</Text>
                      </View>
                      <Text style={styles.questionNumLabel}>of {lesson.quiz?.questions.length}</Text>
                    </View>

                    <Text style={styles.questionText}>{q.question_text}</Text>

                    {q.media_url && (
                      <Image source={{ uri: q.media_url }} style={styles.questionMedia} contentFit="contain" />
                    )}

                    <View style={styles.optionsContainer}>
                      {q.options.map((opt: Option, oIndex: number) => {
                        const selected = quizAnswers[qIndex] === oIndex;
                        return (
                          <Pressable
                            key={oIndex}
                            style={[styles.optionButton, selected && styles.optionSelected]}
                            onPress={() => handleQuizAnswer(qIndex, oIndex)}
                          >
                            <View style={[styles.optionLetter, selected && styles.optionLetterSelected]}>
                              <Text style={[styles.optionLetterText, selected && styles.optionLetterTextSelected]}>
                                {String.fromCharCode(65 + oIndex)}
                              </Text>
                            </View>
                            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                              {opt.option_text}
                            </Text>
                            {selected && (
                              <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5">
                                <Polyline points="20 6 9 17 4 12" />
                              </Svg>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}

                <Pressable
                  style={[
                    styles.submitButton,
                    Object.keys(quizAnswers).length < (lesson.quiz?.questions.length || 0) && styles.submitDisabled,
                  ]}
                  onPress={submitQuiz}
                  disabled={Object.keys(quizAnswers).length < (lesson.quiz?.questions.length || 0)}
                >
                  <Text style={styles.submitButtonText}>Submit Quiz</Text>
                </Pressable>

                <Text style={styles.answerCount}>
                  {Object.keys(quizAnswers).length}/{lesson.quiz?.questions.length || 0} answered
                </Text>
              </>
            ) : (
              // ─── Quiz Results ─────────────────────────────────────────
              <Animated.View
                style={[
                  styles.resultsCard,
                  {
                    opacity: resultsFadeAnim,
                    transform: [{ scale: resultsScaleAnim }],
                  },
                ]}
              >
                {/* Trophy / Result Header */}
                <View style={[styles.resultHeaderBanner, { backgroundColor: passed ? '#ECFDF5' : '#FEF2F2' }]}>
                  <View style={[styles.resultHeaderIconBox, { backgroundColor: passed ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.10)' }]}>
                    {isPerfect ? (
                      <StarIcon size={36} color="#D97706" />
                    ) : passed ? (
                      <TrophyIcon size={36} color="#059669" />
                    ) : (
                      <XCircleIcon size={36} color="#DC2626" />
                    )}
                  </View>
                  <Text style={[styles.resultHeaderTitle, { color: passed ? '#065F46' : '#991B1B' }]}>
                    {isPerfect ? 'Perfect Score!' : passed ? 'Amazing Work!' : 'Keep Practicing!'}
                  </Text>
                  <Text style={[styles.resultHeaderSub, { color: passed ? '#059669' : '#DC2626' }]}>
                    {isPerfect
                      ? 'You got every single question right!'
                      : passed
                        ? 'You passed the quiz, great job!'
                        : "Don't give up — try again and you'll ace it!"}
                  </Text>
                </View>

                {/* Score Ring - Now perfectly centered */}
                <ScoreRing percentage={quizResult?.percentage || 0} passed={passed} />

                {/* Score Number Display */}
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreNum}>{quizResult?.score || 0}</Text>
                  <Text style={styles.scoreSlash}>/</Text>
                  <Text style={styles.scoreTotal}>{quizResult?.total || 0}</Text>
                  <Text style={styles.scoreLabel}>{' '}correct</Text>
                </View>

                {/* XP Earned Banner */}
                <View style={styles.xpBanner}>
                  <View style={styles.xpBannerLeft}>
                    <View style={styles.xpBannerIconBox}>
                      <ZapIcon size={15} color="#D97706" />
                    </View>
                    <Text style={styles.xpBannerLabel}>XP Earned</Text>
                  </View>
                  <Text style={styles.xpBannerValue}>+{quizResult?.xpEarned || 0} XP</Text>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <View style={styles.statIconBox}>
                      <ZapIcon size={14} color="#2563EB" />
                    </View>
                    <Text style={styles.statValue}>{quizResult?.totalXp || 0}</Text>
                    <Text style={styles.statLabel}>Total XP</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <View style={styles.statIconBox}>
                      <AwardIcon size={14} color="#059669" />
                    </View>
                    <Text style={styles.statValue}>Lvl {quizResult?.level || 1}</Text>
                    <Text style={styles.statLabel}>Level</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <View style={styles.statIconBox}>
                      <FlameIcon size={14} color="#F97316" />
                    </View>
                    <Text style={styles.statValue}>{quizResult?.streakDays || 0}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <Pressable style={styles.finishBtn} onPress={() => router.push('/(tabs)/dashboard')}>
                  <HomeIcon size={16} color="#fff" />
                  <Text style={styles.finishBtnText}>Go to Dashboard</Text>
                </Pressable>

                <Pressable style={styles.retryBtn} onPress={() => {
                  setQuizSubmitted(false);
                  setQuizAnswers({});
                  setQuizResult(null);
                  setConfettiFired(false);
                  resultsFadeAnim.setValue(0);
                  resultsScaleAnim.setValue(0.85);
                }}>
                  <RefreshIcon size={15} color="#2563EB" />
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </Pressable>

                {/* ─── Attempt History Section ──────────────────────────── */}
                <Pressable
                  style={styles.historyToggleBtn}
                  onPress={() => setShowHistory(!showHistory)}
                >
                  <View style={styles.historyToggleLeft}>
                    <BarChartIcon size={16} color="#2563EB" />
                    <Text style={styles.historyToggleText}>Attempt History</Text>
                    <View style={styles.historyCountBadge}>
                      <Text style={styles.historyCountText}>{attemptHistory.length}</Text>
                    </View>
                  </View>
                  <Svg
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="#2563EB" strokeWidth="2.5"
                  >
                    {showHistory
                      ? <Path d="M18 15l-6-6-6 6" />
                      : <Path d="M6 9l6 6 6-6" />}
                  </Svg>
                </Pressable>

                {showHistory && (
                  <View style={styles.historyList}>
                    {attemptHistory.length === 0 ? (
                      <Text style={styles.historyEmpty}>No previous attempts found.</Text>
                    ) : (
                      attemptHistory.map((attempt, index) => (
                        <AttemptCard
                          key={index}
                          attempt={attempt}
                          index={index}
                          total={attemptHistory.length}
                        />
                      ))
                    )}

                    {/* History Summary Stats */}
                    {attemptHistory.length > 1 && (
                      <View style={styles.historySummary}>
                        <View style={styles.historySummaryItem}>
                          <Text style={styles.historySummaryValue}>
                            {Math.round(attemptHistory.reduce((a, b) => a + b.percentage, 0) / attemptHistory.length)}%
                          </Text>
                          <Text style={styles.historySummaryLabel}>Avg Score</Text>
                        </View>
                        <View style={styles.historySummaryDivider} />
                        <View style={styles.historySummaryItem}>
                          <Text style={styles.historySummaryValue}>
                            {Math.max(...attemptHistory.map(a => a.percentage))}%
                          </Text>
                          <Text style={styles.historySummaryLabel}>Best Score</Text>
                        </View>
                        <View style={styles.historySummaryDivider} />
                        <View style={styles.historySummaryItem}>
                          <Text style={styles.historySummaryValue}>{attemptHistory.length}</Text>
                          <Text style={styles.historySummaryLabel}>Attempts</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </Animated.View>
            )}
          </View>
        )}

        {/* ─── Navigation ──────────────────────────────────────────────────── */}
        {!quizSubmitted && (
          <View style={styles.navRow}>
            {currentSlide > 0 && (
              <Pressable
                style={styles.navPrevBtn}
                onPress={() => handleSlideChange(currentSlide - 1)}
              >
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f3172" strokeWidth="2.5">
                  <Path d="M19 12H5" /><Path d="M12 19l-7-7 7-7" />
                </Svg>
                <Text style={styles.navPrevText}>Previous</Text>
              </Pressable>
            )}

            {currentSlide < totalSlides - 1 && (
              <Pressable
                style={[styles.navNextBtn, { flex: currentSlide === 0 ? 1 : undefined }]}
                onPress={() => handleSlideChange(currentSlide + 1)}
              >
                <Text style={styles.navNextText}>
                  {currentSlide === lesson.contents.length - 1 ? 'Start Quiz' : 'Next'}
                </Text>
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <Path d="M5 12h14" /><Path d="M12 5l7 7-7 7" />
                </Svg>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── Exit Modal ──────────────────────────────────────────────────────── */}
      <Modal visible={showExitModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowExitModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🚪</Text>
            <Text style={styles.modalTitle}>Exit Lesson?</Text>
            <Text style={styles.modalDescription}>
              Your progress is saved. You can continue later from where you left off!
            </Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalContinueBtn} onPress={() => setShowExitModal(false)}>
                <Text style={styles.modalContinueBtnText}>Keep Learning</Text>
              </Pressable>
              <Pressable
                style={styles.modalExitBtn}
                onPress={() => { setShowExitModal(false); router.push('/(tabs)/dashboard'); }}
              >
                <Text style={styles.modalExitBtnText}>Exit</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F6FF' },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F6FF' },
  loadingInner: { alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, fontWeight: '600', color: '#4B7FCC' },
  errorText: { fontSize: 18, color: '#DC2626', marginBottom: 16, fontWeight: '700' },
  errorBackBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
  errorBackBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(15,49,114,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: { flex: 1 },
  topBarTitle: { fontSize: 14, fontWeight: '800', color: '#0f3172', marginBottom: 6 },
  topProgressTrack: {
    height: 5,
    backgroundColor: 'rgba(15,49,114,0.10)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  topProgressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 99,
  },
  slideBadge: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  slideBadgeText: { fontSize: 11, fontWeight: '800', color: '#2563EB' },

  // Scroll Content
  content: { padding: 16, paddingBottom: 50, gap: 14 },

  // Slide Card
  slideCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  slideTopRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  stepPill: {
    backgroundColor: '#2563EB',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stepPillText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  typePill: {
    backgroundColor: 'rgba(15,49,114,0.08)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typePillText: { fontSize: 11, fontWeight: '700', color: '#0f3172', letterSpacing: 0.5 },
  slideTitle: { fontSize: 22, fontWeight: '900', color: '#0f3172', marginBottom: 14, lineHeight: 28 },
  mediaWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#F0F6FF',
  },
  slideMedia: { width: '100%', height: 200 },
  slideContent: { fontSize: 16, lineHeight: 26, color: '#374151' },
  gestureHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#FFF8ED',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE8CC',
  },
  gestureText: { fontSize: 14, fontWeight: '700', color: '#92400E' },

  // Quiz
  quizContainer: { gap: 14 },
  quizHeader: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  quizIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(37,99,235,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quizTitle: { fontSize: 20, fontWeight: '900', color: '#0f3172', textAlign: 'center' },
  quizDescription: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },

  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  questionNumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  questionNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionNumText: { fontSize: 14, fontWeight: '900', color: '#fff' },
  questionNumLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  questionText: { fontSize: 16, fontWeight: '800', color: '#0f3172', marginBottom: 14, lineHeight: 24 },
  questionMedia: { width: '100%', height: 150, borderRadius: 10, marginBottom: 12 },

  optionsContainer: { gap: 9 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  optionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterSelected: { backgroundColor: '#2563EB' },
  optionLetterText: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  optionLetterTextSelected: { color: '#fff' },
  optionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1F2937' },
  optionTextSelected: { color: '#1D4ED8', fontWeight: '700' },

  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 99,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  submitDisabled: { opacity: 0.45, shadowOpacity: 0 },
  submitButtonText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  answerCount: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginTop: -6 },

  // Results Card
  resultsCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  resultHeaderBanner: {
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  resultHeaderIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resultHeaderTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  resultHeaderSub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 20 },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  scoreNum: { fontSize: 48, fontWeight: '900', color: '#0f3172' },
  scoreSlash: { fontSize: 28, fontWeight: '700', color: '#D1D5DB', marginHorizontal: 4 },
  scoreTotal: { fontSize: 28, fontWeight: '700', color: '#9CA3AF' },
  scoreLabel: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },

  xpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  xpBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpBannerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(217,119,6,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpBannerLabel: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  xpBannerValue: { fontSize: 22, fontWeight: '900', color: '#D97706' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    marginBottom: 20,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(15,49,114,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 15, fontWeight: '800', color: '#0f3172' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(0,0,0,0.06)' },

  finishBtn: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 99,
    paddingVertical: 15,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 7,
    marginBottom: 10,
  },
  finishBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  retryBtn: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(37,99,235,0.10)',
    borderRadius: 99,
    paddingVertical: 13,
    marginBottom: 20,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: '#2563EB' },

  // History
  historyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  historyToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyToggleEmoji: { fontSize: 18 },
  historyToggleText: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
  historyCountBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  historyCountText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  historyList: { paddingHorizontal: 20, paddingBottom: 20, gap: 0 },
  historyEmpty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },

  historySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historySummaryItem: { alignItems: 'center', gap: 3 },
  historySummaryValue: { fontSize: 18, fontWeight: '900', color: '#0f3172' },
  historySummaryLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },
  historySummaryDivider: { width: 1, height: 35, backgroundColor: '#E2E8F0' },

  // Navigation
  navRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navPrevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 99,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  navPrevText: { fontSize: 15, fontWeight: '700', color: '#0f3172' },
  navNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    borderRadius: 99,
    paddingVertical: 15,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 7,
  },
  navNextText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Exit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 20,
  },
  modalEmoji: { fontSize: 42, marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0f3172', marginBottom: 8 },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalContinueBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#2563EB',
    borderRadius: 99,
    alignItems: 'center',
  },
  modalContinueBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  modalExitBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: 'rgba(220,38,38,0.10)',
    borderRadius: 99,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(220,38,38,0.20)',
  },
  modalExitBtnText: { fontSize: 14, fontWeight: '800', color: '#DC2626' },
});