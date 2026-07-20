// app/components/PromotionModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ScrollView,
    Dimensions,
    Animated,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width, height } = Dimensions.get('window');

interface PromotionData {
    id: number;
    from_level: string;
    to_level: string;
    promotion_date: string;
    title: string;
    subtitle: string;
    message: string;
    badge_icon: string;
    was_forced: boolean;
    gradient?: [string, string, string];
    summary: {
        quizzes_taken: number;
        quizzes_passed: number;
        avg_quiz_score: number;
        lessons_completed: number;
        gestures_attempted: number;
        total_xp: number;
        accuracy: number;
    };
}

interface PromotionModalProps {
    visible: boolean;
    promotionData: PromotionData | null;
    onClose: () => void;
    studentName?: string;
}

const DEFAULT_GRADIENT: [string, string, string] = ['#0f3172', '#1a4f8a', '#2563eb'];

export default function PromotionModal({ visible, promotionData, onClose, studentName }: PromotionModalProps) {
    // ✅ ALL HOOKS AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
    const [scaleAnim] = useState(new Animated.Value(0.8));
    const [fadeAnim] = useState(new Animated.Value(0));
    const [frontPaper, setFrontPaper] = useState<'certificate' | 'report'>('certificate');
    const swapAnim = useRef(new Animated.Value(0)).current;
    const envelopeAnim = useRef(new Animated.Value(0)).current; // 0 = sealed, 1 = open with papers out

    // useEffect for visibility animation
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // useEffect to reset paper stack and play the "envelope opening" entrance when modal opens
    useEffect(() => {
        if (visible) {
            setFrontPaper('certificate');
            swapAnim.setValue(0);
            envelopeAnim.setValue(0);
            Animated.sequence([
                Animated.delay(180),
                Animated.spring(envelopeAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 45,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            envelopeAnim.setValue(0);
        }
    }, [visible]);

    // ✅ EARLY RETURN AFTER ALL HOOKS
    if (!visible || !promotionData) {
        return null;
    }

    // Now we can safely use promotionData
    const isGraduation = promotionData.to_level === 'Graduated';
    const gradientColors: [string, string, string] = promotionData.gradient || DEFAULT_GRADIENT;

    const promotionDateFormatted = promotionData.promotion_date
        ? new Date(promotionData.promotion_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

    const handleDownloadLetter = async () => {
        try {
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f3172;
      padding: 40px;
      line-height: 1.6;
      background-color: #f4f7f6;
    }
    .container {
      border: 8px double #fbbf24;
      padding: 40px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      max-width: 650px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: 900;
      color: #0f3172;
      letter-spacing: 4px;
      margin-bottom: 5px;
    }
    .tagline {
      font-size: 11px;
      color: #4b7bbb;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: bold;
    }
    .divider {
      height: 3px;
      background: linear-gradient(to right, #0f3172, #fbbf24, #0f3172);
      margin: 20px 0;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      text-align: center;
      color: #0f3172;
      margin: 25px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .date {
      text-align: right;
      font-size: 14px;
      color: #64748b;
      margin-bottom: 25px;
      font-weight: 500;
    }
    .salutation {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 15px;
      color: #0f3172;
    }
    .content {
      font-size: 15px;
      text-align: justify;
      color: #334155;
      margin-bottom: 35px;
    }
    .level-badge-container {
      text-align: center;
      margin: 25px 0;
    }
    .level-badge {
      display: inline-block;
      background: rgba(251, 191, 36, 0.12);
      border: 2px solid #fbbf24;
      color: #92400e;
      padding: 10px 24px;
      border-radius: 30px;
      font-weight: 800;
      font-size: 18px;
      text-shadow: 0 1px 0 rgba(255,255,255,0.5);
    }
    .signature-section {
      margin-top: 50px;
      display: flex;
      justify-content: flex-end;
    }
    .signature {
      text-align: center;
      width: 220px;
    }
    .sig-line {
      border-top: 2px solid #0f3172;
      margin-top: 35px;
      padding-top: 8px;
      font-size: 14px;
      font-weight: 700;
      color: #0f3172;
    }
    .sig-title {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
    .badge-seal {
      font-size: 56px;
      text-align: center;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SEÑAS</div>
      <div class="tagline">Filipino Sign Language Learning Platform</div>
      <div class="divider"></div>
    </div>
    
    <div class="date">Date: ${promotionDateFormatted}</div>
    
    <div class="title">Official Promotion Notice</div>
    
    <div class="salutation">Dear ${studentName || 'Student'},</div>
    
    <div class="content">
      We are officially pleased to inform you that you have successfully completed the learning modules and met the criteria for promotion. You have been promoted as follows:
      
      <div class="level-badge-container">
        <span class="level-badge">${promotionData.from_level} &rarr; ${promotionData.to_level}</span>
      </div>
      
      ${promotionData.message}
      <br/><br/>
      Your dedication to mastering Filipino Sign Language is highly commendable. Keep up the excellent work as you continue your journey toward total mastery!
    </div>
    
    <div class="badge-seal">${promotionData.badge_icon || '🏆'}</div>
    
    <div class="signature-section">
      <div class="signature">
        <div class="sig-line">SEÑAS Team</div>
        <div class="sig-title">FSL Academic Committee</div>
      </div>
    </div>
  </div>
</body>
</html>
            `;
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Download Promotion Letter' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Failed to generate PDF. Please try again.');
        }
    };

    const handleDownloadReportCard = async () => {
        try {
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f3172;
      padding: 40px;
      line-height: 1.6;
      background-color: #f4f7f6;
    }
    .container {
      border: 1px solid #e2e8f0;
      padding: 40px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      max-width: 650px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: 900;
      color: #0f3172;
      letter-spacing: 4px;
    }
    .title {
      font-size: 18px;
      font-weight: 800;
      color: #f59e0b;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .student-info {
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 25px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      border: 1px solid #edf2f7;
    }
    .info-col {
      margin-right: 20px;
      margin-bottom: 10px;
      min-width: 140px;
    }
    .info-col:last-child {
      margin-right: 0;
      text-align: right;
    }
    .info-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 15px;
      font-weight: 700;
      color: #0f3172;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background-color: #0f3172;
      color: white;
      text-align: left;
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .metric-name {
      font-weight: 600;
      color: #334155;
    }
    .metric-value {
      font-weight: 700;
      text-align: right;
      color: #0f3172;
    }
    .footer {
      text-align: center;
      margin-top: 35px;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
      line-height: 1.5;
    }
    .seal {
      font-size: 36px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SEÑAS</div>
      <div class="title">Performance Summary Report</div>
    </div>
    
    <div class="student-info">
      <div class="info-col">
        <div class="info-label">Student Name</div>
        <div class="info-value">${studentName || 'Student'}</div>
      </div>
      <div class="info-col">
        <div class="info-label">New Level</div>
        <div class="info-value">${promotionData.to_level}</div>
      </div>
      <div class="info-col">
        <div class="info-label">Date Generated</div>
        <div class="info-value">${promotionDateFormatted}</div>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Learning Metric</th>
          <th style="text-align: right;">Record</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="metric-name">Quizzes Taken</td>
          <td class="metric-value">${promotionData.summary.quizzes_taken}</td>
        </tr>
        <tr>
          <td class="metric-name">Quizzes Passed</td>
          <td class="metric-value">${promotionData.summary.quizzes_passed}</td>
        </tr>
        <tr>
          <td class="metric-name">Average Quiz Score</td>
          <td class="metric-value">${promotionData.summary.avg_quiz_score}%</td>
        </tr>
        <tr>
          <td class="metric-name">Lessons Completed</td>
          <td class="metric-value">${promotionData.summary.lessons_completed}</td>
        </tr>
        <tr>
          <td class="metric-name">Gestures Attempted</td>
          <td class="metric-value">${promotionData.summary.gestures_attempted}</td>
        </tr>
        <tr>
          <td class="metric-name">Accuracy Rate</td>
          <td class="metric-value">${promotionData.summary.accuracy}%</td>
        </tr>
        <tr>
          <td class="metric-name">Total Experience Points (XP)</td>
          <td class="metric-value" style="color: #d97706; font-size: 16px;">✨ ${promotionData.summary.total_xp} XP</td>
        </tr>
      </tbody>
    </table>
    
    <div class="footer">
      <div class="seal">🏆</div>
      <div>Official Digital Transcript - SEÑAS Filipino Sign Language Learning Platform</div>
      <div>Verification ID: SENAS-PR-${promotionData.id}</div>
    </div>
  </div>
</body>
</html>
            `;
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Download Grade Report Card' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Failed to generate PDF. Please try again.');
        }
    };


    const bringToFront = (paper: 'certificate' | 'report') => {
        if (paper === frontPaper) return;
        setFrontPaper(paper);
        Animated.spring(swapAnim, {
            toValue: paper === 'certificate' ? 0 : 1,
            friction: 9,
            tension: 60,
            useNativeDriver: true,
        }).start();
    };

    // Papers slide/scale/fade in as the envelope opens
    const paperEntranceOpacity = envelopeAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
    const paperEntranceTranslateY = envelopeAnim.interpolate({ inputRange: [0, 1], outputRange: [90, 0] });
    const paperEntranceScale = envelopeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });

    // The flap corners swing open as the envelope opens
    const flapOpenLeft = envelopeAnim.interpolate({ inputRange: [0, 1], outputRange: ['4deg', '-18deg'] });
    const flapOpenRight = envelopeAnim.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '18deg'] });
    const flapDiamondScale = envelopeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
    const flapDiamondOpacity = envelopeAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.4, 1] });

    // Certificate: front when swapAnim = 0, tucked behind-left when swapAnim = 1
    const certTransform = {
        opacity: paperEntranceOpacity,
        transform: [
            { translateY: paperEntranceTranslateY },
            { scale: paperEntranceScale },
            { translateX: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
            { translateY: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
            { rotate: swapAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-7deg'] }) },
            { scale: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) },
        ],
    };
    // Grade report: front when swapAnim = 1, tucked behind-right when swapAnim = 0
    const reportTransform = {
        opacity: paperEntranceOpacity,
        transform: [
            { translateY: paperEntranceTranslateY },
            { scale: paperEntranceScale },
            { translateX: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            { translateY: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
            { rotate: swapAnim.interpolate({ inputRange: [0, 1], outputRange: ['7deg', '0deg'] }) },
            { scale: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
        ],
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.modalContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }
                ]}>
                    <BlurView intensity={45} tint="light" style={styles.modalContent}>
                        <LinearGradient
                            colors={['rgba(37,99,235,0.14)', 'rgba(15,49,114,0.05)']}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                        {/* Close IconButton (X) in Top-Right */}
                        <Pressable style={styles.closeIconButton} onPress={onClose} hitSlop={12}>
                            <Text style={styles.closeIconText}>✕</Text>
                        </Pressable>

                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Header */}
                            <Text style={styles.headerEyebrow}>SPECIAL DELIVERY</Text>
                            <Text style={styles.title}>{promotionData.title || "You've been promoted!"}</Text>
                            <View style={styles.levelBadge}>
                                <Text style={styles.levelFrom}>{promotionData.from_level}</Text>
                                <Text style={[styles.levelArrow, { color: gradientColors[2] }]}>→</Text>
                                <Text style={[styles.levelTo, { color: gradientColors[0] }]}>{promotionData.to_level}</Text>
                            </View>
                            {promotionData.was_forced && (
                                <View style={styles.forcedBadge}>
                                    <Text style={styles.forcedBadgeText}>⚡ Forced Promotion</Text>
                                </View>
                            )}

                            {/* Envelope + Paper Stack */}
                            <View style={styles.stackWrap}>
                                {/* Glass flap peeking up behind the pocket, opens as envelopeAnim animates */}
                                <Animated.View
                                    style={[
                                        styles.envelopeFlapDiamond,
                                        {
                                            opacity: flapDiamondOpacity,
                                            transform: [{ rotate: '45deg' }, { scale: flapDiamondScale }],
                                        },
                                    ]}
                                >
                                    <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill}>
                                        <LinearGradient
                                            colors={['rgba(37,99,235,0.55)', 'rgba(15,49,114,0.2)']}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    </BlurView>
                                </Animated.View>

                                {/* Envelope pocket — glass, in the app's blue palette */}
                                <BlurView intensity={35} tint="light" style={styles.envelopePocket}>
                                    <LinearGradient
                                        colors={['rgba(37,99,235,0.5)', 'rgba(15,49,114,0.28)']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <View style={styles.envelopePocketHighlight} />
                                    <Animated.View style={[styles.envelopeFlapCornerLeft, { transform: [{ rotate: flapOpenLeft }] }]} />
                                    <Animated.View style={[styles.envelopeFlapCornerRight, { transform: [{ rotate: flapOpenRight }] }]} />
                                </BlurView>

                                {/* Grade Report paper */}
                                <Animated.View style={[styles.paperCard, styles.reportPaper, reportTransform, { zIndex: frontPaper === 'report' ? 2 : 1 }]}>
                                    <LinearGradient
                                        colors={['#dbeafe', '#eff6ff', '#ffffff'] as const}
                                        locations={[0, 0.45, 1] as const}
                                        style={styles.paperGradientBg}
                                    />
                                    {/* Tap-to-bring-front area — content only, no download button inside */}
                                    <Pressable style={styles.paperTapArea} onPress={() => bringToFront('report')}>
                                        <Text style={styles.paperEyebrow}>PERFORMANCE SUMMARY</Text>
                                        <Text style={styles.paperTitleReport}>Grade Report</Text>
                                        <View style={styles.paperRule} />

                                        <View style={styles.statsGrid}>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statValue}>{promotionData.summary.quizzes_taken}</Text>
                                                <Text style={styles.statLabel}>Quizzes</Text>
                                            </View>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statValue}>{promotionData.summary.quizzes_passed}</Text>
                                                <Text style={styles.statLabel}>Passed</Text>
                                            </View>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statValue}>{promotionData.summary.avg_quiz_score}%</Text>
                                                <Text style={styles.statLabel}>Avg Score</Text>
                                            </View>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statValue}>{promotionData.summary.lessons_completed}</Text>
                                                <Text style={styles.statLabel}>Lessons</Text>
                                            </View>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statValue}>{promotionData.summary.gestures_attempted}</Text>
                                                <Text style={styles.statLabel}>Gestures</Text>
                                            </View>
                                            <View style={styles.statItem}>
                                                <Text style={styles.statValue}>{promotionData.summary.accuracy}%</Text>
                                                <Text style={styles.statLabel}>Accuracy</Text>
                                            </View>
                                        </View>

                                        <View style={styles.xpRow}>
                                            <Text style={styles.xpRowText}>✨ {promotionData.summary.total_xp} XP earned</Text>
                                        </View>

                                        {frontPaper !== 'report' && (
                                            <Text style={styles.peekHint}>Tap to view</Text>
                                        )}
                                    </Pressable>
                                    {/* Download button sits OUTSIDE the tap-to-switch Pressable */}
                                    {frontPaper === 'report' && (
                                        <Pressable style={styles.paperDownloadBtn} onPress={handleDownloadReportCard}>
                                            <LinearGradient
                                                colors={['#2563eb', '#0f3172'] as const}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.paperDownloadBtnGradient}
                                            />
                                            <Text style={styles.paperDownloadBtnText}>📊 Download Report</Text>
                                        </Pressable>
                                    )}
                                </Animated.View>

                                {/* Certificate paper */}
                                <Animated.View style={[styles.paperCard, styles.certPaper, certTransform, { zIndex: frontPaper === 'certificate' ? 2 : 1 }]}>
                                    <LinearGradient
                                        colors={['#dbeafe', '#eff6ff', '#ffffff'] as const}
                                        locations={[0, 0.45, 1] as const}
                                        style={styles.paperGradientBg}
                                    />
                                    {/* Tap-to-bring-front area — content only */}
                                    <Pressable style={styles.paperTapArea} onPress={() => bringToFront('certificate')}>
                                        <View style={[styles.certInnerBorder, { borderColor: gradientColors[2] }]}>
                                            <Text style={styles.paperEyebrow}>CERTIFICATE OF PROMOTION</Text>
                                            <Text style={styles.badgeIconLarge}>{promotionData.badge_icon || '🏆'}</Text>
                                            <Text style={styles.certStudentName}>{studentName || 'Student'}</Text>
                                            <Text style={styles.certBody}>
                                                has successfully advanced from{' '}
                                                <Text style={styles.certBold}>{promotionData.from_level}</Text> to{' '}
                                                <Text style={styles.certBold}>{promotionData.to_level}</Text>
                                            </Text>
                                            {!!promotionData.message && (
                                                <Text style={styles.certMessage}>{promotionData.message}</Text>
                                            )}

                                            {isGraduation && (
                                                <View style={styles.graduationMessage}>
                                                    <Text style={styles.graduationText}>🎉 Certified FSL Signer 🎉</Text>
                                                </View>
                                            )}

                                            <View style={styles.certFooterRow}>
                                                <View style={styles.certSealMini}>
                                                    <Text style={styles.certSealMiniIcon}>✓</Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.certSigLine}>SEÑAS Team</Text>
                                                    <Text style={styles.certSigTitle}>FSL Academic Committee · {promotionDateFormatted}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        {frontPaper !== 'certificate' && (
                                            <Text style={styles.peekHint}>Tap to view</Text>
                                        )}
                                    </Pressable>
                                    {/* Download button sits OUTSIDE the tap-to-switch Pressable */}
                                    {frontPaper === 'certificate' && (
                                        <Pressable style={styles.paperDownloadBtn} onPress={handleDownloadLetter}>
                                            <LinearGradient
                                                colors={['#2563eb', '#0f3172'] as const}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.paperDownloadBtnGradient}
                                            />
                                            <Text style={styles.paperDownloadBtnText}>📄 Download Certificate</Text>
                                        </Pressable>
                                    )}
                                </Animated.View>
                            </View>

                            {/* Paper tabs */}
                            <View style={styles.tabRow}>
                                <Pressable
                                    style={[styles.tabButton, frontPaper === 'certificate' && styles.tabButtonActive]}
                                    onPress={() => bringToFront('certificate')}
                                >
                                    <Text style={[styles.tabButtonText, frontPaper === 'certificate' && styles.tabButtonTextActive]}>🎓 Certificate</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.tabButton, frontPaper === 'report' && styles.tabButtonActive]}
                                    onPress={() => bringToFront('report')}
                                >
                                    <Text style={[styles.tabButtonText, frontPaper === 'report' && styles.tabButtonTextActive]}>📊 Grade Report</Text>
                                </Pressable>
                            </View>

                            {/* Continue Button */}
                            <Pressable style={styles.closeButton} onPress={onClose}>
                                <LinearGradient
                                    colors={['#2563eb', '#0f3172'] as const}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.closeButtonGradient}
                                />
                                <Text style={styles.closeButtonText}>
                                    {isGraduation ? '🎓 Awesome, continue' : '🌟 Continue'}
                                </Text>
                            </Pressable>
                        </ScrollView>
                    </BlurView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.92,
        maxHeight: height * 0.9,
    },
    modalContent: {
        borderRadius: 28,
        padding: 20,
        paddingTop: 34, // extra spacing for the X button
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 30,
        elevation: 10,
    },
    closeIconButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 99,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(15,49,114,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIconText: {
        color: '#0f3172',
        fontSize: 14,
        fontWeight: 'bold',
    },
    scrollContent: {
        alignItems: 'center',
        paddingBottom: 6,
    },
    headerEyebrow: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
        color: '#4b7bbb',
        marginBottom: 6,
    },
    title: {
        fontSize: 23,
        fontWeight: '900',
        color: '#0f3172',
        textAlign: 'center',
        marginBottom: 10,
        paddingHorizontal: 8,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15,49,114,0.06)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        marginBottom: 8,
        gap: 8,
    },
    levelFrom: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    levelArrow: {
        fontSize: 16,
        fontWeight: '800',
    },
    levelTo: {
        fontSize: 15,
        fontWeight: '900',
    },
    forcedBadge: {
        marginTop: 2,
        marginBottom: 10,
        backgroundColor: 'rgba(251,191,36,0.18)',
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.4)',
    },
    forcedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#92400E',
    },

    // Envelope + paper stack
    stackWrap: {
        width: '100%',
        height: 400,
        marginTop: 12,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    envelopeFlapDiamond: {
        position: 'absolute',
        bottom: 26,
        left: '50%',
        marginLeft: -55,
        width: 110,
        height: 110,
        borderRadius: 18,
        overflow: 'hidden',
    },
    envelopePocket: {
        position: 'absolute',
        bottom: 0,
        left: '4%',
        right: '4%',
        height: 54,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderBottomLeftRadius: 22,
        borderBottomRightRadius: 22,
        overflow: 'hidden',
    },
    envelopePocketHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 18,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    envelopeFlapCornerLeft: {
        position: 'absolute',
        top: -9,
        left: 10,
        width: 0,
        height: 0,
        borderLeftWidth: 14,
        borderRightWidth: 0,
        borderBottomWidth: 16,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'rgba(255,255,255,0.55)',
    },
    envelopeFlapCornerRight: {
        position: 'absolute',
        top: -9,
        right: 10,
        width: 0,
        height: 0,
        borderRightWidth: 14,
        borderLeftWidth: 0,
        borderBottomWidth: 16,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'rgba(255,255,255,0.55)',
    },
    paperCard: {
        position: 'absolute',
        top: 0,
        left: '2%',
        right: '2%',
        bottom: 20,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(37,99,235,0.12)',
    },
    paperGradientBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
    },
    reportPaper: {},
    certPaper: {},
    paperTapArea: {
        flex: 1,
        padding: 16,
    },
    paperEyebrow: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        color: '#94A3B8',
        textAlign: 'center',
        marginBottom: 4,
    },
    paperTitleReport: {
        fontSize: 19,
        fontWeight: '900',
        color: '#0f3172',
        textAlign: 'center',
        marginBottom: 10,
    },
    paperRule: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
    },
    statItem: {
        width: '31%',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f3172',
    },
    statLabel: {
        fontSize: 9.5,
        color: '#64748b',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 2,
    },
    xpRow: {
        marginTop: 4,
        alignItems: 'center',
    },
    xpRowText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#92400E',
    },
    peekHint: {
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
    },
    paperDownloadBtn: {
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
        elevation: 4,
    },
    paperDownloadBtnGradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 14,
    },
    paperDownloadBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 0.3,
    },

    // Certificate specific
    certInnerBorder: {
        flex: 1,
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
    },
    badgeIconLarge: {
        fontSize: 34,
        marginBottom: 4,
    },
    certStudentName: {
        fontSize: 17,
        fontWeight: '900',
        color: '#0f3172',
        textAlign: 'center',
        marginBottom: 4,
    },
    certBody: {
        fontSize: 12.5,
        color: '#334155',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 6,
    },
    certBold: {
        fontWeight: '800',
        color: '#0f3172',
    },
    certMessage: {
        fontSize: 11.5,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 16,
        marginBottom: 8,
    },
    graduationMessage: {
        backgroundColor: 'rgba(251,191,36,0.15)',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    graduationText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#92400E',
        textAlign: 'center',
    },
    certFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 'auto',
    },
    certSealMini: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#b91c1c',
        alignItems: 'center',
        justifyContent: 'center',
    },
    certSealMiniIcon: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
    },
    certSigLine: {
        fontSize: 11,
        fontWeight: '800',
        color: '#0f3172',
    },
    certSigTitle: {
        fontSize: 9,
        color: '#64748b',
        fontWeight: '600',
    },

    // Tabs
    tabRow: {
        flexDirection: 'row',
        gap: 8,
        width: '100%',
        marginBottom: 14,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(15,49,114,0.05)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabButtonActive: {
        backgroundColor: 'rgba(37,99,235,0.10)',
        borderColor: 'rgba(37,99,235,0.35)',
    },
    tabButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },
    tabButtonTextActive: {
        color: '#2563EB',
    },

    closeButton: {
        width: '100%',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    closeButtonGradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 16,
    },
    closeButtonText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#ffffff',
    },
});