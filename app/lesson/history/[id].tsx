import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Pressable,
  ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';
import { api } from '../../../services/api';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function ArrowLeftIcon() {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f3172" strokeWidth="2.5">
      <Path d="M19 12H5" /><Path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}

function ClockIcon({ color = '#6B7280', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 6v6l4 2" />
    </Svg>
  );
}

function CheckIcon({ color = '#10B981', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

function XIcon({ color = '#EF4444', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}

function StarIcon({ color = '#D97706', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

function ZapIcon({ color = '#D97706', size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}

function AwardIcon({ color = '#2563EB', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Circle cx="12" cy="8" r="6" />
      <Path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </Svg>
  );
}

function TrendingUpIcon({ color = '#059669', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <Polyline points="17 6 23 6 23 12" />
    </Svg>
  );
}

function BarChartIcon({ color = '#2563EB', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Line x1="18" y1="20" x2="18" y2="10" />
      <Line x1="12" y1="20" x2="12" y2="4" />
      <Line x1="6" y1="20" x2="6" y2="14" />
      <Line x1="2" y1="20" x2="22" y2="20" />
    </Svg>
  );
}

function RefreshIcon({ color = '#6B7280', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M23 4v6h-6" />
      <Path d="M1 20v-6h6" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Svg>
  );
}

// ─── Attempt Card ──────────────────────────────────────────────────────────────
function AttemptCard({ attempt, index, total }: { attempt: any; index: number; total: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 90, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 90, useNativeDriver: true }),
    ]).start();
  }, []);

  const pct = attempt.percentage;
  const passed = pct >= 60;
  const isPerfect = pct === 100;
  const attemptNum = total - index;

  const accentColor = isPerfect ? '#D97706' : passed ? '#059669' : '#DC2626';
  const bgColor = isPerfect ? '#FFFBEB' : passed ? '#ECFDF5' : '#FEF2F2';
  const borderColor = isPerfect ? '#FDE68A' : passed ? '#A7F3D0' : '#FECACA';

  return (
    <Animated.View
      style={[
        cardStyles.card,
        { backgroundColor: bgColor, borderColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Left accent stripe */}
      <View style={[cardStyles.stripe, { backgroundColor: accentColor }]} />

      <View style={cardStyles.body}>
        {/* Top row: attempt number + date */}
        <View style={cardStyles.topRow}>
          <View style={[cardStyles.attemptBadge, { backgroundColor: accentColor }]}>
            <Text style={cardStyles.attemptBadgeText}>#{attemptNum}</Text>
          </View>

          <View style={cardStyles.dateRow}>
            <ClockIcon color="#9CA3AF" size={12} />
            <Text style={cardStyles.dateText}>
              {new Date(attempt.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Score bar row - FIXED: percentage text on the right side of the bar */}
        <View style={cardStyles.barRow}>
          <View style={cardStyles.barWrapper}>
            <View style={cardStyles.barTrack}>
              <View style={[cardStyles.barFill, { width: `${pct}%` as any, backgroundColor: accentColor }]} />
            </View>
          </View>
          <Text style={[cardStyles.pctText, { color: accentColor }]}>{pct}%</Text>
        </View>

        {/* Bottom row: status + XP */}
        <View style={cardStyles.bottomRow}>
          <View style={[cardStyles.statusPill, { backgroundColor: accentColor + '20' }]}>
            {isPerfect ? (
              <StarIcon color={accentColor} size={12} />
            ) : passed ? (
              <CheckIcon color={accentColor} size={12} />
            ) : (
              <XIcon color={accentColor} size={12} />
            )}
            <Text style={[cardStyles.statusText, { color: accentColor }]}>
              {isPerfect ? 'Perfect Score' : passed ? 'Passed' : 'Failed'}
            </Text>
          </View>

          {attempt.xp_earned > 0 && (
            <View style={cardStyles.xpPill}>
              <ZapIcon color="#D97706" size={11} />
              <Text style={cardStyles.xpText}>+{attempt.xp_earned} XP</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  stripe: { width: 5 },
  body: { flex: 1, padding: 14, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attemptBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  attemptBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  // ─── FIXED: Bar and text side by side ─────────────────────────────────────
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  barWrapper: {
    flex: 1,
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 99,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: { height: '100%', borderRadius: 99 },
  pctText: {
    fontSize: 14,
    fontWeight: '900',
    minWidth: 44,
    textAlign: 'right',
    flexShrink: 0,
  },
  // ──────────────────────────────────────────────────────────────────────────

  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  xpText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttemptHistoryPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonTitle, setLessonTitle] = useState('');
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [loading]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [attemptsRes, lessonRes] = await Promise.all([
        api.getAttempts(id),
        api.getLessonById(id),
      ]);
      if (attemptsRes.success) setAttempts(attemptsRes.attempts || []);
      if (lessonRes.success) setLessonTitle(lessonRes.lesson?.title || '');
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  // Summary stats
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0
    ? Math.round(attempts.reduce((a, b) => a + b.percentage, 0) / totalAttempts)
    : 0;
  const bestScore = totalAttempts > 0 ? Math.max(...attempts.map(a => a.percentage)) : 0;
  const passCount = attempts.filter(a => a.percentage >= 60).length;
  const totalXpEarned = attempts.reduce((sum, a) => sum + (a.xp_earned || 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading attempt history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeftIcon />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>Attempt History</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{lessonTitle}</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={loadData}>
          <RefreshIcon color="#2563EB" size={17} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ─── Summary Stats Card ───────────────────────────────────────── */}
        {totalAttempts > 0 && (
          <Animated.View style={[styles.summaryCard, { opacity: headerAnim }]}>
            <View style={styles.summaryHeader}>
              <BarChartIcon color="#2563EB" size={18} />
              <Text style={styles.summaryTitle}>Your Progress</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{totalAttempts}</Text>
                <View style={styles.statLabelRow}>
                  <RefreshIcon color="#6B7280" size={11} />
                  <Text style={styles.statLbl}>Attempts</Text>
                </View>
              </View>

              <View style={[styles.statBox, styles.statBoxHighlight]}>
                <Text style={[styles.statNum, { color: '#2563EB' }]}>{bestScore}%</Text>
                <View style={styles.statLabelRow}>
                  <AwardIcon color="#2563EB" size={11} />
                  <Text style={[styles.statLbl, { color: '#2563EB' }]}>Best Score</Text>
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNum}>{avgScore}%</Text>
                <View style={styles.statLabelRow}>
                  <TrendingUpIcon color="#6B7280" size={11} />
                  <Text style={styles.statLbl}>Avg Score</Text>
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: '#D97706' }]}>{totalXpEarned}</Text>
                <View style={styles.statLabelRow}>
                  <ZapIcon color="#D97706" size={11} />
                  <Text style={[styles.statLbl, { color: '#D97706' }]}>Total XP</Text>
                </View>
              </View>
            </View>

            {/* Pass Rate Bar */}
            <View style={styles.passRateSection}>
              <View style={styles.passRateHeader}>
                <View style={styles.passRateLabelRow}>
                  <CheckIcon color="#059669" size={13} />
                  <Text style={styles.passRateLabel}>Pass Rate</Text>
                </View>
                <Text style={styles.passRateValue}>{passCount}/{totalAttempts} passed</Text>
              </View>
              <View style={styles.passTrack}>
                <View
                  style={[
                    styles.passFill,
                    { width: `${totalAttempts > 0 ? (passCount / totalAttempts) * 100 : 0}%` as any },
                  ]}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* ─── Attempt List ─────────────────────────────────────────────── */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>All Attempts</Text>
            <View style={styles.listCountBadge}>
              <Text style={styles.listCountText}>{totalAttempts}</Text>
            </View>
          </View>

          {totalAttempts === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBox}>
                <BarChartIcon color="#9CA3AF" size={32} />
              </View>
              <Text style={styles.emptyTitle}>No Attempts Yet</Text>
              <Text style={styles.emptyDesc}>
                Complete the quiz in this lesson to see your attempt history here.
              </Text>
              <Pressable
                style={styles.startQuizBtn}
                onPress={() => router.push(`/lesson/${id}` as any)}
              >
                <Text style={styles.startQuizBtnText}>Go to Lesson</Text>
                <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <Path d="M5 12h14" /><Path d="M12 5l7 7-7 7" />
                </Svg>
              </Pressable>
            </View>
          ) : (
            attempts.map((attempt, index) => (
              <AttemptCard
                key={index}
                attempt={attempt}
                index={index}
                total={totalAttempts}
              />
            ))
          )}
        </View>

        {/* ─── Back to Lesson button ────────────────────────────────────── */}
        {totalAttempts > 0 && (
          <Pressable
            style={styles.goToLessonBtn}
            onPress={() => router.push(`/lesson/${id}` as any)}
          >
            <Text style={styles.goToLessonText}>Review Lesson</Text>
            <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5">
              <Path d="M5 12h14" /><Path d="M12 5l7 7-7 7" />
            </Svg>
          </Pressable>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F6FF' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600', color: '#4B7FCC' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(15,49,114,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f3172', marginTop: 1 },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(37,99,235,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: 16, paddingBottom: 50, gap: 16 },

  // Summary Card
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    gap: 16,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#0f3172' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBoxHighlight: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statNum: { fontSize: 22, fontWeight: '900', color: '#0f3172' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLbl: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  passRateSection: { gap: 8 },
  passRateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passRateLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  passRateLabel: { fontSize: 13, fontWeight: '700', color: '#059669' },
  passRateValue: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  passTrack: {
    height: 8,
    backgroundColor: 'rgba(5,150,105,0.12)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  passFill: { height: '100%', backgroundColor: '#059669', borderRadius: 99 },

  // List section
  listSection: { gap: 2 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  listTitle: { fontSize: 16, fontWeight: '800', color: '#0f3172' },
  listCountBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  listCountText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  // Empty state
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f3172' },
  emptyDesc: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  startQuizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    borderRadius: 99,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  startQuizBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Bottom CTA
  goToLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  goToLessonText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
});
