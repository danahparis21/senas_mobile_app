import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  Alert,
  Animated,
  Easing,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ChevronLeft,
  Sprout,
  Hand,
  MessageCircle,
  Star,
  Type,
  Waves,
  BookOpen,
  Sparkles,
  Timer,
  Clock,
  Hourglass,
  Flame,
  Rocket,
  TrendingUp,
  Target,
  BarChart3,
  Check,
  ArrowRight,
  ChevronRight,
} from 'lucide-react-native';
import { api } from '../services/api';
import { useLocalSearchParams } from 'expo-router';

// ─── Design Tokens ───────────────────────────────────────────────────────────
// Palette lifted from the reference: a bright sky-blue wash melting into white,
// near-black headlines, soft grey body copy.
const SCREEN_PAD = 24;
const CARD_MAX_W = 420;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const palette = {
  skyDeep: '#0A84FF',
  sky: '#12B0FF',
  skyLight: '#5CD1FF',
  skyMist: '#D8F1FF',
  skyWash: '#F1FAFF',
  white: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: 'rgba(10,132,255,0.10)',
  tint: 'rgba(18,176,255,0.10)',
  tintStrong: 'rgba(18,176,255,0.20)',
  textPrimary: '#0B1420',
  textSecondary: '#6B7A8C',
  textMuted: '#9AA8B6',
  success: '#28C99A',
  warning: '#FFB020',
};

const levelColors: Record<string, string> = {
  Beginner: palette.success,
  Intermediate: palette.sky,
  Advanced: palette.warning,
};

// Senya mascot artwork
const SENYA_IMG = require('../assets/images/img/senya_blue.png');

// ─── Screen background ───────────────────────────────────────────────────────
// Sky gradient at the top fading to white, exactly like the reference shot.
function ScreenBackground({ intensity = 'soft' }: { intensity?: 'soft' | 'bold' }) {
  const colors =
    intensity === 'bold'
      ? ([palette.skyDeep, palette.sky, palette.skyMist, palette.white] as const)
      : ([palette.skyMist, palette.skyWash, palette.white] as const);

  return (
    <LinearGradient
      colors={colors}
      locations={intensity === 'bold' ? [0, 0.28, 0.62, 1] : [0, 0.4, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}


// ─── Senya ───────────────────────────────────────────────────────────────────
// Mascot with a layered glow. Breathes at rest, squashes + pops when she
// absorbs an answer, and orbits a dashed halo while she is thinking.
const SenyaCharacter = React.forwardRef<
  View,
  { size?: number; pulseKey?: number; thinking?: boolean }
>(function SenyaCharacter({ size = 128, pulseKey = 0, thinking = false }, ref) {
  const breathe = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const squish = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.5)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (!thinking) return;
    ringRotate.setValue(0);
    const loop = Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [thinking]);

  // "Absorb" reaction
  useEffect(() => {
    if (pulseKey === 0) return;
    Animated.sequence([
      Animated.timing(squish, { toValue: 0.88, duration: 110, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(squish, { toValue: 1, friction: 4, tension: 150, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.16, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 1, friction: 4.5, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [pulseKey]);

  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const floatY = breathe.interpolate({ inputRange: [0, 1], outputRange: [3, -5] });
  const spin = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View ref={ref} collapsable={false} style={{ width: size * 1.6, height: size * 1.6, alignItems: 'center', justifyContent: 'center' }}>
      {/* outer glow */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size * 1.55,
          height: size * 1.55,
          borderRadius: size,
          backgroundColor: 'rgba(18,176,255,0.16)',
          opacity: glow,
          transform: [{ scale: glow.interpolate({ inputRange: [0.5, 1], outputRange: [0.95, 1.08] }) }],
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size * 1.12,
          height: size * 1.12,
          borderRadius: size,
          backgroundColor: 'rgba(92,209,255,0.28)',
        }}
      />
      {thinking && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * 1.42,
            height: size * 1.42,
            borderRadius: size,
            borderWidth: 2,
            borderColor: 'rgba(10,132,255,0.35)',
            borderStyle: 'dashed',
            transform: [{ rotate: spin }],
          }}
        />
      )}
      <Animated.View
        style={{
          transform: [{ translateY: floatY }, { scale: Animated.multiply(Animated.multiply(breatheScale, bounce), squish) }],
        }}
      >
        <Image source={SENYA_IMG} style={{ width: size, height: size, resizeMode: 'contain' }} />
      </Animated.View>
    </View>
  );
});

// ─── Option card ─────────────────────────────────────────────────────────────
function AnimatedOptionCard({
  option,
  index,
  isSelected,
  hidden,
  onPress,
}: {
  option: { label: string; value: string; Icon: any };
  index: number;
  isSelected: boolean;
  hidden: boolean;
  onPress: (measure: { x: number; y: number; width: number; height: number }) => void;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const cardRef = useRef<View>(null);
  const Icon = option.Icon;

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      delay: index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option.label]);

  const onPressIn = () => Animated.spring(pressScale, { toValue: 0.97, friction: 6, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();

  const handlePress = () => {
    cardRef.current?.measureInWindow((x, y, width, height) => onPress({ x, y, width, height }));
  };

  return (
    <Animated.View
      style={{
        opacity: hidden ? 0 : entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          { scale: pressScale },
        ],
      }}
    >
      <Pressable onPress={handlePress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View ref={cardRef} collapsable={false} style={[styles.optionCard, isSelected && styles.optionCardSelected]}>
          <View style={[styles.optionIconBox, isSelected && styles.optionIconBoxSelected]}>
            <Icon size={20} color={isSelected ? palette.white : palette.sky} strokeWidth={2.3} />
          </View>
          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
          <View style={[styles.optionCheck, isSelected && styles.optionCheckOn]}>
            {isSelected && <Check size={12} color={palette.white} strokeWidth={3.2} />}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Flying answer (the card Senya absorbs) ──────────────────────────────────
function FlyingAnswer({
  from,
  to,
  option,
  onDone,
}: {
  from: { x: number; y: number; width: number; height: number };
  to: { x: number; y: number };
  option: { label: string; Icon: any };
  onDone: () => void;
}) {
  const t = useRef(new Animated.Value(0)).current;
  const Icon = option.Icon;

  const startCx = from.x + from.width / 2;
  const startCy = from.y + from.height / 2;
  const dx = to.x - startCx;
  const dy = to.y - startCy;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(t, { toValue: 0.14, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(t, { toValue: 1, duration: 560, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => finished && onDone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateX = t.interpolate({ inputRange: [0, 0.14, 1], outputRange: [0, 0, dx] });
  const translateY = t.interpolate({ inputRange: [0, 0.14, 1], outputRange: [0, -12, dy] });
  const scale = t.interpolate({ inputRange: [0, 0.14, 0.7, 1], outputRange: [1, 1.05, 0.5, 0.1] });
  const opacity = t.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 0.9, 0] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-10deg'] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: from.x,
        top: from.y,
        width: from.width,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }, { rotate }],
      }}
    >
      <View style={[styles.optionCard, styles.optionCardSelected]}>
        <View style={[styles.optionIconBox, styles.optionIconBoxSelected]}>
          <Icon size={20} color={palette.white} strokeWidth={2.3} />
        </View>
        <Text style={[styles.optionText, styles.optionTextSelected]} numberOfLines={1}>
          {option.label}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Primary button ──────────────────────────────────────────────────────────
function PrimaryButton({
  label,
  onPress,
  disabled,
  icon: Icon = ArrowRight,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: any;
}) {
  if (disabled) {
    return (
      <View style={[styles.primaryBtn, styles.primaryBtnDisabled]}>
        <Text style={styles.primaryBtnTextDisabled}>{label}</Text>
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      <LinearGradient
        colors={[palette.skyLight, palette.sky, palette.skyDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>{label}</Text>
        <Icon size={17} color={palette.white} strokeWidth={2.6} style={{ marginLeft: 8 }} />
      </LinearGradient>
    </Pressable>
  );
}

// ─── Question Options ────────────────────────────────────────────────────────
const familiarityOptions = [
  { label: "I've never tried it", value: 'Beginner', Icon: Sprout },
  { label: 'I know a few signs', value: 'Beginner', Icon: Hand },
  { label: 'I can hold basic conversations', value: 'Intermediate', Icon: MessageCircle },
  { label: 'I am quite experienced', value: 'Advanced', Icon: Star },
];

const goalOptions = [
  { label: 'Alphabet & Numbers', value: 'Alphabet_Numbers', Icon: Type },
  { label: 'Greetings & Basic Phrases', value: 'Greetings', Icon: Waves },
  { label: 'Classroom Words', value: 'Classroom_Words', Icon: BookOpen },
  { label: 'Everything!', value: 'Everything', Icon: Sparkles },
];

const timeOptions = [
  { label: '5–10 minutes', value: '5_10_min', Icon: Timer },
  { label: '15–20 minutes', value: '15_20_min', Icon: Clock },
  { label: '30 minutes', value: '30_min', Icon: Hourglass },
  { label: '1 hour or more', value: '1_hour_plus', Icon: Flame },
];

const THINKING_MESSAGES = [
  'Reading your answers',
  'Matching your level',
  'Picking your first lessons',
  'Almost ready',
];

// Animated "Thinking..." dots
function ThinkingDots({ color = palette.sky, size = 7 }: { color?: string; size?: number }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(d, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(540 - i * 180),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size,
            backgroundColor: color,
            opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Assessment() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [studentLevel, setStudentLevel] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [showLevelScreen, setShowLevelScreen] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingIndex, setAnalyzingIndex] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const params = useLocalSearchParams<{ edit?: string }>();
  const isEditMode = params.edit === 'true';

  const [flying, setFlying] = useState<
    | {
      from: { x: number; y: number; width: number; height: number };
      to: { x: number; y: number };
      option: { label: string; Icon: any };
      index: number;
    }
    | null
  >(null);
  const senyaRef = useRef<View>(null);
  const senyaCenter = useRef({ x: SCREEN_W / 2, y: SCREEN_H * 0.26 });

  const measureSenya = () => {
    senyaRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0) senyaCenter.current = { x: x + width / 2, y: y + height / 2 };
    });
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const questionAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!analyzing) return;
    setAnalyzingIndex(0);
    const id = setInterval(() => setAnalyzingIndex(i => (i + 1) % THINKING_MESSAGES.length), 950);
    return () => clearInterval(id);
  }, [analyzing]);

  const getQuestions = () => {
    const shared = [
      {
        title: 'What do you want to learn first?',
        subtitle: 'Pick whatever sounds most exciting right now',
        options: goalOptions,
        key: 'learning_goal',
        senyaMessage: "There's no wrong answer here",
      },
      {
        title: 'How much time can we practice together?',
        subtitle: 'A little consistency beats a lot of cramming',
        options: timeOptions,
        key: 'practice_time',
        senyaMessage: "We'll build a plan that fits your day",
      },
    ];
    if (studentLevel) return shared;
    return [
      {
        title: 'How familiar are you with FSL?',
        subtitle: 'Be honest — this helps us meet you where you are',
        options: familiarityOptions,
        key: 'fsl_level',
        senyaMessage: "Let's find your starting point",
      },
      ...shared,
    ];
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
        }

        // 🔥 CHECK: If NOT in edit mode AND learning path exists → go to dashboard
        if (!isEditMode) {
          try {
            const pathResponse = await api.getLearningPath();
            if (pathResponse && pathResponse.learning_path && pathResponse.learning_path.is_completed) {
              console.log('✅ Learning path exists, redirecting to dashboard');
              router.replace('/(tabs)/dashboard');
              return;
            }
          } catch (error) {
            console.log('No learning path found, showing assessment');
          }
        }

        // 🔥 If in edit mode, pre-fill existing learning path
        if (isEditMode) {
          try {
            const response = await api.getLearningPath();
            if (response && response.learning_path) {
              const path = response.learning_path;
              setAnswers(prev => ({
                ...prev,
                learning_goal: path.learning_goal || 'Everything',
                practice_time: path.practice_time || '30_min',
              }));

              const goalIndex = goalOptions.findIndex(opt => opt.value === path.learning_goal);
              const timeIndex = timeOptions.findIndex(opt => opt.value === path.practice_time);

              if (studentLevel) {
                setSelected(goalIndex >= 0 ? goalIndex : null);
              }
            }
          } catch (error) {
            console.log('No learning path found to edit');
          }

          // Skip to the appropriate step
          if (studentLevel) {
            setStep(0);
          } else {
            setStep(0);
          }
        }

      } catch (error) {
        console.error('Error checking student level:', error);
      } finally {
        setLoading(false);
      }
    };
    checkStudentLevel();
  }, [isEditMode]);

  const currentQuestion = assessmentQuestions[step];
  const progress = ((step + 1) / totalQuestions) * 100;

  useEffect(() => {
    questionAnim.setValue(0);
    Animated.timing(questionAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(progressAnim, { toValue: progress, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, studentLevel]);

  const selectOption = (index: number, measure: { x: number; y: number; width: number; height: number }) => {
    if (flying) return;
    const option = currentQuestion.options[index];
    setAnswers(prev => ({ ...prev, [currentQuestion.key]: option.value }));
    setFlying({ from: measure, to: senyaCenter.current, option, index });
  };

  const onAbsorbed = () => {
    const idx = flying?.index ?? null;
    setFlying(null);
    setSelected(idx);
    setPulseKey(k => k + 1);
  };

  const next = async () => {
    if (selected === null) return;
    if (step < totalQuestions - 1) {
      setStep(step + 1);
      setSelected(null);
      return;
    }
    setAnalyzing(true);
    const startedAt = Date.now();
    const ok = await saveLearningPath();
    const remaining = Math.max(0, 3000 - (Date.now() - startedAt));
    setTimeout(() => setAnalyzing(false), ok ? remaining : 0);
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
          { text: 'Skip to Dashboard', onPress: () => router.replace('/(tabs)/dashboard') },
        ]
      );
    }
  };

  const saveLearningPath = async (): Promise<boolean> => {
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

      // ✅ Show completion screen
      setShowCompletion(true);

      // ✅ REMOVE the auto-redirect - let the user click a button instead
      // This way the completion screen always shows

      return true;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save your learning path. Please try again.');
      return false;
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenBackground />
        <SafeAreaView style={styles.centerScreen}>
          <SenyaCharacter size={116} thinking />
          <Text style={styles.thinkingTitle}>Warming up</Text>
          <View style={styles.thinkingRow}>
            <Text style={styles.thinkingSub}>Getting your profile</Text>
            <ThinkingDots />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Assigned Level Screen ──────────────────────────────────────────────
  if (studentLevel && !showLevelScreen) {
    const LevelIcon = studentLevel === 'Beginner' ? Sprout : studentLevel === 'Intermediate' ? TrendingUp : Rocket;
    const tone = levelColors[studentLevel] || palette.sky;

    return (
      <View style={{ flex: 1 }}>
        <ScreenBackground intensity="bold" />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.heroScroll} showsVerticalScrollIndicator={false}>
            <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center' }}>
              <SenyaCharacter size={116} />

              <View style={styles.sheet}>
                <View style={[styles.sheetIcon, { backgroundColor: tone + '1A' }]}>
                  <LevelIcon size={26} color={tone} strokeWidth={2.3} />
                </View>
                <Text style={styles.sheetKicker}>Your teacher's pick</Text>
                <Text style={styles.sheetTitle}>{studentLevel}</Text>
                <Text style={styles.sheetBody}>
                  {studentName}, Senya already knows where to start you. Ready for your first lesson?
                </Text>

                <View style={styles.sheetActions}>
                  <PrimaryButton label="Start Learning" icon={Rocket} onPress={() => router.replace('/(tabs)/dashboard')} />
                  <Pressable
                    style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => {
                      setShowLevelScreen(true);
                      setStep(0);
                      setSelected(null);
                      setAnswers(prev => ({ ...prev, fsl_level: studentLevel }));
                    }}
                  >
                    <Text style={styles.ghostBtnText}>Take assessment to confirm</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Thinking screen ────────────────────────────────────────────────────
  if (analyzing) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenBackground />
        <SafeAreaView style={styles.centerScreen}>
          <SenyaCharacter size={148} thinking />
          <Text style={styles.thinkingTitle}>Thinking...</Text>
          <View style={styles.thinkingRow}>
            <Text style={styles.thinkingSub}>Creating your learning path</Text>
            <ThinkingDots />
          </View>
          <View style={styles.thinkingChip}>
            <Sparkles size={13} color={palette.skyDeep} />
            <Text style={styles.thinkingChipText}>{THINKING_MESSAGES[analyzingIndex]}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Result screen ──────────────────────────────────────────────────────
  if (showCompletion) {
    const level = studentLevel || answers.fsl_level || 'Beginner';
    const tone = levelColors[level] || palette.sky;
    const goal = (answers.learning_goal || 'Everything').replace(/_/g, ' ');
    const time = (answers.practice_time || '30_min')
      .replace('_min', ' min')
      .replace('_plus', '+')
      .replace(/_/g, '–');

    return (
      <View style={{ flex: 1 }}>
        <ScreenBackground intensity="bold" />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.heroScroll} showsVerticalScrollIndicator={false}>
            <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center' }}>
              <View style={styles.readyPill}>
                <Sparkles size={12} color={palette.white} />
                <Text style={styles.readyPillText}>
                  {isEditMode ? '✅ Learning path updated!' : `All set, ${studentName || 'friend'}`}
                </Text>
              </View>

              <SenyaCharacter size={126} />

              <Text style={styles.heroTitle}>
                {isEditMode ? '✨ Updated Successfully!' : 'Your path is ready'}
              </Text>
              <Text style={styles.heroSub}>
                {isEditMode
                  ? 'Your learning preferences have been updated. You can always change them again later.'
                  : 'Senya shaped these lessons around your answers.'
                }
              </Text>

              <View style={styles.statRow}>
                <View style={styles.statTile}>
                  <BarChart3 size={16} color={tone} strokeWidth={2.4} />
                  <Text style={styles.statLabel}>Level</Text>
                  <Text style={[styles.statValue, { color: tone }]} numberOfLines={1}>
                    {level}
                  </Text>
                </View>
                <View style={styles.statTile}>
                  <Target size={16} color={palette.sky} strokeWidth={2.4} />
                  <Text style={styles.statLabel}>Focus</Text>
                  <Text style={styles.statValue} numberOfLines={2}>
                    {goal}
                  </Text>
                </View>
                <View style={styles.statTile}>
                  <Clock size={16} color={palette.skyDeep} strokeWidth={2.4} />
                  <Text style={styles.statLabel}>Daily</Text>
                  <Text style={styles.statValue} numberOfLines={1}>
                    {time}
                  </Text>
                </View>
              </View>

              <View style={styles.ctaWrap}>
                <PrimaryButton
                  label={isEditMode ? 'Back to Profile' : 'Start Learning'}
                  icon={isEditMode ? ChevronRight : Rocket}
                  onPress={() => router.replace(isEditMode ? '/profile' : '/(tabs)/dashboard')}
                />
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Assessment flow ────────────────────────────────────────────────────
  const currentOptions = currentQuestion.options;
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]} onPress={back}>
            <ChevronLeft size={20} color={palette.textPrimary} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressTextLeft}>
                Question {step + 1} of {totalQuestions}
              </Text>
              <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <Animated.View style={[styles.progressBarFillWrap, { width: progressWidth }]}>
                <LinearGradient
                  colors={[palette.skyLight, palette.skyDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={measureSenya}
          scrollEventThrottle={64}
        >
          <View style={styles.senyaSection} onLayout={measureSenya}>
            <SenyaCharacter ref={senyaRef} size={104} pulseKey={pulseKey} />
            <View style={styles.captionPill}>
              <Sparkles size={12} color={palette.skyDeep} />
              <Text style={styles.captionText}>{currentQuestion.senyaMessage || "Let's learn together"}</Text>
            </View>
          </View>

          <Animated.View
            style={{
              opacity: questionAnim,
              transform: [{ translateY: questionAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              marginBottom: 20,
              width: '100%',
            }}
          >
            <Text style={styles.title}>{currentQuestion.title}</Text>
            <Text style={styles.subtitle}>{currentQuestion.subtitle}</Text>
          </Animated.View>

          <View style={styles.optionsContainer}>
            {currentOptions.map((option, index) => (
              <AnimatedOptionCard
                key={`${step}-${index}`}
                option={option}
                index={index}
                isSelected={selected === index}
                hidden={flying?.index === index}
                onPress={measure => selectOption(index, measure)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={step < totalQuestions - 1 ? 'Next Question' : 'Complete Setup'}
            disabled={selected === null}
            onPress={next}
          />
        </View>
      </SafeAreaView>

      {flying && (
        <FlyingAnswer from={flying.from} to={flying.to} option={flying.option} onDone={onAbsorbed} />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SCREEN_PAD,
  },

  heroScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SCREEN_PAD,
    paddingVertical: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  progressContainer: { flex: 1, minWidth: 0 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  progressTextLeft: { fontSize: 12.5, fontWeight: '600', color: palette.textSecondary },
  progressPct: { fontSize: 12.5, fontWeight: '700', color: palette.skyDeep },
  progressBarTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(10,132,255,0.12)',
    overflow: 'hidden',
  },
  progressBarFillWrap: { height: '100%', borderRadius: 99, overflow: 'hidden' },

  // Question body
  scrollContent: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 6,
    paddingBottom: 24,
    alignItems: 'center',
  },
  senyaSection: { alignItems: 'center', marginBottom: 6 },
  captionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    marginTop: -6,
  },
  captionText: { fontSize: 12.5, fontWeight: '600', color: palette.textSecondary },

  title: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
    color: palette.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 21,
    color: palette.textSecondary,
    textAlign: 'center',
  },

  optionsContainer: { width: '100%', maxWidth: CARD_MAX_W, alignSelf: 'center', gap: 12 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.cardBorder,
    shadowColor: '#0A84FF',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: palette.sky,
    backgroundColor: palette.skyWash,
    shadowOpacity: 0.18,
  },
  optionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.tint,
  },
  optionIconBoxSelected: { backgroundColor: palette.sky },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600', color: palette.textPrimary },
  optionTextSelected: { color: palette.skyDeep, fontWeight: '700' },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.6,
    borderColor: 'rgba(10,132,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckOn: { backgroundColor: palette.sky, borderColor: palette.sky },

  // Footer / buttons
  footer: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 10,
    paddingBottom: 18,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    width: '100%',
    maxWidth: CARD_MAX_W,
    alignSelf: 'center',
    shadowColor: '#0A84FF',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  primaryBtnDisabled: {
    backgroundColor: 'rgba(10,132,255,0.10)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.white,
    textAlign: 'center',
    includeFontPadding: false,
  },
  primaryBtnTextDisabled: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.textMuted,
    textAlign: 'center',
    includeFontPadding: false,
  },
  ghostBtn: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { fontSize: 14, fontWeight: '600', color: palette.textSecondary },

  // Thinking
  thinkingTitle: {
    marginTop: 18,
    fontSize: 27,
    fontWeight: '800',
    color: palette.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  thinkingSub: { fontSize: 15, color: palette.textSecondary, fontWeight: '500', textAlign: 'center' },
  thinkingChip: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  thinkingChipText: { fontSize: 12.5, fontWeight: '600', color: palette.skyDeep },

  // Assigned-level sheet
  sheet: {
    width: '100%',
    maxWidth: CARD_MAX_W,
    alignSelf: 'center',
    marginTop: 6,
    padding: 26,
    borderRadius: 32,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    alignItems: 'center',
    shadowColor: '#0A84FF',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 4,
  },
  sheetIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  sheetKicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.textMuted,
  },
  sheetTitle: {
    marginTop: 6,
    fontSize: 30,
    fontWeight: '800',
    color: palette.textPrimary,
    letterSpacing: -0.6,
  },
  sheetBody: {
    marginTop: 10,
    fontSize: 14.5,
    lineHeight: 21,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  sheetActions: { width: '100%', marginTop: 22 },

  // Result screen
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
  },
  readyPillText: { fontSize: 12.5, fontWeight: '700', color: palette.white },
  heroTitle: {
    marginTop: 4,
    fontSize: 30,
    fontWeight: '800',
    color: palette.textPrimary,
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  heroSub: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 21,
    color: palette.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 26,
    width: '100%',
    maxWidth: CARD_MAX_W,
    alignSelf: 'center',
  },
  statTile: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0A84FF',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: palette.textMuted,
  },
  statValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: palette.textPrimary,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  ctaWrap: { width: '100%', marginTop: 28 },
});
