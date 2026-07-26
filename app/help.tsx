// app/help.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Pressable,
    TextInput,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Line, Polyline, Rect, G } from 'react-native-svg';

// ── SVG Icons ──────────────────────────────────────────────────────────────

function BackIcon() {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#0f3172" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function FAQIcon() {
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke="#2563EB" strokeWidth="2" />
            <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
            <Line x1="12" y1="17" x2="12.01" y2="17" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
        </Svg>
    );
}

function EmailIcon() {
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Rect x="2" y="4" width="20" height="16" rx="2" stroke="#2563EB" strokeWidth="2" />
            <Path d="M22 7L12 13L2 7" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
    return (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            {expanded ? (
                <Path d="M5 12h14" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
            ) : (
                <>
                    <Path d="M5 12h14" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
                    <Path d="M12 5v14" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
                </>
            )}
        </Svg>
    );
}

function DividerIcon() {
    return (
        <Svg width="100%" height="2" viewBox="0 0 100 2" fill="none">
            <Rect x="0" y="0" width="100" height="2" rx="1" fill="rgba(15,49,114,0.08)" />
        </Svg>
    );
}

// ── FAQ Item Component ────────────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.faqItem}>
            <Pressable
                style={styles.faqHeader}
                onPress={() => setExpanded(!expanded)}
            >
                <View style={styles.faqHeaderLeft}>
                    <View style={styles.faqDot} />
                    <Text style={styles.faqQuestion}>{question}</Text>
                </View>
                <ExpandIcon expanded={expanded} />
            </Pressable>
            {expanded && (
                <Text style={styles.faqAnswer}>{answer}</Text>
            )}
        </View>
    );
}

export default function HelpSupport() {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const faqs = [
        {
            question: 'How do I start a lesson?',
            answer: 'Go to the Dashboard tab and tap on any lesson card under "Your Lessons" or "Continue Learning". You can also tap "See All" to view all available lessons.'
        },
        {
            question: 'How do I earn XP and level up?',
            answer: 'You earn XP by completing lessons, quizzes, and practicing gestures. Each lesson has slides and a quiz. The more you learn, the more XP you earn! Check your progress on the Dashboard.'
        },
        {
            question: 'What are badges and how do I get them?',
            answer: 'Badges are achievements you earn for completing milestones like finishing lessons, mastering gestures, or maintaining streaks. Go to the Achievements tab to see all badges and your progress.'
        },
        {
            question: 'How does the gesture recognition work?',
            answer: 'Tap the "Gesture Cam" button in Quick Practice to open your camera. Follow the on-screen instructions to practice signs. The app will recognize your gestures and track your progress.'
        },
        {
            question: 'What is a learning streak?',
            answer: 'A learning streak counts how many consecutive days you practice. Practice at least once a day to keep your streak going. The longer your streak, the more rewards you earn!'
        },
        {
            question: 'How do I track my progress?',
            answer: 'Your Dashboard shows your XP, level, and streak. The Achievements tab shows all badges you can earn. Your Profile shows your learning path, total lessons completed, and documents.'
        },
        {
            question: 'Can I change my learning path?',
            answer: 'Yes! Go to your Profile and tap the "Edit" button next to "Your Learning Path". You can change your FSL level, learning goal, and practice time preferences.'
        },
        {
            question: 'What if I don\'t understand a sign?',
            answer: 'Each lesson has visual guides and descriptions. For gesture practice, the app shows you the correct sign. You can also revisit lessons anytime to practice more.'
        },
        {
            question: 'How do I contact support?',
            answer: 'You\'re already here! Fill out the message form below and we\'ll get back to you within 24 hours. You can also email us directly from the About page.'
        },
    ];

    const handleSubmit = () => {
        if (!message.trim()) {
            Alert.alert('Please enter a message');
            return;
        }
        setSending(true);
        // Simulate sending
        setTimeout(() => {
            setSending(false);
            Alert.alert('✅ Message Sent!', 'We\'ll get back to you within 24 hours.');
            setMessage('');
            router.back();
        }, 1500);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header with Back Button */}
                <View style={styles.header}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <BackIcon />
                    </Pressable>
                    <Text style={styles.headerTitle}>Help & Support</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* FAQ Section */}
                    <View style={styles.faqSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconBox}>
                                <FAQIcon />
                            </View>
                            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                        </View>
                        <Text style={styles.sectionSubtitle}>
                            Find quick answers to common questions below.
                        </Text>

                        <View style={styles.faqList}>
                            {faqs.map((faq, index) => (
                                <FAQItem
                                    key={index}
                                    question={faq.question}
                                    answer={faq.answer}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Contact Form */}
                    <View style={styles.contactSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconBox}>
                                <EmailIcon />
                            </View>
                            <Text style={styles.sectionTitle}>Still Need Help?</Text>
                        </View>
                        <Text style={styles.sectionSubtitle}>
                            Send us a message and we'll help you out within 24 hours.
                        </Text>

                        <View style={styles.fieldBlock}>
                            <Text style={styles.fieldLabel}>Your Message</Text>
                            <TextInput
                                style={styles.messageInput}
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Describe your issue or question..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                            />
                        </View>

                        <Pressable
                            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={sending}
                        >
                            {sending ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.sendBtnText}>Send Message</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaf5fd',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
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
    headerSpacer: {
        width: 40,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    faqSection: {
        marginBottom: 8,
    },
    contactSection: {
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 10,
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: 'rgba(37,99,235,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f3172',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 16,
        lineHeight: 20,
        paddingLeft: 44,
    },
    faqList: {
        gap: 8,
    },
    faqItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.06)',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    faqHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    faqDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2563EB',
        marginRight: 12,
        flexShrink: 0,
    },
    faqQuestion: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#0f3172',
        marginRight: 12,
        lineHeight: 20,
    },
    faqAnswer: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '400',
        lineHeight: 20,
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: 2,
        borderTopWidth: 1,
        borderTopColor: 'rgba(15,49,114,0.05)',
        paddingLeft: 34,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(15,49,114,0.08)',
        marginVertical: 20,
    },
    fieldBlock: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    messageInput: {
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 14,
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
        minHeight: 140,
    },
    sendBtn: {
        backgroundColor: '#1848c8',
        borderRadius: 40,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#1848c8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 8,
    },
    sendBtnDisabled: {
        opacity: 0.7,
    },
    sendBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});