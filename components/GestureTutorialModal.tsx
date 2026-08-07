// components/GestureTutorialModal.tsx
// Senya's "How to Practice Gestures" tutorial.
// Shows as a transparent overlay with Senya guiding each step.
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
    Animated,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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
    title: string;
    body: string;
    image: any;
    imageStyle?: 'contain' | 'cover' | 'fill';
    imageContainerStyle?: any;
    gradient: readonly [string, string];
    responseText: string;
    icon?: string;
    imageHeight?: number;
};

const SLIDES: Slide[] = [
    {
        id: 'welcome',
        title: "Hi, I'm Senya! 👋",
        body: "This is your practice space. Sign with your own hands and I'll tell you right away if you got it. Ready to level up your signing?",
        image: require('../assets/images/img/senya_teaching.png'),
        imageStyle: 'contain',
        gradient: ['#4B7BBB', '#6FA8E6'] as const,
        responseText: "Yay! Let's get started! 🌟",
        icon: 'hand-left',
    },
    {
        id: 'camera',
        title: 'Show your hands to the camera 📸',
        body: "Keep your hand inside the frame so the camera can detect it. Sit an arm's length away and let your whole hand be visible.",
        image: require('../assets/images/img/letter-detected.jpg'),
        imageStyle: 'contain',
        gradient: ['#4ECDC4', '#45B7AA'] as const,
        responseText: "Great! Good lighting makes a big difference! 💡",
        icon: 'camera',
        imageHeight: 220,
    },
    {
        id: 'boxes',
        title: 'Follow the sign boxes 📋',
        body: "A list of boxes appears on screen. Each box tells you what to sign. If the box says A, make the sign for the letter A and hold it until it's detected.",
        image: require('../assets/images/img/letter-array.jpg'),
        imageStyle: 'contain',
        gradient: ['#FF6B6B', '#FF8E8E'] as const,
        responseText: "You're getting the hang of it! 🎯",
        icon: 'list',
    },
    {
        id: 'hint',
        title: 'Stuck? Tap the light bulb 💡',
        body: "Any time you forget a sign, tap the hint bulb. I'll show you exactly how the sign looks so you can copy it. Use it as often as you like with no penalty!",
        image: require('../assets/images/img/senya-hint.jpg'),
        imageStyle: 'contain',
        gradient: ['#F59E0B', '#FBBF24'] as const,
        responseText: "Smart! Hints are your best friend! 🤝",
        icon: 'bulb',
    },
    {
        id: 'rewards',
        title: 'Earn points and badges 🏆',
        body: "Every correct sign gives you points. Keep your streak alive to build energy and collect badges as you master each module.",
        image: require('../assets/images/img/badges.png'),
        imageStyle: 'contain',
        gradient: ['#8B5CF6', '#A78BFA'] as const,
        responseText: "You're going to earn so many badges! ⭐",
        icon: 'trophy',
    },
    {
        id: 'ready',
        title: "Now enjoy your practice! 🎉",
        body: "Take your time, breathe, and have fun. Every sign you make brings you closer to fluent conversations.",
        image: require('../assets/images/img/greet.png'),
        imageStyle: 'contain',
        gradient: ['#10B981', '#34D399'] as const,
        responseText: "Let's practice together! 💪",
        icon: 'happy',
    },
];

const SENYA_REACTIONS = ['👀', '😊', '🌟', '💡', '🎯', '🎉'];

// ─── CONFETTI BURST COMPONENT ──────────────────────────────────────────────
function ConfettiBurst({ trigger, anchor }: { trigger: number; anchor: { x: number; y: number } | null }) {
    const bits = React.useMemo(
        () => Array.from({ length: 24 }).map((_, i) => ({
            i,
            dx: (Math.random() - 0.5) * 280,
            dy: -100 - Math.random() * 200,
            color: ['#FCD34D', '#34D399', '#60A5FA', '#F472B6', '#A78BFA', '#FF8A3D', '#F87171', '#FFD700'][i % 8],
            size: 4 + Math.random() * 10,
            rotation: Math.random() * 720,
            delay: Math.random() * 100,
        })),
        [trigger]
    );
    const t = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!trigger) return;
        t.setValue(0);
        Animated.timing(t, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [trigger]);

    if (!trigger || !anchor) return null;

    return (
        <View pointerEvents="none" style={[styles.burstLayer, { left: anchor.x - 20, top: anchor.y - 20 }]}>
            {bits.map(b => (
                <Animated.View
                    key={`${trigger}-${b.i}`}
                    style={[
                        styles.burstBit,
                        {
                            width: b.size,
                            height: b.size,
                            backgroundColor: b.color,
                            opacity: t.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [1, 1, 0.8, 0] }),
                            transform: [
                                {
                                    translateX: t.interpolate({
                                        inputRange: [0, 0.3, 0.7, 1],
                                        outputRange: [0, b.dx * 0.7, b.dx * 1.1, b.dx]
                                    })
                                },
                                {
                                    translateY: t.interpolate({
                                        inputRange: [0, 0.4, 0.7, 1],
                                        outputRange: [0, b.dy * 0.6, b.dy * 0.9, b.dy]
                                    })
                                },
                                {
                                    rotate: t.interpolate({
                                        inputRange: [0, 0.5, 1],
                                        outputRange: ['0deg', `${b.rotation * 0.5}deg`, `${b.rotation}deg`]
                                    })
                                },
                                {
                                    scale: t.interpolate({
                                        inputRange: [0, 0.2, 0.8, 1],
                                        outputRange: [0.3, 1.2, 1, 0.8]
                                    })
                                },
                            ],
                        },
                        b.i % 2 === 0 ? styles.burstRounded : styles.burstSquare,
                    ]}
                />
            ))}
        </View>
    );
}

export default function GestureTutorialModal({
    visible,
    onClose,
}: {
    visible: boolean;
    onClose: () => void;
}) {
    const [index, setIndex] = useState(0);
    const [showResponse, setShowResponse] = useState(false);
    const [burstTrigger, setBurstTrigger] = useState(0);
    const [burstAnchor, setBurstAnchor] = useState<{ x: number; y: number } | null>(null);
    const nextButtonRef = useRef<View>(null);
    const fade = useRef(new Animated.Value(0)).current;
    const responseFade = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setIndex(0);
            setShowResponse(false);
            setBurstTrigger(0);
            fade.setValue(0);
            slideAnim.setValue(0);
            Animated.parallel([
                Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const handleNextPress = () => {
        // Measure the next button position for confetti
        if (nextButtonRef.current) {
            nextButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
                setBurstAnchor({
                    x: pageX + width / 2,
                    y: pageY + height / 2,
                });
                setBurstTrigger(prev => prev + 1);
            });
        }

        if (index === SLIDES.length - 1) {
            finish();
            return;
        }

        setShowResponse(true);
        responseFade.setValue(0);
        Animated.timing(responseFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();

        setTimeout(() => {
            const next = index + 1;
            setIndex(next);
            setShowResponse(false);
            slideAnim.setValue(0);
            Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();
            setBurstAnchor(null);
        }, 1200);
    };

    const goToPrevious = () => {
        if (index > 0) {
            setShowResponse(false);
            const prev = index - 1;
            setIndex(prev);
            slideAnim.setValue(0);
            Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();
        }
    };

    const finish = async () => {
        await markGestureTutorialSeen();
        onClose();
    };

    const isLast = index === SLIDES.length - 1;
    const currentSlide = SLIDES[index];

    const slideScale = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.92, 1],
    });

    const imageHeight = currentSlide.imageHeight || 160;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={finish}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="rgba(0,0,0,0.5)" />
            <View style={styles.overlay}>
                <SafeAreaView style={styles.safeArea}>
                    {/* Close button - top right */}
                    <TouchableOpacity
                        onPress={finish}
                        style={styles.closeButton}
                        hitSlop={8}
                    >
                        <LinearGradient
                            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                            style={styles.closeButtonGradient}
                        >
                            <Ionicons name="close" size={22} color="#0F3172" />
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Progress dots */}
                    <View style={styles.dotsContainer}>
                        {SLIDES.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    i === index && styles.dotActive,
                                    i < index && styles.dotCompleted,
                                ]}
                            />
                        ))}
                    </View>

                    <Animated.View
                        style={[
                            styles.contentContainer,
                            {
                                opacity: fade,
                                transform: [{ scale: slideScale }],
                            },
                        ]}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                        >
                            {/* Main card with gradient background */}
                            <LinearGradient
                                colors={['#E8F4FD', '#D4E8F8', '#B5D6F0']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.card}
                            >
                                {/* Confetti Burst */}
                                <ConfettiBurst trigger={burstTrigger} anchor={burstAnchor} />

                                {/* Senya's avatar with reaction */}
                                <View style={styles.senyaContainer}>
                                    <View style={styles.senyaAvatar}>
                                        <Image
                                            source={require('../assets/images/img/senya_teaching.png')}
                                            style={styles.senyaImage}
                                            contentFit="contain"
                                        />
                                    </View>
                                    <View style={styles.reactionBadge}>
                                        <Text style={styles.reactionText}>
                                            {SENYA_REACTIONS[index]}
                                        </Text>
                                    </View>
                                    <Text style={styles.senyaName}>Senya</Text>
                                </View>

                                {/* Content area */}
                                <View style={styles.contentArea}>
                                    {/* Title */}
                                    <Text style={styles.title}>{currentSlide.title}</Text>

                                    {/* Image with dynamic height */}
                                    <View style={[styles.imageWrapper, { height: imageHeight }, currentSlide.imageContainerStyle]}>
                                        <Image
                                            source={currentSlide.image}
                                            style={styles.image}
                                            contentFit={currentSlide.imageStyle || 'contain'}
                                        />
                                    </View>

                                    {/* Body text */}
                                    <Text style={styles.body}>{currentSlide.body}</Text>

                                    {/* Senya's response popup */}
                                    {showResponse && (
                                        <Animated.View
                                            style={[
                                                styles.responseContainer,
                                                { opacity: responseFade },
                                            ]}
                                        >
                                            <LinearGradient
                                                colors={currentSlide.gradient}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.responseGradient}
                                            >
                                                <Text style={styles.responseText}>
                                                    {currentSlide.responseText}
                                                </Text>
                                            </LinearGradient>
                                        </Animated.View>
                                    )}

                                    {/* Navigation buttons */}
                                    <View style={styles.navigation}>
                                        <TouchableOpacity
                                            onPress={goToPrevious}
                                            disabled={index === 0}
                                            style={[
                                                styles.navButton,
                                                index === 0 && styles.navButtonDisabled,
                                            ]}
                                        >
                                            <Ionicons
                                                name="chevron-back"
                                                size={20}
                                                color={index === 0 ? 'rgba(15,49,114,0.2)' : '#0F3172'}
                                            />
                                            <Text
                                                style={[
                                                    styles.navButtonText,
                                                    index === 0 && styles.navButtonTextDisabled,
                                                ]}
                                            >
                                                Back
                                            </Text>
                                        </TouchableOpacity>

                                        <View ref={nextButtonRef}>
                                            <TouchableOpacity
                                                style={styles.nextButton}
                                                onPress={handleNextPress}
                                            >
                                                <LinearGradient
                                                    colors={isLast ? ['#10B981', '#34D399'] : ['#0F3172', '#4B7BBB']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.nextGradient}
                                                >
                                                    <Text style={styles.nextButtonText}>
                                                        {isLast ? '🎉 Let\'s Go!' : 'Next →'}
                                                    </Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Step indicator */}
                                    <Text style={styles.stepIndicator}>
                                        {index + 1} / {SLIDES.length}
                                    </Text>
                                </View>
                            </LinearGradient>
                        </ScrollView>
                    </Animated.View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    safeArea: {
        flex: 1,
        width: '80%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 16,
        zIndex: 10,
    },
    closeButtonGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 12,
        marginTop: 50,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    dotActive: {
        width: 24,
        backgroundColor: '#FFFFFF',
    },
    dotCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
    },
    contentContainer: {
        width: '100%',
        maxWidth: 400,
        maxHeight: SCREEN_HEIGHT * 0.85,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 8,
    },
    card: {
        borderRadius: 28,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        position: 'relative',
        overflow: 'hidden',
    },
    senyaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        position: 'relative',
        zIndex: 1,
    },
    senyaAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#0F3172',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    senyaImage: {
        width: '100%',
        height: '100%',
    },
    reactionBadge: {
        position: 'absolute',
        left: 32,
        top: -10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 4,
        paddingVertical: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    reactionText: {
        fontSize: 16,
    },
    senyaName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F3172',
        marginLeft: 10,
    },
    contentArea: {
        flex: 1,
        zIndex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F3172',
        lineHeight: 26,
        textAlign: 'center',
        marginBottom: 10,
    },
    imageWrapper: {
        width: '100%',
        marginBottom: 12,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        borderRadius: 12,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    body: {
        fontSize: 14,
        lineHeight: 22,
        color: '#374151',
        textAlign: 'center',
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    responseContainer: {
        marginBottom: 14,
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: 2,
    },
    responseGradient: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    responseText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    navigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
        zIndex: 3,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    navButtonDisabled: {
        opacity: 0.5,
    },
    navButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F3172',
        marginLeft: 4,
    },
    navButtonTextDisabled: {
        color: 'rgba(15,49,114,0.2)',
    },
    nextButton: {
        flex: 1,
        maxWidth: 150,
    },
    nextGradient: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 999,
        alignItems: 'center',
        shadowColor: '#0F3172',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    nextButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    stepIndicator: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(15,49,114,0.4)',
        marginTop: 2,
        zIndex: 1,
    },
    // ─── CONFETTI STYLES ──────────────────────────────────────────────────────
    burstLayer: {
        position: 'absolute',
        width: 40,
        height: 40,
        zIndex: 999,
        pointerEvents: 'none',
    },
    burstBit: {
        position: 'absolute',
        borderRadius: 2,
    },
    burstRounded: {
        borderRadius: 999,
    },
    burstSquare: {
        borderRadius: 2,
    },
});