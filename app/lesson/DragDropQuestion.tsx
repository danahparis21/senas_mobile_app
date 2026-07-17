// app/lesson/DragDropQuestion.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    Animated,
    SafeAreaView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Image } from 'expo-image';
import Constants from 'expo-constants';


const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api';
// Remove /api from the end to get the base URL for images
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── FONT ──────────────────────────────────────────────────────────────────
const FONT_FAMILY = Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' });

// ─── SOUND EFFECTS ──────────────────────────────────────────────────────────
const CORRECT_SOUND = require('../../assets/music/correct.mp3');
const WRONG_SOUND = require('../../assets/music/wrong.mp3');

// ─── MOTIVATIONS (Senya speech bubble) ─────────────────────────────────────
const SENYA_MOTIVATIONS = [
    "You've got this! Tap and match! ✋",
    "Nice work! Keep going!",
    "Almost there! Match them all!",
    "You're doing amazing!",
    "Deep breath. You can do this!",
];

interface DragDropPair {
    left_text: string;
    left_image?: string | null;
    right_text: string;
    right_image?: string | null;
    match_id: number;
}

interface DragDropQuestionProps {
    question: {
        question_id: number;
        question_text: string;
        drag_drop_pairs: DragDropPair[];
        drag_drop_left_label?: string | null;
        drag_drop_right_label?: string | null;
        media_url?: string | null;
    };
    questionIndex: number;
    totalQuestions: number;
    onComplete: (success: boolean) => void;
    onBack: () => void;
}

const MAX_WRONG_ATTEMPTS = 2;

export default function DragDropQuestion({
    question,
    questionIndex,
    totalQuestions,
    onComplete,
    onBack,
}: DragDropQuestionProps) {
    const [leftItems, setLeftItems] = useState<DragDropPair[]>([]);
    const [rightItems, setRightItems] = useState<DragDropPair[]>([]);
    const [matches, setMatches] = useState<Record<number, number>>({});
    const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
    const [selectedRight, setSelectedRight] = useState<number | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [wrongPair, setWrongPair] = useState<{ left: number | null; right: number | null }>({ left: null, right: null });
    const [showContinue, setShowContinue] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [motivationIndex, setMotivationIndex] = useState(0);

    // Audio states
    const [correctSound, setCorrectSound] = useState<Audio.Sound | null>(null);
    const [wrongSound, setWrongSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState(false);

    // Senya animations
    const senyaBounceAnim = useRef(new Animated.Value(0)).current;
    const senyaShakeAnim = useRef(new Animated.Value(0)).current;
    // Helper function to get full image URL
    const getFullImageUrl = (path: string | null | undefined): string | null => {
        if (!path) return null;
        // If it's already a full URL, return it
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        // Remove leading slash if present
        const cleanPath = path.replace(/^\/+/, '');
        return `${IMAGE_BASE_URL}/storage/${cleanPath}`;
    };


    // ── Play correct sound ──
    async function playCorrectSoundEffect() {
        try {
            if (isSoundPlaying) return;
            setIsSoundPlaying(true);
            if (correctSound) await correctSound.unloadAsync();
            const { sound } = await Audio.Sound.createAsync(
                CORRECT_SOUND,
                { shouldPlay: true, isLooping: false, volume: 0.8 }
            );
            setCorrectSound(sound);
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                    setCorrectSound(null);
                    setIsSoundPlaying(false);
                }
            });
        } catch (error) {
            console.error('Failed to play correct sound:', error);
            setIsSoundPlaying(false);
        }
    }

    // ── Play wrong sound ──
    async function playWrongSoundEffect() {
        try {
            if (isSoundPlaying) return;
            setIsSoundPlaying(true);
            if (wrongSound) await wrongSound.unloadAsync();
            const { sound } = await Audio.Sound.createAsync(
                WRONG_SOUND,
                { shouldPlay: true, isLooping: false, volume: 0.6 }
            );
            setWrongSound(sound);
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                    setWrongSound(null);
                    setIsSoundPlaying(false);
                }
            });
        } catch (error) {
            console.error('Failed to play wrong sound:', error);
            setIsSoundPlaying(false);
        }
    }

    // ── Senya animations ──
    const animateSenyaBounce = () => {
        senyaBounceAnim.setValue(0);
        Animated.spring(senyaBounceAnim, {
            toValue: 1,
            friction: 4,
            tension: 90,
            useNativeDriver: true,
        }).start(() => senyaBounceAnim.setValue(0));
    };

    const animateSenyaShake = () => {
        senyaShakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(senyaShakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.timing(senyaShakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
            Animated.timing(senyaShakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.timing(senyaShakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
            Animated.timing(senyaShakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start();
    };



    // Rotate motivation every ~6s
    useEffect(() => {
        const t = setInterval(() => {
            setMotivationIndex(i => (i + 1) % SENYA_MOTIVATIONS.length);
        }, 6000);
        return () => clearInterval(t);
    }, []);

    // Cleanup sounds
    useEffect(() => {
        return () => {
            if (correctSound) correctSound.unloadAsync();
            if (wrongSound) wrongSound.unloadAsync();
        };
    }, []);

    const handleLeftPress = (index: number) => {
        if (isComplete || isAnimating) return;
        if (matches[index] !== undefined) return;

        setSelectedLeft(selectedLeft === index ? null : index);
        if (selectedLeft === index) {
            setSelectedLeft(null);
        } else {
            setSelectedLeft(index);
            if (selectedRight !== null && !isAnimating) {
                attemptMatch(index, selectedRight);
            }
        }
    };

    const handleRightPress = (index: number) => {
        if (isComplete || isAnimating) return;
        const isMatched = Object.values(matches).includes(index);
        if (isMatched) return;

        setSelectedRight(selectedRight === index ? null : index);
        if (selectedRight === index) {
            setSelectedRight(null);
        } else {
            setSelectedRight(index);
            if (selectedLeft !== null && !isAnimating) {
                attemptMatch(selectedLeft, index);
            }
        }
    };

    const attemptMatch = (leftIndex: number, rightIndex: number) => {
        if (isAnimating) return;
        setIsAnimating(true);

        const leftItem = leftItems[leftIndex];
        const rightItem = rightItems[rightIndex];

        if (!leftItem || !rightItem) {
            setIsAnimating(false);
            return;
        }

        if (leftItem.match_id === rightItem.match_id) {
            // ✅ Correct match!
            playCorrectSoundEffect();
            animateSenyaBounce();

            setMatches(prev => ({ ...prev, [leftIndex]: rightIndex }));
            setSelectedLeft(null);
            setSelectedRight(null);

            const totalPairs = leftItems.length;
            const matchedCount = Object.keys(matches).length + 1;

            if (matchedCount === totalPairs) {
                setIsComplete(true);
            }

            setIsAnimating(false);
        } else {
            // ❌ Wrong match
            playWrongSoundEffect();
            animateSenyaShake();

            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setWrongPair({ left: leftIndex, right: rightIndex });

            setTimeout(() => {
                setWrongPair({ left: null, right: null });
                setSelectedLeft(null);
                setSelectedRight(null);
                setIsAnimating(false);

                if (newAttempts >= MAX_WRONG_ATTEMPTS) {
                    setShowContinue(true);
                    setIsComplete(true);
                }
            }, 600);
        }
    };

    // ─── RENDER LEFT ITEM ──────────────────────────────────────────────────
    const renderLeftItem = (item: DragDropPair, index: number) => {
        const isMatched = matches[index] !== undefined;
        const isSelected = selectedLeft === index;
        const isWrongItem = wrongPair.left === index;

        const imageUrl = getFullImageUrl(item.left_image);
        const hasImage = !!imageUrl;
        const hasText = item.left_text && item.left_text.length > 0;

        // Determine if this item has content (image or text)
        const hasContent = hasImage || hasText;

        return (
            <Pressable
                key={`left-${index}`}
                style={[
                    styles.itemCard,
                    isSelected && styles.itemCardSelected,
                    isMatched && styles.itemCardMatched,
                    isWrongItem && styles.itemCardWrong,
                    (isMatched || isComplete) && styles.itemCardDisabled,
                    // Use the same size class for all items in the column
                    hasContent && styles.itemCardWithContent,
                    !hasContent && styles.itemCardEmpty,
                ]}
                onPress={() => handleLeftPress(index)}
                disabled={isMatched || isComplete || isAnimating}
            >
                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={[
                            styles.itemImage,
                            hasText ? styles.itemImageWithText : styles.itemImageOnly,
                        ]}
                        contentFit="contain"
                        onError={(error) => {
                            console.log('❌ Left image load error:', error, 'URL:', imageUrl);
                        }}
                    />
                ) : null}
                {hasText && !imageUrl && (
                    <Text style={[
                        styles.itemText,
                        styles.itemTextOnly,
                        isMatched && styles.itemTextMatched,
                        isSelected && styles.itemTextSelected,
                        isWrongItem && styles.itemTextWrong,
                        isComplete && !isMatched && styles.itemTextDisabled,
                    ]}>
                        {item.left_text}
                    </Text>
                )}
                {imageUrl && hasText && (
                    <Text style={[
                        styles.itemText,
                        styles.itemTextWithImage,
                        isMatched && styles.itemTextMatched,
                        isSelected && styles.itemTextSelected,
                        isWrongItem && styles.itemTextWrong,
                        isComplete && !isMatched && styles.itemTextDisabled,
                    ]}>
                        {item.left_text}
                    </Text>
                )}
                {!imageUrl && !hasText && (
                    <Text style={[styles.itemText, styles.itemTextEmpty]}>—</Text>
                )}
                {isMatched && (
                    <View style={styles.matchBadge}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                )}
                {isWrongItem && (
                    <View style={styles.wrongIndicator}>
                        <Ionicons name="close" size={14} color="#fff" />
                    </View>
                )}
            </Pressable>
        );
    };

    // ─── RENDER RIGHT ITEM ──────────────────────────────────────────────────
    const renderRightItem = (item: DragDropPair, index: number) => {
        const isMatched = Object.values(matches).includes(index);
        const isSelected = selectedRight === index;
        const isWrongItem = wrongPair.right === index;

        const imageUrl = getFullImageUrl(item.right_image);
        const hasImage = !!imageUrl;
        const hasText = item.right_text && item.right_text.length > 0;

        const hasContent = hasImage || hasText;

        return (
            <Pressable
                key={`right-${index}`}
                style={[
                    styles.itemCard,
                    isSelected && styles.itemCardSelected,
                    isMatched && styles.itemCardMatched,
                    isWrongItem && styles.itemCardWrong,
                    (isMatched || isComplete) && styles.itemCardDisabled,
                    hasContent && styles.itemCardWithContent,
                    !hasContent && styles.itemCardEmpty,
                ]}
                onPress={() => handleRightPress(index)}
                disabled={isMatched || isComplete || isAnimating}
            >
                {imageUrl ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={[
                            styles.itemImage,
                            hasText ? styles.itemImageWithText : styles.itemImageOnly,
                        ]}
                        contentFit="contain"
                        onError={(error) => {
                            console.log('❌ Right image load error:', error, 'URL:', imageUrl);
                        }}
                    />
                ) : null}
                {hasText && !imageUrl && (
                    <Text style={[
                        styles.itemText,
                        styles.itemTextOnly,
                        isMatched && styles.itemTextMatched,
                        isSelected && styles.itemTextSelected,
                        isWrongItem && styles.itemTextWrong,
                        isComplete && !isMatched && styles.itemTextDisabled,
                    ]}>
                        {item.right_text}
                    </Text>
                )}
                {imageUrl && hasText && (
                    <Text style={[
                        styles.itemText,
                        styles.itemTextWithImage,
                        isMatched && styles.itemTextMatched,
                        isSelected && styles.itemTextSelected,
                        isWrongItem && styles.itemTextWrong,
                        isComplete && !isMatched && styles.itemTextDisabled,
                    ]}>
                        {item.right_text}
                    </Text>
                )}
                {!imageUrl && !hasText && (
                    <Text style={[styles.itemText, styles.itemTextEmpty]}>—</Text>
                )}
                {isMatched && (
                    <View style={styles.matchBadge}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                )}
                {isWrongItem && (
                    <View style={styles.wrongIndicator}>
                        <Ionicons name="close" size={14} color="#fff" />
                    </View>
                )}
            </Pressable>
        );
    };


    useEffect(() => {
        // Reset all state when the question changes
        setMatches({});
        setSelectedLeft(null);
        setSelectedRight(null);
        setIsComplete(false);
        setAttempts(0);
        setWrongPair({ left: null, right: null });
        setShowContinue(false);
        setIsAnimating(false);

        // Re-initialize items
        if (question.drag_drop_pairs && question.drag_drop_pairs.length > 0) {
            const pairs = question.drag_drop_pairs;
            setLeftItems(pairs);
            // Keep right items in the same order as left items
            // This ensures matches work correctly
            setRightItems([...pairs]);
        }
    }, [question.drag_drop_pairs, question.question_id]);

    const allMatched = Object.keys(matches).length === leftItems.length;
    const livesRemaining = MAX_WRONG_ATTEMPTS - attempts;
    const isGameOver = showContinue && !allMatched;
    const senyaTranslate = senyaBounceAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -15],
    });
    const senyaShake = senyaShakeAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [-10, 0, 10],
    });

    const getMotivationText = () => {
        if (isGameOver) {
            return "😅 Oops! Don't worry, let's move to the next question!";
        }
        if (allMatched) {
            return "🎉 Perfect! You matched everything!";
        }
        return SENYA_MOTIVATIONS[motivationIndex];
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* ─── TOP BAR ────────────────────────────────────────────────── */}
                <View style={styles.topBar}>
                    <Pressable onPress={onBack} style={styles.exitBtn}>
                        <Ionicons name="arrow-back" size={20} color="#0f3172" />
                    </Pressable>
                    <Text style={styles.logoText}>SEÑAS</Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                            {allMatched ? 'Done' : isGameOver ? 'Wrong' : 'Match'}
                        </Text>
                    </View>
                </View>

                {/* ─── PROGRESS ─────────────────────────────────────────────── */}
                <View style={styles.glassCard}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>
                            Question {questionIndex + 1} of {totalQuestions}
                        </Text>
                    </View>
                    <View style={styles.progressDots}>
                        {Array.from({ length: totalQuestions }).map((_, i) => (
                            <View key={i} style={[styles.progressDot, {
                                backgroundColor: i < questionIndex ? '#22c55e' :
                                    i === questionIndex ? '#2563EB' :
                                        'rgba(15,49,114,0.10)',
                            }]} />
                        ))}
                    </View>
                </View>

                {/* ─── QUESTION CARD ──────────────────────────────────────────── */}
                <View style={[styles.glassCard, styles.questionCard]}>
                    <Text style={styles.questionEmoji}>🧩</Text>
                    <Text style={styles.questionText}>{question.question_text}</Text>
                    {question.media_url && (
                        <Image
                            source={{ uri: getFullImageUrl(question.media_url) || question.media_url }}
                            style={styles.questionImage}
                            contentFit="contain"
                        />
                    )}
                </View>

                {/* ─── DRAG & DROP COLUMNS ────────────────────────────────────── */}
                <View style={styles.columnsContainer}>
                    <View style={styles.column}>
                        <Text style={styles.columnLabel}>{question.drag_drop_left_label || 'Match these'}</Text>
                        <View style={styles.columnContent}>
                            {leftItems.map((item, index) => renderLeftItem(item, index))}
                        </View>
                    </View>

                    <View style={styles.columnDivider}>
                        <View style={styles.dividerLine} />
                        <View style={styles.dividerIcon}>
                            <Ionicons name="arrow-forward" size={16} color="#1848c8" />
                        </View>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.column}>
                        <Text style={styles.columnLabel}>{question.drag_drop_right_label || 'To these'}</Text>
                        <View style={styles.columnContent}>
                            {rightItems.map((item, index) => renderRightItem(item, index))}
                        </View>
                    </View>
                </View>

                {/* ─── SENYA FEEDBACK ──────────────────────────────────────── */}
                <View style={styles.feedbackRow}>
                    <Animated.View
                        style={{
                            transform: [
                                { translateY: senyaTranslate },
                                { translateX: senyaShake },
                            ],
                        }}
                    >
                        <Image
                            source={require('../../assets/images/img/senya_teaching.png')}
                            style={styles.senyaFeedback}
                            contentFit="contain"
                        />
                    </Animated.View>
                    <View style={[
                        styles.feedbackBubble,
                        isComplete && allMatched && styles.feedbackCorrect,
                        isComplete && !allMatched && styles.feedbackWrong,
                    ]}>
                        {(isComplete && allMatched) && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                        {(isComplete && !allMatched) && <Ionicons name="close-circle" size={18} color="#EF4444" />}
                        <Text style={[
                            styles.feedbackText,
                            isComplete && allMatched && { color: '#065f46' },
                            isComplete && !allMatched && { color: '#991b1b' },
                        ]}>
                            {getMotivationText()}
                        </Text>
                    </View>
                </View>

                {/* ─── CONTINUE BUTTON ─────────────────────────────────────────── */}
                {isComplete && (
                    <Pressable
                        style={[styles.primaryBtn, allMatched && styles.goldBtn]}
                        onPress={() => onComplete(allMatched)}
                    >
                        <Text style={styles.primaryBtnText}>
                            {allMatched ? '✅ Continue →' : 'Continue →'}
                        </Text>
                    </Pressable>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaf5fd',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },

    // ─── TOP BAR ─────────────────────────────────────────────────────────
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    logoText: {
        color: '#0f3172',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 2,
    },
    exitBtn: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
    },
    statusBadge: {
        backgroundColor: 'rgba(16,185,129,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },

    // ─── GLASS CARD ──────────────────────────────────────────────────────
    glassCard: {
        backgroundColor: 'rgba(255,255,255,0.62)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        borderRadius: 20,
        padding: 18,
        marginBottom: 12,
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 12,
        elevation: 4,
    },

    // ─── PROGRESS ───────────────────────────────────────────────────────────
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0f3172',
    },
    progressDots: {
        flexDirection: 'row',
        gap: 4,
    },
    progressDot: {
        flex: 1,
        height: 5,
        borderRadius: 99,
    },

    // ─── QUESTION CARD ──────────────────────────────────────────────────────
    questionCard: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    questionEmoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f3172',
        textAlign: 'center',
        lineHeight: 24,
    },
    questionImage: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        marginTop: 12,
        backgroundColor: 'rgba(15,49,114,0.03)',
    },

    // ─── COLUMNS ────────────────────────────────────────────────────────────
    columnsContainer: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    column: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.35)',
        borderRadius: 14,
        padding: 8, // Reduced padding
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
    },
    columnLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4b7bbb',
        textAlign: 'center',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    columnContent: {
        gap: 6,
    },
    columnDivider: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 20,
    },
    dividerLine: {
        flex: 1,
        width: 1.5,
        backgroundColor: 'rgba(24,72,200,0.08)',
    },
    dividerIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(24,72,200,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },

    // ─── ITEM CARDS ──────────────────────────────────────────────────────
    itemCard: {
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderWidth: 1.5,
        borderColor: 'rgba(15,49,114,0.12)',
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
        position: 'relative',
        minHeight: 44,
        width: '100%',
    },
    itemCardWithContent: {
        padding: 8,
        minHeight: 90, // Increased from 80 to give more room
    },
    itemCardEmpty: {
        padding: 8,
        minHeight: 44,
        opacity: 0.4,
    },
    itemCardWithImage: {
        padding: 4,
        minHeight: 80,
    },
    itemCardWithText: {
        padding: 8,
        minHeight: 44,
    },
    itemCardSelected: {
        borderColor: '#1848c8',
        backgroundColor: 'rgba(24,72,200,0.06)',
        shadowColor: '#1848c8',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    itemCardMatched: {
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.04)',
        borderStyle: 'dashed',
        opacity: 0.6,
    },
    itemCardWrong: {
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
    },
    itemCardDisabled: {
        opacity: 0.6,
    },
    itemImage: {
        borderRadius: 8,
        backgroundColor: 'rgba(15,49,114,0.02)',
    },
    itemImageWithText: {
        width: 70, // Increased from 60
        height: 70, // Increased from 60
    },
    itemImageOnly: {
        width: 100, // Increased from 90
        height: 100, // Increased from 90
    },
    itemText: {
        fontWeight: '600',
        color: '#0f3172',
        textAlign: 'center',
        lineHeight: 18,
    },
    itemTextWithImage: {
        fontSize: 13, // Increased from 12
        marginTop: 4,
    },
    itemTextOnly: {
        fontSize: 20, // Increased from 18
        padding: 6,
    },
    itemTextEmpty: {
        fontSize: 16,
        color: '#94a3b8',
    },
    itemTextMatched: {
        color: '#10B981',
        textDecorationLine: 'line-through',
        textDecorationColor: '#10B981',
    },
    itemTextSelected: {
        color: '#1848c8',
    },
    itemTextWrong: {
        color: '#EF4444',
    },
    itemTextDisabled: {
        color: '#94a3b8',
    },
    matchBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
    },
    wrongIndicator: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
    },

    // ─── SENYA FEEDBACK ──────────────────────────────────────────────────
    feedbackRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        marginVertical: 12,
    },
    senyaFeedback: {
        width: 80,
        height: 80,
        flexShrink: 0,
    },
    feedbackBubble: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 7,
        backgroundColor: 'rgba(255,255,255,0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
        borderRadius: 16,
        padding: 12,
    },
    feedbackCorrect: {
        backgroundColor: 'rgba(236,253,245,0.88)',
        borderColor: '#a7f3d0',
    },
    feedbackWrong: {
        backgroundColor: 'rgba(254,242,242,0.88)',
        borderColor: '#fecaca',
    },
    feedbackText: {
        flex: 1,
        fontSize: 12.5,
        fontWeight: '500',
        color: '#0f3172',
        lineHeight: 18,
    },

    // ─── PRIMARY BUTTON ──────────────────────────────────────────────────
    primaryBtn: {
        backgroundColor: '#1848c8',
        borderRadius: 60,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#1848c8',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
        elevation: 10,
    },
    goldBtn: {
        backgroundColor: '#D97706',
        shadowColor: '#D97706',
    },
    primaryBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },

    // ─── ERROR STATE ──────────────────────────────────────────────────────
    errorCard: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        backgroundColor: 'rgba(255,255,255,0.62)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        margin: 16,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f3172',
        marginTop: 12,
    },
    errorText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 16,
    },
    skipBtn: {
        backgroundColor: '#1848c8',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 60,
    },
    skipBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
