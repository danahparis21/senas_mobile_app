// app/gesture/alphabet1.tsx - Expo Go Compatible
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Pressable,
    ScrollView,
    Modal,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const alphabetChallenges = [
    { letter: 'A', emoji: '✊', hint: 'Closed fist — thumb resting on side', color: '#FF6B6B' },
    { letter: 'B', emoji: '🖐', hint: 'Four fingers up, thumb across palm', color: '#4ECDC4' },
    { letter: 'C', emoji: '🤏', hint: 'Curve fingers and thumb to form C', color: '#45B7AA' },
    { letter: 'D', emoji: '👆', hint: 'Index finger up, others touch thumb', color: '#FFB6C1' },
    { letter: 'E', emoji: '🤛', hint: 'All fingers bent toward palm', color: '#FF8E9E' },
    { letter: 'F', emoji: '👌', hint: 'Index and thumb form circle', color: '#A8E6CF' },
    { letter: 'G', emoji: '👉', hint: 'Index finger points sideways', color: '#88D8B0' },
    { letter: 'H', emoji: '✌️', hint: 'Index and middle fingers up', color: '#FFD93D' },
    { letter: 'I', emoji: '🤙', hint: 'Pinky finger up', color: '#6BCB77' },
    { letter: 'J', emoji: '🤞', hint: 'Pinky draws a J shape', color: '#4D96FF' },
    { letter: 'K', emoji: '🤟', hint: 'Index and middle point up, thumb between', color: '#9B59B6' },
    { letter: 'L', emoji: '🤘', hint: 'Index and thumb form L shape', color: '#3498DB' },
    { letter: 'M', emoji: '🤔', hint: 'Three fingers over thumb', color: '#E67E22' },
];

function ResultModal({ visible, score, total, onClose, onRetry }: {
    visible: boolean; score: number; total: number; onClose: () => void; onRetry: () => void;
}) {
    const pct = Math.round((score / total) * 100);
    const { label, color, emoji } =
        pct === 100 ? { label: 'Perfect!', color: '#FFD93D', emoji: '🎉' } :
            pct >= 80 ? { label: 'Excellent!', color: '#4ECDC4', emoji: '🌟' } :
                pct >= 60 ? { label: 'Good Job!', color: '#4D96FF', emoji: '👍' } :
                    { label: 'Keep Trying!', color: '#FF6B6B', emoji: '💪' };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.resultModal}>
                    <Image source={require('../../assets/images/img/senya_teaching.png')} style={styles.resultModalSenya} contentFit="contain" />
                    <Text style={styles.resultEmoji}>{emoji}</Text>
                    <Text style={[styles.resultModalLabel, { color }]}>{label}</Text>
                    <Text style={styles.resultModalScore}>
                        {score}<Text style={{ fontSize: 24, opacity: 0.5 }}>/{total}</Text>
                    </Text>
                    <Text style={styles.resultModalSub}>signs recognized</Text>
                    <View style={styles.xpBadgeLg}>
                        <Text style={styles.xpBadgeLgText}>⭐ +{score * 15} XP Earned!</Text>
                    </View>
                    <View style={styles.resultModalBtns}>
                        <Pressable style={styles.retryBtn} onPress={onRetry}>
                            <Text style={styles.retryBtnText}>↺ Try Again</Text>
                        </Pressable>
                        <Pressable style={styles.doneBtn} onPress={onClose}>
                            <Text style={styles.doneBtnText}>Done ✓</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export default function Alphabet1Screen() {
    const router = useRouter();
    const [challengeIdx, setChallengeIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
    const [showResult, setShowResult] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const challenge = alphabetChallenges[challengeIdx];

    useEffect(() => {
        // Simulate loading
        setTimeout(() => {
            setIsLoaded(true);
        }, 1000);
    }, []);

    const handlePress = () => {
        // Simulate detection for testing
        const success = Math.random() > 0.3;
        if (success) {
            setCompletedIds(prev => new Set([...prev, challengeIdx]));
            setScore(s => s + 1);

            setTimeout(() => {
                if (challengeIdx < alphabetChallenges.length - 1) {
                    setChallengeIdx(challengeIdx + 1);
                } else {
                    setShowResult(true);
                }
            }, 500);
        }
    };

    const handleRetry = () => {
        setChallengeIdx(0);
        setScore(0);
        setCompletedIds(new Set());
        setShowResult(false);
    };

    const progress = Math.round((score / alphabetChallenges.length) * 100);

    if (!isLoaded) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0f3172" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ResultModal
                visible={showResult}
                score={score}
                total={alphabetChallenges.length}
                onClose={() => router.push('/(tabs)/gesture')}
                onRetry={handleRetry}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#0f3172" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Alphabet Part 1</Text>
                    <View style={styles.progressBadge}>
                        <Text style={styles.progressBadgeText}>{progress}%</Text>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressStrip}>
                    {alphabetChallenges.map((g, i) => (
                        <Pressable
                            key={i}
                            style={[
                                styles.progressChip,
                                i === challengeIdx && styles.progressChipActive,
                                completedIds.has(i) && styles.progressChipDone,
                            ]}
                            onPress={() => {
                                if (i !== challengeIdx) {
                                    setChallengeIdx(i);
                                }
                            }}
                        >
                            <Text style={styles.progressChipEmoji}>{g.emoji}</Text>
                            <Text style={[
                                styles.progressChipLetter,
                                i === challengeIdx ? { color: '#fff' } :
                                    completedIds.has(i) ? { color: '#4ECDC4' } : { color: '#4b7bbb' }
                            ]}>{g.letter}</Text>
                            {completedIds.has(i) && <Text style={styles.checkmark}>✓</Text>}
                        </Pressable>
                    ))}
                </ScrollView>

                <LinearGradient colors={[challenge.color + '20', challenge.color + '10']} style={styles.challengeCard}>
                    <View style={styles.challengeContent}>
                        <View style={styles.challengeLeft}>
                            <Text style={styles.challengeLabel}>Sign the letter</Text>
                            <Text style={[styles.challengeLetter, { color: challenge.color }]}>{challenge.letter}</Text>
                            <Text style={styles.challengeHint}>{challenge.hint}</Text>
                        </View>
                        <View style={[styles.challengeEmojiBox, { backgroundColor: challenge.color + '20' }]}>
                            <Text style={styles.challengeEmojiBig}>{challenge.emoji}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.placeholderContainer}>
                    <Text style={styles.placeholderText}>📷 Camera Preview</Text>
                    <Text style={styles.placeholderSubtext}>Tap "Simulate Sign" to test</Text>
                </View>

                <Pressable
                    style={[styles.scanBtn, { backgroundColor: challenge.color }]}
                    onPress={handlePress}
                >
                    <Text style={styles.scanBtnText}>👋 Simulate Sign</Text>
                </Pressable>

                <View style={styles.tipsContainer}>
                    <Image source={require('../../assets/images/img/senya_blue.png')} style={styles.tipsSenya} contentFit="contain" />
                    <View style={styles.tipsBubble}>
                        <Text style={styles.tipsText}>
                            💡 This is a demo mode. The real camera will be added later!
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Keep all the styles the same as before...
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaf5fd',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    scroll: {
        padding: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f3172',
        marginTop: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f3172',
    },
    progressBadge: {
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    progressBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f3172',
    },
    progressStrip: {
        gap: 8,
        paddingBottom: 12,
        flexDirection: 'row',
    },
    progressChip: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
        gap: 2,
        position: 'relative',
    },
    progressChipActive: {
        backgroundColor: '#0f3172',
        borderColor: '#0f3172',
    },
    progressChipDone: {
        borderColor: '#4ECDC4',
        backgroundColor: 'rgba(78,205,196,0.1)',
    },
    progressChipEmoji: {
        fontSize: 18,
    },
    progressChipLetter: {
        fontSize: 10,
        fontWeight: '800',
    },
    checkmark: {
        position: 'absolute',
        top: -6,
        right: -6,
        fontSize: 10,
        color: '#4ECDC4',
    },
    challengeCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    challengeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    challengeLeft: {
        flex: 1,
    },
    challengeLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4b7bbb',
        marginBottom: 2,
    },
    challengeLetter: {
        fontSize: 44,
        fontWeight: '900',
        marginBottom: 4,
    },
    challengeHint: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    challengeEmojiBox: {
        width: 70,
        height: 70,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    challengeEmojiBig: {
        fontSize: 40,
    },
    placeholderContainer: {
        height: 200,
        borderRadius: 24,
        backgroundColor: '#0a1628',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    placeholderText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 24,
        fontWeight: '700',
    },
    placeholderSubtext: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        marginTop: 8,
    },
    scanBtn: {
        borderRadius: 60,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    scanBtnText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    tipsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        marginBottom: 16,
    },
    tipsSenya: {
        width: 50,
        height: 50,
        flexShrink: 0,
    },
    tipsBubble: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
    },
    tipsText: {
        fontSize: 13,
        color: '#0f3172',
        fontWeight: '500',
        lineHeight: 18,
    },
    resultModal: {
        width: '92%',
        maxWidth: 380,
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderRadius: 32,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 40,
        elevation: 24,
    },
    resultModalSenya: {
        width: 80,
        height: 80,
        marginBottom: 4,
    },
    resultEmoji: {
        fontSize: 40,
        marginBottom: 4,
    },
    resultModalLabel: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    resultModalScore: {
        fontSize: 64,
        fontWeight: '900',
        color: '#0f3172',
        lineHeight: 72,
    },
    resultModalSub: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 12,
    },
    xpBadgeLg: {
        backgroundColor: 'rgba(255,215,0,0.15)',
        borderRadius: 99,
        paddingVertical: 6,
        paddingHorizontal: 18,
        marginBottom: 20,
    },
    xpBadgeLgText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#F59E0B',
    },
    resultModalBtns: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    retryBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 60,
        backgroundColor: 'rgba(15,49,114,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.1)',
        alignItems: 'center',
    },
    retryBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f3172',
    },
    doneBtn: {
        flex: 1.5,
        paddingVertical: 14,
        borderRadius: 60,
        backgroundColor: '#0f3172',
        alignItems: 'center',
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 8,
    },
    doneBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
});