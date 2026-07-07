// app/lesson/xp-progress.tsx
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Pressable,
    Animated,
    Dimensions,
    StatusBar,
    DimensionValue,
    ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────
interface ConfettiConfig {
    color: string;
    top?: DimensionValue;
    bottom?: DimensionValue;
    left?: DimensionValue;
    right?: DimensionValue;
    size: number;
    rotate: string;
}

// ─── Decorations ─────────────────────────────────────────────────────────────
const CONFETTI_PIECES: ConfettiConfig[] = [
    { color: '#3B82F6', top: '8%', left: '8%', size: 10, rotate: '15deg' },
    { color: '#60A5FA', top: '6%', right: '10%', size: 12, rotate: '-25deg' },
    { color: '#2563EB', top: '20%', left: '20%', size: 8, rotate: '45deg' },
    { color: '#93C5FD', top: '18%', right: '22%', size: 11, rotate: '10deg' },
    { color: '#3B82F6', top: '35%', left: '5%', size: 9, rotate: '-15deg' },
    { color: '#60A5FA', top: '32%', right: '5%', size: 10, rotate: '30deg' },
    { color: '#1E40AF', top: '3%', left: '45%', size: 11, rotate: '5deg' },
    { color: '#DBEAFE', top: '5%', right: '35%', size: 8, rotate: '-35deg' },
];

export default function XPProgressScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<Record<string, string>>();

    const xpEarned = parseInt(params.xpEarned || '0');
    const totalXp = parseInt(params.totalXp || '0');
    const level = parseInt(params.level || '1');
    const levelName = params.levelName || 'Novice Signer';
    const previousXp = parseInt(params.previousXp || '0');
    const nextLevelXp = parseInt(params.nextLevelXp || '100');

    // Calculate progress
    const progress = Math.min((totalXp / nextLevelXp) * 100, 100);
    const xpNeeded = Math.max(nextLevelXp - totalXp, 0);
    const rawXpGained = totalXp - previousXp;
    const displayXpGained = xpEarned > 0 ? xpEarned : Math.max(0, rawXpGained);
    const targetProgress = progress / 100;

    // ─── Sound Effect ──────────────────────────────────────────────────────
    const [sound, setSound] = React.useState<Audio.Sound | null>(null);

    useEffect(() => {
        // Play level-up sound when component mounts
        async function playSound() {
            try {
                const { sound: newSound } = await Audio.Sound.createAsync(
                    require('../../assets/music/level-up.mp3'),
                    {
                        shouldPlay: true,
                        isLooping: false,
                        volume: 0.8,
                    }
                );
                setSound(newSound);
            } catch (error) {
                console.error('Failed to play sound:', error);
            }
        }
        playSound();

        // Cleanup sound on unmount
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, []);

    // ─── Animation Values ──────────────────────────────────────────────────
    const progressAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const xpTextAnim = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;

    // Run Animation
    useEffect(() => {
        progressAnim.setValue(0);

        const springScale = Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
        });

        const fadeOpacity = Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        });

        const animateProgress = Animated.timing(progressAnim, {
            toValue: targetProgress,
            duration: 1200,
            useNativeDriver: false,
        });

        setTimeout(() => {
            Animated.parallel([springScale, fadeOpacity]).start();
        }, 100);

        setTimeout(() => {
            animateProgress.start();
        }, 400);

        if (displayXpGained > 0) {
            setTimeout(() => {
                Animated.spring(xpTextAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }).start();
            }, 700);
        }

        // Floating animation for level icon
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
    }, []);

    const handleGoHome = () => {
        const showStreak = params.showStreak === 'true';
        const streakDays = parseInt(params.streakDays || '0');

        if (showStreak) {
            router.replace({
                pathname: '/lesson/streak',
                params: {
                    streakDays: String(streakDays),
                    xpEarned: String(xpEarned),
                    totalXp: String(totalXp),
                    level: String(level),
                    levelName: levelName,
                },
            });
        } else {
            router.replace('/(tabs)/dashboard');
        }
    };

    const floatTranslate = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    // ─── Render XP Badge ────────────────────────────────────────────────────
    const renderXPBadge = () => {
        if (displayXpGained <= 0) return null;

        return (
            <Animated.View
                style={[
                    styles.xpGainBadge,
                    {
                        transform: [
                            {
                                scale: xpTextAnim.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0.3, 1.2, 1],
                                }),
                            },
                        ],
                        opacity: xpTextAnim,
                    },
                ]}
            >
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={styles.xpGainText}>+{displayXpGained} XP</Text>
            </Animated.View>
        );
    };

    // ─── Render Progress Bar ──────────────────────────────────────────────
    const renderProgressBar = () => {
        const width = progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
        });

        const isComplete = progress >= 100;

        return (
            <View style={styles.progressBarContainer}>
                <View style={styles.progressBarTrack}>
                    <Animated.View
                        style={[
                            styles.progressBarFillContainer,
                            { width },
                        ]}
                    >
                        <LinearGradient
                            colors={isComplete ? ['#10B981', '#34D399'] : ['#3B82F6', '#60A5FA']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.progressBarFillGradient}
                        />
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.progressBarTip,
                            isComplete && styles.progressBarTipComplete,
                            {
                                left: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, SCREEN_WIDTH - 48 - 26],
                                }),
                            }
                        ]}
                    >
                        <Ionicons
                            name={isComplete ? "checkmark-sharp" : "star"}
                            size={12}
                            color={isComplete ? "#10B981" : "#F59E0B"}
                        />
                    </Animated.View>
                </View>
                <View style={styles.progressLabels}>
                    <Text style={styles.progressLabelText}>
                        {Math.round(progress)}% Complete
                    </Text>
                    <Text style={styles.progressLabelText}>
                        {xpNeeded > 0 ? `✨ ${xpNeeded} XP to next level` : '🏆 Level Up!'}
                    </Text>
                </View>
            </View>
        );
    };

    // ─── Get Level Icon ─────────────────────────────────────────────────────
    const getLevelIcon = () => {
        return require('../../assets/images/img/level_1.png');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Floating Confetti - only decoration */}
                {CONFETTI_PIECES.map((piece, i) => (
                    <View
                        key={`confetti-${i}`}
                        style={[
                            styles.confetti,
                            {
                                backgroundColor: piece.color,
                                top: piece.top,
                                bottom: piece.bottom,
                                left: piece.left,
                                right: piece.right,
                                width: piece.size,
                                height: piece.size,
                                transform: [{ rotate: piece.rotate }],
                            }
                        ]}
                    />
                ))}

                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {/* Header */}
                    <Text style={styles.headerTitle}>
                        {progress >= 100 ? '🎉 LEVEL UP!' : '⭐ GREAT JOB!'}
                    </Text>

                    {/* Level Icon with Floating Animation */}
                    <Animated.View
                        style={[
                            styles.iconContainer,
                            { transform: [{ translateY: floatTranslate }] }
                        ]}
                    >
                        <Image
                            source={getLevelIcon()}
                            style={styles.levelIcon}
                            contentFit="contain"
                        />
                        {renderXPBadge()}
                    </Animated.View>

                    {/* Level Display */}
                    <View style={styles.levelContainer}>
                        <Text style={styles.levelName}>{levelName}</Text>
                        <Text style={styles.levelXpText}>Level {level} · {totalXp} Total XP</Text>
                    </View>

                    {/* Progress Bar */}
                    {renderProgressBar()}

                    {/* Continue Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.homeBtn,
                            { transform: [{ scale: pressed ? 0.97 : 1 }] }
                        ]}
                        onPress={handleGoHome}
                    >
                        <LinearGradient
                            colors={['#2563EB', '#1848c8']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.homeBtnGradient}
                        >
                            <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
                            <Text style={styles.homeBtnText}>Continue</Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 30,
        justifyContent: 'center',
    },
    confetti: {
        position: 'absolute',
        borderRadius: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1E3A8A',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginVertical: 12,
    },
    levelIcon: {
        width: 180,
        height: 180,
    },
    xpGainBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        gap: 4,
        zIndex: 10,
    },
    xpGainText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    levelContainer: {
        alignItems: 'center',
        marginVertical: 4,
    },
    levelName: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1E293B',
    },
    levelXpText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 2,
    },
    progressBarContainer: {
        width: '100%',
        marginVertical: 16,
    },
    progressBarTrack: {
        height: 20,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.15)',
        position: 'relative',
        justifyContent: 'center',
    },
    progressBarFillContainer: {
        height: '100%',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'absolute',
        left: 0,
        top: 0,
    },
    progressBarFillGradient: {
        width: '100%',
        height: '100%',
    },
    progressBarTip: {
        position: 'absolute',
        top: -3,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 4,
        borderColor: '#3B82F6',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 3,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    progressBarTipComplete: {
        borderColor: '#10B981',
        shadowColor: '#10B981',
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingHorizontal: 4,
        width: '100%',
    },
    progressLabelText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
    },
    homeBtn: {
        width: '100%',
        height: 54,
        borderRadius: 27,
        marginTop: 12,
        shadowColor: '#1848c8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
        overflow: 'hidden',
    },
    homeBtnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    homeBtnText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
});