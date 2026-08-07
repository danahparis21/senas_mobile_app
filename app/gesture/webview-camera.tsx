// app/gesture/webview-camera.tsx
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

// Alphabet Part 1: A-M
const ALPHABET_PART1 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
// ─── SIGN LANGUAGE MEDIA MAPPING ───────────────────────────────────────────
// Based on your file structure: sign_language_media/Alphabets/
// Images for letters that have static images, videos for those with video files
const SIGN_MEDIA: Record<string, { url: string; isVideo: boolean }> = {
    'A': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/1_A.png', isVideo: false },
    'B': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/2_B.png', isVideo: false },
    'C': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/3_C.png', isVideo: false },
    'D': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/4_D.png', isVideo: false },
    'E': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/5_E.png', isVideo: false },
    'F': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/6_F.png', isVideo: false },
    'G': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/7_G.png', isVideo: false },
    'H': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/8_H.png', isVideo: false },
    'I': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/9_I.png', isVideo: false },
    'J': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/10_J.mp4', isVideo: true },
    'K': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/11_K.png', isVideo: false },
    'L': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/12_L.png', isVideo: false },
    'M': { url: 'http://192.168.1.45:8000/storage/sign_language_media/Alphabets/13_M.png', isVideo: false },
};

// Senya's encouragement messages (without emojis)
const SENYA_MESSAGES = {
    welcome: "Let's learn A–M together!",
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
    usePracticeTimeTracker();
    const { settings, refreshSettings } = useSettings();

    const webViewRef = useRef<WebView>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(true);
    const [detectedLetter, setDetectedLetter] = useState('✋');
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

    // Add these functions for the hint button animations
    const animateHintButton = () => {
        // Pulse animation
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

        // Shake animation
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

        // Reset after 5 seconds
        setTimeout(() => {
            setIsStruggling(false);
        }, 5000);
    };


    useFocusEffect(
        useCallback(() => {
            console.log('🔄 WebView Camera screen focused, refreshing settings...');
            refreshSettings();
        }, [refreshSettings])
    );

    // ── Audio state ──
    const [gestureSound, setGestureSound] = useState<Audio.Sound | null>(null);
    const [completeSound, setCompleteSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(false);

    // Gamification state
    const [completedLetters, setCompletedLetters] = useState<Set<string>>(new Set());
    const [currentTarget, setCurrentTarget] = useState('A');
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
    const [letterWidth, setLetterWidth] = useState(50);

    // Senya message cooldown - prevents rapid flashing of messages
    const senyaMsgCooldownRef = useRef<number>(0);
    const SENYA_COOLDOWN_MS = 3000; // 3 seconds between non-critical messages

    const lastHintShownRef = useRef<number>(0);
    const HINT_COOLDOWN_MS = 5000;

    // ✅ FIX: hard time-based fallback. Tracks the last time the learner
    // actually made progress (signed the correct target letter). If too much
    // time passes with no progress — regardless of exact attempt counts,
    // which letter was shown, or whether it was an old completed letter —
    // we force the hint to show. This guarantees the hint can never get
    // "stuck" not appearing.
    const lastProgressTimeRef = useRef<number>(Date.now());
    const STUCK_TIMEOUT_MS = 10000;

    // Star animations for results modal
    const starAnim1 = useRef(new Animated.Value(0)).current;
    const starAnim2 = useRef(new Animated.Value(0)).current;
    const starAnim3 = useRef(new Animated.Value(0)).current;

    const detectionCooldownRef = useRef<number>(0);
    const DETECTION_COOLDOWN_MS = 1500;

    const soundCooldownRef = useRef<number>(0);
    const SOUND_COOLDOWN_MS = 800;

    // ─── HINTS NAVIGATION ──────────────────────────────────────────────────
    const getCurrentLetterForHints = () => {
        // Show the current target letter, or if all completed, show A
        return currentTarget || 'A';
    };

    // When hints modal opens, set the index to the current target letter
    const openHintsModal = () => {
        const currentLetter = getCurrentLetterForHints();
        const index = ALPHABET_PART1.indexOf(currentLetter);
        setHintsCurrentIndex(index >= 0 ? index : 0);
        setShowHintsModal(true);
    };

    const goToPreviousHint = () => {
        setHintsCurrentIndex(prev =>
            prev > 0 ? prev - 1 : ALPHABET_PART1.length - 1
        );
    };

    const goToNextHint = () => {
        setHintsCurrentIndex(prev =>
            prev < ALPHABET_PART1.length - 1 ? prev + 1 : 0
        );
    };

    const currentHintLetter = ALPHABET_PART1[hintsCurrentIndex];
    const currentHintMedia = SIGN_MEDIA[currentHintLetter];

    async function playGestureSound() {
        // Check if sound is enabled
        if (!settings.soundEnabled) {
            console.log('🔇 Sound disabled, skipping gesture sound');
            return;
        }

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
        if (!settings.soundEnabled) {
            console.log('🔇 Sound disabled, skipping complete sound');
            return;
        }

        try {
            if (completeSound) await completeSound.unloadAsync();
            const { sound } = await Audio.Sound.createAsync(
                GESTURE_COMPLETE_SOUND,
                { shouldPlay: true, isLooping: false, volume: 1.0 }
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

    // Get current target letter (first incomplete)
    const getCurrentTarget = () => {
        for (const letter of ALPHABET_PART1) {
            if (!completedLetters.has(letter)) return letter;
        }
        return null;
    };

    // Initialize letter tracking
    useEffect(() => {
        const initial: Record<string, LetterAttempt> = {};
        ALPHABET_PART1.forEach(letter => {
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
            const targetIndex = ALPHABET_PART1.indexOf(target);
            if (targetIndex >= 0 && scrollViewRef.current) {
                const slotWidth = 54;
                const scrollX = targetIndex * slotWidth - (width - 100) / 2;
                setTimeout(() => {
                    scrollViewRef.current?.scrollTo({
                        x: Math.max(0, scrollX),
                        animated: true,
                    });
                }, 100);
            }
        } else if (completedLetters.size === ALPHABET_PART1.length) {
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

    // Show cute popup
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

    const savedLettersRef = useRef<Set<string>>(new Set());

    const lastAttemptLetterRef = useRef<string>('');
    const lastAttemptTimeRef = useRef<number>(0);
    const MIN_ATTEMPT_INTERVAL = 1000;

    // ✅ FIX: refs for stability tracking, read/written synchronously so the
    // check below always sees the up-to-date count in the SAME call. The old
    // code used React state (letterStableCount) for this — state updates are
    // async, so the "if (letterStableCount < 2) return" check was always
    // reading the count from *before* the current frame's update, requiring
    // an extra frame every time. It also demanded the exact same letter twice
    // in a row, so if a wrong sign flickered between letters (very common
    // when someone deliberately does an "incorrect" shape, since it doesn't
    // match any class cleanly) the streak reset to 0 constantly and the
    // hint condition was never reached.
    const lastProcessedLetterRef = useRef<string>('');
    const letterStableCountRef = useRef<number>(0);
    const wrongStreakRef = useRef<number>(0);

    // Update the handleDetection function
    const handleDetection = async (data: any) => {
        const { letter, confidence: conf } = data;

        if (letter && letter !== '✋' && letter.length === 1) {
            setDetectedLetter(letter);
            setConfidence(conf || 0);
            setIsConnected(true);
            setShowBrowserButton(false);

            // Stability count for the SAME letter (used for confirming a
            // correct sign, to avoid counting a one-frame flicker as success)
            if (letter === lastProcessedLetterRef.current) {
                letterStableCountRef.current += 1;
            } else {
                lastProcessedLetterRef.current = letter;
                letterStableCountRef.current = 1;
            }
            setLastProcessedLetter(lastProcessedLetterRef.current);
            setLetterStableCount(letterStableCountRef.current);

            // Separate streak for WRONG attempts: counts consecutive frames
            // where the letter isn't the target, regardless of whether it's
            // the same wrong letter each time. This is what lets the hint
            // trigger even when someone does different wrong signs on purpose.
            const targetForStreak = getCurrentTarget();
            // ✅ FIX: a previously-completed letter shown by mistake (e.g.
            // holding B while the target is C) now ALSO counts as "wrong" for
            // streak purposes. It used to be excluded here, which meant that
            // path could never escalate to a hint no matter how long it went on.
            const isWrongLetterFrame =
                ALPHABET_PART1.includes(letter) &&
                letter !== targetForStreak;
            wrongStreakRef.current = isWrongLetterFrame ? wrongStreakRef.current + 1 : 0;

            if (letterStableCountRef.current < 2 && wrongStreakRef.current < 2) {
                return;
            }

            const now = Date.now();
            const isNewLetter = letter !== lastAttemptLetterRef.current;
            const isTimeForNewAttempt = now - lastAttemptTimeRef.current >= MIN_ATTEMPT_INTERVAL;

            if (isNewLetter || isTimeForNewAttempt) {
                lastAttemptLetterRef.current = letter;
                lastAttemptTimeRef.current = now;

                if (ALPHABET_PART1.includes(letter)) {
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
            }

            if (ALPHABET_PART1.includes(letter)) {
                const target = getCurrentTarget();

                if (letter === target) {
                    const now = Date.now();
                    const isCooldownOver = now - detectionCooldownRef.current >= DETECTION_COOLDOWN_MS;

                    // Signing the correct target letter is progress, so the
                    // "stuck too long" timer resets here, even before the
                    // detection-cooldown gate below.
                    lastProgressTimeRef.current = now;

                    if (!completedLetters.has(letter) && isCooldownOver) {
                        detectionCooldownRef.current = now;

                        const isSoundReady = now - soundCooldownRef.current >= SOUND_COOLDOWN_MS;
                        if (isSoundReady) {
                            soundCooldownRef.current = now;
                            await playGestureSound();
                        }

                        const newCompleted = new Set(completedLetters);
                        newCompleted.add(letter);
                        setCompletedLetters(newCompleted);
                        setConsecutiveWrong(0);
                        setTotalCorrectAttempts(prev => prev + 1);

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

                        if (!savedLettersRef.current.has(letter)) {
                            savedLettersRef.current.add(letter);
                            await saveSingleLetterPerformance(letter);
                        }

                        const msg = getRandomMessage(SENYA_MESSAGES.correct);
                        setSenyaMessage(msg);
                        senyaMsgCooldownRef.current = Date.now();

                        showCutePopup(
                            `${letter} ✓`,
                            `${completedLetters.size + 1}/${ALPHABET_PART1.length}`
                        );
                    }
                } else {
                    // ✅ UNIFIED WRONG-LETTER PATH — this covers BOTH cases that used
                    // to be split apart: showing a brand-new wrong letter, and showing
                    // a previously-completed letter (e.g. signing B while target is C).
                    // The old "already completed" branch reset progress to 0 every
                    // time and never escalated to a hint, which is why it got stuck.
                    // Now both funnel into the same escalating logic, PLUS a hard
                    // time-based fallback (STUCK_TIMEOUT_MS) so the hint always shows
                    // if too much time passes with no progress, no matter the exact
                    // attempt count.
                    const now = Date.now();
                    const isNewAttempt = now - detectionCooldownRef.current >= DETECTION_COOLDOWN_MS;
                    const isOldLetter = completedLetters.has(letter);
                    const stuckTooLong = now - lastProgressTimeRef.current >= STUCK_TIMEOUT_MS;

                    if ((wrongStreakRef.current >= 2 || stuckTooLong) && isNewAttempt) {
                        detectionCooldownRef.current = now;

                        const newWrong = consecutiveWrong + 1;
                        setConsecutiveWrong(newWrong);
                        setTotalWrongAttempts(prev => prev + 1);

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

                        const hintCooldownOk = now - lastHintShownRef.current >= HINT_COOLDOWN_MS;

                        // Baseline reminder — different wording for "old letter shown
                        // by mistake" vs. a genuinely new wrong shape.
                        if (newWrong >= 1) {
                            setSenyaMessage(
                                isOldLetter
                                    ? `You got ${letter} already! We're doing ${target} now!`
                                    : `We're doing letter ${target}!`
                            );
                        }

                        // Escalate to the hint suggestion once there's a real streak
                        // OR once the stuck-timer fires — whichever comes first.
                        if ((newWrong >= 2 || stuckTooLong) && hintCooldownOk) {
                            lastHintShownRef.current = now;
                            setSenyaMessage(`Need help with ${target}? Click the 💡 hints icon!`);
                            showStruggleHint();
                        }

                        // Stronger nudge after more wrong attempts, or if still stuck.
                        if ((newWrong >= 4 || stuckTooLong) && hintCooldownOk) {
                            lastHintShownRef.current = now;
                            showCutePopup(
                                `💡 ${target}`,
                                'Keep your hand steady'
                            );
                            setSenyaMessage(`Click the 💡 hints icon if you need help signing ${target}!`);
                            showStruggleHint();
                        }
                    }
                }
            } else {
                // Letter not in A-M (unrecognized shape / no confident match)
                const target = getCurrentTarget();
                const now = Date.now();
                const stuckTooLong = now - lastProgressTimeRef.current >= STUCK_TIMEOUT_MS;
                const hintCooldownOk = now - lastHintShownRef.current >= HINT_COOLDOWN_MS;

                if (target && !isModuleComplete) {
                    if (stuckTooLong && hintCooldownOk) {
                        lastHintShownRef.current = now;
                        setSenyaMessage(`Click 💡 hints if you need help signing ${target}!`);
                        showStruggleHint();
                    } else if (now - senyaMsgCooldownRef.current >= SENYA_COOLDOWN_MS) {
                        senyaMsgCooldownRef.current = now;
                        setSenyaMessage(`We're learning ${target}`);
                    }
                }
            }
        } else {
            // ✅ NO HAND DETECTED - Faster hint suggestion
            setDetectedLetter('✋');
            setConfidence(0);
            setLastProcessedLetter('');
            setLetterStableCount(0);

            const now = Date.now();
            if (!isModuleComplete && completedLetters.size < ALPHABET_PART1.length && now - senyaMsgCooldownRef.current >= 2000) { // Reduced to 2 seconds
                senyaMsgCooldownRef.current = now;
                const target = getCurrentTarget();
                if (target) {
                    const hintCooldownOk = now - lastHintShownRef.current >= HINT_COOLDOWN_MS;

                    // Always show the letter they should be doing
                    setSenyaMessage(`Show me ${target}!`);

                    // If struggling, suggest hints (with cooldown)
                    if (consecutiveWrong >= 1 && hintCooldownOk) {
                        lastHintShownRef.current = now;
                        setSenyaMessage(`Show me ${target}! Click 💡 for a hint!`);
                        showStruggleHint();
                    }
                }
            }
        }
    };

    // ─── SAVE SINGLE LETTER PERFORMANCE ──────────────────────────────
    const saveSingleLetterPerformance = async (letter: string) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                console.log('ℹ️ No auth token found, skipping save');
                return null;
            }

            const data = letterAttempts[letter] || {
                letter,
                attempts: 0,
                wrongAttempts: 0,
                successCount: 0
            };

            if (data.attempts === 0) {
                return null;
            }

            const letterPerformance = [{
                letter: letter,
                attempts: data.attempts || 0,
                wrong_attempts: data.wrongAttempts || 0,
                success_count: data.successCount || 0,
                consecutive_wrong: 0,
            }];

            console.log(`📤 Saving performance for letter ${letter}...`);

            const result = await api.saveGesturePerformance(
                'alphabet_part1',
                letterPerformance,
                `session_${Date.now()}`
            );

            if (result && result.success) {
                console.log(`✅ Letter ${letter} saved!`);
                return result;
            } else {
                console.error(`❌ Failed to save letter ${letter}:`, result);
                return null;
            }
        } catch (error) {
            console.error(`❌ Error saving letter ${letter}:`, error);
            return null;
        }
    };

    // ─── SAVE ALL ON COMPLETION ──────────────────────────────────────
    const saveAllPerformance = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return null;

            const letterPerformances = ALPHABET_PART1.map(letter => {
                const data = letterAttempts[letter] || {
                    letter,
                    attempts: 0,
                    wrongAttempts: 0,
                    successCount: 0
                };
                return {
                    letter: letter,
                    attempts: data.attempts || 0,
                    wrong_attempts: data.wrongAttempts || 0,
                    success_count: data.successCount || 0,
                    consecutive_wrong: 0,
                };
            });

            const totalAttempts = letterPerformances.reduce((sum, l) => sum + l.attempts, 0);
            if (totalAttempts === 0) return null;

            console.log(`📤 Saving final performance...`);

            const result = await api.saveGesturePerformance(
                'alphabet_part1',
                letterPerformances,
                `session_${Date.now()}`
            );

            if (result && result.success) {
                console.log('✅ Final performance saved!');
                return result;
            }
            return null;
        } catch (error) {
            console.error('❌ Error saving final performance:', error);
            return null;
        }
    };

    // Update the useEffect for module completion
    useEffect(() => {
        if (isModuleComplete) {
            saveAllPerformance().then(result => {
                if (result) {
                    console.log('📊 All performance data saved');
                }
            });
        }
    }, [isModuleComplete]);

    const [xpResult, setXpResult] = useState<any>(null);

    const handleContinue = async () => {
        const unsavedLetters = ALPHABET_PART1.filter(
            letter => completedLetters.has(letter) && !savedLettersRef.current.has(letter)
        );

        for (const letter of unsavedLetters) {
            await saveSingleLetterPerformance(letter);
        }

        await saveAllPerformance();

        setShowResults(false);

        // Fetch streak regardless of XP
        let streakDays = 0;
        try {
            const streakData = await api.getStreak();
            streakDays = streakData.streak_days || 0;
            console.log('📊 Fetched streak from API:', streakDays);
        } catch (error) {
            console.error('Error fetching streak:', error);
            streakDays = 0;
        }

        // If we have XP, show XP progress
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
                    streakDays: String(streakDays),
                },
            });
        } else {
            // No XP earned - show the streak screen
            router.push({
                pathname: '/lesson/streak',
                params: {
                    streakDays: String(streakDays),
                },
            });
        }
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
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

        const strugglingLetters = Object.values(letterAttempts)
            .filter(l => l.wrongAttempts >= 2)
            .sort((a, b) => b.wrongAttempts - a.wrongAttempts)
            .map(l => l.letter)
            .slice(0, 3);

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
            if (!token) {
                console.log('ℹ️ No auth token found, skipping XP award');
                return null;
            }

            console.log(`⭐ Awarding XP for ${starRating} star${starRating > 1 ? 's' : ''}...`);

            const result = await api.awardModuleXp('alphabet_part1', starRating);

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
                    console.log(`⭐ XP awarded: ${result.xp_earned} XP, Total: ${result.total_xp} XP`);
                    setXpResult(result);
                }
                // Pre-fetch streak so it's ready when user clicks Continue
                try {
                    const streakData = await api.getStreak();
                    console.log('📊 Pre-fetched streak:', streakData.streak_days || 0);
                } catch (error) {
                    console.error('Error pre-fetching streak:', error);
                }
            }, 2000);
        }
    }, [isModuleComplete]);

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
                <Text style={styles.headerTitle}>Alphabet Part 1</Text>
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
                            onPress={() => {
                                openHintsModal();
                                setIsStruggling(false); // Reset struggling state when hints opened
                            }}
                            style={[
                                styles.hintsBtn,
                                isStruggling && styles.hintsBtnGlow, // ✅ Add glow effect
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
                    Progress: {completedLetters.size}/{ALPHABET_PART1.length}
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(completedLetters.size / ALPHABET_PART1.length) * 100}%` }
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
                {ALPHABET_PART1.map((letter) => {
                    const isCompleted = completedLetters.has(letter);
                    const isActive = letter === currentTarget && !isCompleted;
                    return (
                        <TouchableOpacity
                            key={letter}
                            style={[
                                styles.letterSlot,
                                isCompleted && styles.letterCompleted,
                                isActive && styles.letterActive,
                            ]}
                            onPress={() => {
                                // When clicking a letter, open hints modal to that letter
                                const index = ALPHABET_PART1.indexOf(letter);
                                setHintsCurrentIndex(index);
                                setShowHintsModal(true);
                            }}
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
                        </TouchableOpacity>
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
                                Sign Language A–M
                            </Text>
                            <TouchableOpacity
                                style={styles.hintsModalClose}
                                onPress={() => setShowHintsModal(false)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={24} color="#0f3172" />
                            </TouchableOpacity>
                        </View>

                        {/* Letter indicator */}
                        <View style={styles.hintsLetterIndicator}>
                            <Text style={styles.hintsLetterText}>
                                Letter {currentHintLetter}
                            </Text>
                            <Text style={styles.hintsCountText}>
                                {hintsCurrentIndex + 1} / {ALPHABET_PART1.length}
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
                                    objectFit="cover" // ✅ This will zoom in and fill the container
                                />
                            ) : (
                                <View style={styles.hintsNoMedia}>
                                    <Text style={styles.hintsNoMediaText}>
                                        No media available for {currentHintLetter}
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

                        {/* Letter progress dots */}
                        <View style={styles.hintsDotsContainer}>
                            {ALPHABET_PART1.map((letter, index) => (
                                <TouchableOpacity
                                    key={letter}
                                    style={[
                                        styles.hintsDot,
                                        index === hintsCurrentIndex && styles.hintsDotActive,
                                        completedLetters.has(letter) && styles.hintsDotCompleted,
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
                                Practice making the {currentHintLetter} shape with your hand!
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Results Modal - Only when all letters are completed */}
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
                            All {ALPHABET_PART1.length} letters mastered
                        </Text>

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
                                                {results.totalCorrect}/{ALPHABET_PART1.length}
                                            </Text>
                                            <Text style={styles.resultGridLabel}>Gestures</Text>
                                        </View>
                                    </View>

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

    // ─── HINTS MODAL STYLES ──────────────────────────────────────────
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

    // ─── RESULTS MODAL STYLES ────────────────────────────────────────
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
});