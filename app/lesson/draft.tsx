import React, { useState } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView, FlatList
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';

// ── Lesson data (shared with lessons screen) ────────────────────────────
const lessonData: Record<string, any> = {
    '1': {
        id: '1', title: 'FSL Alphabet', category: 'Basics', xp: 50, duration: '10 min',
        color: '#2563EB',
        signs: [
            { letter: 'A', emoji: '✊', hint: 'Make a fist with your thumb resting on the side of your index finger.' },
            { letter: 'B', emoji: '🖐', hint: 'Hold your four fingers together and straight up, with your thumb folded in.' },
            { letter: 'C', emoji: '🤏', hint: 'Curve all fingers and thumb to form the letter C shape.' },
            { letter: 'D', emoji: '👆', hint: 'Touch your middle, ring and pinky to your thumb, with index finger pointing up.' },
            { letter: 'E', emoji: '🤛', hint: 'Bend all fingers down toward your palm, touching your thumb.' },
        ],
    },
    '2': {
        id: '2', title: 'Greetings', category: 'Basics', xp: 40, duration: '8 min',
        color: '#10B981',
        signs: [
            { letter: 'Hi', emoji: '👋', hint: 'Wave your open hand side to side at shoulder level.' },
            { letter: 'Hello', emoji: '🤚', hint: 'Bring your flat hand to your forehead and move it slightly outward.' },
            { letter: 'Thanks', emoji: '🙏', hint: 'Place your fingertips to your chin and move your hand forward.' },
            { letter: 'Please', emoji: '🫶', hint: 'Rub your flat hand in a circular motion on your chest.' },
        ],
    },
    '3': {
        id: '3', title: 'Numbers 1–10', category: 'Basics', xp: 45, duration: '9 min',
        color: '#F59E0B',
        signs: [
            { letter: '1', emoji: '☝️', hint: 'Hold up your index finger.' },
            { letter: '2', emoji: '✌️', hint: 'Hold up your index and middle fingers in a V shape.' },
            { letter: '3', emoji: '🤟', hint: 'Hold up your thumb, index and middle fingers.' },
            { letter: '4', emoji: '🖖', hint: 'Hold your four fingers up, slightly spread, with thumb folded in.' },
            { letter: '5', emoji: '🖐', hint: 'Hold all five fingers up spread apart.' },
        ],
    },
};

export default function LessonDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const lesson = lessonData[id || '1'];

    const [signIdx, setSignIdx] = useState(0);
    const [viewed, setViewed] = useState<Set<number>>(new Set([0]));
    const [finished, setFinished] = useState(false);

    if (!lesson) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>Lesson not found</Text>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.backLink}>Go back</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    const sign = lesson.signs[signIdx];
    const isLast = signIdx === lesson.signs.length - 1;

    const goTo = (i: number) => {
        setSignIdx(i);
        setViewed(prev => new Set([...prev, i]));
    };

    const next = () => {
        if (!isLast) {
            goTo(signIdx + 1);
        } else {
            setFinished(true);
        }
    };

    // Finished screen
    if (finished) {
        return (
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.finishedContent}>
                    <Image
                        source={require('../../assets/images/img/senya_teaching.png')}
                        style={styles.finishedImg}
                        contentFit="contain"
                    />
                    <Text style={styles.finishedTitle}>Signs Learned! 🎉</Text>
                    <Text style={styles.finishedDesc}>
                        You've reviewed all {lesson.signs.length} signs in{' '}
                        <Text style={{ fontWeight: '700' }}>{lesson.title}</Text>.{'\n'}
                        Ready to test yourself?
                    </Text>

                    <View style={styles.finishedStats}>
                        {[
                            { label: 'Signs', value: lesson.signs.length, icon: '✋' },
                            { label: 'XP Earned', value: `+${lesson.xp}`, icon: '⚡' },
                            { label: 'Time', value: lesson.duration, icon: '⏱' },
                        ].map((s, i) => (
                            <View key={i} style={styles.finishedStat}>
                                <Text style={styles.finishedStatEmoji}>{s.icon}</Text>
                                <Text style={styles.finishedStatValue}>{s.value}</Text>
                                <Text style={styles.finishedStatLabel}>{s.label}</Text>
                            </View>
                        ))}
                    </View>

                    <Pressable style={styles.quizBtn} onPress={() => router.push('/quiz/mc' as any)}>
                        <Text style={styles.quizBtnText}>Take the Quiz →</Text>
                    </Pressable>
                    <Pressable style={styles.reviewBtn} onPress={() => { setFinished(false); setSignIdx(0); setViewed(new Set([0])); }}>
                        <Text style={styles.reviewBtnText}>Review Again ↺</Text>
                    </Pressable>
                    <Pressable style={styles.reviewBtn} onPress={() => router.back()}>
                        <Text style={styles.reviewBtnText}>Back to Lessons</Text>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            {/* ── Colored header ── */}
            <View style={[styles.header, { backgroundColor: lesson.color }]}>
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <Pressable style={styles.backBtn} onPress={() => router.back()}>
                            <Text style={styles.backBtnText}>←</Text>
                        </Pressable>
                        <View style={styles.headerTitles}>
                            <Text style={styles.headerTitle}>{lesson.title}</Text>
                            <Text style={styles.headerSub}>{lesson.category} · {lesson.signs.length} signs · +{lesson.xp} XP</Text>
                        </View>
                        <Image
                            source={require('../../assets/images/img/senyas_logo.png')}
                            style={styles.headerLogo}
                            contentFit="contain"
                        />
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressDots}>
                        {lesson.signs.map((_: any, i: number) => (
                            <Pressable key={i} style={[
                                styles.progressDot,
                                {
                                    backgroundColor: i === signIdx
                                        ? '#fff'
                                        : viewed.has(i)
                                            ? 'rgba(255,255,255,0.6)'
                                            : 'rgba(255,255,255,0.25)'
                                }
                            ]} onPress={() => goTo(i)} />
                        ))}
                    </View>
                    <Text style={styles.progressText}>{signIdx + 1} of {lesson.signs.length}</Text>
                </SafeAreaView>
            </View>

            {/* ── Sign Card ── */}
            <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
                <View style={styles.signCard}>
                    {/* Emoji display */}
                    <View style={[styles.emojiBox, { backgroundColor: lesson.color + '15', shadowColor: lesson.color }]}>
                        <Text style={styles.emojiText}>{sign.emoji}</Text>
                    </View>

                    {/* Letter badge */}
                    <View style={[styles.letterBadge, { backgroundColor: lesson.color + '20' }]}>
                        <Text style={[styles.letterText, { color: lesson.color }]}>{sign.letter}</Text>
                    </View>

                    <Text style={styles.hintText}>{sign.hint}</Text>
                </View>

                {/* Senya tip bubble */}
                <View style={styles.tipBubble}>
                    <Image
                        source={require('../../assets/images/img/senyas_logo.png')}
                        style={styles.tipLogo}
                        contentFit="contain"
                    />
                    <Text style={styles.tipText}>
                        💡 Practice this sign slowly at first. Watch the shape of your fingers carefully before speeding up!
                    </Text>
                </View>

                {/* Sign thumbnail strip */}
                <View style={styles.stripSection}>
                    <Text style={styles.stripLabel}>ALL SIGNS IN THIS LESSON:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripScroll}>
                        {lesson.signs.map((s: any, i: number) => (
                            <Pressable key={i} onPress={() => goTo(i)} style={[
                                styles.stripItem,
                                {
                                    backgroundColor: i === signIdx
                                        ? lesson.color
                                        : viewed.has(i) ? lesson.color + '25' : '#F3F4F6',
                                    borderColor: i === signIdx ? lesson.color : 'transparent',
                                    borderWidth: 2,
                                }
                            ]}>
                                <Text style={styles.stripEmoji}>{s.emoji}</Text>
                                <Text style={[styles.stripLetter, { color: i === signIdx ? '#fff' : '#6B7280' }]}>{s.letter}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>

            {/* ── Bottom Nav ── */}
            <View style={styles.bottomNav}>
                {signIdx > 0 && (
                    <Pressable style={styles.prevBtn} onPress={() => goTo(signIdx - 1)}>
                        <Text style={styles.prevBtnText}>← Back</Text>
                    </Pressable>
                )}
                <Pressable
                    style={[styles.nextBtn, { flex: signIdx > 0 ? 2 : 1, backgroundColor: lesson.color }]}
                    onPress={next}
                >
                    <Text style={styles.nextBtnText}>
                        {isLast ? 'Finish Lesson ✓' : 'Next Sign →'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    errorText: { fontSize: 18, color: '#0f3172', textAlign: 'center', marginTop: 60 },
    backLink: { fontSize: 14, color: '#2563EB', textAlign: 'center', marginTop: 12 },

    // Header
    header: { paddingBottom: 16 },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    backBtnText: { color: '#fff', fontSize: 18 },
    headerTitles: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginTop: 2 },
    headerLogo: { width: 44, height: 44 },
    progressDots: { flexDirection: 'row', gap: 6, paddingHorizontal: 24, marginBottom: 6 },
    progressDot: { flex: 1, height: 6, borderRadius: 3 },
    progressText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', paddingHorizontal: 24 },

    // Scroll
    scrollBody: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },

    // Sign card
    signCard: {
        backgroundColor: '#fff', borderRadius: 24, padding: 28,
        alignItems: 'center', marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6,
        borderWidth: 1, borderColor: '#F3F4F6',
    },
    emojiBox: {
        width: 120, height: 120, borderRadius: 60,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8,
    },
    emojiText: { fontSize: 64 },
    letterBadge: { borderRadius: 12, paddingVertical: 6, paddingHorizontal: 20, marginBottom: 12 },
    letterText: { fontSize: 28, fontWeight: '900' },
    hintText: { fontSize: 15, color: '#4B5563', lineHeight: 25, fontWeight: '500', textAlign: 'center' },

    // Tip bubble
    tipBubble: {
        flexDirection: 'row', gap: 10, alignItems: 'flex-start',
        backgroundColor: '#F0F9FF', borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 20,
    },
    tipLogo: { width: 32, height: 32, flexShrink: 0 },
    tipText: { flex: 1, fontSize: 13, color: '#0369A1', fontWeight: '600', lineHeight: 20 },

    // Strip
    stripSection: { marginBottom: 20 },
    stripLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 10, letterSpacing: 0.5 },
    stripScroll: { gap: 8, paddingRight: 4 },
    stripItem: {
        width: 56, height: 56, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', gap: 2,
    },
    stripEmoji: { fontSize: 20 },
    stripLetter: { fontSize: 10, fontWeight: '700' },

    // Bottom nav
    bottomNav: {
        flexDirection: 'row', gap: 12, padding: 16,
        borderTopWidth: 1, borderTopColor: '#F3F4F6',
        backgroundColor: '#fff',
    },
    prevBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 60,
        borderWidth: 1, borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    prevBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
    nextBtn: { paddingVertical: 14, borderRadius: 60, alignItems: 'center' },
    nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    // Finished screen
    finishedContent: { alignItems: 'center', padding: 32, paddingBottom: 60 },
    finishedImg: { width: 130, height: 130, marginBottom: 16 },
    finishedTitle: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
    finishedDesc: { fontSize: 15, color: '#6B7280', lineHeight: 24, fontWeight: '500', textAlign: 'center', marginBottom: 20 },
    finishedStats: {
        flexDirection: 'row', justifyContent: 'space-around', width: '100%',
        backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    finishedStat: { alignItems: 'center', gap: 4 },
    finishedStatEmoji: { fontSize: 22 },
    finishedStatValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
    finishedStatLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
    quizBtn: {
        width: '100%', paddingVertical: 16, borderRadius: 60,
        backgroundColor: '#2563EB', alignItems: 'center', marginBottom: 12,
        shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 20, elevation: 10,
    },
    quizBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    reviewBtn: {
        width: '100%', paddingVertical: 14, borderRadius: 60,
        borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', marginBottom: 10,
    },
    reviewBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
