// app/lesson/DragDropQuestion.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    Animated,
    Easing,
    SafeAreaView,
    Platform,
    ScrollView,
    PanResponder,
    Modal,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { useSettings } from '../../contexts/SettingsContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api';
const IMAGE_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── FONT ──────────────────────────────────────────────────────────────────
const FONT_FAMILY = Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' });

// ─── SOUND EFFECTS ──────────────────────────────────────────────────────────
const CORRECT_SOUND = require('../../assets/music/correct.mp3');
const WRONG_SOUND = require('../../assets/music/wrong.mp3');

// ─── MOTIVATIONS (Senya speech bubble) ─────────────────────────────────────
const SENYA_MOTIVATIONS = [
    "You've got this! Drag and match! ✋",
    "Nice work! Keep going!",
    "Almost there! Match them all!",
    "You're doing amazing!",
    "Deep breath. You can do this!",
];

interface DragDropPair {
    left_text: string;
    left_image?: string | null;
    right_text: string;
    right_image?: string | null;
    match_id: number;
}

interface DragDropQuestionProps {
    question: {
        question_id: number;
        question_text: string;
        drag_drop_pairs: DragDropPair[];
        drag_drop_left_label?: string | null;
        drag_drop_right_label?: string | null;
        media_url?: string | null;
    };
    questionIndex: number;
    totalQuestions: number;
    onComplete: (success: boolean) => void;
    onBack: () => void;
    // Optional: fires true when a card drag starts and false when it ends,
    // so a parent screen that wraps this component in its own ScrollView
    // can disable that outer scroll for the duration of the drag. Without
    // this, a vertical/diagonal drag can get stolen by the *outer*
    // ScrollView even though this component's own inner ScrollView is
    // already disabled while dragging.
    onDragActiveChange?: (active: boolean) => void;
}

const MAX_WRONG_ATTEMPTS = 2;

type Rect = { x: number; y: number; width: number; height: number };

// ─── SHUFFLE (Fisher-Yates) ────────────────────────────────────────────────
// Used to randomize the right column so a card's match isn't always
// sitting directly across from it.
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ─── COLOR PAIRS FOR TEXT-ONLY LAYOUT ─────────────────────────────────────
type ColorPair = {
    gradient: [string, string];
    bg: string;
};

const COLOR_PAIRS: ColorPair[] = [
    { gradient: ['#7C3AED', '#6D28D9'], bg: '#F5F3FF' },
    { gradient: ['#0EA5E9', '#0284C7'], bg: '#EFF9FF' },
    { gradient: ['#F59E0B', '#D97706'], bg: '#FFFBEB' },
    { gradient: ['#10B981', '#059669'], bg: '#ECFDF5' },
    { gradient: ['#EC4899', '#DB2777'], bg: '#FDF2F8' },
    { gradient: ['#8B5CF6', '#7C3AED'], bg: '#F5F3FF' },
];

// ─── DRAG STATE FOR EACH ITEM ─────────────────────────────────────────────
interface DragState {
    pan: Animated.ValueXY;
    scale: Animated.Value;
    rotate: Animated.Value;
    opacity: Animated.Value;
}

// ─── MATCH BURST (fireworks on a correct match) ───────────────────────────
// Small confetti-style burst, native-driver only so it can't add any jank
// to the drag gesture. Fires once per correct match via the `trigger` count.
function MatchBurst({ trigger, anchor }: { trigger: number; anchor: { x: number; y: number } | null }) {
    const bits = React.useMemo(
        () => Array.from({ length: 16 }).map((_, i) => ({
            i,
            dx: (Math.random() - 0.5) * 240,
            dy: -90 - Math.random() * 170,
            color: ['#FCD34D', '#34D399', '#60A5FA', '#F472B6', '#A78BFA', '#FF8A3D'][i % 6],
            size: 6 + Math.random() * 8,
        })),
        [trigger]
    );
    const t = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!trigger) return;
        t.setValue(0);
        Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, [trigger]);

    if (!trigger || !anchor) return null;

    return (
        <View pointerEvents="none" style={[styles.burstLayer, { left: anchor.x, top: anchor.y }]}>
            {bits.map(b => (
                <Animated.View
                    key={`${trigger}-${b.i}`}
                    style={{
                        position: 'absolute',
                        width: b.size,
                        height: b.size,
                        borderRadius: 2,
                        backgroundColor: b.color,
                        opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                        transform: [
                            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, b.dx] }) },
                            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, b.dy] }) },
                            { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '420deg'] }) },
                        ],
                    }}
                />
            ))}
        </View>
    );
}

export default function DragDropQuestion({
    question,
    questionIndex,
    totalQuestions,
    onComplete,
    onBack,
    onDragActiveChange,
}: DragDropQuestionProps) {
    const { settings } = useSettings();

    const [leftItems, setLeftItems] = useState<DragDropPair[]>([]);
    const [rightItems, setRightItems] = useState<DragDropPair[]>([]);
    const [matches, setMatches] = useState<Record<number, number>>({});
    const [isComplete, setIsComplete] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [wrongPair, setWrongPair] = useState<{ left: number | null; right: number | null }>({ left: null, right: null });
    const [showContinue, setShowContinue] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [motivationIndex, setMotivationIndex] = useState(0);
    const [hoverZoneId, setHoverZoneId] = useState<number | null>(null);
    const [draggingItem, setDraggingItem] = useState<{ index: number; side: 'left' | 'right' } | null>(null);
    const [showExitModal, setShowExitModal] = useState(false);
    const [dropSuccess, setDropSuccess] = useState<number | null>(null);
    const [burstTick, setBurstTick] = useState(0);
    const [burstAnchor, setBurstAnchor] = useState<{ x: number; y: number } | null>(null);


    // ─── INDEPENDENT DRAG STATES PER ITEM ────────────────────────────────
    const dragStatesRef = useRef<Map<string, DragState>>(new Map());

    const getDragState = useCallback((key: string): DragState => {
        if (!dragStatesRef.current.has(key)) {
            dragStatesRef.current.set(key, {
                pan: new Animated.ValueXY({ x: 0, y: 0 }),
                scale: new Animated.Value(1),
                rotate: new Animated.Value(0),
                opacity: new Animated.Value(1),
            });
        }
        return dragStatesRef.current.get(key)!;
    }, []);

    // Audio states
    const [correctSound, setCorrectSound] = useState<Audio.Sound | null>(null);
    const [wrongSound, setWrongSound] = useState<Audio.Sound | null>(null);
    const [isSoundPlaying, setIsSoundPlaying] = useState(false);

    // Senya animations
    const senyaBounceAnim = useRef(new Animated.Value(0)).current;
    const senyaShakeAnim = useRef(new Animated.Value(0)).current;

    // Zone measurement refs
    const zoneRectsRef = useRef<Record<number, Rect>>({});
    const zoneRefs = useRef<Record<number, View | null>>({});
    const scrollViewRef = useRef<ScrollView>(null);

    // ─── "LATEST VALUE" REFS ───────────────────────────────────────────
    // The PanResponder for each card is created ONCE (see getPanResponder
    // below) and never rebuilt, so its callbacks close over these refs
    // instead of the state variables directly. That keeps every callback
    // reading fresh data without ever forcing React to hand out a new
    // PanResponder mid-gesture (which is what was causing the glitchiness).
    const matchesRef = useRef(matches);
    matchesRef.current = matches;
    const leftItemsRef = useRef(leftItems);
    leftItemsRef.current = leftItems;
    const rightItemsRef = useRef(rightItems);
    rightItemsRef.current = rightItems;
    const isCompleteRef = useRef(isComplete);
    isCompleteRef.current = isComplete;
    const isAnimatingRef = useRef(isAnimating);
    isAnimatingRef.current = isAnimating;
    const panResponderCacheRef = useRef<Map<string, ReturnType<typeof PanResponder.create>>>(new Map());
    const onDragActiveChangeRef = useRef(onDragActiveChange);
    onDragActiveChangeRef.current = onDragActiveChange;

    // Helper function to get full image URL
    const getFullImageUrl = (path: string | null | undefined): string | null => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        const cleanPath = path.replace(/^\/+/, '');
        return `${IMAGE_BASE_URL}/storage/${cleanPath}`;
    };

    // Check if ANY item has images
    const hasImages = React.useMemo(() => {
        const hasLeftImages = question.drag_drop_pairs?.some(pair =>
            pair.left_image && pair.left_image.length > 0
        ) ?? false;
        const hasRightImages = question.drag_drop_pairs?.some(pair =>
            pair.right_image && pair.right_image.length > 0
        ) ?? false;
        return hasLeftImages || hasRightImages;
    }, [question.drag_drop_pairs]);

    // ── Sound effects ──
    async function playCorrectSoundEffect() {
        if (!settings.soundEnabled) return;
        try {
            if (isSoundPlaying) return;
            setIsSoundPlaying(true);
            if (correctSound) await correctSound.unloadAsync();
            const { sound } = await Audio.Sound.createAsync(
                CORRECT_SOUND,
                { shouldPlay: true, isLooping: false, volume: 0.8 }
            );
            setCorrectSound(sound);
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                    setCorrectSound(null);
                    setIsSoundPlaying(false);
                }
            });
        } catch (error) {
            console.error('Failed to play correct sound:', error);
            setIsSoundPlaying(false);
        }
    }

    async function playWrongSoundEffect() {
        if (!settings.soundEnabled) return;
        try {
            if (isSoundPlaying) return;
            setIsSoundPlaying(true);
            if (wrongSound) await wrongSound.unloadAsync();
            const { sound } = await Audio.Sound.createAsync(
                WRONG_SOUND,
                { shouldPlay: true, isLooping: false, volume: 0.6 }
            );
            setWrongSound(sound);
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                    setWrongSound(null);
                    setIsSoundPlaying(false);
                }
            });
        } catch (error) {
            console.error('Failed to play wrong sound:', error);
            setIsSoundPlaying(false);
        }
    }

    // ── Senya animations ──
    const animateSenyaBounce = () => {
        senyaBounceAnim.setValue(0);
        Animated.spring(senyaBounceAnim, {
            toValue: 1,
            friction: 4,
            tension: 90,
            useNativeDriver: true,
        }).start(() => senyaBounceAnim.setValue(0));
    };

    const animateSenyaShake = () => {
        senyaShakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(senyaShakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.timing(senyaShakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
            Animated.timing(senyaShakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
            Animated.timing(senyaShakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
            Animated.timing(senyaShakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start();
    };

    // Rotate motivation every ~6s
    useEffect(() => {
        const t = setInterval(() => {
            setMotivationIndex(i => (i + 1) % SENYA_MOTIVATIONS.length);
        }, 6000);
        return () => clearInterval(t);
    }, []);

    // Cleanup sounds
    useEffect(() => {
        return () => {
            if (correctSound) correctSound.unloadAsync();
            if (wrongSound) wrongSound.unloadAsync();
        };
    }, []);

    // ── Zone measurement ──
    const measureZone = useCallback((id: number) => {
        const node = zoneRefs.current[id];
        if (node) {
            // @ts-ignore - measureInWindow exists on View
            node.measureInWindow?.((x: number, y: number, width: number, height: number) => {
                if (width > 0) {
                    zoneRectsRef.current[id] = { x, y, width, height };
                }
            });
        }
    }, []);

    const remeasureAllZones = useCallback(() => {
        const allIds = Object.keys(zoneRefs.current).map(Number);
        allIds.forEach(id => measureZone(id));
    }, [measureZone]);

    // ── Throttled remeasure while actively scrolling ──
    // ScrollView's onScroll only fires continuously if scrollEventThrottle
    // is set — without it, drop-zone rects captured before a scroll go
    // stale, so a zone you can clearly see and are hovering over doesn't
    // register as a hit. We now feed onScroll (throttled to ~10/sec so it
    // doesn't hammer measureInWindow) plus a guaranteed remeasure the
    // instant a scroll/drag ends, whether or not it had momentum.
    const lastScrollRemeasureRef = useRef(0);
    const handleScrollRemeasure = useCallback(() => {
        const now = Date.now();
        if (now - lastScrollRemeasureRef.current < 100) return;
        lastScrollRemeasureRef.current = now;
        remeasureAllZones();
    }, [remeasureAllZones]);

    // ── Hit test ──
    const findZoneAt = useCallback((pageX: number, pageY: number): number | null => {
        let best: number | null = null;
        let bestDist = Infinity;
        const pad = 44; // generous forgiveness margin — kids' fingers (and thumbs) aren't pixel-precise

        for (const key in zoneRectsRef.current) {
            const r = zoneRectsRef.current[key];
            if (!r) continue;
            const index = parseInt(key);
            if (Object.values(matchesRef.current).includes(index)) continue;

            if (pageX >= r.x - pad && pageX <= r.x + r.width + pad &&
                pageY >= r.y - pad && pageY <= r.y + r.height + pad) {
                const cx = r.x + r.width / 2;
                const cy = r.y + r.height / 2;
                const d = (pageX - cx) ** 2 + (pageY - cy) ** 2;
                if (d < bestDist) {
                    bestDist = d;
                    best = index;
                }
            }
        }
        return best;
    }, []); // stable forever — reads matchesRef.current instead of closing over `matches`

    // ── Attempt match ──
    const attemptMatch = useCallback((leftIndex: number, rightIndex: number, dragKey: string) => {
        if (isAnimating) return;
        if (leftIndex === undefined || rightIndex === undefined) return;

        setIsAnimating(true);

        const leftItem = leftItems[leftIndex];
        const rightItem = rightItems[rightIndex];

        if (!leftItem || !rightItem) {
            setIsAnimating(false);
            return;
        }

        const dragState = dragStatesRef.current.get(dragKey);
        if (!dragState) {
            setIsAnimating(false);
            return;
        }

        const { pan, scale } = dragState;

        if (leftItem.match_id === rightItem.match_id) {
            // ✅ Correct match!
            playCorrectSoundEffect();
            animateSenyaBounce();
            setDropSuccess(rightIndex);

            const zoneRect = zoneRectsRef.current[rightIndex];
            if (zoneRect) {
                setBurstAnchor({ x: zoneRect.x + zoneRect.width / 2, y: zoneRect.y + zoneRect.height / 2 });
            }
            setBurstTick(t => t + 1);

            setMatches(prev => {
                const newMatches = { ...prev, [leftIndex]: rightIndex };
                if (Object.keys(newMatches).length === leftItems.length) {
                    setIsComplete(true);
                }
                return newMatches;
            });

            // Reset drag state with animation
            Animated.parallel([
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    friction: 6,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setDraggingItem(null);
                setIsAnimating(false);
                onDragActiveChangeRef.current?.(false);
            });

            setTimeout(() => setDropSuccess(null), 400);
        } else {
            // ❌ Wrong match
            playWrongSoundEffect();
            animateSenyaShake();

            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setWrongPair({ left: leftIndex, right: rightIndex });

            Animated.parallel([
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    friction: 8,
                    tension: 60,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    friction: 6,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setDraggingItem(null);
                setIsAnimating(false);
                onDragActiveChangeRef.current?.(false);

                if (newAttempts >= MAX_WRONG_ATTEMPTS) {
                    setShowContinue(true);
                    setIsComplete(true);
                }
            });

            setTimeout(() => {
                setWrongPair({ left: null, right: null });
            }, 500);
        }
    }, [leftItems, rightItems, matches, attempts, isAnimating, leftItems.length]);

    const attemptMatchRef = useRef(attemptMatch);
    attemptMatchRef.current = attemptMatch;

    // ── Get (or lazily create) a PanResponder for a drag item ──
    // IMPORTANT: this is built ONCE per card and cached in panResponderCacheRef.
    // Previously a brand-new PanResponder (with brand-new panHandlers) was
    // created on every render — and because hoverZoneId/matches/etc changed
    // constantly *during* a drag, React kept swapping out the responder
    // attached to the Animated.View mid-gesture. RN's gesture system tracks
    // an in-progress touch against the specific responder instance that was
    // granted it, so swapping the instance mid-drag is exactly what made
    // drops feel "right on top of it but won't register." Reading everything
    // through refs below means the callbacks always see fresh state without
    // the identity of the responder ever changing.
    const getPanResponder = useCallback((index: number, side: 'left' | 'right') => {
        const dragKey = `${side}-${index}`;
        const cached = panResponderCacheRef.current.get(dragKey);
        if (cached) return cached;

        const dragState = getDragState(dragKey);
        const { pan, scale, rotate, opacity } = dragState;

        const responder = PanResponder.create({
            onStartShouldSetPanResponder: () => {
                if (isCompleteRef.current || isAnimatingRef.current) return false;
                const isMatched = side === 'left'
                    ? matchesRef.current[index] !== undefined
                    : Object.values(matchesRef.current).includes(index);
                return !isMatched;
            },
            onMoveShouldSetPanResponder: (_e, g) =>
                !isCompleteRef.current && !isAnimatingRef.current &&
                (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
            // Without this, a vertical (or diagonal) drag can get taken away
            // mid-gesture by an ancestor ScrollView's own gesture recognizer —
            // a vertical ScrollView never contests purely horizontal moves
            // (which is why "sideways" already worked), but it WILL try to
            // claim any gesture with vertical movement in it unless we
            // explicitly refuse to hand the responder back.
            onPanResponderTerminationRequest: () => false,
            onShouldBlockNativeResponder: () => true,
            onPanResponderGrant: () => {
                pan.setValue({ x: 0, y: 0 });
                scale.setValue(1.08);
                opacity.setValue(0.92);
                rotate.setValue(0);
                setDraggingItem({ index, side });
                setHoverZoneId(null);
                onDragActiveChangeRef.current?.(true);
                setTimeout(remeasureAllZones, 50);
            },
            onPanResponderMove: (evt, gesture) => {
                pan.setValue({ x: gesture.dx, y: gesture.dy });
                rotate.setValue(gesture.dx * 0.02);

                const zoneId = findZoneAt(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
                setHoverZoneId(prev => (prev === zoneId ? prev : zoneId));
            },
            onPanResponderRelease: (evt) => {
                const zoneId = findZoneAt(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
                setHoverZoneId(null);

                const matches = matchesRef.current;
                const leftItems = leftItemsRef.current;
                const rightItems = rightItemsRef.current;

                let matched = false;

                if (side === 'left' && zoneId !== null) {
                    const isRightMatched = Object.values(matches).includes(zoneId);
                    if (!isRightMatched) {
                        attemptMatchRef.current(index, zoneId, dragKey);
                        matched = true;
                    }
                } else if (side === 'right' && zoneId !== null) {
                    const isLeftMatched = matches[zoneId] !== undefined;
                    if (!isLeftMatched) {
                        const rightItem = rightItems[index];
                        const leftMatchIndex = leftItems.findIndex(
                            item => item.match_id === rightItem?.match_id
                        );
                        if (leftMatchIndex !== -1 && matches[leftMatchIndex] === undefined) {
                            attemptMatchRef.current(leftMatchIndex, index, dragKey);
                            matched = true;
                        }
                    }
                }

                if (!matched) {
                    Animated.parallel([
                        Animated.spring(pan, {
                            toValue: { x: 0, y: 0 },
                            friction: 10,
                            tension: 80,
                            useNativeDriver: true,
                        }),
                        Animated.spring(scale, {
                            toValue: 1,
                            friction: 8,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        setDraggingItem(null);
                        onDragActiveChangeRef.current?.(false);
                    });
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    friction: 8,
                    tension: 60,
                    useNativeDriver: true,
                }).start(() => {
                    setDraggingItem(null);
                    setHoverZoneId(null);
                    onDragActiveChangeRef.current?.(false);
                });
            },
        });

        panResponderCacheRef.current.set(dragKey, responder);
        return responder;
    }, [findZoneAt, remeasureAllZones, getDragState]);

    // ─── RENDER WITH IMAGES ──────────────────────────────────────────────
    const renderWithImages = () => {
        return (
            <View style={styles.imageLayoutContainer}>
                <View style={styles.imageLayoutColumn}>
                    <Text style={styles.imageLayoutLabel}>
                        {question.drag_drop_left_label || 'Signs'}
                    </Text>
                    {leftItems.map((item, index) => {
                        const isMatched = matches[index] !== undefined;
                        const isDragging = draggingItem?.index === index && draggingItem?.side === 'left';
                        const isWrongItem = wrongPair.left === index;
                        const imageUrl = getFullImageUrl(item.left_image);
                        const hasText = item.left_text && item.left_text.length > 0;

                        if (isMatched) {
                            return (
                                <View key={`left-${index}`} style={[styles.imageCard, styles.imageCardMatched]}>
                                    <View style={styles.imageCardContent}>
                                        {imageUrl && (
                                            <Image source={{ uri: imageUrl }} style={styles.imageCardImg} contentFit="contain" />
                                        )}
                                        {hasText && <Text style={styles.imageCardText}>{item.left_text}</Text>}
                                    </View>
                                    <View style={styles.matchBadge}>
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                    </View>
                                </View>
                            );
                        }

                        const dragKey = `left-${index}`;
                        const dragState = getDragState(dragKey);
                        const { pan, scale } = dragState;
                        const responder = getPanResponder(index, 'left');

                        return (
                            <Animated.View
                                key={`left-${index}`}
                                {...responder?.panHandlers}
                                style={[
                                    styles.imageCard,
                                    isDragging && styles.imageCardDragging,
                                    isWrongItem && styles.imageCardWrong,
                                    {
                                        transform: [
                                            { translateX: pan.x },
                                            { translateY: pan.y },
                                            { scale: isDragging ? scale : 1 },
                                        ],
                                        zIndex: isDragging ? 999 : 1,
                                        elevation: isDragging ? 12 : 1,
                                        opacity: isDragging ? 0.92 : 1,
                                    },
                                ]}
                            >
                                <View style={styles.imageCardContent}>
                                    {imageUrl && (
                                        <Image source={{ uri: imageUrl }} style={styles.imageCardImg} contentFit="contain" />
                                    )}
                                    {hasText && <Text style={styles.imageCardText}>{item.left_text}</Text>}
                                    {isWrongItem && (
                                        <View style={styles.wrongIndicator}>
                                            <Ionicons name="close" size={14} color="#fff" />
                                        </View>
                                    )}
                                </View>
                            </Animated.View>
                        );
                    })}
                </View>

                <View style={styles.imageDivider}>
                    <View style={styles.imageDividerIcon}>
                        <Ionicons name="arrow-forward" size={16} color="#1848c8" />
                    </View>
                </View>

                <View style={styles.imageLayoutColumn}>
                    <Text style={styles.imageLayoutLabel}>
                        {question.drag_drop_right_label || 'Meanings'}
                    </Text>
                    {rightItems.map((item, index) => {
                        const isMatched = Object.values(matches).includes(index);
                        const isHovered = hoverZoneId === index && !isMatched;
                        const isWrongItem = wrongPair.right === index;
                        const isSuccess = dropSuccess === index;
                        const imageUrl = getFullImageUrl(item.right_image);
                        const hasText = item.right_text && item.right_text.length > 0;

                        return (
                            <View
                                key={`right-${index}`}
                                ref={(ref) => {
                                    if (ref) {
                                        zoneRefs.current[index] = ref;
                                    }
                                }}
                                onLayout={() => measureZone(index)}
                                style={{ width: '100%' }}
                            >
                                <Animated.View style={[
                                    styles.imageCard,
                                    styles.imageDropZone,
                                    isMatched && styles.imageCardMatched,
                                    isHovered && styles.imageCardHovered,
                                    isWrongItem && styles.imageCardWrong,
                                    isSuccess && styles.imageCardSuccess,
                                    {
                                        transform: [
                                            { scale: isSuccess ? 1.04 : isHovered ? 1.02 : 1 },
                                        ],
                                    },
                                ]}>
                                    <View style={styles.imageDropZoneContent}>
                                        {imageUrl && (
                                            <Image source={{ uri: imageUrl }} style={styles.imageCardImg} contentFit="contain" />
                                        )}
                                        {hasText ? (
                                            <Text style={styles.imageCardText}>{item.right_text}</Text>
                                        ) : (
                                            !imageUrl && (
                                                <Text style={styles.imageDropZoneLabel}>Drop here</Text>
                                            )
                                        )}
                                        {isMatched && (
                                            <View style={styles.matchBadge}>
                                                <Ionicons name="checkmark" size={14} color="#fff" />
                                            </View>
                                        )}
                                        {isHovered && !isMatched && (
                                            <View style={styles.dropHintBadge}>
                                                <Text style={styles.dropHintText}>Drop here!</Text>
                                            </View>
                                        )}
                                    </View>
                                </Animated.View>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    // ─── RENDER WITHOUT IMAGES ──────────────────────────────────────────
    const renderWithoutImages = () => {
        return (
            <View style={styles.textLayoutContainer}>
                <View style={styles.textLayoutColumn}>
                    <Text style={styles.textLayoutLabel}>
                        {question.drag_drop_left_label || 'Signs'}
                    </Text>
                    {leftItems.map((item, index) => {
                        const isMatched = matches[index] !== undefined;
                        const isDragging = draggingItem?.index === index && draggingItem?.side === 'left';
                        const isWrongItem = wrongPair.left === index;
                        const colors = COLOR_PAIRS[index % COLOR_PAIRS.length];

                        if (isMatched) {
                            return (
                                <View key={`left-${index}`} style={[styles.textCard, styles.textCardMatched]}>
                                    <Text style={[styles.textCardText, styles.textCardMatchedText]}>{item.left_text}</Text>
                                    <View style={styles.matchBadge}>
                                        <Ionicons name="checkmark" size={12} color="#fff" />
                                    </View>
                                </View>
                            );
                        }

                        const dragKey = `left-${index}`;
                        const dragState = getDragState(dragKey);
                        const { pan, scale, rotate } = dragState;
                        const responder = getPanResponder(index, 'left');

                        return (
                            <Animated.View
                                key={`left-${index}`}
                                {...responder?.panHandlers}
                                style={[
                                    styles.textCard,
                                    isDragging && styles.textCardDragging,
                                    isWrongItem && styles.textCardWrong,
                                    {
                                        transform: [
                                            { translateX: pan.x },
                                            { translateY: pan.y },
                                            { scale: isDragging ? scale : 1 },
                                            {
                                                rotate: isDragging ? rotate.interpolate({
                                                    inputRange: [-10, 10],
                                                    outputRange: ['-2deg', '2deg']
                                                }) : '0deg'
                                            },
                                        ],
                                        zIndex: isDragging ? 999 : 1,
                                        elevation: isDragging ? 12 : 1,
                                        opacity: isDragging ? 0.92 : 1,
                                    },
                                ]}
                            >
                                <LinearGradient
                                    colors={colors.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.textCardGradient}
                                >
                                    <Text style={styles.textCardGradientText}>{item.left_text}</Text>
                                </LinearGradient>
                                {isWrongItem && (
                                    <View style={styles.wrongIndicator}>
                                        <Ionicons name="close" size={12} color="#fff" />
                                    </View>
                                )}
                            </Animated.View>
                        );
                    })}
                </View>

                <View style={styles.textDivider}>
                    <View style={styles.textDividerIcon}>
                        <Ionicons name="arrow-forward" size={12} color="#1848c8" />
                    </View>
                </View>

                <View style={styles.textLayoutColumn}>
                    <Text style={styles.textLayoutLabel}>
                        {question.drag_drop_right_label || 'Meanings'}
                    </Text>
                    {rightItems.map((item, index) => {
                        const isMatched = Object.values(matches).includes(index);
                        const isHovered = hoverZoneId === index && !isMatched;
                        const isWrongItem = wrongPair.right === index;
                        const isSuccess = dropSuccess === index;

                        return (
                            <View
                                key={`right-${index}`}
                                ref={(ref) => {
                                    if (ref) {
                                        zoneRefs.current[index] = ref;
                                    }
                                }}
                                onLayout={() => measureZone(index)}
                                style={{ width: '100%' }}
                            >
                                <Animated.View style={[
                                    styles.textCard,
                                    styles.textDropZone,
                                    isMatched && styles.textCardMatched,
                                    isHovered && styles.textCardHovered,
                                    isWrongItem && styles.textCardWrong,
                                    isSuccess && styles.textCardSuccess,
                                    {
                                        transform: [
                                            { scale: isSuccess ? 1.04 : isHovered ? 1.02 : 1 },
                                        ],
                                    },
                                ]}>
                                    {isMatched ? (
                                        <>
                                            <Text style={[styles.textCardText, styles.textCardMatchedText]}>
                                                {item.right_text}
                                            </Text>
                                            <View style={styles.matchBadge}>
                                                <Ionicons name="checkmark" size={12} color="#fff" />
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.textCardText}>
                                                {item.right_text || 'Drop here'}
                                            </Text>
                                            {isHovered && (
                                                <View style={styles.textDropHint}>
                                                    <Text style={styles.textDropHintText}>Drop here!</Text>
                                                </View>
                                            )}
                                        </>
                                    )}
                                </Animated.View>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    // ─── EXIT MODAL ────────────────────────────────────────────────────
    const renderExitModal = () => (
        <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowExitModal(false)}>
                <Pressable style={styles.modalContainer} onPress={e => e.stopPropagation()}>
                    <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconBox}>
                            <Ionicons name="exit-outline" size={30} color="#DC2626" />
                        </View>
                        <Text style={styles.modalTitle}>Exit Activity?</Text>
                        <Text style={styles.modalDescription}>
                            Your progress will be lost. Are you sure you want to exit?
                        </Text>
                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowExitModal(false)}
                            >
                                <Text style={styles.modalButtonText}>Stay</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.modalButtonConfirm]}
                                onPress={onBack}
                            >
                                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Exit</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );

    // ─── RESET STATE ────────────────────────────────────────────────────
    useEffect(() => {
        setMatches({});
        setIsComplete(false);
        setAttempts(0);
        setWrongPair({ left: null, right: null });
        setShowContinue(false);
        setIsAnimating(false);
        setDraggingItem(null);
        setHoverZoneId(null);
        setDropSuccess(null);
        zoneRectsRef.current = {};
        zoneRefs.current = {};
        dragStatesRef.current.clear();
        panResponderCacheRef.current.clear();
        onDragActiveChangeRef.current?.(false);

        if (question.drag_drop_pairs && question.drag_drop_pairs.length > 0) {
            const pairs = question.drag_drop_pairs;
            setLeftItems(pairs);
            setRightItems(shuffle(pairs));
        }
    }, [question.drag_drop_pairs, question.question_id]);

    // ─── MEASURE ZONES AFTER RENDER ──────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(remeasureAllZones, 500);
        return () => clearTimeout(timer);
    }, [leftItems, rightItems, matches]);

    const allMatched = Object.keys(matches).length === leftItems.length;
    const isGameOver = showContinue && !allMatched;

    const senyaTranslate = senyaBounceAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -15],
    });
    const senyaShake = senyaShakeAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [-10, 0, 10],
    });

    const getMotivationText = () => {
        if (isGameOver) {
            return "😅 Oops! Don't worry, let's move to the next question!";
        }
        if (allMatched) {
            return "🎉 Perfect! You matched everything!";
        }
        return SENYA_MOTIVATIONS[motivationIndex];
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContent}
                scrollEnabled={!draggingItem}
                scrollEventThrottle={16}
                onScroll={handleScrollRemeasure}
                onScrollEndDrag={remeasureAllZones}
                onMomentumScrollEnd={remeasureAllZones}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.topBar}>
                    <Pressable onPress={() => setShowExitModal(true)} style={styles.exitBtn}>
                        <Ionicons name="arrow-back" size={20} color="#0f3172" />
                    </Pressable>
                    <Text style={styles.logoText}>SEÑAS</Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                            {allMatched ? 'Done' : isGameOver ? 'Wrong' : 'Match'}
                        </Text>
                    </View>
                </View>

                <View style={styles.glassCard}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>
                            Question {questionIndex + 1} of {totalQuestions}
                        </Text>
                    </View>
                    <View style={styles.progressDots}>
                        {Array.from({ length: totalQuestions }).map((_, i) => (
                            <View key={i} style={[styles.progressDot, {
                                backgroundColor: i < questionIndex ? '#22c55e' :
                                    i === questionIndex ? '#2563EB' :
                                        'rgba(15,49,114,0.10)',
                            }]} />
                        ))}
                    </View>
                </View>

                <View style={[styles.glassCard, styles.questionCard]}>
                    <Text style={styles.questionEmoji}>🧩</Text>
                    <Text style={styles.questionText}>{question.question_text}</Text>
                    {question.media_url && (
                        <Image
                            source={{ uri: getFullImageUrl(question.media_url) || question.media_url }}
                            style={styles.questionImage}
                            contentFit="contain"
                        />
                    )}
                </View>

                {hasImages ? renderWithImages() : renderWithoutImages()}

                <View style={styles.feedbackRow}>
                    <Animated.View
                        style={{
                            transform: [
                                { translateY: senyaTranslate },
                                { translateX: senyaShake },
                            ],
                        }}
                    >
                        <Image
                            source={require('../../assets/images/img/senya_teaching.png')}
                            style={styles.senyaFeedback}
                            contentFit="contain"
                        />
                    </Animated.View>
                    <View style={[
                        styles.feedbackBubble,
                        isComplete && allMatched && styles.feedbackCorrect,
                        isComplete && !allMatched && styles.feedbackWrong,
                    ]}>
                        {(isComplete && allMatched) && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                        {(isComplete && !allMatched) && <Ionicons name="close-circle" size={18} color="#EF4444" />}
                        <Text style={[
                            styles.feedbackText,
                            isComplete && allMatched && { color: '#065f46' },
                            isComplete && !allMatched && { color: '#991b1b' },
                        ]}>
                            {getMotivationText()}
                        </Text>
                    </View>
                </View>

                {isComplete && (
                    <Pressable
                        style={[styles.primaryBtn, allMatched && styles.goldBtn]}
                        onPress={() => onComplete(allMatched)}
                    >
                        <Text style={styles.primaryBtnText}>
                            {allMatched ? '✅ Continue →' : 'Continue →'}
                        </Text>
                    </Pressable>
                )}
            </ScrollView>

            <MatchBurst trigger={burstTick} anchor={burstAnchor} />

            {renderExitModal()}
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaf5fd',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    burstLayer: {
        position: 'absolute',
        width: 1,
        height: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    logoText: {
        color: '#0f3172',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 2,
    },
    exitBtn: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
    },
    statusBadge: {
        backgroundColor: 'rgba(16,185,129,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },

    glassCard: {
        backgroundColor: 'rgba(255,255,255,0.62)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        borderRadius: 20,
        padding: 18,
        marginBottom: 12,
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 12,
        elevation: 4,
    },

    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0f3172',
    },
    progressDots: {
        flexDirection: 'row',
        gap: 4,
    },
    progressDot: {
        flex: 1,
        height: 5,
        borderRadius: 99,
    },

    questionCard: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    questionEmoji: {
        fontSize: 28,
        marginBottom: 6,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f3172',
        textAlign: 'center',
        lineHeight: 24,
    },
    questionImage: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        marginTop: 12,
        backgroundColor: 'rgba(15,49,114,0.03)',
    },

    imageLayoutContainer: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    imageLayoutColumn: {
        flex: 1,
        gap: 6,
    },
    imageLayoutLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4b7bbb',
        textAlign: 'center',
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    imageDivider: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 20,
        paddingHorizontal: 2,
    },
    imageDividerIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(24,72,200,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageCard: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(15,49,114,0.10)',
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 132,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        position: 'relative',
    },
    imageCardDragging: {
        borderColor: '#1848c8',
        backgroundColor: 'rgba(24,72,200,0.08)',
        shadowColor: '#1848c8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
        borderWidth: 2,
    },
    imageCardMatched: {
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.06)',
        borderStyle: 'dashed',
        opacity: 0.6,
    },
    imageCardWrong: {
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
    },
    imageCardHovered: {
        borderColor: '#1848c8',
        backgroundColor: 'rgba(24,72,200,0.06)',
        borderStyle: 'solid',
        shadowColor: '#1848c8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    imageCardSuccess: {
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.10)',
        borderWidth: 2,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    imageCardContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    imageCardImg: {
        width: 96,
        height: 96,
        borderRadius: 14,
        backgroundColor: 'rgba(15,49,114,0.02)',
    },
    imageCardText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0f3172',
        marginTop: 4,
        textAlign: 'center',
    },
    imageDropZone: {
        borderStyle: 'dashed',
        borderColor: 'rgba(15,49,114,0.15)',
        backgroundColor: 'rgba(255,255,255,0.3)',
        minHeight: 132,
    },
    imageDropZoneContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    imageDropZoneLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94a3b8',
        textAlign: 'center',
    },

    textLayoutContainer: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 12,
    },
    textLayoutColumn: {
        flex: 1,
        gap: 4,
    },
    textLayoutLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4b7bbb',
        textAlign: 'center',
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    textDivider: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 16,
        paddingHorizontal: 2,
    },
    textDividerIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(24,72,200,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textCard: {
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: 'rgba(15,49,114,0.10)',
        minHeight: 42,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    textCardGradient: {
        flex: 1,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 42,
    },
    textCardGradientText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    textCardDragging: {
        borderColor: '#1848c8',
        shadowColor: '#1848c8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 2,
    },
    textCardMatched: {
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.04)',
        borderStyle: 'dashed',
        opacity: 0.6,
    },
    textCardMatchedText: {
        color: '#10B981',
        textDecorationLine: 'line-through',
        textDecorationColor: '#10B981',
    },
    textCardWrong: {
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
    },
    textCardHovered: {
        borderColor: '#1848c8',
        backgroundColor: 'rgba(24,72,200,0.04)',
        borderStyle: 'solid',
        shadowColor: '#1848c8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    textCardSuccess: {
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.10)',
        borderWidth: 2,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    textCardText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f3172',
        textAlign: 'center',
        padding: 8,
    },
    textDropZone: {
        borderStyle: 'dashed',
        borderColor: 'rgba(15,49,114,0.12)',
        backgroundColor: 'rgba(255,255,255,0.3)',
        minHeight: 42,
    },
    textDropHint: {
        position: 'absolute',
        bottom: -4,
        backgroundColor: '#1848c8',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    textDropHintText: {
        fontSize: 7,
        fontWeight: '700',
        color: '#fff',
    },

    matchBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
    },
    wrongIndicator: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
    },
    dropHintBadge: {
        marginTop: 2,
        backgroundColor: '#1848c8',
        paddingHorizontal: 8,
        paddingVertical: 1,
        borderRadius: 6,
    },
    dropHintText: {
        fontSize: 8,
        fontWeight: '700',
        color: '#fff',
    },

    feedbackRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        marginVertical: 12,
    },
    senyaFeedback: {
        width: 70,
        height: 70,
        flexShrink: 0,
    },
    feedbackBubble: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
        borderRadius: 14,
        padding: 10,
    },
    feedbackCorrect: {
        backgroundColor: 'rgba(236,253,245,0.88)',
        borderColor: '#a7f3d0',
    },
    feedbackWrong: {
        backgroundColor: 'rgba(254,242,242,0.88)',
        borderColor: '#fecaca',
    },
    feedbackText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: '#0f3172',
        lineHeight: 17,
    },

    primaryBtn: {
        backgroundColor: '#1848c8',
        borderRadius: 60,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#1848c8',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
        elevation: 10,
    },
    goldBtn: {
        backgroundColor: '#D97706',
        shadowColor: '#D97706',
    },
    primaryBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '88%',
        maxWidth: 340,
        borderRadius: 28,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 28,
        borderRadius: 28,
        alignItems: 'center',
    },
    modalIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(239,68,68,0.10)',
        borderWidth: 1.5,
        borderColor: 'rgba(239,68,68,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f3172',
        marginBottom: 8,
    },
    modalDescription: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        lineHeight: 20,
        marginBottom: 24,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 40,
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    modalButtonConfirm: {
        backgroundColor: '#DC2626',
        flex: 1.3,
    },
    modalButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f3172',
    },
});