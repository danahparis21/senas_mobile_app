import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, Pressable,
    ScrollView, ActivityIndicator, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { api } from '../services/api';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';

function CheckCircleIcon({ color = '#10B981' }: { color?: string }) {
    return <Svg width="18" height="18" viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" /><Polyline points="8 12 11 15 16 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export default function TeacherLessons() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [lessons, setLessons] = useState([]);

    useEffect(() => {
        fetchLessons();
    }, []);

    const fetchLessons = async () => {
        try {
            setLoading(true);
            const response = await api.getStudentLessons();
            if (response.success && response.lessons) {
                setLessons(response.lessons);
            }
        } catch (error) {
            console.error('Error fetching lessons:', error);
        } finally {
            setLoading(false);
        }
    };

    const getLessonStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#4CAF50';
            case 'in_progress': return '#f59e0b';
            default: return '#2563EB';
        }
    };

    const getLessonStatusText = (status: string) => {
        switch (status) {
            case 'completed': return '✅ Completed';
            case 'in_progress': return '⏳ In Progress';
            default: return '📖 Pending';
        }
    };

    const renderLesson = ({ item }: { item: any }) => {
        const progress = item.progress;
        const progressPercent = progress ?
            Math.round((progress.current_step / item.total_steps) * 100) : 0;

        return (
            <Pressable
                style={styles.lessonCard}
                onPress={() => router.push(`/lesson/${item.lesson_id}`)}
            >
                <View style={styles.lessonHeader}>
                    <View style={[styles.lessonBadge, { backgroundColor: getLessonStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.lessonBadgeText, { color: getLessonStatusColor(item.status) }]}>
                            {getLessonStatusText(item.status)}
                        </Text>
                    </View>
                    <Text style={styles.lessonDate}>
                        {new Date(item.assigned_at).toLocaleDateString()}
                    </Text>
                </View>

                <Text style={styles.lessonTitle} numberOfLines={2}>
                    {item.title}
                </Text>

                <View style={styles.lessonMeta}>
                    <View style={styles.lessonTag}>
                        <Text style={styles.lessonTagText}>
                            {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                        </Text>
                    </View>
                    {item.has_quiz && (
                        <View style={[styles.lessonTag, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={[styles.lessonTagText, { color: '#2E7D32' }]}>📝 Quiz</Text>
                        </View>
                    )}
                </View>

                <View style={styles.lessonProgress}>
                    <View style={styles.lessonProgressTrack}>
                        <View
                            style={[
                                styles.lessonProgressFill,
                                { width: `${progressPercent}%`, backgroundColor: getLessonStatusColor(item.status) }
                            ]}
                        />
                    </View>
                    <Text style={styles.lessonProgressText}>
                        {progressPercent}% complete
                    </Text>
                </View>

                {progress?.quiz_completed && progress?.quiz_score !== null && (
                    <View style={styles.lessonScore}>
                        <Text style={styles.lessonScoreText}>
                            Quiz Score: {progress.quiz_score}%
                        </Text>
                    </View>
                )}
            </Pressable>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1E4F8A" />
                <Text style={styles.loadingText}>Loading lessons...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.topBarTitle}>📚 All Teacher Lessons</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={lessons}
                renderItem={renderLesson}
                keyExtractor={(item) => item.lesson_id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No lessons uploaded yet</Text>
                        <Text style={styles.emptySubText}>Check back later for new lessons from your teacher!</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#eaf5fd' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf5fd' },
    loadingText: { marginTop: 16, fontSize: 14, color: '#666' },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    topBarTitle: { fontSize: 18, fontWeight: '700', color: '#0f3172' },
    backButton: { padding: 8 },
    backButtonText: { fontSize: 14, fontWeight: '600', color: '#0f3172' },

    listContent: { padding: 16, paddingBottom: 40 },
    lessonCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#EAECF0',
    },
    lessonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    lessonBadge: {
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    lessonBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    lessonDate: {
        fontSize: 10,
        color: '#9AA1B0',
        fontWeight: '500',
    },
    lessonTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f3172',
        marginBottom: 8,
    },
    lessonMeta: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    lessonTag: {
        backgroundColor: '#F0F4FF',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    lessonTagText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#2563EB',
    },
    lessonProgress: {
        marginTop: 4,
    },
    lessonProgressTrack: {
        height: 4,
        backgroundColor: '#E8EDF2',
        borderRadius: 99,
        overflow: 'hidden',
    },
    lessonProgressFill: {
        height: '100%',
        borderRadius: 99,
    },
    lessonProgressText: {
        fontSize: 10,
        color: '#6B7C8E',
        marginTop: 4,
        fontWeight: '500',
    },
    lessonScore: {
        marginTop: 8,
        backgroundColor: '#E8F5E9',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    lessonScoreText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2E7D32',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0f3172',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
});