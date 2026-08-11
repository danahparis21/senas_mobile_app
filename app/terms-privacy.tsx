import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Pressable,
    ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

// ── SUNNY SKY PALETTE (matches app-wide styling) ────────────────────
const C = {
    ink: '#123A6B',
    inkSoft: '#5B84B1',
    blue: '#2F86D8',
    blueDeep: '#1E63B8',
    sun: '#FBBF24',
    sunDeep: '#B4700A',
    card: 'rgba(255, 255, 255, 0.94)',
    cardLine: 'rgba(255, 255, 255, 0.95)',
    sky: '#E6F1FF',
    green: '#10B981',
    greenSoft: 'rgba(16, 185, 129, 0.12)',
};

// ── ICONS ─────────────────────────────────────────────────────────
function BackIcon({ size = 20, color = C.ink }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 18l-6-6 6-6" />
        </Svg>
    );
}

function ShieldIcon({ size = 18, color = C.blueDeep }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
            <Path d="M9 12l2 2 4-4" />
        </Svg>
    );
}

function DocIcon({ size = 18, color = C.blueDeep }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <Path d="M14 2v6h6" />
            <Line x1="8" y1="13" x2="16" y2="13" />
            <Line x1="8" y1="17" x2="13" y2="17" />
        </Svg>
    );
}

function CameraOffIcon({ size = 18, color = C.green }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M2 2l20 20" />
            <Path d="M9.5 5h3.5l1.5 2H19a2 2 0 0 1 2 2v9.5" />
            <Path d="M17.5 17.5A2 2 0 0 1 16 18H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h.5" />
            <Circle cx="12" cy="13" r="3.2" />
        </Svg>
    );
}

function HandIcon({ size = 18, color = C.blueDeep }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M18 11V6a2 2 0 0 0-4 0" />
            <Path d="M14 10V4a2 2 0 0 0-4 0v6" />
            <Path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
            <Path d="M6 14v-2a2 2 0 0 0-4 0v3a8 8 0 0 0 8 8h2a8 8 0 0 0 8-8v-3" />
        </Svg>
    );
}

function TeacherIcon({ size = 18, color = C.blueDeep }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="8" r="4" />
            <Path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </Svg>
    );
}

// ── SHARED SUB-COMPONENTS ────────────────────────────────────────
function SectionCard({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
                <View style={styles.iconBox}>{icon}</View>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

function Bullet({ text }: { text: string }) {
    return (
        <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

function Paragraph({ text }: { text: string }) {
    return <Text style={styles.description}>{text}</Text>;
}

// ── HIGHLIGHT BANNER (child-safety promise) ──────────────────────
function SafetyBanner() {
    return (
        <View style={styles.safetyBanner}>
            <View style={styles.safetyIconBox}>
                <CameraOffIcon size={22} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.safetyTitle}>Your camera is never recorded</Text>
                <Text style={styles.safetyDesc}>
                    SEÑAS never stores photos or videos of students. We only track hand-point
                    positions in real time to check signs — then those points are gone.
                </Text>
            </View>
        </View>
    );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────
export default function TermsPrivacyScreen() {
    const router = useRouter();
    const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
    const [tab, setTab] = useState<'terms' | 'privacy'>(
        tabParam === 'terms' ? 'terms' : 'privacy'
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <BackIcon />
                    </Pressable>
                    <Text style={styles.headerTitle}>Terms & Privacy</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.content}>
                    {/* Tab Switcher */}
                    <View style={styles.tabSwitcher}>
                        <Pressable
                            style={[styles.tabBtn, tab === 'privacy' && styles.tabBtnActive]}
                            onPress={() => setTab('privacy')}
                        >
                            <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextActive]}>
                                Privacy Policy
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.tabBtn, tab === 'terms' && styles.tabBtnActive]}
                            onPress={() => setTab('terms')}
                        >
                            <Text style={[styles.tabText, tab === 'terms' && styles.tabTextActive]}>
                                Terms of Use
                            </Text>
                        </Pressable>
                    </View>

                    <Text style={styles.updatedText}>Last updated: August 11, 2026</Text>

                    {tab === 'privacy' ? (
                        <>
                            <SafetyBanner />

                            <SectionCard icon={<ShieldIcon />} title="Our Privacy Promise">
                                <Paragraph text="SEÑAS is built for classrooms teaching Filipino Sign Language (FSL). We designed the app so students can practice signing safely, without their camera footage ever being saved or shared." />
                            </SectionCard>

                            <SectionCard icon={<HandIcon />} title="What We Actually Collect">
                                <Bullet text="Hand-point positions from MediaPipe, used only to check if a sign was formed correctly" />
                                <Bullet text="Lesson progress, scores, streaks, and XP earned during practice" />
                                <Bullet text="Basic account info such as name and class section, set up by the school or teacher" />
                                <Bullet text="We do not record, capture, save, or upload any photo or video from the device camera" />
                            </SectionCard>

                            <SectionCard icon={<CameraOffIcon />} title="How Camera Tracking Works">
                                <Paragraph text="When a student practices a sign, the camera feed is processed on the device using MediaPipe to detect hand landmarks — points marking where fingers and joints are. Only those coordinate points are used to score the sign. The camera image itself is never recorded or sent anywhere." />
                            </SectionCard>

                            <SectionCard icon={<TeacherIcon />} title="Who Can See Student Data">
                                <Paragraph text="Only the student's own teacher can view performance results, and only through the teacher dashboard for their own class." />
                                <Bullet text="Teachers see lesson progress, scores, and completed activities" />
                                <Bullet text="Other students, parents without dashboard access, and the public cannot view this data" />
                                <Bullet text="We do not sell student data or use it for advertising" />
                            </SectionCard>

                            <SectionCard icon={<DocIcon />} title="Data Storage & Retention">
                                <Paragraph text="Progress data is stored securely and kept only for as long as needed to support learning and reporting. Schools or teachers may request that a student's records be removed." />
                            </SectionCard>

                            <SectionCard icon={<ShieldIcon />} title="Children's Privacy">
                                <Paragraph text="SEÑAS is designed for use in a classroom setting under teacher supervision. Because no camera footage is ever recorded and no images leave the device, students can practice signing with their camera on without privacy risk." />
                            </SectionCard>

                            <SectionCard icon={<DocIcon />} title="Contact Us">
                                <Paragraph text="Questions about this Privacy Policy or how student data is handled can be sent to our support team through the app or your school administrator." />
                            </SectionCard>
                        </>
                    ) : (
                        <>
                            <SectionCard icon={<DocIcon />} title="Acceptance of Terms">
                                <Paragraph text="By using SEÑAS, students, teachers, and schools agree to these Terms of Use. If you do not agree, please do not use the app." />
                            </SectionCard>

                            <SectionCard icon={<TeacherIcon />} title="Who Can Use SEÑAS">
                                <Bullet text="Students accessing the app through their school or teacher's class setup" />
                                <Bullet text="Teachers managing lessons and reviewing student progress on the dashboard" />
                                <Bullet text="Accounts and sign-in credentials are provided by the school, not created freely by the public" />
                            </SectionCard>

                            <SectionCard icon={<HandIcon />} title="Acceptable Use">
                                <Bullet text="Use the app for learning and practicing Filipino Sign Language" />
                                <Bullet text="Do not attempt to bypass, disable, or misuse the camera tracking feature" />
                                <Bullet text="Do not share PIN or login credentials with anyone outside your class" />
                            </SectionCard>

                            <SectionCard icon={<CameraOffIcon />} title="Camera & Device Permissions">
                                <Paragraph text="Camera access is used only to power live hand-tracking during lessons. As stated in our Privacy Policy, footage is never recorded or stored — camera permission may be turned off at any time, though some lessons may require it to function." />
                            </SectionCard>

                            <SectionCard icon={<ShieldIcon />} title="Content & Ownership">
                                <Paragraph text="Lesson content, gesture-recognition models, and app design are owned by SEÑAS. Student progress data belongs to the student and their school, and is made visible only to the assigned teacher." />
                            </SectionCard>

                            <SectionCard icon={<DocIcon />} title="Changes to These Terms">
                                <Paragraph text="We may update these Terms occasionally to reflect improvements to the app. Continued use of SEÑAS after changes means you accept the updated Terms." />
                            </SectionCard>

                            <SectionCard icon={<DocIcon />} title="Contact Us">
                                <Paragraph text="For questions about these Terms of Use, please reach out through the app or your school administrator." />
                            </SectionCard>
                        </>
                    )}

                    <Text style={styles.footerText}>
                        Made with ❤️ for the Filipino Deaf Community
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FCFF' },
    scrollContent: { flexGrow: 1, paddingBottom: 40 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        paddingBottom: 8,
        paddingHorizontal: 16,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: C.ink,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
    headerSpacer: { width: 38 },

    content: { paddingHorizontal: 20, paddingTop: 8 },

    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: '#E6F1FF',
        borderRadius: 60,
        padding: 4,
        marginBottom: 10,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 60,
        alignItems: 'center',
    },
    tabBtnActive: {
        backgroundColor: '#fff',
        shadowColor: C.ink,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    tabText: { fontSize: 13, fontWeight: '700', color: C.inkSoft },
    tabTextActive: { color: C.blueDeep },

    updatedText: {
        fontSize: 11.5,
        color: C.inkSoft,
        textAlign: 'center',
        marginBottom: 18,
        fontWeight: '600',
    },

    safetyBanner: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: C.greenSoft,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
        marginBottom: 18,
        alignItems: 'flex-start',
    },
    safetyIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    safetyTitle: { fontSize: 13.5, fontWeight: '800', color: '#065F46', marginBottom: 3 },
    safetyDesc: { fontSize: 12, color: '#0F766E', lineHeight: 17 },

    sectionCard: {
        backgroundColor: C.card,
        borderRadius: 24,
        padding: 18,
        marginBottom: 14,
        borderColor: C.cardLine,
        borderWidth: 1.5,
        shadowColor: C.ink,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: C.sky,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: { fontSize: 14.5, fontWeight: '800', color: C.ink },
    description: { fontSize: 13, color: C.inkSoft, lineHeight: 19 },

    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 8,
    },
    featureDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: C.blue,
        marginTop: 6,
    },
    featureText: { flex: 1, fontSize: 13, color: C.inkSoft, lineHeight: 19 },

    footerText: {
        textAlign: 'center',
        marginTop: 12,
        fontSize: 11.5,
        color: C.inkSoft,
        lineHeight: 18,
    },
});