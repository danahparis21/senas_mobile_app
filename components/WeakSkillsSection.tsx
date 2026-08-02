import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MasteryBadge } from './MasteryBadge';

interface WeakSkill {
    gesture_id: number;
    gesture_name: string;
    display_name: string;
    mastery: number;
    attempts: number;
    successes: number;
    wrong_attempts: number;
    never_practiced?: boolean;
}

interface WeakSkillsSectionProps {
    weakSkills: WeakSkill[];
    onPracticePress: (skill: WeakSkill) => void;
    title?: string;
}

export function WeakSkillsSection({
    weakSkills,
    onPracticePress,
    title = "📝 Skills That Need Practice"
}: WeakSkillsSectionProps) {
    if (weakSkills.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🎉</Text>
                <Text style={styles.emptyTitle}>All Skills Look Good!</Text>
                <Text style={styles.emptySubtext}>
                    You're making great progress. Keep going to master everything!
                </Text>
            </View>
        );
    }

    // Sort by mastery (lowest first)
    const sorted = [...weakSkills].sort((a, b) => a.mastery - b.mastery);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
                Focus on these skills to improve faster
            </Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {sorted.map((skill) => (
                    <Pressable
                        key={skill.gesture_id}
                        style={styles.skillCard}
                        onPress={() => onPracticePress(skill)}
                    >
                        <View style={styles.skillHeader}>
                            <Text style={styles.skillName}>
                                {skill.display_name || skill.gesture_name}
                            </Text>
                            {skill.never_practiced && (
                                <View style={styles.newBadge}>
                                    <Text style={styles.newBadgeText}>NEW</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.skillStats}>
                            <MasteryBadge
                                mastery={skill.mastery}
                                size={50}
                                compact={true}  // Add this for cleaner display
                                showLabel={true}
                            />
                        </View>
                        <View style={styles.skillDetails}>
                            <Text style={styles.skillDetailText}>
                                📊 {skill.attempts} attempts
                            </Text>
                            <Text style={styles.skillDetailText}>
                                ✅ {skill.successes} correct
                            </Text>
                            {skill.wrong_attempts !== undefined && (
                                <Text style={styles.skillDetailText}>
                                    ❌ {skill.wrong_attempts} wrong
                                </Text>
                            )}
                        </View>

                        <Pressable
                            style={styles.practiceButton}
                            onPress={() => onPracticePress(skill)}
                        >
                            <Text style={styles.practiceButtonText}>
                                {skill.never_practiced ? '🎯 Learn' : '✏️ Practice'}
                            </Text>
                        </Pressable>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f3172',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 12,
    },
    scrollView: {
        marginHorizontal: -4,
    },
    scrollContent: {
        paddingHorizontal: 4,
        gap: 12,
    },
    skillCard: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 16,
        width: 160,
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.8)',
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        marginRight: 12,
    },
    skillHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    skillName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
        flex: 1,
    },
    newBadge: {
        backgroundColor: '#10B981',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    newBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#fff',
    },
    skillStats: {
        alignItems: 'center',
        marginVertical: 8,
    },
    skillDetails: {
        marginTop: 4,
        gap: 2,
    },
    skillDetailText: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
    },
    practiceButton: {
        backgroundColor: '#2563EB',
        borderRadius: 10,
        paddingVertical: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    practiceButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    emptyEmoji: {
        fontSize: 32,
        marginBottom: 6,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#065F46',
    },
    emptySubtext: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 2,
    },
});