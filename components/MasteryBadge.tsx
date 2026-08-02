import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

interface MasteryBadgeProps {
    mastery: number; // 0.0 - 1.0
    size?: number;
    showLabel?: boolean;
}

export function MasteryBadge({ mastery, size = 40, showLabel = true }: MasteryBadgeProps) {
    const percentage = Math.round(mastery * 100);

    // Determine color based on mastery
    let color = '#94A3B8'; // gray
    let label = 'Not Started';

    if (mastery >= 0.9) {
        color = '#10B981'; // green - expert
        label = 'Expert 🏆';
    } else if (mastery >= 0.75) {
        color = '#3B82F6'; // blue - proficient
        label = 'Proficient ⭐';
    } else if (mastery >= 0.6) {
        color = '#8B5CF6'; // purple - competent
        label = 'Competent ✅';
    } else if (mastery >= 0.4) {
        color = '#F59E0B'; // yellow - learning
        label = 'Learning 📚';
    } else if (mastery > 0) {
        color = '#EF4444'; // red - needs practice
        label = 'Needs Practice ✏️';
    } else {
        color = '#94A3B8'; // gray - not started
        label = 'Not Started 🎯';
    }

    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <View style={[styles.container, { width: size, alignItems: 'center' }]}>
            <View style={styles.circleContainer}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background circle */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#E2E8F0"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Progress circle */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90, ${size / 2}, ${size / 2})`}
                    />
                    {/* Center text - using SvgText instead of Text */}
                    <SvgText
                        x={size / 2}
                        y={size / 2 + 4}
                        textAnchor="middle"
                        fontSize={size * 0.25}
                        fontWeight="800"
                        fill={color}
                    >
                        {percentage}%
                    </SvgText>
                </Svg>
            </View>
            {showLabel && (
                <Text style={[styles.label, { color }]} numberOfLines={1}>
                    {label}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    circleContainer: {
        position: 'relative',
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
        textAlign: 'center',
    },
});