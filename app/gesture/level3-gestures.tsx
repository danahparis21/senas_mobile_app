// app/gesture/level3-gestures.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import * as WebBrowser from 'expo-web-browser';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { usePracticeTimeTracker } from '../../hooks/usePracticeTimeTracker';
import { useSettings } from '../../contexts/SettingsContext';
// Import the WebViewMedia component for displaying signs
import { WebViewMedia } from '../../components/WebViewMedia';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

// ─── SOUND EFFECTS ──────────────────────────────────────────────────────────
const CORRECT_GESTURE_SOUND = require('../../assets/music/correct-gesture.mp3');
const GESTURE_COMPLETE_SOUND = require('../../assets/music/gesture-complete.mp3');

// ─── SIGN LANGUAGE MEDIA MAPPING FOR NUMBERS ──────────────────────────────
// Numbers 1-10: files 27_One.mp4 through 36_Ten.mp4
// All numbers use video since they show motion in ASL
const SIGN_MEDIA: Record<string, { url: string; isVideo: boolean }> = {
    '1': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Numbers/27_One.mp4', isVideo: true },
    '2': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Numbers/28_Two.mp4', isVideo: true },
    '3': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Numbers/29_Three.mp4', isVideo: true },
    '4': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Numbers/30_Four.mp4', isVideo: true },
    '5': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Numbers/31_Five.mp4', isVideo: true },
    '6': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Numbers/32_Six.mp4', isVideo: true },
    '7': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Numbers/33_Seven.mp4', isVideo: true },
    '8': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Numbers/34_Eight.mp4', isVideo: true },
    '9': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Numbers/35_Nine.mp4', isVideo: true },
    '10': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Numbers/36_Ten.mp4', isVideo: true },
};

const GESTURE_TO_DB_MAP: Record<string, string> = {
    'ONE': '1',
    'TWO': '2',
    'THREE': '3',
    'FOUR': '4',
    'FIVE': '5',
    'SIX': '6',
    'SEVEN': '7',
    'EIGHT': '8',
    'NINE': '9',
    'TEN': '10'
};

// Database gesture names (what's stored in the database)
const LEVEL3_GESTURES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// Display mapping for UI (show digits)
const DIGIT_DISPLAY: Record<string, string> = {
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10'
};

// Senya's encouragement messages
const SENYA_MESSAGES = {
    welcome: "Let's learn numbers 1-10! 🔢",
    correct: [
        "Amazing! You're a number expert!",
        "Perfect! Keep counting!",
        "Great job! You're on fire!",
        "Wonderful! You're crushing it!",
        "Fantastic! Next number!",
    ],
    struggle: [
        "Try keeping your hand steady...",
        "Make the shape clearer!",
        "You got this! Try again!",
        "Almost there! One more try!",
    ],
    complete: "YOU DID IT! ALL 10 NUMBERS! 🎉",
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

export default function Level3GesturesScreen() {
    const router = useRouter();
    usePracticeTimeTracker();

    const { settings, refreshSettings } = useSettings();

    const webViewRef = useRef<WebView>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(true);
    const [detectedGesture, setDetectedGesture] = useState('✋');
    const [detectedDigit, setDetectedDigit] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [showBrowserButton, setShowBrowserButton] = useState(true);

    // ─── HINTS MODAL STATE ──────────────────────────────────────────────────
    const [showHintsModal, setShowHintsModal] = useState(false);
    const [hintsCurrentIndex, setHintsCurrentIndex] = useState(0);

    const [isStruggling, setIsStruggling] = useState(false);
    const [hintPulseAnim] = useState(new Animated.Value(1));
    const [hintShakeAnim] = useState(new Animated.Value(0));

    // Hint button animations
    const animateHintButton = () => {
        Animated.sequence([
            Animated.timing(hintPulseAnim, {
                toValue: 1.2,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(hintPulseAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        Animated.sequence([
            Animated.timing(hintShakeAnim, {
                toValue: -5,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(hintShakeAnim, {
                toValue: 5,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(hintShakeAnim, {
                toValue: -5,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(hintShakeAnim, {
                toValue: 0,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    // Show struggle message and animate hint button
    const showStruggleHint = () => {
        setIsStruggling(true);
        animateHintButton();

        setTimeout(() => {
            setIsStruggling(false);
        }, 5000);
    };

    useFocusEffect(
        useCallback(() => {
            console.log('🔄 Level 3 (Numbers) screen focused, refreshing settings...');
            refreshSettings();
        }, [refreshSettings])
    );

    // ── Audio state ──
    const [gestureSound, setGestureSound] = useState<Audio.Sound | null>(null);
    const [completeSound, setCompleteSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(false);

    // Gamification state
    const [completedGestures, setCompletedGestures] = useState<Set<string>>(new Set());
    const [currentTarget, setCurrentTarget] = useState(LEVEL3_GESTURES[0] || '1');
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

    const [showStartupAnimation, setShowStartupAnimation] = useState(true);
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);

    // Senya message cooldown
    const senyaMsgCooldownRef = useRef<number>(0);
    const SENYA_COOLDOWN_MS = 3000;

    const lastHintShownRef = useRef<number>(0);
    const HINT_COOLDOWN_MS = 5000;

    // Time-based fallback
    const lastProgressTimeRef = useRef<number>(Date.now());
    const STUCK_TIMEOUT_MS = 10000;

    // Star animations for results modal
    const starAnim1 = useRef(new Animated.Value(0)).current;
    const starAnim2 = useRef(new Animated.Value(0)).current;
    const starAnim3 = useRef(new Animated.Value(0)).current;

    const [modelLoading, setModelLoading] = useState(true);
    const [modelLoadAttempts, setModelLoadAttempts] = useState(0);

    // Refs for synchronous tracking
    const lastProcessedGestureRef = useRef<string>('');
    const gestureStableCountRef = useRef<number>(0);
    const wrongStreakRef = useRef<number>(0);

    // ─── PLAY GESTURE SOUND ──────────────────────────────────────────────────
    async function playGestureSound() {
        if (!settings.soundEnabled) {
            console.log('🔇 Sound disabled, skipping gesture sound');
            return;
        }

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

    // ─── PLAY COMPLETE SOUND ──────────────────────────────────────────────────
    async function playCompleteSound() {
        if (!settings.soundEnabled) {
            console.log('🔇 Sound disabled, skipping complete sound');
            return;
        }

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

    // ─── HINTS NAVIGATION ──────────────────────────────────────────────────
    const getCurrentGestureForHints = () => {
        return currentTarget || '1';
    };

    const openHintsModal = () => {
        const currentGesture = getCurrentGestureForHints();
        const index = LEVEL3_GESTURES.indexOf(currentGesture);
        setHintsCurrentIndex(index >= 0 ? index : 0);
        setShowHintsModal(true);
        setIsStruggling(false);
    };

    const goToPreviousHint = () => {
        setHintsCurrentIndex(prev =>
            prev > 0 ? prev - 1 : LEVEL3_GESTURES.length - 1
        );
    };

    const goToNextHint = () => {
        setHintsCurrentIndex(prev =>
            prev < LEVEL3_GESTURES.length - 1 ? prev + 1 : 0
        );
    };

    const currentHintGesture = LEVEL3_GESTURES[hintsCurrentIndex];
    const currentHintMedia = SIGN_MEDIA[currentHintGesture];
    const currentDisplayDigit = DIGIT_DISPLAY[currentHintGesture] || currentHintGesture;

    // Get current target
    const getCurrentTarget = () => {
        for (const gesture of LEVEL3_GESTURES) {
            if (!completedGestures.has(gesture)) return gesture;
        }
        return null;
    };

    // Force the loading overlay to show 
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowLoadingOverlay(false);
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    // Initialize gesture tracking
    useEffect(() => {
        const initial: Record<string, GestureAttempt> = {};
        LEVEL3_GESTURES.forEach(gesture => {
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
            const targetIndex = LEVEL3_GESTURES.indexOf(target);
            if (targetIndex >= 0 && scrollViewRef.current) {
                const slotWidth = 70;
                const scrollX = targetIndex * slotWidth - (width - 100) / 2;
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({
                        x: Math.max(0, scrollX),
                        animated: true,
                    });
                }, 100);
            }
        } else if (completedGestures.size === LEVEL3_GESTURES.length) {
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

    const detectionCooldownRef = useRef<number>(0);
    const DETECTION_COOLDOWN_MS = 1500;

    const soundCooldownRef = useRef<number>(0);
    const SOUND_COOLDOWN_MS = 800;

    // ─── SAVE PERFORMANCE ──────────────────────────────────────────────────────
    const MODULE_NAME = 'level1_numbers';

    const saveAllPerformance = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                console.log('ℹ️ No auth token found, skipping save');
                return null;
            }

            const gesturePerformances = LEVEL3_GESTURES.map(gesture => {
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
            if (totalAttempts === 0) return null;

            console.log(`📤 Saving performance for ${MODULE_NAME}...`);

            const result = await api.saveGesturePerformance(
                MODULE_NAME,
                gesturePerformances,
                `session_${Date.now()}`
            );

            if (result && result.success) {
                console.log('✅ Performance saved!');
                return result;
            }
            return null;
        } catch (error) {
            console.error('❌ Error saving performance:', error);
            return null;
        }
    };

    const saveSingleGesturePerformance = async (gesture: string) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return null;

            const data = gestureAttempts[gesture] || {
                gesture,
                attempts: 0,
                wrongAttempts: 0,
                successCount: 0
            };

            if (data.attempts === 0) return null;

            const gesturePerformance = [{
                letter: gesture,
                attempts: data.attempts || 0,
                wrong_attempts: data.wrongAttempts || 0,
                success_count: data.successCount || 0,
                consecutive_wrong: 0,
            }];

            const result = await api.saveGesturePerformance(
                MODULE_NAME,
                gesturePerformance,
                `session_${Date.now()}`
            );

            if (result && result.success) {
                console.log(`✅ ${gesture} saved!`);
                return result;
            }
            return null;
        } catch (error) {
            console.error(`❌ Error saving ${gesture}:`, error);
            return null;
        }
    };

    // ─── HANDLE DETECTION ────────────────────────────────────────────────
    const handleDetection = async (data: any) => {
        const { greeting, confidence: conf, handCount, digit } = data;

        // Map WebView greeting to database name
        const dbGestureName = GESTURE_TO_DB_MAP[greeting] || greeting;

        if (dbGestureName && dbGestureName !== '✋' && dbGestureName !== '...' && LEVEL3_GESTURES.includes(dbGestureName)) {
            if (digit && DIGIT_DISPLAY[dbGestureName]) {
                setDetectedDigit(digit);
            } else if (DIGIT_DISPLAY[dbGestureName]) {
                setDetectedDigit(DIGIT_DISPLAY[dbGestureName]);
            }

            setDetectedGesture(dbGestureName);
            setConfidence(conf || 0);
            setIsConnected(true);
            setShowBrowserButton(false);

            // Stability tracking
            if (dbGestureName === lastProcessedGestureRef.current) {
                gestureStableCountRef.current += 1;
            } else {
                lastProcessedGestureRef.current = dbGestureName;
                gestureStableCountRef.current = 1;
            }
            setLastProcessedGesture(lastProcessedGestureRef.current);
            setGestureStableCount(gestureStableCountRef.current);

            // Wrong streak tracking
            const targetForStreak = getCurrentTarget();
            const isWrongGestureFrame =
                LEVEL3_GESTURES.includes(dbGestureName) &&
                dbGestureName !== targetForStreak;
            wrongStreakRef.current = isWrongGestureFrame ? wrongStreakRef.current + 1 : 0;

            if (gestureStableCountRef.current < 2 && wrongStreakRef.current < 2) {
                return;
            }

            const now = Date.now();
            const isNewGesture = dbGestureName !== lastAttemptGestureRef.current;
            const isTimeForNewAttempt = now - lastAttemptTimeRef.current >= MIN_ATTEMPT_INTERVAL;

            if (isNewGesture || isTimeForNewAttempt) {
                lastAttemptGestureRef.current = dbGestureName;
                lastAttemptTimeRef.current = now;

                setGestureAttempts(prev => {
                    const current = prev[dbGestureName] || { gesture: dbGestureName, attempts: 0, wrongAttempts: 0, successCount: 0 };
                    return {
                        ...prev,
                        [dbGestureName]: {
                            ...current,
                            attempts: current.attempts + 1,
                            lastAttempt: Date.now(),
                        }
                    };
                });
            }

            const target = getCurrentTarget();

            if (dbGestureName === target) {
                // CORRECT!
                const now = Date.now();
                const isCooldownOver = now - detectionCooldownRef.current >= DETECTION_COOLDOWN_MS;

                lastProgressTimeRef.current = now;

                if (!completedGestures.has(dbGestureName) && isCooldownOver) {
                    detectionCooldownRef.current = now;

                    const isSoundReady = now - soundCooldownRef.current >= SOUND_COOLDOWN_MS;
                    if (isSoundReady) {
                        soundCooldownRef.current = now;
                        await playGestureSound();
                    }

                    const newCompleted = new Set(completedGestures);
                    newCompleted.add(dbGestureName);
                    setCompletedGestures(newCompleted);
                    setConsecutiveWrong(0);
                    setTotalCorrectAttempts(prev => prev + 1);

                    setGestureAttempts(prev => {
                        const current = prev[dbGestureName] || { gesture: dbGestureName, attempts: 0, wrongAttempts: 0, successCount: 0 };
                        return {
                            ...prev,
                            [dbGestureName]: {
                                ...current,
                                successCount: current.successCount + 1,
                                firstSuccess: current.firstSuccess || Date.now(),
                            }
                        };
                    });

                    if (!savedGesturesRef.current.has(dbGestureName)) {
                        savedGesturesRef.current.add(dbGestureName);
                        await saveSingleGesturePerformance(dbGestureName);
                    }

                    const msg = getRandomMessage(SENYA_MESSAGES.correct);
                    setSenyaMessage(msg);
                    senyaMsgCooldownRef.current = Date.now();

                    const displayDigit = DIGIT_DISPLAY[dbGestureName] || dbGestureName;
                    showCutePopup(
                        `${displayDigit} ✓`,
                        `${completedGestures.size + 1}/${LEVEL3_GESTURES.length}`
                    );
                }
            } else {
                // WRONG GESTURE
                const now = Date.now();
                const isNewAttempt = now - detectionCooldownRef.current >= DETECTION_COOLDOWN_MS;
                const isOldGesture = completedGestures.has(dbGestureName);
                const stuckTooLong = now - lastProgressTimeRef.current >= STUCK_TIMEOUT_MS;

                if ((wrongStreakRef.current >= 2 || stuckTooLong) && isNewAttempt) {
                    detectionCooldownRef.current = now;

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

                    const hintCooldownOk = now - lastHintShownRef.current >= HINT_COOLDOWN_MS;

                    // ✅ FIX: Only access DIGIT_DISPLAY[target] if target is not null
                    const targetDigit = target ? (DIGIT_DISPLAY[target] || target) : '';

                    // Baseline reminder - only if target exists
                    if (target && newWrong >= 1) {
                        setSenyaMessage(
                            isOldGesture
                                ? `You got ${dbGestureName} already! We're doing ${targetDigit} now!`
                                : `We're doing number ${targetDigit}!`
                        );
                    }

                    // Escalate to hint suggestion
                    if (target && (newWrong >= 2 || stuckTooLong) && hintCooldownOk) {
                        lastHintShownRef.current = now;
                        setSenyaMessage(`Need help with ${targetDigit}? Click the 💡 hints icon!`);
                        showStruggleHint();
                    }

                    // Stronger nudge
                    if (target && (newWrong >= 4 || stuckTooLong) && hintCooldownOk) {
                        lastHintShownRef.current = now;
                        showCutePopup(
                            `💡 ${targetDigit}`,
                            'Keep your hands steady'
                        );
                        setSenyaMessage(`Click the 💡 hints icon if you need help signing ${targetDigit}!`);
                        showStruggleHint();
                    }
                }
            }
        } else {
            // No gesture detected
            setDetectedGesture('✋');
            setDetectedDigit('');
            setConfidence(0);
            setLastProcessedGesture('');
            setGestureStableCount(0);
            lastProcessedGestureRef.current = '';
            gestureStableCountRef.current = 0;

            const now = Date.now();
            if (!isModuleComplete && completedGestures.size < LEVEL3_GESTURES.length && now - senyaMsgCooldownRef.current >= 3000) {
                senyaMsgCooldownRef.current = now;
                const target = getCurrentTarget();
                if (target) {
                    const hintCooldownOk = now - lastHintShownRef.current >= HINT_COOLDOWN_MS;
                    const targetDigit = DIGIT_DISPLAY[target] || target;

                    setSenyaMessage(`Show me ${targetDigit}!`);

                    if (consecutiveWrong >= 3 && hintCooldownOk) {
                        lastHintShownRef.current = now;
                        setSenyaMessage(`Show me ${targetDigit}! Click 💡 for a hint!`);
                        showStruggleHint();
                    }
                }
            }
        }
    };

    // ─── WEBVIEW CONFIG ────────────────────────────────────────────────────
    const LEVEL3_URL = 'https://swipe-drinking-coral.ngrok-free.dev/gesture_level3.html';

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
            
            console.log('🎨 WebView UI hidden');
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
            const urlWithHeader = LEVEL3_URL + '?ngrok-skip-browser-warning=true';
            await WebBrowser.openBrowserAsync(urlWithHeader);
        } catch (error) {
            Linking.openURL(LEVEL3_URL);
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
                    setShowStartupAnimation(false);
                }
                return;
            }

            if (data.type === 'model_ready' || data.status === 'all_loaded') {
                setIsConnected(true);
                setModelLoading(false);
                setShowStartupAnimation(false);
                return;
            }

            if (data.type === 'mediapipe_ready') {
                setShowStartupAnimation(false);
                return;
            }

            if (data.test) {
                setIsConnected(true);
                setLoading(false);
                setModelLoading(false);
                setShowStartupAnimation(false);
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

            const dbGestureName = GESTURE_TO_DB_MAP[detectedValue] || detectedValue;

            if (LEVEL3_GESTURES.includes(dbGestureName)) {
                setDetectedGesture(dbGestureName);
                setConfidence(confidenceValue);
                setIsConnected(true);
                setShowBrowserButton(false);
                setShowStartupAnimation(false);
                handleDetection({ ...data, greeting: dbGestureName });
            } else {
                setDetectedGesture(detectedValue);
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

        const strugglingGestures = Object.values(gestureAttempts)
            .filter(g => g.wrongAttempts >= 2)
            .sort((a, b) => b.wrongAttempts - a.wrongAttempts)
            .map(g => g.gesture)
            .slice(0, 3);

        const easyGestures = Object.values(gestureAttempts)
            .filter(g => g.successCount > 0 && g.wrongAttempts === 0)
            .map(g => g.gesture);

        return {
            totalTime: timeDisplay,
            strugglingGestures,
            easyGestures,
            totalCorrect: completedGestures.size,
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

    const awardModuleXp = async (starRating: number) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return null;

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
                    console.log('📊 All Level 3 performance data saved');
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

    const handleContinue = async () => {
        const unsavedGestures = LEVEL3_GESTURES.filter(
            gesture => completedGestures.has(gesture) && !savedGesturesRef.current.has(gesture)
        );

        for (const gesture of unsavedGestures) {
            await saveSingleGesturePerformance(gesture);
        }

        await saveAllPerformance();

        setShowResults(false);

        if (xpResult && xpResult.xp_earned > 0) {
            const level = xpResult.level || 3;
            const totalXp = xpResult.total_xp || 0;
            const xpEarned = xpResult.xp_earned || 0;
            const previousXp = totalXp - xpEarned;
            const levelName = getLevelName(level);
            const nextLevelXp = getNextLevelXp(level);

            let streakDays = 0;
            try {
                const streakData = await api.getStreak();
                streakDays = streakData.streak_days || 0;
            } catch (error) {
                console.error('Error fetching streak:', error);
                streakDays = 0;
            }

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
                    streakDays: String(streakDays),
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
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0f3172" />
                </Pressable>
                <Text style={styles.headerTitle}>Numbers 1-10</Text>
                <View style={styles.headerRight}>
                    {/* ─── HINTS BUTTON WITH ANIMATIONS ────────────────────────────────── */}
                    <Animated.View
                        style={{
                            transform: [
                                { scale: hintPulseAnim },
                                { translateX: hintShakeAnim },
                            ],
                        }}
                    >
                        <Pressable
                            onPress={openHintsModal}
                            style={[
                                styles.hintsBtn,
                                isStruggling && styles.hintsBtnGlow,
                            ]}
                        >
                            <Ionicons
                                name="bulb-outline"
                                size={22}
                                color={isStruggling ? '#FFD700' : '#0f3172'}
                            />
                            {isStruggling && (
                                <View style={styles.hintsBadge}>
                                    <Text style={styles.hintsBadgeText}>!</Text>
                                </View>
                            )}
                        </Pressable>
                    </Animated.View>

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
                    Progress: {completedGestures.size}/{LEVEL3_GESTURES.length}
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(completedGestures.size / LEVEL3_GESTURES.length) * 100}%` }
                        ]}
                    />
                </View>
                <Text style={styles.targetText}>
                    🎯 {DIGIT_DISPLAY[currentTarget] || currentTarget}
                </Text>
            </View>

            {/* WebView Container */}
            <View style={styles.webviewContainer}>
                <WebView
                    ref={webViewRef}
                    source={{
                        uri: LEVEL3_URL,
                        headers: {
                            'ngrok-skip-browser-warning': 'true',
                        }
                    }}
                    style={styles.webview}
                    onLoadStart={() => {
                        setLoading(true);
                        setModelLoading(true);
                        setShowStartupAnimation(true);
                    }}
                    onLoadProgress={({ nativeEvent }) => {
                        if (nativeEvent.progress >= 0.9 && modelLoading) {
                            // Still waiting for models to initialize
                        }
                    }}
                    onLoadEnd={() => {
                        setIsConnected(true);
                    }}
                    onError={(error) => {
                        console.error('❌ WebView error:', error);
                        setLoading(false);
                        setShowStartupAnimation(false);
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
                {showLoadingOverlay && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#8B5CF6" />
                        <Text style={styles.loadingOverlayText}>Loading Numbers 1-10...</Text>
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

            {/* Number Grid - Horizontal Scroll */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.gestureGridScroll}
                contentContainerStyle={styles.gestureGridContent}
                scrollEventThrottle={16}
            >
                {LEVEL3_GESTURES.map((gesture) => {
                    const isCompleted = completedGestures.has(gesture);
                    const isActive = gesture === currentTarget && !isCompleted;
                    const digit = DIGIT_DISPLAY[gesture] || gesture;

                    return (
                        <TouchableOpacity
                            key={gesture}
                            style={[
                                styles.gestureSlot,
                                isCompleted && styles.gestureCompleted,
                                isActive && styles.gestureActive,
                            ]}
                            onPress={() => {
                                const index = LEVEL3_GESTURES.indexOf(gesture);
                                setHintsCurrentIndex(index);
                                setShowHintsModal(true);
                            }}
                        >
                            <Text style={[
                                styles.gestureChar,
                                isCompleted && styles.gestureCharCompleted,
                                isActive && styles.gestureCharActive,
                            ]}>
                                {digit}
                            </Text>
                            {isCompleted && (
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            )}
                            {isActive && (
                                <Ionicons name="star" size={13} color="#8B5CF6" />
                            )}
                            {!isCompleted && !isActive && (
                                <View style={styles.gestureStatusDot} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Bottom Detection Bar */}
            <View style={styles.resultBar}>
                <Text style={styles.resultLabel}>Detected:</Text>
                <Text style={styles.resultGesture}>
                    {detectedDigit || detectedGesture}
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

            {/* ─── HINTS MODAL ─────────────────────────────────────────── */}
            <Modal
                visible={showHintsModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowHintsModal(false)}
            >
                <View style={styles.hintsModalOverlay}>
                    <View style={styles.hintsModalCard}>
                        {/* Header */}
                        <View style={styles.hintsModalHeader}>
                            <Text style={styles.hintsModalTitle}>
                                Numbers 1–10
                            </Text>
                            <TouchableOpacity
                                style={styles.hintsModalClose}
                                onPress={() => setShowHintsModal(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={24} color="#0f3172" />
                            </TouchableOpacity>
                        </View>

                        {/* Number indicator */}
                        <View style={styles.hintsLetterIndicator}>
                            <Text style={styles.hintsLetterText}>
                                Number {currentDisplayDigit}
                            </Text>
                            <Text style={styles.hintsCountText}>
                                {hintsCurrentIndex + 1} / {LEVEL3_GESTURES.length}
                            </Text>
                        </View>

                        {/* Media display area - with cover fit for larger images */}
                        <View style={styles.hintsMediaContainer}>
                            {currentHintMedia ? (
                                <WebViewMedia
                                    url={currentHintMedia.url}
                                    isVideo={currentHintMedia.isVideo}
                                    mediaType="quiz"
                                    hideControls={true}
                                    autoplay={true}
                                    objectFit="cover"
                                    objectPosition="75% center" // ✅ Move more to the right - adjust this value
                                />
                            ) : (
                                <View style={styles.hintsNoMedia}>
                                    <Text style={styles.hintsNoMediaText}>
                                        No media available for {currentDisplayDigit}
                                    </Text>
                                </View>
                            )}
                        </View>


                        {/* Navigation arrows */}
                        <View style={styles.hintsNavContainer}>
                            <TouchableOpacity
                                style={styles.hintsNavButton}
                                onPress={goToPreviousHint}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="chevron-back" size={28} color="#0f3172" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.hintsNavButton}
                                onPress={goToNextHint}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="chevron-forward" size={28} color="#0f3172" />
                            </TouchableOpacity>
                        </View>

                        {/* Number progress dots */}
                        <View style={styles.hintsDotsContainer}>
                            {LEVEL3_GESTURES.map((gesture, index) => (
                                <TouchableOpacity
                                    key={gesture}
                                    style={[
                                        styles.hintsDot,
                                        index === hintsCurrentIndex && styles.hintsDotActive,
                                        completedGestures.has(gesture) && styles.hintsDotCompleted,
                                    ]}
                                    onPress={() => setHintsCurrentIndex(index)}
                                />
                            ))}
                        </View>

                        {/* Senya tip */}
                        <View style={styles.hintsTipContainer}>
                            <Image
                                source={require('../../assets/images/img/senya_teaching.png')}
                                style={styles.hintsTipImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.hintsTipText}>
                                Practice making the number {currentDisplayDigit} shape with your hand!
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>

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
                            <Ionicons name="trophy" size={32} color="#8B5CF6" />
                        </View>

                        <Text style={styles.modalTitle}>Numbers Complete!</Text>
                        <Text style={styles.modalSubtitle}>
                            All {LEVEL3_GESTURES.length} numbers mastered!
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
                                            color={isEarned ? '#8B5CF6' : '#D9E2EC'}
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
                                                {results.totalCorrect}/{LEVEL3_GESTURES.length}
                                            </Text>
                                            <Text style={styles.resultGridLabel}>Numbers</Text>
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
                                                items.push({ icon: 'sparkles', color: '#8B5CF6', text: "You're absolutely incredible at this!" });
                                            } else if (starRating === 2) {
                                                items.push({ icon: 'flame', color: '#FF7A45', text: 'Great work! A bit more speed for 3 stars.' });
                                            } else {
                                                items.push({ icon: 'refresh', color: '#4b7bbb', text: 'Keep practicing! Your hands will get faster.' });
                                            }

                                            if (results.strugglingGestures.length > 0) {
                                                const displayStruggling = results.strugglingGestures.map(g => DIGIT_DISPLAY[g] || g);
                                                items.push({
                                                    icon: 'alert-circle-outline',
                                                    color: '#E11D48',
                                                    text: `Need more help with: ${displayStruggling.join(', ')}`,
                                                });
                                            }

                                            if (results.easyGestures.length > 0) {
                                                const displayEasy = results.easyGestures.map(g => DIGIT_DISPLAY[g] || g);
                                                items.push({
                                                    icon: 'checkmark-circle',
                                                    color: '#10B981',
                                                    text: `You nailed: ${displayEasy.join(', ')}`,
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
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
    // ─── HINTS BUTTON STYLES ──────────────────────────────────────────────
    hintsBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    hintsBtnGlow: {
        backgroundColor: 'rgba(255, 215, 0, 0.4)',
        borderColor: '#FFD700',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 8,
    },
    hintsBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FFD700',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    hintsBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#0f3172',
    },
    // ─── HINTS MODAL STYLES ────────────────────────────────────────────────
    hintsModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 22, 40, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    hintsModalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingTop: 20,
        paddingBottom: 24,
        paddingHorizontal: 20,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 16,
    },
    hintsModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 12,
    },
    hintsModalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f3172',
    },
    hintsModalClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hintsLetterIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    hintsLetterText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f3172',
    },
    hintsCountText: {
        fontSize: 13,
        color: '#4b7bbb',
        fontWeight: '600',
    },
    hintsMediaContainer: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        marginBottom: 14,
    },
    hintsNoMedia: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
    },
    hintsNoMediaText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '500',
    },
    hintsNavContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 4,
        marginBottom: 14,
    },
    hintsNavButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    hintsDotsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    hintsDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#e2e8f0',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    hintsDotActive: {
        backgroundColor: '#FFD700',
        borderColor: '#0f3172',
        transform: [{ scale: 1.15 }],
    },
    hintsDotCompleted: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    hintsTipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f7faff',
        borderRadius: 14,
        padding: 12,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.08)',
        gap: 10,
    },
    hintsTipImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    hintsTipText: {
        flex: 1,
        fontSize: 13,
        color: '#0f3172',
        fontWeight: '500',
        lineHeight: 18,
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
        backgroundColor: '#8B5CF6',
        borderRadius: 2,
    },
    targetText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#8B5CF6',
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
    gestureCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: '#10B981',
        shadowColor: '#10B981',
        shadowOpacity: 0.2,
    },
    gestureActive: {
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        transform: [{ scale: 1.1 }],
        shadowColor: '#8B5CF6',
        shadowOpacity: 0.55,
        shadowRadius: 10,
        elevation: 8,
    },
    gestureChar: {
        fontSize: 20,
        fontWeight: '800',
        color: 'rgba(15, 49, 114, 0.35)',
    },
    gestureCharCompleted: {
        color: '#10B981',
        fontSize: 18,
    },
    gestureCharActive: {
        color: '#6D28D9',
        fontSize: 22,
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
        backgroundColor: '#8B5CF6',
        borderRadius: 2,
    },
    resultConfidence: {
        fontSize: 11,
        color: '#8B5CF6',
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
        borderColor: '#8B5CF6',
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
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.4)',
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
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
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
});