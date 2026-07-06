// app/gesture/alphabet2.tsx
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
import { Audio } from 'expo-av';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

// ─── SOUND EFFECTS ──────────────────────────────────────────────────────────
const CORRECT_GESTURE_SOUND = require('../../assets/music/correct-gesture.mp3');
const GESTURE_COMPLETE_SOUND = require('../../assets/music/gesture-complete.mp3');

// Alphabet Part 2: N-Z
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

    // ── Audio state ──
    const [gestureSound, setGestureSound] = useState<Audio.Sound | null>(null);
    const [completeSound, setCompleteSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(false);

    // Gamification state
    const [completedLetters, setCompletedLetters] = useState<Set<string>>(new Set());
    const [currentTarget, setCurrentTarget] = useState('N');
    const [senyaMessage, setSenyaMessage] = useState(SENYA_MESSAGES.welcome);
    const [consecutiveWrong, setConsecutiveWrong] = useState(0);
    const [isModuleComplete, setIsModuleComplete] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [starRating, setStarRating] = useState(0);

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

    // Senya message cooldown - prevents rapid flashing of messages
    const senyaMsgCooldownRef = useRef<number>(0);
    const SENYA_COOLDOWN_MS = 3000; // 3 seconds between non-critical messages

    // Star animations for results modal
    const starAnim1 = useRef(new Animated.Value(0)).current;
    const starAnim2 = useRef(new Animated.Value(0)).current;
    const starAnim3 = useRef(new Animated.Value(0)).current;

    // ── Play correct gesture sound ──
    async function playGestureSound() {
        try {
            // Don't play if a sound is already playing
            if (isSoundPlaying) return;

            setIsSoundPlaying(true);

            // Unload any existing sound
            if (gestureSound) {
                await gestureSound.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                CORRECT_GESTURE_SOUND,
                {
                    shouldPlay: true,
                    isLooping: false,
                    volume: 0.8, // 80% volume for pleasant feedback
                }
            );

            setGestureSound(sound);

            // Auto-cleanup after playback
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                    setGestureSound(null);
                    setIsSoundPlaying(false);
                }
            });

        } catch (error) {
            console.error('Failed to play gesture sound:', error);
            setIsSoundPlaying(false);
        }
    }

    // ── Play completion sound ──
    async function playCompleteSound() {
        try {
            // Unload any existing sound
            if (completeSound) {
                await completeSound.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                GESTURE_COMPLETE_SOUND,
                {
                    shouldPlay: true,
                    isLooping: false,
                    volume: 1.0, // Full volume for celebration!
                }
            );

            setCompleteSound(sound);

            // Auto-cleanup after playback
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                    setCompleteSound(null);
                }
            });

        } catch (error) {
            console.error('Failed to play complete sound:', error);
        }
    }

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

        // ── Cleanup sounds on unmount ──
        return () => {
            if (gestureSound) {
                gestureSound.unloadAsync();
            }
            if (completeSound) {
                completeSound.unloadAsync();
            }
        };
    }, []);

    // Auto-scroll to current target when it changes
    useEffect(() => {
        const target = getCurrentTarget();
        if (target) {
            setCurrentTarget(target);
            // Auto-scroll to the current target letter
            const targetIndex = ALPHABET_PART2.indexOf(target);
            if (targetIndex >= 0 && scrollViewRef.current) {
                const slotWidth = 54; // width of each slot + margin
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
            const endNow = Date.now();
            setEndTime(endNow);
            const elapsed = Math.round((endNow - startTime) / 1000);
            setStarRating(elapsed < 30 ? 3 : elapsed < 60 ? 2 : 1);

            // ── Play completion sound when all letters are done ──
            playCompleteSound();

            setTimeout(() => {
                setShowResults(true);
            }, 1500);
        }
    }, [completedLetters]);

    // Animate stars when results are shown
    useEffect(() => {
        if (showResults) {
            starAnim1.setValue(0);
            starAnim2.setValue(0);
            starAnim3.setValue(0);
            setTimeout(() => Animated.spring(starAnim1, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start(), 300);
            setTimeout(() => Animated.spring(starAnim2, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start(), 550);
            setTimeout(() => Animated.spring(starAnim3, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start(), 800);
        }
    }, [showResults]);

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
    const handleDetection = async (data: any) => {
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
                        // ── Play the gesture sound on correct detection ──
                        await playGestureSound();

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

                        // Senya celebration - always show for correct (bypasses cooldown)
                        const msg = getRandomMessage(SENYA_MESSAGES.correct);
                        setSenyaMessage(msg);
                        senyaMsgCooldownRef.current = Date.now();

                        showCutePopup(
                            `${letter} ✓`,
                            `${completedLetters.size + 1}/${ALPHABET_PART2.length}`
                        );
                    }
                } else if (completedLetters.has(letter)) {
                    // Already completed - throttled message
                    const now = Date.now();
                    if (now - senyaMsgCooldownRef.current >= SENYA_COOLDOWN_MS) {
                        senyaMsgCooldownRef.current = now;
                        if (target) {
                            setSenyaMessage(`You got ${letter}! Try ${target}`);
                        } else {
                            setSenyaMessage(SENYA_MESSAGES.complete);
                        }
                    }
                    setConsecutiveWrong(0);
                } else {
                    // Wrong letter - only count if stable
                    if (letterStableCount >= 2) {
                        const newWrong = consecutiveWrong + 1;
                        setConsecutiveWrong(newWrong);
                        setTotalWrongAttempts(prev => prev + 1);

                        // FIXED: Attribute wrong attempts to TARGET letter (what user is trying to do)
                        // This ensures Senya's Notes correctly shows which letters you struggled WITH
                        if (target) {
                            setLetterAttempts(prev => {
                                const current = prev[target] || { letter: target, attempts: 0, wrongAttempts: 0, successCount: 0 };
                                return {
                                    ...prev,
                                    [target]: {
                                        ...current,
                                        wrongAttempts: current.wrongAttempts + 1,
                                    }
                                };
                            });
                        }

                        // Throttled struggle messages - max one message per cooldown period
                        const now = Date.now();
                        if (now - senyaMsgCooldownRef.current >= SENYA_COOLDOWN_MS) {
                            senyaMsgCooldownRef.current = now;
                            if (newWrong >= 4) {
                                const msg = getRandomMessage(SENYA_MESSAGES.struggle);
                                setSenyaMessage(msg);
                                setConsecutiveWrong(0);
                                showCutePopup(
                                    `💡 ${target}`,
                                    'Keep your hand steady'
                                );
                            } else if (newWrong >= 2) {
                                setSenyaMessage(`Try making ${target} shape!`);
                            }
                        }
                    }
                }
            } else {
                // Letter not in N-Z - throttled message
                const target = getCurrentTarget();
                const now = Date.now();
                if (target && !isModuleComplete && now - senyaMsgCooldownRef.current >= SENYA_COOLDOWN_MS) {
                    senyaMsgCooldownRef.current = now;
                    setSenyaMessage(`We're learning ${target}`);
                }
            }
        } else {
            // No hand detected
            setDetectedLetter('✋');
            setConfidence(0);
            setLastProcessedLetter('');
            setLetterStableCount(0);

            // Longer cooldown for no-hand message (5s) to avoid nagging
            const now = Date.now();
            if (!isModuleComplete && completedLetters.size < ALPHABET_PART2.length && now - senyaMsgCooldownRef.current >= 5000) {
                senyaMsgCooldownRef.current = now;
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

    // Calculate results
    const getResults = () => {
        const timeToUse = endTime || Date.now();
        const totalSecs = Math.round((timeToUse - startTime) / 1000);
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;
        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        // Find struggling letters - correctly attributed to target letter
        // Sorted by most wrong attempts so the worst offenders appear first
        const strugglingLetters = Object.values(letterAttempts)
            .filter(l => l.wrongAttempts >= 2)
            .sort((a, b) => b.wrongAttempts - a.wrongAttempts)
            .map(l => l.letter)
            .slice(0, 3);

        // Find easy letters (completed with zero wrong attempts)
        const easyLetters = Object.values(letterAttempts)
            .filter(l => l.successCount > 0 && l.wrongAttempts === 0)
            .map(l => l.letter);

        const completedCount = completedLetters.size;

        return {
            totalTime: timeDisplay,
            strugglingLetters,
            easyLetters,
            totalCorrect: completedCount,
            totalWrong: totalWrongAttempts,
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

            {/* Letter Grid - N to Z with auto-scroll */}
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
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            )}
                            {isActive && (
                                <Ionicons name="star" size={13} color="#FFD700" />
                            )}
                            {!isCompleted && !isActive && (
                                <View style={styles.letterStatusDot} />
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
                    <View style={styles.modalCard}>
                        {/* Close button */}
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setShowResults(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={20} color="#0f3172" />
                        </TouchableOpacity>

                        {/* Trophy badge */}
                        <View style={styles.trophyBadge}>
                            <Ionicons name="trophy" size={32} color="#FFD700" />
                        </View>

                        <Text style={styles.modalTitle}>You Did It!</Text>
                        <Text style={styles.modalSubtitle}>
                            All {ALPHABET_PART2.length} letters mastered
                        </Text>

                        {/* Animated star rating */}
                        <View style={styles.starsRow}>
                            {([starAnim1, starAnim2, starAnim3] as Animated.Value[]).map((anim, i) => {
                                const isEarned = starRating > i;
                                return (
                                    <Animated.View
                                        key={i}
                                        style={[
                                            styles.starWrapper,
                                            i === 1 && styles.starWrapperCenter,
                                            { transform: [{ scale: anim }], opacity: anim },
                                        ]}
                                    >
                                        <Ionicons
                                            name={isEarned ? 'star' : 'star-outline'}
                                            size={i === 1 ? 40 : 32}
                                            color={isEarned ? '#FFC93C' : '#D9E2EC'}
                                        />
                                    </Animated.View>
                                );
                            })}
                        </View>
                        <View style={styles.starLabelPill}>
                            <Ionicons
                                name={starRating === 3 ? 'flash' : starRating === 2 ? 'thumbs-up' : 'leaf'}
                                size={14}
                                color="#0f3172"
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.starLabel}>
                                {starRating === 3 ? 'Lightning Fast!' : starRating === 2 ? 'Great Job!' : 'Keep Practicing!'}
                            </Text>
                        </View>

                        {/* Stats */}
                        {(() => {
                            const results = getResults();
                            return (
                                <>
                                    <View style={styles.resultsGrid}>
                                        <View style={styles.resultItem}>
                                            <View style={styles.resultIconWrap}>
                                                <Ionicons name="timer-outline" size={20} color="#0f3172" />
                                            </View>
                                            <Text style={styles.resultValue}>{results.totalTime}</Text>
                                            <Text style={styles.resultGridLabel}>Time</Text>
                                        </View>
                                        <View style={styles.resultItemDivider} />
                                        <View style={styles.resultItem}>
                                            <View style={styles.resultIconWrap}>
                                                <Ionicons name="hand-left-outline" size={20} color="#0f3172" />
                                            </View>
                                            <Text style={styles.resultValue}>
                                                {results.totalCorrect}/{ALPHABET_PART2.length}
                                            </Text>
                                            <Text style={styles.resultGridLabel}>Gestures</Text>
                                        </View>
                                    </View>

                                    {/* Notes */}
                                    <View style={styles.senyaFeedback}>
                                        <View style={styles.feedbackHeader}>
                                            <Ionicons name="document-text-outline" size={16} color="#0f3172" />
                                            <Text style={styles.feedbackTitle}>Senya's Notes</Text>
                                        </View>
                                        {(() => {
                                            const items: { icon: any; color: string; text: string }[] = [];

                                            if (starRating === 3) {
                                                items.push({ icon: 'sparkles', color: '#FFC93C', text: "You're absolutely incredible at this!" });
                                            } else if (starRating === 2) {
                                                items.push({ icon: 'flame', color: '#FF7A45', text: 'Great work! A bit more speed for 3 stars.' });
                                            } else {
                                                items.push({ icon: 'refresh', color: '#4b7bbb', text: 'Keep practicing! Your hands will get faster.' });
                                            }

                                            if (results.strugglingLetters.length > 0) {
                                                items.push({
                                                    icon: 'alert-circle-outline',
                                                    color: '#E11D48',
                                                    text: `Need more help with: ${results.strugglingLetters.join(', ')}`,
                                                });
                                            }

                                            if (results.easyLetters.length > 0) {
                                                items.push({
                                                    icon: 'checkmark-circle',
                                                    color: '#10B981',
                                                    text: `You nailed: ${results.easyLetters.join(', ')}`,
                                                });
                                            }

                                            return items.map((it, i) => (
                                                <View key={i} style={styles.feedbackRow}>
                                                    <Ionicons name={it.icon} size={14} color={it.color} style={{ marginTop: 2, marginRight: 8 }} />
                                                    <Text style={styles.feedbackText}>{it.text}</Text>
                                                </View>
                                            ));
                                        })()}
                                    </View>
                                </>
                            );
                        })()}

                        <TouchableOpacity
                            style={styles.continueButton}
                            activeOpacity={0.85}
                            onPress={() => {
                                setShowResults(false);
                                router.back();
                            }}
                        >
                            <Text style={styles.continueButtonText}>Continue</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
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
        maxHeight: 88,
        marginHorizontal: 12,
        marginVertical: 6,
    },
    letterGridContent: {
        paddingHorizontal: 4,
        gap: 6,
        alignItems: 'center',
    },
    letterSlot: {
        width: 48,
        height: 64,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderWidth: 2,
        borderColor: 'rgba(15, 49, 114, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
        elevation: 2,
    },
    letterCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: '#10B981',
        shadowColor: '#10B981',
        shadowOpacity: 0.2,
    },
    letterActive: {
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        transform: [{ scale: 1.1 }],
        shadowColor: '#FFD700',
        shadowOpacity: 0.55,
        shadowRadius: 10,
        elevation: 8,
    },
    letterChar: {
        fontSize: 20,
        fontWeight: '800',
        color: 'rgba(15, 49, 114, 0.35)',
    },
    letterCharCompleted: {
        color: '#10B981',
        fontSize: 18,
    },
    letterCharActive: {
        color: '#92650A',
        fontSize: 22,
    },
    letterStatusDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(15,49,114,0.15)',
        marginTop: 3,
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
    // Popup
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
    // Results Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 22, 40, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    modalCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingTop: 28,
        paddingBottom: 20,
        paddingHorizontal: 20,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 16,
    },
    modalClose: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    trophyBadge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 201, 60, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255, 201, 60, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f3172',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#4b7bbb',
        marginTop: 4,
        textAlign: 'center',
    },
    starsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginTop: 14,
        gap: 6,
    },
    starWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    starWrapperCenter: {
        marginBottom: 6,
    },
    starLabelPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 201, 60, 0.15)',
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 999,
        marginTop: 10,
        marginBottom: 14,
    },
    starLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0f3172',
    },
    resultsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7faff',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 12,
        marginBottom: 12,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.08)',
    },
    resultItem: {
        flex: 1,
        alignItems: 'center',
    },
    resultIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(15, 49, 114, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    resultItemDivider: {
        width: 1,
        height: 44,
        backgroundColor: 'rgba(15,49,114,0.1)',
        marginHorizontal: 4,
    },
    resultValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f3172',
    },
    resultGridLabel: {
        fontSize: 10,
        color: '#4b7bbb',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    modalSenya: {
        width: 80,
        height: 80,
        marginBottom: 12,
    },
    senyaFeedback: {
        backgroundColor: '#fbfcff',
        borderRadius: 14,
        padding: 12,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.08)',
    },
    feedbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    feedbackTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f3172',
    },
    feedbackRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    feedbackText: {
        flex: 1,
        fontSize: 12,
        color: '#334155',
        lineHeight: 18,
    },
    continueButton: {
        backgroundColor: '#0f3172',
        paddingVertical: 13,
        paddingHorizontal: 24,
        borderRadius: 999,
        width: '100%',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});