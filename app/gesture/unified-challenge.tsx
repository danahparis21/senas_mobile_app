// app/gesture/unified-challenge.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Pressable,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Animated,
    Platform,
    Modal,
    ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'; // ← ADD useLocalSearchParams here
import WebView from 'react-native-webview';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Audio } from 'expo-av';
import { useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { usePracticeTimeTracker } from '../../hooks/usePracticeTimeTracker';
import { useSettings } from '../../contexts/SettingsContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FONT_FAMILY = Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' });

// ─── GESTURE URLS ──────────────────────────────────────────────────────────
const GESTURE_URLS = {
    alphabet: 'https://swipe-drinking-coral.ngrok-free.dev/gesture.html',
    numbers: 'https://swipe-drinking-coral.ngrok-free.dev/gesture_level3.html',
    greetings: 'https://swipe-drinking-coral.ngrok-free.dev/gesture_greetings.html',
    survival: 'https://swipe-drinking-coral.ngrok-free.dev/gesture_level2.html',
};

// ─── MODULE CONFIGURATION ────────────────────────────────────────────────
const MODULES = [
    { id: 'alphabet', name: 'Alphabet', emoji: '🔤', gestures: 26, moduleName: 'alphabet_part1' },
    { id: 'numbers', name: 'Numbers', emoji: '🔢', gestures: 10, moduleName: 'level1_numbers' },
    { id: 'greetings', name: 'Greetings', emoji: '👋', gestures: 5, moduleName: 'level2_greetings' },
    { id: 'survival', name: 'Survival', emoji: '🆘', gestures: 10, moduleName: 'level3_survival' },
];

// ─── MODULE GESTURE MAPPINGS ─────────────────────────────────────────────
const MODULE_GESTURES: Record<string, string[]> = {
    alphabet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
    numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    greetings: ['Hello', 'Thank You', 'See You Tomorrow', 'How Are You', 'Nice To Meet You'],
    survival: ['Understand', "Don't Understand", 'Know', "Don't Know", 'No', 'Yes', 'Wrong', 'Correct', 'Slow', 'Fast'],
};

// ─── DISPLAY MAPPINGS ─────────────────────────────────────────────────────
const DISPLAY_NAMES: Record<string, Record<string, string>> = {
    greetings: {
        'Hello': 'Hello',
        'Thank You': 'Thank You',
        'See You Tomorrow': 'See You Tomorrow',
        'How Are You': 'How Are You',
        'Nice To Meet You': 'Nice To Meet You',
    },
    survival: {
        'Understand': 'Understand',
        "Don't Understand": "Don't Understand",
        'Know': 'Know',
        "Don't Know": "Don't Know",
        'No': 'No',
        'Yes': 'Yes',
        'Wrong': 'Wrong',
        'Correct': 'Correct',
        'Slow': 'Slow',
        'Fast': 'Fast',
    },
};

// ─── SENYA MESSAGES ──────────────────────────────────────────────────────
const SENYA_MESSAGES = {
    welcome: "Let's start the ultimate challenge! 🏆",
    moduleStart: (moduleName: string, emoji: string) => `🎯 ${emoji} ${moduleName} Challenge!`,
    correct: [
        "Amazing! Keep going! 🌟",
        "Perfect! You're on fire! 🔥",
        "Great job! You're a natural! 💪",
        "Wonderful! You're crushing it! ⭐",
        "Fantastic! Next one! 🎯",
    ],
    struggle: [
        "Try curling your fingers more... 🤔",
        "Keep your hand steady! ✋",
        "Make the shape clearer! 👀",
        "You got this! Try again! 💪",
        "Almost there! One more try! 🎯",
    ],
    timeUp: "⏰ Time's up! Moving to next sign",
    moduleComplete: (moduleName: string) => `🎉 ${moduleName} Complete! 🎉`,
    allComplete: "🏆 AMAZING! YOU MASTERED EVERYTHING! 🏆",
};

// ─── SOUND EFFECTS ──────────────────────────────────────────────────────────
const CORRECT_GESTURE_SOUND = require('../../assets/music/correct-gesture.mp3');

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface ModuleProgress {
    moduleId: string;
    masteredSigns: string[];
    weakSigns: string[];
    completed: boolean;
    attempts: Record<string, { correct: number; wrong: number }>;
}

interface ChallengeSession {
    sign: string;
    success: boolean;
    timeTaken: number;
    attempts: number;
    moduleId: string;
}

interface ModuleResult {
    moduleId: string;
    moduleName: string;
    masteredCount: number;
    totalCount: number;
    starRating: number;
    xpEarned: number;
    timeTaken: number;
}

export default function UnifiedChallengeScreen() {
    const router = useRouter();
    usePracticeTimeTracker();
    const { settings, refreshSettings } = useSettings();

    // ─── GET MODE FROM PARAMS ─────────────────────────────────────────────
    const params = useLocalSearchParams<{
        mode: 'master' | 'infinite';
    }>();
    const mode = params.mode || 'master';

    // ─── CAMERA PERMISSIONS ──────────────────────────────────────────────────
    const [permission, requestPermission] = useCameraPermissions();
    const [permissionRequested, setPermissionRequested] = useState(false);

    // ─── WEBVIEW REF ─────────────────────────────────────────────────────────
    const webViewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [currentUrl, setCurrentUrl] = useState(GESTURE_URLS.alphabet);

    // ─── CHALLENGE STATE ────────────────────────────────────────────────────
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
    const [currentSigns, setCurrentSigns] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [completedSigns, setCompletedSigns] = useState<Set<string>>(new Set());
    const [masteredSigns, setMasteredSigns] = useState<Set<string>>(new Set());

    // ─── TIMER STATE ─────────────────────────────────────────────────────────
    const [timeLeft, setTimeLeft] = useState(10);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const timerRef = useRef<number | null>(null);

    // ─── DETECTION STATE ────────────────────────────────────────────────────
    const [liveLetter, setLiveLetter] = useState<string>('—');
    const [liveConfidence, setLiveConfidence] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // ─── SESSION TRACKING ──────────────────────────────────────────────────
    const [sessionHistory, setSessionHistory] = useState<ChallengeSession[]>([]);
    const [moduleResults, setModuleResults] = useState<ModuleResult[]>([]);
    const [totalXP, setTotalXP] = useState(0);
    const [totalMastered, setTotalMastered] = useState(0);
    const [totalGestures, setTotalGestures] = useState(0);

    // ─── UI STATE ──────────────────────────────────────────────────────────
    const [showResults, setShowResults] = useState(false);
    const [showModuleComplete, setShowModuleComplete] = useState(false);
    const [senyaMessage, setSenyaMessage] = useState(SENYA_MESSAGES.welcome);
    const [countdown, setCountdown] = useState<number | null>(null);
    const countdownRef = useRef<number | null>(null);

    // ─── ANIMATIONS ─────────────────────────────────────────────────────────
    const popupAnim = useRef(new Animated.Value(0)).current;
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupSubMessage, setPopupSubMessage] = useState('');
    const [popupType, setPopupType] = useState<'success' | 'error' | 'timeup'>('success');

    // ─── AUDIO ──────────────────────────────────────────────────────────────
    const [gestureSound, setGestureSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState(false);

    // ─── REFS FOR COOLDOWNS ─────────────────────────────────────────────────
    const isProcessingRef = useRef(false);
    const isTimeUpProcessingRef = useRef(false);
    const timeoutRef = useRef<number | null>(null);
    const shouldProcessMessages = useRef(true);
    const detectionCooldownRef = useRef<number>(0);
    const DETECTION_COOLDOWN_MS = 1500;
    const soundCooldownRef = useRef<number>(0);
    const SOUND_COOLDOWN_MS = 800;

    // ─── GET CURRENT MODULE ─────────────────────────────────────────────────
    const currentModule = MODULES[currentModuleIndex];
    const currentTarget = currentSigns[currentIndex] || '?';

    // ─── FETCH WEAK SIGNS FOR ALL MODULES ──────────────────────────────────
    const fetchAllWeakSigns = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const progress: ModuleProgress[] = [];

            let totalMasteredCount = 0;
            let totalGesturesCount = 0;

            // If infinite mode, use all signs for all modules
            const isInfinite = mode === 'infinite';

            for (const module of MODULES) {
                const allGestures = MODULE_GESTURES[module.id] || [];
                totalGesturesCount += allGestures.length;

                let weakSigns: string[] = [];

                if (isInfinite) {
                    // Infinite mode: use all signs
                    weakSigns = [...allGestures];
                } else if (token) {
                    // Master mode: fetch weak signs from API
                    try {
                        const response = await api.getWeakSigns(module.moduleName);
                        if (response && response.success && response.weak_signs) {
                            weakSigns = response.weak_signs.map((s: any) => s.name);
                        }
                    } catch (error) {
                        console.error(`Error fetching weak signs for ${module.id}:`, error);
                    }
                }

                // If no weak signs (or API failed), use all signs
                if (weakSigns.length === 0) {
                    weakSigns = [...allGestures];
                }

                const mastered = allGestures.filter(g => !weakSigns.includes(g));
                totalMasteredCount += mastered.length;

                progress.push({
                    moduleId: module.id,
                    masteredSigns: mastered,
                    weakSigns: weakSigns,
                    completed: weakSigns.length === 0,
                    attempts: {},
                });
            }

            setModuleProgress(progress);
            setTotalMastered(totalMasteredCount);
            setTotalGestures(totalGesturesCount);

            // Find first incomplete module
            let firstIncompleteIndex = progress.findIndex(p => !p.completed);

            if (firstIncompleteIndex === -1) {
                // All modules complete!
                setIsComplete(true);
                setSenyaMessage(SENYA_MESSAGES.allComplete);
                showFinalResults();
                return;
            }

            // Start with the first incomplete module
            startModule(firstIncompleteIndex);

        } catch (error) {
            console.error('Error fetching all weak signs:', error);
            // Fallback: start with alphabet
            startModule(0);
        }
    };

    // ─── START A MODULE ─────────────────────────────────────────────────────
    const startModule = (moduleIndex: number) => {
        const module = MODULES[moduleIndex];
        const progress = moduleProgress[moduleIndex];
        const signs = progress.weakSigns.length > 0 ? progress.weakSigns : MODULE_GESTURES[module.id] || [];

        setCurrentModuleIndex(moduleIndex);
        setCurrentSigns(signs);
        setCurrentIndex(0);
        setCompletedSigns(new Set());
        setMasteredSigns(new Set(progress.masteredSigns));

        // Update WebView URL
        const url = GESTURE_URLS[module.id as keyof typeof GESTURE_URLS];
        if (url) {
            setCurrentUrl(url);
        }

        setSenyaMessage(SENYA_MESSAGES.moduleStart(module.name, module.emoji));

        // Start countdown
        startCountdown(signs);
    };

    // ─── COUNTDOWN LOGIC ─────────────────────────────────────────────────────
    const startCountdown = (signs: string[]) => {
        if (countdownRef.current) clearInterval(countdownRef.current);

        const module = MODULES[currentModuleIndex];
        setCountdown(5);
        setSenyaMessage(`${module.emoji} ${module.name} starting in 5...`);

        let count = 5;
        countdownRef.current = setInterval(() => {
            count -= 1;
            if (count > 0) {
                setCountdown(count);
                setSenyaMessage(`${module.emoji} ${module.name} starting in ${count}...`);
            } else {
                if (countdownRef.current) clearInterval(countdownRef.current);
                setCountdown(null);
                setSenyaMessage(`🎯 ${module.name}: ${signs.length} signs to practice!`);
                startTimer(signs, 0);
            }
        }, 1000);
    };

    // ─── TIMER LOGIC ─────────────────────────────────────────────────────────
    const startTimer = (signs: string[], index: number) => {
        setIsTimerActive(true);
        setTimeLeft(10);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const currentSigns = signs;
        const currentIdx = index;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                const newTime = prev - 0.1;

                if (newTime <= 0) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    setIsTimerActive(false);
                    handleTimeUp(currentSigns, currentIdx);
                    return 0;
                }
                return newTime;
            });
        }, 100);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsTimerActive(false);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    // ─── HANDLE TIME UP ──────────────────────────────────────────────────────
    const handleTimeUp = (signs: string[], index: number) => {
        if (isTimeUpProcessingRef.current || isProcessingRef.current) {
            return;
        }

        isTimeUpProcessingRef.current = true;
        isProcessingRef.current = true;

        if (signs.length === 0 || index >= signs.length) {
            isTimeUpProcessingRef.current = false;
            isProcessingRef.current = false;
            return;
        }

        showPopupMessage('⏰ Time\'s up!', 'Moving to next sign', 'timeup');

        const sign = signs[index];
        if (sign) {
            setSessionHistory(prev => [...prev, {
                sign,
                success: false,
                timeTaken: 10,
                attempts: 0,
                moduleId: currentModule.id,
            }]);
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        timeoutRef.current = setTimeout(() => {
            moveToNextSign(signs, index, false);
            isTimeUpProcessingRef.current = false;
            isProcessingRef.current = false;
            timeoutRef.current = null;
        }, 1000);
    };

    // ─── MOVE TO NEXT SIGN ──────────────────────────────────────────────────
    const moveToNextSign = (signs: string[], index: number, success: boolean) => {
        isTimeUpProcessingRef.current = false;

        if (index >= signs.length) {
            // Module complete!
            stopTimer();
            handleModuleComplete();
            return;
        }

        const sign = signs[index];

        if (success) {
            masteredSigns.add(sign);
            completedSigns.add(sign);
            setSenyaMessage(getRandomMessage(SENYA_MESSAGES.correct));
        } else {
            setSenyaMessage(getRandomMessage(SENYA_MESSAGES.struggle));
        }

        const nextIndex = index + 1;

        if (nextIndex >= signs.length) {
            // Module complete!
            stopTimer();
            handleModuleComplete();
        } else {
            setCurrentIndex(nextIndex);
            startTimer(signs, nextIndex);
        }
    };

    // ─── HANDLE MODULE COMPLETE ─────────────────────────────────────────────
    const handleModuleComplete = () => {
        const module = currentModule;
        const progress = moduleProgress[currentModuleIndex];
        const mastered = Array.from(masteredSigns);
        const total = currentSigns.length;

        // Calculate module stats
        const masteredCount = mastered.length;
        const percentage = total > 0 ? (masteredCount / total) * 100 : 0;
        let starRating = 0;
        let xpEarned = 0;

        if (percentage === 100) { starRating = 3; xpEarned = 15; }
        else if (percentage >= 80) { starRating = 3; xpEarned = 10; }
        else if (percentage >= 60) { starRating = 2; xpEarned = 8; }
        else if (percentage >= 40) { starRating = 2; xpEarned = 5; }
        else if (percentage > 0) { starRating = 1; xpEarned = 5; }

        // Update module progress
        const updatedProgress = [...moduleProgress];
        updatedProgress[currentModuleIndex] = {
            ...progress,
            masteredSigns: mastered,
            weakSigns: currentSigns.filter(s => !mastered.includes(s)),
            completed: masteredCount >= total,
        };
        setModuleProgress(updatedProgress);

        // Store module result
        const result: ModuleResult = {
            moduleId: module.id,
            moduleName: module.name,
            masteredCount,
            totalCount: total,
            starRating,
            xpEarned,
            timeTaken: 0, // Calculate from session history
        };
        setModuleResults(prev => [...prev, result]);
        setTotalXP(prev => prev + xpEarned);

        // Award XP
        awardModuleXp(module.moduleName, xpEarned, starRating);

        // Play complete sound
        playCompleteSound();

        // Show module complete modal
        setShowModuleComplete(true);
        setSenyaMessage(SENYA_MESSAGES.moduleComplete(module.name));
    };

    // ─── CONTINUE TO NEXT MODULE ────────────────────────────────────────────
    const continueToNextModule = () => {
        setShowModuleComplete(false);

        const nextIndex = currentModuleIndex + 1;

        // Check if there are more modules
        if (nextIndex < MODULES.length) {
            const nextProgress = moduleProgress[nextIndex];
            if (nextProgress && !nextProgress.completed) {
                startModule(nextIndex);
            } else {
                // Find next incomplete module
                let found = false;
                for (let i = nextIndex; i < MODULES.length; i++) {
                    if (!moduleProgress[i].completed) {
                        startModule(i);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // All modules complete!
                    setIsComplete(true);
                    setSenyaMessage(SENYA_MESSAGES.allComplete);
                    showFinalResults();
                }
            }
        } else {
            // All modules complete!
            setIsComplete(true);
            setSenyaMessage(SENYA_MESSAGES.allComplete);
            showFinalResults();
        }
    };

    // ─── SHOW FINAL RESULTS ──────────────────────────────────────────────────
    const showFinalResults = () => {
        // Navigate to XP progress with total XP
        const totalXpEarned = moduleResults.reduce((sum, r) => sum + r.xpEarned, 0);
        const totalMasteredCount = moduleResults.reduce((sum, r) => sum + r.masteredCount, 0);
        const totalGestureCount = moduleResults.reduce((sum, r) => sum + r.totalCount, 0);

        router.push({
            pathname: '/lesson/xp-progress',
            params: {
                xpEarned: String(totalXpEarned),
                totalXp: String(totalXpEarned),
                level: String(1),
                levelName: 'Challenge Master',
                previousXp: String(0),
                nextLevelXp: String(100),
                showStreak: 'true',
                streakDays: String(0),
                challengeComplete: 'true',
                totalMastered: String(totalMasteredCount),
                totalGestures: String(totalGestureCount),
            },
        });
    };

    // ─── AWARD XP ─────────────────────────────────────────────────────────────
    const awardModuleXp = async (moduleName: string, xp: number, starRating: number) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const result = await api.awardChallengeXp(moduleName, xp, starRating);
            if (result && result.success) {
                console.log(`✅ ${result.xp_message}`);
            }
        } catch (error) {
            console.error('Error awarding XP:', error);
        }
    };

    // ─── PLAY SOUND ──────────────────────────────────────────────────────────
    async function playGestureSound() {
        if (!settings.soundEnabled) return;

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

    async function playCompleteSound() {
        if (!settings.soundEnabled) return;

        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/music/gesture-complete.mp3'),
                { shouldPlay: true, isLooping: false, volume: 1.0 }
            );
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (error) {
            console.error('Failed to play complete sound:', error);
        }
    }

    // ─── HELPERS ──────────────────────────────────────────────────────────────
    const getRandomMessage = (messages: string[]) => {
        return messages[Math.floor(Math.random() * messages.length)];
    };

    const showPopupMessage = (message: string, subMessage: string = '', type: 'success' | 'error' | 'timeup' = 'success') => {
        setPopupMessage(message);
        setPopupSubMessage(subMessage);
        setPopupType(type);
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
                duration: 180,
                useNativeDriver: true,
            }).start(() => setShowPopup(false));
        }, 1200);
    };

    // ─── HANDLE WEBVIEW MESSAGE ─────────────────────────────────────────────
    const handleMessage = (event: any) => {
        if (!shouldProcessMessages.current || isComplete || showModuleComplete) {
            return;
        }

        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'model_status' || data.type === 'model_ready') {
                setIsConnected(true);
                setLoading(false);
                return;
            }

            if (data.test) {
                setIsConnected(true);
                setLoading(false);
                return;
            }

            const detectedValue = data.letter || data.greeting || '';
            const confidence = data.confidence || 0;

            // Map detection based on module type
            let matchValue = detectedValue;

            // Handle different module types
            if (currentModule.id === 'survival') {
                const SURVIVAL_MAP: Record<string, string> = {
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
                matchValue = SURVIVAL_MAP[detectedValue] || detectedValue;
            } else if (currentModule.id === 'greetings') {
                const GREETING_MAP: Record<string, string> = {
                    'HELLO': 'Hello',
                    'THANK YOU': 'Thank You',
                    'SEE YOU TOMORROW': 'See You Tomorrow',
                    'HOW ARE YOU': 'How Are You',
                    'NICE TO MEET YOU': 'Nice To Meet You'
                };
                matchValue = GREETING_MAP[detectedValue] || detectedValue;
            } else if (currentModule.id === 'numbers') {
                const NUMBERS_MAP: Record<string, string> = {
                    'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5',
                    'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9', 'TEN': '10'
                };
                matchValue = NUMBERS_MAP[detectedValue] || detectedValue;
            } else {
                // Alphabet - keep as is
                if (detectedValue.length === 1 && detectedValue >= 'A' && detectedValue <= 'Z') {
                    matchValue = detectedValue;
                }
            }

            setLiveLetter(matchValue);
            setLiveConfidence(Math.round(confidence * 100));

            // Check if confidence is sufficient
            if (confidence < 0.6 || !matchValue || matchValue === '✋' || matchValue === '...') {
                setLiveLetter('—');
                setLiveConfidence(0);
                return;
            }

            setIsConnected(true);
            if (loading) setLoading(false);

            // Check if it matches the target
            const now = Date.now();
            const isCooldownOver = now - detectionCooldownRef.current >= DETECTION_COOLDOWN_MS;

            if (matchValue === currentTarget && !isProcessing && !isComplete && isTimerActive &&
                !isTimeUpProcessingRef.current && isCooldownOver) {

                detectionCooldownRef.current = now;
                setIsProcessing(true);
                stopTimer();

                // Play sound with cooldown
                if (now - soundCooldownRef.current >= SOUND_COOLDOWN_MS) {
                    soundCooldownRef.current = now;
                    playGestureSound();
                }

                const timeTaken = 10 - timeLeft;

                // Update session history
                setSessionHistory(prev => [...prev, {
                    sign: currentTarget,
                    success: true,
                    timeTaken: timeTaken,
                    attempts: 1,
                    moduleId: currentModule.id,
                }]);

                showPopupMessage(`✨ ${currentTarget} ✓`, '', 'success');

                setTimeout(() => {
                    moveToNextSign(currentSigns, currentIndex, true);
                    setIsProcessing(false);
                }, 800);
            }
        } catch (error) {
            console.error('Error handling WebView message:', error);
            setIsProcessing(false);
        }
    };

    // ─── INJECTED JAVASCRIPT ─────────────────────────────────────────────────
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
        
        console.log('🎯 Unified Challenge mode activated!');
        
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

    // ─── OPEN IN BROWSER ────────────────────────────────────────────────────
    const openInBrowser = async () => {
        try {
            await WebBrowser.openBrowserAsync(currentUrl + '?ngrok-skip-browser-warning=true');
        } catch (error) {
            console.error('Error opening browser:', error);
        }
    };

    // ─── CLEANUP ─────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (gestureSound) gestureSound.unloadAsync();
        };
    }, []);

    // ─── INITIALIZE ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (permission && permission.granted) {
            fetchAllWeakSigns();
        }
    }, [permission]);

    // ─── FOCUS EFFECT ──────────────────────────────────────────────────────
    useFocusEffect(
        useCallback(() => {
            refreshSettings();
        }, [refreshSettings])
    );

    // ─── CAMERA PERMISSION ──────────────────────────────────────────────────
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
                        This will only be requested once for the entire challenge.
                    </Text>
                    <Pressable
                        style={styles.button}
                        onPress={() => {
                            requestPermission();
                            setPermissionRequested(true);
                        }}
                    >
                        <Text style={styles.buttonText}>Grant Permission</Text>
                    </Pressable>
                    <Pressable style={styles.skipBtn} onPress={() => router.back()}>
                        <Text style={styles.skipBtnText}>Go Back</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // ─── RENDER ──────────────────────────────────────────────────────────────
    const progress = currentSigns.length > 0 ? (currentIndex / currentSigns.length) : 0;
    const module = currentModule;

    return (
        <SafeAreaView style={styles.container}>
            {/* ─── HEADER ────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={20} color="#0f3172" />
                </Pressable>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>
                        {mode === 'master' ? '🏆 Master Challenge' : '♾️ Infinite Practice'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {module.emoji} {module.name} {currentModuleIndex + 1}/{MODULES.length}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={[styles.statusBadge, isConnected && styles.statusActive]}>
                        <View style={[styles.statusDot, isConnected && styles.statusDotActive]} />
                        <Text style={[styles.statusText, isConnected && styles.statusActiveText]}>
                            {isConnected ? 'Live' : 'Loading'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* ─── PROGRESS BAR ──────────────────────────────────────────── */}
            <View style={styles.progressContainer}>
                <View style={styles.moduleDots}>
                    {MODULES.map((m, idx) => {
                        const isCompleted = moduleProgress[idx]?.completed;
                        const isActive = idx === currentModuleIndex;
                        return (
                            <View
                                key={m.id}
                                style={[
                                    styles.moduleDot,
                                    isCompleted && styles.moduleDotCompleted,
                                    isActive && styles.moduleDotActive,
                                ]}
                            >
                                <Text style={[
                                    styles.moduleDotText,
                                    isCompleted && styles.moduleDotTextCompleted,
                                    isActive && styles.moduleDotTextActive,
                                ]}>
                                    {isCompleted ? '✓' : m.emoji}
                                </Text>
                            </View>
                        );
                    })}
                </View>
                <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                </View>
                <View style={styles.progressLabels}>
                    <Text style={styles.progressLabel}>
                        {currentIndex}/{currentSigns.length}
                    </Text>
                    <Text style={styles.progressLabel}>
                        ⏱ {Math.ceil(timeLeft)}s
                    </Text>
                </View>
            </View>

            {/* ─── WEBVIEW ────────────────────────────────────────────────── */}
            <View style={styles.webviewContainer}>
                <WebView
                    ref={webViewRef}
                    source={{
                        uri: currentUrl,
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

                {/* ─── TARGET OVERLAY ────────────────────────────────── */}
                <View style={styles.targetOverlay} pointerEvents="none">
                    <Text style={styles.targetLabelOverlay}>Sign this</Text>
                    <View style={styles.targetLetterCard}>
                        <Text
                            style={[
                                styles.targetLetterBase,
                                currentTarget && currentTarget.length <= 1 && { fontSize: 56, lineHeight: 60 },
                                currentTarget && currentTarget.length === 2 && { fontSize: 50, lineHeight: 54 },
                                currentTarget && currentTarget.length === 3 && { fontSize: 46, lineHeight: 50 },
                                currentTarget && currentTarget.length === 4 && { fontSize: 42, lineHeight: 46 },
                                currentTarget && currentTarget.length > 4 && currentTarget.length <= 6 && { fontSize: 38, lineHeight: 42 },
                                currentTarget && currentTarget.length > 6 && currentTarget.length <= 10 && { fontSize: 32, lineHeight: 36 },
                                currentTarget && currentTarget.length > 10 && currentTarget.length <= 15 && { fontSize: 26, lineHeight: 30 },
                                currentTarget && currentTarget.length > 15 && { fontSize: 20, lineHeight: 24 },
                            ]}
                            numberOfLines={2}
                        >
                            {currentTarget}
                        </Text>
                    </View>
                </View>

                {/* ─── COUNTDOWN ────────────────────────────────────────── */}
                {countdown !== null && (
                    <View style={styles.countdownOverlay}>
                        <Text style={styles.countdownText}>{countdown}</Text>
                        <Text style={styles.countdownSubtext}>Get ready!</Text>
                    </View>
                )}

                {/* ─── LOADING OVERLAY ────────────────────────────────── */}
                {loading && !isConnected && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#FFD700" />
                        <Text style={styles.loadingOverlayText}>Starting challenge…</Text>
                        <Text style={styles.loadingSubtext}>Connecting to SENAS server</Text>
                    </View>
                )}

                {!isConnected && !loading && (
                    <Pressable style={styles.browserButton} onPress={openInBrowser}>
                        <Ionicons name="open-outline" size={20} color="#fff" />
                        <Text style={styles.browserButtonText}>Open in Browser</Text>
                    </Pressable>
                )}

                {/* ─── POPUP ────────────────────────────────────────────── */}
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
                            <View style={[
                                styles.popupContent,
                                popupType === 'timeup' && styles.popupContentTimeup,
                                popupType === 'error' && styles.popupContentError,
                            ]}>
                                {popupType === 'timeup' ? (
                                    <>
                                        <Text style={styles.popupTimeupIcon}>⏰</Text>
                                        <Text style={styles.popupLetterPillText}>{popupMessage}</Text>
                                    </>
                                ) : popupType === 'error' ? (
                                    <>
                                        <Text style={styles.popupErrorIcon}>💪</Text>
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
            </View>

            {/* ─── DETECTION BAR ────────────────────────────────────────── */}
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

            {/* ─── MODULE COMPLETE MODAL ────────────────────────────────── */}
            <Modal
                visible={showModuleComplete}
                transparent
                animationType="fade"
                onRequestClose={() => setShowModuleComplete(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setShowModuleComplete(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={20} color="#0f3172" />
                        </TouchableOpacity>

                        <View style={styles.trophyBadge}>
                            <Ionicons name="trophy" size={32} color="#FFD700" />
                        </View>

                        <Text style={styles.modalTitle}>
                            {module.emoji} {module.name} Complete!
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            {masteredSigns.size} of {currentSigns.length} signs mastered
                        </Text>

                        {/* Stars */}
                        <View style={styles.starsRow}>
                            {[1, 2, 3].map((star) => {
                                const isEarned = star <= Math.min(3, Math.ceil((masteredSigns.size / currentSigns.length) * 3));
                                return (
                                    <Ionicons
                                        key={star}
                                        name={isEarned ? 'star' : 'star-outline'}
                                        size={star === 2 ? 44 : 36}
                                        color={isEarned ? '#FFC93C' : '#D9E2EC'}
                                        style={star === 2 ? { marginBottom: 4 } : {}}
                                    />
                                );
                            })}
                        </View>

                        <View style={styles.starLabelPill}>
                            <Ionicons
                                name={masteredSigns.size >= currentSigns.length ? 'flash' : 'thumbs-up'}
                                size={14}
                                color="#0f3172"
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.starLabel}>
                                {masteredSigns.size >= currentSigns.length ? 'Perfect!' : 'Great Job!'}
                            </Text>
                        </View>

                        {/* Stats */}
                        <View style={styles.resultsGrid}>
                            <View style={styles.resultItem}>
                                <View style={styles.resultIconWrap}>
                                    <Ionicons name="checkmark-circle" size={20} color="#0f3172" />
                                </View>
                                <Text style={styles.resultValue}>
                                    {masteredSigns.size}/{currentSigns.length}
                                </Text>
                                <Text style={styles.resultGridLabel}>Mastered</Text>
                            </View>
                            <View style={styles.resultItemDivider} />
                            <View style={styles.resultItem}>
                                <View style={styles.resultIconWrap}>
                                    <Ionicons name="star" size={20} color="#F59E0B" />
                                </View>
                                <Text style={[styles.resultValue, { color: '#F59E0B' }]}>
                                    +{moduleResults[moduleResults.length - 1]?.xpEarned || 0} XP
                                </Text>
                                <Text style={styles.resultGridLabel}>Earned</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.continueButton}
                            activeOpacity={0.85}
                            onPress={continueToNextModule}
                        >
                            <Text style={styles.continueButtonText}>
                                {currentModuleIndex < MODULES.length - 1 ? 'Next Module →' : '🎉 See Results'}
                            </Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
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
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#0f3172', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 14, fontWeight: '800', color: '#0f3172',
        letterSpacing: 0.2,
    },
    headerSubtitle: {
        fontSize: 11, fontWeight: '600', color: '#4b7bbb',
        marginTop: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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

    progressContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 6,
    },
    moduleDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 4,
    },
    moduleDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(15,49,114,0.1)',
        borderWidth: 2,
        borderColor: 'rgba(15,49,114,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    moduleDotCompleted: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    moduleDotActive: {
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255,215,0,0.2)',
        transform: [{ scale: 1.1 }],
    },
    moduleDotText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(15,49,114,0.3)',
    },
    moduleDotTextCompleted: {
        color: '#fff',
    },
    moduleDotTextActive: {
        color: '#0f3172',
    },
    progressBarTrack: {
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(15,49,114,0.1)',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
        backgroundColor: '#10B981',
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4b7bbb',
    },

    webviewContainer: {
        height: SCREEN_HEIGHT * 0.6,
        marginHorizontal: 12,
        marginBottom: 10,
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
        paddingHorizontal: 14,
        paddingVertical: 6,
        minHeight: 60,
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
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.95)',
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28, shadowRadius: 28, elevation: 16,
    },
    popupContentTimeup: {
        borderColor: '#EF4444',
        backgroundColor: 'rgba(254, 242, 242, 0.95)',
    },
    popupContentError: {
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(255, 251, 235, 0.95)',
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
    popupTimeupIcon: {
        fontSize: 32,
        marginBottom: 4,
    },
    popupErrorIcon: {
        fontSize: 28,
        marginBottom: 4,
    },
    popupLetterPillText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1848c8',
        letterSpacing: 1,
    },
    popupSubMessage: {
        fontSize: 10,
        color: '#4b7bbb',
        fontWeight: '600',
        marginTop: 6,
        textAlign: 'center',
    },

    countdownOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    countdownText: {
        fontSize: 72,
        fontWeight: '900',
        color: '#FFD700',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    countdownSubtext: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },

    // ─── MODAL STYLES ──────────────────────────────────────────────────────
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