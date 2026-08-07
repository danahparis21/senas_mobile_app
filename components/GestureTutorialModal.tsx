// components/GestureTutorialModal.tsx
// Senya's "How to Practice Gestures" tutorial.
// Shows automatically on a student's first visit to the gesture tab, then only
// when they tap the help (?) icon in the header.
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Animated,
    SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const TUTORIAL_SEEN_KEY = 'gesture_tutorial_seen_v1';

/** Returns true the first time a student opens the gesture tab. */
export async function shouldShowGestureTutorial() {
    try {
        const seen = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
        return seen !== 'true';
    } catch {
        return false;
    }
}

export async function markGestureTutorialSeen() {
    try {
        await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    } catch {
        // non-blocking
    }
}

type Slide = {
    id: string;
    eyebrow: string;
    title: string;
    body: string;
    image: any;
    gradient: readonly [string, string];
    bullets?: { icon: string; text: string; color: string }[];
};

const SLIDES: Slide[] = [
    {
        id: 'welcome',
        eyebrow: 'Welcome',
        title: "Hi, I'm Senya!",
        body:
            "This is your practice space. Sign with your own hands and I'll tell you right away if you got it. Ready to level up your signing?",
        image: require('../assets/images/img/senya_teaching.png'), // Fixed: ../assets instead of ../../
        gradient: ['#4B7BBB', '#6FA8E6'] as const,
        bullets: [
            { icon: 'hand-left', text: 'Practice real signs, not multiple choice', color: '#10B981' },
            { icon: 'sparkles', text: 'I guide you the whole way', color: '#F59E0B' },
        ],
    },
    {
        id: 'camera',
        eyebrow: 'Step 1',
        title: 'Show your hands to the camera',
        body:
            'Keep your hand inside the frame so the camera can detect it. Sit an arm\'s length away and let your whole hand be visible.',
        image: require('../assets/images/img/letter-detected.jpg'), // Fixed
        gradient: ['#4ECDC4', '#45B7AA'] as const,
        bullets: [
            { icon: 'sunny', text: 'Good, even lighting — face the light', color: '#F59E0B' },
            { icon: 'square-outline', text: 'Clean, plain background', color: '#4B7BBB' },
            { icon: 'hand-right', text: 'One hand fully inside the frame', color: '#10B981' },
        ],
    },
    {
        id: 'boxes',
        eyebrow: 'Step 2',
        title: 'Follow the sign boxes',
        body:
            'A list of boxes appears on screen. Each box tells you what to sign — if the box says A, make the sign for the letter A and hold it until it\'s detected.',
        image: require('../assets/images/img/letter-array.jpg'), // Fixed
        gradient: ['#FF6B6B', '#FF8E8E'] as const,
        bullets: [
            { icon: 'list', text: 'Work through the boxes in order', color: '#4B7BBB' },
            { icon: 'checkmark-circle', text: 'A box turns green once you nail it', color: '#10B981' },
        ],
    },
    {
        id: 'hint',
        eyebrow: 'Step 3',
        title: 'Stuck? Tap the light bulb',
        body:
            'Any time you forget a sign, tap the hint bulb. I\'ll show you exactly how the sign looks so you can copy it. Use it as often as you like — no penalty!',
        image: require('../assets/images/img/senya-hint.jpg'), // Fixed
        gradient: ['#F59E0B', '#FBBF24'] as const,
        bullets: [
            { icon: 'bulb', text: 'Hints are always available', color: '#F59E0B' },
            { icon: 'images', text: 'See a reference photo of the sign', color: '#4B7BBB' },
        ],
    },
    {
        id: 'rewards',
        eyebrow: 'Step 4',
        title: 'Earn points and badges',
        body:
            'Every correct sign gives you points. Keep your streak alive to build energy and collect badges as you master each module.',
        image: require('../assets/images/img/badges.png'), // Fixed
        gradient: ['#8B5CF6', '#A78BFA'] as const,
        bullets: [
            { icon: 'star', text: 'Points for every correct sign', color: '#FFD700' },
            { icon: 'flash', text: 'Streaks build your energy', color: '#EF4444' },
            { icon: 'trophy', text: 'Badges for finished modules', color: '#10B981' },
        ],
    },
    {
        id: 'ready',
        eyebrow: "You're set",
        title: 'Now enjoy your practice!',
        body:
            'Take your time, breathe, and have fun. Every sign you make brings you closer to fluent conversations.',
        image: require('../assets/images/img/greet.png'), // Fixed
        gradient: ['#10B981', '#34D399'] as const,
        bullets: [
            { icon: 'happy', text: 'Mistakes are part of learning', color: '#F59E0B' },
            { icon: 'help-circle', text: 'Reopen this guide anytime from the ? icon', color: '#4B7BBB' },
        ],
    },
];

export default function GestureTutorialModal({
    visible,
    onClose,
}: {
    visible: boolean;
    onClose: () => void;
}) {
    const [index, setIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const fade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setIndex(0);
            fade.setValue(0);
            Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
            requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: 0, animated: false }));
        }
    }, [visible, fade]);

    const goTo = (next: number) => {
        const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
        setIndex(clamped);
        scrollRef.current?.scrollTo({ x: clamped * SCREEN_WIDTH, animated: true });
    };

    const finish = async () => {
        await markGestureTutorialSeen();
        onClose();
    };

    const isLast = index === SLIDES.length - 1;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={finish} transparent={false}>
            <LinearGradient colors={['#EAF5FD', '#DDECFB', '#CBE0F8']} style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    {/* Top bar */}
                    <View style={styles.topBar}>
                        <View style={styles.topBarLeft}>
                            <Ionicons name="school" size={18} color="#0F3172" />
                            <Text style={styles.topBarTitle}>How to Practice</Text>
                        </View>
                        <TouchableOpacity onPress={finish} style={styles.skipButton} hitSlop={8}>
                            <Text style={styles.skipText}>{isLast ? 'Close' : 'Skip'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${((index + 1) / SLIDES.length) * 100}%` },
                            ]}
                        />
                    </View>

                    <Animated.View style={{ flex: 1, opacity: fade }}>
                        <ScrollView
                            ref={scrollRef}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            scrollEventThrottle={16}
                            onMomentumScrollEnd={(e) =>
                                setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
                            }
                        >
                            {SLIDES.map((slide) => (
                                <ScrollView
                                    key={slide.id}
                                    style={{ width: SCREEN_WIDTH }}
                                    contentContainerStyle={styles.slide}
                                    showsVerticalScrollIndicator={false}
                                >
                                    <LinearGradient colors={slide.gradient} style={styles.eyebrowPill}>
                                        <Text style={styles.eyebrowText}>{slide.eyebrow}</Text>
                                    </LinearGradient>

                                    <View style={styles.imageCard}>
                                        <Image source={slide.image} style={styles.image} contentFit="contain" />
                                    </View>

                                    <Text style={styles.slideTitle}>{slide.title}</Text>
                                    <Text style={styles.slideBody}>{slide.body}</Text>

                                    {slide.bullets?.map((b) => (
                                        <View key={b.text} style={styles.bulletRow}>
                                            <View
                                                style={[styles.bulletIcon, { backgroundColor: `${b.color}22` }]}
                                            >
                                                <Ionicons name={b.icon as any} size={16} color={b.color} />
                                            </View>
                                            <Text style={styles.bulletText}>{b.text}</Text>
                                        </View>
                                    ))}

                                    {slide.id === 'hint' && (
                                        <View style={styles.hintDemo}>
                                            <View style={styles.hintBulb}>
                                                <Ionicons name="bulb" size={22} color="#FFFFFF" />
                                            </View>
                                            <Text style={styles.hintDemoText}>This is the hint button</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            ))}
                        </ScrollView>
                    </Animated.View>

                    {/* Dots */}
                    <View style={styles.dots}>
                        {SLIDES.map((s, i) => (
                            <TouchableOpacity
                                key={s.id}
                                onPress={() => goTo(i)}
                                style={[styles.dot, i === index && styles.dotActive]}
                            />
                        ))}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={() => goTo(index - 1)}
                            disabled={index === 0}
                            style={[styles.backButton, index === 0 && styles.backButtonDisabled]}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={20}
                                color={index === 0 ? 'rgba(15, 49, 114, 0.25)' : '#0F3172'}
                            />
                            <Text
                                style={[styles.backText, index === 0 && { color: 'rgba(15, 49, 114, 0.25)' }]}
                            >
                                Back
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.nextButtonWrapper}
                            onPress={() => (isLast ? finish() : goTo(index + 1))}
                        >
                            <LinearGradient
                                colors={isLast ? ['#10B981', '#34D399'] : ['#0F3172', '#4B7BBB']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.nextButton}
                            >
                                <Text style={styles.nextText}>{isLast ? "Let's practice!" : 'Next'}</Text>
                                <Ionicons
                                    name={isLast ? 'hand-left' : 'chevron-forward'}
                                    size={18}
                                    color="#FFFFFF"
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
    },
    topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    topBarTitle: { fontSize: 16, fontWeight: '700', color: '#0F3172' },
    skipButton: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    skipText: { fontSize: 13, fontWeight: '600', color: '#4B7BBB' },
    progressTrack: {
        height: 5,
        marginHorizontal: 20,
        borderRadius: 999,
        backgroundColor: 'rgba(15, 49, 114, 0.12)',
        overflow: 'hidden',
    },
    progressFill: { height: 5, borderRadius: 999, backgroundColor: '#0F3172' },

    slide: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 12, alignItems: 'center' },
    eyebrowPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        marginBottom: 16,
    },
    eyebrowText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    imageCard: {
        width: '100%',
        height: 210,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        padding: 12,
        marginBottom: 20,
        shadowColor: '#0F3172',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
    },
    image: { width: '100%', height: '100%', borderRadius: 16 },
    slideTitle: {
        fontSize: 23,
        fontWeight: '800',
        color: '#0F3172',
        textAlign: 'center',
        marginBottom: 10,
    },
    slideBody: {
        fontSize: 14.5,
        lineHeight: 22,
        color: '#4B5563',
        textAlign: 'center',
        marginBottom: 18,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 16,
        paddingVertical: 11,
        paddingHorizontal: 12,
        marginBottom: 10,
    },
    bulletIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    bulletText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#334155' },

    hintDemo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        backgroundColor: '#FFFDF0',
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    hintBulb: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F59E0B',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    hintDemoText: { fontSize: 13, fontWeight: '700', color: '#92400E' },

    dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingVertical: 12 },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(15, 49, 114, 0.2)',
    },
    dotActive: { width: 22, backgroundColor: '#0F3172' },

    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 18,
        paddingTop: 4,
        gap: 12,
    },
    backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: 8 },
    backButtonDisabled: { opacity: 0.6 },
    backText: { fontSize: 15, fontWeight: '700', color: '#0F3172', marginLeft: 2 },
    nextButtonWrapper: { flex: 1, maxWidth: 220 },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 15,
        borderRadius: 999,
        shadowColor: '#0F3172',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
    },
    nextText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});