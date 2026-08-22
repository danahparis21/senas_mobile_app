// app/help.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
    Modal,
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

function CloseIcon() {
    return (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6l12 12" stroke="#0f3172" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

// ── Help Request Types & Helpers ──────────────────────────────────────
type HelpRequestStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

type HelpRequest = {
    id: number;
    message: string;
    status: HelpRequestStatus;
    admin_response: string | null;
    created_at: string;
    resolved_at: string | null;
    responded_at: string | null;
};

const STATUS_META: Record<HelpRequestStatus, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pending', color: '#B45309', bg: 'rgba(245,158,11,0.14)' },
    in_progress: { label: 'In Progress', color: '#1D4ED8', bg: 'rgba(37,99,235,0.12)' },
    resolved: { label: 'Resolved', color: '#15803D', bg: 'rgba(34,197,94,0.14)' },
    closed: { label: 'Closed', color: '#4B5563', bg: 'rgba(107,114,128,0.14)' },
};

function formatRequestDate(dateString: string) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateString;
    }
}

// ── Help Request Row Component ────────────────────────────────────────
function HelpRequestRow({ request, onPress }: { request: HelpRequest; onPress: () => void }) {
    const meta = STATUS_META[request.status] || STATUS_META.pending;
    const hasResponse = !!request.admin_response;

    return (
        <Pressable style={styles.requestRow} onPress={onPress}>
            <View style={styles.requestRowTop}>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={styles.requestDate}>{formatRequestDate(request.created_at)}</Text>
            </View>
            <Text style={styles.requestMessage} numberOfLines={2}>
                {request.message}
            </Text>
            <View style={styles.requestRowBottom}>
                <Text style={[styles.requestReplyHint, hasResponse && styles.requestReplyHintActive]}>
                    {hasResponse ? '💬 Admin replied — tap to view' : 'Waiting for a response'}
                </Text>
                <ChevronForwardIcon />
            </View>
        </Pressable>
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

    const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);

    const fetchHelpRequests = useCallback(async () => {
        try {
            const result = await api.getHelpRequests();
            setHelpRequests(result.help_requests || []);
        } catch (error) {
            console.error('❌ Failed to load help requests:', error);
        } finally {
            setLoadingRequests(false);
        }
    }, []);

    useEffect(() => {
        fetchHelpRequests();
    }, [fetchHelpRequests]);

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
                            fetchHelpRequests();
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
                            </View>

                            <View style={styles.divider} />

                            {/* Your Help Requests Section */}
                            <View style={styles.requestsSection}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.iconBox}>
                                        <FAQIcon />
                                    </View>
                                    <Text style={styles.sectionTitle}>Your Requests</Text>
                                </View>
                                <Text style={styles.sectionSubtitle}>
                                    Track your past messages and see admin responses.
                                </Text>

                                {loadingRequests ? (
                                    <ActivityIndicator color="#1848c8" style={{ marginTop: 8 }} />
                                ) : helpRequests.length === 0 ? (
                                    <Text style={styles.noRequestsText}>
                                        You haven't sent any messages yet.
                                    </Text>
                                ) : (
                                    <View style={styles.requestsList}>
                                        {helpRequests.map((request) => (
                                            <HelpRequestRow
                                                key={request.id}
                                                request={request}
                                                onPress={() => setSelectedRequest(request)}
                                            />
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.bottomSpacer} />
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            {/* Help Request Detail Modal */}
            <Modal
                visible={!!selectedRequest}
                animationType="slide"
                transparent
                onRequestClose={() => setSelectedRequest(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Your Request</Text>
                            <Pressable style={styles.modalCloseBtn} onPress={() => setSelectedRequest(null)}>
                                <CloseIcon />
                            </Pressable>
                        </View>

                        {selectedRequest && (
                            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        styles.modalStatusBadge,
                                        { backgroundColor: (STATUS_META[selectedRequest.status] || STATUS_META.pending).bg },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusBadgeText,
                                            { color: (STATUS_META[selectedRequest.status] || STATUS_META.pending).color },
                                        ]}
                                    >
                                        {(STATUS_META[selectedRequest.status] || STATUS_META.pending).label}
                                    </Text>
                                </View>

                                <Text style={styles.modalLabel}>Your Message</Text>
                                <Text style={styles.modalDate}>{formatRequestDate(selectedRequest.created_at)}</Text>
                                <View style={styles.modalMessageBox}>
                                    <Text style={styles.modalMessageText}>{selectedRequest.message}</Text>
                                </View>

                                <Text style={styles.modalLabel}>Admin Response</Text>
                                {selectedRequest.admin_response ? (
                                    <>
                                        {selectedRequest.responded_at && (
                                            <Text style={styles.modalDate}>
                                                {formatRequestDate(selectedRequest.responded_at)}
                                            </Text>
                                        )}
                                        <View style={styles.modalResponseBox}>
                                            <Text style={styles.modalResponseText}>
                                                {selectedRequest.admin_response}
                                            </Text>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.modalWaitingBox}>
                                        <Text style={styles.modalWaitingText}>
                                            No response yet. We'll get back to you within 24 hours.
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

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

    // ── Your Requests Section ──────────────────────────────────────
    requestsSection: {
        marginTop: 4,
    },
    noRequestsText: {
        fontSize: 13.5,
        color: '#6B7280',
        fontWeight: '500',
        paddingLeft: 44,
        marginTop: 4,
    },
    requestsList: {
        gap: 10,
    },
    requestRow: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.06)',
        padding: 14,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    requestRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    statusBadgeText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    requestDate: {
        fontSize: 11.5,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    requestMessage: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
        lineHeight: 19,
    },
    requestRowBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    requestReplyHint: {
        fontSize: 12.5,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    requestReplyHintActive: {
        color: '#1848c8',
    },

    // ── Help Request Detail Modal ──────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15,49,114,0.35)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#eaf5fd',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        paddingHorizontal: 20,
        paddingBottom: 30,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0f3172',
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,49,114,0.06)',
    },
    modalScroll: {
        marginTop: 4,
    },
    modalStatusBadge: {
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    modalDate: {
        fontSize: 11.5,
        color: '#9CA3AF',
        fontWeight: '500',
        marginBottom: 8,
    },
    modalMessageBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.06)',
        padding: 14,
        marginBottom: 20,
    },
    modalMessageText: {
        fontSize: 14,
        color: '#1F2937',
        lineHeight: 20,
    },
    modalResponseBox: {
        backgroundColor: 'rgba(37,99,235,0.08)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(37,99,235,0.16)',
        padding: 14,
        marginBottom: 10,
    },
    modalResponseText: {
        fontSize: 14,
        color: '#0f3172',
        lineHeight: 20,
        fontWeight: '500',
    },
    modalWaitingBox: {
        backgroundColor: 'rgba(107,114,128,0.08)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
    },
    modalWaitingText: {
        fontSize: 13.5,
        color: '#6B7280',
        fontWeight: '500',
        lineHeight: 19,
    },
});