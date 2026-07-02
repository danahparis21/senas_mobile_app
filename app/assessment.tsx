import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Polyline } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

// ─── Check Icon ──────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <View style={styles.checkIconWrapper}>
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  </View>
);

// ─── Question Options ──────────────────────────────────────────────────────
const familiarityOptions = [
  {
    label: "I've never tried it",
    value: "Beginner",
    icon: require('../assets/images/img/never.png'),
    emoji: '🌱',
  },
  {
    label: "I know a few signs",
    value: "Beginner",
    icon: require('../assets/images/img/few.png'),
    emoji: '👋',
  },
  {
    label: "I can hold basic conversations",
    value: "Intermediate",
    icon: require('../assets/images/img/conversation.png'),
    emoji: '💬',
  },
  {
    label: "I am quite experienced",
    value: "Advanced",
    icon: require('../assets/images/img/experienced.png'),
    emoji: '🌟',
  },
];

const goalOptions = [
  {
    label: "Alphabet & Numbers",
    value: "Alphabet_Numbers",
    icon: require('../assets/images/img/alphabet.png'),
    emoji: '🔤',
  },
  {
    label: "Greetings & Basic Phrases",
    value: "Greetings",
    icon: require('../assets/images/img/greet.png'),
    emoji: '👋',
  },
  {
    label: "Classroom Words",
    value: "Classroom_Words",
    icon: require('../assets/images/img/classroom.png'),
    emoji: '📚',
  },
  {
    label: "Everything!",
    value: "Everything",
    icon: require('../assets/images/img/everything.png'),
    emoji: '🌟',
  },
];

const timeOptions = [
  {
    label: "5–10 minutes",
    value: "5_10_min",
    icon: require('../assets/images/img/time.png'),
    emoji: '⏱️',
  },
  {
    label: "15–20 minutes",
    value: "15_20_min",
    icon: require('../assets/images/img/time.png'),
    emoji: '⌛',
  },
  {
    label: "30 minutes",
    value: "30_min",
    icon: require('../assets/images/img/time.png'),
    emoji: '⏳',
  },
  {
    label: "1 hour or more",
    value: "1_hour_plus",
    icon: require('../assets/images/img/time.png'),
    emoji: '🔥',
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Assessment() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [studentLevel, setStudentLevel] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [showLevelScreen, setShowLevelScreen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const getQuestions = () => {
    if (studentLevel) {
      return [
        {
          title: "What do you mainly want to learn?",
          subtitle: "Pick what interests you most",
          options: goalOptions,
          key: 'learning_goal',
          emoji: '🎯',
          senyaMessage: "What sparks your curiosity? ✨",
        },
        {
          title: "How much time can you practice daily?",
          subtitle: "Choose what fits your schedule",
          options: timeOptions,
          key: 'practice_time',
          emoji: '⏰',
          senyaMessage: "Consistency is key! 🏆",
        },
      ];
    } else {
      return [
        {
          title: "How familiar are you with Filipino Sign Language?",
          subtitle: "Choose the option that best describes you",
          options: familiarityOptions,
          key: 'fsl_level',
          emoji: '🤔',
          senyaMessage: "Let's find your perfect level! 🌟",
        },
        {
          title: "What do you mainly want to learn?",
          subtitle: "Pick what interests you most",
          options: goalOptions,
          key: 'learning_goal',
          emoji: '🎯',
          senyaMessage: "What sparks your curiosity? ✨",
        },
        {
          title: "How much time can you practice daily?",
          subtitle: "Choose what fits your schedule",
          options: timeOptions,
          key: 'practice_time',
          emoji: '⏰',
          senyaMessage: "Consistency is key! 🏆",
        },
      ];
    }
  };

  const assessmentQuestions = getQuestions();
  const totalQuestions = assessmentQuestions.length;

  useEffect(() => {
    const checkStudentLevel = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          setStudentName(user.student?.first_name || 'Student');
          const level = user.student?.fsl_mastery_level || null;
          setStudentLevel(level);
          if (level) {
            setAnswers(prev => ({ ...prev, fsl_level: level }));
          }
          try {
            const response = await api.getLearningPath();
            if (response && response.learning_path && response.learning_path.is_completed) {
              router.replace('/(tabs)/dashboard');
              return;
            }
          } catch (error) {
            console.log('No learning path found yet');
          }
        }
      } catch (error) {
        console.error('Error checking student level:', error);
      } finally {
        setLoading(false);
      }
    };
    checkStudentLevel();
  }, []);

  const currentQuestion = assessmentQuestions[step];
  const progress = ((step + 1) / totalQuestions) * 100;

  const selectOption = (index: number) => {
    setSelected(index);
    const option = currentQuestion.options[index];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.key]: option.value
    }));
  };

  const next = () => {
    if (selected === null) return;
    if (step < totalQuestions - 1) {
      setStep(step + 1);
      setSelected(null);
    } else {
      saveLearningPath();
    }
  };

  const back = () => {
    if (step > 0) {
      setStep(step - 1);
      const prevKey = assessmentQuestions[step - 1].key;
      const prevAnswer = answers[prevKey];
      if (prevAnswer) {
        const prevOptions = assessmentQuestions[step - 1].options;
        const prevIndex = prevOptions.findIndex(opt => opt.value === prevAnswer);
        setSelected(prevIndex >= 0 ? prevIndex : null);
      } else {
        setSelected(null);
      }
    } else {
      Alert.alert(
        'Skip Assessment?',
        'You will use the default learning path. You can always complete this later in your profile.',
        [
          { text: 'Continue Assessment', style: 'cancel' },
          { text: 'Skip to Dashboard', onPress: () => router.replace('/(tabs)/dashboard') }
        ]
      );
    }
  };

  const saveLearningPath = async () => {
    setSaving(true);
    try {
      const learningPathData = {
        fsl_level: studentLevel || answers.fsl_level || 'Beginner',
        learning_goal: answers.learning_goal || 'Everything',
        practice_time: answers.practice_time || '30_min',
      };

      await api.saveLearningPath(learningPathData);

      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.student) {
          user.student.fsl_mastery_level = learningPathData.fsl_level;
          await AsyncStorage.setItem('userData', JSON.stringify(user));
        }
      }

      setShowCompletion(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save your learning path. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  // ─── Assigned Level Screen ──────────────────────────────────────────────
  if (studentLevel && !showLevelScreen) {
    const levelColors: Record<string, string> = {
      Beginner: '#10B981',
      Intermediate: '#8B5CF6',
      Advanced: '#F59E0B',
    };
    const levelEmojis: Record<string, string> = {
      Beginner: '🌱',
      Intermediate: '📈',
      Advanced: '🚀',
    };

    return (
      <SafeAreaView style={styles.assignedContainer}>
        <Animated.View style={[styles.assignedCard, { opacity: fadeAnim }]}>
          <View style={[styles.assignedIconWrapper, { backgroundColor: levelColors[studentLevel] + '15' }]}>
            <Text style={styles.assignedEmoji}>{levelEmojis[studentLevel] || '🌟'}</Text>
          </View>

          <Text style={styles.assignedTitle}>Your Teacher Assigned You</Text>
          <View style={[styles.levelBadge, { backgroundColor: levelColors[studentLevel] }]}>
            <Text style={styles.levelBadgeText}>{studentLevel}</Text>
          </View>

          <Text style={styles.assignedSubtitle}>
            {studentName}, you've been assigned to the{' '}
            <Text style={[styles.highlightText, { color: levelColors[studentLevel] }]}>
              {studentLevel}
            </Text>{' '}
            level. Ready to start your learning journey?
          </Text>

          <View style={styles.assignedActions}>
            <Pressable
              style={[styles.startLearningBtn, { backgroundColor: levelColors[studentLevel] }]}
              onPress={() => router.replace('/(tabs)/dashboard')}
            >
              <Text style={styles.startLearningText}>🚀 Start Learning</Text>
            </Pressable>

            <Pressable
              style={styles.takeAssessmentBtn}
              onPress={() => {
                setShowLevelScreen(true);
                setStep(0);
                setSelected(null);
                setAnswers(prev => ({ ...prev, fsl_level: studentLevel }));
              }}
            >
              <Text style={styles.takeAssessmentText}>Take Assessment to Confirm</Text>
            </Pressable>
          </View>

          <View style={styles.assignedSenyaContainer}>
            <Image
              source={require('../assets/images/img/senya_teaching.png')}
              style={styles.assignedSenya}
              contentFit="contain"
            />
            <View style={styles.assignedSpeechBubble}>
              <Text style={styles.assignedSpeechText}>You've got this! 💪</Text>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ─── Completion Screen ──────────────────────────────────────────────────
  if (showCompletion) {
    const level = studentLevel || answers.fsl_level || 'Beginner';
    const levelColors: Record<string, string> = {
      Beginner: '#10B981',
      Intermediate: '#8B5CF6',
      Advanced: '#F59E0B',
    };

    return (
      <SafeAreaView style={styles.completionContainer}>
        <Animated.View style={[styles.completionCard, { opacity: fadeAnim }]}>
          <View style={[styles.completionIconWrapper, { backgroundColor: levelColors[level] }]}>
            <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <Polyline points="22 4 12 14.01 9 11.01" />
            </Svg>
          </View>

          <Text style={styles.completionTitle}>🎉 Learning Path Set!</Text>
          <Text style={styles.completionSubtitle}>
            We've created a personalized learning path for you.
          </Text>

          <View style={styles.completionSummary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>📊 Your Level</Text>
              <View style={[styles.summaryLevelBadge, { backgroundColor: levelColors[level] + '20' }]}>
                <Text style={[styles.summaryValue, { color: levelColors[level] }]}>{level}</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>🎯 Learning Goal</Text>
              <Text style={styles.summaryValue}>
                {answers.learning_goal?.replace('_', ' ') || 'Everything'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>⏰ Practice Time</Text>
              <Text style={styles.summaryValue}>
                {answers.practice_time?.replace('_', ' ').replace('_', '–') || '30 minutes'}
              </Text>
            </View>
          </View>

          <View style={styles.completionSenyaRow}>
            <Image
              source={require('../assets/images/img/senya_blue.png')}
              style={styles.completionSenya}
              contentFit="contain"
            />
            <View style={styles.completionSpeechBubble}>
              <Text style={styles.completionSpeechText}>I'm so excited for you! 🥳</Text>
            </View>
          </View>

          <Pressable
            style={[styles.startBtn, { backgroundColor: levelColors[level] }]}
            onPress={() => router.replace('/(tabs)/dashboard')}
          >
            <Text style={styles.startBtnText}>🚀 Start Learning</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ─── Assessment Flow ────────────────────────────────────────────────────
  const currentOptions = currentQuestion.options;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backBtn} onPress={back}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f3172" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M19 12H5" />
              <Path d="M12 19l-7-7 7-7" />
            </Svg>
          </Pressable>

          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressTextLeft}>
                Question {step + 1} of {totalQuestions}
              </Text>
              <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>
            {currentQuestion.emoji} {currentQuestion.title}
          </Text>
          <Text style={styles.subtitle}>{currentQuestion.subtitle}</Text>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Senya mascot */}
        <View style={styles.senyaContainer}>
          <Image
            source={require('../assets/images/img/senya_teaching.png')}
            style={styles.senyaMascot}
            contentFit="contain"
          />
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>
              {currentQuestion.senyaMessage || "Let's learn together! 🌟"}
            </Text>
          </View>
        </View>

        <View style={styles.optionsContainer}>
          {currentOptions.map((option, index) => {
            const isSelected = selected === index;

            return (
              <Pressable
                key={index}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => selectOption(index)}
              >
                <View style={styles.optionIconBox}>
                  <Image source={option.icon} style={styles.optionIcon} contentFit="contain" />
                </View>

                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </View>

                {isSelected && <CheckIcon />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.nextBtn, selected === null && styles.nextBtnDisabled]}
          onPress={next}
          disabled={selected === null || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.nextBtnText}>
              {step < totalQuestions - 1 ? 'Next Question →' : '🎉 Complete Setup'}
            </Text>
          )}
        </Pressable>

        {studentLevel && showLevelScreen && (
          <Pressable style={styles.skipAssessmentBtn} onPress={() => router.replace('/(tabs)/dashboard')}>
            <Text style={styles.skipAssessmentText}>Skip Assessment</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F6FF',
  },

  // ─── Loading ────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F0F6FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },

  // ─── Header ─────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  progressTextLeft: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280'
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6'
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 99,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 99
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f3172',
    lineHeight: 28,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },

  // ─── Scroll Content ─────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },

  // ─── Senya Mascot ──────────────────────────────────────────────────────
  senyaContainer: {
    alignItems: 'center',
    paddingVertical: 8
  },
  senyaMascot: {
    width: 70,
    height: 70
  },
  speechBubble: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    borderBottomRightRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  speechText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f3172'
  },

  // ─── Options ────────────────────────────────────────────────────────────
  optionsContainer: {
    gap: 10,
    marginTop: 4
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.06)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIcon: {
    width: 30,
    height: 30
  },
  optionTextContainer: {
    flex: 1
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E'
  },
  optionTextSelected: {
    color: '#1E4F8A'
  },
  checkIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  // ─── Footer ─────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8
  },
  nextBtn: {
    width: '100%',
    padding: 15,
    borderRadius: 60,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  nextBtnDisabled: {
    backgroundColor: 'rgba(59,130,246,0.4)',
    shadowOpacity: 0
  },
  nextBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700'
  },

  // ─── Skip Assessment ────────────────────────────────────────────────────
  skipAssessmentBtn: {
    marginTop: 10,
    padding: 8
  },
  skipAssessmentText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500'
  },

  // ─── Assigned Level Screen ─────────────────────────────────────────────
  assignedContainer: {
    flex: 1,
    backgroundColor: '#F0F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  assignedCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
  },
  assignedIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  assignedEmoji: {
    fontSize: 32
  },
  assignedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f3172',
    marginBottom: 12
  },
  levelBadge: {
    paddingVertical: 8,
    paddingHorizontal: 32,
    borderRadius: 28,
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  levelBadgeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  assignedSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  highlightText: {
    fontWeight: '700'
  },
  assignedActions: {
    width: '100%',
    gap: 10
  },
  startLearningBtn: {
    paddingVertical: 14,
    borderRadius: 60,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  startLearningText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700'
  },
  takeAssessmentBtn: {
    paddingVertical: 12,
    borderRadius: 60,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    backgroundColor: 'transparent',
  },
  takeAssessmentText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600'
  },
  assignedSenyaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  assignedSenya: {
    width: 44,
    height: 44
  },
  assignedSpeechBubble: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    borderBottomLeftRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  assignedSpeechText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f3172'
  },

  // ─── Completion Screen ──────────────────────────────────────────────────
  completionContainer: {
    flex: 1,
    backgroundColor: '#F0F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  completionCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
  },
  completionIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  completionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f3172',
    marginBottom: 4
  },
  completionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  completionSummary: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    gap: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.04)'
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500'
  },
  summaryLevelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 10
  },
  summaryValue: {
    fontSize: 14,
    color: '#0f3172',
    fontWeight: '700'
  },
  completionSenyaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  completionSenya: {
    width: 48,
    height: 48
  },
  completionSpeechBubble: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    borderBottomLeftRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  completionSpeechText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f3172'
  },
  startBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 60,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  startBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700'
  },
});