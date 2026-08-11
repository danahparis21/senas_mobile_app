// app/help.tsx
import React, { useState, useRef } from 'react';
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
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Line, Polyline, Rect, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';
import GestureTutorialModal from '@/components/GestureTutorialModal';
import MasterModeTutorialModal from '@/components/MasterModeTutorialModal';
import InfiniteModeTutorialModal from '@/components/InfiniteModeTutorialModal'
import FingerspellingTutorialModal from '@/components/FingerspellingTutorialModal';

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

function TutorialsIcon() {
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke="#2563EB" strokeWidth="2" />
            <Path d="M10 8.5l6 3.5-6 3.5v-7z" fill="#2563EB" />
        </Svg>
    );
}

function ChevronForwardIcon() {
    return (
        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <Path d="M9 6l6 6-6 6" stroke="rgba(15,49,114,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

// ── Tutorial Row Component ────────────────────────────────────────────
type TutorialKey = 'gesture' | 'master' | 'infinite' | 'fingerspelling';

function TutorialRow({
    icon,
    color,
    label,
    description,
    onPress,
}: {
    icon: string;
    color: string;
    label: string;
    description: string;
    onPress: () => void;
}) {
    return (
        <Pressable style={styles.tutorialRow} onPress={onPress}>
            <View style={[styles.tutorialIconBox, { backgroundColor: `${color}18` }]}>
                <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <View style={styles.tutorialTextBlock}>
                <Text style={styles.tutorialLabel}>{label}</Text>
                <Text style={styles.tutorialDescription}>{description}</Text>
            </View>
            <ChevronForwardIcon />
        </Pressable>
    );
}

export default function HelpSupport() {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [activeTutorial, setActiveTutorial] = useState<TutorialKey | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef = useRef<TextInput>(null);

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
            answer: 'You\'re already here! Fill out the message form below and we\'ll get back to you within 24 hours.'
        },
    ];

    const handleSubmit = async () => {
        if (!message.trim()) {
            Alert.alert('Message Required', 'Please describe your issue or question.');
            return;
        }

        setSending(true);

        try {
            const result = await api.sendHelpRequest(message);

            Alert.alert(
                '✅ Message Sent!',
                'We\'ll get back to you within 24 hours.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setMessage('');
                            router.back();
                        }
                    }
                ]
            );
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.message || 'Failed to send message. Please try again.'
            );
        } finally {
            setSending(false);
        }
    };

    // Dismiss keyboard when tapping outside
    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <TouchableWithoutFeedback onPress={dismissKeyboard}>
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <Pressable style={styles.backBtn} onPress={() => router.back()}>
                                <BackIcon />
                            </Pressable>
                            <Text style={styles.headerTitle}>Help & Support</Text>
                            <View style={styles.headerSpacer} />
                        </View>

                        {/* Content */}
                        <View style={styles.content}>
                            {/* Tutorials Section */}
                            <View style={styles.tutorialsSection}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.iconBox}>
                                        <TutorialsIcon />
                                    </View>
                                    <Text style={styles.sectionTitle}>App Tutorials</Text>
                                </View>
                                <Text style={styles.sectionSubtitle}>
                                    Need a refresher? Replay any guide, anytime.
                                </Text>

                                <View style={styles.tutorialList}>
                                    <TutorialRow
                                        icon="hand-left"
                                        color="#2563EB"
                                        label="Gesture Practice"
                                        description="How to practice signs with your camera"
                                        onPress={() => setActiveTutorial('gesture')}
                                    />
                                    <TutorialRow
                                        icon="locate"
                                        color="#8B5CF6"
                                        label="Master Mode"
                                        description="Sharpen your weakest signs"
                                        onPress={() => setActiveTutorial('master')}
                                    />
                                    <TutorialRow
                                        icon="infinite"
                                        color="#0EA5E9"
                                        label="Infinite Mode"
                                        description="Practice non-stop, at your own pace"
                                        onPress={() => setActiveTutorial('infinite')}
                                    />
                                    <TutorialRow
                                        icon="text"
                                        color="#F59E0B"
                                        label="Fingerspelling"
                                        description="Spell out words letter by letter"
                                        onPress={() => setActiveTutorial('fingerspelling')}
                                    />
                                </View>
                            </View>

                            <View style={styles.divider} />

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

                            {/* Contact Form - NO EMAIL */}
                            <View style={styles.contactSection}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.iconBox}>
                                        <EmailIcon />
                                    </View>
                                    <Text style={styles.sectionTitle}>Still Need Help?</Text>
                                </View>
                                <Text style={styles.sectionSubtitle}>
                                    Send us a message and we'll get back to you within 24 hours.
                                </Text>

                                <View style={styles.fieldBlock}>
                                    <Text style={styles.fieldLabel}>Your Message</Text>
                                    <TextInput
                                        ref={textInputRef}
                                        style={styles.messageInput}
                                        value={message}
                                        onChangeText={setMessage}
                                        placeholder="Describe your issue or question..."
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        numberOfLines={6}
                                        textAlignVertical="top"
                                        returnKeyType="done"
                                        blurOnSubmit={true}
                                        onSubmitEditing={dismissKeyboard}
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

                                {/* Extra bottom padding for keyboard */}
                                <View style={styles.bottomSpacer} />
                            </View>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            {/* Tutorial Modals */}
            <GestureTutorialModal
                visible={activeTutorial === 'gesture'}
                onClose={() => setActiveTutorial(null)}
            />
            <MasterModeTutorialModal
                visible={activeTutorial === 'master'}
                onClose={() => setActiveTutorial(null)}
            />
            <InfiniteModeTutorialModal
                visible={activeTutorial === 'infinite'}
                onClose={() => setActiveTutorial(null)}
            />
            <FingerspellingTutorialModal
                visible={activeTutorial === 'fingerspelling'}
                onClose={() => setActiveTutorial(null)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaf5fd',
    },
    keyboardAvoidingView: {
        flex: 1,
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
    tutorialsSection: {
        marginBottom: 8,
    },
    tutorialList: {
        gap: 8,
    },
    tutorialRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.06)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    tutorialIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tutorialTextBlock: {
        flex: 1,
    },
    tutorialLabel: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#0f3172',
        marginBottom: 2,
    },
    tutorialDescription: {
        fontSize: 12.5,
        color: '#6B7280',
        fontWeight: '500',
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
        textAlign: 'justify',
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
        maxHeight: 250,
        textAlignVertical: 'top',
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
        marginTop: 8,
    },
    sendBtnDisabled: {
        opacity: 0.7,
    },
    sendBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    bottomSpacer: {
        height: 100, // Extra space at bottom for keyboard
    },
});