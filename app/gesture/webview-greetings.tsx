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

// Level 2 Greetings - FSL Greetings
const GREETINGS_LIST = [
    'HELLO',
    'THANK YOU',
    'SEE YOU TOMORROW',
    'HOW ARE YOU',
    'NICE TO MEET YOU'
];

// Display names for the UI
const DISPLAY_NAMES: Record<string, string> = {
    'HELLO': '👋 Hello',
    'THANK YOU': '🙏 Thank You',
    'SEE YOU TOMORROW': '👋 See You Tomorrow',
    'HOW ARE YOU': '💬 How Are You',
    'NICE TO MEET YOU': '🤝 Nice To Meet You'
};

// Senya's encouragement messages
const SENYA_MESSAGES = {
    welcome: "Level 2! Let's learn greetings! 👋",
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
    complete: "LEVEL 2 COMPLETE! All 5 greetings mastered! 🎉",
};

// Gesture struggle tracking
interface GestureAttempt {
    gesture: string;
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
    const [detectedGesture, setDetectedGesture] = useState('✋');
    const [confidence, setConfidence] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [showBrowserButton, setShowBrowserButton] = useState(true);

    // ── Audio state ──
    const [gestureSound, setGestureSound] = useState<Audio.Sound | null>(null);
    const [completeSound, setCompleteSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(false);

    // Gamification state
    const [completedGestures, setCompletedGestures] = useState<Set<string>>(new Set());
    const [currentTarget, setCurrentTarget] = useState('HELLO');
    const [senyaMessage, setSenyaMessage] = useState(SENYA_MESSAGES.welcome);
    const [consecutiveWrong, setConsecutiveWrong] = useState(0);
    const [isModuleComplete, setIsModuleComplete] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [starRating, setStarRating] = useState(0);

    // Gesture tracking for results
    const [gestureAttempts, setGestureAttempts] = useState<Record<string, GestureAttempt>>({});
    const [totalWrongAttempts, setTotalWrongAttempts] = useState(0);
    const [totalCorrectAttempts, setTotalCorrectAttempts] = useState(0);
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [endTime, setEndTime] = useState<number | null>(null);

    // Popup animation
    const popupAnim = useState(new Animated.Value(0))[0];
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupSubMessage, setPopupSubMessage] = useState('');

    // Track the last detected gesture
    const [lastProcessedGesture, setLastProcessedGesture] = useState<string>('');
    const [gestureStableCount, setGestureStableCount] = useState(0);

    // Senya message cooldown
    const senyaMsgCooldownRef = useRef<number>(0);
    const SENYA_COOLDOWN_MS = 3000;

    // Star animations for results modal
    const starAnim1 = useRef(new Animated.Value(0)).current;
    const starAnim2 = useRef(new Animated.Value(0)).current;
    const starAnim3 = useRef(new Animated.Value(0)).current;

    const [modelLoading, setModelLoading] = useState(true);

    // ── Module Name ──────────────────────────────────────────────────────────
    const MODULE_NAME = 'level2_greetings';

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

    // Get current target
    const getCurrentTarget = () => {
        for (const gesture of GREETINGS_LIST) {
            if (!completedGestures.has(gesture)) return gesture;
        }
        return null;
    };

    // Initialize gesture tracking
    useEffect(() => {
        const initial: Record<string, GestureAttempt> = {};
        GREETINGS_LIST.forEach(gesture => {
            initial[gesture] = {
                gesture,
                attempts: 0,
                wrongAttempts: 0,
                successCount: 0,
            };
        });
        setGestureAttempts(initial);
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
                const slotWidth = 100;
                const scrollX = targetIndex * slotWidth - (width - 100) / 2;
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({
                        x: Math.max(0, scrollX),
                        animated: true,
                    });
                }, 100);
            }
        } else if (completedGestures.size === GREETINGS_LIST.length) {
            setIsModuleComplete(true);
            setSenyaMessage(SENYA_MESSAGES.complete);
            const endNow = Date.now();
            setEndTime(endNow);
            const elapsed = Math.round((endNow - startTime) / 1000);
            setStarRating(elapsed < 45 ? 3 : elapsed < 90 ? 2 : 1);

            playCompleteSound();

            setTimeout(() => {
                setShowResults(true);
            }, 1500);
        }
    }, [completedGestures]);

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

    const savedGesturesRef = useRef<Set<string>>(new Set());
    const lastAttemptGestureRef = useRef<string>('');
    const lastAttemptTimeRef = useRef<number>(0);
    const MIN_ATTEMPT_INTERVAL = 1000;

    // ─── SAVE PERFORMANCE ──────────────────────────────────────────────────────
    const saveSingleGesturePerformance = async (gesture: string) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                console.log('ℹ️ No auth token found, skipping save');
                return null;
            }

            const data = gestureAttempts[gesture] || {
                gesture,
                attempts: 0,
                wrongAttempts: 0,
                successCount: 0
            };

            if (data.attempts === 0) {
                return null;
            }

            const gesturePerformance = [{
                letter: gesture,
                attempts: data.attempts || 0,
                wrong_attempts: data.wrongAttempts || 0,
                success_count: data.successCount || 0,
                consecutive_wrong: 0,
            }];

            console.log(`📤 Saving performance for ${gesture}...`);

            const result = await api.saveGesturePerformance(
                MODULE_NAME,
                gesturePerformance,
                `session_${Date.now()}`
            );

            if (result && result.success) {
                console.log(`✅ ${gesture} saved!`);
                return result;
            } else {
                console.error(`❌ Failed to save ${gesture}:`, result);
                return null;
            }
        } catch (error) {
            console.error(`❌ Error saving ${gesture}:`, error);
            return null;
        }
    };

    const saveAllPerformance = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                console.log('ℹ️ No auth token found, skipping save');
                return null;
            }

            const gesturePerformances = GREETINGS_LIST.map(gesture => {
                const data = gestureAttempts[gesture] || {
                    gesture,
                    attempts: 0,
                    wrongAttempts: 0,
                    successCount: 0
                };
                return {
                    letter: gesture,
                    attempts: data.attempts || 0,
                    wrong_attempts: data.wrongAttempts || 0,
                    success_count: data.successCount || 0,
                    consecutive_wrong: 0,
                };
            });

            const totalAttempts = gesturePerformances.reduce((sum, g) => sum + g.attempts, 0);
            if (totalAttempts === 0) {
                console.log('ℹ️ No attempts recorded, skipping save');
                return null;
            }

            console.log(`📤 Saving performance for ${MODULE_NAME}...`);

            const result = await api.saveGesturePerformance(
                MODULE_NAME,
                gesturePerformances,
                `session_${Date.now()}`
            );

            if (result && result.success) {
                console.log('✅ Performance saved!');
                return result;
            } else {
                console.error('❌ Failed to save performance:', result);
                return null;
            }
        } catch (error) {
            console.error('❌ Error saving performance:', error);
            return null;
        }
    };

    // ─── HANDLE DETECTION ────────────────────────────────────────────────
    const handleDetection = async (data: any) => {
        const { greeting, confidence: conf } = data;

        // For greetings, the WebView sends the greeting directly
        const gesture = greeting;

        if (gesture && gesture !== '✋' && gesture !== '...' && GREETINGS_LIST.includes(gesture)) {
            setDetectedGesture(gesture);
            setConfidence(conf || 0);
            setIsConnected(true);
            setShowBrowserButton(false);

            // Check if this is a stable detection
            if (gesture === lastProcessedGesture) {
                setGestureStableCount(prev => prev + 1);
            } else {
                setLastProcessedGesture(gesture);
                setGestureStableCount(0);
                return;
            }

            // Only process after 3 stable detections
            if (gestureStableCount < 2) {
                return;
            }

            const now = Date.now();
            const isNewGesture = gesture !== lastAttemptGestureRef.current;
            const isTimeForNewAttempt = now - lastAttemptTimeRef.current >= MIN_ATTEMPT_INTERVAL;

            if (isNewGesture || isTimeForNewAttempt) {
                lastAttemptGestureRef.current = gesture;
                lastAttemptTimeRef.current = now;

                setGestureAttempts(prev => {
                    const current = prev[gesture] || { gesture, attempts: 0, wrongAttempts: 0, successCount: 0 };
                    return {
                        ...prev,
                        [gesture]: {
                            ...current,
                            attempts: current.attempts + 1,
                            lastAttempt: Date.now(),
                        }
                    };
                });
            }

            // Gamification logic
            const target = getCurrentTarget();

            if (gesture === target) {
                // CORRECT!
                if (!completedGestures.has(gesture)) {
                    await playGestureSound();

                    const newCompleted = new Set(completedGestures);
                    newCompleted.add(gesture);
                    setCompletedGestures(newCompleted);
                    setConsecutiveWrong(0);
                    setTotalCorrectAttempts(prev => prev + 1);

                    setGestureAttempts(prev => {
                        const current = prev[gesture] || { gesture, attempts: 0, wrongAttempts: 0, successCount: 0 };
                        return {
                            ...prev,
                            [gesture]: {
                                ...current,
                                successCount: current.successCount + 1,
                                firstSuccess: current.firstSuccess || Date.now(),
                            }
                        };
                    });

                    if (!savedGesturesRef.current.has(gesture)) {
                        savedGesturesRef.current.add(gesture);
                        await saveSingleGesturePerformance(gesture);
                    }

                    const msg = getRandomMessage(SENYA_MESSAGES.correct);
                    setSenyaMessage(msg);
                    senyaMsgCooldownRef.current = Date.now();

                    const displayName = DISPLAY_NAMES[gesture] || gesture;
                    showCutePopup(
                        `✓ ${displayName}`,
                        `${completedGestures.size + 1}/${GREETINGS_LIST.length}`
                    );
                }
            } else if (completedGestures.has(gesture)) {
                // Already completed
                const now = Date.now();
                if (now - senyaMsgCooldownRef.current >= SENYA_COOLDOWN_MS) {
                    senyaMsgCooldownRef.current = now;
                    if (target) {
                        const targetDisplay = DISPLAY_NAMES[target] || target;
                        setSenyaMessage(`You got ${DISPLAY_NAMES[gesture] || gesture}! Try ${targetDisplay}`);
                    } else {
                        setSenyaMessage(SENYA_MESSAGES.complete);
                    }
                }
                setConsecutiveWrong(0);
            } else {
                // Wrong gesture
                if (gestureStableCount >= 2 && (isNewGesture || isTimeForNewAttempt)) {
                    const newWrong = consecutiveWrong + 1;
                    setConsecutiveWrong(newWrong);
                    setTotalWrongAttempts(prev => prev + 1);

                    if (target) {
                        setGestureAttempts(prev => {
                            const current = prev[target] || { gesture: target, attempts: 0, wrongAttempts: 0, successCount: 0 };
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
                            if (target) {
                                const targetDisplay = DISPLAY_NAMES[target] || target;
                                showCutePopup(
                                    `💡 ${targetDisplay}`,
                                    'Keep your hands steady'
                                );
                            } else {
                                showCutePopup('💡 Keep trying!', 'You got this!');
                            }
                        } else if (newWrong >= 2) {
                            if (target) {
                                const targetDisplay = DISPLAY_NAMES[target] || target;
                                setSenyaMessage(`Try making ${targetDisplay} shape!`);
                            } else {
                                setSenyaMessage(`Try making the shape clearer!`);
                            }
                        }
                    }
                }
            }
        } else {
            // No gesture detected
            setDetectedGesture('✋');
            setConfidence(0);
            setLastProcessedGesture('');
            setGestureStableCount(0);

            const now = Date.now();
            if (!isModuleComplete && completedGestures.size < GREETINGS_LIST.length && now - senyaMsgCooldownRef.current >= 5000) {
                senyaMsgCooldownRef.current = now;
                const target = getCurrentTarget();
                if (target) {
                    const targetDisplay = DISPLAY_NAMES[target] || target;
                    setSenyaMessage(`Show me ${targetDisplay}!`);
                }
            }
        }
    };

    // ─── XP AWARD ──────────────────────────────────────────────────────────────
    const awardModuleXp = async (starRating: number) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                console.log('ℹ️ No auth token found, skipping XP award');
                return null;
            }

            console.log(`⭐ Awarding XP for ${starRating} star${starRating > 1 ? 's' : ''}...`);

            const result = await api.awardModuleXp(MODULE_NAME, starRating);

            if (result && result.success) {
                console.log(`✅ ${result.xp_message}`);
                return result;
            }
            return null;
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
                    console.log('📊 All Level 2 performance data saved');
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

    // ─── RESULTS ──────────────────────────────────────────────────────────
    const getResults = () => {
        const timeToUse = endTime || Date.now();
        const totalSecs = Math.round((timeToUse - startTime) / 1000);
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;
        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        const strugglingGestures = Object.values(gestureAttempts)
            .filter(g => g.wrongAttempts >= 2)
            .sort((a, b) => b.wrongAttempts - a.wrongAttempts)
            .map(g => g.gesture)
            .slice(0, 3);

        const easyGestures = Object.values(gestureAttempts)
            .filter(g => g.successCount > 0 && g.wrongAttempts === 0)
            .map(g => g.gesture);

        const completedCount = completedGestures.size;

        return {
            totalTime: timeDisplay,
            strugglingGestures,
            easyGestures,
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
        const unsavedGestures = GREETINGS_LIST.filter(
            gesture => completedGestures.has(gesture) && !savedGesturesRef.current.has(gesture)
        );

        for (const gesture of unsavedGestures) {
            await saveSingleGesturePerformance(gesture);
        }

        await saveAllPerformance();

        setShowResults(false);

        if (xpResult && xpResult.xp_earned > 0) {
            const level = xpResult.level || 2;
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

    // ─── WEBVIEW CONFIG ────────────────────────────────────────────────────
    const GREETINGS_URL = 'https://swipe-drinking-coral.ngrok-free.dev/gesture_greetings.html';

    const injectedJavaScript = `
    (function() {
        const hideUI = function() {
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
            
            console.log('🎨 WebView UI hidden - only camera feed visible');
        };
        
        hideUI();
        
        const checkModelStatus = setInterval(function() {
            const statusText = document.getElementById('status-text');
            const modelReady = document.getElementById('status-text')?.textContent === 'Model Ready';
            
            if (modelReady) {
                clearInterval(checkModelStatus);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'model_ready',
                        status: 'loaded'
                    }));
                }
            }
        }, 1000);
        
        setTimeout(function() {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'library_check',
                    tf: typeof tf !== 'undefined',
                    mediapipe: typeof Hands !== 'undefined'
                }));
            }
        }, 2000);
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

            if (data.type === 'model_status') {
                if (data.status === 'loaded') {
                    setModelLoading(false);
                    setLoading(false);
                    setIsConnected(true);
                }
                return;
            }

            if (data.type === 'model_error') {
                console.error('❌ Model error:', data.error);
                setModelLoading(false);
                setLoading(false);
                setSenyaMessage(`Error: ${data.error}`);
                return;
            }

            if (data.type === 'model_ready' || data.status === 'all_loaded') {
                setIsConnected(true);
                setLoading(false);
                setModelLoading(false);
                return;
            }

            if (data.type === 'mediapipe_ready') {
                return;
            }

            if (data.test) {
                setIsConnected(true);
                setLoading(false);
                setModelLoading(false);
                return;
            }

            const detectedValue = data.greeting || data.letter || '';
            const confidenceValue = data.confidence || 0;

            if (data.isMatch && detectedValue && detectedValue !== '' && detectedValue !== '✋' && detectedValue !== '...') {
                console.log(`🎯 Learned: ${detectedValue}`);
            }

            if (!detectedValue || detectedValue === '' || detectedValue === '✋' || detectedValue === '...') {
                setGestureStableCount(0);
                return;
            }

            if (GREETINGS_LIST.includes(detectedValue)) {
                setDetectedGesture(detectedValue);
                setConfidence(confidenceValue);
                setIsConnected(true);
                setShowBrowserButton(false);
                handleDetection(data);
            } else {
                setDetectedGesture(detectedValue);
                setConfidence(confidenceValue);
            }

        } catch (error) {
            console.error('❌ Message error:', error);
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

                <Text style={styles.headerTitle}>Greetings</Text>

                <View style={styles.headerRight}>
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
                    Progress: {completedGestures.size}/{GREETINGS_LIST.length}
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(completedGestures.size / GREETINGS_LIST.length) * 100}%` }
                        ]}
                    />
                </View>
                <Text style={styles.targetText}>
                    🎯 {DISPLAY_NAMES[currentTarget] || currentTarget}
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
                    }}
                    onLoadEnd={() => { }}
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
                        <ActivityIndicator size="large" color="#F59E0B" />
                        <Text style={styles.loadingOverlayText}>Loading Greetings...</Text>
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
                style={styles.gestureGridScroll}
                contentContainerStyle={styles.gestureGridContent}
                scrollEventThrottle={16}
            >
                {GREETINGS_LIST.map((gesture) => {
                    const isCompleted = completedGestures.has(gesture);
                    const isActive = gesture === currentTarget && !isCompleted;
                    const displayName = DISPLAY_NAMES[gesture] || gesture;

                    return (
                        <View
                            key={gesture}
                            style={[
                                styles.gestureSlot,
                                isCompleted && styles.gestureCompleted,
                                isActive && styles.gestureActive,
                            ]}
                        >
                            <Text style={[
                                styles.gestureChar,
                                isCompleted && styles.gestureCharCompleted,
                                isActive && styles.gestureCharActive,
                            ]}>
                                {displayName.split(' ').slice(1).join(' ') || displayName}
                            </Text>
                            {isCompleted && (
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" style={styles.gestureIcon} />
                            )}
                            {isActive && (
                                <Ionicons name="star" size={13} color="#F59E0B" style={styles.gestureIcon} />
                            )}
                            {!isCompleted && !isActive && (
                                <View style={styles.gestureStatusDot} />
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Bottom Detection Bar */}
            <View style={styles.resultBar}>
                <Text style={styles.resultLabel}>Detected:</Text>
                <Text style={styles.resultGesture}>
                    {DISPLAY_NAMES[detectedGesture] || detectedGesture}
                </Text>

                {confidence > 0 && (
                    <View style={styles.confidenceContainer}>
                        <View style={styles.confidenceBar}>
                            <View
                                style={[
                                    styles.confidenceFill,
                                    { width: `${confidence > 1 ? Math.round(confidence) : Math.round(confidence * 100)}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.resultConfidence}>
                            {confidence > 1 ? Math.round(confidence) : Math.round(confidence * 100)}%
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
                            <Ionicons name="trophy" size={32} color="#F59E0B" />
                        </View>

                        <Text style={styles.modalTitle}>Greetings Complete!</Text>
                        <Text style={styles.modalSubtitle}>
                            All {GREETINGS_LIST.length} greetings mastered!
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
                                            color={isEarned ? '#F59E0B' : '#D9E2EC'}
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
                                                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#0f3172" />
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
                                                items.push({ icon: 'sparkles', color: '#F59E0B', text: "You're absolutely incredible at this!" });
                                            } else if (starRating === 2) {
                                                items.push({ icon: 'flame', color: '#FF7A45', text: 'Great work! A bit more speed for 3 stars.' });
                                            } else {
                                                items.push({ icon: 'refresh', color: '#4b7bbb', text: 'Keep practicing! Your hands will get faster.' });
                                            }

                                            if (results.strugglingGestures.length > 0) {
                                                items.push({
                                                    icon: 'alert-circle-outline',
                                                    color: '#E11D48',
                                                    text: `Need more help with: ${results.strugglingGestures.map(g => DISPLAY_NAMES[g] || g).join(', ')}`,
                                                });
                                            }

                                            if (results.easyGestures.length > 0) {
                                                items.push({
                                                    icon: 'checkmark-circle',
                                                    color: '#10B981',
                                                    text: `You nailed: ${results.easyGestures.map(g => DISPLAY_NAMES[g] || g).join(', ')}`,
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
        backgroundColor: '#F59E0B',
        borderRadius: 2,
    },
    targetText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#F59E0B',
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
    gestureGridScroll: {
        maxHeight: 88,
        marginHorizontal: 12,
        marginVertical: 6,
    },
    gestureGridContent: {
        paddingHorizontal: 4,
        gap: 6,
        alignItems: 'center',
    },
    gestureSlot: {
        minWidth: 48,
        paddingHorizontal: 6,
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
    gestureCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: '#10B981',
        shadowColor: '#10B981',
        shadowOpacity: 0.2,
    },
    gestureActive: {
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        transform: [{ scale: 1.1 }],
        shadowColor: '#F59E0B',
        shadowOpacity: 0.55,
        shadowRadius: 10,
        elevation: 8,
    },
    gestureChar: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(15, 49, 114, 0.5)',
        textAlign: 'center',
    },
    gestureCharCompleted: {
        color: '#10B981',
        fontSize: 10,
    },
    gestureCharActive: {
        color: '#B45309',
        fontSize: 12,
    },
    gestureIcon: {
        marginTop: 2,
    },
    gestureStatusDot: {
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
    resultGesture: {
        fontSize: 16,
        fontWeight: '800',
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
        backgroundColor: '#F59E0B',
        borderRadius: 2,
    },
    resultConfidence: {
        fontSize: 11,
        color: '#F59E0B',
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
        borderColor: '#F59E0B',
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
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(245, 158, 11, 0.4)',
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
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
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