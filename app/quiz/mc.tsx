import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable,
  ScrollView, Modal, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Polyline, Line, Polygon, Rect } from 'react-native-svg';

/* ══ DATA ══════════════════════════════════════════════════════════════ */
const MODULE_SLIDES = [
  { title: 'What is Filipino Sign Language?', body: 'Filipino Sign Language (FSL) is the official sign language of the Philippines, recognized by law in 2018. It is a complete, natural language with its own grammar and vocabulary — distinct from English or American Sign Language.', color: '#2563EB' },
  { title: 'The FSL Alphabet', body: 'The FSL manual alphabet uses handshapes to represent each letter. Fingerspelling allows you to spell out words letter-by-letter — it\'s the foundation for learning FSL vocabulary.', color: '#059669' },
  { title: 'Greetings in FSL', body: 'Common greetings like \'Hello\', \'Goodbye\', \'Thank You\', and \'Please\' are among the first signs to learn. They open the door to everyday conversation with the Deaf community.', color: '#F59E0B' },
  { title: 'Why Learn FSL?', body: 'There are over 1 million Deaf Filipinos. Learning FSL promotes inclusion, bridges communication gaps, and shows respect for Deaf culture. Even basic signs can make a meaningful difference.', color: '#8B5CF6' },
];

const senyaTips = [
  "Hi! I'm Senya. Let's learn about FSL before your quiz!",
  'Fingerspelling is a superpower — you can sign any word!',
  'Greetings open every conversation. Practice them daily!',
  "You're almost ready for the quiz. You've got this!",
];

const questions = [
  { question: "Which sign represents the letter 'A' in FSL?", emoji: '✊', options: ['Closed fist, thumb on side', 'Open hand, fingers spread', 'Index finger pointing up', 'Peace sign'], correct: 0, feedbackCorrect: "That's right! 'A' is a closed fist with your thumb resting on the side.", feedbackWrong: "Not quite! 'A' is a closed fist — thumb resting on the side." },
  { question: 'What does the open hand wave gesture mean?', emoji: '👋', options: ['Goodbye', 'Hello / Hi', 'Thank you', 'I love you'], correct: 1, feedbackCorrect: 'Correct! An open hand wave is the universal greeting. You\'re doing great!', feedbackWrong: "Close! An open hand wave means 'Hello / Hi'." },
  { question: "Which sign means 'Thank You' in FSL?", emoji: '🙏', options: ['Clapping hands', 'Open hand moving forward from chin', 'Thumbs up', 'Index finger tapping chest'], correct: 1, feedbackCorrect: "Perfect! 'Thank You' moves an open flat hand forward from the chin!", feedbackWrong: "Not this time! 'Thank You' is an open hand moving forward from the chin." },
  { question: "How do you sign the letter 'B' in FSL?", emoji: '🖐', options: ['Closed fist', 'Four fingers up, thumb across palm', 'Peace sign', 'OK sign'], correct: 1, feedbackCorrect: "Excellent! 'B' uses four fingers held straight up, thumb folded across the palm.", feedbackWrong: "Almost! 'B' is four fingers pointing straight up with your thumb folded across your palm." },
  { question: "What is the sign for 'Please' in FSL?", emoji: '🤲', options: ['Flat hand circling chest', 'Fist pounding chest', 'Two fingers tapping chin', 'Open hand waving'], correct: 0, feedbackCorrect: "You got it! 'Please' is a flat hand making a small circle on the chest.", feedbackWrong: "Not quite! 'Please' is a flat open hand rubbing a circle on your chest." },
];

const RANKINGS = [
  { name: 'Maria Santos',     score: 50, rank: 1, initials: 'MS', isMe: false },
  { name: 'Juan Dela Cruz',   score: 48, rank: 2, initials: 'JD', isMe: false },
  { name: 'Jose Rizal',       score: 45, rank: 3, initials: 'JR', isMe: false },
  { name: 'Andres Bonifacio', score: 42, rank: 4, initials: 'AB', isMe: false },
  { name: 'Gabriela Silang',  score: 40, rank: 5, initials: 'GS', isMe: false },
  { name: 'You',              score: 0,  rank: 6, initials: '👤', isMe: true  },
];

/* ══ SVG Icons ══════════════════════════════════════════════════════════ */
function CheckCircleIcon({ color = '#10B981' }: { color?: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/><Polyline points="8 12 11 15 16 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
}
function XCircleIcon({ color = '#EF4444' }: { color?: string }) {
  return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/><Line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth="2.5" strokeLinecap="round"/><Line x1="9" y1="9" x2="15" y2="15" stroke={color} strokeWidth="2.5" strokeLinecap="round"/></Svg>;
}
function TrophyIcon({ color = '#fbbf24' }: { color?: string }) {
  return <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><Path d="M4 22h16"/><Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><Path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></Svg>;
}

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

/* ══ PHASE 1: MODULE SCREEN ══════════════════════════════════════════════ */
function ModuleScreen({ onStart, onExit }: { onStart: () => void; onExit: () => void }) {
  const [slide, setSlide] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const current = MODULE_SLIDES[slide];
  const isLast = slide === MODULE_SLIDES.length - 1;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: '#eaf5fd' }]}>
      <ExitModal visible={showExit} onClose={() => setShowExit(false)} onConfirm={onExit} />
      <ScrollView contentContainerStyle={s.moduleScroll}>
        {/* Top bar */}
        <View style={s.topBar}>
          <Text style={s.logoText}>SEÑAS</Text>
          <Pressable style={s.exitBtn} onPress={() => setShowExit(true)}>
            <Text style={s.exitBtnText}>✕ Exit</Text>
          </Pressable>
        </View>

        {/* Hero card */}
        <View style={s.glassCard}>
          <View style={s.heroRow}>
            <View style={{ flex: 1 }}>
              <View style={s.moduleBadge}><Text style={s.moduleBadgeText}>MODULE</Text></View>
              <Text style={s.heroTitle}>Filipino Sign Language</Text>
              <Text style={s.heroSub}>{MODULE_SLIDES.length} slides · ~2 min read</Text>
            </View>
            <Image source={require('../../assets/images/img/senya_blue.png')} style={s.senyaHero} contentFit="contain" />
          </View>
        </View>

        {/* Slide dots */}
        <View style={s.dotsRow}>
          {MODULE_SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => setSlide(i)}>
              <View style={[s.dot, { width: i === slide ? 22 : 8, backgroundColor: i <= slide ? '#1848c8' : 'rgba(15,49,114,0.15)' }]} />
            </Pressable>
          ))}
        </View>

        {/* Slide content */}
        <View style={[s.glassCard, { minHeight: 180 }]}>
          <View style={[s.slideAccent, { backgroundColor: current.color }]} />
          <Text style={[s.slideTitle, { color: current.color }]}>{current.title}</Text>
          <Text style={s.slideBody}>{current.body}</Text>
          <Text style={s.slideCounter}>{slide + 1} / {MODULE_SLIDES.length}</Text>
        </View>

        {/* Senya tip */}
        <View style={s.tipRow}>
          <Image source={require('../../assets/images/img/senyas_logo.png')} style={s.tipLogoSm} contentFit="contain" />
          <View style={s.tipBubble}>
            <Text style={s.tipBubbleText}>{senyaTips[slide]}</Text>
          </View>
        </View>

        {/* Nav buttons */}
        <View style={s.navRow}>
          {slide > 0 && (
            <Pressable style={s.ghostBtn} onPress={() => setSlide(slide - 1)}>
              <Text style={s.ghostBtnText}>← Back</Text>
            </Pressable>
          )}
          <Pressable
            style={[s.primaryBtn, isLast && s.goldBtn, slide > 0 ? { flex: 2 } : { flex: 1 }]}
            onPress={isLast ? onStart : () => setSlide(slide + 1)}
          >
            <Text style={s.primaryBtnText}>{isLast ? '🧠 Start Quiz' : 'Next →'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ══ PHASE 2: QUIZ SCREEN ════════════════════════════════════════════════ */
function QuizScreen({ onDone, onExit }: { onDone: (score: number) => void; onExit: () => void }) {
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [showExit, setShowExit] = useState(false);

  const q = questions[qi];
  const isCorrect = selected === q.correct;

  const choose = (i: number) => {
    if (revealed) return;
    setSelected(i); setRevealed(true);
    if (i === q.correct) setScore(sc => sc + 1);
  };

  const next = () => {
    if (qi < questions.length - 1) {
      setQi(qi + 1); setSelected(null); setRevealed(false);
    } else {
      onDone(score);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: '#eaf5fd' }]}>
      <ExitModal visible={showExit} onClose={() => setShowExit(false)} onConfirm={onExit} />
      <ScrollView contentContainerStyle={s.moduleScroll}>
        <View style={s.topBar}>
          <Text style={s.logoText}>SEÑAS</Text>
          <Pressable style={s.exitBtn} onPress={() => setShowExit(true)}>
            <Text style={s.exitBtnText}>✕ Exit</Text>
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={s.glassCard}>
          <View style={s.progressHeader}>
            <Text style={s.progressLabel}>Question {qi + 1} of {questions.length}</Text>
            <View style={s.xpBadge}><Text style={s.xpText}>⚡ {score * 10} XP</Text></View>
          </View>
          <View style={s.progressDots}>
            {questions.map((_, i) => (
              <View key={i} style={[s.progressDot, {
                backgroundColor: i < qi ? '#22c55e' : i === qi ? '#2563EB' : 'rgba(15,49,114,0.10)'
              }]} />
            ))}
          </View>
        </View>

        {/* Question card */}
        <View style={[s.glassCard, s.questionCard]}>
          <Text style={s.questionEmoji}>{q.emoji}</Text>
          <Text style={s.questionText}>{q.question}</Text>
        </View>

        {/* Options */}
        {q.options.map((opt, i) => {
          const isSel = selected === i;
          const isCorr = i === q.correct;
          let bgColor = 'rgba(255,255,255,0.62)';
          let borderColor = 'rgba(255,255,255,0.85)';
          let textColor = '#0f3172';
          let circleBg = 'rgba(15,49,114,0.08)';

          if (revealed) {
            if (isCorr) { bgColor = 'rgba(236,253,245,0.9)'; borderColor = '#6EE7B7'; textColor = '#065F46'; circleBg = '#10B981'; }
            else if (isSel) { bgColor = 'rgba(254,242,242,0.9)'; borderColor = '#FCA5A5'; textColor = '#991B1B'; circleBg = '#EF4444'; }
            else { bgColor = 'rgba(255,255,255,0.35)'; textColor = '#9CA3AF'; }
          } else if (isSel) {
            bgColor = 'rgba(239,246,255,0.9)'; borderColor = '#93C5FD'; textColor = '#1D4ED8'; circleBg = '#2563EB';
          }

          return (
            <Pressable key={`${qi}-${i}`} style={[s.optionCard, { backgroundColor: bgColor, borderColor }]}
              onPress={() => choose(i)} disabled={revealed}>
              <View style={[s.optionCircle, { backgroundColor: circleBg }]}>
                {revealed && isCorr ? <CheckCircleIcon color="#fff" /> :
                  revealed && isSel && !isCorr ? <XCircleIcon color="#fff" /> :
                  <Text style={[s.optionLetter, { color: isSel ? '#fff' : '#4b7bbb' }]}>{String.fromCharCode(65 + i)}</Text>}
              </View>
              <Text style={[s.optionText, { color: textColor }]}>{opt}</Text>
            </Pressable>
          );
        })}

        {/* Senya feedback */}
        <View style={s.feedbackRow}>
          <Image source={require('../../assets/images/img/senya_teaching.png')} style={s.senyaFeedback} contentFit="contain" />
          <View style={[s.feedbackBubble, revealed && isCorrect ? s.feedbackCorrect : revealed && !isCorrect ? s.feedbackWrong : {}]}>
            {revealed && isCorrect && <CheckCircleIcon />}
            {revealed && !isCorrect && <XCircleIcon />}
            <Text style={[s.feedbackText, revealed && isCorrect ? { color: '#065f46' } : revealed ? { color: '#991b1b' } : {}]}>
              {revealed ? (isCorrect ? q.feedbackCorrect : q.feedbackWrong) : 'Read carefully and pick the best answer!'}
            </Text>
          </View>
        </View>

        {/* Next button */}
        {revealed && (
          <Pressable style={[s.primaryBtn, isCorrect && s.goldBtn]} onPress={next}>
            <Text style={s.primaryBtnText}>{qi < questions.length - 1 ? 'Next Question →' : 'See Results →'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ══ PHASE 3: RESULT SCREEN ══════════════════════════════════════════════ */
function ResultScreen({ score, onRetry, onHome }: { score: number; onRetry: () => void; onHome: () => void }) {
  const total = questions.length;
  const pct = Math.round((score / total) * 100);
  const xpEarned = score * 10;
  const stars = pct === 100 ? 3 : pct >= 80 ? 2 : pct >= 50 ? 1 : 0;

  const { label, color } =
    pct === 100 ? { label: 'Perfect Score!',   color: '#F59E0B' } :
    pct >= 80   ? { label: 'Excellent!',        color: '#10B981' } :
    pct >= 60   ? { label: 'Good Job!',         color: '#2563EB' } :
                  { label: 'Keep Practicing!',  color: '#8B5CF6' };

  const userRankings = [...RANKINGS.slice(0, -1), { ...RANKINGS[RANKINGS.length - 1], score: xpEarned }]
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return (
    <SafeAreaView style={[s.container, { backgroundColor: '#eaf5fd' }]}>
      <ScrollView contentContainerStyle={s.moduleScroll}>
        <View style={s.topBar}>
          <Text style={s.logoText}>SEÑAS</Text>
        </View>

        {/* Result card */}
        <View style={[s.glassCard, { alignItems: 'center', paddingVertical: 28 }]}>
          <Image source={require('../../assets/images/img/senya_teaching.png')} style={s.resultSenya} contentFit="contain" />
          <TrophyIcon color="#fbbf24" />
          <View style={s.starsRow}>
            {[1,2,3].map(i => <Text key={i} style={[s.star, { opacity: i <= stars ? 1 : 0.25 }]}>⭐</Text>)}
          </View>
          <Text style={[s.resultLabel, { color }]}>{label}</Text>
          <Text style={s.scoreDisplay}>{score}<Text style={s.scoreTotal}>/{total}</Text></Text>
          <Text style={s.scoreSubtitle}>correct answers</Text>
          <View style={s.xpEarnedBadge}>
            <Text style={s.xpEarnedText}>+{xpEarned} XP Earned!</Text>
          </View>
        </View>

        {/* Rankings */}
        <Text style={s.rankingsTitle}>🏆 Leaderboard</Text>
        <View style={s.glassCard}>
          {userRankings.map((r, i) => (
            <View key={i} style={[s.rankRow, r.isMe && s.rankRowMe, i < userRankings.length - 1 && s.rankRowBorder]}>
              <Text style={s.rankNum}>
                {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `${r.rank}.`}
              </Text>
              <View style={[s.rankAvatar, r.isMe && { backgroundColor: '#2563EB' }]}>
                <Text style={s.rankAvatarText}>{r.initials}</Text>
              </View>
              <Text style={[s.rankName, r.isMe && { fontWeight: '800', color: '#1848c8' }]}>{r.name}</Text>
              <Text style={s.rankScore}>{r.score} XP</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Pressable style={[s.primaryBtn, { marginTop: 16 }]} onPress={onRetry}>
          <Text style={s.primaryBtnText}>↺ Try Again</Text>
        </Pressable>
        <Pressable style={[s.ghostBtn, { marginTop: 10, flex: 0 }]} onPress={onHome}>
          <Text style={s.ghostBtnText}>🏠 Back to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ══ MAIN EXPORT ══════════════════════════════════════════════════════════ */
type Phase = 'module' | 'quiz' | 'result';

export default function QuizMC() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('module');
  const [finalScore, setFinalScore] = useState(0);

  const handleDone = (score: number) => { setFinalScore(score); setPhase('result'); };
  const handleRetry = () => { setPhase('module'); setFinalScore(0); };
  const handleHome = () => router.push('/(tabs)/dashboard');
  const handleExit = () => router.push('/(tabs)/dashboard');

  if (phase === 'module') return <ModuleScreen onStart={() => setPhase('quiz')} onExit={handleExit} />;
  if (phase === 'quiz')   return <QuizScreen onDone={handleDone} onExit={handleExit} />;
  return <ResultScreen score={finalScore} onRetry={handleRetry} onHome={handleHome} />;
}

/* ══ STYLES ══════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  container: { flex: 1 },
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

  // Glass card
  glassCard: { backgroundColor: 'rgba(255,255,255,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 18, marginBottom: 12, shadowColor: '#0f3172', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 12, elevation: 4 },

  // Module
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

  // Result
  resultSenya: { width: 90, height: 90, marginBottom: 8 },
  starsRow: { flexDirection: 'row', gap: 4, marginVertical: 8 },
  star: { fontSize: 28 },
  resultLabel: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  scoreDisplay: { fontSize: 64, fontWeight: '900', color: '#0f3172', lineHeight: 72 },
  scoreTotal: { fontSize: 28, opacity: 0.5 },
  scoreSubtitle: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginBottom: 12 },
  xpEarnedBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 18 },
  xpEarnedText: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  rankingsTitle: { fontSize: 17, fontWeight: '800', color: '#0f3172', marginBottom: 10, marginTop: 4 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  rankRowMe: { backgroundColor: 'rgba(37,99,235,0.06)', borderRadius: 12, paddingHorizontal: 8, marginHorizontal: -4 },
  rankRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(15,49,114,0.08)' },
  rankNum: { fontSize: 16, width: 30, textAlign: 'center' },
  rankAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(15,49,114,0.10)', alignItems: 'center', justifyContent: 'center' },
  rankAvatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  rankName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1F2937' },
  rankScore: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
});
