// app/rate-us.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Pressable,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Animated,
    StatusBar,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';

// ── Icons (matching help.tsx & about.tsx exactly) ──────────────────────────

function BackIcon() {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#0f3172" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function StarHeaderIcon() {
    return (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <Path
                d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7z"
                fill="#2563EB"
                stroke="#2563EB"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

function ChatIcon() {
    return (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <Path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

// ── Rating Config ──────────────────────────────────────────────────────────

// Colors matching the teacher dashboard's CSS filter effects:
// 1 = gray-dark, 2 = blue-gray, 3 = warm yellow, 4 = bright yellow, 5 = golden glow
const STAR_CONFIG: Record<number, { mood: string; desc: string; glowColor: string; tintStyle: object }> = {
    1: { mood: '🙁', desc: 'We will work hard to improve!', glowColor: '#9CA3AF', tintStyle: { opacity: 0.55 } },
    2: { mood: '😐', desc: "We'll try to do better!",       glowColor: '#93C5FD', tintStyle: { opacity: 0.72, tintColor: '#8BA9C8' } },
    3: { mood: '🙂', desc: 'Nice! Thanks for playing!',     glowColor: '#FDE68A', tintStyle: { opacity: 0.85 } },
    4: { mood: '😄', desc: 'Yay! Glad you like learning!',  glowColor: '#FCD34D', tintStyle: { opacity: 1.0 } },
    5: { mood: '🤩', desc: 'Amazing! You made our day! ⭐',  glowColor: '#FBBF24', tintStyle: { opacity: 1.0 } },
};

const SENYA_IMG = require('../assets/images/img/senya_face.png');

export default function RateUs() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [rating, setRating]       = useState(0);
    const [feedback, setFeedback]   = useState('');
    const [isApproved, setIsApproved] = useState<boolean | null>(null);
    const [hasExisting, setHasExisting] = useState(false);
    const [loading, setLoading]     = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Bounce animations per star
    const scales = useRef([
        new Animated.Value(1),
        new Animated.Value(1),
        new Animated.Value(1),
        new Animated.Value(1),
        new Animated.Value(1),
    ]).current;

    useEffect(() => {
        (async () => {
            try {
                const res = await api.getRating();
                if (res?.rating) {
                    setRating(res.rating.rating ?? 0);
                    setFeedback(res.rating.feedback ?? '');
                    setIsApproved(!!res.rating.is_approved);
                    setHasExisting(true);
                }
            } catch (e) {
                // silent — user may not have rated yet
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSelectRating = (selected: number) => {
        setRating(selected);

        Animated.sequence([
            Animated.timing(scales[selected - 1], { toValue: 1.28, duration: 100, useNativeDriver: true }),
            Animated.spring(scales[selected - 1],  { toValue: 1.12, friction: 3, tension: 40, useNativeDriver: true }),
        ]).start();

        scales.forEach((s, idx) => {
            if (idx !== selected - 1) {
                Animated.timing(s, { toValue: 1, duration: 100, useNativeDriver: true }).start();
            }
        });
    };

    const handleSubmit = async () => {
        if (rating < 1) {
            Alert.alert('Pick a Star! ⭐', 'Please tap one of the Senya faces to give your rating.');
            return;
        }
        Keyboard.dismiss();
        setSubmitting(true);
        try {
            const res = await api.submitRating(rating, feedback);
            setIsApproved(!!res?.rating?.is_approved);
            setHasExisting(true);
            Alert.alert('Yay, Thank You! 🎉', 'We got your rating! A teacher will check it first before everyone sees it.');
        } catch (error: any) {
            Alert.alert('Oops!', error?.message || 'Something went wrong. Please try again!');
        } finally {
            setSubmitting(false);
        }
    };

    // Compute platform-safe header top padding — identical to about.tsx
    const androidTopPadding = Platform.OS === 'android'
        ? Math.max(insets.top, (StatusBar.currentHeight ?? 24)) + 12
        : 16;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* ── Header — identical structure to about.tsx & help.tsx ── */}
            <View style={[styles.header, { paddingTop: androidTopPadding }]}>
                <Pressable
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <BackIcon />
                </Pressable>
                <Text style={styles.headerTitle}>Rate Us</Text>
                <View style={styles.headerSpacer} />
            </View>

            {/* ── Content ── */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Senya Logo + Tagline */}
                        <View style={styles.logoContainer}>
                            <Image source={SENYA_IMG} style={styles.logo} resizeMode="contain" />
                        </View>
                        <Text style={styles.appName}>SEÑAS</Text>
                        <Text style={styles.appSubtitle}>How do you feel about the app? 😊</Text>

                        <View style={styles.divider} />

                        {loading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="large" color="#2563EB" />
                            </View>
                        ) : (
                            <>
                                {/* ─── Section 1: Senya Rating ─── */}
                                <View style={styles.sectionCard}>
                                    <View style={styles.sectionHeader}>
                                        <View style={styles.iconBox}><StarHeaderIcon /></View>
                                        <Text style={styles.sectionTitle}>Tap a Senya face!</Text>
                                    </View>

                                    {/* Senya Face Row */}
                                    <View style={styles.senyaRow}>
                                        {[1, 2, 3, 4, 5].map((star) => {
                                            const isLit      = rating >= star;
                                            const isSelected = rating === star;
                                            const cfg = STAR_CONFIG[star];

                                            return (
                                                <Pressable
                                                    key={star}
                                                    onPress={() => handleSelectRating(star)}
                                                    style={styles.senyaBtn}
                                                    hitSlop={6}
                                                >
                                                    <Animated.View
                                                        style={[
                                                            styles.senyaImgWrap,
                                                            isSelected && {
                                                                ...styles.senyaImgWrapSelected,
                                                                shadowColor: cfg.glowColor,
                                                            },
                                                            { transform: [{ scale: scales[star - 1] }] },
                                                        ]}
                                                    >
                                                        {/* Gray when not yet reached, full color when lit */}
                                                        <Image
                                                            source={SENYA_IMG}
                                                            style={[
                                                                styles.senyaFace,
                                                                isLit ? styles.senyaLit : styles.senyaGray,
                                                            ]}
                                                            resizeMode="contain"
                                                        />
                                                    </Animated.View>
                                                </Pressable>
                                            );
                                        })}
                                    </View>

                                    {/* Rating Summary Banner */}
                                    <View style={[styles.ratingBanner, rating === 0 && styles.ratingBannerEmpty]}>
                                        {rating > 0 ? (
                                            <View style={styles.bannerRow}>
                                                <Text style={styles.bannerMood}>{STAR_CONFIG[rating].mood}</Text>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.bannerTitle}>
                                                        {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                                                    </Text>
                                                    <Text style={styles.bannerDesc}>{STAR_CONFIG[rating].desc}</Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <Text style={styles.bannerPlaceholder}>Tap a Senya face above 👆</Text>
                                        )}
                                    </View>
                                </View>

                                {/* ─── Section 2: Feedback ─── */}
                                <View style={styles.sectionCard}>
                                    <View style={styles.sectionHeader}>
                                        <View style={styles.iconBox}><ChatIcon /></View>
                                        <Text style={styles.sectionTitle}>Tell us more!</Text>
                                        <Text style={styles.optionalTag}>Optional</Text>
                                    </View>
                                    <TextInput
                                        style={styles.feedbackInput}
                                        value={feedback}
                                        onChangeText={setFeedback}
                                        placeholder="What do you love? What can we make better? 💬"
                                        placeholderTextColor="#94A3B8"
                                        multiline
                                        numberOfLines={4}
                                        maxLength={1000}
                                        textAlignVertical="top"
                                    />
                                    <Text style={styles.charCount}>{feedback.length} / 1000</Text>
                                </View>

                                {/* ─── Section 3: Status (if already submitted) ─── */}
                                {hasExisting && (
                                    <View style={[styles.statusCard, isApproved ? styles.statusApproved : styles.statusPending]}>
                                        <View style={styles.statusHeader}>
                                            <Ionicons
                                                name={isApproved ? 'checkmark-circle' : 'time'}
                                                size={20}
                                                color={isApproved ? '#059669' : '#D97706'}
                                            />
                                            <Text style={[styles.statusTitle, isApproved ? styles.statusTitleGreen : styles.statusTitleAmber]}>
                                                {isApproved ? '🌟 Your rating is on the website!' : '⏳ Waiting for a teacher to check it'}
                                            </Text>
                                        </View>
                                        <Text style={styles.statusDesc}>
                                            {isApproved
                                                ? 'Great news! Everyone can now see your rating. Thank you for sharing! 🎉'
                                                : "Don't worry — a teacher will look at it soon. Once they say it's okay, everyone can see it!"}
                                        </Text>
                                    </View>
                                )}

                                {/* ─── Submit Button ─── */}
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.submitBtn,
                                        (rating === 0 || submitting) && styles.submitBtnDisabled,
                                        pressed && styles.submitBtnPressed,
                                    ]}
                                    onPress={handleSubmit}
                                    disabled={submitting || rating === 0}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <View style={styles.submitBtnInner}>
                                            <Ionicons name="star" size={17} color="#FFFFFF" style={{ marginRight: 7 }} />
                                            <Text style={styles.submitBtnText}>
                                                {hasExisting ? 'Update My Rating' : 'Submit Rating'}
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>

                                <Text style={styles.footerNote}>
                                    All ratings are checked by a teacher before they go public 🔍
                                </Text>
                            </>
                        )}
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ── Styles — background #eaf5fd matches about.tsx exactly ───────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaf5fd',      // ← exact same as about.tsx & help.tsx
    },

    // Header — pixel-perfect match to about.tsx
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(15,49,114,0.08)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,49,114,0.06)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f3172',
    },
    headerSpacer: { width: 40 },

    // Content scroll
    content: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },

    // Logo / hero — matches about.tsx logo section
    logoContainer: {
        width: 100,
        height: 100,
        backgroundColor: '#FFFFFF',
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
        marginBottom: 12,
    },
    logo: { width: 70, height: 70 },
    appName: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0f3172',
        letterSpacing: 3,
    },
    appSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 16,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(15,49,114,0.08)',
        marginVertical: 12,
    },
    loadingRow: {
        paddingVertical: 50,
        alignItems: 'center',
    },

    // Section Card — matches about.tsx sectionCard
    sectionCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.06)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(37,99,235,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f3172',
        flex: 1,
    },
    optionalTag: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ── Senya Rating Row ──────────────────────────────────────────────────
    senyaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 2,
    },
    senyaBtn: {
        alignItems: 'center',
        flex: 1,
    },
    senyaImgWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    senyaImgWrapSelected: {
        backgroundColor: '#EFF6FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 2,
        borderColor: 'rgba(37,99,235,0.25)',
    },
    senyaFace: {
        width: 48,
        height: 48,
    },
    // Simple two-state: gray = not yet selected, full color = lit
    senyaGray: { tintColor: '#C0C0C8', opacity: 0.55 },   // all unlit stars — gray
    senyaLit:  { opacity: 1.0 },                          // lit stars — natural full color

    // Rating banner under stars
    ratingBanner: {
        marginTop: 14,
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.06)',
    },
    ratingBannerEmpty: { alignItems: 'center', paddingVertical: 10 },
    bannerPlaceholder: {
        fontSize: 12.5,
        color: '#94A3B8',
        fontWeight: '500',
        fontStyle: 'italic',
    },
    bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bannerMood: { fontSize: 26 },
    bannerTitle: { fontSize: 13.5, fontWeight: '800', color: '#0f3172' },
    bannerDesc:  { fontSize: 12, fontWeight: '500', color: '#64748B', marginTop: 1 },

    // Feedback input
    feedbackInput: {
        width: '100%',
        minHeight: 100,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.10)',
        borderRadius: 12,
        padding: 13,
        fontSize: 14,
        color: '#0F172A',
        lineHeight: 20,
        marginBottom: 6,
    },
    charCount: { alignSelf: 'flex-end', fontSize: 11, color: '#94A3B8', fontWeight: '600' },

    // Status card
    statusCard: {
        width: '100%',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
    },
    statusApproved: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
    statusPending:  { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
    statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    statusTitle: { fontSize: 13.5, fontWeight: '800', flex: 1 },
    statusTitleGreen: { color: '#065F46' },
    statusTitleAmber: { color: '#92400E' },
    statusDesc: { fontSize: 12.5, color: '#475569', fontWeight: '500', lineHeight: 18, paddingLeft: 28 },

    // Submit button
    submitBtn: {
        width: '100%',
        backgroundColor: '#2563EB',
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 3,
        marginTop: 6,
    },
    submitBtnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0, elevation: 0 },
    submitBtnPressed:  { opacity: 0.9 },
    submitBtnInner:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    submitBtnText:     { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },

    // Footer note
    footerNote: {
        marginTop: 18,
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 17,
    },
});