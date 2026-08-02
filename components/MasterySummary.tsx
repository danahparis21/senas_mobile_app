import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MasterySummaryProps {
    averageMastery: number;
    totalSkills: number;
    practicedSkills: number;
    masteredCount: number;
    weakCount: number;
    neverPracticed: number;
    progressPercentage: number;
}

export function MasterySummary({
    averageMastery,
    totalSkills,
    practicedSkills,
    masteredCount,
    weakCount,
    neverPracticed,
    progressPercentage,
}: MasterySummaryProps) {
    const masteryColor = averageMastery >= 70 ? '#10B981' : averageMastery >= 50 ? '#F59E0B' : '#EF4444';
    const masteryEmoji = averageMastery >= 70 ? '🌟' : averageMastery >= 50 ? '📈' : '💪';

    return (
        <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.header}>
                <Text style={styles.title}>🎯 Your Progress</Text>
                <Text style={styles.subtitle}>
                    {masteryEmoji} {averageMastery}% average mastery
                </Text>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: masteryColor }]}>
                        {masteredCount}
                    </Text>
                    <Text style={styles.statLabel}>Mastered</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
                        {weakCount}
                    </Text>
                    <Text style={styles.statLabel}>Needs Practice</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#94A3B8' }]}>
                        {neverPracticed}
                    </Text>
                    <Text style={styles.statLabel}>Not Started</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#3B82F6' }]}>
                        {practicedSkills}
                    </Text>
                    <Text style={styles.statLabel}>Practiced</Text>
                </View>
            </View>

            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${progressPercentage}%` }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    {progressPercentage}% of {totalSkills} skills mastered
                </Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0f3172',
    },
    subtitle: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 8,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '900',
    },
    statLabel: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '700',
        marginTop: 2,
    },
    progressContainer: {
        marginTop: 8,
    },
    progressTrack: {
        backgroundColor: '#E2E8F0',
        borderRadius: 8,
        height: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 8,
    },
    progressText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },
});