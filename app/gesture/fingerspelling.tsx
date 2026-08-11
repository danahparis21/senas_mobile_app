// app/gesture/fingerspelling.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react'; // ← ADD useCallback
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
    TextInput,
    Alert,
    UIManager,
    KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'; // ← ADD useFocusEffect
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import * as WebBrowser from 'expo-web-browser';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { usePracticeTimeTracker } from '../../hooks/usePracticeTimeTracker';
import { useSettings } from '../../contexts/SettingsContext'; // ← ADD THIS


// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

// ─── SOUND EFFECTS ──────────────────────────────────────────────────────────
const CORRECT_GESTURE_SOUND = require('../../assets/music/correct-gesture.mp3');
const GESTURE_COMPLETE_SOUND = require('../../assets/music/gesture-complete.mp3');

// ─── ALPHABET MODULE MAPPING ──────────────────────────────────────────────
const ALPHABET_MODULE_MAP: Record<string, string> = {
    'A': 'alphabet_part1',
    'B': 'alphabet_part1',
    'C': 'alphabet_part1',
    'D': 'alphabet_part1',
    'E': 'alphabet_part1',
    'F': 'alphabet_part1',
    'G': 'alphabet_part1',
    'H': 'alphabet_part1',
    'I': 'alphabet_part1',
    'J': 'alphabet_part1',
    'K': 'alphabet_part1',
    'L': 'alphabet_part1',
    'M': 'alphabet_part1',
    'N': 'alphabet_part2',
    'O': 'alphabet_part2',
    'P': 'alphabet_part2',
    'Q': 'alphabet_part2',
    'R': 'alphabet_part2',
    'S': 'alphabet_part2',
    'T': 'alphabet_part2',
    'U': 'alphabet_part2',
    'V': 'alphabet_part2',
    'W': 'alphabet_part2',
    'X': 'alphabet_part2',
    'Y': 'alphabet_part2',
    'Z': 'alphabet_part2',
};

// ─── WORD BANK ──────────────────────────────────────────────────────────────
const DEFAULT_WORDS = [
    'YES', 'SNED', 'SENYAS',
    'HELLO', 'THANK', 'YOU',
    'GOOD', 'MORNING', 'AFTERNOON',
    'FAMILY', 'FRIEND', 'LOVE',
    'LEARN', 'SCHOOL', 'TEACHER',
    'STUDENT', 'BOOK', 'PENCIL',
    'PAPER', 'TABLE', 'CHAIR',
    'WINDOW', 'DOOR', 'WATER',
    'FOOD', 'HAPPY', 'SAD',
    'BIG', 'SMALL', 'FAST',
    'SLOW', 'HOT', 'COLD',
    'WARM', 'COOL', 'BRIGHT',
    'DARK', 'LIGHT', 'HEAVY',
    'SOFT', 'HARD', 'SMOOTH',
    'ROUGH', 'CLEAN', 'DIRTY',
    'OPEN', 'CLOSE', 'PUSH',
    'PULL', 'WALK', 'RUN',
    'SIT', 'STAND', 'SLEEP',
    'EAT', 'DRINK', 'PLAY',
    'WORK', 'REST', 'SMILE',
    'PLEASE', 'SORRY', 'EXCUSE',
    'HELP', 'HOSPITAL', 'DOCTOR',
    'POLICE', 'FIRE', 'EMERGENCY',
];

// Senya's encouragement messages
const SENYA_MESSAGES = {
    welcome: "Let's practice fingerspelling!",
    correct: [
        "Amazing! Keep going!",
        "Perfect! You're on fire!",
        "Great job! You're a natural!",
        "Wonderful! You're crushing it!",
        "Fantastic! Next letter!",
    ],
    wordComplete: [
        "Great word! Next one!",
        "Awesome! Keep it up!",
        "You're a spelling star!",
        "Wonderful word!",
        "Fantastic! On to the next!",
    ],
    struggle: [
        "Try curling your fingers more...",
        "Keep your hand steady!",
        "Make the shape clearer!",
        "You got this! Try again!",
        "Almost there! One more try!",
    ],
    complete: "YOU DID IT! ALL WORDS COMPLETE!",
};

// Word tracking
interface WordResult {
    word: string;
    attempts: number;
    wrongAttempts: number;
    successCount: number;
    timeToComplete?: number;
}

export default function FingerspellingScreen() {
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
    const [studentName, setStudentName] = useState<string>('');
    const [isNameLoaded, setIsNameLoaded] = useState(false);

    useFocusEffect(
        useCallback(() => {
            console.log('🔄 Fingerspelling screen focused, refreshing settings...');
            refreshSettings();
        }, [refreshSettings])
    );

    // ── Audio state ──
    const [gestureSound, setGestureSound] = useState<Audio.Sound | null>(null);
    const [completeSound, setCompleteSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(false);

    // ── Modal & Input state ──
    const [showWordModal, setShowWordModal] = useState(true);
    const [inputWord, setInputWord] = useState('');
    const [wordMode, setWordMode] = useState<'random' | 'input' | null>(null);
    const [showCustomInput, setShowCustomInput] = useState(false);

    // ── Word list state ──
    const [wordsToSpell, setWordsToSpell] = useState<string[]>([]);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [currentLetterIndex, setCurrentLetterIndex] = useState(0);

    // ── Completion state ──
    const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
    const [isModuleComplete, setIsModuleComplete] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [starRating, setStarRating] = useState(0);

    // ── Word tracking ──
    const [wordResults, setWordResults] = useState<Record<string, WordResult>>({});
    const [totalWrongAttempts, setTotalWrongAttempts] = useState(0);
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [endTime, setEndTime] = useState<number | null>(null);

    // ── Popup animation ──
    const popupAnim = useState(new Animated.Value(0))[0];
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupSubMessage, setPopupSubMessage] = useState('');

    // ── Senya message ──
    const [senyaMessage, setSenyaMessage] = useState(SENYA_MESSAGES.welcome);
    const [consecutiveWrong, setConsecutiveWrong] = useState(0);
    const senyaMsgCooldownRef = useRef<number>(0);
    const SENYA_COOLDOWN_MS = 3000;

    // ── Detection stability ──
    // NOTE: these live in refs, not useState. The detection handler below
    // fires every time a camera frame comes in over the WebView bridge -
    // much faster than React can guarantee a re-render in between calls.
    // Reading/writing them as state meant the handler could act on stale
    // values from a previous render (a classic React race condition),
    // which is what let letters get auto-credited without being signed.
    // Refs are always read fresh, synchronously, no matter how fast the
    // frames arrive.
    const lastProcessedLetterRef = useRef<string>('');
    const letterStableCountRef = useRef(0);
    const lastAttemptLetterRef = useRef<string>('');
    const lastAttemptTimeRef = useRef<number>(0);
    const MIN_ATTEMPT_INTERVAL = 1000;
    // Minimum time between crediting two correct letters. Without this,
    // a single held hand-shape that spans multiple fast frames (or a
    // few late/batched frames) could get credited more than once in a
    // row, silently skipping the student ahead in the word.
    const LETTER_ACCEPT_COOLDOWN = 400;
    const lastAcceptedAtRef = useRef(0);

    // ── Source of truth for progress (mirrors the state below, but read
    // synchronously inside the detection handler so it can never be stale) ──
    const wordsRef = useRef<string[]>([]);
    const wordIndexRef = useRef(0);
    const letterIndexRef = useRef(0);
    const completedWordsRef = useRef<Set<string>>(new Set());
    const moduleCompleteRef = useRef(false);

    // ── XP state ──
    const [xpResult, setXpResult] = useState<any>(null);

    // ── Star animations ──
    const starAnim1 = useRef(new Animated.Value(0)).current;
    const starAnim2 = useRef(new Animated.Value(0)).current;
    const starAnim3 = useRef(new Animated.Value(0)).current;

    // ─── FETCH STUDENT NAME ──────────────────────────────────────────────────
    useEffect(() => {
        const fetchStudentName = async () => {
            try {
                const userData = await AsyncStorage.getItem('userData');
                if (userData) {
                    const user = JSON.parse(userData);
                    const firstName = user?.student?.first_name || '';
                    const lastName = user?.student?.last_name || '';
                    if (firstName && lastName) {
                        setStudentName(`${firstName} ${lastName}`);
                    } else if (firstName) {
                        setStudentName(firstName);
                    }
                }
            } catch (error) {
                console.error('Error fetching student name:', error);
            } finally {
                setIsNameLoaded(true);
            }
        };
        fetchStudentName();
    }, []);

    // ─── PLAY GESTURE SOUND (only if enabled) ──────────────────────────────────
    async function playGestureSound() {
        // ✅ Check if sound is enabled
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

    // ─── PLAY COMPLETE SOUND (only if enabled) ──────────────────────────────────
    async function playCompleteSound() {
        // ✅ Check if sound is enabled
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

    // ─── GET CURRENT LETTER ────────────────────────────────────────────────
    const getCurrentWord = () => wordsToSpell[currentWordIndex] || '';
    const getCurrentLetter = () => {
        const word = getCurrentWord();
        return word[currentLetterIndex] || '';
    };
    const isWordComplete = () => {
        const word = getCurrentWord();
        return currentLetterIndex >= word.length;
    };

    // ─── GET RANDOM WORDS ──────────────────────────────────────────────────
    const getRandomWords = (count: number = 5): string[] => {
        let wordsToUse: string[] = [];

        // Filter out any parts that contain numbers (like "John123" or "Sarah2024")
        // Also filter out parts that are purely numbers
        const nameParts = studentName
            .toUpperCase()
            .split(/\s+/)
            .filter(part => {
                // Only keep parts that:
                // 1. Have at least one letter
                // 2. Contain ONLY letters (no numbers at all)
                return part.length > 0 && /^[A-Z]+$/.test(part);
            });

        const shuffled = [...DEFAULT_WORDS].sort(() => Math.random() - 0.5);

        if (nameParts.length > 0) {
            wordsToUse = [...nameParts];
            const remainingSlots = count - wordsToUse.length;
            if (remainingSlots > 0) {
                const available = shuffled.filter(word => !wordsToUse.includes(word));
                const fillWords = available.slice(0, remainingSlots);
                wordsToUse = [...wordsToUse, ...fillWords];
            } else {
                wordsToUse = wordsToUse.slice(0, count);
            }
        } else {
            wordsToUse = shuffled.slice(0, count);
        }

        return wordsToUse;
    };

    // ─── HANDLE MODAL SELECTION ────────────────────────────────────────────
    const handleStartRandom = () => {
        const words = getRandomWords(5);
        setWordsToSpell(words);
        setWordMode('random');
        initializeWords(words);
        setShowWordModal(false);
        setStartTime(Date.now());
    };

    // ─── CONTENT FILTER (English / Tagalog / Bisaya) ───────────────────────
    // Exact-match list: blocked whenever a typed word/token equals one of
    // these outright.
    const BLOCKED_WORDS_EXACT = new Set([
        // English
        'FUCK', 'FUCKING', 'FUCKER', 'MOTHERFUCKER', 'SHIT', 'BULLSHIT', 'BITCH',
        'ASSHOLE', 'BASTARD', 'CUNT', 'DICK', 'PUSSY', 'WHORE', 'SLUT', 'HOE',
        'RETARD', 'RETARDED', 'FAG', 'FAGGOT', 'NIGGER', 'NIGGA', 'CHINK',
        'SPIC', 'KIKE', 'DYKE', 'TRANNY', 'JACKASS', 'DUMBASS', 'TWAT',
        'WANKER', 'PRICK', 'COCK', 'CUM', 'RAPE', 'RAPIST',
        // Tagalog / Filipino
        'BOBO', 'BOBA', 'GAGO', 'GAGA', 'TANGA', 'TANGINA', 'TANGINAMO',
        'PUTA', 'PUTANG', 'PUTANGINA', 'PUTANGINAMO', 'PAKSHET', 'PUCHA',
        'LECHE', 'ULOL', 'PUNYETA', 'DEMONYO', 'KUPAL', 'TARANTADO', 'HUDAS',
        'ULAGA', 'HINDOT', 'INUTIL', 'LINTIK', 'PUKINGINA', 'PUKING',
        'HINAYUPAK', 'WALANGHIYA', 'TAE', 'ANGKONG', 'TITE', 'OTEN', 'BEMBANG',
        // Bisaya / Visayan
        'YAWA', 'PISTI', 'ATAY', 'BUANG', 'KAYATA',
    ]);

    // Roots checked as substrings too, so a word typed with attached
    // suffixes and no spaces (e.g. "PUTANGINAMO" = puta + ngina + mo, or
    // "TANGINAMO") still gets caught even though the exact combined form
    // isn't itself in the list above.
    const BLOCKED_ROOTS_SUBSTRING = [
        'PUTANG', 'TANGINA', 'GAGO', 'GAGA', 'TANGA', 'BOBO', 'BOBA',
        'PUKING', 'YAWA', 'PISTI', 'BUANG', 'KAYATA', 'LINTIK', 'HINDOT', 'TITE',
        'TARANTADO', 'NIGGER', 'NIGGA', 'FAGGOT', 'FUCK', 'CUNT',
    ];

    // Words that are innocent on their own but become an insult combined
    // with another word (e.g. "HAYOP" just means "animal" and is fine on
    // its own - "HAYOP KA" is the insult).
    const BLOCKED_PHRASES = [
        'HAYOP KA', 'GAGO KA', 'TANGA KA', 'BOBO KA', 'TAE KA',
        'WALA KANG HIYA', 'PUTANG INA', 'PUTANG INA MO',
    ];

    const isTokenAllowed = (rawToken: string): boolean => {
        const token = rawToken.toUpperCase().replace(/[^A-Z]/g, '');
        if (!token) return true;
        if (BLOCKED_WORDS_EXACT.has(token)) return false;
        if (BLOCKED_ROOTS_SUBSTRING.some(root => token.includes(root))) return false;
        return true;
    };

    const containsBlockedContent = (input: string): boolean => {
        const normalized = input.toUpperCase().replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!normalized) return false;

        const tokens = normalized.split(' ').filter(Boolean);
        if (tokens.some(t => !isTokenAllowed(t))) return true;
        if (BLOCKED_PHRASES.some(phrase => normalized.includes(phrase))) return true;

        return false;
    };

    const handleStartInput = () => {
        if (!inputWord.trim()) {
            Alert.alert('Please enter a word or phrase');
            return;
        }
        if (containsBlockedContent(inputWord)) {
            Alert.alert(
                "Let's keep it friendly!",
                "That word or phrase isn't allowed here. Please try a different word."
            );
            return;
        }
        const words = inputWord.toUpperCase().trim().split(/\s+/)
            .map(w => w.replace(/[^A-Z]/g, ''))
            .filter(w => w.length > 0);
        if (words.length === 0) {
            Alert.alert('Please enter at least one word using letters only');
            return;
        }

        // Additional check: ensure no numbers slipped through (shouldn't happen with the regex above)
        const hasNumbers = words.some(word => /\d/.test(word));
        if (hasNumbers) {
            Alert.alert('Letters Only', 'Please use only letters (A-Z) for fingerspelling practice.');
            return;
        }

        setWordsToSpell(words);
        setWordMode('input');
        initializeWords(words);
        setShowWordModal(false);
        setShowCustomInput(false);
        setStartTime(Date.now());
    };

    const initializeWords = (words: string[]) => {
        const initial: Record<string, WordResult> = {};
        words.forEach(word => {
            initial[word] = {
                word,
                attempts: 0,
                wrongAttempts: 0,
                successCount: 0,
            };
        });
        setWordResults(initial);
        setCurrentWordIndex(0);
        setCurrentLetterIndex(0);
        setCompletedWords(new Set());
        setTotalWrongAttempts(0);
        setIsModuleComplete(false);
        setShowResults(false);
        setEndTime(null);
        setSenyaMessage(SENYA_MESSAGES.welcome);
        setConsecutiveWrong(0);

        // Reset the refs the detection handler actually reads from - this
        // is what guarantees a fresh word/session never inherits leftover
        // progress or hand-pose state from whatever came before it.
        wordsRef.current = words;
        wordIndexRef.current = 0;
        letterIndexRef.current = 0;
        completedWordsRef.current = new Set();
        moduleCompleteRef.current = false;
        lastProcessedLetterRef.current = '';
        letterStableCountRef.current = 0;
        lastAttemptLetterRef.current = '';
        lastAttemptTimeRef.current = 0;
        lastAcceptedAtRef.current = 0;

        const firstWord = words[0] || '';
        if (firstWord) {
            setSenyaMessage(`Spell: ${firstWord}`);
        }
    };


    // ─── HANDLE DETECTION ──────────────────────────────────────────────────
    // Everything decision-relevant in here reads from refs (wordsRef,
    // wordIndexRef, letterIndexRef, letterStableCountRef, etc), never from
    // React state. Frames can arrive from the WebView faster than React
    // commits a re-render, so any check based on closed-over state (like
    // `currentLetterIndex` from the component's render scope) can be
    // stale by the time it runs - that staleness was the root cause of
    // letters getting silently marked "done" without being signed.
    const handleDetection = async (data: any) => {
        const { letter, confidence: conf } = data;

        if (letter && letter !== '✋' && letter.length === 1) {
            setDetectedLetter(letter);
            setConfidence(conf || 0);
            setIsConnected(true);
            setShowBrowserButton(false);

            if (letter === lastProcessedLetterRef.current) {
                letterStableCountRef.current += 1;
            } else {
                lastProcessedLetterRef.current = letter;
                letterStableCountRef.current = 0;
                return;
            }

            if (letterStableCountRef.current < 2) {
                return;
            }

            if (moduleCompleteRef.current) return;

            const now = Date.now();
            const isNewLetter = letter !== lastAttemptLetterRef.current;
            const isTimeForNewAttempt = now - lastAttemptTimeRef.current >= MIN_ATTEMPT_INTERVAL;

            if (isNewLetter || isTimeForNewAttempt) {
                lastAttemptLetterRef.current = letter;
                lastAttemptTimeRef.current = now;
            }

            const words = wordsRef.current;
            const wIndex = wordIndexRef.current;
            const lIndex = letterIndexRef.current;
            const currentWord = words[wIndex] || '';
            const currentLetter = currentWord[lIndex] || '';
            const wordIsComplete = lIndex >= currentWord.length;

            if (wordIsComplete) {
                const nextIndex = wIndex + 1;
                // Credit the word that was just finished regardless of
                // whether there's another word after it - previously this
                // only happened in the "next word exists" branch, so the
                // very last word of a session was never added, which is
                // why results always showed one word short (e.g. 4/5).
                if (currentWord) {
                    completedWordsRef.current = new Set(completedWordsRef.current).add(currentWord);
                    setCompletedWords(new Set(completedWordsRef.current));
                }
                if (nextIndex < words.length) {
                    wordIndexRef.current = nextIndex;
                    letterIndexRef.current = 0;
                    // Fresh word: wipe any leftover hand-pose/debounce
                    // tracking so nothing from the previous word can
                    // bleed into this one.
                    lastProcessedLetterRef.current = '';
                    letterStableCountRef.current = 0;
                    lastAttemptLetterRef.current = '';
                    lastAttemptTimeRef.current = 0;
                    lastAcceptedAtRef.current = 0;

                    setCurrentWordIndex(nextIndex);
                    setCurrentLetterIndex(0);
                    setConsecutiveWrong(0);
                    setSenyaMessage(`Spell: ${words[nextIndex]}`);
                    if (currentWord) {
                        const msg = getRandomMessage(SENYA_MESSAGES.wordComplete);
                        setSenyaMessage(msg);
                        showCutePopup(`✅ ${currentWord}`, `Word ${nextIndex}/${words.length}`);
                    }
                } else {
                    moduleCompleteRef.current = true;
                    await handleAllComplete();
                }
                return;
            }

            // ─── CHECK IF LETTER MATCHES ────────────────────────────────────
            if (letter === currentLetter) {
                // Debounce: a single held hand-shape can span several
                // frames. Without this, those extra frames could each
                // independently credit the same letter and skip the
                // student ahead in the word.
                if (now - lastAcceptedAtRef.current < LETTER_ACCEPT_COOLDOWN) {
                    return;
                }
                lastAcceptedAtRef.current = now;

                await playGestureSound();

                const nextLetterIndex = lIndex + 1;
                letterIndexRef.current = nextLetterIndex;
                // Require the detector to see a genuinely new stable
                // pose before the *next* letter can be credited too.
                lastProcessedLetterRef.current = '';
                letterStableCountRef.current = 0;

                setCurrentLetterIndex(nextLetterIndex);
                setConsecutiveWrong(0);

                if (currentWord) {
                    setWordResults(prev => {
                        const current = prev[currentWord] || { word: currentWord, attempts: 0, wrongAttempts: 0, successCount: 0 };
                        return {
                            ...prev,
                            [currentWord]: {
                                ...current,
                                successCount: current.successCount + 1,
                            }
                        };
                    });
                }

                const msg = getRandomMessage(SENYA_MESSAGES.correct);
                setSenyaMessage(msg);
                senyaMsgCooldownRef.current = Date.now();

                if (nextLetterIndex >= currentWord.length) {
                    showCutePopup(
                        `${currentWord} ✓`,
                        `Word ${wIndex + 1}/${words.length}`
                    );
                } else {
                    showCutePopup(
                        `${letter} ✓`,
                        `${nextLetterIndex}/${currentWord.length}`
                    );
                }
            }
            // ─── CHECK IF LETTER ALREADY SIGNED IN THIS WORD ──────────────
            else if (isLetterAlreadySignedInWord(letter, currentWord, lIndex)) {
                // This letter was already signed earlier in this word
                // (e.g., 'S' in 'STAND' - the user signed it at position 0, now trying again)
                if (now - senyaMsgCooldownRef.current >= SENYA_COOLDOWN_MS) {
                    senyaMsgCooldownRef.current = now;
                    setSenyaMessage(`Already did ${letter}! Next: ${currentLetter}`);
                }
                setConsecutiveWrong(0);
            }
            // ─── WRONG LETTER ──────────────────────────────────────────────
            else {
                if (isNewLetter || isTimeForNewAttempt) {
                    const newWrong = consecutiveWrong + 1;
                    setConsecutiveWrong(newWrong);
                    setTotalWrongAttempts(prev => prev + 1);

                    if (currentWord) {
                        setWordResults(prev => {
                            const current = prev[currentWord] || { word: currentWord, attempts: 0, wrongAttempts: 0, successCount: 0 };
                            return {
                                ...prev,
                                [currentWord]: {
                                    ...current,
                                    wrongAttempts: current.wrongAttempts + 1,
                                    attempts: current.attempts + 1,
                                }
                            };
                        });
                    }

                    if (now - senyaMsgCooldownRef.current >= SENYA_COOLDOWN_MS) {
                        senyaMsgCooldownRef.current = now;
                        if (newWrong >= 4) {
                            const msg = getRandomMessage(SENYA_MESSAGES.struggle);
                            setSenyaMessage(msg);
                            setConsecutiveWrong(0);
                            showCutePopup(
                                `💡 ${currentLetter}`,
                                'Keep your hand steady'
                            );
                        } else if (newWrong >= 2) {
                            setSenyaMessage(`Try making ${currentLetter} shape!`);
                        }
                    }
                }
            }
        } else {
            setDetectedLetter('✋');
            setConfidence(0);
            lastProcessedLetterRef.current = '';
            letterStableCountRef.current = 0;

            const now = Date.now();
            if (!moduleCompleteRef.current && wordsRef.current.length > 0 && now - senyaMsgCooldownRef.current >= 5000) {
                senyaMsgCooldownRef.current = now;
                const words = wordsRef.current;
                const currentLetter = words[wordIndexRef.current]?.[letterIndexRef.current];
                if (currentLetter) {
                    setSenyaMessage(`Show me ${currentLetter}!`);
                }
            }
        }
    };

    // ─── HELPER: Check if letter was already signed in current word ────────
    const isLetterAlreadySignedInWord = (letter: string, word: string, letterIndex: number): boolean => {
        // Check if this letter appears at a position BEFORE the current index
        for (let i = 0; i < letterIndex; i++) {
            if (word[i] === letter) {
                return true;
            }
        }
        return false;
    };

    // ─── HANDLE ALL COMPLETE ──────────────────────────────────────────────
    const handleAllComplete = async () => {
        setIsModuleComplete(true);
        const endNow = Date.now();
        setEndTime(endNow);

        let newStarRating = 3; // Default to 3 stars
        let xpToAward = 0;

        if (wordMode === 'random') {
            // Random mode: Time-based grading
            const elapsed = Math.round((endNow - startTime) / 1000);
            newStarRating = elapsed < 45 ? 3 : elapsed < 90 ? 2 : 1;

            // XP based on stars: 3⭐ = 25, 2⭐ = 15, 1⭐ = 5
            const xpMap = {
                3: 25,
                2: 15,
                1: 5,
            };
            xpToAward = xpMap[newStarRating as keyof typeof xpMap] || 5;

            console.log(`🎯 Random mode: ${elapsed}s → ${newStarRating}⭐ → ${xpToAward} XP`);
        } else if (wordMode === 'input') {
            // Input mode: 1 XP per letter (including repeats)
            const totalLetters = wordsToSpell.reduce((sum, word) => sum + word.length, 0);
            xpToAward = totalLetters;
            newStarRating = 3; // Always 3 stars for completing custom words

            console.log(`📝 Input mode: ${totalLetters} letters → ${xpToAward} XP`);
        } else {
            // Fallback: should never happen
            xpToAward = 5;
            newStarRating = 1;
        }

        setStarRating(newStarRating);
        setSenyaMessage(SENYA_MESSAGES.complete);

        await playCompleteSound();
        await saveAllPerformance();

        // Award XP based on mode
        setTimeout(async () => {
            const result = await awardXPByMode(wordMode, xpToAward, newStarRating);
            if (result) {
                setXpResult(result);
            }
        }, 2000);

        setTimeout(() => {
            setShowResults(true);
        }, 1500);
    };


    const awardXPByMode = async (mode: 'random' | 'input' | null, xpToAward: number, starRating: number) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return null;

            if (mode === 'random') {
                // Random mode: Use challenge XP endpoint (no cap, time-based)
                const result = await api.awardChallengeXp('fingerspelling', xpToAward, starRating);
                if (result && result.success) {
                    console.log(`⭐ Random mode XP awarded: ${xpToAward} XP (${starRating} stars)`);
                    return result;
                }
            } else if (mode === 'input') {
                // Input mode: 1 XP per letter - use custom XP endpoint
                const result = await api.awardCustomXp('fingerspelling', xpToAward, starRating);
                if (result && result.success) {
                    console.log(`📝 Custom mode XP awarded: ${xpToAward} XP (${xpToAward} letters)`);
                    return result;
                }
            }
            return null;
        } catch (error) {
            console.error('Error awarding XP:', error);
            return null;
        }
    };

    // ─── SAVE PERFORMANCE ──────────────────────────────────────────────────
    const saveAllPerformance = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return null;

            const performancesByModule: Record<string, any[]> = {};

            wordsToSpell.forEach(word => {
                const wordData = wordResults[word] || { word, attempts: 0, wrongAttempts: 0, successCount: 0 };

                word.split('').forEach(letter => {
                    const moduleName = ALPHABET_MODULE_MAP[letter];
                    if (!moduleName) return;

                    if (!performancesByModule[moduleName]) {
                        performancesByModule[moduleName] = [];
                    }

                    const existing = performancesByModule[moduleName].find(p => p.letter === letter);
                    if (existing) {
                        existing.attempts += wordData.attempts || 0;
                        existing.wrong_attempts += wordData.wrongAttempts || 0;
                        existing.success_count += wordData.successCount || 0;
                    } else {
                        performancesByModule[moduleName].push({
                            letter: letter,
                            attempts: wordData.attempts || 0,
                            wrong_attempts: wordData.wrongAttempts || 0,
                            success_count: wordData.successCount || 0,
                            consecutive_wrong: 0,
                        });
                    }
                });
            });

            const results = [];
            for (const [moduleName, performances] of Object.entries(performancesByModule)) {
                if (performances.length === 0) continue;

                console.log(`📤 Saving ${performances.length} letters to ${moduleName}...`);

                const result = await api.saveGesturePerformance(
                    moduleName,
                    performances,
                    `fingerspelling_${Date.now()}`
                );
                results.push(result);
            }

            return results;
        } catch (error) {
            console.error('Error saving performance:', error);
            return null;
        }
    };

    // ─── XP AWARD ──────────────────────────────────────────────────────────
    const awardModuleXp = async (starRating: number) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return null;

            const xpMap = {
                3: 25,
                2: 15,
                1: 5,
            };
            const xpToAward = xpMap[starRating as keyof typeof xpMap] || 0;

            if (xpToAward === 0) {
                return { success: true, xp_earned: 0, message: 'No XP earned' };
            }

            const result = await api.awardChallengeXp('fingerspelling', xpToAward, starRating);

            if (result && result.success) {
                console.log(`⭐ Fingerspelling XP awarded: ${xpToAward} XP (${starRating} stars)`);
                return result;
            }
            return null;
        } catch (error) {
            console.error('Error awarding XP:', error);
            return null;
        }
    };

    // ─── HELPERS ────────────────────────────────────────────────────────────
    const getRandomMessage = (messages: string[]) => {
        return messages[Math.floor(Math.random() * messages.length)];
    };

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

    // ─── GET RESULTS ──────────────────────────────────────────────────────
    const getResults = () => {
        const timeToUse = endTime || Date.now();
        const totalSecs = Math.round((timeToUse - startTime) / 1000);
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;
        const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        const strugglingWords = Object.values(wordResults)
            .filter(w => w.wrongAttempts >= 2)
            .sort((a, b) => b.wrongAttempts - a.wrongAttempts)
            .slice(0, 3)
            .map(w => w.word);

        const easyWords = Object.values(wordResults)
            .filter(w => w.successCount > 0 && w.wrongAttempts === 0)
            .map(w => w.word);

        // Accuracy: correct letter signs out of every letter sign attempt
        // (correct + wrong). 5/5 correct with 0 mistakes = 100%.
        const totalCorrectSigns = Object.values(wordResults).reduce((sum, w) => sum + w.successCount, 0);
        const totalSignAttempts = totalCorrectSigns + totalWrongAttempts;
        const accuracy = totalSignAttempts > 0
            ? Math.round((totalCorrectSigns / totalSignAttempts) * 100)
            : 100;

        return {
            totalTime: timeDisplay,
            strugglingWords,
            easyWords,
            totalCorrect: completedWords.size,
            totalWords: wordsToSpell.length,
            accuracy,
        };
    };

    // ─── HANDLE CONTINUE ──────────────────────────────────────────────────
    const handleContinue = async () => {
        setShowResults(false);
        if (xpResult && xpResult.xp_earned > 0) {
            const level = xpResult.level || 1;
            const totalXp = xpResult.total_xp || 0;
            const xpEarned = xpResult.xp_earned || 0;
            const previousXp = totalXp - xpEarned;
            const nextLevelXp = getNextLevelXp(level);
            const levelName = getLevelName(level);

            // Fetch the actual streak from the API instead of hardcoding it
            let streakDays = 0;
            try {
                const streakData = await api.getStreak();
                streakDays = streakData.streak_days || 0;
                console.log('📊 Fetched streak from API:', streakDays);
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

    // ─── WEBVIEW SETUP ────────────────────────────────────────────────────
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

    const GESTURE_URL = 'https://swipe-drinking-coral.ngrok-free.dev/gesture.html';

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
            console.log('🎮 Fingerspelling mode activated!');
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

    // ─── CLEANUP ──────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (gestureSound) gestureSound.unloadAsync();
            if (completeSound) completeSound.unloadAsync();
        };
    }, []);

    // ─── AUTO-SCROLL THE LETTER ROW ───────────────────────────────────────
    // Keeps the active letter visible for long words (e.g. AFTERNOON)
    // that don't fit on one screen - slides the row so the current
    // letter stays roughly centered instead of running off-screen.
    useEffect(() => {
        const SLOT_WIDTH = 48;
        const SLOT_GAP = 6;
        const SLOT_STEP = SLOT_WIDTH + SLOT_GAP;
        const activeIndex = Math.min(currentLetterIndex, Math.max(getCurrentWord().length - 1, 0));
        const targetX = Math.max(0, (activeIndex * SLOT_STEP) - (width / 2) + (SLOT_WIDTH / 2));
        scrollViewRef.current?.scrollTo({ x: targetX, animated: true });
    }, [currentLetterIndex, currentWordIndex]);

    // ─── ANIMATE STARS ────────────────────────────────────────────────────
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

    // ─── PERMISSION CHECK ────────────────────────────────────────────────
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

    // ─── RENDER ──────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            {/* ─── START MODAL ────────────────────────────────────────────── */}
            <Modal
                visible={showWordModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowWordModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconWrap}>
                            <Ionicons name="hand-left" size={40} color="#fff" />
                        </View>
                        <Text style={styles.modalTitle}>Fingerspelling Practice</Text>
                        <Text style={styles.modalSubtitle}>
                            {studentName ? `Practice spelling your name and other words!` : 'Choose how you want to practice'}
                        </Text>

                        <TouchableOpacity
                            style={[styles.modalOption, styles.modalOptionPrimary]}
                            onPress={handleStartRandom}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.optionIconBadge, styles.optionIconBadgeOrange]}>
                                <Ionicons name="shuffle" size={22} color="#fff" />
                            </View>
                            <View style={styles.modalOptionText}>
                                <Text style={styles.modalOptionTitle}>Random Words</Text>
                                <Text style={styles.modalOptionDesc}>
                                    {studentName ? `Practice with 5 words (letters only)` : 'Practice with 5 random words'}
                                </Text>
                            </View>
                            <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.modalOptionArrow} />
                        </TouchableOpacity>

                        {/* Type Your Own - now a clear expand/collapse control,
                            not a button that looks like it submits on its own */}
                        <TouchableOpacity
                            style={[styles.modalOption, styles.modalOptionSecondary, showCustomInput && styles.modalOptionSecondaryActive]}
                            onPress={() => setShowCustomInput(prev => !prev)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.optionIconBadge, styles.optionIconBadgeTeal]}>
                                <Ionicons name="create-outline" size={22} color="#fff" />
                            </View>
                            <View style={styles.modalOptionText}>
                                <Text style={[styles.modalOptionTitle, { color: '#0f3172' }]}>Type Your Own</Text>
                                <Text style={[styles.modalOptionDesc, { color: '#4b7bbb' }]}>
                                    Practice a custom word or phrase
                                </Text>
                            </View>
                            <Ionicons
                                name={showCustomInput ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color="#14B8A6"
                            />
                        </TouchableOpacity>

                        {/* Input field only appears once "Type Your Own" is expanded */}
                        {showCustomInput && (
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.inputField}
                                    placeholder="Type your word or phrase..."
                                    placeholderTextColor="#94a3b8"
                                    value={inputWord}
                                    onChangeText={setInputWord}
                                    autoCapitalize="characters"
                                    returnKeyType="done"
                                    onSubmitEditing={handleStartInput}
                                    autoFocus
                                />
                                <TouchableOpacity
                                    style={styles.inputSubmit}
                                    onPress={handleStartInput}
                                    disabled={!inputWord.trim()}
                                >
                                    <Ionicons
                                        name="arrow-forward-circle"
                                        size={28}
                                        color={inputWord.trim() ? '#14B8A6' : '#cbd5e1'}
                                    />
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.modalCancel}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ─── HEADER ────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0f3172" />
                </Pressable>
                <Text style={styles.headerTitle}>Fingerspelling</Text>
                <View style={[styles.statusBadge, isConnected && styles.statusActive]}>
                    <Text style={[styles.statusText, isConnected && styles.statusActiveText]}>
                        {isConnected ? '🟢 Live' : '⏳ Loading'}
                    </Text>
                </View>
            </View>

            {/* ─── SENYA SECTION ─────────────────────────────────────────── */}
            <View style={styles.senyaSection}>
                <Image
                    source={require('../../assets/images/img/senya_teaching.png')}
                    style={styles.senyaImage}
                    resizeMode="contain"
                />
                <Text style={styles.senyaMessage}>{senyaMessage}</Text>
            </View>

            {/* ─── PROGRESS ──────────────────────────────────────────────── */}
            <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                    Word {currentWordIndex + 1}/{wordsToSpell.length}
                </Text>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${(currentWordIndex / wordsToSpell.length) * 100}%` }
                        ]}
                    />
                </View>
                <Text style={styles.targetText}>
                    📝 {getCurrentWord() || '✓'}
                </Text>
            </View>

            {/* ─── CURRENT LETTER DISPLAY ────────────────────────────────── */}
            <View style={styles.letterDisplay}>
                <Text style={styles.letterDisplayChar}>
                    {getCurrentLetter() || '🎉'}
                </Text>
                <Text style={styles.letterDisplayHint}>
                    {isWordComplete() ? 'Word Complete!' : 'Sign this letter'}
                </Text>
            </View>

            {/* ─── WORD PROGRESS LETTERS ─────────────────────────────────── */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.letterGridScroll}
                contentContainerStyle={styles.letterGridContent}
            >
                {getCurrentWord().split('').map((letter, index) => {
                    const isCompleted = index < currentLetterIndex;
                    const isActive = index === currentLetterIndex && !isWordComplete();
                    return (
                        <View
                            key={index}
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

            {/* ─── WEBVIEW ────────────────────────────────────────────────── */}
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

            {/* ─── BOTTOM DETECTION BAR ──────────────────────────────────── */}
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

            {/* ─── POPUP ──────────────────────────────────────────────────── */}
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

            {/* ─── RESULTS MODAL ──────────────────────────────────────────── */}
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
                            All {wordsToSpell.length} words mastered
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
                                                <Ionicons name="checkmark-done-outline" size={20} color="#0f3172" />
                                            </View>
                                            <Text style={styles.resultValue}>
                                                {results.totalCorrect}/{results.totalWords}
                                            </Text>
                                            <Text style={styles.resultGridLabel}>Words</Text>
                                        </View>
                                        <View style={styles.resultItemDivider} />
                                        <View style={styles.resultItem}>
                                            <View style={styles.resultIconWrap}>
                                                <Ionicons name="star" size={20} color="#F59E0B" />
                                            </View>
                                            <Text style={[styles.resultValue, { color: '#F59E0B' }]}>
                                                +{xpResult?.xp_earned || 0} XP
                                            </Text>
                                            <Text style={styles.resultGridLabel}>Earned</Text>
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

                                            if (results.strugglingWords.length > 0) {
                                                items.push({
                                                    icon: 'alert-circle-outline',
                                                    color: '#E11D48',
                                                    text: `Need more help with: ${results.strugglingWords.join(', ')}`,
                                                });
                                            }

                                            if (results.easyWords.length > 0) {
                                                items.push({
                                                    icon: 'checkmark-circle',
                                                    color: '#10B981',
                                                    text: `You nailed: ${results.easyWords.join(', ')}`,
                                                });
                                            }

                                            if (wordMode === 'input') {
                                                items.push({
                                                    icon: 'create-outline',
                                                    color: '#0f3172',
                                                    text: `You practiced: ${wordsToSpell.join(' ')}`,
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

// ─── STYLES ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // ... (keep all your existing styles - they're fine)
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
        color: '#0f3172',
        minWidth: 50,
        textAlign: 'center',
    },
    letterDisplay: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(15, 49, 114, 0.05)',
    },
    letterDisplayChar: {
        fontSize: 42,
        fontWeight: '900',
        color: '#0f3172',
        height: 56,
    },
    letterDisplayHint: {
        fontSize: 11,
        color: '#4b7bbb',
        fontWeight: '600',
        marginTop: 2,
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
        paddingVertical: 28,
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
    modalIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#CFE7FB',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#79B8E8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f3172',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#4b7bbb',
        marginTop: 4,
        marginBottom: 18,
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        width: '100%',
        marginBottom: 10,
        gap: 14,
    },
    modalOptionPrimary: {
        backgroundColor: '#FF6259',
        shadowColor: '#FF6259',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    modalOptionSecondary: {
        backgroundColor: 'rgba(139, 201, 106, 0.10)',
        borderWidth: 1.5,
        borderColor: 'rgba(139, 201, 106, 0.4)',
    },
    modalOptionSecondaryActive: {
        backgroundColor: 'rgba(139, 201, 106, 0.18)',
        borderColor: '#8BC96A',
    },
    optionIconBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionIconBadgeOrange: {
        backgroundColor: '#FFCB4D',
    },
    optionIconBadgeTeal: {
        backgroundColor: '#8BC96A',
    },
    modalOptionText: {
        flex: 1,
    },
    modalOptionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    modalOptionDesc: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 1,
    },
    modalOptionArrow: {
        opacity: 0.7,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginTop: 4,
        marginBottom: 10,
        backgroundColor: 'rgba(139, 201, 106, 0.07)',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(139, 201, 106, 0.35)',
        paddingHorizontal: 14,
    },
    inputField: {
        flex: 1,
        fontSize: 14,
        color: '#0f3172',
        paddingVertical: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    inputSubmit: {
        padding: 6,
    },
    modalCancel: {
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    modalCancelText: {
        fontSize: 13,
        color: '#4b7bbb',
        fontWeight: '600',
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
});