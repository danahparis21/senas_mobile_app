// components/AchievementModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    Animated,
    Dimensions,
    StatusBar,
    Easing,
} from 'react-native';
import { Image } from 'expo-image';
import ConfettiCannon from 'react-native-confetti-cannon';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useSettings } from '../contexts/SettingsContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Badge Image Mapping ──────────────────────────────────────────────────────
const BADGE_IMAGES: Record<string, any> = {
    'xp_50': require('../assets/images/img/first_step.png'),
    'xp_100': require('../assets/images/img/alphabet_star.png'),
    'xp_250': require('../assets/images/img/streak1.png'),
    'xp_500': require('../assets/images/img/greetings.png'),
    'xp_1000': require('../assets/images/img/numbers.png'),
    'xp_2500': require('../assets/images/img/badges.png'),
    'xp_5000': require('../assets/images/img/badges.png'),
    'beginner_welcome': require('../assets/images/img/first_step.png'),
    'beginner_5_lessons': require('../assets/images/img/alphabet_star.png'),
    'beginner_10_lessons': require('../assets/images/img/streak1.png'),
    'alphabet_master': require('../assets/images/img/alphabet_star.png'),
    'numbers_master': require('../assets/images/img/numbers.png'),
    'intermediate_reached': require('../assets/images/img/greetings.png'),
    'intermediate_5_lessons': require('../assets/images/img/greetings.png'),
    'intermediate_10_lessons': require('../assets/images/img/greetings.png'),
    'greetings_master': require('../assets/images/img/greetings.png'),
    'advanced_reached': require('../assets/images/img/greetings.png'),
    'advanced_5_lessons': require('../assets/images/img/greetings.png'),
    'graduated': require('../assets/images/img/greetings.png'),
    'streak_3': require('../assets/images/img/streak1.png'),
    'streak_7': require('../assets/images/img/greetings.png'),
    'streak_30': require('../assets/images/img/badges.png'),
    'quiz_whiz': require('../assets/images/img/greetings.png'),
    'leaderboard_top': require('../assets/images/img/badges.png'),
};

const DEFAULT_BADGE = require('../assets/images/img/badges.png');

// ─── Achievement Name Mapping (Clean Names) ──────────────────────────────────
const ACHIEVEMENT_NAMES: Record<string, string> = {
    'xp_50': 'XP Collector',
    'xp_100': 'XP Enthusiast',
    'xp_250': 'XP Warrior',
    'xp_500': 'XP Master',
    'xp_1000': 'XP Legend',
    'xp_2500': 'XP Elite',
    'xp_5000': 'XP Grandmaster',
    'beginner_welcome': 'First Step',
    'beginner_5_lessons': 'Rising Beginner',
    'beginner_10_lessons': 'Dedicated Beginner',
    'alphabet_master': 'Alphabet Star',
    'numbers_master': 'Number Ninja',
    'intermediate_reached': 'Level Up! 🚀',
    'intermediate_5_lessons': 'Rising Intermediate',
    'intermediate_10_lessons': 'Dedicated Intermediate',
    'greetings_master': 'Greeter Expert',
    'advanced_reached': 'Advanced Signer! 🎯',
    'advanced_5_lessons': 'Rising Advanced',
    'graduated': 'GRADUATED! 🎓🎉',
    'streak_3': 'Streak Starter',
    'streak_7': 'Week Warrior',
    'streak_30': 'Monthly Master',
    'quiz_whiz': 'Quiz Whiz',
    'leaderboard_top': '🏆 #1 Champion',
};

// ─── Description Mapping ──────────────────────────────────────────────────────
const ACHIEVEMENT_DESCRIPTIONS: Record<string, string> = {
    'xp_50': 'Earned 50 XP total!',
    'xp_100': 'Earned 100 XP total!',
    'xp_250': 'Earned 250 XP total!',
    'xp_500': 'Earned 500 XP total!',
    'xp_1000': 'Earned 1,000 XP total!',
    'xp_2500': 'Earned 2,500 XP total!',
    'xp_5000': 'Earned 5,000 XP total!',
    'beginner_welcome': 'Completed your very first lesson!',
    'beginner_5_lessons': 'Completed 5 beginner lessons!',
    'beginner_10_lessons': 'Completed 10 beginner lessons!',
    'alphabet_master': 'Learned the entire sign language alphabet!',
    'numbers_master': 'Mastered signing all the numbers!',
    'intermediate_reached': 'Reached the Intermediate level!',
    'intermediate_5_lessons': 'Completed 5 intermediate lessons!',
    'intermediate_10_lessons': 'Completed 10 intermediate lessons!',
    'greetings_master': 'Mastered all the greeting signs!',
    'advanced_reached': 'Reached the Advanced level!',
    'advanced_5_lessons': 'Completed 5 advanced lessons!',
    'graduated': 'Completed the entire course from start to finish!',
    'streak_3': 'Practiced 3 days in a row!',
    'streak_7': 'Practiced 7 days in a row!',
    'streak_30': 'Practiced 30 days in a row!',
    'quiz_whiz': 'Aced a quiz with a perfect score!',
    'leaderboard_top': 'Reached #1 on any leaderboard!',
};

interface Achievement {
    id: number;
    code: string;
    name: string;
    icon: string;
}

interface AchievementModalProps {
    visible: boolean;
    achievements: Achievement[];
    onClose: () => void;
}

interface ConfettiConfig {
    color: string;
    top?: number | string;
    bottom?: number | string;
    left?: number | string;
    right?: number | string;
    size: number;
    rotate: string;
}

// ─── Confetti Decorations ──────────────────────────────────────────────────
const CONFETTI_PIECES: ConfettiConfig[] = [
    { color: '#F59E0B', top: '8%', left: '8%', size: 10, rotate: '15deg' },
    { color: '#FBBF24', top: '6%', right: '10%', size: 12, rotate: '-25deg' },
    { color: '#D97706', top: '20%', left: '20%', size: 8, rotate: '45deg' },
    { color: '#FDE68A', top: '18%', right: '22%', size: 11, rotate: '10deg' },
    { color: '#F59E0B', top: '35%', left: '5%', size: 9, rotate: '-15deg' },
    { color: '#FBBF24', top: '32%', right: '5%', size: 10, rotate: '30deg' },
];

const AchievementModal: React.FC<AchievementModalProps> = ({
    visible,
    achievements,
    onClose,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    // ✅ Get settings
    const { settings } = useSettings();

    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const badgeScaleAnim = useRef(new Animated.Value(0.3)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const cardOpacity = useRef(new Animated.Value(1)).current;

    // ─── Play Sound Effect (only if enabled) ──────────────────────────
    const playAchievementSound = async () => {
        // ✅ Check if sound is enabled before playing
        if (!settings.soundEnabled) {
            console.log('🔇 Sound disabled, skipping achievement sound');
            return;
        }

        try {
            if (sound) {
                await sound.unloadAsync();
            }
            const { sound: newSound } = await Audio.Sound.createAsync(
                require('../assets/music/award2.wav'),
                {
                    shouldPlay: true,
                    isLooping: false,
                    volume: 0.8,
                }
            );
            setSound(newSound);
        } catch (error) {
            console.error('Failed to play achievement sound:', error);
        }
    };

    // 🔥 Play sound when modal becomes visible OR when sound setting changes
    useEffect(() => {
        if (visible) {
            playAchievementSound();
        }
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [visible, settings.soundEnabled]);

    // ─── Animations ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (visible) {
            setCurrentIndex(0);
            slideAnim.setValue(0);
            cardOpacity.setValue(1);

            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(badgeScaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(floatAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatAnim, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scaleAnim.setValue(0.8);
            opacityAnim.setValue(0);
            badgeScaleAnim.setValue(0.3);
            floatAnim.setValue(0);
            slideAnim.setValue(0);
            cardOpacity.setValue(1);
        }
    }, [visible]);

    // ─── Navigation with Swipe Animation ──────────────────────────────────
    const handleNext = async () => {
        if (currentIndex < achievements.length - 1) {
            // Slide out animation
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -SCREEN_WIDTH,
                    duration: 300,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(cardOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(async () => {
                setCurrentIndex(currentIndex + 1);
                slideAnim.setValue(SCREEN_WIDTH);
                cardOpacity.setValue(1);

                // ✅ Only play sound if enabled
                if (settings.soundEnabled) {
                    await playAchievementSound();
                }

                Animated.parallel([
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 300,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.spring(badgeScaleAnim, {
                        toValue: 1,
                        friction: 6,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    if (!visible || achievements.length === 0) return null;

    const currentAchievement = achievements[currentIndex];
    const isLast = currentIndex === achievements.length - 1;
    const totalAchievements = achievements.length;

    // Get clean display name
    const displayName = currentAchievement?.code
        ? (ACHIEVEMENT_NAMES[currentAchievement.code] || currentAchievement.name || 'Achievement Unlocked!')
        : 'Achievement Unlocked!';

    // Get description
    const description = currentAchievement?.code
        ? (ACHIEVEMENT_DESCRIPTIONS[currentAchievement.code] || '')
        : '';

    // Get the badge image
    const badgeImage = currentAchievement?.code
        ? (BADGE_IMAGES[currentAchievement.code] || DEFAULT_BADGE)
        : DEFAULT_BADGE;

    const floatTranslate = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -12],
    });

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={handleClose}
        >
            <StatusBar barStyle="dark-content" backgroundColor="rgba(255,255,255,0.5)" />

            {/* Confetti - keyed by achievement index so it replays for every achievement, not just the first */}
            <ConfettiCannon
                key={`confetti-${currentIndex}`}
                count={200}
                origin={{ x: SCREEN_WIDTH / 2 - 20, y: -20 }}
                autoStart={true}
                fadeOut={true}
                fallSpeed={3500}
                colors={['#F59E0B', '#FBBF24', '#D97706', '#FDE68A', '#FFD700']}
            />

            {/* Floating Confetti Decorations */}
            {CONFETTI_PIECES.map((piece, i) => (
                <View
                    key={`confetti-${i}`}
                    style={[
                        styles.confetti,
                        {
                            backgroundColor: piece.color,
                            top: piece.top as any,
                            bottom: piece.bottom as any,
                            left: piece.left as any,
                            right: piece.right as any,
                            width: piece.size,
                            height: piece.size,
                            transform: [{ rotate: piece.rotate }],
                        }
                    ]}
                />
            ))}

            <Pressable style={styles.overlay} onPress={handleClose}>
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* White Body Background */}
                    <View style={styles.bodyBackground} />

                    {/* Curved Gradient Hero Header */}
                    <View style={styles.heroHeader}>
                        <LinearGradient
                            colors={['#FDE047', '#F59E0B', '#D97706']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />

                        {/* Decorative Sparkles */}
                        <Ionicons name="sparkles" size={22} color="rgba(255,255,255,0.85)" style={styles.sparkleTopLeft} />
                        <Ionicons name="sparkles" size={16} color="rgba(255,255,255,0.6)" style={styles.sparkleTopRight} />
                        <View style={[styles.dot, styles.dotOne]} />
                        <View style={[styles.dot, styles.dotTwo]} />
                        <View style={[styles.diamond, styles.diamondOne]} />

                        {/* Header - Achievement Counter */}
                        <View style={styles.header}>
                            <View style={styles.counterPill}>
                                <Text style={styles.counterText}>
                                    {currentIndex + 1} / {totalAchievements}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Badge Icon with Swipe Animation - overlaps hero + body seam */}
                    <Animated.View
                        style={[
                            styles.badgeContainer,
                            {
                                transform: [
                                    { translateY: floatTranslate },
                                    { translateX: slideAnim },
                                ],
                                opacity: cardOpacity,
                            }
                        ]}
                    >
                        <Animated.View
                            style={[
                                styles.badgeCircle,
                                { transform: [{ scale: badgeScaleAnim }] }
                            ]}
                        >
                            <LinearGradient
                                colors={['rgba(251, 191, 36, 0.18)', 'rgba(251, 191, 36, 0.06)']}
                                style={styles.badgeGlow}
                            />
                            <Image
                                source={badgeImage}
                                style={styles.badgeImage}
                                contentFit="contain"
                            />
                        </Animated.View>
                    </Animated.View>

                    {/* Achievement Info with Swipe Animation */}
                    <Animated.View
                        style={[
                            styles.infoContainer,
                            {
                                transform: [{ translateX: slideAnim }],
                                opacity: cardOpacity,
                            }
                        ]}
                    >
                        <Text style={styles.achievementName}>
                            {displayName}
                        </Text>
                        {description ? (
                            <Text style={styles.achievementDescription}>
                                {description}
                            </Text>
                        ) : null}
                        <View style={styles.celebrationChip}>
                            <Text style={styles.celebrationText}>
                                🎉 Achievement Unlocked!
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Next/Continue Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.actionButton,
                            { transform: [{ scale: pressed ? 0.97 : 1 }] },
                        ]}
                        onPress={handleNext}
                    >
                        <LinearGradient
                            colors={['#FBBF24', '#F59E0B', '#D97706']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.actionButtonGradient}
                        >
                            <Text style={styles.actionButtonText}>
                                {isLast ? 'Continue' : 'Next Achievement'}
                            </Text>
                            <Ionicons
                                name={isLast ? 'checkmark-circle' : 'arrow-forward-circle'}
                                size={24}
                                color="#fff"
                            />
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confetti: {
        position: 'absolute',
        borderRadius: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
        zIndex: 10,
    },
    modalContent: {
        width: SCREEN_WIDTH * 0.88,
        maxHeight: SCREEN_HEIGHT * 0.78,
        backgroundColor: 'white',
        borderRadius: 36,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.2,
        shadowRadius: 40,
        elevation: 20,
    },
    bodyBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
    },
    // Curved gradient hero header sitting behind the badge
    heroHeader: {
        height: 190,
        width: '100%',
        borderBottomLeftRadius: SCREEN_WIDTH,
        borderBottomRightRadius: SCREEN_WIDTH,
        overflow: 'hidden',
        transform: [{ scaleX: 1.4 }],
    },
    header: {
        paddingTop: 20,
        alignItems: 'center',
        transform: [{ scaleX: 1 / 1.4 }], // counter the header's horizontal stretch
    },
    counterPill: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 20,
    },
    counterText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    sparkleTopLeft: {
        position: 'absolute',
        top: 22,
        left: '32%',
        transform: [{ scaleX: 1 / 1.4 }],
    },
    sparkleTopRight: {
        position: 'absolute',
        top: 34,
        right: '30%',
        transform: [{ scaleX: 1 / 1.4 }],
    },
    dot: {
        position: 'absolute',
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.55)',
    },
    dotOne: {
        width: 8,
        height: 8,
        top: 55,
        left: '38%',
    },
    dotTwo: {
        width: 6,
        height: 6,
        top: 18,
        right: '37%',
    },
    diamond: {
        position: 'absolute',
        width: 8,
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.5)',
        transform: [{ rotate: '45deg' }],
    },
    diamondOne: {
        top: 45,
        right: '25%',
    },
    badgeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -128,
    },
    badgeCircle: {
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 6,
        borderColor: '#FFFFFF',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
    },
    badgeGlow: {
        position: 'absolute',
        top: -16,
        left: -16,
        right: -16,
        bottom: -16,
        borderRadius: 130,
    },
    badgeImage: {
        width: 168,
        height: 168,
    },
    infoContainer: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 8,
        alignItems: 'center',
    },
    achievementName: {
        fontSize: 30,
        fontWeight: '900',
        color: '#0f3172',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    achievementDescription: {
        fontSize: 15,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 20,
    },
    celebrationChip: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 14,
    },
    celebrationText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#92400E',
        letterSpacing: 0.3,
    },
    actionButton: {
        marginHorizontal: 24,
        marginBottom: 26,
        marginTop: 18,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    actionButtonText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.4,
    },
});

export default AchievementModal;