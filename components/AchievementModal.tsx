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

    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const badgeScaleAnim = useRef(new Animated.Value(0.3)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const cardOpacity = useRef(new Animated.Value(1)).current;

    // ─── Play Sound Effect ──────────────────────────────────────────────────
    const playAchievementSound = async () => {
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

    useEffect(() => {
        if (visible) {
            playAchievementSound();
        }
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [visible]);

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
                // Move to next achievement
                setCurrentIndex(currentIndex + 1);
                slideAnim.setValue(SCREEN_WIDTH);
                cardOpacity.setValue(1);

                // Play sound for next achievement
                await playAchievementSound();

                // Slide in animation
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

            {/* Confetti */}
            <ConfettiCannon
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
                    {/* White Background with Light Gradient */}
                    <LinearGradient
                        colors={['#FFFFFF', '#F0F7FF', '#E8F0FE']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradient}
                    />

                    {/* Gold Accent Border - Top */}
                    <LinearGradient
                        colors={['#F59E0B', '#FBBF24', '#D97706']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.goldAccentTop}
                    />

                    {/* Gold Accent Border - Bottom */}
                    <LinearGradient
                        colors={['#D97706', '#FBBF24', '#F59E0B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.goldAccentBottom}
                    />

                    {/* Header - Achievement Counter */}
                    <View style={styles.header}>
                        <Text style={styles.counterText}>
                            {currentIndex + 1} / {totalAchievements}
                        </Text>
                        <View style={styles.headerLine} />
                    </View>

                    {/* Badge Icon with Swipe Animation */}
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
                                colors={['rgba(251, 191, 36, 0.12)', 'rgba(251, 191, 36, 0.05)']}
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
                        <View style={styles.divider} />
                        <Text style={styles.celebrationText}>
                            🎉 Achievement Unlocked!
                        </Text>
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
                            colors={['#F59E0B', '#D97706']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.actionButtonGradient}
                        >
                            <Text style={styles.actionButtonText}>
                                {isLast ? 'Continue' : 'Next Achievement →'}
                            </Text>
                            {!isLast && (
                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                            )}
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
        maxHeight: SCREEN_HEIGHT * 0.72,
        backgroundColor: 'white',
        borderRadius: 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
        elevation: 20,
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 32,
    },
    goldAccentTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    goldAccentBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    header: {
        paddingTop: 24,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    counterText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1,
    },
    headerLine: {
        width: 40,
        height: 2,
        backgroundColor: 'rgba(251, 191, 36, 0.3)',
        borderRadius: 1,
        marginTop: 8,
    },
    badgeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
    },
    badgeCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(251, 191, 36, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(251, 191, 36, 0.15)',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 8,
    },
    badgeGlow: {
        position: 'absolute',
        top: -20,
        left: -20,
        right: -20,
        bottom: -20,
        borderRadius: 100,
    },
    badgeImage: {
        width: 100,
        height: 100,
    },
    infoContainer: {
        paddingHorizontal: 24,
        paddingBottom: 8,
        alignItems: 'center',
    },
    achievementName: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0f3172',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    achievementDescription: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 2,
    },
    divider: {
        width: 60,
        height: 2,
        backgroundColor: 'rgba(251, 191, 36, 0.25)',
        borderRadius: 1,
        marginVertical: 10,
    },
    celebrationText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400E',
        letterSpacing: 0.5,
    },
    actionButton: {
        marginHorizontal: 24,
        marginBottom: 24,
        marginTop: 6,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
});

export default AchievementModal;