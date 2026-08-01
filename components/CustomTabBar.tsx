// components/CustomTabBar.tsx
import React, { useEffect, useRef } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Easing,
    Dimensions,
    Platform,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '../constants/Colors';

// ── PALETTE ──────────────────────────────────────────────────────────
const G = {
    start: '#C1EAFF',
    mid: '#BFE7FB',
    mid2: '#E6F4FE',
    end: '#F8FCFF',
};

const C = {
    ink: '#123A6B',
    inkSoft: '#5B84B1',
    blue: '#2F86D8',
    blueDeep: '#1E63B8',
    pressed: '#1848C8',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── LAYOUT CONSTANTS ─────────────────────────────────────────────────
const BAR_HEIGHT = 58;
const CIRCLE_SIZE = 54;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const HALO_PADDING = 7;                       // white ring thickness around the circle
const HALO_SIZE = CIRCLE_SIZE + HALO_PADDING * 2;
const HALO_RADIUS = HALO_SIZE / 2;
const NOTCH_WIDTH = 50;
const NOTCH_DEPTH = 26;
const CORNER_RADIUS = 26;
const MIN_BOTTOM_PADDING = 6;                 // was 10 + full inset -> lots of empty space
const GESTURE_ROUTE_NAME = 'gesture';

// ── NOTCHED BAR SVG PATH ─────────────────────────────────────────────
function getBarPath(width: number, height: number) {
    const cx = width / 2;

    return `
    M 0, ${CORNER_RADIUS}
    Q 0,0 ${CORNER_RADIUS},0
    L ${cx - NOTCH_WIDTH}, 0
    C ${cx - NOTCH_WIDTH + 18},0 ${cx - 26},${NOTCH_DEPTH} ${cx},${NOTCH_DEPTH}
    C ${cx + 26},${NOTCH_DEPTH} ${cx + NOTCH_WIDTH - 18},0 ${cx + NOTCH_WIDTH},0
    L ${width - CORNER_RADIUS}, 0
    Q ${width},0 ${width},${CORNER_RADIUS}
    L ${width}, ${height}
    L 0, ${height}
    Z
  `;
}

// ── CLEAN MINIMAL OUTLINE ICONS ──────────────────────────────────────
function HomeIcon({ active }: { active: boolean }) {
    const color = active ? C.blue : C.inkSoft;
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Path
                d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V10.5Z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={active ? 'rgba(47, 134, 216, 0.10)' : 'none'}
            />
        </Svg>
    );
}

function LessonIcon({ active }: { active: boolean }) {
    const color = active ? C.blue : C.inkSoft;
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            {/* Open book: two pages fanning from a center spine — unambiguous at small size */}
            <Path
                d="M12 6.5C10.4 5.1 8.2 4.3 6 4.3C4.9 4.3 3.9 4.5 3 4.8V17.8C3.9 17.5 4.9 17.3 6 17.3C8.2 17.3 10.4 18.1 12 19.5"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <Path
                d="M12 6.5C13.6 5.1 15.8 4.3 18 4.3C19.1 4.3 20.1 4.5 21 4.8V17.8C20.1 17.5 19.1 17.3 18 17.3C15.8 17.3 13.6 18.1 12 19.5"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <Path
                d="M12 6.5V19.5"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
            />
        </Svg>
    );
}

function TrophyIcon({ active }: { active: boolean }) {
    const color = active ? C.blue : C.inkSoft;
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Path
                d="M8 21H16M12 17V21M7 4H17V9C17 11.7614 14.7614 14 12 14C9.23858 14 7 11.7614 7 9V4Z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <Path
                d="M7 6H4C2.89543 6 2 6.89543 2 8V9C2 10.6569 3.34315 12 5 12H7M17 6H20C21.1046 6 22 6.89543 22 8V9C22 10.6569 20.6569 12 19 12H17"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </Svg>
    );
}

function UserIcon({ active }: { active: boolean }) {
    const color = active ? C.blue : C.inkSoft;
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Circle
                cx="12"
                cy="7"
                r="4"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <Path
                d="M20 21V19C20 16.7909 16.4183 15 12 15C7.58172 15 4 16.7909 4 19V21"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </Svg>
    );
}

function HandGlyph({ pressed = false }: { pressed?: boolean }) {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path
                d="M9 3V14M12 5V14M15 7V14M18 10V14C18 17.314 15.314 20 12 20C8.686 20 6 17.314 6 14V3"
                stroke={pressed ? '#FFFFFF' : C.ink}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </Svg>
    );
}

const TAB_ICONS: Record<string, (active: boolean) => React.ReactNode> = {
    dashboard: (active) => <HomeIcon active={active} />,
    lessons: (active) => <LessonIcon active={active} />,
    achievements: (active) => <TrophyIcon active={active} />,
    profile: (active) => <UserIcon active={active} />,
};

// ── SIDE TAB ─────────────────────────────────────────────────────────
function SideTab({
    isFocused,
    onPress,
    renderIcon,
}: {
    isFocused: boolean;
    onPress: () => void;
    renderIcon: (active: boolean) => React.ReactNode;
}) {
    const scaleAnim = useRef(new Animated.Value(isFocused ? 1.08 : 1)).current;
    const dotAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
    const pressScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: isFocused ? 1.1 : 1,
                friction: 7,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.timing(dotAnim, {
                toValue: isFocused ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isFocused]);

    const handlePressIn = () => {
        Animated.spring(pressScale, { toValue: 0.88, friction: 6, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                onPress();
            }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.sideTab}
        >
            <Animated.View style={{ transform: [{ scale: pressScale }], alignItems: 'center' }}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    {renderIcon(isFocused)}
                </Animated.View>
                {/* Subtle active indicator dot */}
                <Animated.View
                    style={[
                        styles.activeDot,
                        { opacity: dotAnim, transform: [{ scale: dotAnim }] },
                    ]}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

// ── CENTER GESTURE TAB ───────────────────────────────────────────────
// White halo ring keeps the blue circle readable on blue screens, and the
// gradient slowly drifts inside the circle with a soft glow on press.
const GRADIENT_TRAVEL = CIRCLE_SIZE * 0.6;

function GestureTab({ isFocused, onPress }: { isFocused: boolean; onPress: () => void }) {
    const pressScale = useRef(new Animated.Value(1)).current;
    const glow = useRef(new Animated.Value(0)).current;
    const press = useRef(new Animated.Value(0)).current;
    const drift = useRef(new Animated.Value(0)).current;
    // Stays at 1 for as long as this tab is the active screen, 0 otherwise —
    // separate from `press`, which is only for the momentary touch-down feedback.
    const activeWash = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

    // Continuous, very slow gradient drift — reads as a living surface, not a distraction.
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(drift, {
                    toValue: 1,
                    duration: 4200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(drift, {
                    toValue: 0,
                    duration: 4200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [drift]);

    // Gentle glow pulse whenever this tab becomes active.
    useEffect(() => {
        if (!isFocused) return;
        Animated.sequence([
            Animated.timing(glow, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(glow, {
                toValue: 0,
                duration: 620,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start();
    }, [isFocused, glow]);

    // Fade the dark-blue wash in when this becomes the active tab, and back out
    // when the user navigates to a different tab.
    useEffect(() => {
        Animated.timing(activeWash, {
            toValue: isFocused ? 1 : 0,
            duration: 260,
            easing: isFocused ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [isFocused, activeWash]);

    // Single source of truth for "return to resting state". Called on press-out,
    // on press (navigation), and whenever focus changes — so the press visuals can
    // never get stranded mid-way if the touch is cancelled by a screen transition.
    const releaseRef = useRef<(resetGlow?: boolean) => void>(() => { });
    const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const release = (resetGlow = true) => {
        if (releaseTimer.current) {
            clearTimeout(releaseTimer.current);
            releaseTimer.current = null;
        }
        const anims = [
            Animated.spring(pressScale, { toValue: 1, friction: 5, useNativeDriver: true }),
            Animated.timing(press, {
                toValue: 0,
                duration: 260,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
        ];
        if (resetGlow) {
            anims.push(
                Animated.timing(glow, {
                    toValue: 0,
                    duration: 420,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
            );
        }
        Animated.parallel(anims).start();
    };
    releaseRef.current = release;

    // Focus change (e.g. navigating to the gesture screen) always clears the press
    // state; the glow is left to the focus-pulse effect above so it can still play.
    useEffect(() => {
        releaseRef.current(false);
    }, [isFocused]);

    // Unmount / blur safety.
    useEffect(() => {
        return () => {
            if (releaseTimer.current) clearTimeout(releaseTimer.current);
        };
    }, []);

    const handlePressIn = () => {
        if (releaseTimer.current) clearTimeout(releaseTimer.current);
        Animated.parallel([
            Animated.spring(pressScale, { toValue: 0.93, friction: 6, useNativeDriver: true }),
            Animated.timing(press, {
                toValue: 1,
                duration: 140,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(glow, {
                toValue: 1,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            // Nudge the gradient forward on touch for a tactile "sweep".
            Animated.timing(drift, {
                toValue: 1,
                duration: 420,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
        // Hard fallback: if press-out never arrives (touch cancelled by navigation),
        // release automatically so nothing freezes mid-animation.
        releaseTimer.current = setTimeout(() => releaseRef.current(), 900);
    };

    const handlePressOut = () => {
        release();
    };

    const translateX = drift.interpolate({
        inputRange: [0, 1],
        outputRange: [-GRADIENT_TRAVEL / 2, GRADIENT_TRAVEL / 2],
    });
    const translateY = drift.interpolate({
        inputRange: [0, 1],
        outputRange: [GRADIENT_TRAVEL / 4, -GRADIENT_TRAVEL / 4],
    });

    // Dark blue shows when actively pressed OR when this tab is the active
    // screen — either one alone is enough, and they never need to stack past "on".
    const tint = Animated.add(press, activeWash).interpolate({
        inputRange: [0, 1, 2],
        outputRange: [0, 1, 1],
        extrapolate: 'clamp',
    });

    // Swap the glyph quickly and never linger at the 50/50 blend (which reads gray).
    const inkGlyphOpacity = tint.interpolate({
        inputRange: [0, 0.25, 1],
        outputRange: [1, 0, 0],
    });
    const whiteGlyphOpacity = tint.interpolate({
        inputRange: [0, 0.12, 1],
        outputRange: [0, 1, 1],
    });

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
                onPress();
            }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.gestureWrapper}
        >
            {/* Soft glow halo — sits behind the white ring */}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.glowRing,
                    {
                        opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
                        transform: [
                            { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.14] }) },
                        ],
                    },
                ]}
            />

            {/* White ring so the button never blends into blue screens */}
            <Animated.View style={[styles.halo, { transform: [{ scale: pressScale }] }]}>
                <View style={styles.gestureButton}>
                    <Animated.View
                        style={[
                            styles.gradientLayer,
                            { transform: [{ translateX }, { translateY }] },
                        ]}
                    >
                        <LinearGradient
                            colors={[G.start, G.mid, G.mid2, G.end]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>

                    {/* Darker wash: on while pressed, and while this tab is active */}
                    <Animated.View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, { opacity: tint }]}
                    >
                        <LinearGradient
                            colors={[C.pressed, C.blueDeep]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                    <View style={styles.glyphLayer}>
                        <Animated.View style={{ opacity: inkGlyphOpacity }}>
                            <HandGlyph />
                        </Animated.View>
                        <Animated.View style={[styles.glyphLayer, StyleSheet.absoluteFill, { opacity: whiteGlyphOpacity }]}>
                            <HandGlyph pressed />
                        </Animated.View>
                    </View>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

// ── MAIN TAB BAR ────────────────────────────────────────────────────
export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    // Trim the safe-area padding so the bar doesn't sit on a slab of white space.
    const bottomPadding = insets.bottom > 0
        ? Math.max(insets.bottom - 12, MIN_BOTTOM_PADDING)
        : MIN_BOTTOM_PADDING;
    const totalHeight = BAR_HEIGHT + bottomPadding;
    const barPath = getBarPath(SCREEN_WIDTH, totalHeight);

    const nonGestureRoutes = state.routes.filter((r) => r.name !== GESTURE_ROUTE_NAME);
    const leftRoutes = nonGestureRoutes.slice(0, 2);
    const rightRoutes = nonGestureRoutes.slice(2);
    const gestureRoute = state.routes.find((r) => r.name === GESTURE_ROUTE_NAME);

    const renderTab = (route: typeof state.routes[0]) => {
        const routeIndex = state.routes.findIndex((r) => r.key === route.key);
        const isFocused = state.index === routeIndex;

        const onPress = () => {
            const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
            }
        };

        return (
            <SideTab
                key={route.key}
                isFocused={isFocused}
                onPress={onPress}
                renderIcon={TAB_ICONS[route.name] ?? (() => null)}
            />
        );
    };

    return (
        <View style={[styles.container, { height: totalHeight }]} pointerEvents="box-none">
            {/* Curved notched bar SVG */}
            <Svg width={SCREEN_WIDTH} height={totalHeight} style={styles.svgBar}>
                <Path d={barPath} fill="#FFFFFF" />
            </Svg>

            <View style={styles.row}>
                {/* Left tab items */}
                <View style={styles.sideGroup}>{leftRoutes.map(renderTab)}</View>

                {/* Notch clearance space in center */}
                <View style={styles.centerSpace} />

                {/* Right tab items */}
                <View style={styles.sideGroup}>{rightRoutes.map(renderTab)}</View>
            </View>

            {/* Floating center gesture button */}
            {gestureRoute && (
                <GestureTab
                    isFocused={state.routes[state.index]?.name === GESTURE_ROUTE_NAME}
                    onPress={() => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: gestureRoute.key,
                            canPreventDefault: true,
                        });
                        if (
                            state.routes[state.index]?.name !== GESTURE_ROUTE_NAME &&
                            !event.defaultPrevented
                        ) {
                            navigation.navigate(gestureRoute.name);
                        }
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: SCREEN_WIDTH,
        backgroundColor: 'transparent',
    },
    svgBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        ...Platform.select({
            ios: {
                shadowColor: C.ink,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
            },
            android: { elevation: 12 },
        }),
    },
    row: {
        flexDirection: 'row',
        height: BAR_HEIGHT,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
    },
    sideGroup: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    centerSpace: {
        width: NOTCH_WIDTH * 2,
    },
    sideTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: BAR_HEIGHT,
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: C.blue,
        marginTop: 4,
    },
    gestureWrapper: {
        position: 'absolute',
        left: SCREEN_WIDTH / 2 - HALO_RADIUS,
        top: -HALO_RADIUS + 12,
        width: HALO_SIZE,
        height: HALO_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowRing: {
        position: 'absolute',
        width: HALO_SIZE + 14,
        height: HALO_SIZE + 14,
        borderRadius: (HALO_SIZE + 14) / 2,
        backgroundColor: C.blue,
    },
    halo: {
        width: HALO_SIZE,
        height: HALO_SIZE,
        borderRadius: HALO_RADIUS,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: G.mid2,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: C.blueDeep,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.18,
                shadowRadius: 10,
            },
            android: { elevation: 10 },
        }),
    },
    gestureButton: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_RADIUS,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientLayer: {
        position: 'absolute',
        left: -GRADIENT_TRAVEL,
        right: -GRADIENT_TRAVEL,
        top: -GRADIENT_TRAVEL,
        bottom: -GRADIENT_TRAVEL,
    },
    glyphLayer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});