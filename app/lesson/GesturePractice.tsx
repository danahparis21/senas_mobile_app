// app/lesson/GesturePractice.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Pressable,
    ActivityIndicator,
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import WebView from 'react-native-webview';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Audio } from 'expo-av';
import { useCameraPermissions } from 'expo-camera';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── GESTURE URLS ──────────────────────────────────────────────────────────
const GESTURE_URL_ALPHABET = 'https://swipe-drinking-coral.ngrok-free.dev/gesture.html';
const GESTURE_URL_NUMBERS = 'https://swipe-drinking-coral.ngrok-free.dev/gesture_level3.html';

// ─── SOUND EFFECTS ──────────────────────────────────────────────────────────
const CORRECT_GESTURE_SOUND = require('../../assets/music/correct-gesture.mp3');

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface GestureQuestion {
    question_id: number;
    question_text: string;
    gesture_data: {
        module_id: string;
        gesture_ids: string[];
    };
    question_number: number;
}

interface GesturePracticeProps {
    question: GestureQuestion;
    questionIndex: number;
    totalQuestions: number;
    onComplete: (success: boolean, gestureIds: string[]) => void;
    onBack: () => void;
    lessonId: string;
    quizId: number;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function GesturePractice({
    question,
    questionIndex,
    totalQuestions,
    onComplete,
    onBack,
    lessonId,
    quizId,
}: GesturePracticeProps) {

    const router = useRouter();
    const webViewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    // ─── CAMERA PERMISSIONS ──────────────────────────────────────────────────
    const [permission, requestPermission] = useCameraPermissions();

    // Audio state
    const [gestureSound, setGestureSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState(false);

    // Animation
    const popupAnim = useRef(new Animated.Value(0)).current;
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupSubMessage, setPopupSubMessage] = useState('');

    // ─── Get gesture data ────────────────────────────────────────────────────
    const gestureData = question.gesture_data;
    const moduleId = gestureData?.module_id || '1';
    const gestureIds = gestureData?.gesture_ids || [];

    // ─── Map database IDs to actual letters/numbers ────────────────────────
    const ID_TO_GESTURE: Record<string, string> = {
        '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G',
        '8': 'H', '9': 'I', '10': 'J', '11': 'K', '12': 'L', '13': 'M', '14': 'N',
        '15': 'O', '16': 'P', '17': 'Q', '18': 'R', '19': 'S', '20': 'T', '21': 'U',
        '22': 'V', '23': 'W', '24': 'X', '25': 'Y', '26': 'Z',
    };

    // ─── State for current target ──────────────────────────────────────────
    const [currentIndex, setCurrentIndex] = useState(0);
    const [completedGestures, setCompletedGestures] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasCompleted, setHasCompleted] = useState(false); // Track if we've already called onComplete

    // Convert numeric IDs to actual target gestures
    const targetGestures = gestureIds.map(id => ID_TO_GESTURE[id] || id);
    const currentTarget = targetGestures[currentIndex] || targetGestures[0];
    const currentDisplayName = ID_TO_GESTURE[gestureIds[currentIndex]] || targetGestures[currentIndex] || '?';

    const prevQuestionIdRef = useRef<number | null>(null);
    // ─── RESET STATE WHEN QUESTION CHANGES ──────────────────────────────────
    useEffect(() => {
        // Only reset if the question ID actually changed (not just index)
        const questionId = question?.question_id;
        if (prevQuestionIdRef.current !== questionId) {
            console.log('🔄 Question changed, resetting state for:', gestureIds);
            setCurrentIndex(0);
            setCompletedGestures(new Set());
            setIsProcessing(false);
            setHasCompleted(false);
            setLoading(false);
            setIsConnected(false);
            prevQuestionIdRef.current = questionId;
        }
    }, [question]);

    // ─── Determine which URL to use ──────────────────────────────────────────
    const getGestureUrl = (moduleId: string): string => {
        const moduleIdNum = parseInt(moduleId);
        if (moduleIdNum === 1 || moduleIdNum === 2) {
            return GESTURE_URL_ALPHABET;
        } else if (moduleIdNum === 3) {
            return GESTURE_URL_NUMBERS;
        }
        return GESTURE_URL_ALPHABET;
    };

    // ─── Play gesture sound ──────────────────────────────────────────────────
    async function playGestureSound() {
        try {
            if (isSoundPlaying) return;
            setIsSoundPlaying(true);

            if (gestureSound) {
                await gestureSound.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                CORRECT_GESTURE_SOUND,
                {
                    shouldPlay: true,
                    isLooping: false,
                    volume: 0.8,
                }
            );

            setGestureSound(sound);

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

    // ─── Show popup ──────────────────────────────────────────────────────────
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

    // ─── Handle WebView messages ─────────────────────────────────────────────
    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            const { letter, confidence } = data;

            if (!letter || letter === '✋' || confidence < 0.5) {
                return;
            }

            setIsConnected(true);
            // Hide loading when we get first detection
            if (loading) {
                setLoading(false);
            }

            const detectedLetter = letter.toUpperCase();

            // Log what we're detecting
            console.log(`🔍 Detected: ${detectedLetter}, Target: ${currentTarget}, Completed: ${Array.from(completedGestures).join(', ')}`);

            // Check if the detected letter matches the current target
            if (detectedLetter === currentTarget) {
                // Check if this letter hasn't been completed yet and we're not already done
                if (!completedGestures.has(detectedLetter) && !isProcessing && !hasCompleted) {
                    setIsProcessing(true);

                    // Success!
                    const newCompleted = new Set(completedGestures);
                    newCompleted.add(detectedLetter);
                    setCompletedGestures(newCompleted);

                    playGestureSound();

                    const displayName = ID_TO_GESTURE[gestureIds[currentIndex]] || currentTarget;
                    showCutePopup(
                        `${displayName} ✓`,
                        `${currentIndex + 1}/${targetGestures.length}`
                    );

                    console.log(`✅ Completed ${detectedLetter}, ${newCompleted.size}/${targetGestures.length}`);

                    // Move to the next gesture or complete the question
                    if (currentIndex + 1 >= targetGestures.length) {
                        // ALL GESTURES COMPLETED FOR THIS QUESTION
                        console.log('🎉 ALL GESTURES COMPLETED! Calling onComplete with:', Array.from(newCompleted));

                        // Mark as completed to prevent double calls
                        setHasCompleted(true);

                        // Call onComplete with success = true and the completed gestures
                        // Use a longer delay to ensure state is updated
                        setTimeout(() => {
                            onComplete(true, Array.from(newCompleted));
                            setIsProcessing(false);
                        }, 600);
                    } else {
                        // Move to next letter after a delay
                        setTimeout(() => {
                            setCurrentIndex(prev => prev + 1);
                            setIsProcessing(false);
                        }, 800);
                    }
                }
            } else {
                // Wrong letter - log it for debugging
                if (targetGestures.includes(detectedLetter) && !completedGestures.has(detectedLetter)) {
                    console.log(`⚠️ Detected ${detectedLetter}, but waiting for ${currentTarget}`);
                }
            }
        } catch (error) {
            console.error('Error handling WebView message:', error);
            setIsProcessing(false);
        }
    };

    // ─── Inject JavaScript to show detection box ────────────────────────────
    const injectedJavaScript = `
        (function() {
            var box = document.getElementById('detection-box');
            if (box) {
                box.style.display = 'block';
                box.style.position = 'absolute';
                box.style.bottom = '20px';
                box.style.left = '50%';
                box.style.transform = 'translateX(-50%)';
                box.style.backgroundColor = 'rgba(0,0,0,0.7)';
                box.style.color = 'white';
                box.style.padding = '8px 16px';
                box.style.borderRadius = '8px';
                box.style.fontSize = '18px';
                box.style.fontWeight = 'bold';
                box.style.zIndex = '100';
                box.style.textAlign = 'center';
            }
            
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
            
            console.log('🎮 Gesture practice mode activated!');
        })();
    `;

    // ─── Open in browser fallback ────────────────────────────────────────────
    const openInBrowser = async () => {
        const url = getGestureUrl(moduleId);
        try {
            const urlWithHeader = url + '?ngrok-skip-browser-warning=true';
            await WebBrowser.openBrowserAsync(urlWithHeader);
        } catch (error) {
            console.error('Error opening browser:', error);
        }
    };

    // ─── Cleanup ──────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (gestureSound) {
                gestureSound.unloadAsync();
            }
        };
    }, []);

    // ─── CAMERA PERMISSION CHECK ────────────────────────────────────────────

    // If permission is still being checked
    if (!permission) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0f3172" />
                    <Text style={styles.checkingText}>Checking camera permission...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // If permission is not granted, show the request screen
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
                    <Pressable style={styles.skipBtn} onPress={() => onComplete(false, [])}>
                        <Text style={styles.skipBtnText}>Skip Question</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // ─── Render ──────────────────────────────────────────────────────────────
    const gestureUrl = getGestureUrl(moduleId);

    // Log current state
    console.log(`📊 Current state: Index=${currentIndex}, Target=${currentTarget}, Completed=${Array.from(completedGestures).join(', ')}`);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header - Matches lesson style */}
            <View style={styles.header}>
                <Pressable onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0f3172" />
                </Pressable>
                <Text style={styles.headerTitle}>
                    Question {questionIndex + 1} of {totalQuestions}
                </Text>
                <View style={[styles.statusBadge, isConnected && styles.statusActive]}>
                    <Text style={[styles.statusText, isConnected && styles.statusActiveText]}>
                        {isConnected ? '🟢 Live' : '⏳ Loading'}
                    </Text>
                </View>
            </View>

            {/* ─── GLASS CARD - TARGET DISPLAY ────────────────────────────── */}
            <View style={styles.glassCard}>
                <View style={styles.targetRow}>
                    <View style={styles.targetLeft}>
                        <Text style={styles.targetLabel}>✋ Sign this gesture</Text>
                        <Text style={styles.targetLetter}>{currentDisplayName}</Text>
                    </View>
                    <View style={styles.targetRight}>
                        <View style={styles.progressCircle}>
                            <Text style={styles.progressCircleText}>
                                {currentIndex + 1}/{targetGestures.length}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Gesture progress dots */}
                <View style={styles.gestureDots}>
                    {targetGestures.map((gesture, index) => {
                        const isCompleted = completedGestures.has(gesture);
                        const isActive = index === currentIndex && !isCompleted;
                        return (
                            <View
                                key={index}
                                style={[
                                    styles.gestureDot,
                                    isCompleted && styles.gestureDotCompleted,
                                    isActive && styles.gestureDotActive,
                                ]}
                            >
                                <Text style={[
                                    styles.gestureDotText,
                                    isCompleted && styles.gestureDotTextCompleted,
                                    isActive && styles.gestureDotTextActive,
                                ]}>
                                    {gesture}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* ─── PROGRESS BAR ────────────────────────────────────────────── */}
            <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                    Progress: {completedGestures.size}/{targetGestures.length}
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(completedGestures.size / targetGestures.length) * 100}%` }
                        ]}
                    />
                </View>
                <Text style={styles.progressPercentage}>
                    {Math.round((completedGestures.size / targetGestures.length) * 100)}%
                </Text>
            </View>

            {/* ─── WEBCAM - BIGGER ─────────────────────────────────────────── */}
            <View style={styles.webviewContainer}>
                <WebView
                    ref={webViewRef}
                    source={{
                        uri: gestureUrl,
                        headers: {
                            'ngrok-skip-browser-warning': 'true',
                        }
                    }}
                    style={styles.webview}
                    onLoadStart={() => {
                        console.log('🔄 WebView loading started');
                        setLoading(true);
                    }}
                    onLoadEnd={() => {
                        console.log('✅ WebView loaded');
                        setLoading(false);
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
                {/* Only show loading overlay if loading is true AND not connected */}
                {loading && !isConnected && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#FFD700" />
                        <Text style={styles.loadingOverlayText}>Loading gesture recognition...</Text>
                        <Text style={styles.loadingSubtext}>Connecting to SENAS server</Text>
                    </View>
                )}

                {!isConnected && !loading && (
                    <Pressable
                        style={styles.browserButton}
                        onPress={openInBrowser}
                    >
                        <Ionicons name="open-outline" size={24} color="#fff" />
                        <Text style={styles.browserButtonText}>Open in Browser</Text>
                    </Pressable>
                )}
            </View>

            {/* ─── DETECTION STATUS ─────────────────────────────────────────── */}
            <View style={styles.detectionBar}>
                <Text style={styles.detectionLabel}>Detected:</Text>
                <Text style={styles.detectionLetters}>
                    {Array.from(completedGestures).join(', ') || '✋'}
                </Text>
                <View style={styles.detectionCount}>
                    <Text style={styles.detectionCountText}>
                        {completedGestures.size}/{targetGestures.length}
                    </Text>
                </View>
            </View>

            {/* ─── POPUP ────────────────────────────────────────────────────── */}
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
                            contentFit="contain"
                        />
                        <Text style={styles.popupMessage}>{popupMessage}</Text>
                        {popupSubMessage ? (
                            <Text style={styles.popupSubMessage}>{popupSubMessage}</Text>
                        ) : null}
                    </View>
                </Animated.View>
            )}
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
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
    skipBtn: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    skipBtnText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(15,49,114,0.08)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.1)',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f3172',
        flex: 1,
        textAlign: 'center',
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

    // ─── GLASS CARD (matches lesson style) ───────────────────────────────
    glassCard: {
        backgroundColor: 'rgba(255,255,255,0.62)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 12,
        elevation: 4,
    },
    targetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    targetLeft: {
        flex: 1,
    },
    targetLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4b7bbb',
        letterSpacing: 0.3,
    },
    targetLetter: {
        fontSize: 48,
        fontWeight: '800',
        color: '#0f3172',
        fontFamily: Platform.OS === 'ios' ? 'Chalkboard SE' : 'sans-serif-condensed',
        opacity: 0.85,
        marginTop: -4,
    },
    targetRight: {
        alignItems: 'center',
    },
    progressCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(15,49,114,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(15,49,114,0.1)',
    },
    progressCircleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4b7bbb',
    },
    gestureDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
    },
    gestureDot: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(15,49,114,0.06)',
        borderWidth: 1.5,
        borderColor: 'rgba(15,49,114,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gestureDotCompleted: {
        backgroundColor: 'rgba(16,185,129,0.15)',
        borderColor: '#10B981',
    },
    gestureDotActive: {
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255,215,0,0.12)',
        transform: [{ scale: 1.1 }],
        shadowColor: '#FFD700',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    gestureDotText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(15,49,114,0.3)',
    },
    gestureDotTextCompleted: {
        color: '#10B981',
        fontWeight: '700',
    },
    gestureDotTextActive: {
        color: '#92650A',
        fontWeight: '800',
        fontSize: 15,
    },

    // ─── PROGRESS BAR ──────────────────────────────────────────────────────
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginHorizontal: 16,
        borderRadius: 12,
        gap: 10,
        marginBottom: 4,
    },
    progressText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#0f3172',
        minWidth: 55,
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
        backgroundColor: '#10B981',
        borderRadius: 2,
    },
    progressPercentage: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0f3172',
        minWidth: 32,
        textAlign: 'right',
    },

    // ─── WEBCAM - BIGGER ──────────────────────────────────────────────────
    webviewContainer: {
        flex: 1,
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#0a1628',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        minHeight: SCREEN_HEIGHT * 0.38,
        maxHeight: SCREEN_HEIGHT * 0.55,
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
        backgroundColor: 'rgba(10,22,40,0.95)',
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

    // ─── DETECTION BAR ────────────────────────────────────────────────────
    detectionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.95)',
        marginHorizontal: 16,
        marginBottom: 12,
        marginTop: 4,
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
    detectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4b7bbb',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detectionLetters: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: '#0f3172',
    },
    detectionCount: {
        backgroundColor: '#1848c8',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    detectionCountText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },

    // ─── POPUP ─────────────────────────────────────────────────────────────
    popupContainer: {
        position: 'absolute',
        top: '30%',
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
        borderColor: '#10B981',
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
});