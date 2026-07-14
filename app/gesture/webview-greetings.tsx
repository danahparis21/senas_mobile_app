// app/gesture/webview-greetings.tsx
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

// ─── SOUND EFFECTS ──────────────────────────────────────────────────────────
const CORRECT_GESTURE_SOUND = require('../../assets/music/correct-gesture.mp3');
const GESTURE_COMPLETE_SOUND = require('../../assets/music/gesture-complete.mp3');

// ONLY THE 5 WORKING SIGNS
const GREETINGS_LIST = [
    'HELLO',
    'THANK YOU',
    'SEE YOU TOMORROW',
    'HOW ARE YOU',
    'NICE TO MEET YOU'
];

// Senya's encouragement messages
const SENYA_MESSAGES = {
    welcome: "Let's learn some greetings! 👋",
    correct: [
        "Amazing! You're a natural!",
        "Perfect! Keep going!",
        "Great job! You're on fire!",
        "Wonderful! You're crushing it!",
        "Fantastic! Next one!",
    ],
    struggle: [
        "Try keeping your hand steady...",
        "Make the shape clearer!",
        "You got this! Try again!",
        "Almost there! One more try!",
    ],
    complete: "YOU DID IT! ALL 5 GREETINGS! 🎉",
};

// Greeting struggle tracking
interface GreetingAttempt {
    greeting: string;
    attempts: number;
    wrongAttempts: number;
    firstSuccess?: number;
    lastAttempt?: number;
    successCount: number;
}

export default function WebViewGreetingsScreen() {
    const router = useRouter();
    const webViewRef = useRef<WebView>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(true);
    const [detectedGreeting, setDetectedGreeting] = useState('✋');
    const [confidence, setConfidence] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [showBrowserButton, setShowBrowserButton] = useState(true);

    // ── Audio state ──
    const [gestureSound, setGestureSound] = useState<Audio.Sound | null>(null);
    const [completeSound, setCompleteSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(false);

    // Gamification state
    const [completedGreetings, setCompletedGreetings] = useState<Set<string>>(new Set());
    const [currentTarget, setCurrentTarget] = useState('HELLO');
    const [senyaMessage, setSenyaMessage] = useState(SENYA_MESSAGES.welcome);
    const [consecutiveWrong, setConsecutiveWrong] = useState(0);
    const [isModuleComplete, setIsModuleComplete] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [starRating, setStarRating] = useState(0);

    // Greeting tracking for results
    const [greetingAttempts, setGreetingAttempts] = useState<Record<string, GreetingAttempt>>({});
    const [totalWrongAttempts, setTotalWrongAttempts] = useState(0);
    const [totalCorrectAttempts, setTotalCorrectAttempts] = useState(0);
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [endTime, setEndTime] = useState<number | null>(null);

    // Popup animation
    const popupAnim = useState(new Animated.Value(0))[0];
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupSubMessage, setPopupSubMessage] = useState('');

    // Track the last detected greeting to avoid counting transitions as mistakes
    const [lastProcessedGreeting, setLastProcessedGreeting] = useState<string>('');
    const [greetingStableCount, setGreetingStableCount] = useState(0);

    // Senya message cooldown
    const senyaMsgCooldownRef = useRef<number>(0);
    const SENYA_COOLDOWN_MS = 3000;

    // Star animations for results modal
    const starAnim1 = useRef(new Animated.Value(0)).current;
    const starAnim2 = useRef(new Animated.Value(0)).current;
    const starAnim3 = useRef(new Animated.Value(0)).current;

    const [modelLoading, setModelLoading] = useState(true);
    const [modelLoadAttempts, setModelLoadAttempts] = useState(0);

    const [showFullUI, setShowFullUI] = useState(false);
    // ── Play gesture sound ──
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

    // ── Play completion sound ──
    async function playCompleteSound() {
        try {
            if (completeSound) {
                await completeSound.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                GESTURE_COMPLETE_SOUND,
                {
                    shouldPlay: true,
                    isLooping: false,
                    volume: 1.0,
                }
            );

            setCompleteSound(sound);

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

    // Get current target (first incomplete)
    const getCurrentTarget = () => {
        for (const greeting of GREETINGS_LIST) {
            if (!completedGreetings.has(greeting)) return greeting;
        }
        return null;
    };

    // Initialize greeting tracking
    useEffect(() => {
        const initial: Record<string, GreetingAttempt> = {};
        GREETINGS_LIST.forEach(greeting => {
            initial[greeting] = {
                greeting,
                attempts: 0,
                wrongAttempts: 0,
                successCount: 0,
            };
        });
        setGreetingAttempts(initial);
        setStartTime(Date.now());
        setEndTime(null);

        return () => {
            if (gestureSound) {
                gestureSound.unloadAsync();
            }
            if (completeSound) {
                completeSound.unloadAsync();
            }
        };
    }, []);

    // Auto-scroll to current target
    useEffect(() => {
        const target = getCurrentTarget();
        if (target) {
            setCurrentTarget(target);
            const targetIndex = GREETINGS_LIST.indexOf(target);
            if (targetIndex >= 0 && scrollViewRef.current) {
                const slotWidth = 100; // wider for longer greeting names
                const scrollX = targetIndex * slotWidth - (width - 100) / 2;
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({
                        x: Math.max(0, scrollX),
                        animated: true,
                    });
                }, 100);
            }
        } else if (completedGreetings.size === GREETINGS_LIST.length) {
            setIsModuleComplete(true);
            setSenyaMessage(SENYA_MESSAGES.complete);
            const endNow = Date.now();
            setEndTime(endNow);
            const elapsed = Math.round((endNow - startTime) / 1000);
            setStarRating(elapsed < 30 ? 3 : elapsed < 60 ? 2 : 1);

            playCompleteSound();

            setTimeout(() => {
                setShowResults(true);
            }, 1500);
        }
    }, [completedGreetings]);

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

    const getRandomMessage = (messages: string[]) => {
        return messages[Math.floor(Math.random() * messages.length)];
    };

    // Show popup
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

    const savedGreetingsRef = useRef<Set<string>>(new Set());
    const lastAttemptGreetingRef = useRef<string>('');
    const lastAttemptTimeRef = useRef<number>(0);
    const MIN_ATTEMPT_INTERVAL = 1000;

    // Handle detection from WebView
    const handleDetection = async (data: any) => {
        const { greeting, confidence: conf, handCount } = data;

        if (greeting && greeting !== '✋' && greeting !== '...' && GREETINGS_LIST.includes(greeting)) {
            setDetectedGreeting(greeting);
            setConfidence(conf || 0);
            setIsConnected(true);
            setShowBrowserButton(false);

            // Check if this is a stable detection
            if (greeting === lastProcessedGreeting) {
                setGreetingStableCount(prev => prev + 1);
            } else {
                setLastProcessedGreeting(greeting);
                setGreetingStableCount(0);
                return;
            }

            // Only process after 3 stable detections
            if (greetingStableCount < 2) {
                return;
            }

            const now = Date.now();
            const isNewGreeting = greeting !== lastAttemptGreetingRef.current;
            const isTimeForNewAttempt = now - lastAttemptTimeRef.current >= MIN_ATTEMPT_INTERVAL;

            if (isNewGreeting || isTimeForNewAttempt) {
                lastAttemptGreetingRef.current = greeting;
                lastAttemptTimeRef.current = now;

                setGreetingAttempts(prev => {
                    const current = prev[greeting] || { greeting, attempts: 0, wrongAttempts: 0, successCount: 0 };
                    return {
                        ...prev,
                        [greeting]: {
                            ...current,
                            attempts: current.attempts + 1,
                            lastAttempt: Date.now(),
                        }
                    };
                });
            }

            // Gamification logic
            const target = getCurrentTarget();

            if (greeting === target) {
                // CORRECT!
                if (!completedGreetings.has(greeting)) {
                    await playGestureSound();

                    const newCompleted = new Set(completedGreetings);
                    newCompleted.add(greeting);
                    setCompletedGreetings(newCompleted);
                    setConsecutiveWrong(0);
                    setTotalCorrectAttempts(prev => prev + 1);

                    setGreetingAttempts(prev => {
                        const current = prev[greeting] || { greeting, attempts: 0, wrongAttempts: 0, successCount: 0 };
                        return {
                            ...prev,
                            [greeting]: {
                                ...current,
                                successCount: current.successCount + 1,
                                firstSuccess: current.firstSuccess || Date.now(),
                            }
                        };
                    });

                    if (!savedGreetingsRef.current.has(greeting)) {
                        savedGreetingsRef.current.add(greeting);
                        // Save performance (optional - you can implement API call here)
                    }

                    const msg = getRandomMessage(SENYA_MESSAGES.correct);
                    setSenyaMessage(msg);
                    senyaMsgCooldownRef.current = Date.now();

                    showCutePopup(
                        `✓ ${greeting}`,
                        `${completedGreetings.size + 1}/${GREETINGS_LIST.length}`
                    );
                }
            } else if (completedGreetings.has(greeting)) {
                // Already completed
                const now = Date.now();
                if (now - senyaMsgCooldownRef.current >= SENYA_COOLDOWN_MS) {
                    senyaMsgCooldownRef.current = now;
                    if (target) {
                        setSenyaMessage(`You got ${greeting}! Try ${target}`);
                    } else {
                        setSenyaMessage(SENYA_MESSAGES.complete);
                    }
                }
                setConsecutiveWrong(0);
            } else {
                // Wrong greeting
                if (greetingStableCount >= 2 && (isNewGreeting || isTimeForNewAttempt)) {
                    const newWrong = consecutiveWrong + 1;
                    setConsecutiveWrong(newWrong);
                    setTotalWrongAttempts(prev => prev + 1);

                    if (target) {
                        setGreetingAttempts(prev => {
                            const current = prev[target] || { greeting: target, attempts: 0, wrongAttempts: 0, successCount: 0 };
                            return {
                                ...prev,
                                [target]: {
                                    ...current,
                                    wrongAttempts: current.wrongAttempts + 1,
                                }
                            };
                        });
                    }

                    const now = Date.now();
                    if (now - senyaMsgCooldownRef.current >= SENYA_COOLDOWN_MS) {
                        senyaMsgCooldownRef.current = now;
                        if (newWrong >= 4) {
                            const msg = getRandomMessage(SENYA_MESSAGES.struggle);
                            setSenyaMessage(msg);
                            setConsecutiveWrong(0);
                            showCutePopup(
                                `💡 ${target}`,
                                'Keep your hands steady'
                            );
                        } else if (newWrong >= 2) {
                            setSenyaMessage(`Try making ${target} shape!`);
                        }
                    }
                }
            }
        } else {
            // No greeting detected
            setDetectedGreeting('✋');
            setConfidence(0);
            setLastProcessedGreeting('');
            setGreetingStableCount(0);

            const now = Date.now();
            if (!isModuleComplete && completedGreetings.size < GREETINGS_LIST.length && now - senyaMsgCooldownRef.current >= 5000) {
                senyaMsgCooldownRef.current = now;
                const target = getCurrentTarget();
                if (target) {
                    setSenyaMessage(`Show me ${target}!`);
                }
            }
        }
    };

    // ─── SAVE PERFORMANCE (optional) ──────────────────────────────────────
    const saveAllPerformance = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return null;

            const greetingPerformances = GREETINGS_LIST.map(greeting => {
                const data = greetingAttempts[greeting] || {
                    greeting,
                    attempts: 0,
                    wrongAttempts: 0,
                    successCount: 0
                };
                return {
                    greeting: greeting,
                    attempts: data.attempts || 0,
                    wrong_attempts: data.wrongAttempts || 0,
                    success_count: data.successCount || 0,
                    consecutive_wrong: 0,
                };
            });

            const totalAttempts = greetingPerformances.reduce((sum, g) => sum + g.attempts, 0);
            if (totalAttempts === 0) return null;

            console.log('📤 Saving greeting performance...');
            // Use your API to save performance
            // const result = await api.saveGreetingPerformance(...);

            return { success: true };
        } catch (error) {
            console.error('❌ Error saving performance:', error);
            return null;
        }
    };

    // XP Award (optional)
    const awardModuleXp = async (starRating: number) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return null;

            console.log(`⭐ Awarding XP for ${starRating} star${starRating > 1 ? 's' : ''}...`);
            // Use your XP API
            // const result = await api.awardModuleXp('greetings_level1', starRating);

            return { success: true, xp_earned: starRating * 10, total_xp: 100 };
        } catch (error) {
            console.error('❌ Error awarding XP:', error);
            return null;
        }
    };

    const [xpResult, setXpResult] = useState<any>(null);

    useEffect(() => {
        if (isModuleComplete) {
            saveAllPerformance().then(result => {
                if (result) {
                    console.log('📊 All performance data saved');
                }
            });

            setTimeout(async () => {
                const result = await awardModuleXp(starRating);
                if (result) {
                    setXpResult(result);
                }
            }, 2000);
        }
    }, [isModuleComplete]);
    const preloadModel = async () => {
        try {
            console.log('📦 Pre-loading model...');
            const response = await fetch('https://swipe-drinking-coral.ngrok-free.dev/models/model.json');
            if (response.ok) {
                console.log('✅ Model pre-loaded successfully');
                // The model will be cached
            }
        } catch (error) {
            console.error('❌ Pre-load failed:', error);
        }
    };

    // Call it when the component mounts
    useEffect(() => {
        preloadModel();
    }, []);

    // ─── WEBVIEW CONFIG ────────────────────────────────────────────────────
    const GREETINGS_URL = 'https://swipe-drinking-coral.ngrok-free.dev/gesture_greetings.html';

    const injectedJavaScript = `
    (function() {
        console.log('🎮 WebView loaded, waiting for models...');
        
        // Monitor model loading status
        const checkModelStatus = setInterval(function() {
            const statusText = document.getElementById('status-text');
            const modelReady = document.getElementById('status-text')?.textContent === 'Model Ready';
            
            if (modelReady) {
                console.log('✅ Model is ready!');
                clearInterval(checkModelStatus);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'model_ready',
                        status: 'loaded'
                    }));
                }
            }
        }, 1000);
        
        // Also check for TensorFlow
        setTimeout(function() {
            console.log('🔍 Checking TensorFlow:', typeof tf !== 'undefined');
            console.log('🔍 Checking MediaPipe:', typeof Hands !== 'undefined');
            
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'library_check',
                    tf: typeof tf !== 'undefined',
                    mediapipe: typeof Hands !== 'undefined'
                }));
            }
        }, 2000);
        
        console.log('✅ Debug overlay added');
    })();
`;

    const openInBrowser = async () => {
        try {
            const urlWithHeader = GREETINGS_URL + '?ngrok-skip-browser-warning=true';
            await WebBrowser.openBrowserAsync(urlWithHeader);
        } catch (error) {
            Linking.openURL(GREETINGS_URL);
        }
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            // Handle model status updates
            if (data.type === 'model_status') {
                console.log(`📦 Model status: ${data.status} - ${data.message}`);
                setModelLoading(true);
                if (data.status === 'loaded') {
                    setModelLoading(false);
                    setLoading(false);
                    setIsConnected(true);
                }
                return;
            }

            // Handle model errors
            if (data.type === 'model_error') {
                console.error('❌ Model error:', data.error);
                setModelLoading(false);
                setLoading(false);
                setSenyaMessage(`Error: ${data.error}`);
                return;
            }

            // Handle model ready signal from HTML
            if (data.type === 'model_ready' || data.status === 'all_loaded') {
                console.log('✅ Models are ready!');
                setIsConnected(true);
                setLoading(false);
                setModelLoading(false);
                return;
            }

            // Handle MediaPipe ready
            if (data.type === 'mediapipe_ready') {
                console.log('✅ MediaPipe ready');
                return;
            }

            // Handle test messages
            if (data.test) {
                console.log('✅ Test message received');
                setIsConnected(true);
                setLoading(false);
                setModelLoading(false);
                return;
            }

            const detectedValue = data.greeting || data.letter || '';
            const confidenceValue = data.confidence || 0;

            // Only log when we have a valid detection with confidence
            if (detectedValue && detectedValue !== '' && detectedValue !== '✋' && detectedValue !== '...') {
                console.log('📨 WebView data:', {
                    greeting: detectedValue,
                    confidence: Math.round(confidenceValue * 100),
                    handCount: data.handCount,
                    isMatch: data.isMatch
                });
            }

            if (!detectedValue || detectedValue === '' || detectedValue === '✋' || detectedValue === '...') {
                setGreetingStableCount(0);
                return;
            }

            if (GREETINGS_LIST.includes(detectedValue)) {
                console.log('🎯 Valid Sign:', detectedValue, `(${Math.round(confidenceValue * 100)}%)`);
                setDetectedGreeting(detectedValue);
                setConfidence(confidenceValue);
                setIsConnected(true);
                setShowBrowserButton(false);
                handleDetection(data);
            } else {
                setDetectedGreeting(detectedValue);
                setConfidence(confidenceValue);
            }

        } catch (error) {
            console.error('❌ Message error:', error);
        }
    };
    // ─── RESULTS ──────────────────────────────────────────────────────────
    const getResults = () => {
        const timeToUse = endTime || Date.now();
        const totalSecs = Math.round((timeToUse - startTime) / 1000);
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;
        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        const strugglingGreetings = Object.values(greetingAttempts)
            .filter(g => g.wrongAttempts >= 2)
            .sort((a, b) => b.wrongAttempts - a.wrongAttempts)
            .map(g => g.greeting)
            .slice(0, 3);

        const easyGreetings = Object.values(greetingAttempts)
            .filter(g => g.successCount > 0 && g.wrongAttempts === 0)
            .map(g => g.greeting);

        const completedCount = completedGreetings.size;

        return {
            totalTime: timeDisplay,
            strugglingGreetings,
            easyGreetings,
            totalCorrect: completedCount,
            totalWrong: totalWrongAttempts,
        };
    };
    const getLevelName = (level: number): string => {
        const levelNames: Record<number, string> = {
            1: 'Novice Signer',
            2: 'Beginner Signer',
            3: 'Emerging Signer',
            4: 'Intermediate Signer',
            5: 'Advanced Beginner',
            6: 'Competent Signer',
            7: 'Proficient Signer',
            8: 'Advanced Signer',
            9: 'Expert Signer',
            10: 'Master Signer',
        };
        return levelNames[level] || 'Novice Signer';
    };

    const getNextLevelXp = (level: number): number => {
        const thresholds: Record<number, number> = {
            1: 0, 2: 100, 3: 250, 4: 500, 5: 800,
            6: 1200, 7: 1700, 8: 2300, 9: 3000, 10: 4000,
        };
        const nextLevel = level + 1;
        return thresholds[nextLevel] || 4000 + ((level - 9) * 1000);
    };

    const handleContinue = async () => {
        await saveAllPerformance();
        setShowResults(false);

        if (xpResult && xpResult.xp_earned > 0) {
            const level = xpResult.level || 1;
            const totalXp = xpResult.total_xp || 0;
            const xpEarned = xpResult.xp_earned || 0;
            const previousXp = totalXp - xpEarned;
            const levelName = getLevelName(level);
            const nextLevelXp = getNextLevelXp(level);

            router.push({
                pathname: '/lesson/xp-progress',
                params: {
                    xpEarned: String(xpEarned),
                    totalXp: String(totalXp),
                    level: String(level),
                    levelName: levelName,
                    previousXp: String(previousXp),
                    nextLevelXp: String(nextLevelXp),
                    showStreak: 'true',
                    streakDays: String(0),
                },
            });
        } else {
            router.back();
        }
    };

    // ─── PERMISSION CHECK ──────────────────────────────────────────────────
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


    // ─── RENDER ────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#0f3172" />
                    </Pressable>
                </View>

                <Text style={styles.headerTitle}>Greetings Level 1</Text>

                <View style={styles.headerRight}>
                    <Pressable
                        onPress={() => {
                            webViewRef.current?.injectJavaScript(`
                    (function() {
                        const elements = ['#status-bar', '#progress-tracker', '#overlay', '.progress-bar'];
                        const show = document.querySelector('#status-bar').style.display !== 'none';
                        elements.forEach(sel => {
                            const el = document.querySelector(sel);
                            if (el) el.style.display = show ? 'none' : '';
                        });
                        console.log('UI toggled');
                    })();
                `);
                        }}
                        style={styles.testButton}
                    >
                        <Ionicons name="eye-outline" size={20} color="#0f3172" />
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            webViewRef.current?.injectJavaScript(`
                    (function() {
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                greeting: 'HELLO',
                                confidence: 0.95,
                                handCount: 1,
                                test: true
                            }));
                        }
                    })();
                `);
                        }}
                        style={styles.testButton}
                    >
                        <Ionicons name="bug-outline" size={20} color="#0f3172" />
                    </Pressable>

                    <View style={[styles.statusBadge, isConnected && styles.statusActive]}>
                        <Text style={[styles.statusText, isConnected && styles.statusActiveText]}>
                            {isConnected ? '🟢 Live' : '⏳ Loading'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Senya Section */}
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
                    Progress: {completedGreetings.size}/{GREETINGS_LIST.length}
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(completedGreetings.size / GREETINGS_LIST.length) * 100}%` }
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
                        uri: GREETINGS_URL,
                        headers: {
                            'ngrok-skip-browser-warning': 'true',
                        }
                    }}
                    style={styles.webview}
                    onLoadStart={() => {
                        setLoading(true);
                        setModelLoading(true);
                        console.log('🔄 WebView loading started...');
                    }}
                    onLoadProgress={({ nativeEvent }) => {
                        console.log(`📊 Loading: ${Math.round(nativeEvent.progress * 100)}%`);
                        // If we're stuck at 100% but still loading, check if models are ready
                        if (nativeEvent.progress >= 0.9 && modelLoading) {
                            console.log('⏳ WebView loaded but waiting for models...');
                        }
                    }}
                    onLoadEnd={() => {
                        console.log('✅ WebView HTML loaded - waiting for models to initialize');
                        // Don't hide loading - wait for models
                    }}
                    onError={(error) => {
                        console.error('❌ WebView error:', error);
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
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    // Important for loading models
                    cacheEnabled={true}
                    cacheMode="LOAD_DEFAULT"
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

            {/* Greeting Grid - Horizontal Scroll */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.greetingGridScroll}
                contentContainerStyle={styles.greetingGridContent}
                scrollEventThrottle={16}
            >
                {GREETINGS_LIST.map((greeting) => {
                    const isCompleted = completedGreetings.has(greeting);
                    const isActive = greeting === currentTarget && !isCompleted;
                    const displayName = greeting.length > 12 ? greeting.substring(0, 10) + '…' : greeting;

                    return (
                        <View
                            key={greeting}
                            style={[
                                styles.greetingSlot,
                                isCompleted && styles.greetingCompleted,
                                isActive && styles.greetingActive,
                            ]}
                        >
                            <Text style={[
                                styles.greetingChar,
                                isCompleted && styles.greetingCharCompleted,
                                isActive && styles.greetingCharActive,
                            ]}>
                                {displayName}
                            </Text>
                            {isCompleted && (
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            )}
                            {isActive && (
                                <Ionicons name="star" size={13} color="#FFD700" />
                            )}
                            {!isCompleted && !isActive && (
                                <View style={styles.greetingStatusDot} />
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Bottom Detection Bar */}
            <View style={styles.resultBar}>
                <Text style={styles.resultLabel}>Detected:</Text>
                <Text style={styles.resultGreeting}>{detectedGreeting}</Text>

                {confidence > 0 && (
                    <View style={styles.confidenceContainer}>
                        <View style={styles.confidenceBar}>
                            <View
                                style={[
                                    styles.confidenceFill,
                                    // FIX: Use the actual state integer directly (e.g., 95%)
                                    { width: `${Math.round(confidence)}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.resultConfidence}>
                            {/* FIX: Displays 95% instead of 9500% */}
                            {Math.round(confidence)}%
                        </Text>
                    </View>
                )}
            </View>

            {/* Cute Popup */}
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

            {/* Results Modal */}
            <Modal
                visible={showResults}
                transparent
                animationType="fade"
                onRequestClose={() => setShowResults(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setShowResults(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={20} color="#0f3172" />
                        </TouchableOpacity>

                        <View style={styles.trophyBadge}>
                            <Ionicons name="trophy" size={32} color="#FFD700" />
                        </View>

                        <Text style={styles.modalTitle}>You Did It!</Text>
                        <Text style={styles.modalSubtitle}>
                            All {GREETINGS_LIST.length} greetings mastered
                        </Text>

                        {/* Stars */}
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
                                                {results.totalCorrect}/{GREETINGS_LIST.length}
                                            </Text>
                                            <Text style={styles.resultGridLabel}>Greetings</Text>
                                        </View>
                                    </View>

                                    {/* Senya's Notes */}
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

                                            if (results.strugglingGreetings.length > 0) {
                                                items.push({
                                                    icon: 'alert-circle-outline',
                                                    color: '#E11D48',
                                                    text: `Need more help with: ${results.strugglingGreetings.join(', ')}`,
                                                });
                                            }

                                            if (results.easyGreetings.length > 0) {
                                                items.push({
                                                    icon: 'checkmark-circle',
                                                    color: '#10B981',
                                                    text: `You nailed: ${results.easyGreetings.join(', ')}`,
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
                            onPress={handleContinue}
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
        fontSize: 13,
        fontWeight: '800',
        color: '#FFD700',
        minWidth: 50,
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
        minHeight: 200,
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
    greetingGridScroll: {
        maxHeight: 88,
        marginHorizontal: 12,
        marginVertical: 6,
    },
    greetingGridContent: {
        paddingHorizontal: 4,
        gap: 6,
        alignItems: 'center',
    },
    greetingSlot: {
        minWidth: 70,
        paddingHorizontal: 12,
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
    greetingCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: '#10B981',
        shadowColor: '#10B981',
        shadowOpacity: 0.2,
    },
    greetingActive: {
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        transform: [{ scale: 1.05 }],
        shadowColor: '#FFD700',
        shadowOpacity: 0.55,
        shadowRadius: 10,
        elevation: 8,
    },
    greetingChar: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(15, 49, 114, 0.35)',
        textAlign: 'center',
    },
    greetingCharCompleted: {
        color: '#10B981',
        fontSize: 11,
    },
    greetingCharActive: {
        color: '#92650A',
        fontSize: 13,
        fontWeight: '800',
    },
    greetingStatusDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(15,49,114,0.15)',
        marginTop: 2,
    },
    resultBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.95)',
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    resultLabel: {
        fontSize: 10,
        color: '#4b7bbb',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    resultGreeting: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f3172',
        minWidth: 50,
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
        fontSize: 14,
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
    testButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(15, 49, 114, 0.1)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});