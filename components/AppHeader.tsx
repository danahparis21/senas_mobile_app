// components/AppHeader.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Modal,
    FlatList,
    Dimensions,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'achievement' | 'promotion' | 'lesson' | 'streak' | 'system';
    is_read: boolean;  // ✅ Changed from 'read' to 'is_read'
    created_at: string;
    data?: any;
}

interface AppHeaderProps {
    showNotifications?: boolean;
}

interface Lesson {
    lesson_id: number;
    title: string;
    status: string;
    assigned_at?: string;
    [key: string]: any;
}

interface LessonStatusMap {
    [lessonId: number]: string;
}

// Keys for AsyncStorage
const STORAGE_KEYS = {
    LAST_STREAK_MILESTONE: 'lastStreakMilestone',
    LAST_PRACTICE_REMINDER: 'lastPracticeReminder',
};

export function AppHeader({ showNotifications = true }: AppHeaderProps) {
    const router = useRouter();
    const segments = useSegments() as string[];
    const [xp, setXp] = useState(0);
    const [streak, setStreak] = useState(0);
    const [studentLevel, setStudentLevel] = useState(1);
    const [levelName, setLevelName] = useState('Novice Signer');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [isFirstLoad, setIsFirstLoad] = useState(true);

    // Animation for notification badge
    const badgeScale = useRef(new Animated.Value(1)).current;

    // Determine header background color based on current route
    const getHeaderBackground = (): string => {
        if (segments && segments.length > 0 && segments.includes('lessons')) {
            return '#c1eaffff';
        }
        else if (segments && segments.length > 0 && segments.includes('dashboard')) {
            return '#c1eaffff';
        }
        return 'transparent';
    };

    // Fetch all notification data
    const fetchNotifications = async () => {
        try {
            setLoading(true);

            // 1. Fetch all notifications from database
            try {
                const response = await api.getNotifications();
                if (response.success) {
                    setNotifications(response.notifications || []);
                    setUnreadCount(response.unread_count || 0);
                    if (response.unread_count > 0) {
                        animateBadge();
                    }
                }
            } catch (error) {
                console.log('Could not fetch notifications from database');
            }

            // 2. Check for new events and create notifications in database
            const newNotificationData: any[] = [];

            // 2a. Check for new achievements
            try {
                const achievementsResponse = await api.checkAchievements();
                if (achievementsResponse.success && achievementsResponse.newly_unlocked) {
                    for (const ach of achievementsResponse.newly_unlocked) {
                        newNotificationData.push({
                            type: 'achievement',
                            title: `🏆 New Achievement Unlocked!`,
                            message: `You earned "${ach.name}"! ${ach.description || ''}`,
                            data: ach,
                            action_url: '/(tabs)/achievements',
                        });
                    }
                }
            } catch (error) {
                console.log('No new achievements');
            }

            // 2b. Check for promotion
            try {
                const promotionResponse = await api.checkPromotion();
                if (promotionResponse.has_promotion && promotionResponse.promotion) {
                    const promo = promotionResponse.promotion;
                    newNotificationData.push({
                        type: 'promotion',
                        title: `⭐ Level Up!`,
                        message: `You've reached ${promo.new_level_name || 'Level ' + promo.new_level}! Keep up the great work!`,
                        data: promo,
                        action_url: '/(tabs)/profile',
                    });
                }
            } catch (error) {
                console.log('No promotions');
            }

            // 2c. Check for streak milestones AND keep going notifications
            try {
                const streakResponse = await api.getStreak();
                if (streakResponse.success) {
                    const currentStreak = streakResponse.streak_days || 0;

                    // Check for major milestones (7, 14, 21, 30)
                    const milestones = [7, 14, 21, 30];
                    const lastMilestone = await AsyncStorage.getItem(STORAGE_KEYS.LAST_STREAK_MILESTONE);
                    const lastMilestoneNum = lastMilestone ? parseInt(lastMilestone) : 0;

                    for (const milestone of milestones) {
                        if (currentStreak >= milestone && milestone > lastMilestoneNum) {
                            newNotificationData.push({
                                type: 'streak',
                                title: `🔥 ${milestone}-Day Streak!`,
                                message: `Amazing! You've been learning for ${milestone} days straight. Keep going!`,
                                data: { streak_days: currentStreak },
                                action_url: '/(tabs)/dashboard',
                            });
                            await AsyncStorage.setItem(STORAGE_KEYS.LAST_STREAK_MILESTONE, String(milestone));
                            break;
                        }
                    }

                    // ✅ ADDED: "Keep Going" notifications at day 8, 15, 22, 29
                    const keepGoingDays = [8, 15, 22, 29];
                    const lastKeepGoing = await AsyncStorage.getItem('lastKeepGoingNotification');
                    const lastKeepGoingNum = lastKeepGoing ? parseInt(lastKeepGoing) : 0;

                    for (const day of keepGoingDays) {
                        if (currentStreak >= day && day > lastKeepGoingNum) {
                            newNotificationData.push({
                                type: 'streak',
                                title: `💪 ${day} Days and Going Strong!`,
                                message: `You're on a ${currentStreak}-day streak! Keep up the great work! 🌟`,
                                data: { streak_days: currentStreak },
                                action_url: '/(tabs)/dashboard',
                            });
                            await AsyncStorage.setItem('lastKeepGoingNotification', String(day));
                            break;
                        }
                    }
                }
            } catch (error) {
                console.log('Could not fetch streak');
            }

            // 2d. Check for new lessons
            try {
                const response = await api.getAllLessons();
                if (response.success && response.lessons) {
                    const lessons: Lesson[] = response.lessons;

                    const seenLessonIds = await AsyncStorage.getItem('seenLessonIds');
                    const seenIds: number[] = seenLessonIds ? JSON.parse(seenLessonIds) : [];

                    const newLessons = lessons.filter((lesson: Lesson) => {
                        if (seenIds.includes(lesson.lesson_id)) return false;
                        if (lesson.status === 'completed') return false;
                        return true;
                    });

                    if (newLessons.length > 0) {
                        const firstLesson = newLessons[0];
                        const count = newLessons.length;
                        newNotificationData.push({
                            type: 'lesson',
                            title: `📚 ${count} New Lesson${count > 1 ? 's' : ''} Available!`,
                            message: count === 1
                                ? `"${firstLesson.title}" is ready for you to start! 🎓`
                                : `Your teacher assigned ${count} new lessons. Start learning now! 🎓`,
                            data: { lessons: newLessons },
                            action_url: '/lessons',
                        });

                        const allIds = [...new Set([...seenIds, ...newLessons.map(l => l.lesson_id)])];
                        await AsyncStorage.setItem('seenLessonIds', JSON.stringify(allIds));
                    }
                }
            } catch (error) {
                console.log('Could not check for new lessons:', error);
            }

            // 2e. Daily practice reminder
            try {
                const lastReminderDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PRACTICE_REMINDER);
                const today = new Date().toDateString();

                if (lastReminderDate !== today) {
                    let practiceMessage = 'Practice your gestures today! 🖐️';
                    try {
                        const learningPath = await api.getLearningPath();
                        if (learningPath.success && learningPath.learning_goal) {
                            const goal = learningPath.learning_goal;
                            practiceMessage = `Practice your "${goal}" gestures today! 🖐️ 10 minutes is all it takes.`;
                        }
                    } catch (e) {
                        // Use default message
                    }

                    newNotificationData.push({
                        type: 'system',
                        title: `💪 Practice Reminder`,
                        message: practiceMessage,
                        data: null,
                        action_url: '/(tabs)/gesture',
                    });

                    await AsyncStorage.setItem(STORAGE_KEYS.LAST_PRACTICE_REMINDER, today);
                }
            } catch (error) {
                console.log('Could not set practice reminder');
            }

            if (newNotificationData.length > 0) {
                // First, get existing notifications to check for duplicates
                const existingResponse = await api.getNotifications();
                const existingNotifs = existingResponse.success ? existingResponse.notifications : [];

                // Filter out notifications that already exist
                const uniqueNotifications = newNotificationData.filter(newNotif => {
                    return !existingNotifs.some((existing: Notification) => {
                        // Check if same type, title, and message
                        return existing.type === newNotif.type &&
                            existing.title === newNotif.title &&
                            existing.message === newNotif.message;
                    });
                });

                if (uniqueNotifications.length > 0) {
                    await api.saveNotifications(uniqueNotifications);

                    const updatedResponse = await api.getNotifications();
                    if (updatedResponse.success) {
                        setNotifications(updatedResponse.notifications || []);
                        setUnreadCount(updatedResponse.unread_count || 0);
                        if (updatedResponse.unread_count > 0) {
                            animateBadge();
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Updated markAsRead function for database
    const markAsRead = async (notificationId: string) => {
        try {
            await api.markNotificationRead(notificationId);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };
    const markAllAsRead = async () => {
        try {
            await api.markAllNotificationsRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    // Fetch user data (XP, Streak, Level)
    const fetchUserData = async () => {
        try {
            setFetchingData(true);

            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
                const user = JSON.parse(userData);
                const student = user.student;

                if (student?.total_xp !== undefined && student?.total_xp !== null) {
                    setXp(student.total_xp);
                }
                if (student?.streak_days !== undefined && student?.streak_days !== null) {
                    setStreak(student.streak_days);
                }
                if (student?.level !== undefined && student?.level !== null) {
                    setStudentLevel(student.level);
                }
                if (student?.level_name) {
                    setLevelName(student.level_name);
                }
            }

            try {
                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                    const response = await api.getStudentLessons();
                    if (response && response.student) {
                        const student = response.student;
                        if (student.total_xp !== undefined && student.total_xp !== null) {
                            setXp(student.total_xp);
                        }
                        if (student.streak_days !== undefined && student.streak_days !== null) {
                            setStreak(student.streak_days);
                        }
                        if (student.level !== undefined && student.level !== null) {
                            setStudentLevel(student.level);
                        }
                        if (student.level_name) {
                            setLevelName(student.level_name);
                        }
                    }
                }
            } catch (apiError) {
                console.log('Using cached user data');
            }

        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setFetchingData(false);
            setIsFirstLoad(false);
        }
    };

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (!isFirstLoad) {
                fetchUserData();
                fetchNotifications();
            }
        }, [isFirstLoad])
    );

    // Initial load
    useEffect(() => {
        fetchUserData();
        fetchNotifications();
    }, []);

    const handleNotificationPress = (notification: Notification) => {
        markAsRead(notification.id);

        if (notification.type === 'achievement') {
            router.push('/(tabs)/achievements');
        } else if (notification.type === 'promotion') {
            router.push('/(tabs)/profile');
        } else if (notification.type === 'lesson') {
            router.push('/lessons');
        } else if (notification.type === 'streak') {
            router.push('/(tabs)/dashboard');
        } else if (notification.type === 'system') {
            router.push('/(tabs)/gesture');
        }

        setModalVisible(false);
    };

    const animateBadge = () => {
        Animated.sequence([
            Animated.spring(badgeScale, {
                toValue: 1.4,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
            }),
            Animated.spring(badgeScale, {
                toValue: 1,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'achievement': return 'trophy';
            case 'promotion': return 'star';
            case 'lesson': return 'book';
            case 'streak': return 'flame';
            default: return 'notifications';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'achievement': return '#F59E0B';
            case 'promotion': return '#8B5CF6';
            case 'lesson': return '#3B82F6';
            case 'streak': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const renderNotification = ({ item }: { item: Notification }) => {
        // ✅ FIX: Use is_read instead of read
        const isRead = item.is_read === true;
        const iconColor = getNotificationColor(item.type);

        return (
            <TouchableOpacity
                style={[
                    styles.notificationItem,
                    isRead ? styles.readItem : styles.unreadItem,
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.notificationIconContainer,
                    {
                        backgroundColor: isRead
                            ? 'rgba(0,0,0,0.03)'
                            : `${iconColor}15`
                    }
                ]}>
                    <Ionicons
                        name={getNotificationIcon(item.type) as any}
                        size={20}
                        color={isRead ? '#9CA3AF' : iconColor}
                    />
                </View>
                <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                        <Text style={[
                            styles.notificationTitle,
                            isRead && styles.notificationTitleRead
                        ]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={[
                            styles.notificationTime,
                            isRead && styles.notificationTimeRead
                        ]}>
                            {formatTime(item.created_at)}
                        </Text>
                    </View>
                    <Text style={[
                        styles.notificationMessage,
                        isRead && styles.notificationMessageRead
                    ]} numberOfLines={2}>
                        {item.message}
                    </Text>
                </View>
                {/* ✅ Only show dot for unread */}
                {!isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };


    const headerBackground = getHeaderBackground();

    return (
        <>
            <View style={[styles.headerContainer, { backgroundColor: headerBackground }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/dashboard')}
                        style={styles.logoContainer}
                    >
                        <Text style={styles.logoText}>SEÑAS</Text>
                    </TouchableOpacity>

                    <View style={styles.rightContainer}>
                        <View style={styles.xpBadge}>
                            <Ionicons name="star" size={14} color="#F59E0B" />
                            {fetchingData ? (
                                <ActivityIndicator size="small" color="#0F3172" style={styles.loadingIndicator} />
                            ) : (
                                <Text style={styles.xpBadgeText}>{xp}</Text>
                            )}
                        </View>

                        <View style={styles.streakBadge}>
                            <Ionicons name="flame" size={14} color="#FB923C" />
                            {fetchingData ? (
                                <ActivityIndicator size="small" color="#0F3172" style={styles.loadingIndicator} />
                            ) : (
                                <Text style={styles.streakText}>{streak}</Text>
                            )}
                        </View>

                        {showNotifications && (
                            <TouchableOpacity
                                style={styles.notificationButton}
                                onPress={() => setModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.notificationIconWrapper}>
                                    <Ionicons name="notifications-outline" size={24} color="#0F3172" />
                                    {unreadCount > 0 && (
                                        <Animated.View
                                            style={[
                                                styles.notificationBadge,
                                                { transform: [{ scale: badgeScale }] }
                                            ]}
                                        >
                                            <Text style={styles.notificationBadgeText}>
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </Text>
                                        </Animated.View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setModalVisible(false)}
                    />
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Notifications</Text>
                            <View style={styles.modalHeaderActions}>
                                {unreadCount > 0 && (
                                    <TouchableOpacity onPress={markAllAsRead}>
                                        <Text style={styles.markAllText}>Mark all as read</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => setModalVisible(false)}
                                    style={styles.modalCloseButton}
                                >
                                    <Ionicons name="close" size={24} color="#0F3172" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {loading && notifications.length === 0 ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#0F3172" />
                                <Text style={styles.loadingText}>Loading notifications...</Text>
                            </View>
                        ) : notifications.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="notifications-off-outline" size={50} color="#4B7BBB" />
                                <Text style={styles.emptyTitle}>No notifications yet</Text>
                                <Text style={styles.emptySubtitle}>We'll notify you when something happens!</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={notifications}
                                renderItem={renderNotification}
                                keyExtractor={(item) => String(item.id)}
                                contentContainerStyle={styles.notificationsList}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        paddingTop: Platform.OS === 'ios' ? 48 : 32,
        paddingBottom: 12,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logoIcon: {
        width: 32,
        height: 32,
    },
    logoText: {
        color: '#0F3172',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 2,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(15, 49, 114, 0.1)',
        gap: 4,
        minWidth: 50,
        justifyContent: 'center',
    },
    xpBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F3172',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(15, 49, 114, 0.1)',
        gap: 4,
        minWidth: 50,
        justifyContent: 'center',
    },
    streakText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F3172',
    },
    loadingIndicator: {
        marginLeft: 2,
    },
    notificationButton: {
        padding: 4,
    },
    notificationIconWrapper: {
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    notificationBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        flex: 1,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '80%',
        minHeight: '50%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(15, 49, 114, 0.06)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F3172',
    },
    modalHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    markAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3B82F6',
    },
    modalCloseButton: {
        padding: 4,
    },
    notificationsList: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 20,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
    },
    unreadItem: {
        backgroundColor: '#EFF6FF',
        borderColor: 'rgba(59, 130, 246, 0.15)',
    },
    readItem: {
        backgroundColor: '#F8FAFC',
        borderColor: 'rgba(15, 49, 114, 0.04)',
        opacity: 0.75,
    },
    notificationIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    notificationTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F3172',
        flex: 1,
        marginRight: 8,
    },
    notificationTitleRead: {
        color: '#9CA3AF',
        fontWeight: '600',
    },
    notificationTime: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    notificationTimeRead: {
        color: '#D1D5DB',
    },
    notificationMessage: {
        fontSize: 13,
        color: '#4B7BBB',
        lineHeight: 18,
    },
    notificationMessageRead: {
        color: '#9CA3AF',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#4B7BBB',
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F3172',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#4B7BBB',
        marginTop: 6,
    },
});