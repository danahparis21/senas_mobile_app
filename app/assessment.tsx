import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Polyline, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const CheckIcon = () => (
  <View style={styles.checkIconWrapper}>
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  </View>
);

// Question 1: FSL Familiarity (maps to level)
const familiarityOptions = [
  {
    label: "I've never tried it",
    value: "Beginner",
    icon: require('../assets/images/img/never.png'),
  },
  {
    label: "I know a few signs",
    value: "Beginner",
    icon: require('../assets/images/img/few.png'),
  },
  {
    label: "I can hold basic conversations",
    value: "Intermediate",
    icon: require('../assets/images/img/conversation.png'),
  },
  {
    label: "I am quite experienced",
    value: "Advanced",
    icon: require('../assets/images/img/experienced.png'),
  },
];

// Question 2: Learning Goals
const goalOptions = [
  {
    label: "Alphabet & Numbers",
    value: "Alphabet_Numbers",
    icon: require('../assets/images/img/alphabet.png'),
  },
  {
    label: "Greetings & Basic Phrases",
    value: "Greetings",
    icon: require('../assets/images/img/greet.png'),
  },
  {
    label: "Classroom Words",
    value: "Classroom_Words",
    icon: require('../assets/images/img/classroom.png'),
  },
  {
    label: "Everything!",
    value: "Everything",
    icon: require('../assets/images/img/everything.png'),
  },
];

// Question 3: Practice Time
const timeOptions = [
  {
    label: "5–10 minutes",
    value: "5_10_min",
    icon: require('../assets/images/img/time.png'),
  },
  {
    label: "15–20 minutes",
    value: "15_20_min",
    icon: require('../assets/images/img/time.png'),
  },
  {
    label: "30 minutes",
    value: "30_min",
    icon: require('../assets/images/img/time.png'),
  },
  {
    label: "1 hour or more",
    value: "1_hour_plus",
    icon: require('../assets/images/img/time.png'),
  },
];

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

  // Determine which questions to show based on whether student has a level
  const getQuestions = () => {
    // If student has a level, skip question 1 (fsl_level)
    if (studentLevel) {
      // Questions 2 and 3 only
      return [
        {
          title: "What do you mainly want to learn?",
          subtitle: "What interests you the most?",
          options: goalOptions,
          key: 'learning_goal'
        },
        {
          title: "How much time can you practice daily?",
          subtitle: "Be realistic about your schedule",
          options: timeOptions,
          key: 'practice_time'
        },
      ];
    } else {
      // All 3 questions
      return [
        {
          title: "How familiar are you with Filipino Sign Language?",
          subtitle: "Choose the option that best describes you",
          options: familiarityOptions,
          key: 'fsl_level'
        },
        {
          title: "What do you mainly want to learn?",
          subtitle: "What interests you the most?",
          options: goalOptions,
          key: 'learning_goal'
        },
        {
          title: "How much time can you practice daily?",
          subtitle: "Be realistic about your schedule",
          options: timeOptions,
          key: 'practice_time'
        },
      ];
    }
  };

  // Get the current questions based on student level
  const assessmentQuestions = getQuestions();
  const totalQuestions = assessmentQuestions.length;

  // Check if student already has a level
  useEffect(() => {
    const checkStudentLevel = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          setStudentName(user.student?.first_name || 'Student');

          // Check if fsl_mastery_level exists
          const level = user.student?.fsl_mastery_level || null;
          console.log('📊 Student level from storage:', level);
          setStudentLevel(level);

          // If student has a level, pre-fill the answer
          if (level) {
            setAnswers(prev => ({
              ...prev,
              fsl_level: level
            }));
          }

          // ✅ NEW: Check if learning path already exists and is completed
          try {
            const response = await api.getLearningPath();
            if (response && response.learning_path && response.learning_path.is_completed) {
              console.log('✅ Learning path already completed, redirecting to dashboard');
              // Redirect to dashboard immediately
              router.replace('/(tabs)/dashboard');
              return;
            }
          } catch (error) {
            console.log('No learning path found yet, continuing to assessment');
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

  // Select an option
  const selectOption = (index: number) => {
    setSelected(index);
    const option = currentQuestion.options[index];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.key]: option.value
    }));
  };

  // Go to next question or complete
  const next = () => {
    if (selected === null) return;

    if (step < totalQuestions - 1) {
      setStep(step + 1);
      setSelected(null);
    } else {
      // All questions answered - save learning path
      saveLearningPath();
    }
  };

  // Go back to previous question
  const back = () => {
    if (step > 0) {
      setStep(step - 1);
      // Restore previous selection
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
      // At first question - ask if they want to skip
      Alert.alert(
        'Skip Assessment?',
        'You will use the default learning path. You can always complete this later in your profile.',
        [
          {
            text: 'Continue Assessment',
            style: 'cancel'
          },
          {
            text: 'Skip to Dashboard',
            onPress: () => router.replace('/(tabs)/dashboard')
          }
        ]
      );
    }
  };

  // Save learning path to database
  const saveLearningPath = async () => {
    setSaving(true);
    try {
      // Prepare data for API
      const learningPathData = {
        // If student has a level, use it from storage, otherwise use the answer
        fsl_level: studentLevel || answers.fsl_level || 'Beginner',
        learning_goal: answers.learning_goal || 'Everything',
        practice_time: answers.practice_time || '30_min',
      };

      console.log('📤 Saving learning path:', learningPathData);

      // Save to database via API
      await api.saveLearningPath(learningPathData);

      // Also update local storage
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.student) {
          user.student.fsl_mastery_level = learningPathData.fsl_level;
          await AsyncStorage.setItem('userData', JSON.stringify(user));
        }
      }

      // Show completion
      setShowCompletion(true);

    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to save your learning path. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Show completion screen
  if (showCompletion) {
    return (
      <SafeAreaView style={styles.completionContainer}>
        <View style={styles.completionCard}>
          <View style={styles.completionIconWrapper}>
            <Svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <Polyline points="22 4 12 14.01 9 11.01" />
            </Svg>
          </View>

          <Text style={styles.completionTitle}>🎉 Learning Path Set!</Text>
          <Text style={styles.completionSubtitle}>
            We've created a personalized learning path for you based on your answers.
          </Text>

          <View style={styles.completionSummary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Your Level</Text>
              <Text style={styles.summaryValue}>{studentLevel || answers.fsl_level || 'Beginner'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Learning Goal</Text>
              <Text style={styles.summaryValue}>
                {answers.learning_goal?.replace('_', ' ') || 'Everything'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Practice Time</Text>
              <Text style={styles.summaryValue}>
                {answers.practice_time?.replace('_', ' ').replace('_', '–') || '30 minutes'}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.startBtn}
            onPress={() => router.replace('/(tabs)/dashboard')}
          >
            <Text style={styles.startBtnText}>Start Learning →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Scenario 1: Student already has a level assigned by teacher
  // AND they haven't clicked "Take Assessment to Confirm"
  if (studentLevel && !showLevelScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.assignedContainer}>
          <View style={styles.assignedCard}>
            <View style={styles.assignedIconWrapper}>
              <Svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1E4F8A" strokeWidth="1.5">
                <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </Svg>
            </View>

            <Text style={styles.assignedTitle}>Your Teacher Assigned You</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{studentLevel}</Text>
            </View>

            <Text style={styles.assignedSubtitle}>
              {studentName}, you've been assigned to the <Text style={styles.highlightText}>{studentLevel}</Text> level.
              {'\n'}Ready to start your learning journey?
            </Text>

            <View style={styles.assignedActions}>
              <Pressable
                style={styles.startLearningBtn}
                onPress={() => router.replace('/(tabs)/dashboard')}
              >
                <Text style={styles.startLearningText}>Start Learning →</Text>
              </Pressable>

              <Pressable
                style={styles.takeAssessmentBtn}
                onPress={() => {
                  // Go to the assessment flow
                  console.log('🔄 Taking assessment to confirm...');
                  setShowLevelScreen(true);
                  setStep(0);
                  setSelected(null);
                  // Keep the level in answers
                  setAnswers(prev => ({
                    ...prev,
                    fsl_level: studentLevel
                  }));
                }}
              >
                <Text style={styles.takeAssessmentText}>Take Assessment to Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E4F8A" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }

  // Assessment flow - Shows when:
  // 1. Student has no level assigned (studentLevel === null) OR
  // 2. Student clicked "Take Assessment to Confirm" (showLevelScreen === true)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backBtn} onPress={back}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressTextLeft}>
                {studentLevel ? 'Question' : 'Question'} {step + 1} of {totalQuestions}
              </Text>
              <View style={styles.progressPctBadge}>
                <Text style={styles.progressPctText}>{Math.round(progress)}%</Text>
              </View>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>

        {/* Show level badge if student has one */}
        {studentLevel && (
          <View style={styles.levelBadgeSmall}>
            <Text style={styles.levelBadgeSmallText}>Level: {studentLevel}</Text>
          </View>
        )}

        <Text style={styles.title}>{currentQuestion.title}</Text>
        <Text style={styles.subtitle}>{currentQuestion.subtitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.senyaContainer}>
          <Image source={require('../assets/images/img/senya_magnify.png')} style={styles.senyaMascot} contentFit="contain" />
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>Take your time! 😊</Text>
          </View>
        </View>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <Pressable
              key={index}
              style={[styles.optionCard, selected === index && styles.optionCardSelected]}
              onPress={() => selectOption(index)}
            >
              {option.icon && (
                <View style={styles.optionIconBox}>
                  <Image source={option.icon} style={styles.optionIcon} contentFit="contain" />
                </View>
              )}
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionText, selected === index && styles.optionTextSelected]}>
                  {option.label}
                </Text>
              </View>
              {selected === index && <CheckIcon />}
            </Pressable>
          ))}
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
              {step < totalQuestions - 1 ? 'Next Question →' : 'Complete Setup ✅'}
            </Text>
          )}
        </Pressable>

        {/* Show "Skip" button only if they already have a level */}
        {studentLevel && showLevelScreen && (
          <Pressable
            style={styles.skipAssessmentBtn}
            onPress={() => {
              Alert.alert(
                'Skip Assessment?',
                'Your level will remain as assigned by your teacher.',
                [
                  {
                    text: 'Continue Assessment',
                    style: 'cancel'
                  },
                  {
                    text: 'Skip to Dashboard',
                    onPress: () => router.replace('/(tabs)/dashboard')
                  }
                ]
              );
            }}
          >
            <Text style={styles.skipAssessmentText}>Skip Assessment</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFE' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  // Header styles
  header: { paddingHorizontal: 24, paddingTop: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backBtnText: { fontSize: 18, fontWeight: '500' },
  progressContainer: { flex: 1 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressTextLeft: { fontSize: 12, fontWeight: '500', color: '#888' },
  progressPctBadge: { backgroundColor: '#EFF6FF', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 20 },
  progressPctText: { color: '#1E4F8A', fontWeight: '500', fontSize: 11 },
  progressBarTrack: { height: 6, backgroundColor: '#EAECF0', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', lineHeight: 28, marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', fontWeight: '400' },

  // Senya mascot
  senyaContainer: { alignItems: 'center', paddingVertical: 16 },
  senyaMascot: { width: 90, height: 90 },
  speechBubble: {
    position: 'absolute',
    top: 8,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    borderBottomRightRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10
  },
  speechText: { fontSize: 13, fontWeight: '500', color: '#555' },

  // Options
  optionsContainer: { gap: 12, marginTop: 8 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: '#1E4F8A',
    backgroundColor: 'rgba(30,79,138,0.06)',
  },
  optionIconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIcon: { width: 40, height: 40 },
  optionTextContainer: { flex: 1 },
  optionText: { fontSize: 15, fontWeight: '500', color: '#1A1A2E' },
  optionTextSelected: { color: '#1E4F8A' },
  checkIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer buttons
  footer: { paddingHorizontal: 24, paddingBottom: 20, paddingTop: 10 },
  nextBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 60,
    backgroundColor: '#1E4F8A',
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: 'rgba(30, 79, 138, 0.4)' },
  nextBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },

  // Loading state
  loadingContainer: { flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#666' },

  // Assigned level screen
  assignedContainer: {
    flex: 1,
    backgroundColor: '#F8FAFE',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  assignedCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  assignedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 79, 138, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  assignedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: '#1E4F8A',
    paddingVertical: 8,
    paddingHorizontal: 32,
    borderRadius: 30,
    marginBottom: 16,
  },
  levelBadgeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  assignedSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  highlightText: {
    color: '#1E4F8A',
    fontWeight: '700',
  },
  assignedActions: {
    width: '100%',
    gap: 12,
  },
  startLearningBtn: {
    backgroundColor: '#1E4F8A',
    paddingVertical: 14,
    borderRadius: 60,
    alignItems: 'center',
  },
  startLearningText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  takeAssessmentBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E4F8A',
  },
  takeAssessmentText: {
    color: '#1E4F8A',
    fontSize: 14,
    fontWeight: '500',
  },

  // Completion screen
  completionContainer: {
    flex: 1,
    backgroundColor: '#F8FAFE',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  completionCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  completionIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  completionSummary: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  startBtn: {
    backgroundColor: '#1E4F8A',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 60,
    alignItems: 'center',
  },
  startBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  skipAssessmentBtn: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  skipAssessmentText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  levelBadgeSmall: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  levelBadgeSmallText: {
    color: '#1E4F8A',
    fontSize: 12,
    fontWeight: '600',
  },

});