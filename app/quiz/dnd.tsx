import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView,
  Modal, Platform, PanResponder, Animated, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Line, Polyline } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

/* ══ DATA ══════════════════════════════════════════════════════════════ */
const dndQuestions = [
  {
    question: 'Match the FSL letter to its description',
    emoji: '✊',
    letter: 'A',
    options: ['Closed fist, thumb on side', 'Four fingers up', 'Peace sign', 'OK circle'],
    correct: 0,
    feedback: "'A' is a closed fist with your thumb resting on the side of your index finger.",
  },
  {
    question: 'Match the greeting sign to its meaning',
    emoji: '👋',
    letter: 'HELLO',
    options: ['Goodbye', 'Please', 'Hello / Hi', 'Thank You'],
    correct: 2,
    feedback: "An open hand wave is the universal 'Hello / Hi' greeting!",
  },
  {
    question: "Match the sign for 'Thank You'",
    emoji: '🙏',
    letter: 'THANKS',
    options: ['Clapping hands', 'Open hand from chin', 'Thumbs up', 'Circular rub'],
    correct: 1,
    feedback: "'Thank You' is an open flat hand moving forward from the chin — like blowing gratitude!",
  },
  {
    question: "Match the letter 'B' to its handshape",
    emoji: '🖐',
    letter: 'B',
    options: ['Closed fist', 'OK sign', 'Four fingers up, thumb across', 'Index finger up'],
    correct: 2,
    feedback: "'B' uses four fingers held straight up, thumb folded across the palm.",
  },
  {
    question: "Match the sign for 'Please'",
    emoji: '🤲',
    letter: 'PLEASE',
    options: ['Fist pounding chest', 'Flat hand circling chest', 'Waving hand', 'Two fingers tapping chin'],
    correct: 1,
    feedback: "'Please' is a flat open hand rubbing a circle on your chest!",
  },
];

/* ══ Exit Modal ══════════════════════════════════════════════════════════ */
function ExitModal({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.exitModal} onPress={e => e.stopPropagation()}>
          <View style={s.exitIconBox}>
            <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <Polyline points="16 17 21 12 16 7"/>
              <Line x1="21" y1="12" x2="9" y2="12"/>
            </Svg>
          </View>
          <Text style={s.exitTitle}>Exit Quiz?</Text>
          <Text style={s.exitDesc}>Your progress will be lost. Are you sure you want to exit?</Text>
          <View style={s.exitBtns}>
            <Pressable style={s.stayBtn} onPress={onClose}><Text style={s.stayText}>Stay</Text></Pressable>
            <Pressable style={s.exitConfirmBtn} onPress={onConfirm}><Text style={s.exitConfirmText}>Exit</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ══ DragCard ── the draggable sign chip ═════════════════════════════════
   Uses PanResponder. On release we report the finger's last pageX/pageY
   so parent can hit-test against drop zones using measureInWindow.
*/
function DragCard({
  emoji, letter, onDrop, disabled,
}: {
  emoji: string;
  letter: string;
  onDrop: (px: number, py: number) => void;
  disabled: boolean;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
        setDragging(true);
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (evt) => {
        pan.flattenOffset();
        setDragging(false);
        // ── KEY FIX: use the finger's page coords, not the card's position ──
        const { pageX, pageY } = evt.nativeEvent;
        onDrop(pageX, pageY);
        // Spring back to origin
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        s.dragCard,
        { transform: pan.getTranslateTransform() },
        dragging && s.dragCardActive,
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={s.dragEmoji}>{emoji}</Text>
      <Text style={s.dragLetter}>{letter}</Text>
      {!disabled && <Text style={s.dragHint}>Hold & drag ✋</Text>}
    </Animated.View>
  );
}

/* ══ DropZone ── a single answer box ════════════════════════════════════ */
function DropZone({
  text, index, highlighted, revealed, isCorrect, isSelected,
  registerRef,
}: {
  text: string;
  index: number;
  highlighted: boolean;
  revealed: boolean;
  isCorrect: boolean;
  isSelected: boolean;
  registerRef: (ref: View | null, index: number) => void;
}) {
  let bg = Platform.OS === 'ios' ? 'rgba(255,255,255,0.65)' : '#FFFFFF';
  let border = Platform.OS === 'ios' ? 'rgba(255,255,255,0.85)' : '#DCE8F8';
  let textCol = '#0f3172';

  if (revealed) {
    if (isCorrect)      { bg = 'rgba(236,253,245,0.95)'; border = '#6EE7B7'; textCol = '#065F46'; }
    else if (isSelected){ bg = 'rgba(254,242,242,0.95)'; border = '#FCA5A5'; textCol = '#991B1B'; }
    else                { bg = 'rgba(255,255,255,0.30)'; textCol = '#9CA3AF'; }
  } else if (highlighted) {
    bg = 'rgba(219,234,254,0.95)'; border = '#3B82F6'; textCol = '#1D4ED8';
  }

  return (
    <View
      ref={ref => registerRef(ref as any, index)}
      style={[s.dropZone, { backgroundColor: bg, borderColor: border }]}
    >
      <View style={s.dropZoneInner}>
        {revealed && isCorrect  && <Text style={s.dropCheck}>✓</Text>}
        {revealed && isSelected && !isCorrect && <Text style={s.dropX}>✗</Text>}
        {highlighted && !revealed && <Text style={s.dropArrow}>👆</Text>}
        <Text style={[s.dropZoneText, { color: textCol }]}>{text}</Text>
      </View>
    </View>
  );
}

/* ══ DndQuizScreen ════════════════════════════════════════════════════════ */
function DndQuizScreen({ onDone, onExit }: { onDone: (score: number) => void; onExit: () => void }) {
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [highlightedZone, setHighlightedZone] = useState<number | null>(null);

  // Refs map: index → native View ref
  const zoneRefs = useRef<(View | null)[]>([]);
  const registerRef = useCallback((ref: View | null, index: number) => {
    zoneRefs.current[index] = ref;
  }, []);

  const q = dndQuestions[qi];
  const isCorrect = selected === q.correct;

  // ── Hit-test using FINGER position against each zone's layout ──────────
  const handleDrop = useCallback((fingerX: number, fingerY: number) => {
    if (revealed) return;

    let hitIndex: number | null = null;
    let promises: Promise<void>[] = [];

    // Measure all drop zones and find which one contains the finger point
    zoneRefs.current.forEach((ref, idx) => {
      if (!ref) return;
      const p = new Promise<void>((resolve) => {
        (ref as any).measureInWindow((x: number, y: number, w: number, h: number) => {
          const TOLERANCE = 12; // generous buffer for fat fingers
          if (
            fingerX >= x - TOLERANCE &&
            fingerX <= x + w + TOLERANCE &&
            fingerY >= y - TOLERANCE &&
            fingerY <= y + h + TOLERANCE
          ) {
            hitIndex = idx;
          }
          resolve();
        });
      });
      promises.push(p);
    });

    Promise.all(promises).then(() => {
      if (hitIndex !== null) {
        setSelected(hitIndex);
        setRevealed(true);
        setHighlightedZone(null);
        if (hitIndex === q.correct) setScore(sc => sc + 1);
      }
    });
  }, [revealed, q.correct]);

  // Live highlight while dragging (finger position streamed via onTouchMove on a transparent overlay)
  // We use a simpler approach: highlight updates happen in onDrop only for snappiness.
  // But we CAN do live highlight if needed — keeping simple for now.

  const next = () => {
    if (qi < dndQuestions.length - 1) {
      setQi(qi + 1); setSelected(null); setRevealed(false); setHighlightedZone(null);
    } else {
      onDone(score + (isCorrect && !revealed ? 0 : 0)); // score already updated
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ExitModal visible={showExit} onClose={() => setShowExit(false)} onConfirm={onExit} />
      <ScrollView contentContainerStyle={s.scroll} scrollEnabled={!false}>
        {/* Top bar */}
        <View style={s.topBar}>
          <Text style={s.logoText}>SEÑAS</Text>
          <View style={s.topRight}>
            <View style={s.xpBadge}><Text style={s.xpText}>⚡ {score * 10} XP</Text></View>
            <Pressable style={s.exitBtn} onPress={() => setShowExit(true)}>
              <Text style={s.exitBtnText}>✕ Exit</Text>
            </Pressable>
          </View>
        </View>

        {/* Title badge */}
        <View style={s.typeBadgeRow}>
          <View style={s.typeBadge}><Text style={s.typeBadgeText}>🎯 DRAG & DROP</Text></View>
          <Text style={s.progressLbl}>{qi + 1} / {dndQuestions.length}</Text>
        </View>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          {dndQuestions.map((_, i) => (
            <View key={i} style={[s.progressSeg, {
              backgroundColor: i < qi ? '#22c55e' : i === qi ? '#2563EB' : 'rgba(15,49,114,0.10)'
            }]} />
          ))}
        </View>

        {/* Question */}
        <View style={s.glassCard}>
          <Text style={s.questionLabel}>{q.question}</Text>

          {/* Draggable sign card */}
          <View style={s.dragArea}>
            <DragCard
              emoji={q.emoji}
              letter={q.letter}
              onDrop={handleDrop}
              disabled={revealed}
            />
          </View>

          {!revealed && (
            <View style={s.instructionRow}>
              <Text style={s.instructionText}>✋ Drag the sign onto the correct description below</Text>
            </View>
          )}
        </View>

        {/* Drop zones */}
        <Text style={s.dropZonesLabel}>DROP ONTO THE CORRECT MATCH</Text>
        <View style={s.optionsGrid}>
          {q.options.map((opt, i) => (
            <DropZone
              key={i}
              text={opt}
              index={i}
              highlighted={highlightedZone === i}
              revealed={revealed}
              isCorrect={i === q.correct}
              isSelected={selected === i}
              registerRef={registerRef}
            />
          ))}
        </View>

        {/* Senya feedback */}
        {revealed && (
          <View style={[s.feedbackBox, isCorrect ? s.feedbackCorrect : s.feedbackWrong]}>
            <Image
              source={require('../../assets/images/img/senya_teaching.png')}
              style={s.senyaSmall} contentFit="contain"
            />
            <View style={s.feedbackTextCol}>
              <Text style={[s.feedbackBig, { color: isCorrect ? '#065F46' : '#991B1B' }]}>
                {isCorrect ? '🎉 Correct!' : '💪 Not quite!'}
              </Text>
              <Text style={[s.feedbackText, { color: isCorrect ? '#065f46' : '#991b1b' }]}>
                {q.feedback}
              </Text>
            </View>
          </View>
        )}

        {/* Next button */}
        {revealed && (
          <Pressable style={[s.nextBtn, isCorrect ? s.nextBtnGold : s.nextBtnBlue]} onPress={next}>
            <Text style={s.nextBtnText}>{qi < dndQuestions.length - 1 ? 'Next Question →' : 'See Results →'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ══ Result Screen ══════════════════════════════════════════════════════ */
function ResultScreen({ score, onRetry, onHome }: { score: number; onRetry: () => void; onHome: () => void }) {
  const total = dndQuestions.length;
  const pct = Math.round((score / total) * 100);
  const xpEarned = score * 10;

  const { label, color } =
    pct === 100 ? { label: 'Perfect! 🎉',     color: '#F59E0B' } :
    pct >= 80   ? { label: 'Excellent! 🌟',    color: '#10B981' } :
    pct >= 60   ? { label: 'Good Job! 👍',     color: '#2563EB' } :
                  { label: 'Keep Going! 💪',   color: '#8B5CF6' };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.topBar}>
          <Text style={s.logoText}>SEÑAS</Text>
        </View>

        <View style={[s.glassCard, { alignItems: 'center', paddingVertical: 32 }]}>
          <Image source={require('../../assets/images/img/senya_teaching.png')} style={s.resultSenya} contentFit="contain" />
          <Text style={{ fontSize: 48 }}>🏆</Text>
          <Text style={[s.resultLabel, { color }]}>{label}</Text>
          <Text style={s.scoreNum}>{score}<Text style={s.scoreOf}>/{total}</Text></Text>
          <Text style={s.scoreSub}>correct answers</Text>
          <View style={s.xpEarnedBadge}>
            <Text style={s.xpEarnedText}>+{xpEarned} XP Earned!</Text>
          </View>
        </View>

        <View style={[s.glassCard, { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 }]}>
          {[
            { label: 'Correct',  value: score,        icon: '✓' },
            { label: 'Wrong',    value: total - score, icon: '✗' },
            { label: 'Score',    value: `${pct}%`,     icon: '📊' },
          ].map((stat, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 22 }}>{stat.icon}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Pressable style={[s.nextBtn, s.nextBtnBlue, { marginTop: 8 }]} onPress={onRetry}>
          <Text style={s.nextBtnText}>↺ Try Again</Text>
        </Pressable>
        <Pressable style={[s.nextBtn, { backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', marginTop: 10 }]} onPress={onHome}>
          <Text style={[s.nextBtnText, { color: '#0f3172' }]}>🏠 Back to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ══ MAIN ══════════════════════════════════════════════════════════════ */
export default function QuizDnD() {
  const router = useRouter();
  const [phase, setPhase] = useState<'quiz' | 'result'>('quiz');
  const [finalScore, setFinalScore] = useState(0);

  const handleExit = () => router.push('/(tabs)/dashboard');
  const handleDone = (score: number) => { setFinalScore(score); setPhase('result'); };

  if (phase === 'quiz') return <DndQuizScreen onDone={handleDone} onExit={handleExit} />;
  return (
    <ResultScreen
      score={finalScore}
      onRetry={() => { setPhase('quiz'); setFinalScore(0); }}
      onHome={handleExit}
    />
  );
}

/* ══ STYLES ══════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eaf5fd' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  exitModal: { width: '88%', maxWidth: 340, backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 48, elevation: 24 },
  exitIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  exitTitle: { fontSize: 20, fontWeight: '800', color: '#0f3172', marginBottom: 8 },
  exitDesc: { fontSize: 13, color: '#6B7280', fontWeight: '500', lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  exitBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  stayBtn: { flex: 1, paddingVertical: 13, backgroundColor: 'rgba(15,49,114,0.07)', borderWidth: 1, borderColor: 'rgba(15,49,114,0.10)', borderRadius: 40, alignItems: 'center' },
  stayText: { fontSize: 14, fontWeight: '700', color: '#0f3172' },
  exitConfirmBtn: { flex: 1.3, paddingVertical: 13, backgroundColor: '#DC2626', borderRadius: 40, alignItems: 'center' },
  exitConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  scroll: { padding: 16, paddingBottom: 60 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  logoText: { color: '#0f3172', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpBadge: { backgroundColor: 'rgba(245,158,11,0.13)', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  xpText: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  exitBtn: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)' },
  exitBtnText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },

  typeBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { backgroundColor: 'rgba(37,99,235,0.10)', borderRadius: 99, paddingVertical: 5, paddingHorizontal: 12 },
  typeBadgeText: { fontSize: 11, fontWeight: '800', color: '#1848c8', letterSpacing: 0.5 },
  progressLbl: { fontSize: 12, fontWeight: '700', color: '#4b7bbb' },
  progressTrack: { flexDirection: 'row', gap: 4, marginBottom: 14 },
  progressSeg: { flex: 1, height: 5, borderRadius: 99 },

  glassCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
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
        borderColor: 'rgba(215,235,252,0.8)',
        elevation: 3,
      },
    }),
  },

  questionLabel: { fontSize: 15, fontWeight: '700', color: '#0f3172', marginBottom: 16, textAlign: 'center' },

  // Drag area — gives the card plenty of vertical space to move without clipping
  dragArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 8,
    minHeight: 130,
  },
  dragCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 20,
    gap: 4,
    zIndex: 999,
    ...Platform.select({
      ios: {
        backgroundColor: '#2563EB',
        shadowColor: '#1D4ED8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
      },
      android: {
        backgroundColor: '#2563EB',
        elevation: 12,
      },
    }),
  },
  dragCardActive: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0.55,
        shadowRadius: 28,
        transform: [{ scale: 1.07 }],
      },
      android: { elevation: 22 },
    }),
  },
  dragEmoji: { fontSize: 42 },
  dragLetter: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  dragHint: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2 },

  instructionRow: {
    backgroundColor: 'rgba(37,99,235,0.07)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  instructionText: { fontSize: 12, color: '#1D4ED8', fontWeight: '600', textAlign: 'center' },

  dropZonesLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 10 },
  optionsGrid: { gap: 10, marginBottom: 14 },
  dropZone: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    minHeight: 58,
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 2 },
    }),
  },
  dropZoneInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropCheck: { fontSize: 18, color: '#10B981', fontWeight: '700', flexShrink: 0 },
  dropX: { fontSize: 18, color: '#EF4444', fontWeight: '700', flexShrink: 0 },
  dropArrow: { fontSize: 16, flexShrink: 0 },
  dropZoneText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },

  feedbackBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, padding: 14, marginBottom: 14 },
  feedbackCorrect: { backgroundColor: 'rgba(236,253,245,0.9)', borderWidth: 1, borderColor: '#a7f3d0' },
  feedbackWrong: { backgroundColor: 'rgba(254,242,242,0.9)', borderWidth: 1, borderColor: '#fecaca' },
  senyaSmall: { width: 52, height: 52, flexShrink: 0 },
  feedbackTextCol: { flex: 1, gap: 4 },
  feedbackBig: { fontSize: 15, fontWeight: '800' },
  feedbackText: { fontSize: 13, fontWeight: '500', lineHeight: 20 },

  nextBtn: { borderRadius: 60, paddingVertical: 14, alignItems: 'center', marginBottom: 4 },
  nextBtnBlue: { backgroundColor: '#1848c8', shadowColor: '#1848c8', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 18, elevation: 10 },
  nextBtnGold: { backgroundColor: '#D97706', shadowColor: '#D97706', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 18, elevation: 10 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  resultSenya: { width: 90, height: 90, marginBottom: 8 },
  resultLabel: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  scoreNum: { fontSize: 64, fontWeight: '900', color: '#0f3172', lineHeight: 72 },
  scoreOf: { fontSize: 28, opacity: 0.5 },
  scoreSub: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginBottom: 12 },
  xpEarnedBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 18 },
  xpEarnedText: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0f3172' },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
});
