// MasteryBadge.tsx - Clear, child-friendly version

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MasteryBadgeProps {
    mastery: number; // 0.0 - 1.0
    size?: number;
    showLabel?: boolean;
    compact?: boolean;
}

export function MasteryBadge({
    mastery,
    size = 40,
    showLabel = true,
    compact = false
}: MasteryBadgeProps) {
    const percentage = Math.round(mastery * 100);

    // Friendly, clear labels for children
    let color = '#94A3B8';
    let label = 'Not Started';
    let emoji = '🌱';
    let description = 'Haven\'t practiced yet';

    if (mastery >= 0.9) {
        color = '#10B981';
        label = '⭐ Expert';
        emoji = '🏆';
        description = 'You\'re a master!';
    } else if (mastery >= 0.75) {
        color = '#3B82F6';
        label = '🌟 Proficient';
        emoji = '⭐';
        description = 'You\'re really good!';
    } else if (mastery >= 0.6) {
        color = '#8B5CF6';
        label = '✅ Getting There';
        emoji = '📈';
        description = 'Keep going!';
    } else if (mastery >= 0.4) {
        color = '#F59E0B';
        label = '📖 Learning';
        emoji = '📚';
        description = 'Practice more';
    } else if (mastery > 0) {
        color = '#EF4444';
        label = '✏️ Needs Practice';
        emoji = '🎯';
        description = 'Try again!';
    } else {
        color = '#94A3B8';
        label = '🌱 Not Started';
        emoji = '🌱';
        description = 'Ready to learn';
    }

    // Compact mode for the weak skills section
    if (compact) {
        return (
            <View style={[styles.compactContainer, { borderColor: color }]}>
                <Text style={styles.compactEmoji}>{emoji}</Text>
                <Text style={[styles.compactText, { color }]}>{percentage}%</Text>
                <Text style={[styles.compactLabel, { color }]}>{label}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.circleContainer, { width: size, height: size }]}>
                <View style={[styles.circleBg, {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderColor: color,
                }]} />
                <View style={styles.percentageOverlay}>
                    <Text style={[styles.percentageText, { color, fontSize: size * 0.28 }]}>
                        {percentage}%
                    </Text>
                </View>
                {/* Progress ring */}
                <View style={[styles.progressRing, {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderColor: color,
                    borderWidth: 4,
                }]} />
            </View>
            {showLabel && (
                <View style={styles.labelContainer}>
                    <Text style={[styles.emojiText]}>{emoji}</Text>
                    <Text style={[styles.labelText, { color }]} numberOfLines={2}>
                        {label}
                    </Text>
                    <Text style={[styles.descriptionText, { color }]} numberOfLines={1}>
                        {description}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    circleContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleBg: {
        position: 'absolute',
        backgroundColor: '#F8FAFC',
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    progressRing: {
        position: 'absolute',
        backgroundColor: 'transparent',
        borderColor: '#10B981',
    },
    percentageOverlay: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    percentageText: {
        fontWeight: '900',
        textAlign: 'center',
        includeFontPadding: false,
    },
    labelContainer: {
        marginTop: 6,
        alignItems: 'center',
        width: '100%',
    },
    emojiText: {
        fontSize: 16,
        marginBottom: 2,
    },
    labelText: {
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
        color: '#1E293B',
    },
    descriptionText: {
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
        color: '#64748B',
        marginTop: 1,
    },
    // Compact styles for horizontal scrolling
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    compactEmoji: {
        fontSize: 14,
    },
    compactText: {
        fontSize: 14,
        fontWeight: '900',
    },
    compactLabel: {
        fontSize: 10,
        fontWeight: '700',
        opacity: 0.8,
    },
});