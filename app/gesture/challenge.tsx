// app/gesture/challenge.tsx
import React, { useState, useEffect, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import WebView from 'react-native-webview';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Audio } from 'expo-av';
import { useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';

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

// ─── ID TO GESTURE MAPPING ────────────────────────────────────────────────
const ID_TO_GESTURE: Record<string, string> = {
    // Alphabet (A-Z) - adjust IDs based on your database
    '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G',
    '8': 'H', '9': 'I', '10': 'J', '11': 'K', '12': 'L', '13': 'M', '14': 'N',
    '15': 'O', '16': 'P', '17': 'Q', '18': 'R', '19': 'S', '20': 'T', '21': 'U',
    '22': 'V', '23': 'W', '24': 'X', '25': 'Y', '26': 'Z',

    // Numbers (1-10) - adjust IDs based on your database
    '27': '1', '28': '2', '29': '3', '30': '4', '31': '5',
    '32': '6', '33': '7', '34': '8', '35': '9', '36': '10',

    // Greetings - adjust IDs based on your database
    '47': 'Hello', '48': 'Thank You', '49': 'See You Tomorrow',
    '50': 'How Are You', '51': 'Nice To Meet You', '52': 'Understand',

    // Survival - adjust IDs based on your database
    "53": "Don't Understand", '54': 'Know', "55": "Don't Know",
    '56': 'No', '57': 'Yes', '58': 'Wrong', '59': 'Correct',
    '60': 'Slow', '61': 'Fast',
};


// ─── ALL GESTURES BY MODULE ──────────────────────────────────────────────
const MODULE_GESTURES: Record<string, string[]> = {
    alphabet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
    numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    greetings: ['Hello', 'Thank You', 'See You Tomorrow', 'How Are You', 'Nice To Meet You'],
    survival: ['Understand', "Don't Understand", 'Know', "Don't Know", 'No', 'Yes', 'Wrong', 'Correct', 'Slow', 'Fast'],
};

// ─── MODULE URL MAP ──────────────────────────────────────────────────────
const MODULE_URLS: Record<string, string> = {
    alphabet: GESTURE_URL_ALPHABET,
    numbers: GESTURE_URL_NUMBERS,
    greetings: GESTURE_URL_GREETINGS,
    survival: GESTURE_URL_SURVIVAL,
};

// ─── SENYA MESSAGES ──────────────────────────────────────────────────────
const SENYA_MESSAGES = {
    welcome: "Let's start the challenge! 🏆",
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
    timeUp: "Time's up! Moving to next sign ⏰",
    complete: "🎉 YOU DID IT! ALL SIGNS MASTERED! 🎉",
};

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface ChallengeResult {
    totalSigns: number;
    masteredSigns: string[];
    remainingSigns: string[];
    attempts: Record<string, { correct: number; wrong: number }>;
    timePerSign: Record<string, number>;
}

interface ChallengeSession {
    sign: string;
    success: boolean;
    timeTaken: number;
    attempts: number;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ChallengeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        mode: 'master' | 'infinite';
        moduleId: string;
        moduleType?: string;
    }>();

    const mode = params.mode || 'master';
    const moduleType = params.moduleType || 'alphabet';

    const webViewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const countdownRef = useRef<number | null>(null);
    const isProcessingRef = useRef(false);


    // ─── CAMERA PERMISSIONS ──────────────────────────────────────────────────
    const [permission, requestPermission] = useCameraPermissions();

    // Audio state
    const [gestureSound, setGestureSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState(false);

    // ─── CHALLENGE STATE ────────────────────────────────────────────────────
    const [allSigns, setAllSigns] = useState<string[]>([]);
    const [weakSigns, setWeakSigns] = useState<string[]>([]);
    const [currentRoundSigns, setCurrentRoundSigns] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [completedSigns, setCompletedSigns] = useState<Set<string>>(new Set());
    const [masteredSigns, setMasteredSigns] = useState<Set<string>>(new Set());
    const [remainingSigns, setRemainingSigns] = useState<string[]>([]);

    // Timer state
    const [timeLeft, setTimeLeft] = useState(10);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const timerRef = useRef<number | null>(null);

    // Detection state
    const [liveLetter, setLiveLetter] = useState<string>('—');
    const [liveConfidence, setLiveConfidence] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // Session tracking
    const [sessionHistory, setSessionHistory] = useState<ChallengeSession[]>([]);
    const [roundNumber, setRoundNumber] = useState(1);
    const [showResults, setShowResults] = useState(false);
    const [resultsData, setResultsData] = useState<ChallengeResult | null>(null);
    const [totalWrongAttempts, setTotalWrongAttempts] = useState(0);
    const [totalCorrectAttempts, setTotalCorrectAttempts] = useState(0);

    // Animation
    const popupAnim = useRef(new Animated.Value(0)).current;
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupSubMessage, setPopupSubMessage] = useState('');
    const [popupType, setPopupType] = useState<'success' | 'error' | 'timeup'>('success');


    // Senya bounce
    const senyaBounceAnim = useRef(new Animated.Value(0)).current;
    const [senyaMessage, setSenyaMessage] = useState(SENYA_MESSAGES.welcome);

    // Measured height for Senya positioning
    const [gestureOverlayHeight, setGestureOverlayHeight] = useState(0);

    const currentTarget = currentRoundSigns[currentIndex] || '?';
    const totalSigns = allSigns.length;

    const [countdown, setCountdown] = useState<number | null>(null);

    // ─── BONUS POPUP STATE (Simplified) ──────────────────────────────────────────────
    const [showBonusPopup, setShowBonusPopup] = useState(false);
    const [bonusType, setBonusType] = useState<'lightning' | 'fire' | 'great' | 'none'>('none');
    const [bonusMessage, setBonusMessage] = useState('');
    const bonusScaleAnim = useRef(new Animated.Value(0)).current;
    const bonusOpacityAnim = useRef(new Animated.Value(0)).current;
    // Only 3 particles, not 7
    const particleAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;

    // Stars and results states
    const [starRating, setStarRating] = useState(1);
    const starAnim1 = useRef(new Animated.Value(0)).current;
    const starAnim2 = useRef(new Animated.Value(0)).current;
    const starAnim3 = useRef(new Animated.Value(0)).current;
    const [completeSound, setCompleteSound] = useState<Audio.Sound | null>(null);


    const [xpEarned, setXpEarned] = useState(0);
    const [xpResult, setXpResult] = useState<any>(null)
    const [infiniteSignCount, setInfiniteSignCount] = useState(0);

    const [totalAttemptedSigns, setTotalAttemptedSigns] = useState(0);
    const [showFinishButton, setShowFinishButton] = useState(false);


    // ─── FETCH WEAK SIGNS FROM API ──────────────────────────────────────────
    const fetchWeakSigns = async () => {
        try {
            console.log('🔍 fetchWeakSigns STARTED');

            const token = await AsyncStorage.getItem('userToken');
            console.log('🔍 Token:', token ? 'Found' : 'Not found');

            // 🔥 FIX: If infinite mode, start infinite immediately
            if (mode === 'infinite') {
                console.log('♾️ Infinite mode detected - using all signs');
                const all = MODULE_GESTURES[moduleType] || [];
                setAllSigns(all);
                setWeakSigns([]);
                setRemainingSigns([]);
                startInfiniteMode();
                return;
            }

            if (!token) {
                console.log('⚠️ No token found - using all signs');
                const all = MODULE_GESTURES[moduleType] || [];
                setAllSigns(all);
                setWeakSigns([...all]);
                setRemainingSigns([...all]);
                startRound([...all]);
                return;
            }

            // Map moduleType to module name
            const moduleNameMap: Record<string, string> = {
                'alphabet': 'alphabet_part1',
                'numbers': 'level1_numbers',
                'greetings': 'level2_greetings',
                'survival': 'level3_survival',
            };
            const moduleName = moduleNameMap[moduleType] || moduleType;

            console.log(`📊 Fetching weak signs for module: ${moduleName}`);
            console.log('🔍 Calling api.getWeakSigns...');

            // Use the new API endpoint directly
            const response = await api.getWeakSigns(moduleName);
            console.log('🔍 Response received:', response ? 'Yes' : 'No');
            console.log('📊 Weak signs response:', JSON.stringify(response, null, 2));

            const allGestures = MODULE_GESTURES[moduleType] || [];
            setAllSigns(allGestures);

            // Check if we got a valid response
            if (response && response.success) {
                // Extract weak sign names from the response
                const weakSignNames = response.weak_signs?.map((s: any) => s.name) || [];

                console.log(`📊 Found ${weakSignNames.length} weak signs:`, weakSignNames);

                if (weakSignNames.length === 0) {
                    // All mastered!
                    console.log('🎉 All signs mastered!');
                    setIsComplete(true);
                    setSenyaMessage(SENYA_MESSAGES.complete);
                    return;
                }

                setWeakSigns(weakSignNames);
                setRemainingSigns([...weakSignNames]);
                startRound(weakSignNames);
            } else {
                // If API fails or returns no data, use all signs as fallback
                console.log('⚠️ API returned no weak signs, using all signs as fallback');
                const all = MODULE_GESTURES[moduleType] || [];
                setAllSigns(all);
                setWeakSigns([...all]);
                setRemainingSigns([...all]);
                startRound([...all]);
            }
        } catch (error) {
            console.error('❌ Error fetching weak signs:', error);
            // Fallback - use all signs
            const all = MODULE_GESTURES[moduleType] || [];
            setAllSigns(all);
            setWeakSigns([...all]);
            setRemainingSigns([...all]);
            startRound([...all]);
        }
    };

    // ─── FETCH WEAK SIGNS WHEN COMPONENT MOUNTS ──────────────────────────────
    useEffect(() => {
        console.log('🔍 ChallengeScreen mounted, fetching weak signs for module:', moduleType);
        fetchWeakSigns();
    }, [moduleType]);

    // ─── CLEANUP ─────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (gestureSound) gestureSound.unloadAsync();
            if (completeSound) completeSound.unloadAsync();
        };
    }, [completeSound]);

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

    // ─── CALCULATE XP ──────────────────────────────────────────────────────────
    const calculateXP = (masteredCount: number, totalCount: number): { xp: number; starRating: number } => {
        if (totalCount === 0) return { xp: 0, starRating: 0 };

        const percentage = (masteredCount / totalCount) * 100;
        let xp = 0;
        let starRating = 0;

        if (mode === 'infinite') {
            // Infinite Mode: Strictly 1 XP for 1 Sign Completed
            xp = masteredCount;

            // Calculate a basic star rating based on accuracy for the UI
            if (percentage >= 80) starRating = 3;
            else if (percentage >= 40) starRating = 2;
            else if (percentage > 0) starRating = 1;
            else starRating = 0;

        } else {
            // Master Mode: Your exact legacy logic
            if (percentage === 100) {
                xp = 15;
                starRating = 3;
            } else if (percentage >= 80) {
                xp = 10;
                starRating = 3;
            } else if (percentage >= 60) {
                xp = 8;
                starRating = 2;
            } else if (percentage >= 40) {
                xp = 5;
                starRating = 2;
            } else if (percentage > 0) {
                xp = 5;
                starRating = 1;
            } else {
                xp = 0;
                starRating = 0;
            }
        }

        return { xp, starRating };
    };
    // ─── TIMER LOGIC - FIXED ──────────────────────────────────────────────────────────
    const startTimer = (signs: string[], index: number) => {
        console.log('⏰ Starting timer for sign:', signs[index]);
        setIsTimerActive(true);
        setTimeLeft(10);

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Store the current signs and index in refs to avoid stale closures
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
                    // Use the captured values
                    handleTimeUp(currentSigns, currentIdx);
                    return 0;
                }
                return newTime;
            });
        }, 100);
    };

    const handleTimeUp = (signs: string[], index: number) => {
        if (isProcessingRef.current) return; // Prevent overlapping with successful detections
        setIsProcessing(true);

        console.log('⏰ Time up! Current index:', index, 'Total:', signs.length);

        if (signs.length === 0 || index >= signs.length) {
            setIsProcessing(false);
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
            }]);
        }

        setTimeout(() => {
            console.log('⏰ Moving to next sign...');
            moveToNextSign(signs, index, false);
            setIsProcessing(false); // Unlock processing
        }, 1000);
    };

    const moveToNextSign = (signs: string[], index: number, success: boolean) => {
        // Safety check
        if (index >= signs.length) {
            console.log('⚠️ Index out of bounds');
            stopTimer();
            // 🔥 For infinite mode, don't show results - just start a new round
            if (mode === 'infinite') {
                const allGestures = MODULE_GESTURES[moduleType] || [];
                const shuffled = [...allGestures].sort(() => Math.random() - 0.5);
                setCurrentRoundSigns(shuffled);
                setCurrentIndex(0);
                setCompletedSigns(new Set());
                setTotalAttemptedSigns(prev => prev + shuffled.length);
                setRoundNumber(prev => prev + 1);
                startCountdown(shuffled);
            } else {
                showRoundResults();
            }
            return;
        }

        const sign = signs[index];
        console.log(`🔍 moveToNextSign: sign=${sign}, success=${success}, index=${index}, total=${signs.length}`);

        if (success) {
            masteredSigns.add(sign);
            completedSigns.add(sign);
            setSenyaMessage(getRandomMessage(SENYA_MESSAGES.correct));
        } else {
            setSenyaMessage(getRandomMessage(SENYA_MESSAGES.struggle));
        }

        const nextIndex = index + 1;
        console.log(`🔍 nextIndex=${nextIndex}, total=${signs.length}`);

        if (nextIndex >= signs.length) {
            // Round complete!
            console.log('🔍 Round complete!');
            stopTimer();

            if (mode === 'infinite') {
                const allGestures = MODULE_GESTURES[moduleType] || [];
                const shuffled = [...allGestures].sort(() => Math.random() - 0.5);

                setCurrentRoundSigns(shuffled);
                setCurrentIndex(0);
                setCompletedSigns(new Set());

                // Add completely finished round to the running total
                setInfiniteSignCount(prev => prev + signs.length);
                setTotalAttemptedSigns(prev => prev + signs.length);
                setRoundNumber(prev => prev + 1);

                startCountdown(shuffled);
            } else {
                showRoundResults();
            }
        } else {
            console.log(`🔍 Moving to next sign: ${signs[nextIndex]}`);
            setCurrentIndex(nextIndex);
            startTimer(signs, nextIndex);
        }
    };

    // ─── MODIFIED START ROUND FOR INFINITE ──────────────────────────────────────────
    const startRound = (signs: string[]) => {
        if (signs.length === 0) {
            if (mode === 'master') {
                setIsComplete(true);
                setSenyaMessage(SENYA_MESSAGES.complete);
            } else {
                // Infinite mode: loop forever - just get all signs again
                const allGestures = MODULE_GESTURES[moduleType] || [];
                const shuffled = [...allGestures].sort(() => Math.random() - 0.5);
                setCurrentRoundSigns(shuffled);
                setCurrentIndex(0);
                // 🔥 FIX: Add to both counters
                setInfiniteSignCount(prev => prev + shuffled.length);
                setTotalAttemptedSigns(prev => prev + shuffled.length);
                startCountdown(shuffled);
            }
            return;
        }

        let roundSigns: string[];
        if (mode === 'infinite') {
            const allGestures = MODULE_GESTURES[moduleType] || [];
            const shuffled = [...allGestures].sort(() => Math.random() - 0.5);
            roundSigns = shuffled;
            // 🔥 FIX: Add to both counters
            setInfiniteSignCount(prev => prev + roundSigns.length);
            setTotalAttemptedSigns(prev => prev + roundSigns.length);
        } else {
            roundSigns = signs.slice(0, 10);
        }

        console.log(`📋 Starting round ${roundNumber} with ${roundSigns.length} signs:`, roundSigns);

        setCurrentRoundSigns(roundSigns);
        setCurrentIndex(0);
        setCompletedSigns(new Set());
        startCountdown(roundSigns);
    };


    // ─── COUNTDOWN LOGIC ──────────────────────────────────────────────────────
    const startCountdown = (signs: string[]) => {
        if (countdownRef.current) clearInterval(countdownRef.current);

        setCountdown(5);
        setSenyaMessage(`Round ${roundNumber} starting in 5...`);

        let count = 5;
        countdownRef.current = setInterval(() => {
            count -= 1;
            if (count > 0) {
                setCountdown(count);
                setSenyaMessage(`Round ${roundNumber} starting in ${count}...`);
            } else {
                if (countdownRef.current) clearInterval(countdownRef.current);
                setCountdown(null);
                setSenyaMessage(`Round ${roundNumber}: ${signs.length} signs to practice!`);
                startTimer(signs, 0);
            }
        }, 1000);
    };
    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsTimerActive(false);
    };

    // ─── START INFINITE MODE ──────────────────────────────────────────────────────
    const startInfiniteMode = () => {
        const allGestures = MODULE_GESTURES[moduleType] || [];
        const shuffled = [...allGestures].sort(() => Math.random() - 0.5);

        setCurrentRoundSigns(shuffled);
        setCurrentIndex(0);
        setCompletedSigns(new Set());

        // Start counts at 0 for a running tally!
        setInfiniteSignCount(0);
        setTotalAttemptedSigns(0);
        setShowFinishButton(true);
        setSenyaMessage('♾️ Infinite Mode - Keep practicing!');

        startCountdown(shuffled);
    };

    const handleInfiniteMode = () => {
        const allGestures = MODULE_GESTURES[moduleType] || [];
        const shuffled = [...allGestures].sort(() => Math.random() - 0.5);
        const roundSigns = shuffled.slice(0, 10);

        setCurrentRoundSigns(roundSigns);
        setCurrentIndex(0);
        setTimeLeft(10);

        // Start timer with the signs array and index 0
        startTimer(roundSigns, 0);
        setSenyaMessage('♾️ Infinite mode - Keep practicing!');
    };


    // ─── SHOW ROUND RESULTS FOR INFINITE ──────────────────────────────────────────
    const showRoundResults = () => {
        stopTimer();

        // 🔥 FIX: Don't auto-show results in infinite mode on round completion
        if (mode === 'infinite') {
            if (currentIndex >= currentRoundSigns.length - 1) {
                const allGestures = MODULE_GESTURES[moduleType] || [];
                const shuffled = [...allGestures].sort(() => Math.random() - 0.5);
                setCurrentRoundSigns(shuffled);
                setCurrentIndex(0);
                setCompletedSigns(new Set());
                setTotalAttemptedSigns(prev => prev + shuffled.length);
                setRoundNumber(prev => prev + 1);
                setSenyaMessage(`♾️ Round ${roundNumber + 1} - Keep practicing!`);
                startCountdown(shuffled);
                return;
            }
            return;
        }

        // Master mode: show results
        const mastered = Array.from(masteredSigns);
        const remaining = weakSigns.filter(s => !mastered.includes(s));
        setRemainingSigns(remaining);

        const attemptsData: Record<string, { correct: number; wrong: number }> = {};
        sessionHistory.forEach(session => {
            if (!attemptsData[session.sign]) {
                attemptsData[session.sign] = { correct: 0, wrong: 0 };
            }
            if (session.success) {
                attemptsData[session.sign].correct += session.attempts;
            } else {
                attemptsData[session.sign].wrong += 1;
            }
        });

        const result: ChallengeResult = {
            totalSigns: allSigns.length,
            masteredSigns: mastered,
            remainingSigns: remaining,
            attempts: attemptsData,
            timePerSign: {},
        };

        const masteredCount = mastered.length;
        const totalInRound = weakSigns.length;
        // ✅ Use calculateXP instead of manual calculation
        const { xp, starRating: calculatedStars } = calculateXP(masteredCount, totalInRound);

        setStarRating(calculatedStars);
        setXpEarned(xp);

        playCompleteSound();
        setResultsData(result);
        setShowResults(true);
    };


    // ─── HANDLE CONTINUE AFTER RESULTS (for infinite mode) ──────────────────────────
    const handleContinueAfterResults = async () => {
        setShowResults(false);

        if (mode === 'infinite') {
            // 🔥 FIX: On finish, award XP and navigate to XP progress
            const result = await awardModuleXp(starRating);
            await saveChallengeResults();

            if (result && result.xp_earned > 0) {
                const level = result.level || 1;
                const totalXp = result.total_xp || 0;
                const xpEarned = result.xp_earned || 0;
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
            return;
        }

        // Master mode logic (unchanged)
        const remaining = remainingSigns;
        if (remaining.length === 0) {
            const result = await awardModuleXp(starRating);
            await saveChallengeResults();

            if (result && result.xp_earned > 0) {
                const level = result.level || 1;
                const totalXp = result.total_xp || 0;
                const xpEarned = result.xp_earned || 0;
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
        } else {
            setRoundNumber(prev => prev + 1);
            startRound(remaining);
        }
    };
    // ─── HANDLE FINISH INFINITE MODE ──────────────────────────────────────────
    const handleFinishInfinite = async () => {
        stopTimer();
        setIsProcessing(true);

        const mastered = Array.from(masteredSigns);
        const attemptsData: Record<string, { correct: number; wrong: number }> = {};

        sessionHistory.forEach(session => {
            if (!attemptsData[session.sign]) {
                attemptsData[session.sign] = { correct: 0, wrong: 0 };
            }
            if (session.success) {
                attemptsData[session.sign].correct += session.attempts;
            } else {
                attemptsData[session.sign].wrong += 1;
            }
        });

        // Exact number of signs attempted
        const totalShown = infiniteSignCount + currentIndex;
        const finalTotal = totalShown > 0 ? totalShown : 1;

        const result: ChallengeResult = {
            totalSigns: finalTotal,
            masteredSigns: mastered,
            remainingSigns: [],
            attempts: attemptsData,
            timePerSign: {},
        };

        const masteredCount = mastered.length;
        // ✅ Use calculateXP instead of manual calculation
        const { xp, starRating: calculatedStars } = calculateXP(masteredCount, finalTotal);

        console.log(`🎯 Finish - Mastered: ${masteredCount}/${finalTotal}, XP: ${xp}, Stars: ${calculatedStars}`);

        setStarRating(calculatedStars);
        setXpEarned(xp);
        setResultsData(result);
        setShowResults(true);
        setShowFinishButton(false);
        setIsProcessing(false);
    };

    // ─── GET LEVEL NAME ──────────────────────────────────────────────────────────
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
        return levelNames[level] || 'Level ' + level;
    };

    // ─── GET NEXT LEVEL XP ──────────────────────────────────────────────────────────
    const getNextLevelXp = (level: number): number => {
        const thresholds: Record<number, number> = {
            1: 0, 2: 100, 3: 250, 4: 500, 5: 800,
            6: 1200, 7: 1700, 8: 2300, 9: 3000, 10: 4000,
        };
        const nextLevel = level + 1;
        return thresholds[nextLevel] || 4000 + ((level - 9) * 1000);
    };

    // ─── AWARD XP ──────────────────────────────────────────────────────────────
    const awardModuleXp = async (starRating: number) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                console.log('ℹ️ No auth token found, skipping XP award');
                return null;
            }

            const moduleNameMap: Record<string, string> = {
                'alphabet': 'alphabet_part1',
                'numbers': 'level1_numbers',
                'greetings': 'level2_greetings',
                'survival': 'level3_survival',
            };
            const moduleName = moduleNameMap[moduleType] || moduleType;

            // ✅ Use the XP that was already calculated and stored
            // The star rating determines the XP amount, but we already have the XP value
            // from calculateXP - use the xpEarned state
            const xpToAward = xpEarned; // Use the state value from calculateXP

            console.log(`⭐ Awarding Challenge XP for ${moduleName} with ${starRating} star(s)...`);
            console.log(`📊 XP to award: ${xpToAward}`);

            // 🔥 Use the new challenge XP endpoint (no cap)
            const result = await api.awardChallengeXp(moduleName, xpToAward, starRating);

            if (result && result.success) {
                console.log(`✅ ${result.xp_message}`);
                return result;
            }
            return null;
        } catch (error) {
            console.error('❌ Error awarding challenge XP:', error);
            return null;
        }
    };
    // ─── SAVE CHALLENGE RESULTS ─────────────────────────────────────────
    const saveChallengeResults = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const moduleNameMap: Record<string, string> = {
                'alphabet': 'alphabet_part1',
                'numbers': 'level1_numbers',
                'greetings': 'level2_greetings',
                'survival': 'level3_survival',
            };
            const moduleName = moduleNameMap[moduleType] || moduleType;

            // Convert session history to API format
            const performance = allSigns.map(sign => {
                const history = sessionHistory.filter(h => h.sign === sign);
                // Sum up all attempts (including bonuses)
                const totalAttempts = history.reduce((sum, h) => sum + h.attempts, 0);
                const successCount = history.filter(h => h.success).length;

                return {
                    letter: sign,
                    attempts: totalAttempts || 0,
                    wrong_attempts: totalAttempts - successCount || 0,
                    success_count: successCount || 0,
                    consecutive_wrong: 0,
                };
            });

            console.log(`📤 Saving challenge results for module: ${moduleName}`);
            console.log('📊 Performance data:', JSON.stringify(performance, null, 2));

            const result = await api.saveGesturePerformance(
                moduleName,
                performance,
                `challenge_${mode}_${Date.now()}`
            );

            if (result && result.success) {
                console.log('✅ Challenge results saved successfully!');
            }

            const starRating = remainingSigns.length === 0 ? 3 :
                remainingSigns.length <= 3 ? 2 : 1;
            await api.awardModuleXp(moduleName, starRating);

        } catch (error) {
            console.error('❌ Error saving challenge results:', error);
        }
    };


    // ─── HELPERS ──────────────────────────────────────────────────────────
    const getResults = () => {
        if (!resultsData) {
            return {
                totalTime: '0s',
                strugglingLetters: [],
                easyLetters: [],
                totalCorrect: 0,
                totalWrong: 0,
                masteredCount: 0,
                totalCount: 0
            };
        }

        const totalSecs = Math.round(sessionHistory.reduce((sum, s) => sum + s.timeTaken, 0));
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;
        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        const strugglingLetters = Object.entries(resultsData.attempts)
            .filter(([_, attempt]) => attempt.wrong >= 2)
            .sort((a, b) => b[1].wrong - a[1].wrong)
            .map(([sign]) => sign)
            .slice(0, 3);

        const easyLetters = Object.entries(resultsData.attempts)
            .filter(([_, attempt]) => attempt.correct > 0 && attempt.wrong === 0)
            .map(([sign]) => sign);

        const totalCorrect = resultsData.masteredSigns.length;
        const totalWrong = Object.values(resultsData.attempts).reduce((sum, a) => sum + a.wrong, 0);

        // 🔥 FIX: Use resultsData.totalSigns (which is infiniteSignCount)
        const totalCount = resultsData.totalSigns;

        return {
            totalTime: timeDisplay,
            strugglingLetters,
            easyLetters,
            totalCorrect,
            totalWrong,
            masteredCount: resultsData.masteredSigns.length,
            totalCount: totalCount,
        };
    };
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

    const animateSenyaBounce = () => {
        senyaBounceAnim.setValue(0);
        Animated.spring(senyaBounceAnim, {
            toValue: 1,
            friction: 4,
            tension: 90,
            useNativeDriver: true,
        }).start(() => senyaBounceAnim.setValue(0));
    };

    const getDotFontSize = (word: string) => {
        const len = (word ?? '').length;
        if (len <= 2) return 22;
        if (len <= 4) return 20;
        if (len <= 6) return 18;
        if (len <= 8) return 16;
        if (len <= 12) return 14;
        return 12;
    };

    // ─── HANDLE DETECTION ──────────────────────────────────────────────
    const handleMessage = (event: any) => {
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

            if (confidence < 0.6 || !detectedValue || detectedValue === '✋' || detectedValue === '...') {
                setLiveLetter('—');
                setLiveConfidence(0);
                return;
            }

            setIsConnected(true);
            if (loading) setLoading(false);

            // Map detected value
            let matchValue = detectedValue;

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

            const NUMBERS_TO_DISPLAY: Record<string, string> = {
                'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5',
                'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9', 'TEN': '10'
            };

            if (SURVIVAL_TO_DISPLAY[detectedValue]) matchValue = SURVIVAL_TO_DISPLAY[detectedValue];
            else if (GREETING_TO_DISPLAY[detectedValue]) matchValue = GREETING_TO_DISPLAY[detectedValue];
            else if (NUMBERS_TO_DISPLAY[detectedValue]) matchValue = NUMBERS_TO_DISPLAY[detectedValue];
            else if (detectedValue.length === 1 && detectedValue >= 'A' && detectedValue <= 'Z') {
                matchValue = detectedValue;
            }

            setLiveLetter(matchValue);
            setLiveConfidence(Math.round(confidence * 100));

            // Check if it matches the target - ONLY if timer is active
            if (matchValue === currentTarget && !isProcessing && !isComplete && isTimerActive) {
                // Success!
                setIsProcessing(true);
                stopTimer();

                // ─── GAMIFIED BONUS SYSTEM ──────────────────────────────
                const timeTaken = 10 - timeLeft;

                let timeBonus = 0;
                let bonusType: 'lightning' | 'fire' | 'great' | 'none' = 'none';

                if (timeTaken <= 3) {
                    timeBonus = 3;
                    bonusType = 'lightning';
                } else if (timeTaken <= 6) {
                    timeBonus = 2;
                    bonusType = 'fire';
                } else if (timeTaken <= 9) {
                    timeBonus = 1;
                    bonusType = 'great';
                }

                const confidenceBonus = confidence > 0.85 ? 1 : 0;
                const totalBonus = 1 + timeBonus + confidenceBonus;

                console.log(`🎯 ${matchValue} - Time: ${timeTaken.toFixed(1)}s, Bonus: +${timeBonus}, Total: ${totalBonus} attempts`);

                // Play sound and animate
                playGestureSound();
                animateSenyaBounce();

                // ─── SHOW BONUS POPUP ──────────────────────────────────────
                let bonusDisplayMessage = `+${totalBonus} attempts!`;
                if (bonusType === 'lightning') {
                    bonusDisplayMessage = `⚡ LIGHTNING FAST! +${totalBonus} attempts!`;
                } else if (bonusType === 'fire') {
                    bonusDisplayMessage = `🔥 FAST! +${totalBonus} attempts!`;
                } else if (bonusType === 'great') {
                    bonusDisplayMessage = `💪 Great! +${totalBonus} attempts!`;
                }

                // Show the bonus popup ONLY (no duplicate success popup)
                showBonusEffect(bonusType, bonusDisplayMessage);

                // Update session history with bonus attempts
                setSessionHistory(prev => [...prev, {
                    sign: currentTarget,
                    success: true,
                    timeTaken: timeTaken,
                    attempts: totalBonus,
                }]);

                // Move to next sign after delay
                setTimeout(() => {
                    // Use currentRoundSigns, not the state which might be stale
                    moveToNextSign(currentRoundSigns, currentIndex, true);
                    setIsProcessing(false);
                }, 800);
            }
        } catch (error) {
            console.error('Error handling WebView message:', error);
            setIsProcessing(false);
        }
    };

    // ─── SHOW BONUS EFFECT ──────────────────────────────────────────────────────
    const showBonusEffect = (type: 'lightning' | 'fire' | 'great' | 'none', message: string) => {
        setBonusType(type);
        setBonusMessage(message);
        setShowBonusPopup(true);

        // Reset animations
        bonusScaleAnim.setValue(0);
        bonusOpacityAnim.setValue(0);
        particleAnims.forEach(anim => anim.setValue(0));

        // Only 3 particles
        const particleSprings = particleAnims.map((anim, idx) => {
            return Animated.sequence([
                Animated.delay(idx * 100),
                Animated.spring(anim, {
                    toValue: 1,
                    friction: 5,
                    tension: 70,
                    useNativeDriver: true,
                })
            ]);
        });

        Animated.parallel([
            Animated.spring(bonusScaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.timing(bonusOpacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            ...particleSprings,
        ]).start();

        setTimeout(() => {
            const particleFades = particleAnims.map(anim => {
                return Animated.timing(anim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                });
            });

            Animated.parallel([
                Animated.timing(bonusScaleAnim, {
                    toValue: 0.5,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(bonusOpacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                ...particleFades,
            ]).start(() => {
                setShowBonusPopup(false);
            });
        }, 1500);
    };


    // ─── PLAY SOUND ──────────────────────────────────────────────────────
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

    // ── Play completion sound ──
    async function playCompleteSound() {
        try {
            if (completeSound) {
                await completeSound.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/music/gesture-complete.mp3'),
                {
                    shouldPlay: true,
                    isLooping: false,
                    volume: 1.0, // full volume celebration
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
            console.error('Failed to play completion sound:', error);
        }
    }

    // ─── INJECT JS ──────────────────────────────────────────────────────
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
        
        console.log('🎯 Challenge mode activated!');
        
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
        const url = MODULE_URLS[moduleType] || GESTURE_URL_ALPHABET;
        try {
            await WebBrowser.openBrowserAsync(url + '?ngrok-skip-browser-warning=true');
        } catch (error) {
            console.error('Error opening browser:', error);
        }
    };

    // ─── CLEANUP ─────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (gestureSound) gestureSound.unloadAsync();
        };
    }, []);

    // ─── CAMERA PERMISSION ──────────────────────────────────────────────
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
                    <Pressable style={styles.skipBtn} onPress={() => router.back()}>
                        <Text style={styles.skipBtnText}>Go Back</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    // ─── RENDER ──────────────────────────────────────────────────────────
    const gestureUrl = MODULE_URLS[moduleType] || GESTURE_URL_ALPHABET;
    const progress = currentRoundSigns.length > 0
        ? (currentIndex / currentRoundSigns.length)
        : 0;
    const senyaTranslate = senyaBounceAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });



    return (
        <SafeAreaView style={styles.container}>
            {/* ─── HEADER ────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={20} color="#0f3172" />
                </Pressable>
                <Text style={styles.headerTitle}>
                    {mode === 'master' ? '🏆 Master Challenge' : '♾️ Infinite Practice'}
                </Text>
                <View style={styles.headerRight}>
                    {mode === 'infinite' && showFinishButton && (
                        <TouchableOpacity
                            style={styles.finishButton}
                            onPress={handleFinishInfinite}
                        >
                            <Ionicons name="stop-circle" size={18} color="#fff" />
                            <Text style={styles.finishButtonText}>Finish</Text>
                        </TouchableOpacity>
                    )}
                    <View style={[styles.statusBadge, isConnected && styles.statusActive]}>
                        <View style={[styles.statusDot, isConnected && styles.statusDotActive]} />
                        <Text style={[styles.statusText, isConnected && styles.statusActiveText]}>
                            {isConnected ? 'Live' : 'Loading'}
                        </Text>
                    </View>
                </View>
            </View>
            {/* ─── ROUND INFO ────────────────────────────────────────────── */}
            <View style={styles.roundInfo}>
                <View style={styles.roundBadge}>
                    <Text style={styles.roundBadgeText}>Round {roundNumber}</Text>
                </View>
                <View style={styles.timerBadge}>
                    <Ionicons name="time-outline" size={16} color="#EF4444" />
                    <Text style={[styles.timerText, timeLeft <= 3 && styles.timerUrgent]}>
                        {Math.ceil(timeLeft)}s
                    </Text>
                </View>
                <View style={styles.progressBadge}>
                    <Text style={styles.progressBadgeText}>
                        {mode === 'infinite'
                            ? `Sign ${infiniteSignCount + currentIndex + 1}`
                            : `${currentIndex + 1}/${currentRoundSigns.length}`}
                    </Text>
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

                {/* ─── HUD: TOP-LEFT — target sign overlay ───────────── */}
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
                    <Text style={styles.targetHint}>
                        {mode === 'master' ? `${remainingSigns.length} signs left to master` : 'Keep practicing!'}
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
                    <View style={styles.senyaBubbleWrapper} pointerEvents="none">
                        <View style={styles.senyaBubble}>
                            <Text style={styles.senyaBubbleText} numberOfLines={3}>
                                {senyaMessage}
                            </Text>
                            <View style={styles.senyaBubbleTail} />
                        </View>
                    </View>
                    <Image
                        source={require('../../assets/images/img/senya_teaching.png')}
                        style={styles.senyaImg}
                        contentFit="contain"
                    />
                </Animated.View>
                {/* ─── COUNTDOWN OVERLAY ────────────────────────────── */}
                {countdown !== null && (
                    <View style={styles.countdownOverlay}>
                        <Text style={styles.countdownText}>{countdown}</Text>
                        <Text style={styles.countdownSubtext}>Get ready!</Text>
                    </View>
                )}

                {/* Timer Countdown Bar - only show when not in countdown */}
                {countdown === null && (
                    <View style={styles.timerBarContainer}>
                        <View style={[
                            styles.timerBarFill,
                            {
                                width: `${(timeLeft / 10) * 100}%`,
                                backgroundColor: timeLeft <= 3 ? '#EF4444' : timeLeft <= 5 ? '#F59E0B' : '#10B981',
                            }
                        ]} />
                        <Text style={styles.timerBarText}>
                            {Math.ceil(timeLeft)}s
                        </Text>
                    </View>
                )}

                {/* Show current sign and round progress */}
                <View style={styles.progressInfo}>
                    <Text style={styles.progressInfoText}>
                        {mode === 'infinite'
                            ? `Sign ${infiniteSignCount + currentIndex + 1}`
                            : `${currentIndex + 1} / ${currentRoundSigns.length}`}
                    </Text>
                    {mode === 'master' && (
                        <Text style={styles.progressInfoSubtext}>
                            {remainingSigns.length} signs left to master
                        </Text>
                    )}
                    {mode === 'infinite' && (
                        <Text style={styles.progressInfoSubtext}>
                            {masteredSigns.size} mastered so far
                        </Text>
                    )}
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

                {/* ─── BONUS POPUP (constrained to webview area) ─── */}
                {showBonusPopup && (
                    <View style={styles.bonusContainer} pointerEvents="none">
                        {/* Radiating burst particles around the badge */}
                        {[
                            { id: 0, angle: -90, distance: 90, emoji: bonusType === 'lightning' ? '⚡' : bonusType === 'fire' ? '🔥' : '⭐', size: 30 },
                            { id: 1, angle: -30, distance: 100, emoji: '✨', size: 22 },
                            { id: 2, angle: 210, distance: 100, emoji: '✨', size: 22 },
                        ].map((p, idx) => {
                            const anim = particleAnims[idx];
                            const rad = (p.angle * Math.PI) / 180;
                            const tx = anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, Math.cos(rad) * p.distance],
                            });
                            const ty = anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, Math.sin(rad) * p.distance],
                            });
                            const opacity = anim.interpolate({
                                inputRange: [0, 0.15, 0.75, 1],
                                outputRange: [0, 1, 1, 0],
                            });
                            const scale = anim.interpolate({
                                inputRange: [0, 0.3, 1],
                                outputRange: [0.4, 1.2, 0.8],
                            });
                            return (
                                <Animated.Text
                                    key={p.id}
                                    style={[
                                        styles.floatingParticle,
                                        {
                                            fontSize: p.size,
                                            opacity,
                                            transform: [{ translateX: tx }, { translateY: ty }, { scale }],
                                        },
                                    ]}
                                >
                                    {p.emoji}
                                </Animated.Text>
                            );
                        })}

                        {/* Sleek badge */}
                        <Animated.View
                            style={[
                                styles.bonusContent,
                                bonusType === 'lightning' && styles.bonusLightning,
                                bonusType === 'fire' && styles.bonusFire,
                                bonusType === 'great' && styles.bonusGreat,
                                {
                                    opacity: bonusOpacityAnim,
                                    transform: [{ scale: bonusScaleAnim }],
                                },
                            ]}
                        >
                            <Text style={styles.bonusEmoji}>
                                {bonusType === 'lightning' ? '⚡' :
                                    bonusType === 'fire' ? '🔥' :
                                        bonusType === 'great' ? '💪' : '✨'}
                            </Text>
                            <View style={styles.bonusTextColumn}>
                                <Text style={styles.bonusTitleText}>
                                    {bonusType === 'lightning' ? 'LIGHTNING FAST!' :
                                        bonusType === 'fire' ? 'ON FIRE!' :
                                            bonusType === 'great' ? 'GREAT JOB!' : 'NICE!'}
                                </Text>
                                <Text style={styles.bonusSubtitleText}>{bonusMessage}</Text>
                            </View>
                        </Animated.View>
                    </View>
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

            {/* ─── POPUP ──────────────────────────── */}
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

            {/* ─── RESULTS MODAL ──────────────────── */}
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

                        <Text style={styles.modalTitle}>
                            {masteredSigns.size >= allSigns.length && allSigns.length > 0 ? 'You Did It!' : 'Round Complete!'}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            {(() => {
                                const r = getResults();
                                const allDone = masteredSigns.size >= allSigns.length && allSigns.length > 0;
                                return allDone
                                    ? `All ${allSigns.length} signs mastered!`
                                    : `${r.masteredCount} of ${r.totalCount} signs mastered this round`;
                            })()}
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
                        {resultsData && (() => {
                            const results = getResults();
                            const masteredCount = results.masteredCount;
                            const totalCount = results.totalCount;
                            const percentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
                            const { xp } = calculateXP(masteredCount, totalCount);

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
                                                <Ionicons name="checkmark-circle" size={20} color="#0f3172" />
                                            </View>
                                            <Text style={styles.resultValue}>
                                                {masteredCount}/{totalCount}
                                            </Text>
                                            <Text style={styles.resultGridLabel}>Mastered</Text>
                                        </View>
                                        <View style={styles.resultItemDivider} />
                                        <View style={styles.resultItem}>
                                            <View style={styles.resultIconWrap}>
                                                <Ionicons name="star" size={20} color="#F59E0B" />
                                            </View>
                                            <Text style={[styles.resultValue, { color: '#F59E0B' }]}>
                                                +{xp} XP
                                            </Text>
                                            <Text style={styles.resultGridLabel}>Earned</Text>
                                        </View>
                                    </View>

                                    {/* Progress bar */}
                                    <View style={styles.progressBarContainer}>
                                        <View style={styles.progressBarTrack}>
                                            <View
                                                style={[
                                                    styles.progressBarFill,
                                                    {
                                                        width: `${percentage}%`,
                                                        backgroundColor: percentage >= 80 ? '#10B981' :
                                                            percentage >= 60 ? '#F59E0B' :
                                                                percentage >= 40 ? '#F97316' : '#EF4444'
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.progressBarText}>{percentage}% Complete</Text>
                                    </View>

                                    {/* Notes */}
                                    <View style={styles.senyaFeedback}>
                                        <View style={styles.feedbackHeader}>
                                            <Ionicons name="document-text-outline" size={16} color="#0f3172" />
                                            <Text style={styles.feedbackTitle}>Senya's Notes</Text>
                                        </View>
                                        {(() => {
                                            const items: { icon: any; color: string; text: string }[] = [];

                                            if (percentage === 100) {
                                                items.push({ icon: 'sparkles', color: '#FFC93C', text: "PERFECT! You're amazing! 🌟" });
                                            } else if (percentage >= 80) {
                                                items.push({ icon: 'flame', color: '#FF7A45', text: 'Great work! Almost perfect!' });
                                            } else if (percentage >= 60) {
                                                items.push({ icon: 'thumbs-up', color: '#4b7bbb', text: 'Good job! Keep practicing for 3 stars!' });
                                            } else if (percentage >= 40) {
                                                items.push({ icon: 'refresh', color: '#4b7bbb', text: 'Keep going! You\'ll get there!' });
                                            } else {
                                                items.push({ icon: 'bulb', color: '#4b7bbb', text: 'Practice makes perfect! Try again!' });
                                            }

                                            if (results.strugglingLetters.length > 0) {
                                                items.push({
                                                    icon: 'alert-circle-outline',
                                                    color: '#E11D48',
                                                    text: `Need help: ${results.strugglingLetters.join(', ')}`,
                                                });
                                            }

                                            if (results.easyLetters.length > 0) {
                                                items.push({
                                                    icon: 'checkmark-circle',
                                                    color: '#10B981',
                                                    text: `Nailed: ${results.easyLetters.join(', ')}`,
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
                            onPress={handleContinueAfterResults}
                        >
                            <Text style={styles.continueButtonText}>
                                {masteredSigns.size >= allSigns.length && allSigns.length > 0
                                    ? '🎉 All Done!'
                                    : `Continue (${resultsData ? resultsData.remainingSigns.length : 0} left)`}
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

    roundInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },
    roundBadge: {
        backgroundColor: '#0F3172',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roundBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    timerText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#EF4444',
    },
    timerUrgent: {
        color: '#DC2626',
        fontSize: 16,
    },
    progressBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    progressBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },

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
        minWidth: 34,
        minHeight: 34,
        paddingHorizontal: 8,
        paddingVertical: 4,
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

    senyaFloat: {
        position: 'absolute',
        right: 2,
        bottom: 35,
        alignItems: 'flex-end',
    },
    senyaBubbleWrapper: {
        alignItems: 'flex-end',
        marginBottom: -10,
        marginRight: 60,
        alignSelf: 'flex-end',
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
        flexShrink: 0,
        alignSelf: 'flex-start',
        maxWidth: SCREEN_WIDTH * 0.55,
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
    senyaImg: { width: 62, height: 62, bottom: 40, },

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

    // ─── RESULTS MODAL ─────────────────────────────────────────────────
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

    // ─── COMPLETE SCREEN ──────────────────────────────────────────────
    completeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#eaf5fd',
    },
    completeCard: {
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 32,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    completeTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f3172',
        textAlign: 'center',
        marginTop: 16,
    },
    completeSubtitle: {
        fontSize: 14,
        color: '#4b7bbb',
        textAlign: 'center',
        marginTop: 4,
    },
    completeStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 24,
        marginBottom: 24,
        paddingVertical: 16,
        backgroundColor: '#f7faff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.08)',
    },
    completeStat: {
        alignItems: 'center',
    },
    completeStatValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f3172',
    },
    completeStatLabel: {
        fontSize: 11,
        color: '#4b7bbb',
        fontWeight: '600',
        marginTop: 2,
    },
    completeStatDivider: {
        width: 1,
        backgroundColor: 'rgba(15,49,114,0.1)',
    },
    completeButton: {
        backgroundColor: '#0f3172',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 60,
        width: '100%',
        gap: 8,
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    completeButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    timerBarContainer: {
        width: '100%',
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 12,
    },
    timerBarFill: {
        height: '100%',
        borderRadius: 4,
        backgroundColor: '#10B981',

    },
    timerBarText: {
        position: 'absolute',
        right: 0,
        top: -18,
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    signIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    signDot: {
        minWidth: 30,
        minHeight: 30,
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    signDotCompleted: {
        backgroundColor: 'rgba(16,185,129,0.3)',
        borderColor: '#10B981',
    },
    signDotSkipped: {
        backgroundColor: 'rgba(239,68,68,0.3)',
        borderColor: '#EF4444',
    },
    signDotActive: {
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255,215,0,0.25)',
        transform: [{ scale: 1.15 }],
        shadowColor: '#FFD700',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    signDotText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    signDotTextCompleted: {
        color: '#10B981',
    },
    signDotTextSkipped: {
        color: '#EF4444',
    },
    signDotTextActive: {
        color: '#fff',
        fontWeight: '900',
    },
    // Add to styles
    progressInfo: {
        alignItems: 'center',
        marginTop: 4,
    },
    progressInfoText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
    },
    progressInfoSubtext: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    countdownOverlay: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
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

    // ─── BONUS POPUP STYLES (Clean) ────────────────────────────────────────────────────
    bonusContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        pointerEvents: 'none',
    },
    bonusContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 50,
        paddingVertical: 10,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1.5,
        maxWidth: SCREEN_WIDTH * 0.8,
    },
    bonusLightning: {
        borderColor: '#FFD700',
        backgroundColor: '#FFFDF0',
    },
    bonusFire: {
        borderColor: '#FF6B35',
        backgroundColor: '#FFF8F5',
    },
    bonusGreat: {
        borderColor: '#10B981',
        backgroundColor: '#F4FBF7',
    },
    bonusEmoji: {
        fontSize: 30,
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    bonusTextColumn: {
        flexDirection: 'column',
    },
    bonusTitleText: {
        fontSize: 13,
        fontWeight: '900',
        color: '#0f3172',
    },
    bonusSubtitleText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4b7bbb',
    },
    floatingParticle: {
        position: 'absolute',
        zIndex: 350,
        textShadowColor: 'rgba(255,215,0,0.9)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    // ─── PROGRESS BAR STYLES ────────────────────────────────────────────────────
    progressBarContainer: {
        width: '100%',
        marginBottom: 12,
    },
    progressBarTrack: {
        height: 8,
        backgroundColor: 'rgba(15,49,114,0.08)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressBarText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4b7bbb',
        marginTop: 4,
        textAlign: 'center',
    },
    finishButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    finishButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },

});