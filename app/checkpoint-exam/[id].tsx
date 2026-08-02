// app/checkpoint-exam/[id].tsx
import React, { useState, useEffect, useRef } from 'react';
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
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { api } from '../../services/api';
import GesturePractice from '../lesson/GesturePractice';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api';
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QUIZ_RESULT_SOUND = require('../../assets/music/quiz-result.mp3');

interface QuestionOption {
  text: string;
  image?: string | null;
}

interface Question {
  question_id: number;
  question_number: number;
  question_type: string;
  question_text: string;
  media_url?: string | null;
  points: number;
  options?: QuestionOption[];
  drag_drop_pairs?: Array<{ left: string; right: string; left_image?: string; right_image?: string }>;
  gesture_data?: any;
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
}

export default function CheckpointExamScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Store answers locally per question
  // { [question_id]: { question_id, selected_option_text, gesture_success, drag_drop_matches } }
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});

  // Drag drop temporary selection state for current question
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Sound ref
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (id) {
      loadExam();
    }
  }, [id]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const res = await api.getCheckpointExamById(Number(id));
      if (res.success && res.exam) {
        setExam(res.exam);
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

  const currentQuestion = exam?.questions ? exam.questions[currentIndex] : null;
  const totalQuestions = exam?.questions?.length || 0;

  // Handle Option Select for Multiple Choice / True-False (Without immediate correct/wrong evaluation!)
  const handleSelectOption = (questionId: number, optionText: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        selected_option_text: optionText,
      },
    }));
  };

  // Handle Drag & Drop Match
  const handleDragDropPair = (questionId: number, leftVal: string, rightVal: string) => {
    const existing = userAnswers[questionId]?.drag_drop_matches || [];
    const updated = [...existing.filter((m: any) => m.left !== leftVal), { left: leftVal, right: rightVal }];
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        drag_drop_matches: updated,
      },
    }));
    setSelectedLeft(null);
  };

  const handleClearDragMatch = (questionId: number, leftVal: string) => {
    const existing = userAnswers[questionId]?.drag_drop_matches || [];
    const updated = existing.filter((m: any) => m.left !== leftVal);
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        drag_drop_matches: updated,
      },
    }));
  };

  // Handle Gesture Result
  const handleGestureSuccess = (questionId: number, success: boolean) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        gesture_success: success,
      },
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedLeft(null);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setSelectedLeft(null);
    }
  };

  // Submit Exam
  const handleSubmitExam = async () => {
    if (!exam) return;

    // Check if any question remains unanswered
    const answeredCount = Object.keys(userAnswers).length;
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
      const formattedAnswers = exam.questions.map((q) => {
        const ans = userAnswers[q.question_id] || {};
        return {
          question_id: q.question_id,
          selected_option_text: ans.selected_option_text || null,
          gesture_success: ans.gesture_success ?? null,
          drag_drop_matches: ans.drag_drop_matches || null,
        };
      });

      const res = await api.submitCheckpointExam(exam.exam_id, formattedAnswers);

      if (res.success) {
        setResultData(res);
        setShowResultModal(true);
        playResultSound();
      } else {
        Alert.alert('Submission Error', res.error || res.message || 'Could not submit exam.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit exam.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const playResultSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(QUIZ_RESULT_SOUND);
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  };

  const handleExitPress = () => {
    Alert.alert(
      'Exit Checkpoint Exam?',
      'Are you sure you want to exit? Your progress in this exam attempt will not be saved.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={styles.loadingText}>Loading Checkpoint Exam...</Text>
      </SafeAreaView>
    );
  }

  if (!exam || !currentQuestion) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Exam not found.</Text>
        <Pressable style={styles.exitBtn} onPress={() => router.back()}>
          <Text style={styles.exitBtnText}>Return to Map</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const currentAnswer = userAnswers[currentQuestion.question_id];
  const progressPct = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={handleExitPress}>
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5">
            <Line x1="18" y1="6" x2="6" y2="18" />
            <Line x1="6" y1="6" x2="18" y2="18" />
          </Svg>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            🏆 {exam.title}
          </Text>
          <Text style={styles.headerSubtitle}>
            Question {currentIndex + 1} of {totalQuestions}
          </Text>
        </View>

        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{currentQuestion.points} pts</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Question Text */}
        <View style={styles.questionCard}>
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>
              {currentQuestion.question_type === 'multiple_choice' && 'MULTIPLE CHOICE'}
              {currentQuestion.question_type === 'true_false' && 'TRUE / FALSE'}
              {currentQuestion.question_type === 'drag_drop' && 'DRAG & DROP MATCH'}
              {currentQuestion.question_type === 'gesture' && 'SIGN LANGUAGE GESTURE'}
            </Text>
          </View>

          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

          {currentQuestion.media_url && (
            <Image
              source={{
                uri: currentQuestion.media_url.startsWith('http')
                  ? currentQuestion.media_url
                  : `${IMAGE_BASE_URL}/${currentQuestion.media_url.replace(/^\//, '')}`,
              }}
              style={styles.questionMedia}
              contentFit="contain"
            />
          )}
        </View>

        {/* Answer Options according to question type */}

        {/* 1. Multiple Choice / True False */}
        {(currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false') && (
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map((opt, idx) => {
              const isSelected = currentAnswer?.selected_option_text === opt.text;
              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => handleSelectOption(currentQuestion.question_id, opt.text)}
                >
                  <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                    {isSelected && <View style={styles.optionRadioInner} />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {opt.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* 2. Drag & Drop Matching */}
        {currentQuestion.question_type === 'drag_drop' && currentQuestion.drag_drop_pairs && (
          <View style={styles.dragDropContainer}>
            <Text style={styles.dragDropHint}>Tap an item on the left, then tap its match on the right:</Text>

            <View style={styles.matchingGrid}>
              {/* Left Column */}
              <View style={styles.matchColumn}>
                {currentQuestion.drag_drop_pairs.map((pair, idx) => {
                  const isSelected = selectedLeft === pair.left;
                  const matchObj = (currentAnswer?.drag_drop_matches || []).find((m: any) => m.left === pair.left);
                  return (
                    <Pressable
                      key={idx}
                      style={[
                        styles.matchCard,
                        isSelected && styles.matchCardSelected,
                        matchObj && styles.matchCardDone,
                      ]}
                      onPress={() => setSelectedLeft(pair.left)}
                    >
                      <Text style={styles.matchCardText}>{pair.left}</Text>
                      {matchObj && (
                        <Pressable
                          style={styles.removeMatchBtn}
                          onPress={() => handleClearDragMatch(currentQuestion.question_id, pair.left)}
                        >
                          <Text style={styles.removeMatchBtnText}>✕</Text>
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Right Column */}
              <View style={styles.matchColumn}>
                {currentQuestion.drag_drop_pairs.map((pair, idx) => {
                  const matchFound = (currentAnswer?.drag_drop_matches || []).some((m: any) => m.right === pair.right);
                  return (
                    <Pressable
                      key={idx}
                      style={[
                        styles.matchCardRight,
                        matchFound && styles.matchCardRightUsed,
                      ]}
                      onPress={() => {
                        if (selectedLeft) {
                          handleDragDropPair(currentQuestion.question_id, selectedLeft, pair.right);
                        } else {
                          Alert.alert('Tip', 'Select an item from the left column first!');
                        }
                      }}
                    >
                      <Text style={styles.matchCardText}>{pair.right}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* List current matched pairs */}
            {currentAnswer?.drag_drop_matches?.length > 0 && (
              <View style={styles.matchedPairsList}>
                <Text style={styles.matchedPairsTitle}>Matched Pairs:</Text>
                {currentAnswer.drag_drop_matches.map((m: any, idx: number) => (
                  <Text key={idx} style={styles.matchedPairItem}>
                    • {m.left} ➔ {m.right}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 3. Gesture Practice */}
        {currentQuestion.question_type === 'gesture' && (
          <View style={styles.gestureContainer}>
            <GesturePractice
              question={{
                question_id: currentQuestion.question_id,
                question_text: currentQuestion.question_text,
                gesture_data: {
                  module_id: String(currentQuestion.gesture_data?.module_id || exam.module_id || 1),
                  gesture_ids: currentQuestion.gesture_data?.gesture_ids || ['1'],
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
            {currentAnswer?.gesture_success !== undefined && (
              <View style={styles.gestureRecordedBadge}>
                <Text style={styles.gestureRecordedText}>
                  {currentAnswer.gesture_success ? '✅ Gesture Completed!' : '⚠️ Attempt Recorded'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
        >
          <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
            ◀ Previous
          </Text>
        </Pressable>

        {currentIndex < totalQuestions - 1 ? (
          <Pressable style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>Next Question ▶</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.submitBtn} onPress={handleSubmitExam} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Exam 🏆</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Result Celebration Modal */}
      <Modal visible={showResultModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.resultCard}>
            {resultData?.passed && (
              <ConfettiCannon count={80} origin={{ x: SCREEN_WIDTH / 2, y: 0 }} fallSpeed={2500} fadeOut />
            )}

            <Text style={styles.resultEmoji}>{resultData?.passed ? '🏆' : '📚'}</Text>

            <Text style={styles.resultTitle}>
              {resultData?.passed ? 'Exam Passed!' : 'Exam Completed'}
            </Text>

            <Text style={styles.resultSubTitle}>
              {resultData?.message || (resultData?.passed ? 'Great job! You did awesome!' : 'Keep practicing!')}
            </Text>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3].map((starNum) => {
                const isEarned = resultData?.stars >= starNum;
                return (
                  <Text key={starNum} style={[styles.starIcon, isEarned ? styles.starEarned : styles.starDim]}>
                    ★
                  </Text>
                );
              })}
            </View>

            {/* Score pill */}
            <View style={styles.scorePill}>
              <Text style={styles.scorePillText}>
                Score: {resultData?.score ?? 0} / {resultData?.total_points ?? 0} ({resultData?.percentage ?? 0}%)
              </Text>
            </View>

            {/* XP Award */}
            {resultData?.xp_earned > 0 && (
              <View style={styles.xpAwardBox}>
                <Text style={styles.xpAwardText}>⚡ +{resultData.xp_earned} XP Earned!</Text>
              </View>
            )}

            <Pressable
              style={styles.finishBtn}
              onPress={() => {
                setShowResultModal(false);
                router.replace('/(tabs)/lessons');
              }}
            >
              <Text style={styles.finishBtnText}>Return to Lesson Map</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  pointsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 26,
  },
  questionMedia: {
    width: '100%',
    height: 180,
    marginTop: 14,
    borderRadius: 12,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  optionCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionRadioSelected: {
    borderColor: '#2563EB',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  optionTextSelected: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  dragDropContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  dragDropHint: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  matchingGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  matchColumn: {
    flex: 1,
    gap: 10,
  },
  matchCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchCardSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  matchCardDone: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  matchCardRight: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  matchCardRightUsed: {
    opacity: 0.5,
  },
  matchCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  removeMatchBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  removeMatchBtnText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  matchedPairsList: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  matchedPairsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  matchedPairItem: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 4,
  },
  gestureContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
  },
  gestureRecordedBadge: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  gestureRecordedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  navBtnTextDisabled: {
    color: '#94A3B8',
  },
  nextBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#2563EB',
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  exitBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2563EB',
    borderRadius: 12,
  },
  exitBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 54,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  resultSubTitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  starIcon: {
    fontSize: 38,
  },
  starEarned: {
    color: '#F59E0B',
  },
  starDim: {
    color: '#CBD5E1',
  },
  scorePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  scorePillText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  xpAwardBox: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 20,
  },
  xpAwardText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#D97706',
  },
  finishBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    alignItems: 'center',
  },
  finishBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
