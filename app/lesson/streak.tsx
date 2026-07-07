// app/lesson/streak.tsx
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
    ScrollView,
    DimensionValue
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
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
    { color: '#F59E0B', top: '8%', left: '8%', size: 10, rotate: '15deg' },
    { color: '#FBBF24', top: '6%', right: '10%', size: 12, rotate: '-25deg' },
    { color: '#D97706', top: '20%', left: '20%', size: 8, rotate: '45deg' },
    { color: '#FDE68A', top: '18%', right: '22%', size: 11, rotate: '10deg' },
    { color: '#F59E0B', top: '35%', left: '5%', size: 9, rotate: '-15deg' },
    { color: '#FBBF24', top: '32%', right: '5%', size: 10, rotate: '30deg' },
];

export default function StreakScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<Record<string, string>>();

    const streakDays = parseInt(params.streakDays || '0');

    // ─── Sound Effect ──────────────────────────────────────────────────────
    const [sound, setSound] = React.useState<Audio.Sound | null>(null);

    useEffect(() => {
        // Play streak sound when component mounts
        async function playSound() {
            try {
                const { sound: newSound } = await Audio.Sound.createAsync(
                    require('../../assets/music/achievement.mp3'),
                    {
                        shouldPlay: true,
                        isLooping: false,
                        volume: 0.8,
                    }
                );
                setSound(newSound);
            } catch (error) {
                console.error('Failed to play streak sound:', error);
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

    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const badgeAnim = useRef(new Animated.Value(0)).current;
    const todayPulseAnim = useRef(new Animated.Value(1)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 50,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();

        Animated.spring(badgeAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();

        // Pulse animation for today's circle
        Animated.loop(
            Animated.sequence([
                Animated.timing(todayPulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(todayPulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Floating animation for streak icon
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
        router.push('/(tabs)/dashboard');
    };

    const badgeScale = badgeAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 1.1, 1],
    });

    const todayScale = todayPulseAnim.interpolate({
        inputRange: [1, 1.2],
        outputRange: [1, 1.1],
    });

    const floatTranslate = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -12],
    });

    const isMilestone = streakDays > 0 && streakDays % 3 === 0;

    const getStreakMessage = () => {
        if (isMilestone) return `🎉 ${streakDays}-Day Streak!`;
        return `${streakDays}-Day Streak!`;
    };

    const getNextMilestone = () => {
        if (streakDays < 3) return 3;
        if (streakDays < 7) return 7;
        if (streakDays < 14) return 14;
        if (streakDays < 30) return 30;
        return null;
    };

    const nextMilestone = getNextMilestone();

    // ─── Weekly Calendar View ──────────────────────────────────────────────
    const getWeekDays = () => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const today = new Date();
        const currentDay = today.getDay();

        const startOfWeek = new Date(today);
        const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
        startOfWeek.setDate(today.getDate() - diffToMonday);

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const daysSinceStart = Math.floor((date.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));

            weekDays.push({
                name: days[i],
                date: date,
                isToday: date.toDateString() === today.toDateString(),
                isFuture: date > today,
                dayOffset: daysSinceStart,
            });
        }
        return weekDays;
    };

    const weekDays = getWeekDays();

    const getDayStatus = (dayOffset: number) => {
        const today = new Date();
        const todayDayOffset = weekDays.find(d => d.isToday)?.dayOffset ?? 0;
        const daysAgo = todayDayOffset - dayOffset;
        if (daysAgo < 0) return false;
        return daysAgo < streakDays;
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Floating Confetti */}
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
                    {/* Streak Title */}
                    <Text style={styles.headerTitle}>
                        {streakDays > 0 ? getStreakMessage() : 'Start Your Streak!'}
                    </Text>

                    {/* Big Streak Icon with Floating Animation */}
                    <Animated.View
                        style={[
                            styles.streakIconContainer,
                            { transform: [{ translateY: floatTranslate }] }
                        ]}
                    >
                        <Image
                            source={require('../../assets/images/img/streak1.png')}
                            style={styles.streakIcon}
                            contentFit="contain"
                        />

                        <Animated.View
                            style={[
                                styles.dayCounterBadge,
                                { transform: [{ scale: badgeScale }] }
                            ]}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#D97706']}
                                style={styles.dayBadgeGradient}
                            >
                                <Text style={styles.dayNumber}>{streakDays}</Text>
                                <Text style={styles.dayLabel}>DAYS</Text>
                            </LinearGradient>
                        </Animated.View>
                    </Animated.View>

                    {/* Weekly Calendar */}
                    <View style={styles.calendarContainer}>
                        <Text style={styles.calendarTitle}>This Week</Text>
                        <View style={styles.calendarRow}>
                            {weekDays.map((day, index) => {
                                const isActive = getDayStatus(day.dayOffset);
                                const isToday = day.isToday;
                                const isFuture = day.isFuture;
                                const shouldShowCheck = isActive && !isFuture;

                                return (
                                    <View key={index} style={styles.calendarDay}>
                                        <Animated.View
                                            style={[
                                                styles.calendarDayCircle,
                                                shouldShowCheck && styles.calendarDayActive,
                                                isToday && styles.calendarDayToday,
                                                isToday && { transform: [{ scale: todayScale }] },
                                                isFuture && styles.calendarDayFuture,
                                            ]}
                                        >
                                            {shouldShowCheck && (
                                                <Ionicons
                                                    name="checkmark"
                                                    size={16}
                                                    color={isToday ? "#78350F" : "#FFFFFF"}
                                                />
                                            )}
                                            {isToday && !shouldShowCheck && (
                                                <View style={styles.todayDot} />
                                            )}
                                        </Animated.View>
                                        <Text
                                            style={[
                                                styles.calendarDayName,
                                                shouldShowCheck && styles.calendarDayNameActive,
                                                isToday && styles.calendarDayNameToday,
                                                isFuture && styles.calendarDayNameFuture,
                                            ]}
                                        >
                                            {day.name}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Next Milestone Progress */}
                    {nextMilestone && (
                        <View style={styles.milestoneContainer}>
                            <View style={styles.milestoneHeader}>
                                <Text style={styles.milestoneLabel}>
                                    Next Milestone: {nextMilestone} Days
                                </Text>
                                <Text style={styles.milestoneProgress}>
                                    {streakDays}/{nextMilestone}
                                </Text>
                            </View>
                            <View style={styles.milestoneTrack}>
                                <View
                                    style={[
                                        styles.milestoneFill,
                                        { width: `${(streakDays / nextMilestone) * 100}%` }
                                    ]}
                                />
                            </View>
                        </View>
                    )}

                    {/* Continue Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.homeBtn,
                            { transform: [{ scale: pressed ? 0.97 : 1 }] }
                        ]}
                        onPress={handleGoHome}
                    >
                        <LinearGradient
                            colors={['#F59E0B', '#D97706']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.homeBtnGradient}
                        >
                            <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
                            <Text style={styles.homeBtnText}>Continue to Dashboard</Text>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

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
        color: '#92400E',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    streakIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginVertical: 12,
    },
    streakIcon: {
        width: 280,
        height: 280,
    },
    dayCounterBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    dayBadgeGradient: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayNumber: {
        fontSize: 22,
        fontWeight: '900',
        color: '#fff',
        lineHeight: 26,
    },
    dayLabel: {
        fontSize: 7,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: 1,
    },
    calendarContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 16,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    calendarTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#78350F',
        textAlign: 'center',
        marginBottom: 12,
    },
    calendarRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    calendarDay: {
        alignItems: 'center',
        gap: 4,
    },
    calendarDayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    calendarDayActive: {
        backgroundColor: '#F59E0B',
        borderColor: '#D97706',
    },
    calendarDayToday: {
        borderColor: '#F59E0B',
        borderWidth: 2.5,
        backgroundColor: '#FFFBEB',
    },
    calendarDayFuture: {
        backgroundColor: 'rgba(243, 244, 246, 0.5)',
        borderColor: 'rgba(156, 163, 175, 0.2)',
    },
    todayDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B',
    },
    calendarDayName: {
        fontSize: 10,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    calendarDayNameActive: {
        color: '#78350F',
        fontWeight: '700',
    },
    calendarDayNameToday: {
        color: '#F59E0B',
        fontWeight: '700',
    },
    calendarDayNameFuture: {
        color: '#D1D5DB',
        fontWeight: '400',
    },
    milestoneContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    milestoneHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    milestoneLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#78350F',
    },
    milestoneProgress: {
        fontSize: 13,
        fontWeight: '700',
        color: '#B45309',
    },
    milestoneTrack: {
        height: 6,
        backgroundColor: 'rgba(251,191,36,0.15)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    milestoneFill: {
        height: '100%',
        backgroundColor: '#F59E0B',
        borderRadius: 3,
    },
    homeBtn: {
        width: '100%',
        height: 54,
        borderRadius: 27,
        marginTop: 12,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
        overflow: 'hidden',
    },
    homeBtnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    homeBtnText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
});