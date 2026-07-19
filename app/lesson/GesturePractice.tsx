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

// ─── SINGLE APP-WIDE FONT ───────────────────────────────────────────────────
const FONT_FAMILY = Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' });

// ─── GESTURE URLS ──────────────────────────────────────────────────────────
const GESTURE_URL_ALPHABET = 'https://swipe-drinking-coral.ngrok-free.dev/gesture.html';
const GESTURE_URL_NUMBERS = 'https://swipe-drinking-coral.ngrok-free.dev/gesture_level3.html';
const GESTURE_URL_GREETINGS = 'https://swipe-drinking-coral.ngrok-free.dev/gesture_greetings.html';
const GESTURE_URL_SURVIVAL = 'https://swipe-drinking-coral.ngrok-free.dev/gesture_level2.html';

// ─── SOUND EFFECTS ──────────────────────────────────────────────────────────
const CORRECT_GESTURE_SOUND = require('../../assets/music/correct-gesture.mp3');

// ─── MOTIVATIONS (Senya speech bubble) ─────────────────────────────────────
const SENYA_MOTIVATIONS = [
    "You've got this! Keep your hand steady ✋",
    "Nice form! Hold the sign for a moment.",
    "Beautiful! Try to keep it in the frame.",
    "You're doing amazing — one gesture at a time!",
    "Deep breath. Slow and clear signs work best.",
];

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

    // Senya bounce
    const senyaBounceAnim = useRef(new Animated.Value(0)).current;
    const [motivationIndex, setMotivationIndex] = useState(0);

    // Measured height of the gesture-dots overlay so Senya can float
    const [gestureOverlayHeight, setGestureOverlayHeight] = useState(0);

    // FIXED: Dynamic font sizing for gesture-dot labels - BIGGER for short words
    const getDotFontSize = (word: string) => {
        const len = (word ?? '').length;
        if (len <= 2) return 22;  // "Yes", "No" - BIG
        if (len <= 4) return 20;  // "Hello", "Wrong", "Know" - BIG
        if (len <= 6) return 18;  // "Correct" - MEDIUM
        if (len <= 8) return 16;
        if (len <= 12) return 14; // "Understand", "Thank You"
        return 12;                // Very long phrases
    };

    // Live detection state
    const [liveLetter, setLiveLetter] = useState<string>('—');
    const [liveConfidence, setLiveConfidence] = useState<number>(0);

    const lastLoggedValueRef = useRef<string>('');
    const detectionCooldownRef = useRef<number>(0);
    const DETECTION_COOLDOWN_MS = 2500;
    const MIN_CONFIDENCE = 0.6;

    const [isSkipped, setIsSkipped] = useState(false);
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
        '27': '1', '28': '2', '29': '3', '30': '4', '31': '5',
        '32': '6', '33': '7', '34': '8', '35': '9', '36': '10',
        '47': 'Hello',
        '48': 'Thank You',
        '49': 'See You Tomorrow',
        '50': 'How Are You',
        '51': 'Nice To Meet You',
        '52': 'Understand',
        "53": "Don't Understand",
        '54': 'Know',
        "55": "Don't Know",
        '56': 'No',
        '57': 'Yes',
        '58': 'Wrong',
        '59': 'Correct',
        '60': 'Slow',
        '61': 'Fast',
    };

    // ─── State for current target ──────────────────────────────────────────
    const [currentIndex, setCurrentIndex] = useState(0);
    const [completedGestures, setCompletedGestures] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasCompleted, setHasCompleted] = useState(false);

    const targetGestures = gestureIds.map(id => ID_TO_GESTURE[id] || id);
    const currentTarget = targetGestures[currentIndex] || targetGestures[0];
    const currentDisplayName = ID_TO_GESTURE[gestureIds[currentIndex]] || targetGestures[currentIndex] || '?';

    const prevQuestionIdRef = useRef<number | null>(null);
    useEffect(() => {
        const questionId = question?.question_id;
        if (prevQuestionIdRef.current !== questionId) {
            console.log('🔄 Question changed, resetting state for:', gestureIds);
            setCurrentIndex(0);
            setCompletedGestures(new Set());
            setIsProcessing(false);
            setHasCompleted(false);
            setLoading(false);
            setIsConnected(false);
            setLiveLetter('—');
            setLiveConfidence(0);
            prevQuestionIdRef.current = questionId;
        }
    }, [question]);

    // Rotate motivation every ~6s
    useEffect(() => {
        const t = setInterval(() => {
            setMotivationIndex(i => (i + 1) % SENYA_MOTIVATIONS.length);
        }, 6000);
        return () => clearInterval(t);
    }, []);

    // ─── Determine which URL to use ──────────────────────────────────────────
    const getGestureUrl = (moduleId: string): string => {
        const moduleIdNum = parseInt(moduleId);
        if (moduleIdNum === 1 || moduleIdNum === 2) return GESTURE_URL_ALPHABET;
        if (moduleIdNum === 3) return GESTURE_URL_NUMBERS;
        if (moduleIdNum === 4) return GESTURE_URL_GREETINGS;
        if (moduleIdNum === 5) return GESTURE_URL_SURVIVAL;
        return GESTURE_URL_ALPHABET;
    };

    // ─── Play gesture sound ──────────────────────────────────────────────────
    async function playGestureSound() {
        try {
            if (isSoundPlaying) return;
            setIsSoundPlaying(true);
            if (gestureSound) await gestureSound.unloadAsync();

            const { sound } = await Audio.Sound.createAsync(
                CORRECT_GESTURE_SOUND,
                { shouldPlay: true, isLooping: false, volume: 0.8 }
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

    const animateSenyaBounce = () => {
        senyaBounceAnim.setValue(0);
        Animated.spring(senyaBounceAnim, {
            toValue: 1, friction: 4, tension: 90, useNativeDriver: true,
        }).start(() => senyaBounceAnim.setValue(0));
    };

    // ─── Show popup ──────────────────────────────────────────────────────────
    const showCutePopup = (message: string, subMessage: string = '') => {
        setPopupMessage(message);
        setPopupSubMessage(subMessage);
        setShowPopup(true);
        popupAnim.setValue(0);
        Animated.spring(popupAnim, {
            toValue: 1, friction: 8, tension: 40, useNativeDriver: true,
        }).start();

        setTimeout(() => {
            Animated.timing(popupAnim, {
                toValue: 0, duration: 180, useNativeDriver: true,
            }).start(() => setShowPopup(false));
        }, 1200);
    };


    // ─── Skip handler ──────────────────────────────────────────────────────────
    const handleSkip = () => {
        if (hasCompleted || isProcessing) return;

        setIsSkipped(true);
        onComplete(false, []);
        showCutePopup('⏭️ Skipped', 'Moving to next question');
    };
    // ─── Handle WebView messages ─────────────────────────────────────────────
    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'model_status') {
                if (data.status === 'loaded') {
                    setIsConnected(true);
                    setLoading(false);
                }
                return;
            }

            if (data.type === 'model_ready' || data.status === 'all_loaded') {
                setIsConnected(true);
                setLoading(false);
                return;
            }

            if (data.test) {
                setIsConnected(true);
                setLoading(false);
                return;
            }

            const now = Date.now();
            if (now - detectionCooldownRef.current < DETECTION_COOLDOWN_MS) {
                return;
            }

            let detectedValue = data.letter || data.greeting || '';
            const confidence = data.confidence || 0;

            if (confidence < MIN_CONFIDENCE) {
                return;
            }

            const SURVIVAL_TO_DISPLAY: Record<string, string> = {
                'UNDERSTAND': 'Understand',
                "DON'T UNDERSTAND": "Don't Understand",
                'KNOW': 'Know',
                "DON'T KNOW": "Don't Know",
                'NO': 'No',
                'YES': 'Yes',
                'WRONG': 'Wrong',
                'CORRECT': 'Correct',
                'SLOW': 'Slow',
                'FAST': 'Fast'
            };

            const GREETING_TO_DISPLAY: Record<string, string> = {
                'HELLO': 'Hello',
                'THANK YOU': 'Thank You',
                'SEE YOU TOMORROW': 'See You Tomorrow',
                'HOW ARE YOU': 'How Are You',
                'NICE TO MEET YOU': 'Nice To Meet You'
            };

            const GESTURE_TO_DISPLAY: Record<string, string> = {
                'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5',
                'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9', 'TEN': '10'
            };

            let matchValue = detectedValue;

            if (SURVIVAL_TO_DISPLAY[detectedValue] !== undefined) {
                matchValue = SURVIVAL_TO_DISPLAY[detectedValue];
            }
            else if (GREETING_TO_DISPLAY[detectedValue] !== undefined) {
                matchValue = GREETING_TO_DISPLAY[detectedValue];
            }
            else if (GESTURE_TO_DISPLAY[detectedValue] !== undefined) {
                matchValue = GESTURE_TO_DISPLAY[detectedValue];
            }

            if (data.isMatch && data.learned && Array.isArray(data.learned) && confidence >= MIN_CONFIDENCE) {
                const learnedGestures = data.learned;
                if (learnedGestures.length > 0) {
                    let lastLearned = learnedGestures[learnedGestures.length - 1];
                    if (SURVIVAL_TO_DISPLAY[lastLearned] !== undefined) {
                        lastLearned = SURVIVAL_TO_DISPLAY[lastLearned];
                    } else if (GREETING_TO_DISPLAY[lastLearned] !== undefined) {
                        lastLearned = GREETING_TO_DISPLAY[lastLearned];
                    } else if (GESTURE_TO_DISPLAY[lastLearned] !== undefined) {
                        lastLearned = GESTURE_TO_DISPLAY[lastLearned];
                    }
                    matchValue = lastLearned;
                    detectedValue = lastLearned;
                }
            }

            if (!matchValue || matchValue === '✋' || matchValue === '...' || matchValue === '') {
                setLiveLetter('—');
                setLiveConfidence(0);
                return;
            }

            setIsConnected(true);
            if (loading) setLoading(false);

            const detectedForDisplay = detectedValue || matchValue;
            setLiveLetter(detectedForDisplay);
            setLiveConfidence(Math.round(confidence * 100));

            if (detectedValue !== lastLoggedValueRef.current || confidence > 0.85) {
                lastLoggedValueRef.current = detectedValue;
                console.log(`🔍 Detected: "${detectedValue}" → "${matchValue}", Target: "${currentTarget}", Conf: ${Math.round(confidence * 100)}%`);
            }

            if (matchValue === currentTarget) {
                if (!completedGestures.has(matchValue) && !isProcessing && !hasCompleted) {
                    detectionCooldownRef.current = now;

                    console.log(`🎯 MATCH! "${matchValue}" === "${currentTarget}"`);

                    setIsProcessing(true);
                    const newCompleted = new Set(completedGestures);
                    newCompleted.add(matchValue);
                    setCompletedGestures(newCompleted);

                    playGestureSound();
                    animateSenyaBounce();

                    const displayName = ID_TO_GESTURE[gestureIds[currentIndex]] || currentTarget;
                    showCutePopup(
                        displayName,
                        `${currentIndex + 1} / ${targetGestures.length} — Amazing!`
                    );

                    if (currentIndex + 1 >= targetGestures.length) {
                        setHasCompleted(true);
                        setTimeout(() => {
                            onComplete(true, Array.from(newCompleted));
                            setIsProcessing(false);
                        }, 700);
                    } else {
                        setTimeout(() => {
                            setCurrentIndex(prev => prev + 1);
                            setIsProcessing(false);
                        }, 850);
                    }
                }
            }
        } catch (error) {
            console.error('Error handling WebView message:', error);
            setIsProcessing(false);
        }
    };

    // ─── Inject JS to hide the web page chrome ──────────────────
    const injectedJavaScript = `
    (function() {
        const elementsToHide = [
            '#status-bar',
            '#progress-tracker', 
            '#overlay',
            '.progress-bar',
            '#level-badge',
            '#match-indicator'
        ];
        
        elementsToHide.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) {
                el.style.display = 'none';
                el.style.pointerEvents = 'none';
            }
        });
        
        const greetingDisplay = document.querySelector('#greeting-display');
        if (greetingDisplay) {
            greetingDisplay.style.display = 'none';
        }
        
        const container = document.getElementById('container');
        if (container) {
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.background = 'transparent';
        }
        document.body.style.background = 'transparent';
        document.body.style.margin = '0';
        
        console.log('🎮 Gesture practice mode activated!');
        
        const checkModelStatus = setInterval(function() {
            const statusText = document.getElementById('status-text');
            if (statusText && statusText.textContent === 'Model Ready') {
                clearInterval(checkModelStatus);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'model_ready',
                        status: 'loaded'
                    }));
                }
            }
        }, 1000);
    })();
    true;
`;

    const openInBrowser = async () => {
        const url = getGestureUrl(moduleId);
        try {
            await WebBrowser.openBrowserAsync(url + '?ngrok-skip-browser-warning=true');
        } catch (error) {
            console.error('Error opening browser:', error);
        }
    };

    useEffect(() => {
        return () => {
            if (gestureSound) gestureSound.unloadAsync();
        };
    }, []);

    // ─── CAMERA PERMISSION CHECK ────────────────────────────────────────────
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

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <View style={styles.permIconWrap}>
                        <Ionicons name="camera-outline" size={44} color="#1848c8" />
                    </View>
                    <Text style={styles.title}>Camera Access Required</Text>
                    <Text style={styles.subtitle}>
                        Please grant camera permission so Senya can see your signs.
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
    const questionProgress = completedGestures.size / Math.max(targetGestures.length, 1);
    const senyaTranslate = senyaBounceAnim.interpolate({
        inputRange: [0, 1], outputRange: [0, -10],
    });

    return (
        <SafeAreaView style={styles.container}>
            {/* ─── HEADER ────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={20} color="#0f3172" />
                </Pressable>
                <Text style={styles.headerTitle}>
                    Question {questionIndex + 1} of {totalQuestions}
                </Text>
                <View style={styles.headerRight}>
                    <Pressable
                        onPress={handleSkip}
                        style={styles.skipQuestionBtn}
                        disabled={isProcessing || hasCompleted}
                    >
                        <Text style={styles.skipQuestionText}>Skip</Text>
                        <Ionicons name="arrow-forward" size={14} color="#EF4444" />
                    </Pressable>
                    <View style={[styles.statusBadge, isConnected && styles.statusActive]}>
                        <View style={[styles.statusDot, isConnected && styles.statusDotActive]} />
                        <Text style={[styles.statusText, isConnected && styles.statusActiveText]}>
                            {isConnected ? 'Live' : 'Loading'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* ─── QUIZ-LEVEL PROGRESS DOTS ─────────────── */}
            <View style={styles.quizProgressWrap}>
                <View style={styles.progressDots}>
                    {Array.from({ length: totalQuestions }).map((_, i) => (
                        <View key={i} style={[styles.progressDot, {
                            backgroundColor:
                                i < questionIndex ? '#22c55e' :
                                    i === questionIndex ? '#2563EB' :
                                        'rgba(15,49,114,0.10)',
                        }]} />
                    ))}
                </View>
            </View>

            {/* ─── FULL-BLEED WEBCAM ────────────────────────────────────── */}
            <View style={styles.webviewContainer}>
                <WebView
                    ref={webViewRef}
                    source={{
                        uri: gestureUrl,
                        headers: { 'ngrok-skip-browser-warning': 'true' },
                    }}
                    style={styles.webview}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
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
                {/* ─── HUD: TOP-LEFT — target letter overlay ───────────── */}
                <View style={styles.targetOverlay} pointerEvents="none">
                    <Text style={styles.targetLabelOverlay}>Sign this</Text>
                    <View style={styles.targetLetterCard}>
                        <Text
                            style={[
                                styles.targetLetterBase,
                                currentDisplayName && currentDisplayName.length <= 1 && { fontSize: 56, lineHeight: 60 },
                                currentDisplayName && currentDisplayName.length === 2 && { fontSize: 50, lineHeight: 54 },
                                currentDisplayName && currentDisplayName.length === 3 && { fontSize: 46, lineHeight: 50 },
                                currentDisplayName && currentDisplayName.length === 4 && { fontSize: 42, lineHeight: 46 },
                                currentDisplayName && currentDisplayName.length > 4 && currentDisplayName.length <= 6 && { fontSize: 38, lineHeight: 42 },
                                currentDisplayName && currentDisplayName.length > 6 && currentDisplayName.length <= 10 && { fontSize: 32, lineHeight: 36 },
                                currentDisplayName && currentDisplayName.length > 10 && currentDisplayName.length <= 15 && { fontSize: 26, lineHeight: 30 },
                                currentDisplayName && currentDisplayName.length > 15 && { fontSize: 20, lineHeight: 24 },
                            ]}
                            numberOfLines={2}
                        // REMOVE THESE TWO LINES:
                        // adjustsFontSizeToFit
                        // minimumFontScale={0.6}
                        >
                            {currentDisplayName}
                        </Text>
                    </View>
                    <Text style={styles.targetHint}>
                        {currentIndex + 1} of {targetGestures.length}
                    </Text>
                </View>

                {/* ─── SENYA — floating with speech bubble ────────────────── */}
                <Animated.View
                    style={[
                        styles.senyaFloat,
                        {
                            bottom: gestureOverlayHeight + 12,
                            transform: [{ translateY: senyaTranslate }],
                        },
                    ]}
                    pointerEvents="none"
                >
                    {/* Speech Bubble - positioned independently */}
                    <View style={styles.senyaBubbleWrapper} pointerEvents="none">
                        <View style={styles.senyaBubble}>
                            <Text style={styles.senyaBubbleText} numberOfLines={3}>
                                {SENYA_MOTIVATIONS[motivationIndex]}
                            </Text>
                            <View style={styles.senyaBubbleTail} />
                        </View>
                    </View>

                    {/* Senya Image */}
                    <Image
                        source={require('../../assets/images/img/senya_teaching.png')}
                        style={styles.senyaImg}
                        contentFit="contain"
                    />
                </Animated.View>

                {/* ─── GESTURE DOTS OVERLAY ────────────────────────────── */}
                <View
                    style={styles.gestureOverlay}
                    pointerEvents="none"
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height;
                        if (Math.abs(h - gestureOverlayHeight) > 1) {
                            setGestureOverlayHeight(h);
                        }
                    }}
                >
                    <View style={styles.gestureProgressBarBg}>
                        <View style={[
                            styles.gestureProgressBarFill,
                            {
                                width: `${questionProgress * 100}%`,
                                backgroundColor: '#10B981',
                            }
                        ]} />
                    </View>
                    <View style={styles.gestureDots}>
                        {targetGestures.map((gesture, index) => {
                            const isCompleted = completedGestures.has(gesture);
                            const isActive = index === currentIndex && !isCompleted && !isSkipped;
                            const dynamicFontSize = getDotFontSize(gesture);
                            return (
                                <View
                                    key={index}
                                    style={[
                                        styles.gestureDot,
                                        isCompleted && styles.gestureDotCompleted,
                                        isActive && styles.gestureDotActive,
                                    ]}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.gestureDotText,
                                            { fontSize: dynamicFontSize },
                                            isCompleted && styles.gestureDotTextCompleted,
                                            isActive && [
                                                styles.gestureDotTextActive,
                                                { fontSize: dynamicFontSize + 2 },
                                            ],
                                        ]}
                                    >
                                        {gesture}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Loading overlay */}
                {loading && !isConnected && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#FFD700" />
                        <Text style={styles.loadingOverlayText}>Starting camera…</Text>
                        <Text style={styles.loadingSubtext}>Connecting to SENAS server</Text>
                    </View>
                )}

                {!isConnected && !loading && (
                    <Pressable style={styles.browserButton} onPress={openInBrowser}>
                        <Ionicons name="open-outline" size={20} color="#fff" />
                        <Text style={styles.browserButtonText}>Open in Browser</Text>
                    </Pressable>
                )}
            </View>

            {/* ─── DETECTION BAR ───────────────── */}
            <View style={styles.detectionBar}>
                <Text style={styles.detectionBarLabel}>Detecting</Text>
                <Text
                    style={styles.detectionBarLetter}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                >
                    {liveLetter}
                </Text>
                <View style={styles.confidenceBarBg}>
                    <View style={[styles.confidenceBarFill, {
                        width: `${Math.min(100, Math.max(0, liveConfidence))}%`,
                    }]} />
                </View>
                <Text style={styles.detectionBarPercent}>{liveConfidence}%</Text>
            </View>

            {/* ─── SUCCESS POPUP ──────────────────────────── */}
            {showPopup && (
                <View style={styles.popupBackdrop} pointerEvents="none">
                    <Animated.View
                        style={[
                            styles.popupContainer,
                            {
                                opacity: popupAnim,
                                transform: [
                                    {
                                        scale: popupAnim.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: [0.6, 1.08, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={styles.popupContent}>
                            {popupMessage.includes('Skipped') ? (
                                <>
                                    <Text style={styles.popupSkipIcon}>⏭️</Text>
                                    <Text style={styles.popupLetterPillText}>{popupMessage}</Text>
                                </>
                            ) : (
                                <>
                                    <View style={styles.popupCheckCircle}>
                                        <Ionicons name="checkmark" size={18} color="#fff" />
                                    </View>
                                    <Text style={styles.popupLetterPillText}>{popupMessage}</Text>
                                </>
                            )}
                            {popupSubMessage ? (
                                <Text style={styles.popupSubMessage}>{popupSubMessage}</Text>
                            ) : null}
                        </View>
                    </Animated.View>
                </View>
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
        fontSize: 15,
        color: '#4b7bbb',
        fontWeight: '600',
        marginTop: 12,
    },
    permIconWrap: {
        width: 84, height: 84, borderRadius: 42,
        backgroundColor: 'rgba(24,72,200,0.08)',
        borderWidth: 1, borderColor: 'rgba(24,72,200,0.18)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22, fontWeight: '800', color: '#0f3172',
        marginTop: 4, textAlign: 'center',
    },
    subtitle: {
        fontSize: 13, color: '#4b7bbb', fontWeight: '500',
        textAlign: 'center', marginTop: 8, marginBottom: 22, lineHeight: 20,
    },
    button: {
        backgroundColor: '#1848c8', paddingHorizontal: 32, paddingVertical: 14,
        borderRadius: 60,
        shadowColor: '#1848c8', shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.28, shadowRadius: 18, elevation: 10,
    },
    buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    skipBtn: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 20 },
    skipBtnText: {
        color: '#6B7280', fontSize: 13, fontWeight: '600',
        textDecorationLine: 'underline',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 10,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#0f3172', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    },
    headerTitle: {
        flex: 1,
        fontSize: 14, fontWeight: '800', color: '#0f3172',
        textAlign: 'center', letterSpacing: 0.2,
    },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99,
    },
    statusActive: {
        backgroundColor: 'rgba(16,185,129,0.15)',
        borderColor: 'rgba(16,185,129,0.35)',
    },
    statusDot: {
        width: 7, height: 7, borderRadius: 4, backgroundColor: '#9CA3AF',
    },
    statusDotActive: { backgroundColor: '#10B981' },
    statusText: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
    statusActiveText: { color: '#047857' },

    quizProgressWrap: {
        paddingHorizontal: 16,
        marginTop: 2,
        marginBottom: 8,
    },
    progressDots: { flexDirection: 'row', gap: 4 },
    progressDot: { flex: 1, height: 5, borderRadius: 99 },

    webviewContainer: {
        height: SCREEN_HEIGHT * 0.65,
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#0a1628',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 8,
    },
    webview: { flex: 1, backgroundColor: '#0a1628' },

    targetOverlay: {
        position: 'absolute',
        top: 14,
        left: 14,
        alignItems: 'flex-start',
        maxWidth: SCREEN_WIDTH * 0.55,
    },
    targetLabelOverlay: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    targetLetterCard: {
        minWidth: 60,
        maxWidth: SCREEN_WIDTH * 0.45,
        paddingHorizontal: 14, // Reduced from 18
        paddingVertical: 6, // Reduced from 8
        minHeight: 60, // Reduced from 70
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 6,
    },
    targetLetterBase: {
        fontWeight: '900',
        color: '#fff',
        fontFamily: FONT_FAMILY,
        textShadowColor: 'rgba(0,0,0,0.35)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
        textAlign: 'center',
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    targetHint: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        marginTop: 8,
        marginLeft: 4,
    },

    detectionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 8,
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        flexWrap: 'wrap',
    },
    detectionBarLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6,
        color: '#8AA3C4',
        textTransform: 'uppercase',
        flexShrink: 0,
    },
    detectionBarLetter: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f3172',
        flexShrink: 1,
        maxWidth: SCREEN_WIDTH * 0.25,
        textAlign: 'center',
    },
    confidenceBarBg: {
        flex: 1,
        minWidth: 40,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(15,49,114,0.08)',
        overflow: 'hidden',
    },
    confidenceBarFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    detectionBarPercent: {
        fontSize: 12,
        fontWeight: '800',
        color: '#10B981',
        minWidth: 34,
        textAlign: 'right',
        flexShrink: 0,
    },

    gestureOverlay: {
        position: 'absolute',
        bottom: 18,
        left: 16,
        right: 16,
        gap: 10,
    },
    gestureProgressBarBg: {
        height: 4,
        borderRadius: 99,
        backgroundColor: 'rgba(255,255,255,0.25)',
        overflow: 'hidden',
    },
    gestureProgressBarFill: {
        height: '100%',
        borderRadius: 99,
        backgroundColor: '#10B981',
    },
    gestureDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    gestureDot: {
        minWidth: 34, // Changed back from 40
        minHeight: 34, // Changed back from 40
        paddingHorizontal: 8, // Changed back from 12
        paddingVertical: 4, // Changed back from 6
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    gestureDotCompleted: {
        backgroundColor: 'rgba(16,185,129,0.4)',
        borderColor: '#10B981',
    },
    gestureDotActive: {
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255,215,0,0.25)',
        transform: [{ scale: 1.15 }],
        shadowColor: '#FFD700',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    gestureDotText: {
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    gestureDotTextCompleted: {
        color: '#fff',
        fontWeight: '800',
    },
    gestureDotTextActive: {
        color: '#fff',
        fontWeight: '900',
    },

    // ─── SENYA FLOAT + SPEECH BUBBLE ────────────────────────────────────
    senyaFloat: {
        position: 'absolute',
        right: 2,
        bottom: 35,
        alignItems: 'flex-end',
    },
    // FIXED: Removed maxWidth constraints, let bubble grow naturally
    senyaBubbleWrapper: {
        alignItems: 'flex-end',
        marginBottom: -40, // Add some spacing
        marginRight: 60,
        alignSelf: 'flex-end', // Keep it on the right
    },
    senyaBubble: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.95)',
        borderRadius: 14,
        borderBottomRightRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
        // Add these to allow expansion:
        flexShrink: 0, // Don't shrink
        alignSelf: 'flex-start', // Width based on content
        maxWidth: SCREEN_WIDTH * 0.55, // Max width, but content will expand to fit
    },
    senyaBubbleText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#0f3172',
        lineHeight: 12,
    },
    senyaBubbleTail: {
        position: 'absolute',
        right: -4,
        bottom: 6,
        width: 10,
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.95)',
        transform: [{ rotate: '-45deg' }],
    },
    senyaImg: { width: 62, height: 62 },

    loadingOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(10,22,40,0.95)',
        alignItems: 'center', justifyContent: 'center',
    },
    loadingOverlayText: {
        color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 14,
    },
    loadingSubtext: {
        color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6,
    },
    browserButton: {
        position: 'absolute', bottom: 30, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1848c8', paddingHorizontal: 22, paddingVertical: 12,
        borderRadius: 60, gap: 8,
        shadowColor: '#1848c8', shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    browserButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    popupBackdrop: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
    },
    popupContainer: {
        alignItems: 'center', justifyContent: 'center',
    },
    popupContent: {
        minWidth: 160,
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderRadius: 22,
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.95)',
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28, shadowRadius: 28, elevation: 16,
    },
    popupCheckCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#10B981',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)',
    },
    popupLetterPillText: {
        fontSize: 18,
        fontWeight: '900', color: '#1848c8',
        letterSpacing: 1,
    },
    popupSubMessage: {
        fontSize: 10,
        color: '#4b7bbb', fontWeight: '600',
        marginTop: 6,
        textAlign: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    skipQuestionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        gap: 4,
    },
    skipQuestionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#EF4444',
    },
    popupSkipIcon: {
        fontSize: 32,
        marginBottom: 4,
    },
});