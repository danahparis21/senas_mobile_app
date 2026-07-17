// app/lesson/[id].tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable,
  ScrollView, Modal, ActivityIndicator, Animated, Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Polyline, Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Audio } from 'expo-av';
import { api } from '../../services/api';
import GesturePractice from './GesturePractice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Colors for slides ──────────────────────────────────────────────────────
const SLIDE_COLORS = [
  '#2563EB', // Blue
  '#059669', // Green
  '#D97706', // Amber
  '#7C3AED', // Purple
  '#DC2626', // Red
  '#0891B2', // Cyan
  '#C026D3', // Fuchsia
  '#EA580C', // Orange
  '#4F46E5', // Indigo
  '#0D9488', // Teal
];

// ─── SOUND EFFECTS ──────────────────────────────────────────────────────────
const CORRECT_SOUND = require('../../assets/music/correct.mp3');
const WRONG_SOUND = require('../../assets/music/wrong.mp3');
const QUIZ_RESULT_SOUND = require('../../assets/music/quiz-result.mp3');

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
  gesture_data?: {
    module_id: string | number;  // Allow both string and number
    gesture_ids: string[] | number[];  // Allow both string and number arrays
  } | null;
  drag_drop_pairs?: any;
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
interface LeaderboardEntry {
  rank: number;
  student_id: number;
  name: string;
  username: string;
  best_score: number;
  attempts: number;
  attempts_to_achieve?: number;
  is_me: boolean;
  initials: string;
  xp_earned: number;
}

// ─── SVG Icons ──────────────────────────────────────────────────────────────
function CheckCircleIcon({ color = '#10B981' }: { color?: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" /><Polyline points="8 12 11 15 16 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function XCircleIcon({ color = '#EF4444' }: { color?: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" /><Line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth="2.5" strokeLinecap="round" /><Line x1="9" y1="9" x2="15" y2="15" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></Svg>;
}
function TrophyIcon({ color = '#fbbf24' }: { color?: string }) {
  return <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><Path d="M4 22h16" /><Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><Path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></Svg>;
}
function ZapIcon({ size = 14, color = '#D97706' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Svg>;
}
function HomeIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><Polyline points="9 22 9 12 15 12 15 22" /></Svg>;
}
function RefreshIcon({ size = 15, color = '#2563EB' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><Path d="M23 4v6h-6" /><Path d="M1 20v-6h6" /><Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Svg>;
}
function BookIcon({ size = 16, color = '#1848c8' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><Path d="M4 6h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" /><Path d="M8 2v4" /><Path d="M16 2v4" /></Svg>;
}
function MedalIcon({ size = 16, color = '#F59E0B' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M12 15l-3-3 3-3 3 3-3 3z" /><Path d="M8 12l-3 3 3 3 3-3" /><Path d="M16 12l3 3-3 3-3-3" /></Svg>;
}
function ChevronLeftIcon({ color = '#fff', size = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

interface PodiumBlockProps {
  rank: number;
  height: number;
  width: number;
}

function Podium3DBlock({ rank, height, width }: PodiumBlockProps) {
  const dy = rank === 1 ? 12 : 10;
  const w = width;
  const h = height;

  // Colors based on rank
  let topColors = ['#FFFBEB', '#FDE68A'];
  let leftColors = ['#FBBF24', '#D97706'];
  let rightColors = ['#D97706', '#B45309'];
  let glowColor = '#FBBF24';

  if (rank === 2) {
    topColors = ['#F8FAFC', '#CBD5E1'];
    leftColors = ['#94A3B8', '#64748B'];
    rightColors = ['#64748B', '#475569'];
    glowColor = '#94A3B8';
  } else if (rank === 3) {
    topColors = ['#FFEDD5', '#FED7AA'];
    leftColors = ['#F97316', '#C2410C'];
    rightColors = ['#C2410C', '#9A3412'];
    glowColor = '#F97316';
  }

  const gradTopId = `gradTop-${rank}`;
  const gradLeftId = `gradLeft-${rank}`;
  const gradRightId = `gradRight-${rank}`;

  return (
    <View style={{
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.75,
      shadowRadius: 12,
      elevation: 10,
      alignItems: 'center',
    }}>
      <Svg width={w} height={h + 2 * dy} viewBox={`0 0 ${w} ${h + 2 * dy}`}>
        <Defs>
          <LinearGradient id={gradTopId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={topColors[0]} />
            <Stop offset="100%" stopColor={topColors[1]} />
          </LinearGradient>
          <LinearGradient id={gradLeftId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={leftColors[0]} />
            <Stop offset="100%" stopColor={leftColors[1]} />
          </LinearGradient>
          <LinearGradient id={gradRightId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={rightColors[0]} />
            <Stop offset="100%" stopColor={rightColors[1]} />
          </LinearGradient>
        </Defs>

        {/* Front-Left Face */}
        <Path d={`M 0 ${dy} L ${w / 2} ${2 * dy} L ${w / 2} ${h + 2 * dy} L 0 ${h + dy} Z`} fill={`url(#${gradLeftId})`} />

        {/* Front-Right Face */}
        <Path d={`M ${w / 2} ${2 * dy} L ${w} ${dy} L ${w} ${h + dy} L ${w / 2} ${h + 2 * dy} Z`} fill={`url(#${gradRightId})`} />

        {/* Top Face */}
        <Path d={`M 0 ${dy} L ${w / 2} 0 L ${w} ${dy} L ${w / 2} ${2 * dy} Z`} fill={`url(#${gradTopId})`} />

        {/* Glowing borders */}
        <Path d={`M 0 ${dy} L ${w / 2} ${2 * dy} L ${w} ${dy} L ${w / 2} 0 Z`} stroke={glowColor} strokeWidth="1.5" fill="none" opacity="0.95" />
        <Path d={`M 0 ${dy} L 0 ${h + dy} L ${w / 2} ${h + 2 * dy} L ${w} ${h + dy} L ${w} ${dy}`} stroke={glowColor} strokeWidth="1.5" fill="none" opacity="0.8" />
        <Path d={`M ${w / 2} ${2 * dy} L ${w / 2} ${h + 2 * dy}`} stroke={glowColor} strokeWidth="1.5" fill="none" opacity="0.8" />
      </Svg>
      <View style={{
        position: 'absolute',
        top: dy + (h / 3) - 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{
          fontSize: rank === 1 ? 34 : 26,
          fontWeight: '900',
          color: '#fff',
          textShadowColor: 'rgba(0,0,0,0.3)',
          textShadowOffset: { width: 1.5, height: 1.5 },
          textShadowRadius: 3,
        }}>
          {rank}
        </Text>
      </View>
    </View>
  );
}

// ─── Exit Modal ──────────────────────────────────────────────────────────────
function ExitModal({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.exitModal} onPress={e => e.stopPropagation()}>
          <View style={s.exitIconBox}>
            <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <Polyline points="16 17 21 12 16 7" />
              <Line x1="21" y1="12" x2="9" y2="12" />
            </Svg>
          </View>
          <Text style={s.exitTitle}>Exit Lesson?</Text>
          <Text style={s.exitDesc}>Your progress will be saved. Are you sure you want to exit?</Text>
          <View style={s.exitBtns}>
            <Pressable style={s.stayBtn} onPress={onClose}>
              <Text style={s.stayText}>Stay</Text>
            </Pressable>
            <Pressable style={s.exitConfirmBtn} onPress={onConfirm}>
              <Text style={s.exitConfirmText}>Exit</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Student Detail Modal ──────────────────────────────────────────────────
function StudentDetailModal({
  visible,
  onClose,
  student
}: {
  visible: boolean;
  onClose: () => void;
  student: LeaderboardEntry | null;
}) {
  if (!student) return null;

  const rankEmoji = student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `#${student.rank}`;
  const isPerfect = student.best_score === 100;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.studentDetailModal} onPress={e => e.stopPropagation()}>
          {/* Close button */}
          <Pressable style={s.studentDetailClose} onPress={onClose}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5">
              <Path d="M18 6L6 18M6 6l12 12" />
            </Svg>
          </Pressable>

          {/* Avatar */}
          <View style={[s.studentDetailAvatar, student.is_me && s.studentDetailAvatarMe]}>
            <Text style={s.studentDetailAvatarText}>{student.initials}</Text>
          </View>

          {/* Name */}
          <Text style={s.studentDetailName}>
            {student.is_me ? 'You' : student.name}
          </Text>
          <Text style={s.studentDetailUsername}>@{student.username}</Text>

          {/* Divider */}
          <View style={s.studentDetailDivider} />

          {/* Stats */}
          <View style={s.studentDetailStats}>
            <View style={s.studentDetailStat}>
              <Text style={s.studentDetailStatLabel}>Rank</Text>
              <Text style={s.studentDetailStatValue}>{rankEmoji}</Text>
            </View>
            <View style={s.studentDetailStatDivider} />
            <View style={s.studentDetailStat}>
              <Text style={s.studentDetailStatLabel}>Best Score</Text>
              <Text style={[s.studentDetailStatValue, isPerfect && { color: '#F59E0B' }]}>
                {student.best_score}%
              </Text>
            </View>
            <View style={s.studentDetailStatDivider} />
            <View style={s.studentDetailStat}>
              <Text style={s.studentDetailStatLabel}>Attempts</Text>
              <Text style={s.studentDetailStatValue}>
                {student.attempts_to_achieve || student.attempts}
              </Text>
            </View>
          </View>

          {/* Achievement note */}
          <View style={s.studentDetailNote}>
            <Text style={s.studentDetailNoteText}>
              {student.attempts_to_achieve === 1
                ? '🏆 Achieved this score on their very first try!'
                : student.attempts_to_achieve && student.attempts_to_achieve <= 3
                  ? `⭐ Achieved this score in just ${student.attempts_to_achieve} attempts!`
                  : `📈 Achieved this score after ${student.attempts_to_achieve || student.attempts} attempts`}
            </Text>
          </View>

          <Pressable style={s.studentDetailBtn} onPress={onClose}>
            <Text style={s.studentDetailBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
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
  // Parallax scroll: score view drifts/fades as leaderboard sheet rises over it
  const parallelScrollY = useRef(new Animated.Value(0)).current;
  const resultsScrollRef = useRef<any>(null);

  // ── Audio state ──
  const [correctSound, setCorrectSound] = useState<Audio.Sound | null>(null);
  const [wrongSound, setWrongSound] = useState<Audio.Sound | null>(null);
  const [resultSound, setResultSound] = useState<Audio.Sound | null>(null);
  const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Student detail modal state
  const [selectedStudent, setSelectedStudent] = useState<LeaderboardEntry | null>(null);
  const [showStudentDetail, setShowStudentDetail] = useState<boolean>(false);

  // Quiz state for step-by-step
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionRevealed, setQuestionRevealed] = useState<boolean>(false);
  const [currentScore, setCurrentScore] = useState<number>(0);

  const quizAnswersRef = useRef<Record<number, number>>({});
  const currentScoreRef = useRef<number>(0);
  const senyaBounceAnim = useRef(new Animated.Value(0)).current; // 0 = normal, 1 = bounce
  const senyaShakeAnim = useRef(new Animated.Value(0)).current; // 0 = normal, 1 = shake

  // ── Play correct answer sound ──
  async function playCorrectSound() {
    try {
      if (isSoundPlaying) return;
      setIsSoundPlaying(true);

      if (correctSound) {
        await correctSound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        CORRECT_SOUND,
        {
          shouldPlay: true,
          isLooping: false,
          volume: 0.9, // Louder for correct answers (90%)
        }
      );

      setCorrectSound(sound);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          setCorrectSound(null);
          setIsSoundPlaying(false);
        }
      });

    } catch (error) {
      console.error('Failed to play correct sound:', error);
      setIsSoundPlaying(false);
    }
  }

  // ── Play wrong answer sound ──
  async function playWrongSound() {
    try {
      if (isSoundPlaying) return;
      setIsSoundPlaying(true);

      if (wrongSound) {
        await wrongSound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        WRONG_SOUND,
        {
          shouldPlay: true,
          isLooping: false,
          volume: 0.6, // Lower for wrong answers (60%)
        }
      );

      setWrongSound(sound);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          setWrongSound(null);
          setIsSoundPlaying(false);
        }
      });

    } catch (error) {
      console.error('Failed to play wrong sound:', error);
      setIsSoundPlaying(false);
    }
  }

  // ── Play quiz result sound ──
  async function playResultSound() {
    try {
      if (resultSound) {
        await resultSound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        QUIZ_RESULT_SOUND,
        {
          shouldPlay: true,
          isLooping: false,
          volume: 0.8,
        }
      );

      setResultSound(sound);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          setResultSound(null);
        }
      });

    } catch (error) {
      console.error('Failed to play result sound:', error);
    }
  }

  const animateSenyaCorrect = () => {
    senyaBounceAnim.setValue(0);
    Animated.spring(senyaBounceAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const animateSenyaIncorrect = () => {
    // Reset and shake - gentler, more playful
    senyaShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(senyaShakeAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(senyaShakeAnim, {
        toValue: -0.8,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(senyaShakeAnim, {
        toValue: 0.6,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(senyaShakeAnim, {
        toValue: -0.4,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(senyaShakeAnim, {
        toValue: 0.2,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(senyaShakeAnim, {
        toValue: 0,
        duration: 30,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchAttemptHistory = async () => {
    try {
      const response = await api.getAttempts(id);
      if (response.success) setAttemptHistory(response.attempts);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const response = await api.getLessonLeaderboard(id);
      if (response.success) {
        setLeaderboard(response.rankings);
        setUserRank(response.user_rank);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
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
    fetchLeaderboard();

    // Reset refs when lesson changes
    quizAnswersRef.current = {};
    currentScoreRef.current = 0;

    // ── Cleanup sounds on unmount ──
    return () => {
      if (correctSound) {
        correctSound.unloadAsync();
      }
      if (wrongSound) {
        wrongSound.unloadAsync();
      }
      if (resultSound) {
        resultSound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (quizSubmitted && quizResult) {
      // ── Play result sound ──
      playResultSound();

      // Reset animation values BEFORE starting new animation
      resultsFadeAnim.setValue(0);
      resultsScaleAnim.setValue(0.85);

      // Start the animation
      Animated.parallel([
        Animated.timing(resultsFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.spring(resultsScaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true
        }),
      ]).start();

      if (quizResult.percentage >= 60 && !confettiFired) {
        setTimeout(() => {
          confettiRef.current?.start();
          setConfettiFired(true);
        }, 400);
      }
      // Refresh leaderboard after quiz
      fetchLeaderboard();
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

  const handleExit = () => {
    setShowExitModal(false);
    router.dismiss();
  };

  const handleOptionSelect = async (optionIndex: number) => {
    if (questionRevealed) return;
    setSelectedOption(optionIndex);
    setQuestionRevealed(true);

    const questions = lesson?.quiz?.questions || [];
    const currentQ = questions[currentQuestionIndex];
    const isCorrect = optionIndex === currentQ?.options.findIndex(o => o.is_correct);

    // ── Play the appropriate sound ──
    if (isCorrect) {
      await playCorrectSound();
      animateSenyaCorrect();
    } else {
      await playWrongSound();
      animateSenyaIncorrect();
    }

    // Store the selected option ID
    const selectedOptionId = currentQ?.options[optionIndex]?.option_id;
    setQuizAnswers(prev => {
      const newAnswers = {
        ...prev,
        [currentQ.question_id]: selectedOptionId
      };
      quizAnswersRef.current = newAnswers; // ✅ Update ref
      return newAnswers;
    });

    if (isCorrect) {
      setCurrentScore(prev => {
        const newScore = prev + 1;
        currentScoreRef.current = newScore; // ✅ Update ref
        return newScore;
      });
    }
  };

  const handleNextQuestion = () => {
    const questions = lesson?.quiz?.questions || [];
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedOption(null);
      setQuestionRevealed(false);
    } else {
      // All questions answered - submit quiz
      // Use a delay to ensure all state updates are processed
      console.log('📊 All questions answered, submitting quiz...');
      console.log('📊 Current score:', currentScore);
      console.log('📊 Quiz answers:', quizAnswers);

      setTimeout(() => {
        submitQuiz();
      }, 300);
    }
  };

  const submitQuiz = async (): Promise<void> => {
    if (!lesson || !lesson.quiz) return;

    // Use REFS to get latest values (not state)
    const questions = lesson.quiz.questions;
    const latestQuizAnswers = quizAnswersRef.current;
    const latestScore = currentScoreRef.current;

    console.log('📊 Submitting with refs:', { latestQuizAnswers, latestScore });

    // Calculate score from quizAnswers
    let calculatedScore = 0;
    const answers: QuizAnswer[] = questions.map((q, index) => {
      const selectedOptionId = latestQuizAnswers[q.question_id] ?? null;

      // Check if this is a gesture question
      const isGestureQuestion = q.question_type === 'gesture';

      let isCorrect = false;
      if (isGestureQuestion) {
        // For gesture questions: success = 1, failure = 0 or null
        isCorrect = selectedOptionId === 1;
      } else {
        // For multiple choice: check if the selected option is correct
        isCorrect = selectedOptionId !== null &&
          q.options.some(o => o.option_id === selectedOptionId && o.is_correct === true);
      }

      if (isCorrect) calculatedScore++;

      return {
        question_id: q.question_id,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
      };
    });

    // Use calculated score
    const score = calculatedScore;
    const totalPoints = questions.length;
    const percentage = Math.round((score / totalPoints) * 100);

    console.log(`📊 Submit Quiz: Score=${score}, Total=${totalPoints}, Percentage=${percentage}%`);
    console.log('📊 Quiz answers (ref):', latestQuizAnswers);
    console.log('📊 Calculated answers:', answers);

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
      <SafeAreaView style={s.loadingContainer}>
        <View style={s.loadingInner}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={s.loadingText}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!lesson) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <Text style={s.errorText}>Lesson not found</Text>
        <Pressable onPress={() => router.back()} style={s.errorBackBtn}>
          <Text style={s.errorBackBtnText}>← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const totalSlides = lesson.total_steps;
  const isQuizSlide = currentSlide >= lesson.contents.length;
  const passed = (quizResult?.percentage || 0) >= 60;
  const isPerfect = (quizResult?.percentage || 0) === 100;
  const currentQuestion = lesson.quiz?.questions[currentQuestionIndex];
  const slideColor = SLIDE_COLORS[currentSlide % SLIDE_COLORS.length];

  // ─── RENDER: Content Slides ──────────────────────────────────────────────
  const renderContentSlides = () => {
    const content = lesson.contents[currentSlide];
    return (
      <>
        <View style={s.glassCard}>
          <View style={s.heroRow}>
            <View style={{ flex: 1 }}>
              <View style={s.moduleBadge}><Text style={s.moduleBadgeText}>LESSON</Text></View>
              <Text style={s.heroTitle}>{lesson.title}</Text>
              <Text style={s.heroSub}>{lesson.contents.length} slides · {lesson.difficulty || 'Beginner'}</Text>
            </View>
            <Image source={require('../../assets/images/img/senya_blue.png')} style={s.senyaHero} contentFit="contain" />
          </View>
        </View>

        <View style={s.dotsRow}>
          {lesson.contents.map((_, i) => (
            <Pressable key={i} onPress={() => handleSlideChange(i)}>
              <View style={[s.dot, {
                width: i === currentSlide ? 22 : 8,
                backgroundColor: i <= currentSlide ? slideColor : 'rgba(15,49,114,0.15)'
              }]} />
            </Pressable>
          ))}
        </View>

        <View style={[s.glassCard, { minHeight: 180 }]}>
          <View style={[s.slideAccent, { backgroundColor: slideColor }]} />
          <Text style={[s.slideTitle, { color: slideColor }]}>{content.title}</Text>
          <Text style={s.slideBody}>{content.content_text}</Text>
          <Text style={s.slideCounter}>{currentSlide + 1} / {lesson.contents.length}</Text>
        </View>

        <View style={s.tipRow}>
          <Image source={require('../../assets/images/img/senyas_logo.png')} style={s.tipLogoSm} contentFit="contain" />
          <View style={s.tipBubble}>
            <Text style={s.tipBubbleText}>
              {currentSlide === 0 ? "Hi! I'm Senya. Let's learn about this lesson!" :
                currentSlide === lesson.contents.length - 1 ? "You're almost ready for the quiz. You've got this!" :
                  "Keep going! You're doing great!"}
            </Text>
          </View>
        </View>

        <View style={s.navRow}>
          {currentSlide > 0 && (
            <Pressable style={s.ghostBtn} onPress={() => handleSlideChange(currentSlide - 1)}>
              <Text style={s.ghostBtnText}>← Back</Text>
            </Pressable>
          )}
          <Pressable
            style={[s.primaryBtn, currentSlide === lesson.contents.length - 1 && s.goldBtn, currentSlide > 0 ? { flex: 2 } : { flex: 1 }]}
            onPress={() => {
              if (currentSlide === lesson.contents.length - 1) {
                setCurrentSlide(totalSlides);
              } else {
                handleSlideChange(currentSlide + 1);
              }
            }}
          >
            <Text style={s.primaryBtnText}>
              {currentSlide === lesson.contents.length - 1 ? '🧠 Start Quiz' : 'Next →'}
            </Text>
          </Pressable>
        </View>
      </>
    );
  };

  // ─── RENDER: Quiz Step-by-Step ──────────────────────────────────────────
  const renderQuiz = () => {
    if (!lesson.quiz || !currentQuestion) return null;

    if (quizSubmitted) {
      return renderResults();
    }

    // ─── Handle Gesture Recognition Questions ──────────────────────────────
    if (currentQuestion.question_type === 'gesture') {
      // DEBUG: Log what we're receiving
      console.log('🔍 Gesture Question Data:', {
        question_id: currentQuestion.question_id,
        question_text: currentQuestion.question_text,
        gesture_data: currentQuestion.gesture_data,
        type: typeof currentQuestion.gesture_data,
      });

      const gestureData = currentQuestion.gesture_data;

      // Check if gesture_data exists and has valid gesture_ids
      if (!gestureData) {
        console.error('❌ No gesture_data found for question:', currentQuestion.question_id);
        return (
          <View style={s.glassCard}>
            <Text style={s.errorText}>No gesture data found for this question.</Text>
            <Pressable style={s.primaryBtn} onPress={handleNextQuestion}>
              <Text style={s.primaryBtnText}>Skip →</Text>
            </Pressable>
          </View>
        );
      }

      // Ensure gesture_ids is an array
      const gestureIds = Array.isArray(gestureData.gesture_ids) ? gestureData.gesture_ids : [];

      if (gestureIds.length === 0) {
        console.error('❌ No gesture_ids found in gesture_data:', gestureData);
        return (
          <View style={s.glassCard}>
            <Text style={s.errorText}>No gestures configured for this question.</Text>
            <Pressable style={s.primaryBtn} onPress={handleNextQuestion}>
              <Text style={s.primaryBtnText}>Skip →</Text>
            </Pressable>
          </View>
        );
      }

      console.log('✅ Gesture data loaded:', { gestureIds, moduleId: gestureData.module_id });

      return (
        <GesturePractice
          question={{
            question_id: currentQuestion.question_id,
            question_text: currentQuestion.question_text,
            gesture_data: {
              module_id: String(gestureData.module_id), // Ensure it's a string
              gesture_ids: gestureIds.map(id => String(id)), // Ensure all IDs are strings
            },
            question_number: currentQuestion.question_number,
          }}
          questionIndex={currentQuestionIndex}
          totalQuestions={lesson.quiz.questions.length}

          onComplete={(success, gestureIds) => {
            console.log('📝 Gesture onComplete called:', { success, gestureIds, questionId: currentQuestion.question_id });

            // Store the result
            setQuizAnswers(prev => {
              const newAnswers = {
                ...prev,
                [currentQuestion.question_id]: success ? 1 : 0,
              };
              quizAnswersRef.current = newAnswers; // ✅ Update ref
              console.log('📝 Updated quizAnswers:', newAnswers);
              return newAnswers;
            });

            if (success) {
              setCurrentScore(prev => {
                const newScore = prev + 1;
                currentScoreRef.current = newScore; // ✅ Update ref
                console.log(`✅ Score incremented to: ${newScore}`);
                return newScore;
              });
            }

            // Move to next question AFTER state updates have been processed
            setTimeout(() => {
              console.log('➡️ Moving to next question...');
              handleNextQuestion();
            }, 400);
          }}
          onBack={() => setCurrentSlide(0)}
          lessonId={id}
          quizId={lesson.quiz.quiz_id}
        />
      );
    }
    // ─── Regular Multiple Choice / True False ──────────────────────────────
    const isCorrect = selectedOption !== null && selectedOption === currentQuestion.options.findIndex(o => o.is_correct);
    const totalQuestions = lesson.quiz.questions.length;

    return (
      <>
        <Pressable style={s.backToLessonBtn} onPress={() => setCurrentSlide(0)}>
          <BookIcon size={16} color="#1848c8" />
          <Text style={s.backToLessonText}>← Back to Lesson</Text>
        </Pressable>

        <View style={s.glassCard}>
          <View style={s.progressHeader}>
            <Text style={s.progressLabel}>Question {currentQuestionIndex + 1} of {totalQuestions}</Text>
          </View>
          <View style={s.progressDots}>
            {lesson.quiz.questions.map((_, i) => (
              <View key={i} style={[s.progressDot, {
                backgroundColor: i < currentQuestionIndex ? '#22c55e' :
                  i === currentQuestionIndex ? '#2563EB' : 'rgba(15,49,114,0.10)'
              }]} />
            ))}
          </View>
        </View>

        <View style={[s.glassCard, s.questionCard]}>
          <Text style={s.questionEmojiSmall}>❓</Text>
          <Text style={s.questionText}>{currentQuestion.question_text}</Text>
          {currentQuestion.media_url && (
            <Image source={{ uri: currentQuestion.media_url }} style={s.questionMedia} contentFit="contain" />
          )}
        </View>

        {currentQuestion.options.map((opt, i) => {
          const isSel = selectedOption === i;
          const isCorr = i === currentQuestion.options.findIndex(o => o.is_correct);
          let bgColor = 'rgba(255,255,255,0.62)';
          let borderColor = 'rgba(255,255,255,0.85)';
          let textColor = '#0f3172';
          let circleBg = 'rgba(15,49,114,0.08)';

          if (questionRevealed) {
            if (isCorr) { bgColor = 'rgba(236,253,245,0.9)'; borderColor = '#6EE7B7'; textColor = '#065F46'; circleBg = '#10B981'; }
            else if (isSel) { bgColor = 'rgba(254,242,242,0.9)'; borderColor = '#FCA5A5'; textColor = '#991B1B'; circleBg = '#EF4444'; }
            else { bgColor = 'rgba(255,255,255,0.35)'; textColor = '#9CA3AF'; }
          } else if (isSel) {
            bgColor = 'rgba(239,246,255,0.9)'; borderColor = '#93C5FD'; textColor = '#1D4ED8'; circleBg = '#2563EB';
          }

          return (
            <Pressable key={`${currentQuestionIndex}-${i}`} style={[s.optionCard, { backgroundColor: bgColor, borderColor }]}
              onPress={() => handleOptionSelect(i)} disabled={questionRevealed}>
              <View style={[s.optionCircle, { backgroundColor: circleBg }]}>
                {questionRevealed && isCorr ? <CheckCircleIcon color="#fff" /> :
                  questionRevealed && isSel && !isCorr ? <XCircleIcon color="#fff" /> :
                    <Text style={[s.optionLetter, { color: isSel ? '#fff' : '#4b7bbb' }]}>{String.fromCharCode(65 + i)}</Text>}
              </View>
              <Text style={[s.optionText, { color: textColor }]}>{opt.option_text}</Text>
            </Pressable>
          );
        })}

        <View style={s.feedbackRow}>
          <Animated.View
            style={{
              transform: [
                {
                  scale: senyaBounceAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.2, 1],
                  }),
                },
                {
                  translateY: senyaBounceAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -20, 0],
                  }),
                },
                {
                  rotateZ: senyaShakeAnim.interpolate({
                    inputRange: [-1, -0.5, 0, 0.5, 1],
                    outputRange: ['-6deg', '-3deg', '0deg', '3deg', '6deg'],
                  }),
                },
              ],
            }}
          >
            <Image
              source={require('../../assets/images/img/senya_teaching.png')}
              style={s.senyaFeedback}
              contentFit="contain"
            />
          </Animated.View>
          <View style={[s.feedbackBubble, questionRevealed && isCorrect ? s.feedbackCorrect : questionRevealed && !isCorrect ? s.feedbackWrong : {}]}>
            {questionRevealed && isCorrect && <CheckCircleIcon />}
            {questionRevealed && !isCorrect && <XCircleIcon />}
            <Text style={[s.feedbackText, questionRevealed && isCorrect ? { color: '#065f46' } : questionRevealed ? { color: '#991b1b' } : {}]}>
              {questionRevealed
                ? (isCorrect
                  ? (currentQuestion.options.find(o => o.is_correct)?.option_text || 'Correct! 🎉')
                  : (currentQuestion.options.find(o => o.is_correct)?.option_text || 'Incorrect! 😅'))
                : 'Read carefully and pick the best answer!'}
            </Text>
          </View>
        </View>

        {questionRevealed && (
          <Pressable style={[s.primaryBtn, isCorrect && s.goldBtn]} onPress={handleNextQuestion}>
            <Text style={s.primaryBtnText}>
              {currentQuestionIndex < totalQuestions - 1 ? 'Next Question →' : 'See Results →'}
            </Text>
          </Pressable>
        )}
      </>
    );
  };
  // ─── RENDER: Results Sub-Views ──────────────────────────────────────────
  const renderScoreView = () => {
    const score = quizResult?.score || 0;
    const total = quizResult?.total || 0;
    const pct = quizResult?.percentage || 0;
    const xpEarned = quizResult?.xpEarned || 0;
    const stars = pct === 100 ? 3 : pct >= 80 ? 2 : pct >= 50 ? 1 : 0;

    const { label, color } =
      pct === 100 ? { label: 'Perfect Score!', color: '#F59E0B' } :
        pct >= 80 ? { label: 'Excellent!', color: '#10B981' } :
          pct >= 60 ? { label: 'Good Job!', color: '#2563EB' } :
            { label: 'Keep Practicing!', color: '#8B5CF6' };

    return (
      <Animated.View style={[s.resultsContainer, {
        opacity: resultsFadeAnim,
        transform: [{ scale: resultsScaleAnim }],
      }]}>
        {/* Back to Lesson button */}
        <Pressable style={s.backToLessonBtn} onPress={() => {
          setQuizSubmitted(false);
          setCurrentQuestionIndex(0);
          setSelectedOption(null);
          setQuestionRevealed(false);
          setCurrentScore(0);
          setQuizResult(null);
          setConfettiFired(false);
          resultsFadeAnim.setValue(0);
          resultsScaleAnim.setValue(0.85);
          setCurrentSlide(0);
          quizAnswersRef.current = {};
          currentScoreRef.current = 0;
        }}>
          <BookIcon size={16} color="#1848c8" />
          <Text style={s.backToLessonText}>← Back to Lesson</Text>
        </Pressable>

        {/* Result card */}
        <View style={[s.glassCard, { alignItems: 'center', paddingVertical: 28 }]}>
          <Image source={require('../../assets/images/img/senya_teaching.png')} style={s.resultSenya} contentFit="contain" />

          {/* Big Circular Percentage Score Badge */}
          <View style={s.scoreCircleBadge}>
            <Text style={s.scoreCircleText}>{pct}%</Text>
            <Text style={s.scoreCircleSub}>Score</Text>
          </View>

          <View style={s.starsRow}>
            {[1, 2, 3].map(i => (
              <Text key={i} style={[s.star, { opacity: i <= stars ? 1 : 0.15, transform: [{ scale: i <= stars ? 1.25 : 1 }] }]}>
                ⭐
              </Text>
            ))}
          </View>

          <Text style={[s.resultLabel, { color }]}>{label}</Text>
          <Text style={s.scoreSubtitle}>{score} out of {total} correct answers</Text>

          <View style={s.xpEarnedBadge}>
            <Text style={s.xpEarnedText}>⚡ +{xpEarned} XP Earned!</Text>
          </View>

          {userRank && (
            <View style={s.userRankBadge}>
              <Text style={s.userRankText}>🏆 Rank #{userRank} on Leaderboard</Text>
            </View>
          )}
        </View>

        {/* Scroll hint - more padding and raised higher */}
        <View style={s.scrollHintContainer}>
          <View style={s.scrollHintPill}>
            <Text style={s.scrollHintText}>👆 Swipe up for the Leaderboard</Text>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1848c8" strokeWidth="2.5" strokeLinecap="round">
              <Path d="M12 19V5M5 12l7-7 7 7" />
            </Svg>
          </View>
        </View>
      </Animated.View>
    );
  };

  const handleStudentPress = (student: LeaderboardEntry) => {
    setSelectedStudent(student);
    setShowStudentDetail(true);
  };

  const renderLeaderboardView = () => {
    const rankings = leaderboard;
    const rest = rankings.slice(3);

    const rank1 = rankings.find(r => r.rank === 1) || null;
    const rank2 = rankings.find(r => r.rank === 2) || null;
    const rank3 = rankings.find(r => r.rank === 3) || null;

    // ─── Improved percentile calculation ─────────────────────────────────
    let rankPercentileText = "Complete the quiz to see your ranking!";
    let rankNumText = "#—";

    if (userRank && rankings.length > 0) {
      rankNumText = `#${userRank}`;
      // Calculate percentile: (number of people below you / total people) * 100
      // People below = total - userRank
      const peopleBelow = rankings.length - userRank;
      const percentile = Math.round((peopleBelow / rankings.length) * 100);

      if (userRank === 1) {
        rankPercentileText = `🥇 You're #1! You outscored everyone else!`;
      } else if (userRank === 2) {
        rankPercentileText = `🥈 You're #2! You're in the top tier!`;
      } else if (userRank === 3) {
        rankPercentileText = `🥉 You're #3! Amazing performance!`;
      } else {
        // More natural phrasing for lower ranks
        const topPercent = Math.round((userRank / rankings.length) * 100);
        if (topPercent <= 25) {
          rankPercentileText = `📈 You're in the top ${100 - percentile}% — keep pushing!`;
        } else if (topPercent <= 50) {
          rankPercentileText = `👏 You're doing better than ${percentile}% of your classmates!`;
        } else {
          rankPercentileText = `💪 Keep practicing! You're improving!`;
        }
      }
    } else if (rankings.length > 0) {
      rankPercentileText = "You haven't ranked on this leaderboard yet. Try again!";
    }

    return (
      <View style={s.leaderboardContainer}>
        {/* Custom Header */}
        <View style={s.leaderboardHeader}>
          <Text style={s.leaderboardHeaderTitle}>🏆 Leaderboard</Text>
        </View>

        {/* Rank Banner - improved styling */}
        {userRank ? (
          <View style={s.rankBanner}>
            <View style={s.rankBannerLeft}>
              <View style={s.rankBannerNumContainer}>
                <Text style={s.rankBannerNum}>{rankNumText}</Text>
              </View>
              <View style={s.rankBannerDivider} />
              <View style={s.rankBannerContent}>
                <Text style={s.rankBannerMessage}>{rankPercentileText}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[s.rankBanner, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[s.rankBannerMessage, { textAlign: 'center', marginBottom: 0 }]}>
              {rankPercentileText}
            </Text>
          </View>
        )}

        {/* Podium Layout */}
        <View style={s.podiumRow}>
          {/* Rank 2 (Left) */}
          <View style={s.podiumCol}>
            {rank2 ? (
              <>
                <View style={s.podiumAvatarContainer}>
                  <Pressable onPress={() => handleStudentPress(rank2)}>
                    <View style={[s.podiumAvatar, { borderColor: '#E5E7EB', backgroundColor: '#9CA3AF' }]}>
                      <Text style={s.podiumAvatarInitials}>{rank2.initials}</Text>
                    </View>
                  </Pressable>
                  <Text style={s.podiumBadge}>🥈</Text>
                </View>
                <Text style={s.podiumName} numberOfLines={1}>{rank2.is_me ? 'You' : rank2.name}</Text>
                <View style={s.podiumScoreBadge}>
                  <Text style={s.podiumScoreText}>{rank2.best_score}%</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[s.podiumAvatar, s.podiumAvatarPlaceholder]}>
                  <Text style={s.podiumAvatarPlaceholderText}>—</Text>
                </View>
                <Text style={s.podiumNamePlaceholder}>TBD</Text>
                <View style={s.podiumScoreBadgePlaceholder}>
                  <Text style={s.podiumScoreTextPlaceholder}>—</Text>
                </View>
              </>
            )}
            <View style={[s.podiumBlock, s.podiumBlockSilver]}>
              <Text style={s.podiumBlockNumber}>2</Text>
            </View>
          </View>

          {/* Rank 1 (Middle) */}
          <View style={s.podiumCol}>
            {rank1 ? (
              <>
                <View style={s.podiumAvatarContainer}>
                  <View style={s.crownContainer}>
                    <Text style={{ fontSize: 22 }}>👑</Text>
                  </View>
                  <Pressable onPress={() => handleStudentPress(rank1)}>
                    <View style={[s.podiumAvatar, s.podiumAvatarFirst, { borderColor: '#FBBF24', backgroundColor: '#F59E0B' }]}>
                      <Text style={s.podiumAvatarInitials}>{rank1.initials}</Text>
                    </View>
                  </Pressable>
                  <Text style={s.podiumBadge}>🥇</Text>
                </View>
                <Text style={[s.podiumName, { fontWeight: '800' }]} numberOfLines={1}>{rank1.is_me ? 'You' : rank1.name}</Text>
                <View style={[s.podiumScoreBadge, s.podiumScoreBadgeGold]}>
                  <Text style={[s.podiumScoreText, { color: '#D97706' }]}>{rank1.best_score}%</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[s.podiumAvatar, s.podiumAvatarFirst, s.podiumAvatarPlaceholder]}>
                  <Text style={s.podiumAvatarPlaceholderText}>—</Text>
                </View>
                <Text style={s.podiumNamePlaceholder}>TBD</Text>
                <View style={s.podiumScoreBadgePlaceholder}>
                  <Text style={s.podiumScoreTextPlaceholder}>—</Text>
                </View>
              </>
            )}
            <View style={[s.podiumBlock, s.podiumBlockGold]}>
              <Text style={s.podiumBlockNumber}>1</Text>
            </View>
          </View>

          {/* Rank 3 (Right) */}
          <View style={s.podiumCol}>
            {rank3 ? (
              <>
                <View style={s.podiumAvatarContainer}>
                  <Pressable onPress={() => handleStudentPress(rank3)}>
                    <View style={[s.podiumAvatar, { borderColor: '#F97316', backgroundColor: '#C2410C' }]}>
                      <Text style={s.podiumAvatarInitials}>{rank3.initials}</Text>
                    </View>
                  </Pressable>
                  <Text style={s.podiumBadge}>🥉</Text>
                </View>
                <Text style={s.podiumName} numberOfLines={1}>{rank3.is_me ? 'You' : rank3.name}</Text>
                <View style={s.podiumScoreBadge}>
                  <Text style={s.podiumScoreText}>{rank3.best_score}%</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[s.podiumAvatar, s.podiumAvatarPlaceholder]}>
                  <Text style={s.podiumAvatarPlaceholderText}>—</Text>
                </View>
                <Text style={s.podiumNamePlaceholder}>TBD</Text>
                <View style={s.podiumScoreBadgePlaceholder}>
                  <Text style={s.podiumScoreTextPlaceholder}>—</Text>
                </View>
              </>
            )}
            <View style={[s.podiumBlock, s.podiumBlockBronze]}>
              <Text style={s.podiumBlockNumber}>3</Text>
            </View>
          </View>
        </View>

        {/* White Curved Card for Rank 4+ */}
        <View style={s.leaderboardListCard}>
          <Text style={s.leaderboardListTitle}>All Rankings</Text>

          {loadingLeaderboard ? (
            <View style={s.loadingLeaderboard}>
              <ActivityIndicator size="small" color="#1848c8" />
              <Text style={s.loadingLeaderboardText}>Loading rankings...</Text>
            </View>
          ) : rankings.length === 0 ? (
            <Text style={s.noRankingsText}>No entries yet. Be the first to rank!</Text>
          ) : rest.length === 0 ? (
            <Text style={s.noRankingsText}>Only the top 3 are on the board so far!</Text>
          ) : (
            rest.map((r, index) => {
              const itemRank = r.rank;
              return (
                <Pressable
                  key={r.student_id}
                  style={[
                    s.leaderboardListItem,
                    r.is_me && s.leaderboardListItemMe,
                    index < rest.length - 1 && s.leaderboardListItemBorder
                  ]}
                  onPress={() => handleStudentPress(r)}
                >
                  <View style={s.listRankCircle}>
                    <Text style={s.listRankText}>{itemRank}</Text>
                  </View>

                  <View style={[s.listAvatar, r.is_me && { backgroundColor: '#1848c8' }]}>
                    <Text style={s.listAvatarText}>{r.initials}</Text>
                  </View>

                  <View style={s.listNameContainer}>
                    <Text style={[s.listName, r.is_me && s.listNameMe]}>
                      {r.is_me ? 'You' : r.name}
                    </Text>
                    <Text style={s.listAttempts}>{r.attempts} {r.attempts === 1 ? 'try' : 'tries'}</Text>
                  </View>

                  <Text style={[s.listScoreText, r.is_me && s.listScoreTextMe]}>
                    {r.best_score}%
                  </Text>
                </Pressable>
              );
            })
          )}

          {/* Attempt History - moved here below rankings */}
          <Pressable
            style={[s.historyToggleBtn, { marginTop: 18 }]}
            onPress={() => setShowHistory(!showHistory)}
          >
            <View style={s.historyToggleLeft}>
              <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round">
                <Circle cx="12" cy="12" r="10" />
                <Path d="M12 6v6l4 2" />
              </Svg>
              <Text style={s.historyToggleText}>Your Attempt History</Text>
              <View style={s.historyCountBadge}>
                <Text style={s.historyCountText}>{attemptHistory.length}</Text>
              </View>
            </View>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1848c8" strokeWidth="2.5">
              {showHistory ? <Path d="M18 15l-6-6-6 6" /> : <Path d="M6 9l6 6 6-6" />}
            </Svg>
          </Pressable>

          {showHistory && (
            <View style={s.historyList}>
              {attemptHistory.length === 0 ? (
                <Text style={s.historyEmpty}>No previous attempts found.</Text>
              ) : (
                attemptHistory.map((attempt, index) => (
                  <View key={index} style={s.historyItem}>
                    <Text style={s.historyItemLabel}>Attempt #{attemptHistory.length - index}</Text>
                    <View style={s.historyItemScore}>
                      <Text style={[s.historyItemScoreText, { color: attempt.percentage >= 60 ? '#10B981' : '#EF4444' }]}>
                        {attempt.percentage}%
                      </Text>
                      <Text style={s.historyItemStatus}>
                        {attempt.percentage >= 60 ? '✅ Passed' : '❌ Failed'}
                      </Text>
                    </View>
                    <Text style={s.historyItemDate}>
                      {new Date(attempt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Action buttons at the bottom of Leaderboard - smaller */}
          <View style={s.leaderboardActions}>
            <Pressable style={[s.smallBtn, s.smallGhostBtn]} onPress={() => {
              // FIRST: Reset animation values to initial state
              resultsFadeAnim.setValue(0);
              resultsScaleAnim.setValue(0.85);

              // THEN: Reset all state
              setQuizSubmitted(false);
              setCurrentQuestionIndex(0);
              setSelectedOption(null);
              setQuestionRevealed(false);
              setCurrentScore(0);
              setQuizResult(null);
              setConfettiFired(false);
              setCurrentSlide(0);
              // ✅ Reset refs too
              quizAnswersRef.current = {};
              currentScoreRef.current = 0;

              // Scroll back to top
              resultsScrollRef.current?.scrollTo?.({ y: 0, animated: true });
            }}>
              <RefreshIcon size={14} color="#0f3172" />
              <Text style={s.smallBtnText}>Try Again</Text>
            </Pressable>

            <Pressable style={[s.smallBtn, s.smallPrimaryBtn]} onPress={() => {
              // Get the current XP data from quizResult
              const xpEarned = quizResult?.xpEarned ?? 0;
              const totalXp = quizResult?.totalXp ?? 0;
              const currentLevel = quizResult?.level ?? 1;
              const streakDays = quizResult?.streakDays ?? 0;

              // Calculate previous XP
              const previousXp = totalXp - xpEarned;

              // Get level name and next level XP
              const levelNameMap: Record<number, string> = {
                1: 'Novice Signer', 2: 'Beginner Signer', 3: 'Emerging Signer',
                4: 'Intermediate Signer', 5: 'Advanced Beginner', 6: 'Competent Signer',
                7: 'Proficient Signer', 8: 'Advanced Signer', 9: 'Expert Signer', 10: 'Master Signer',
              };

              const getNextLevelXp = (level: number): number => {
                const thresholds: Record<number, number> = {
                  1: 0, 2: 100, 3: 250, 4: 500, 5: 800,
                  6: 1200, 7: 1700, 8: 2300, 9: 3000, 10: 4000,
                };
                const nextLevel = level + 1;
                return thresholds[nextLevel] || 4000 + ((level - 9) * 1000);
              };

              const levelName = levelNameMap[currentLevel] || 'Novice Signer';
              const nextLevelXp = getNextLevelXp(currentLevel);

              // Reset quiz state
              setQuizSubmitted(false);
              setCurrentQuestionIndex(0);
              setSelectedOption(null);
              setQuestionRevealed(false);
              setCurrentScore(0);
              setQuizResult(null);
              setConfettiFired(false);
              resultsFadeAnim.setValue(0);
              resultsScaleAnim.setValue(0.85);
              setCurrentSlide(0);

              // ─── SIMPLIFIED NAVIGATION: Always show streak page ────────────────────

              console.log('🔍 Navigation Debug:', {
                xpEarned,
                totalXp,
                currentLevel,
                streakDays,
                previousXp,
              });

              // Always go to XP Progress first if XP earned, otherwise go directly to Streak
              if (xpEarned > 0) {
                console.log('➡️ XP Earned -> XP Progress -> Streak');
                router.push({
                  pathname: '/lesson/xp-progress',
                  params: {
                    xpEarned: String(xpEarned),
                    totalXp: String(totalXp),
                    level: String(currentLevel),
                    levelName: levelName,
                    previousXp: String(previousXp),
                    nextLevelXp: String(nextLevelXp),
                    // 🔥 ALWAYS show streak after XP Progress
                    showStreak: 'true',
                    streakDays: String(streakDays),
                  },
                });
              } else {
                // No XP earned - go directly to Streak page
                console.log('➡️ No XP -> Streak page');
                router.push({
                  pathname: '/lesson/streak',
                  params: {
                    streakDays: String(streakDays),
                    xpEarned: String(xpEarned),
                    totalXp: String(totalXp),
                    level: String(currentLevel),
                    levelName: levelName,
                  },
                });
              }
            }}>
              <HomeIcon size={14} color="#fff" />
              <Text style={[s.smallBtnText, { color: '#fff' }]}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderResults = () => {
    const SCREEN_HEIGHT = Dimensions.get('window').height;
    const scoreTranslateY = parallelScrollY.interpolate({
      inputRange: [0, SCREEN_HEIGHT],
      outputRange: [0, -SCREEN_HEIGHT * 0.15],
      extrapolate: 'clamp',
    });
    const scoreOpacity = parallelScrollY.interpolate({
      inputRange: [0, SCREEN_HEIGHT * 0.25, SCREEN_HEIGHT * 0.5],
      outputRange: [1, 0.75, 0],
      extrapolate: 'clamp',
    });
    const scoreScale = parallelScrollY.interpolate({
      inputRange: [0, SCREEN_HEIGHT * 0.5],
      outputRange: [1, 0.95],
      extrapolate: 'clamp',
    });
    const bgColor = parallelScrollY.interpolate({
      inputRange: [0, SCREEN_HEIGHT * 0.4],
      outputRange: ['#eaf5fd', '#1848c8'],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={{ flex: 1, backgroundColor: bgColor }}>
        <Animated.ScrollView
          ref={resultsScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 0 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: parallelScrollY } } }],
            { useNativeDriver: false }
          )}
        >
          {/* Top bar - NO EXIT BUTTON on results page */}
          <View style={[s.topBar, { paddingHorizontal: 16, paddingTop: 8 }]}>
            <Text style={s.logoText}>SEÑAS</Text>
            {/* Exit button removed - users can use the Dashboard button below */}
          </View>

          {/* Score layer — parallax drift + fade */}
          <Animated.View style={{
            paddingHorizontal: 16,
            paddingBottom: 8,
            opacity: scoreOpacity,
            transform: [{ translateY: scoreTranslateY }, { scale: scoreScale }],
          }}>
            {renderScoreView()}
          </Animated.View>

          {/* Leaderboard sheet — rises over the score view */}
          <View style={s.leaderboardSheet}>
            <View style={s.sheetHandle} />
            {renderLeaderboardView()}
          </View>
        </Animated.ScrollView>
      </Animated.View>
    );
  };


  return (
    <SafeAreaView style={[s.container, { backgroundColor: '#eaf5fd' }]}>
      {/* Confetti - NOW AT THE VERY TOP WITH HIGHEST Z-INDEX */}
      {passed && (
        <View style={s.confettiWrapper}>
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
        </View>
      )}

      <ExitModal
        visible={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={handleExit}
      />

      {/* Student Detail Modal */}
      <StudentDetailModal
        visible={showStudentDetail}
        onClose={() => setShowStudentDetail(false)}
        student={selectedStudent}
      />

      {quizSubmitted ? (
        renderResults()
      ) : (
        <ScrollView contentContainerStyle={s.moduleScroll}>
          <View style={s.topBar}>
            <Text style={s.logoText}>SEÑAS</Text>
            <Pressable style={s.exitBtn} onPress={() => setShowExitModal(true)}>
              <Text style={s.exitBtnText}>✕ Exit</Text>
            </Pressable>
          </View>
          {!isQuizSlide ? renderContentSlides() : renderQuiz()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  questionEmojiSmall: {
    fontSize: 28,
    marginBottom: 8,
  },

  // ── Confetti Wrapper ──
  confettiWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'none', // Allow touch events to pass through
    elevation: 9999, // For Android
  },
  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf5fd' },
  loadingInner: { alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, fontWeight: '600', color: '#4B7FCC' },
  errorText: { fontSize: 18, color: '#DC2626', marginBottom: 16, fontWeight: '700' },
  errorBackBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
  errorBackBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },

  // Exit modal
  exitModal: { width: '88%', maxWidth: 340, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 48, elevation: 24 },
  exitIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  exitTitle: { fontSize: 20, fontWeight: '800', color: '#0f3172', marginBottom: 8 },
  exitDesc: { fontSize: 13, color: '#6B7280', fontWeight: '500', lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  exitBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  stayBtn: { flex: 1, paddingVertical: 13, backgroundColor: 'rgba(15,49,114,0.07)', borderWidth: 1, borderColor: 'rgba(15,49,114,0.10)', borderRadius: 40, alignItems: 'center' },
  stayText: { fontSize: 14, fontWeight: '700', color: '#0f3172' },
  exitConfirmBtn: { flex: 1.3, paddingVertical: 13, backgroundColor: '#DC2626', borderRadius: 40, alignItems: 'center', shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
  exitConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Layout
  moduleScroll: { padding: 16, paddingBottom: 60 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  logoText: { color: '#0f3172', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  exitBtn: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' },
  exitBtnText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },

  // Back to Lesson button
  backToLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  backToLessonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1848c8',
  },

  // Glass card
  glassCard: { backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 18, marginBottom: 12, shadowColor: '#0f3172', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 12, elevation: 4 },

  // Module/Content
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moduleBadge: { backgroundColor: 'rgba(15,49,114,0.08)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start', marginBottom: 8 },
  moduleBadgeText: { fontSize: 11, fontWeight: '800', color: '#1848c8', letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#0f3172', marginBottom: 4 },
  heroSub: { fontSize: 12, color: '#4b7bbb', fontWeight: '500' },
  senyaHero: { width: 80, height: 80, flexShrink: 0 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 },
  dot: { height: 8, borderRadius: 99 },
  slideAccent: { height: 4, borderRadius: 4, marginBottom: 14, marginHorizontal: -18, marginTop: -18 },
  slideTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  slideBody: { fontSize: 14, color: '#334155', lineHeight: 22 },
  slideCounter: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 12, textAlign: 'right' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 14 },
  tipLogoSm: { width: 56, height: 56, flexShrink: 0 },
  tipBubble: { flex: 1, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 14, padding: 12 },
  tipBubbleText: { fontSize: 12, color: '#0f3172', fontWeight: '500', lineHeight: 18 },
  navRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flex: 1, backgroundColor: '#1848c8', borderRadius: 60, paddingVertical: 14, alignItems: 'center', shadowColor: '#1848c8', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 18, elevation: 10 },
  goldBtn: { backgroundColor: '#D97706' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  ghostBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 60, paddingVertical: 14, alignItems: 'center' },
  ghostBtnText: { fontSize: 15, fontWeight: '700', color: '#0f3172' },

  // Quiz
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#0f3172' },
  xpBadge: { backgroundColor: 'rgba(245,158,11,0.13)', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  xpText: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  progressDots: { flexDirection: 'row', gap: 4 },
  progressDot: { flex: 1, height: 5, borderRadius: 99 },
  questionCard: { alignItems: 'center', paddingVertical: 24 },
  questionEmoji: { fontSize: 72, marginBottom: 12 },
  questionText: { fontSize: 16, fontWeight: '800', color: '#0f3172', textAlign: 'center', lineHeight: 24 },
  questionMedia: { width: '100%', height: 150, borderRadius: 10, marginTop: 12 },
  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 13, marginBottom: 8 },
  optionCircle: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionLetter: { fontSize: 13, fontWeight: '800' },
  optionText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  feedbackRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginVertical: 12 },
  senyaFeedback: { width: 80, height: 80, flexShrink: 0 },
  feedbackBubble: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 12 },
  feedbackCorrect: { backgroundColor: 'rgba(236,253,245,0.88)', borderColor: '#a7f3d0' },
  feedbackWrong: { backgroundColor: 'rgba(254,242,242,0.88)', borderColor: '#fecaca' },
  feedbackText: { flex: 1, fontSize: 12.5, fontWeight: '500', color: '#0f3172', lineHeight: 18 },

  // Results
  resultsContainer: { gap: 8 },
  resultSenya: { width: 90, height: 90, marginBottom: 4 },
  starsRow: { flexDirection: 'row', gap: 4, marginVertical: 6 },
  star: { fontSize: 28 },
  resultLabel: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  scoreSubtitle: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginBottom: 8 },
  xpEarnedBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 18 },
  xpEarnedText: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  userRankBadge: { marginTop: 6, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 16 },
  userRankText: { fontSize: 14, fontWeight: '700', color: '#D97706' },

  // Rankings / Leaderboard
  rankingsTitle: { fontSize: 17, fontWeight: '800', color: '#0f3172', marginBottom: 10, marginTop: 4 },
  loadingLeaderboard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  loadingLeaderboardText: { fontSize: 14, color: '#6B7280' },
  noRankingsText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingVertical: 20 },

  // History
  historyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  historyToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyToggleText: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
  historyCountBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  historyCountText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  historyList: { backgroundColor: 'rgba(255,255,255,0.62)', borderRadius: 14, padding: 12, marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' },
  historyEmpty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
  historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(15,49,114,0.06)' },
  historyItemLabel: { fontSize: 13, fontWeight: '600', color: '#0f3172' },
  historyItemScore: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyItemScoreText: { fontSize: 14, fontWeight: '800' },
  historyItemStatus: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  historyItemDate: { fontSize: 10, color: '#9CA3AF' },

  // Sub-view: Score View additions
  scoreCircleBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF6FF',
    borderWidth: 5,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreCircleText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1848c8',
  },
  scoreCircleSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Sub-view: Leaderboard View styles
  leaderboardContainer: {
    flex: 1,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  leaderboardHeaderTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  rankBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  rankBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rankBannerNumContainer: {
    minWidth: 48,
    alignItems: 'center',
  },
  rankBannerNum: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FBBF24',
    textShadowColor: 'rgba(251,191,36,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  rankBannerDivider: {
    width: 1.5,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  rankBannerContent: {
    flex: 1,
  },
  rankBannerMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 18,
    flexShrink: 1,
  },

  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: 16,
    paddingBottom: 16,
    height: 240,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  podiumAvatarContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 6,
  },
  crownContainer: {
    position: 'absolute',
    top: -16,
    zIndex: 10,
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarFirst: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
  },
  podiumAvatarInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  podiumAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarPlaceholderText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: 'bold',
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -6,
    right: -4,
    fontSize: 14,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
    width: 80,
  },
  podiumNamePlaceholder: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
    textAlign: 'center',
  },
  podiumScoreBadge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  podiumScoreBadgeGold: {
    backgroundColor: '#FFFBEB',
  },
  podiumScoreBadgePlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  podiumScoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1848c8',
  },
  podiumScoreTextPlaceholder: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.3)',
  },
  podiumBlock: {
    width: '90%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  podiumBlockGold: {
    height: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  podiumBlockSilver: {
    height: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  podiumBlockBronze: {
    height: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.11)',
  },
  podiumBlockNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  leaderboardListCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 30,
    minHeight: 200,
  },
  leaderboardListTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f3172',
    marginBottom: 16,
  },
  leaderboardListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  leaderboardListItemMe: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    marginHorizontal: -12,
  },
  leaderboardListItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  listRankCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  listRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  listAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  listNameContainer: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  listNameMe: {
    fontWeight: '800',
    color: '#1848c8',
  },
  listAttempts: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  listScoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#3B82F6',
  },
  listScoreTextMe: {
    color: '#1848c8',
  },

  // ── Parallax results: sheet + scroll hint ──
  scrollHintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    marginBottom: 0,
  },
  scrollHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scrollHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1848c8',
    letterSpacing: 0.3,
  },
  leaderboardSheet: {
    backgroundColor: '#1848c8',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -8,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginTop: 10,
    marginBottom: 4,
  },

  // ── Leaderboard actions (smaller buttons) ──
  leaderboardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  smallPrimaryBtn: {
    backgroundColor: '#1848c8',
    shadowColor: '#1848c8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  smallGhostBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'rgba(15,30,80,0.08)',
  },
  smallBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f3172',
  },

  // ── Student Detail Modal ──
  studentDetailModal: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 48,
    elevation: 24,
  },
  studentDetailClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  studentDetailAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  studentDetailAvatarMe: {
    backgroundColor: '#1848c8',
    borderColor: '#1848c8',
  },
  studentDetailAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  studentDetailName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f3172',
    marginBottom: 2,
  },
  studentDetailUsername: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  studentDetailDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  studentDetailStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
  },
  studentDetailStat: {
    flex: 1,
    alignItems: 'center',
  },
  studentDetailStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  studentDetailStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f3172',
  },
  studentDetailStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F3F4F6',
  },
  studentDetailNote: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  studentDetailNoteText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
  },
  studentDetailBtn: {
    backgroundColor: '#1848c8',
    borderRadius: 40,
    paddingVertical: 12,
    paddingHorizontal: 48,
    shadowColor: '#1848c8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  studentDetailBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});