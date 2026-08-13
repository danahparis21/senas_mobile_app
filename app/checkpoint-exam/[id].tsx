// app/checkpoint-exam/[id].tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Polyline, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { api } from '../../services/api';
import GesturePractice from '../lesson/GesturePractice';
import DragDropQuestion from '../lesson/DragDropQuestion';
import { useSettings } from '../../contexts/SettingsContext';
import { WebViewMedia } from '../../components/WebViewMedia';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api';
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
const getFullMediaUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  const isVideo = path.toLowerCase().endsWith('.mp4') ||
    path.toLowerCase().endsWith('.webm') ||
    path.toLowerCase().endsWith('.mov');

  if (isVideo) {
    return `${IMAGE_BASE_URL}/video-proxy/${cleanPath}`;
  }

  return `${IMAGE_BASE_URL}/storage/${cleanPath}`;
};


const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QUIZ_RESULT_SOUND = require('../../assets/music/quiz-result.mp3');

// ─── Types ───────────────────────────────────────────────────────────────────
interface QuestionOption {
  text: string;
  image?: string | null;
}
interface DragDropPairRaw {
  left_text?: string;
  right_text?: string;
  left?: string;
  right?: string;
  left_image?: string | null;
  right_image?: string | null;
  match_id?: number;
}
interface Question {
  question_id: number;
  question_number: number;
  question_type: string;
  question_text: string;
  media_url?: string | null;
  points: number;
  options?: QuestionOption[];
  drag_drop_pairs?: DragDropPairRaw[];
  drag_drop_left_label?: string | null;
  drag_drop_right_label?: string | null;
  gesture_data?: { module_id: string | number; gesture_ids: (string | number)[] } | null;
}
interface ExamData {
  exam_id: number;
  title: string;
  description?: string;
  module_id: number;
  module_title?: string;
  total_points: number;
  passing_score: number;
  total_questions: number;
  questions: Question[];
  is_locked: boolean;
  time_limit_minutes?: number; // Add this
}
interface Attempt {
  attempt_id: number;
  score: number;
  total_points: number;
  percentage: number;
  xp_earned: number;
  status: string;
  created_at: string;
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
interface ResultData {
  success: boolean;
  message?: string;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  stars: number;
  xp_earned: number;
  attempt_number: number;
  total_xp: number;
  level: number;
  streak_days: number;
}

// ─── SVG Icons ──────────────────────────────────────────────────────────────
function CheckCircleIcon({ color = '#10B981' }: { color?: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" /><Polyline points="8 12 11 15 16 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function XCircleIcon({ color = '#EF4444' }: { color?: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" /><Line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth="2.5" strokeLinecap="round" /><Line x1="9" y1="9" x2="15" y2="15" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></Svg>;
}
function TrophyIcon({ color = '#fbbf24', size = 40 }: { color?: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><Path d="M4 22h16" /><Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><Path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></Svg>;
}
function HomeIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><Polyline points="9 22 9 12 15 12 15 22" /></Svg>;
}
function RefreshIcon({ size = 15, color = '#2563EB' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><Path d="M23 4v6h-6" /><Path d="M1 20v-6h6" /><Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Svg>;
}

interface PodiumBlockProps { rank: number; height: number; width: number; }
function Podium3DBlock({ rank, height, width }: PodiumBlockProps) {
  const dy = rank === 1 ? 12 : 10;
  const w = width;
  const h = height;
  let topColors = ['#FFFBEB', '#FDE68A'];
  let leftColors = ['#FBBF24', '#D97706'];
  let rightColors = ['#D97706', '#B45309'];
  let glowColor = '#FBBF24';
  if (rank === 2) {
    topColors = ['#F8FAFC', '#CBD5E1']; leftColors = ['#94A3B8', '#64748B']; rightColors = ['#64748B', '#475569']; glowColor = '#94A3B8';
  } else if (rank === 3) {
    topColors = ['#FFEDD5', '#FED7AA']; leftColors = ['#F97316', '#C2410C']; rightColors = ['#C2410C', '#9A3412']; glowColor = '#F97316';
  }
  const gradTopId = `gradTop-${rank}`;
  const gradLeftId = `gradLeft-${rank}`;
  const gradRightId = `gradRight-${rank}`;
  return (
    <View style={{ shadowColor: glowColor, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.75, shadowRadius: 12, elevation: 10, alignItems: 'center' }}>
      <Svg width={w} height={h + 2 * dy} viewBox={`0 0 ${w} ${h + 2 * dy}`}>
        <Defs>
          <LinearGradient id={gradTopId} x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor={topColors[0]} /><Stop offset="100%" stopColor={topColors[1]} /></LinearGradient>
          <LinearGradient id={gradLeftId} x1="0" y1="0" x2="0" y2="1"><Stop offset="0%" stopColor={leftColors[0]} /><Stop offset="100%" stopColor={leftColors[1]} /></LinearGradient>
          <LinearGradient id={gradRightId} x1="0" y1="0" x2="0" y2="1"><Stop offset="0%" stopColor={rightColors[0]} /><Stop offset="100%" stopColor={rightColors[1]} /></LinearGradient>
        </Defs>
        <Path d={`M 0 ${dy} L ${w / 2} ${2 * dy} L ${w / 2} ${h + 2 * dy} L 0 ${h + dy} Z`} fill={`url(#${gradLeftId})`} />
        <Path d={`M ${w / 2} ${2 * dy} L ${w} ${dy} L ${w} ${h + dy} L ${w / 2} ${h + 2 * dy} Z`} fill={`url(#${gradRightId})`} />
        <Path d={`M 0 ${dy} L ${w / 2} 0 L ${w} ${dy} L ${w / 2} ${2 * dy} Z`} fill={`url(#${gradTopId})`} />
        <Path d={`M 0 ${dy} L ${w / 2} ${2 * dy} L ${w} ${dy} L ${w / 2} 0 Z`} stroke={glowColor} strokeWidth="1.5" fill="none" opacity="0.95" />
        <Path d={`M 0 ${dy} L 0 ${h + dy} L ${w / 2} ${h + 2 * dy} L ${w} ${h + dy} L ${w} ${dy}`} stroke={glowColor} strokeWidth="1.5" fill="none" opacity="0.8" />
        <Path d={`M ${w / 2} ${2 * dy} L ${w / 2} ${h + 2 * dy}`} stroke={glowColor} strokeWidth="1.5" fill="none" opacity="0.8" />
      </Svg>
      <View style={{ position: 'absolute', top: dy + (h / 3) - 10, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: rank === 1 ? 34 : 26, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1.5, height: 1.5 }, textShadowRadius: 3 }}>{rank}</Text>
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
          <Text style={s.exitTitle}>Exit Checkpoint Exam?</Text>
          <Text style={s.exitDesc}>Your progress in this attempt will not be saved. Are you sure you want to exit?</Text>
          <View style={s.exitBtns}>
            <Pressable style={s.stayBtn} onPress={onClose}><Text style={s.stayText}>Stay</Text></Pressable>
            <Pressable style={s.exitConfirmBtn} onPress={onConfirm}><Text style={s.exitConfirmText}>Exit</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Student Detail Modal ──────────────────────────────────────────────────
function StudentDetailModal({ visible, onClose, student }: { visible: boolean; onClose: () => void; student: LeaderboardEntry | null }) {
  if (!student) return null;
  const rankEmoji = student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `#${student.rank}`;
  const isPerfect = student.best_score === 100;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.studentDetailModal} onPress={e => e.stopPropagation()}>
          <Pressable style={s.studentDetailClose} onPress={onClose}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5"><Path d="M18 6L6 18M6 6l12 12" /></Svg>
          </Pressable>
          <View style={[s.studentDetailAvatar, student.is_me && s.studentDetailAvatarMe]}>
            <Text style={s.studentDetailAvatarText}>{student.initials}</Text>
          </View>
          <Text style={s.studentDetailName}>{student.is_me ? 'You' : student.name}</Text>
          <Text style={s.studentDetailUsername}>@{student.username}</Text>
          <View style={s.studentDetailDivider} />
          <View style={s.studentDetailStats}>
            <View style={s.studentDetailStat}>
              <Text style={s.studentDetailStatLabel}>Rank</Text>
              <Text style={s.studentDetailStatValue}>{rankEmoji}</Text>
            </View>
            <View style={s.studentDetailStatDivider} />
            <View style={s.studentDetailStat}>
              <Text style={s.studentDetailStatLabel}>Best Score</Text>
              <Text style={[s.studentDetailStatValue, isPerfect && { color: '#F59E0B' }]}>{student.best_score}%</Text>
            </View>
            <View style={s.studentDetailStatDivider} />
            <View style={s.studentDetailStat}>
              <Text style={s.studentDetailStatLabel}>Attempts</Text>
              <Text style={s.studentDetailStatValue}>{student.attempts_to_achieve || student.attempts}</Text>
            </View>
          </View>
          <View style={s.studentDetailNote}>
            <Text style={s.studentDetailNoteText}>
              {student.attempts_to_achieve === 1
                ? '🏆 Achieved this score on their very first try!'
                : student.attempts_to_achieve && student.attempts_to_achieve <= 3
                  ? `⭐ Achieved this score in just ${student.attempts_to_achieve} attempts!`
                  : `📈 Achieved this score after ${student.attempts_to_achieve || student.attempts} attempts`}
            </Text>
          </View>
          <Pressable style={s.studentDetailBtn} onPress={onClose}><Text style={s.studentDetailBtnText}>Close</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Timer Component ──────────────────────────────────────────────────────
function TimerDisplay({
  minutes,
  seconds,
  isWarning,
  isExpired
}: {
  minutes: number;
  seconds: number;
  isWarning: boolean;
  isExpired: boolean;
}) {
  const formatNumber = (num: number) => String(num).padStart(2, '0');
  const color = isExpired ? '#EF4444' : isWarning ? '#DC2626' : '#1848c8';
  const backgroundColor = isExpired ? '#FEE2E2' : isWarning ? '#FEF3C7' : '#EFF6FF';
  const borderColor = isExpired ? '#FCA5A5' : isWarning ? '#FCD34D' : '#BFDBFE';

  return (
    <View style={[s.timerContainer, { backgroundColor, borderColor }]}>
      <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <Circle cx="12" cy="12" r="10" />
        <Polyline points="12 6 12 12 16 14" />
      </Svg>
      <Text style={[s.timerText, { color }]}>
        {formatNumber(minutes)}:{formatNumber(seconds)}
      </Text>
      {isExpired && (
        <View style={s.timerExpiredBadge}>
          <Text style={s.timerExpiredText}>⏰ TIME'S UP!</Text>
        </View>
      )}
    </View>
  );
}

function ExamMedia({ path, style, mediaType = 'quiz' }: {
  path: string | null | undefined;
  style?: any;
  mediaType?: 'content' | 'quiz' | 'option';
}) {
  // ✅ Check if path exists before passing to getFullMediaUrl
  if (!path) return null;

  const mediaUrl = getFullMediaUrl(path);
  const isVideo = path.toLowerCase().endsWith('.mp4') ||
    path.toLowerCase().endsWith('.webm') ||
    path.toLowerCase().endsWith('.mov');

  if (!mediaUrl) return null;

  return (
    <WebViewMedia
      url={mediaUrl}
      isVideo={isVideo}
      caption={''}
      autoplay={true}
      mediaType={mediaType}
      hideControls={mediaType === 'option'}
      style={[s.webViewMedia, style]}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CheckpointExamScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  // 🔒 Mirrors userAnswers synchronously — handleSubmitExam/performSubmission read
  // from this ref instead of the `userAnswers` closure to avoid stale-state bugs
  // when submission is triggered from a setTimeout right after answering
  // (e.g. auto-advance after a drag-drop/gesture question).
  const userAnswersRef = useRef<Record<number, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [confettiFired, setConfettiFired] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false); // 🔒 locks outer ScrollView while a drag-drop box is being dragged

  // ─── Timer State ────────────────────────────────────────────────────────
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // in seconds
  const [isTimerWarning, setIsTimerWarning] = useState(false);
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  const timerRef = useRef<number | null>(null);
  const isTimeUpRef = useRef(false);

  const [attemptHistory, setAttemptHistory] = useState<Attempt[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<LeaderboardEntry | null>(null);
  const [showStudentDetail, setShowStudentDetail] = useState(false);

  const confettiRef = useRef<any>(null);
  const resultsFadeAnim = useRef(new Animated.Value(0)).current;
  const resultsScaleAnim = useRef(new Animated.Value(0.85)).current;
  const parallelScrollY = useRef(new Animated.Value(0)).current;
  const resultsScrollRef = useRef<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (id) {
      loadExam();
      fetchLeaderboard();
    }
  }, [id]);

  // ─── Timer Effect - FIXED ──────────────────────────────────────────────
  useEffect(() => {
    // Don't start timer if no time remaining or already expired
    if (timeRemaining === null || timeRemaining <= 0) {
      return;
    }

    // Clear any existing interval first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const intervalId = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Time's up!
          clearInterval(intervalId);
          timerRef.current = null;

          if (!isTimeUpRef.current) {
            isTimeUpRef.current = true;
            setIsTimerExpired(true);
            handleTimeUp();
          }
          return 0;
        }

        const newTime = prev - 1;
        // Show warning when less than 1 minute (60 seconds) remaining
        if (newTime <= 60 && !isTimerWarning) {
          setIsTimerWarning(true);
        }
        return newTime;
      });
    }, 1000);

    timerRef.current = intervalId;

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeRemaining]);


  // ─── Handle Time Up ────────────────────────────────────────────────────
  const handleTimeUp = useCallback(() => {
    if (submitted || isSubmitting) return;

    Alert.alert(
      '⏰ Time\'s Up!',
      'Your exam time has expired. Your answers will be submitted automatically.',
      [
        {
          text: 'Submit Now',
          onPress: () => {
            setIsTimerExpired(true);
            performSubmission();
          }
        }
      ],
      { cancelable: false }
    );
  }, [submitted, isSubmitting]);

  // ─── Start Timer ────────────────────────────────────────────────────────
  const startTimer = (timeLimitMinutes: number) => {
    if (!timeLimitMinutes || timeLimitMinutes <= 0) {
      // No time limit - don't start timer
      setTimeRemaining(null);
      return;
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const totalSeconds = timeLimitMinutes * 60;
    setTimeRemaining(totalSeconds);
    setIsTimerWarning(false);
    setIsTimerExpired(false);
    isTimeUpRef.current = false;
  };

  // ─── Clean up timer on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const loadExam = async () => {
    try {
      setLoading(true);
      const res = await api.getCheckpointExamById(Number(id));
      console.log('🔍 Full API response:', JSON.stringify(res, null, 2));

      if (res.success && res.exam) {
        setExam(res.exam);
        setAttemptHistory(res.attempts || []);

        // 🔥 Start the timer if there's a time limit
        if (res.exam.time_limit_minutes && res.exam.time_limit_minutes > 0) {
          startTimer(res.exam.time_limit_minutes);
        }
      } else {
        Alert.alert('Error', res.error || 'Failed to load exam details.');
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to connect to server.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const response = await api.getCheckpointExamLeaderboard(Number(id));
      if (response.success) {
        setLeaderboard(response.rankings);
        setUserRank(response.user_rank);
      }
    } catch (error) {
      console.error('Error fetching checkpoint leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const currentQuestion = exam?.questions ? exam.questions[currentIndex] : null;
  const totalQuestions = exam?.questions?.length || 0;
  const currentAnswer = currentQuestion ? userAnswers[currentQuestion.question_id] : null;

  const handleSelectOption = (questionId: number, optionText: string) => {
    setUserAnswers(prev => {
      const next = { ...prev, [questionId]: { question_id: questionId, selected_option_text: optionText } };
      userAnswersRef.current = next;
      return next;
    });
  };

  const handleGestureSuccess = (questionId: number, success: boolean) => {
    setUserAnswers(prev => {
      const next = { ...prev, [questionId]: { question_id: questionId, gesture_success: success } };
      userAnswersRef.current = next;
      return next;
    });
    setTimeout(() => handleNext(), 400);
  };

  const handleDragDropSuccess = (questionId: number, success: boolean) => {
    setUserAnswers(prev => {
      const next = { ...prev, [questionId]: { question_id: questionId, drag_drop_success: success } };
      userAnswersRef.current = next;
      return next;
    });
    setTimeout(() => handleNext(), 400);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleSubmitExam();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const handleSubmitExam = () => {
    if (!exam) return;

    // Don't allow submission if timer expired
    if (isTimerExpired) {
      Alert.alert('⏰ Time\'s Up!', 'Your exam time has expired. Please wait for automatic submission.');
      return;
    }

    const answeredCount = Object.keys(userAnswersRef.current).length;
    if (answeredCount < totalQuestions) {
      Alert.alert(
        'Unanswered Questions',
        `You have answered ${answeredCount} out of ${totalQuestions} questions. Do you still want to submit?`,
        [
          { text: 'Keep Answering', style: 'cancel' },
          { text: 'Submit Anyway', style: 'destructive', onPress: () => performSubmission() },
        ]
      );
    } else {
      performSubmission();
    }
  };

  const performSubmission = async () => {
    if (!exam) return;
    try {
      setIsSubmitting(true);

      // Clear timer on submission
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const formattedAnswers = exam.questions.map(q => {
        const ans = userAnswersRef.current[q.question_id] || {};
        return {
          question_id: q.question_id,
          selected_option_text: ans.selected_option_text ?? null,
          gesture_success: ans.gesture_success ?? null,
          drag_drop_success: ans.drag_drop_success ?? null,
        };
      });

      const res = await api.submitCheckpointExam(exam.exam_id, formattedAnswers);

      if (res.success) {
        setResultData(res);
        setSubmitted(true);
        playResultSound();
        fetchLeaderboard();
        const refreshed = await api.getCheckpointExamById(exam.exam_id);
        if (refreshed.success) setAttemptHistory(refreshed.attempts || []);
      } else {
        Alert.alert('Submission Error', res.error || res.message || 'Could not submit exam.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit exam.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (submitted && resultData) {
      resultsFadeAnim.setValue(0);
      resultsScaleAnim.setValue(0.85);
      Animated.parallel([
        Animated.timing(resultsFadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(resultsScaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start();

      if (resultData.passed && !confettiFired) {
        setTimeout(() => {
          confettiRef.current?.start();
          setConfettiFired(true);
        }, 400);
      }
    }
  }, [submitted, resultData]);

  const playResultSound = async () => {
    if (!settings?.soundEnabled) return;
    try {
      const { sound } = await Audio.Sound.createAsync(QUIZ_RESULT_SOUND, { shouldPlay: true, volume: 0.8 });
      soundRef.current = sound;
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  };

  const resetExam = () => {
    setSubmitted(false);
    setCurrentIndex(0);
    setUserAnswers({});
    setResultData(null);
    setConfettiFired(false);
    setIsTimerExpired(false);
    setIsTimerWarning(false);
    isTimeUpRef.current = false;
    resultsFadeAnim.setValue(0);
    resultsScaleAnim.setValue(0.85);
    resultsScrollRef.current?.scrollTo?.({ y: 0, animated: true });

    // Restart timer if exam has time limit
    if (exam?.time_limit_minutes && exam.time_limit_minutes > 0) {
      startTimer(exam.time_limit_minutes);
    }
  };

  const handleExitPress = () => setShowExitModal(true);
  const handleExit = () => {
    setShowExitModal(false);
    // Clear timer on exit
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    router.back();
  };
  const handleStudentPress = (student: LeaderboardEntry) => { setSelectedStudent(student); setShowStudentDetail(true); };

  // ─── Helper to format timer display ────────────────────────────────────
  const getTimerDisplay = () => {
    if (timeRemaining === null) return null;

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return { minutes, seconds };
  };

  // ─── Memoized DragDropQuestion ─────────────────────────────────────────────
  const renderDragDropQuestion = useMemo(() => {
    if (!currentQuestion || currentQuestion.question_type !== 'drag_drop') {
      return null;
    }

    let pairs = [];

    if (currentQuestion.drag_drop_pairs) {
      if (Array.isArray(currentQuestion.drag_drop_pairs)) {
        pairs = currentQuestion.drag_drop_pairs;
      } else if (typeof currentQuestion.drag_drop_pairs === 'string') {
        try {
          const parsed = JSON.parse(currentQuestion.drag_drop_pairs);
          pairs = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          pairs = [];
        }
      }
    }

    if (pairs.length === 0) {
      return (
        <View style={s.glassCard}>
          <Text style={s.errorText}>No drag and drop pairs found for this question.</Text>
          <Text style={[s.errorText, { fontSize: 12, color: '#6B7280' }]}>Question ID: {currentQuestion.question_id}</Text>
          <Pressable style={s.primaryBtn} onPress={handleNext}>
            <Text style={s.primaryBtnText}>Skip →</Text>
          </Pressable>
        </View>
      );
    }

    const formattedPairs = pairs.map((p, idx) => ({
      left_text: p.left_text ?? p.left ?? '',
      right_text: p.right_text ?? p.right ?? '',
      left_image: p.left_image ?? null,
      right_image: p.right_image ?? null,
      match_id: p.match_id ?? idx,
    }));

    // Use a stable key - only changes when the question changes
    return (
      <DragDropQuestion
        key={`dd-${currentQuestion.question_id}`}
        question={{
          question_id: currentQuestion.question_id,
          question_text: currentQuestion.question_text,
          drag_drop_pairs: formattedPairs,
          drag_drop_left_label: currentQuestion.drag_drop_left_label ?? undefined,
          drag_drop_right_label: currentQuestion.drag_drop_right_label ?? undefined,
          media_url: currentQuestion.media_url,
        }}
        questionIndex={currentIndex}
        totalQuestions={totalQuestions}
        onComplete={(success: boolean) => handleDragDropSuccess(currentQuestion.question_id, success)}
        onBack={handlePrev}
        isExamMode={true}
        onDragActiveChange={setIsDragActive}
      />
    );
  }, [currentQuestion, currentIndex, totalQuestions]);

  // 🔒 Safety net: if a drag gets interrupted (e.g. navigating away mid-drag),
  // make sure the outer ScrollView never stays locked.
  useEffect(() => {
    setIsDragActive(false);
  }, [currentIndex]);




  // ─── Loading / Error ───────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#1848c8" />
        <Text style={s.loadingText}>Loading Checkpoint Exam...</Text>
      </SafeAreaView>
    );
  }

  if (!exam || (!currentQuestion && !submitted)) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <Text style={s.loadingText}>Exam not found.</Text>
        <Pressable style={s.errorBackBtn} onPress={() => router.back()}>
          <Text style={s.errorBackBtnText}>Return to Map</Text>
        </Pressable>
      </SafeAreaView>
    );
  }



  // ─── Render: Question (gesture / drag-drop / multiple choice) ─────────────
  const renderQuestion = () => {
    if (!currentQuestion) return null;

    if (currentQuestion.question_type === 'gesture') {
      let gestureData: any = currentQuestion.gesture_data;

      if (typeof gestureData === 'string') {
        try {
          gestureData = JSON.parse(gestureData);
        } catch (e) {
          gestureData = null;
        }
      }

      let moduleId: string | number | null = null;
      let gestureIds: (string | number)[] = [];

      if (gestureData) {
        moduleId = (gestureData as any).module_id ?? (gestureData as any).moduleId ?? null;
        const ids = (gestureData as any).gesture_ids ?? (gestureData as any).ids ?? [];
        gestureIds = Array.isArray(ids) ? ids : [];
      }

      if (!gestureData || gestureIds.length === 0) {
        console.warn('⚠️ No gesture_data found for question:', currentQuestion.question_id, currentQuestion.gesture_data);
        return (
          <View style={s.glassCard}>
            <Text style={s.errorText}>No gesture data found for this question.</Text>
            <Text style={[s.errorText, { fontSize: 12, color: '#6B7280' }]}>Question ID: {currentQuestion.question_id}</Text>
            <Pressable style={s.primaryBtn} onPress={handleNext}>
              <Text style={s.primaryBtnText}>Skip →</Text>
            </Pressable>
          </View>
        );
      }

      return (
        <GesturePractice
          question={{
            question_id: currentQuestion.question_id,
            question_text: currentQuestion.question_text,
            gesture_data: {
              module_id: String(moduleId),
              gesture_ids: gestureIds.map(gid => String(gid))
            },
            question_number: currentQuestion.question_number || (currentIndex + 1),
          }}
          questionIndex={currentIndex}
          totalQuestions={totalQuestions}
          onComplete={(success: boolean) => handleGestureSuccess(currentQuestion.question_id, success)}
          onBack={handlePrev}
          lessonId={String(exam.exam_id)}
          quizId={exam.exam_id}
        />
      );
    }

    if (currentQuestion.question_type === 'drag_drop') {
      // Use the memoized version
      return renderDragDropQuestion;
    }

    // Multiple choice / True-False
    const progressPct = ((currentIndex + 1) / totalQuestions) * 100;
    return (
      <>
        <View style={s.progressTrack}><View style={[s.progressFill, { width: `${progressPct}%` }]} /></View>

        <View style={s.glassCard}>
          <View style={s.progressHeader}>
            <Text style={s.progressLabel}>Question {currentIndex + 1} of {totalQuestions}</Text>
            <View style={s.pointsBadge}><Text style={s.pointsText}>{currentQuestion.points} pts</Text></View>
          </View>
          <View style={s.progressDots}>
            {exam.questions.map((_, i) => (
              <View key={i} style={[s.progressDot, { backgroundColor: i < currentIndex ? '#22c55e' : i === currentIndex ? '#1848c8' : 'rgba(15,49,114,0.10)' }]} />
            ))}
          </View>
        </View>

        <View style={[s.glassCard, s.questionCard]}>
          <View style={s.typeTag}>
            <Text style={s.typeTagText}>{currentQuestion.question_type === 'true_false' ? 'TRUE / FALSE' : 'MULTIPLE CHOICE'}</Text>
          </View>
          <Text style={s.questionText}>{currentQuestion.question_text}</Text>
          {currentQuestion.media_url && (
            <ExamMedia
              path={currentQuestion.media_url}
              style={s.questionMedia}
              mediaType="quiz"
            />
          )}
        </View>

        <View style={{ gap: 8 }}>
          {currentQuestion.options?.map((opt, i) => {
            const isSel = currentAnswer?.selected_option_text === opt.text;
            return (
              <Pressable
                key={i}
                style={[s.optionCard, isSel && s.optionCardSelected]}
                onPress={() => handleSelectOption(currentQuestion.question_id, opt.text)}
              >
                <View style={[s.optionCircle, isSel && { backgroundColor: '#1848c8' }]}>
                  <Text style={[s.optionLetter, { color: isSel ? '#fff' : '#4b7bbb' }]}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text style={[s.optionText, isSel && s.optionTextSelected]}>{opt.text}</Text>
                {isSel && <CheckCircleIcon color="#1848c8" />}
              </Pressable>
            );
          })}
        </View>
      </>
    );
  };

  // ─── Render: Score view ────────────────────────────────────────────────
  const renderScoreView = () => {
    const score = resultData?.score ?? 0;
    const total = resultData?.total_points ?? 0;
    const pct = resultData?.percentage ?? 0;
    const xpEarned = resultData?.xp_earned ?? 0;
    const stars = resultData?.stars ?? 0;
    const { label, color } =
      pct === 100 ? { label: 'Perfect Score!', color: '#F59E0B' } :
        pct >= 80 ? { label: 'Excellent!', color: '#10B981' } :
          pct >= 60 ? { label: 'Good Job!', color: '#2563EB' } :
            { label: 'Keep Practicing!', color: '#8B5CF6' };

    return (
      <Animated.View style={[s.resultsContainer, { opacity: resultsFadeAnim, transform: [{ scale: resultsScaleAnim }] }]}>
        <View style={[s.glassCard, { alignItems: 'center', paddingVertical: 28 }]}>
          <TrophyIcon color={resultData?.passed ? '#F59E0B' : '#94A3B8'} size={56} />
          <View style={s.scoreCircleBadge}>
            <Text style={s.scoreCircleText}>{pct}%</Text>
            <Text style={s.scoreCircleSub}>Score</Text>
          </View>
          <View style={s.starsRow}>
            {[1, 2, 3].map(i => (
              <Text key={i} style={[s.star, { opacity: i <= stars ? 1 : 0.15, transform: [{ scale: i <= stars ? 1.25 : 1 }] }]}>⭐</Text>
            ))}
          </View>
          <Text style={[s.resultLabel, { color }]}>{label}</Text>
          <Text style={s.scoreSubtitle}>{score} out of {total} points</Text>
          {xpEarned > 0 && (
            <View style={s.xpEarnedBadge}><Text style={s.xpEarnedText}>⚡ +{xpEarned} XP Earned!</Text></View>
          )}
          {userRank && (
            <View style={s.userRankBadge}><Text style={s.userRankText}>🏆 Rank #{userRank} on Leaderboard</Text></View>
          )}
        </View>

        <View style={s.scrollHintContainer}>
          <View style={s.scrollHintPill}>
            <Text style={s.scrollHintText}>👆 Swipe up for the Leaderboard</Text>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1848c8" strokeWidth="2.5" strokeLinecap="round"><Path d="M12 19V5M5 12l7-7 7 7" /></Svg>
          </View>
        </View>
      </Animated.View>
    );
  };

  // ─── Render: Leaderboard + Attempt History ─────────────────────────────
  const renderLeaderboardView = () => {
    const rankings = leaderboard;
    const rest = rankings.slice(3);
    const rank1 = rankings.find(r => r.rank === 1) || null;
    const rank2 = rankings.find(r => r.rank === 2) || null;
    const rank3 = rankings.find(r => r.rank === 3) || null;

    let rankPercentileText = "Complete the exam to see your ranking!";
    let rankNumText = "#—";
    if (userRank && rankings.length > 0) {
      rankNumText = `#${userRank}`;
      const peopleBelow = rankings.length - userRank;
      const percentile = Math.round((peopleBelow / rankings.length) * 100);
      if (userRank === 1) rankPercentileText = `🥇 You're #1! You outscored everyone else!`;
      else if (userRank === 2) rankPercentileText = `🥈 You're #2! You're in the top tier!`;
      else if (userRank === 3) rankPercentileText = `🥉 You're #3! Amazing performance!`;
      else {
        const topPercent = Math.round((userRank / rankings.length) * 100);
        rankPercentileText = topPercent <= 25 ? `📈 You're in the top ${100 - percentile}% — keep pushing!`
          : topPercent <= 50 ? `👏 You're doing better than ${percentile}% of your classmates!`
            : `💪 Keep practicing! You're improving!`;
      }
    } else if (rankings.length > 0) {
      rankPercentileText = "You haven't ranked on this leaderboard yet. Try again!";
    }

    return (
      <View style={s.leaderboardContainer}>
        <View style={s.leaderboardHeader}><Text style={s.leaderboardHeaderTitle}>🏆 Checkpoint Leaderboard</Text></View>

        {userRank ? (
          <View style={s.rankBanner}>
            <View style={s.rankBannerLeft}>
              <View style={s.rankBannerNumContainer}><Text style={s.rankBannerNum}>{rankNumText}</Text></View>
              <View style={s.rankBannerDivider} />
              <View style={s.rankBannerContent}><Text style={s.rankBannerMessage}>{rankPercentileText}</Text></View>
            </View>
          </View>
        ) : (
          <View style={[s.rankBanner, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
            <Text style={[s.rankBannerMessage, { textAlign: 'center', marginBottom: 0 }]}>{rankPercentileText}</Text>
          </View>
        )}

        <View style={s.podiumRow}>
          {[rank2, rank1, rank3].map((entry, colIdx) => {
            const rankNum = colIdx === 0 ? 2 : colIdx === 1 ? 1 : 3;
            const blockStyle = rankNum === 1 ? s.podiumBlockGold : rankNum === 2 ? s.podiumBlockSilver : s.podiumBlockBronze;
            const medal = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : '🥉';
            return (
              <View style={s.podiumCol} key={rankNum}>
                {entry ? (
                  <>
                    <View style={s.podiumAvatarContainer}>
                      {rankNum === 1 && <View style={s.crownContainer}><Text style={{ fontSize: 22 }}>👑</Text></View>}
                      <Pressable onPress={() => handleStudentPress(entry)}>
                        <View style={[s.podiumAvatar, rankNum === 1 && s.podiumAvatarFirst, {
                          borderColor: rankNum === 1 ? '#FBBF24' : rankNum === 2 ? '#E5E7EB' : '#F97316',
                          backgroundColor: rankNum === 1 ? '#F59E0B' : rankNum === 2 ? '#9CA3AF' : '#C2410C',
                        }]}>
                          <Text style={s.podiumAvatarInitials}>{entry.initials}</Text>
                        </View>
                      </Pressable>
                      <Text style={s.podiumBadge}>{medal}</Text>
                    </View>
                    <Text style={[s.podiumName, rankNum === 1 && { fontWeight: '800' }]} numberOfLines={1}>{entry.is_me ? 'You' : entry.name}</Text>
                    <View style={[s.podiumScoreBadge, rankNum === 1 && s.podiumScoreBadgeGold]}>
                      <Text style={[s.podiumScoreText, rankNum === 1 && { color: '#D97706' }]}>{entry.best_score}%</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[s.podiumAvatar, rankNum === 1 && s.podiumAvatarFirst, s.podiumAvatarPlaceholder]}><Text style={s.podiumAvatarPlaceholderText}>—</Text></View>
                    <Text style={s.podiumNamePlaceholder}>TBD</Text>
                    <View style={s.podiumScoreBadgePlaceholder}><Text style={s.podiumScoreTextPlaceholder}>—</Text></View>
                  </>
                )}
                <View style={[s.podiumBlock, blockStyle]}><Text style={s.podiumBlockNumber}>{rankNum}</Text></View>
              </View>
            );
          })}
        </View>

        <View style={s.leaderboardListCard}>
          <Text style={s.leaderboardListTitle}>All Rankings</Text>
          {loadingLeaderboard ? (
            <View style={s.loadingLeaderboard}><ActivityIndicator size="small" color="#1848c8" /><Text style={s.loadingLeaderboardText}>Loading rankings...</Text></View>
          ) : rankings.length === 0 ? (
            <Text style={s.noRankingsText}>No entries yet. Be the first to rank!</Text>
          ) : rest.length === 0 ? (
            <Text style={s.noRankingsText}>Only the top 3 are on the board so far!</Text>
          ) : (
            rest.map((r, index) => (
              <Pressable
                key={r.student_id}
                style={[s.leaderboardListItem, r.is_me && s.leaderboardListItemMe, index < rest.length - 1 && s.leaderboardListItemBorder]}
                onPress={() => handleStudentPress(r)}
              >
                <View style={s.listRankCircle}><Text style={s.listRankText}>{r.rank}</Text></View>
                <View style={[s.listAvatar, r.is_me && { backgroundColor: '#1848c8' }]}><Text style={s.listAvatarText}>{r.initials}</Text></View>
                <View style={s.listNameContainer}>
                  <Text style={[s.listName, r.is_me && s.listNameMe]}>{r.is_me ? 'You' : r.name}</Text>
                  <Text style={s.listAttempts}>{r.attempts} {r.attempts === 1 ? 'try' : 'tries'}</Text>
                </View>
                <Text style={[s.listScoreText, r.is_me && s.listScoreTextMe]}>{r.best_score}%</Text>
              </Pressable>
            ))
          )}

          {/* Attempt History */}
          <Pressable style={[s.historyToggleBtn, { marginTop: 18 }]} onPress={() => setShowHistory(!showHistory)}>
            <View style={s.historyToggleLeft}>
              <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"><Circle cx="12" cy="12" r="10" /><Path d="M12 6v6l4 2" /></Svg>
              <Text style={s.historyToggleText}>Your Attempt History</Text>
              <View style={s.historyCountBadge}><Text style={s.historyCountText}>{attemptHistory.length}</Text></View>
            </View>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1848c8" strokeWidth="2.5">{showHistory ? <Path d="M18 15l-6-6-6 6" /> : <Path d="M6 9l6 6 6-6" />}</Svg>
          </Pressable>

          {showHistory && (
            <View style={s.historyList}>
              {attemptHistory.length === 0 ? (
                <Text style={s.historyEmpty}>No previous attempts found.</Text>
              ) : (
                attemptHistory.map((attempt, index) => (
                  <View key={attempt.attempt_id ?? index} style={s.historyItem}>
                    <Text style={s.historyItemLabel}>Attempt #{attemptHistory.length - index}</Text>
                    <View style={s.historyItemScore}>
                      <Text style={[s.historyItemScoreText, { color: attempt.percentage >= 60 ? '#10B981' : '#EF4444' }]}>{attempt.percentage}%</Text>
                      <Text style={s.historyItemStatus}>{attempt.percentage >= 60 ? '✅ Passed' : '❌ Failed'}</Text>
                    </View>
                    <Text style={s.historyItemDate}>{new Date(attempt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          <View style={s.leaderboardActions}>
            <Pressable style={[s.smallBtn, s.smallGhostBtn]} onPress={resetExam}>
              <RefreshIcon size={14} color="#0f3172" />
              <Text style={s.smallBtnText}>Try Again</Text>
            </Pressable>
            <Pressable style={[s.smallBtn, s.smallPrimaryBtn]} onPress={() => {
              const xpEarned = resultData?.xp_earned ?? 0;
              const totalXp = resultData?.total_xp ?? 0;
              const currentLevel = resultData?.level ?? 1;
              const streakDays = resultData?.streak_days ?? 0;
              const previousXp = totalXp - xpEarned;

              const levelNameMap: Record<number, string> = {
                1: 'Novice Signer', 2: 'Beginner Signer', 3: 'Emerging Signer',
                4: 'Intermediate Signer', 5: 'Advanced Beginner', 6: 'Competent Signer',
                7: 'Proficient Signer', 8: 'Advanced Signer', 9: 'Expert Signer', 10: 'Master Signer',
              };
              const getNextLevelXp = (level: number): number => {
                const thresholds: Record<number, number> = { 1: 0, 2: 100, 3: 250, 4: 500, 5: 800, 6: 1200, 7: 1700, 8: 2300, 9: 3000, 10: 4000 };
                return thresholds[level + 1] || 4000 + ((level - 9) * 1000);
              };
              const levelName = levelNameMap[currentLevel] || 'Novice Signer';
              const nextLevelXp = getNextLevelXp(currentLevel);

              if (xpEarned > 0) {
                router.push({
                  pathname: '/lesson/xp-progress',
                  params: {
                    xpEarned: String(xpEarned), totalXp: String(totalXp), level: String(currentLevel),
                    levelName, previousXp: String(previousXp), nextLevelXp: String(nextLevelXp),
                    showStreak: 'true', streakDays: String(streakDays),
                  },
                });
              } else {
                router.push({
                  pathname: '/lesson/streak',
                  params: { streakDays: String(streakDays), xpEarned: String(xpEarned), totalXp: String(totalXp), level: String(currentLevel), levelName },
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
    const scoreTranslateY = parallelScrollY.interpolate({ inputRange: [0, SCREEN_HEIGHT], outputRange: [0, -SCREEN_HEIGHT * 0.15], extrapolate: 'clamp' });
    const scoreOpacity = parallelScrollY.interpolate({ inputRange: [0, SCREEN_HEIGHT * 0.25, SCREEN_HEIGHT * 0.5], outputRange: [1, 0.75, 0], extrapolate: 'clamp' });
    const scoreScale = parallelScrollY.interpolate({ inputRange: [0, SCREEN_HEIGHT * 0.5], outputRange: [1, 0.95], extrapolate: 'clamp' });
    const bgColor = parallelScrollY.interpolate({ inputRange: [0, SCREEN_HEIGHT * 0.4], outputRange: ['#eaf5fd', '#1848c8'], extrapolate: 'clamp' });

    return (
      <Animated.View style={{ flex: 1, backgroundColor: bgColor }}>
        <Animated.ScrollView
          ref={resultsScrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: parallelScrollY } } }], { useNativeDriver: false })}
        >
          <View style={[s.topBar, { paddingHorizontal: 16, paddingTop: 8 }]}>
            <Text style={s.logoText}>SEÑAS</Text>
          </View>
          <Animated.View style={{ paddingHorizontal: 16, paddingBottom: 8, opacity: scoreOpacity, transform: [{ translateY: scoreTranslateY }, { scale: scoreScale }] }}>
            {renderScoreView()}
          </Animated.View>
          <View style={s.leaderboardSheet}>
            <View style={s.sheetHandle} />
            {renderLeaderboardView()}
          </View>
        </Animated.ScrollView>
      </Animated.View>
    );
  };

  // ─── Timer display for exam header ──────────────────────────────────────
  const timerDisplay = getTimerDisplay();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: '#eaf5fd' }]}>
      {resultData?.passed && (
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

      <ExitModal visible={showExitModal} onClose={() => setShowExitModal(false)} onConfirm={handleExit} />
      <StudentDetailModal visible={showStudentDetail} onClose={() => setShowStudentDetail(false)} student={selectedStudent} />

      {submitted ? (
        renderResults()
      ) : (
        <ScrollView
          contentContainerStyle={s.moduleScroll}
          scrollEnabled={!isDragActive}
        >
          <View style={s.topBar}>
            <Text style={s.logoText}>SEÑAS</Text>
            <View style={s.topBarRight}>
              {/* Timer display */}
              {timerDisplay && (
                <TimerDisplay
                  minutes={timerDisplay.minutes}
                  seconds={timerDisplay.seconds}
                  isWarning={isTimerWarning}
                  isExpired={isTimerExpired}
                />
              )}
              <Pressable style={s.exitBtn} onPress={handleExitPress}>
                <Text style={s.exitBtnText}>✕ Exit</Text>
              </Pressable>
            </View>
          </View>
          <View style={s.examHeroRow}>
            <TrophyIcon color="#D97706" size={28} />
            <Text style={s.examTitle} numberOfLines={1}>{exam.title}</Text>
          </View>
          {isTimerExpired && (
            <View style={s.timeUpBanner}>
              <Text style={s.timeUpBannerText}>⏰ Time's Up! Your exam is being submitted...</Text>
            </View>
          )}
          {renderQuestion()}

          {currentQuestion && (currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false') && (
            <View style={s.navRow}>
              <Pressable style={[s.ghostBtn, currentIndex === 0 && { opacity: 0.4 }]} onPress={handlePrev} disabled={currentIndex === 0 || isTimerExpired}>
                <Text style={s.ghostBtnText}>◀ Previous</Text>
              </Pressable>
              {currentIndex < totalQuestions - 1 ? (
                <Pressable style={[s.primaryBtn, (!currentAnswer || isTimerExpired) && { opacity: 0.5 }]} onPress={handleNext} disabled={!currentAnswer || isTimerExpired}>
                  <Text style={s.primaryBtnText}>Next Question →</Text>
                </Pressable>
              ) : (
                <Pressable style={[s.primaryBtn, s.goldBtn, isTimerExpired && { opacity: 0.5 }]} onPress={handleSubmitExam} disabled={isSubmitting || isTimerExpired}>
                  {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.primaryBtnText}>Submit Exam 🏆</Text>}
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  confettiWrapper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, pointerEvents: 'none', elevation: 9999 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf5fd', gap: 12 },
  loadingText: { fontSize: 15, fontWeight: '600', color: '#4B7FCC' },
  errorText: { fontSize: 18, color: '#DC2626', marginBottom: 16, fontWeight: '700' },
  errorBackBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
  errorBackBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },

  exitModal: { width: '88%', maxWidth: 340, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 48, elevation: 24 },
  exitIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  exitTitle: { fontSize: 20, fontWeight: '800', color: '#0f3172', marginBottom: 8 },
  exitDesc: { fontSize: 13, color: '#6B7280', fontWeight: '500', lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  exitBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  stayBtn: { flex: 1, paddingVertical: 13, backgroundColor: 'rgba(15,49,114,0.07)', borderWidth: 1, borderColor: 'rgba(15,49,114,0.10)', borderRadius: 40, alignItems: 'center' },
  stayText: { fontSize: 14, fontWeight: '700', color: '#0f3172' },
  exitConfirmBtn: { flex: 1.3, paddingVertical: 13, backgroundColor: '#DC2626', borderRadius: 40, alignItems: 'center', shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
  exitConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  moduleScroll: { padding: 16, paddingBottom: 60 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { color: '#0f3172', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  exitBtn: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' },
  exitBtnText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },

  examHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  examTitle: { flex: 1, fontSize: 19, fontWeight: '800', color: '#0f3172' },

  // ─── Timer Styles ──────────────────────────────────────────────────────
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1.5 },
  timerText: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timerExpiredBadge: { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  timerExpiredText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  timeUpBanner: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FCA5A5' },
  timeUpBannerText: { fontSize: 14, fontWeight: '700', color: '#DC2626', textAlign: 'center' },

  glassCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255,255,255,0.72)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 12,
      },
      android: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(215, 235, 252, 0.8)',
        elevation: 3,
      },
    }),
  },

  progressTrack: { height: 6, backgroundColor: 'rgba(15,49,114,0.08)', borderRadius: 99, width: '100%', marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1848c8' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#0f3172' },
  pointsBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  pointsText: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  progressDots: { flexDirection: 'row', gap: 4 },
  progressDot: { flex: 1, height: 5, borderRadius: 99 },

  questionCard: { alignItems: 'center', paddingVertical: 24 },
  typeTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(24,72,200,0.10)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  typeTagText: { fontSize: 11, fontWeight: '800', color: '#1848c8', letterSpacing: 0.5 },
  questionText: { fontSize: 16, fontWeight: '800', color: '#0f3172', textAlign: 'center', lineHeight: 24 },
  questionMedia: { width: '100%', height: 150, borderRadius: 10, marginTop: 12 },

  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, minHeight: 56 },
  optionCardSelected: { borderColor: '#93C5FD', backgroundColor: 'rgba(239,246,255,0.9)' },
  optionCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(15,49,114,0.08)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionLetter: { fontSize: 13, fontWeight: '800' },
  optionText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#334155', lineHeight: 20 },
  optionTextSelected: { color: '#1D4ED8', fontWeight: '700' },

  navRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  primaryBtn: { flex: 1, backgroundColor: '#1848c8', borderRadius: 60, paddingVertical: 14, alignItems: 'center', shadowColor: '#1848c8', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 18, elevation: 10 },
  goldBtn: { backgroundColor: '#D97706' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  ghostBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 60, paddingVertical: 14, alignItems: 'center' },
  ghostBtnText: { fontSize: 15, fontWeight: '700', color: '#0f3172' },

  resultsContainer: { gap: 8 },
  starsRow: { flexDirection: 'row', gap: 4, marginVertical: 6 },
  star: { fontSize: 28 },
  resultLabel: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  scoreSubtitle: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginBottom: 8 },
  xpEarnedBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 18 },
  xpEarnedText: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  userRankBadge: { marginTop: 6, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 16 },
  userRankText: { fontSize: 14, fontWeight: '700', color: '#D97706' },

  scoreCircleBadge: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFF6FF', borderWidth: 5, borderColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginVertical: 10, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  scoreCircleText: { fontSize: 26, fontWeight: '900', color: '#1848c8' },
  scoreCircleSub: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

  loadingLeaderboard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  loadingLeaderboardText: { fontSize: 14, color: '#6B7280' },
  noRankingsText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingVertical: 20 },

  historyToggleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EFF6FF', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#BFDBFE' },
  historyToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyToggleText: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
  historyCountBadge: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  historyCountText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  historyList: { backgroundColor: 'rgba(255,255,255,0.62)', borderRadius: 14, padding: 12, marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' },
  historyEmpty: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
  historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(15,49,114,0.06)' },
  historyItemLabel: { fontSize: 13, fontWeight: '600', color: '#0f3172' },
  historyItemScore: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyItemScoreText: { fontSize: 14, fontWeight: '800' },
  historyItemStatus: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  historyItemDate: { fontSize: 10, color: '#9CA3AF' },

  leaderboardContainer: { flex: 1 },
  leaderboardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  leaderboardHeaderTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 0.5 },
  rankBanner: { marginHorizontal: 20, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  rankBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rankBannerNumContainer: { minWidth: 48, alignItems: 'center' },
  rankBannerNum: { fontSize: 28, fontWeight: '900', color: '#FBBF24', textShadowColor: 'rgba(251,191,36,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  rankBannerDivider: { width: 1.5, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  rankBannerContent: { flex: 1 },
  rankBannerMessage: { fontSize: 13, fontWeight: '600', color: '#fff', lineHeight: 18, flexShrink: 1 },

  podiumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginHorizontal: 16, paddingBottom: 16, height: 240 },
  podiumCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  podiumAvatarContainer: { position: 'relative', alignItems: 'center', marginBottom: 6 },
  crownContainer: { position: 'absolute', top: -16, zIndex: 10 },
  podiumAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  podiumAvatarFirst: { width: 60, height: 60, borderRadius: 30, borderWidth: 3 },
  podiumAvatarInitials: { fontSize: 14, fontWeight: '800', color: '#fff' },
  podiumAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  podiumAvatarPlaceholderText: { fontSize: 16, color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' },
  podiumBadge: { position: 'absolute', bottom: -6, right: -4, fontSize: 14 },
  podiumName: { fontSize: 12, fontWeight: '700', color: '#fff', marginTop: 4, textAlign: 'center', width: 80 },
  podiumNamePlaceholder: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginTop: 4, textAlign: 'center' },
  podiumScoreBadge: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  podiumScoreBadgeGold: { backgroundColor: '#FFFBEB' },
  podiumScoreBadgePlaceholder: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  podiumScoreText: { fontSize: 10, fontWeight: '800', color: '#1848c8' },
  podiumScoreTextPlaceholder: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },
  podiumBlock: { width: '90%', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  podiumBlockGold: { height: 110, backgroundColor: 'rgba(255,255,255,0.28)' },
  podiumBlockSilver: { height: 85, backgroundColor: 'rgba(255,255,255,0.18)' },
  podiumBlockBronze: { height: 65, backgroundColor: 'rgba(255,255,255,0.11)' },
  podiumBlockNumber: { fontSize: 24, fontWeight: '900', color: '#fff' },

  leaderboardListCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 30, minHeight: 200 },
  leaderboardListTitle: { fontSize: 16, fontWeight: '800', color: '#0f3172', marginBottom: 16 },
  leaderboardListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  leaderboardListItemMe: { backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 12, marginHorizontal: -12 },
  leaderboardListItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  listRankCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  listRankText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  listAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listAvatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  listNameContainer: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  listNameMe: { fontWeight: '800', color: '#1848c8' },
  listAttempts: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  listScoreText: { fontSize: 15, fontWeight: '800', color: '#3B82F6' },
  listScoreTextMe: { color: '#1848c8' },

  scrollHintContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 12, paddingBottom: 16, marginBottom: 0 },
  scrollHintPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', shadowColor: '#0f3172', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  scrollHintText: { fontSize: 13, fontWeight: '700', color: '#1848c8', letterSpacing: 0.3 },
  leaderboardSheet: { backgroundColor: '#1848c8', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -8, paddingBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.22, shadowRadius: 24, elevation: 20, overflow: 'hidden' },
  sheetHandle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)', marginTop: 10, marginBottom: 4 },

  leaderboardActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  smallBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  smallPrimaryBtn: { backgroundColor: '#1848c8', shadowColor: '#1848c8', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  smallGhostBtn: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: 'rgba(15,30,80,0.08)' },
  smallBtnText: { fontSize: 13, fontWeight: '700', color: '#0f3172' },

  studentDetailModal: { width: '85%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 28, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 48, elevation: 24 },
  studentDetailClose: { position: 'absolute', top: 16, right: 16, padding: 4 },
  studentDetailAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 12, borderWidth: 3, borderColor: '#E5E7EB' },
  studentDetailAvatarMe: { backgroundColor: '#1848c8', borderColor: '#1848c8' },
  studentDetailAvatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  studentDetailName: { fontSize: 20, fontWeight: '800', color: '#0f3172', marginBottom: 2 },
  studentDetailUsername: { fontSize: 13, fontWeight: '500', color: '#9CA3AF', marginBottom: 16 },
  studentDetailDivider: { width: '100%', height: 1, backgroundColor: '#F3F4F6', marginBottom: 16 },
  studentDetailStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 16 },
  studentDetailStat: { flex: 1, alignItems: 'center' },
  studentDetailStatLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  studentDetailStatValue: { fontSize: 20, fontWeight: '900', color: '#0f3172' },
  studentDetailStatDivider: { width: 1, height: 32, backgroundColor: '#F3F4F6' },
  studentDetailNote: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, width: '100%', marginBottom: 16 },
  studentDetailNoteText: { fontSize: 13, fontWeight: '500', color: '#4B5563', textAlign: 'center', lineHeight: 18 },
  studentDetailBtn: { backgroundColor: '#1848c8', borderRadius: 40, paddingVertical: 12, paddingHorizontal: 48, shadowColor: '#1848c8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
  studentDetailBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  webViewMedia: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
});