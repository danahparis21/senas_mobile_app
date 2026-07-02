// app/gesture/webview-camera.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Pressable,
    ActivityIndicator,
    Platform,
    TouchableOpacity,
    Linking,
    ScrollView,
    Dimensions,
    Image,
    Modal,
    Animated,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import * as WebBrowser from 'expo-web-browser';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

// Alphabet Part 1: A-M
const ALPHABET_PART2 = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

// Senya's encouragement messages (without emojis)
const SENYA_MESSAGES = {
    welcome: "Let's learn N-Z together!",
    correct: [
        "Amazing! Keep going!",
        "Perfect! You're on fire!",
        "Great job! You're a natural!",
        "Wonderful! You're crushing it!",
        "Fantastic! Next one!",
    ],
    struggle: [
        "Try curling your fingers more...",
        "Keep your hand steady!",
        "Make the shape clearer!",
        "You got this! Try again!",
        "Almost there! One more try!",
    ],
    complete: "YOU DID IT! ALL 13 LETTERS!",
};

// Letter struggle tracking
interface LetterAttempt {
    letter: string;
    attempts: number;
    wrongAttempts: number;
    firstSuccess?: number;
    lastAttempt?: number;
    successCount: number;
}

export default function WebViewCameraScreen() {
    const router = useRouter();
    const webViewRef = useRef<WebView>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(true);
    const [detectedLetter, setDetectedLetter] = useState('✋');
    const [confidence, setConfidence] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [showBrowserButton, setShowBrowserButton] = useState(true);

    // Gamification state
    const [completedLetters, setCompletedLetters] = useState<Set<string>>(new Set());
    const [currentTarget, setCurrentTarget] = useState('A');
    const [senyaMessage, setSenyaMessage] = useState(SENYA_MESSAGES.welcome);
    const [consecutiveWrong, setConsecutiveWrong] = useState(0);
    const [isModuleComplete, setIsModuleComplete] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Letter tracking for results
    const [letterAttempts, setLetterAttempts] = useState<Record<string, LetterAttempt>>({});
    const [totalWrongAttempts, setTotalWrongAttempts] = useState(0);
    const [totalCorrectAttempts, setTotalCorrectAttempts] = useState(0);
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [endTime, setEndTime] = useState<number | null>(null);

    // Popup animation
    const popupAnim = useState(new Animated.Value(0))[0];
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupSubMessage, setPopupSubMessage] = useState('');

    // Track the last detected letter to avoid counting transitions as mistakes
    const [lastProcessedLetter, setLastProcessedLetter] = useState<string>('');
    const [letterStableCount, setLetterStableCount] = useState(0);

    // Auto-scroll ref
    const [letterWidth, setLetterWidth] = useState(50); // Approximate width of each letter slot + margin

    // Get current target letter (first incomplete)
    const getCurrentTarget = () => {
        for (const letter of ALPHABET_PART2) {
            if (!completedLetters.has(letter)) return letter;
        }
        return null;
    };

    // Initialize letter tracking
    useEffect(() => {
        const initial: Record<string, LetterAttempt> = {};
        ALPHABET_PART2.forEach(letter => {
            initial[letter] = {
                letter,
                attempts: 0,
                wrongAttempts: 0,
                successCount: 0,
            };
        });
        setLetterAttempts(initial);
        setStartTime(Date.now());
        setEndTime(null);
    }, []);

    // Auto-scroll to current target when it changes
    useEffect(() => {
        const target = getCurrentTarget();
        if (target) {
            setCurrentTarget(target);
            // Auto-scroll to the current target letter
            const targetIndex = ALPHABET_PART2.indexOf(target);
            if (targetIndex >= 0 && scrollViewRef.current) {
                // Calculate scroll position to center the target
                const slotWidth = 50; // width of each slot (44 + 6 margin)
                const scrollX = targetIndex * slotWidth - (width - 100) / 2;
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({
                        x: Math.max(0, scrollX),
                        animated: true,
                    });
                }, 100);
            }
        } else if (completedLetters.size === ALPHABET_PART2.length) {
            setIsModuleComplete(true);
            setSenyaMessage(SENYA_MESSAGES.complete);
            setEndTime(Date.now());
            setTimeout(() => {
                setShowResults(true);
            }, 1500);
        }
    }, [completedLetters]);

    // Get random message from array
    const getRandomMessage = (messages: string[]) => {
        return messages[Math.floor(Math.random() * messages.length)];
    };

    // Show cute popup - smaller rounded rectangle
    const showCutePopup = (message: string, subMessage: string = '') => {
        setPopupMessage(message);
        setPopupSubMessage(subMessage);
        setShowPopup(true);
        popupAnim.setValue(0);
        Animated.spring(popupAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();

        setTimeout(() => {
            Animated.timing(popupAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start(() => {
                setShowPopup(false);
            });
        }, 1200);
    };

    // Handle detection result from WebView
    const handleDetection = (data: any) => {
        const { letter, confidence: conf } = data;

        if (letter && letter !== '✋' && letter.length === 1) {
            setDetectedLetter(letter);
            setConfidence(conf || 0);
            setIsConnected(true);
            setShowBrowserButton(false);

            // Check if this is a stable detection (same letter repeated)
            if (letter === lastProcessedLetter) {
                setLetterStableCount(prev => prev + 1);
            } else {
                setLastProcessedLetter(letter);
                setLetterStableCount(0);
                // Don't process on first detection of a new letter (avoid transitions)
                return;
            }

            // Only process after 2 stable detections
            if (letterStableCount < 1) {
                return;
            }

            // Update letter attempts
            if (ALPHABET_PART2.includes(letter)) {
                setLetterAttempts(prev => {
                    const current = prev[letter] || { letter, attempts: 0, wrongAttempts: 0, successCount: 0 };
                    return {
                        ...prev,
                        [letter]: {
                            ...current,
                            attempts: current.attempts + 1,
                            lastAttempt: Date.now(),
                        }
                    };
                });
            }

            // Gamification logic
            if (ALPHABET_PART2.includes(letter)) {
                const target = getCurrentTarget();

                if (letter === target) {
                    // CORRECT!
                    if (!completedLetters.has(letter)) {
                        const newCompleted = new Set(completedLetters);
                        newCompleted.add(letter);
                        setCompletedLetters(newCompleted);
                        setConsecutiveWrong(0);
                        setTotalCorrectAttempts(prev => prev + 1);

                        // Update success tracking
                        setLetterAttempts(prev => {
                            const current = prev[letter] || { letter, attempts: 0, wrongAttempts: 0, successCount: 0 };
                            return {
                                ...prev,
                                [letter]: {
                                    ...current,
                                    successCount: current.successCount + 1,
                                    firstSuccess: current.firstSuccess || Date.now(),
                                }
                            };
                        });

                        // Senya celebration
                        const msg = getRandomMessage(SENYA_MESSAGES.correct);
                        setSenyaMessage(msg);

                        // Show cute popup - shorter and cleaner
                        showCutePopup(
                            `${letter} ✓`,
                            `${completedLetters.size + 1}/${ALPHABET_PART2.length}`
                        );
                    }
                } else if (completedLetters.has(letter)) {
                    // Already completed - only show message if there's still a target
                    const target = getCurrentTarget();
                    if (target) {
                        setSenyaMessage(`You got ${letter}! Try ${target}`);
                    } else {
                        // All letters are completed!
                        setSenyaMessage(SENYA_MESSAGES.complete);
                    }
                    setConsecutiveWrong(0);
                } else {
                    // Wrong letter - only count if not a transition and not the same wrong letter repeated
                    // Only count as a mistake if we've been stable on this wrong letter
                    if (letterStableCount >= 2) {
                        const newWrong = consecutiveWrong + 1;
                        setConsecutiveWrong(newWrong);
                        setTotalWrongAttempts(prev => prev + 1);

                        // Update wrong attempts
                        setLetterAttempts(prev => {
                            const current = prev[letter] || { letter, attempts: 0, wrongAttempts: 0, successCount: 0 };
                            return {
                                ...prev,
                                [letter]: {
                                    ...current,
                                    wrongAttempts: current.wrongAttempts + 1,
                                }
                            };
                        });

                        // Only show struggle messages after multiple wrong attempts
                        const target = getCurrentTarget();
                        if (newWrong >= 4) {
                            const msg = getRandomMessage(SENYA_MESSAGES.struggle);
                            setSenyaMessage(msg);
                            setConsecutiveWrong(0);
                            showCutePopup(
                                `💡 ${target}`,
                                'Keep your hand steady'
                            );
                        } else if (newWrong === 2) {
                            setSenyaMessage(`Try making ${target} shape`);
                        } else if (newWrong === 3) {
                            setSenyaMessage(`Focus on ${target}!`);
                        }
                    }
                }
            } else {
                // Letter not in A-M
                const target = getCurrentTarget();
                if (target && !isModuleComplete) {
                    setSenyaMessage(`We're learning ${target}`);
                }
            }
        } else {
            // No hand detected
            setDetectedLetter('✋');
            setConfidence(0);
            setLastProcessedLetter('');
            setLetterStableCount(0);

            if (!isModuleComplete && completedLetters.size < ALPHABET_PART2.length) {
                const target = getCurrentTarget();
                if (target) {
                    setSenyaMessage(`Show me ${target}!`);
                }
            }
        }
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('📨 Received from WebView:', data);

            if (data.letter !== undefined) {
                handleDetection(data);
            }
        } catch (error) {
            console.error('Message error:', error);
        }
    };

    // Calculate results - FIXED: accuracy should reflect actual performance
    const getResults = () => {
        const timeToUse = endTime || Date.now();
        const totalTime = Math.round((timeToUse - startTime) / 1000);
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;

        // Find struggling letters (more than 4 wrong attempts)
        const strugglingLetters = Object.values(letterAttempts)
            .filter(l => l.wrongAttempts > 4)
            .map(l => l.letter);

        // Find easy letters (first try success)
        const easyLetters = Object.values(letterAttempts)
            .filter(l => l.attempts === 1 && l.successCount === 1)
            .map(l => l.letter);

        // Calculate accuracy based on successful completions vs total attempts
        const totalLetters = ALPHABET_PART2.length;
        const completedCount = completedLetters.size;

        const accuracy = Math.round((completedCount / totalLetters) * 100);

        // Find fastest letter (by time to first success)
        let fastestLetter = '';
        let fastestTime = Infinity;
        Object.values(letterAttempts).forEach(l => {
            if (l.firstSuccess && l.attempts > 0) {
                const timePerAttempt = (l.attempts / (l.successCount || 1));
                if (timePerAttempt < fastestTime) {
                    fastestTime = timePerAttempt;
                    fastestLetter = l.letter;
                }
            }
        });

        return {
            accuracy,
            totalTime: `${minutes}m ${seconds}s`,
            strugglingLetters,
            easyLetters,
            fastestLetter,
            totalCorrect: completedCount,
            totalWrong: totalWrongAttempts,
            totalAttempts: completedCount + totalWrongAttempts,
        };
    };

    const GESTURE_URL = 'https://swipe-drinking-coral.ngrok-free.dev/gesture.html';

    // Inject CSS to hide detection box and other UI elements from the HTML
    const injectedJavaScript = `
        (function() {
            var box = document.getElementById('detection-box');
            if (box) box.style.display = 'none';
            
            var progressBar = document.querySelector('.progress-bar');
            if (progressBar) progressBar.style.display = 'none';
            
            var statusBar = document.getElementById('status-bar');
            if (statusBar) statusBar.style.display = 'none';
            
            var overlay = document.getElementById('overlay');
            if (overlay) overlay.style.display = 'none';
            
            var container = document.getElementById('container');
            if (container) {
                container.style.position = 'absolute';
                container.style.top = '0';
                container.style.left = '0';
                container.style.width = '100%';
                container.style.height = '100%';
            }
            
            console.log('🎮 Gamification mode activated!');
        })();
    `;

    const openInBrowser = async () => {
        try {
            const urlWithHeader = GESTURE_URL + '?ngrok-skip-browser-warning=true';
            await WebBrowser.openBrowserAsync(urlWithHeader);
        } catch (error) {
            Linking.openURL(GESTURE_URL);
        }
    };

    if (!permission) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0f3172" />
                    <Text style={styles.checkingText}>Checking permission...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Ionicons name="camera-outline" size={64} color="#4b7bbb" />
                    <Text style={styles.title}>Camera Access Required</Text>
                    <Text style={styles.subtitle}>
                        Please grant camera permission to use gesture recognition.
                    </Text>
                    <Pressable style={styles.button} onPress={requestPermission}>
                        <Text style={styles.buttonText}>Grant Permission</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0f3172" />
                </Pressable>
                <Text style={styles.headerTitle}>Alphabet Part 2</Text>
                <View style={[styles.statusBadge, isConnected && styles.statusActive]}>
                    <Text style={[styles.statusText, isConnected && styles.statusActiveText]}>
                        {isConnected ? '🟢 Live' : '⏳ Loading'}
                    </Text>
                </View>
            </View>

            {/* Senya Section with Image */}
            <View style={styles.senyaSection}>
                <Image
                    source={require('../../assets/images/img/senya_teaching.png')}
                    style={styles.senyaImage}
                    resizeMode="contain"
                />
                <Text style={styles.senyaMessage}>{senyaMessage}</Text>
            </View>

            {/* Progress */}
            <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                    Progress: {completedLetters.size}/{ALPHABET_PART2.length}
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(completedLetters.size / ALPHABET_PART2.length) * 100}%` }
                        ]}
                    />
                </View>
                <Text style={styles.targetText}>
                    🎯 {currentTarget}
                </Text>
            </View>

            {/* WebView Container */}
            <View style={styles.webviewContainer}>
                <WebView
                    ref={webViewRef}
                    source={{
                        uri: GESTURE_URL,
                        headers: {
                            'ngrok-skip-browser-warning': 'true',
                        }
                    }}
                    style={styles.webview}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => {
                        setLoading(false);
                        console.log('✅ WebView loaded');
                    }}
                    onMessage={handleMessage}
                    injectedJavaScript={injectedJavaScript}
                    mediaPlaybackRequiresUserAction={false}
                    allowsInlineMediaPlayback={true}
                    startInLoadingState={true}
                    originWhitelist={['*']}
                    mixedContentMode="always"
                    allowsFullscreenVideo={false}
                    scrollEnabled={false}
                    allowsAirPlayForMediaPlayback={true}
                    userAgent={
                        Platform.OS === 'android'
                            ? 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.163 Mobile Safari/537.36'
                            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                    }
                />
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#FFD700" />
                        <Text style={styles.loadingOverlayText}>Loading gesture recognition...</Text>
                        <Text style={styles.loadingSubtext}>Connecting to SENAS server</Text>
                    </View>
                )}

                {!isConnected && (
                    <TouchableOpacity
                        style={styles.browserButton}
                        onPress={openInBrowser}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="open-outline" size={24} color="#fff" />
                        <Text style={styles.browserButtonText}>Open in Browser</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Letter Grid - A to M with auto-scroll */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.letterGridScroll}
                contentContainerStyle={styles.letterGridContent}
                scrollEventThrottle={16}
            >
                {ALPHABET_PART2.map((letter) => {
                    const isCompleted = completedLetters.has(letter);
                    const isActive = letter === currentTarget && !isCompleted;
                    return (
                        <View
                            key={letter}
                            style={[
                                styles.letterSlot,
                                isCompleted && styles.letterCompleted,
                                isActive && styles.letterActive,
                            ]}
                        >
                            <Text style={[
                                styles.letterChar,
                                isCompleted && styles.letterCharCompleted,
                                isActive && styles.letterCharActive,
                            ]}>
                                {letter}
                            </Text>
                            {isCompleted && (
                                <Text style={styles.letterStatus}>✓</Text>
                            )}
                            {isActive && (
                                <Text style={styles.letterStatus}>★</Text>
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Bottom Detection Bar */}
            <View style={styles.resultBar}>
                <Text style={styles.resultLabel}>Detected:</Text>
                <Text style={styles.resultLetter}>{detectedLetter}</Text>
                {confidence > 0 && (
                    <View style={styles.confidenceContainer}>
                        <View style={styles.confidenceBar}>
                            <View
                                style={[
                                    styles.confidenceFill,
                                    { width: `${Math.round(confidence * 100)}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.resultConfidence}>
                            {Math.round(confidence * 100)}%
                        </Text>
                    </View>
                )}
            </View>

            {/* Cute Popup - Smaller rounded rectangle */}
            {showPopup && (
                <Animated.View
                    style={[
                        styles.popupContainer,
                        {
                            opacity: popupAnim,
                            transform: [
                                {
                                    scale: popupAnim.interpolate({
                                        inputRange: [0, 0.5, 1],
                                        outputRange: [0.7, 1.05, 1],
                                    })
                                }
                            ]
                        }
                    ]}
                >
                    <View style={styles.popupContent}>
                        <Image
                            source={require('../../assets/images/img/senya_teaching.png')}
                            style={styles.popupSenya}
                            resizeMode="contain"
                        />
                        <Text style={styles.popupMessage}>{popupMessage}</Text>
                        {popupSubMessage ? (
                            <Text style={styles.popupSubMessage}>{popupSubMessage}</Text>
                        ) : null}
                    </View>
                </Animated.View>
            )}

            {/* Results Modal - Only when all letters are completed */}
            <Modal
                visible={showResults}
                transparent
                animationType="fade"
                onRequestClose={() => setShowResults(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Image
                            source={require('../../assets/images/img/senya_teaching.png')}
                            style={styles.modalSenya}
                            resizeMode="contain"
                        />

                        <Text style={styles.modalTitle}>🎉 Congratulations!</Text>
                        <Text style={styles.modalSubtitle}>You mastered all 13 letters!</Text>

                        {(() => {
                            const results = getResults();
                            return (
                                <View style={styles.resultsGrid}>
                                    <View style={styles.resultItem}>
                                        <Text style={styles.resultValue}>{results.accuracy}%</Text>
                                        <Text style={styles.resultGridLabel}>Accuracy</Text>
                                    </View>
                                    <View style={styles.resultItem}>
                                        <Text style={styles.resultValue}>{results.totalTime}</Text>
                                        <Text style={styles.resultGridLabel}>Time Taken</Text>
                                    </View>
                                    <View style={styles.resultItem}>
                                        <Text style={styles.resultValue}>{results.totalCorrect}</Text>
                                        <Text style={styles.resultGridLabel}>Correct</Text>
                                    </View>
                                    <View style={styles.resultItem}>
                                        <Text style={styles.resultValue}>{results.totalWrong}</Text>
                                        <Text style={styles.resultGridLabel}>Mistakes</Text>
                                    </View>
                                </View>
                            );
                        })()}

                        {/* Senya's intuitive feedback */}
                        <View style={styles.senyaFeedback}>
                            <Text style={styles.feedbackTitle}>Senya's Notes 📝</Text>
                            {(() => {
                                const results = getResults();
                                let feedback = [];

                                if (results.accuracy >= 90) {
                                    feedback.push("🌟 You're a natural at sign language!");
                                } else if (results.accuracy >= 70) {
                                    feedback.push("💪 Great effort! Keep practicing to improve!");
                                } else {
                                    feedback.push("🧐 Keep practicing! You'll get better with time!");
                                }

                                if (results.strugglingLetters.length > 0) {
                                    feedback.push(`📌 Focus on: ${results.strugglingLetters.join(', ')}`);
                                }

                                if (results.easyLetters.length > 0) {
                                    feedback.push(`⭐ You nailed: ${results.easyLetters.join(', ')}`);
                                }

                                if (results.fastestLetter) {
                                    feedback.push(`⚡ Fastest: ${results.fastestLetter}`);
                                }

                                return feedback.map((text, i) => (
                                    <Text key={i} style={styles.feedbackText}>• {text}</Text>
                                ));
                            })()}
                        </View>

                        <TouchableOpacity
                            style={styles.continueButton}
                            onPress={() => {
                                setShowResults(false);
                                router.back();
                            }}
                        >
                            <Text style={styles.continueButtonText}>Continue to Next Module →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaf5fd',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    checkingText: {
        fontSize: 16,
        color: '#4b7bbb',
        marginTop: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f3172',
        marginTop: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#4b7bbb',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#0f3172',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 60,
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(15, 49, 114, 0.08)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(15, 49, 114, 0.1)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f3172',
    },
    statusBadge: {
        backgroundColor: 'rgba(200,200,200,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusActive: {
        backgroundColor: 'rgba(16,185,129,0.2)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
    },
    statusActiveText: {
        color: '#10B981',
    },
    senyaSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(15, 49, 114, 0.05)',
    },
    senyaImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    senyaMessage: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#0f3172',
        fontStyle: 'italic',
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.6)',
        gap: 10,
    },
    progressText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0f3172',
        minWidth: 70,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(15,49,114,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 2,
    },
    targetText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFD700',
        minWidth: 30,
        textAlign: 'center',
    },
    webviewContainer: {
        flex: 1,
        marginHorizontal: 12,
        marginVertical: 8,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#0a1628',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        minHeight: 250,
    },
    webview: {
        flex: 1,
        backgroundColor: '#0a1628',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 22, 40, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingOverlayText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
    },
    loadingSubtext: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        marginTop: 6,
    },
    browserButton: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f3172',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 60,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    browserButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    letterGridScroll: {
        maxHeight: 80,
        marginHorizontal: 12,
        marginVertical: 4,
    },
    letterGridContent: {
        paddingHorizontal: 4,
        gap: 6,
        alignItems: 'center',
    },
    letterSlot: {
        width: 44,
        height: 58,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderWidth: 2,
        borderColor: 'rgba(15, 49, 114, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    letterCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.4)',
    },
    letterActive: {
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        transform: [{ scale: 1.05 }],
    },
    letterChar: {
        fontSize: 20,
        fontWeight: '800',
        color: 'rgba(15, 49, 114, 0.4)',
    },
    letterCharCompleted: {
        color: '#10B981',
    },
    letterCharActive: {
        color: '#FFD700',
    },
    letterStatus: {
        fontSize: 10,
        marginTop: 1,
    },
    resultBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.95)',
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    resultLabel: {
        fontSize: 11,
        color: '#4b7bbb',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    resultLetter: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0f3172',
        minWidth: 34,
        textAlign: 'center',
    },
    confidenceContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    confidenceBar: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(15,49,114,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    confidenceFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 2,
    },
    resultConfidence: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: '700',
        minWidth: 32,
    },
    // Cute Popup - Smaller rounded rectangle
    popupContainer: {
        position: 'absolute',
        top: '35%',
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        pointerEvents: 'none',
    },
    popupContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 10,
        paddingHorizontal: 18,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: '#FFD700',
        minWidth: 80,
    },
    popupSenya: {
        width: 28,
        height: 28,
        marginBottom: 2,
    },
    popupMessage: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f3172',
        textAlign: 'center',
    },
    popupSubMessage: {
        fontSize: 10,
        color: '#4b7bbb',
        marginTop: 1,
        textAlign: 'center',
    },
    // Results Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 22, 40, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 30,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        maxHeight: '90%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
    },
    modalSenya: {
        width: 70,
        height: 70,
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#0f3172',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#4b7bbb',
        marginBottom: 16,
        textAlign: 'center',
    },
    resultsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
        width: '100%',
    },
    resultItem: {
        backgroundColor: 'rgba(15, 49, 114, 0.05)',
        borderRadius: 12,
        padding: 12,
        minWidth: 70,
        alignItems: 'center',
        flex: 1,
    },
    resultValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f3172',
    },
    resultGridLabel: {
        fontSize: 11,
        color: '#4b7bbb',
        fontWeight: '500',
    },
    senyaFeedback: {
        backgroundColor: 'rgba(255, 215, 0, 0.08)',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    feedbackTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f3172',
        marginBottom: 8,
    },
    feedbackText: {
        fontSize: 13,
        color: '#4b7bbb',
        lineHeight: 20,
        marginBottom: 2,
    },
    continueButton: {
        backgroundColor: '#0f3172',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 60,
        width: '100%',
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});