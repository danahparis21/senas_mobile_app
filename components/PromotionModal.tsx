// app/components/PromotionModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    Dimensions,
    Animated,
    Alert,
    Image,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width, height } = Dimensions.get('window');

const LOGO_IMAGE = require('../assets/images/img/senyas_logo.png');
const SENYA_TEACHING_IMAGE = require('../assets/images/img/senya_teaching.png');
const SENYA_BLUE_IMAGE = require('../assets/images/img/senya_blue.png');

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

const getAssetUriForPrint = (moduleRequire: any): string => {
    try {
        const resolved = Image.resolveAssetSource(moduleRequire);
        return resolved?.uri || '';
    } catch (e) {
        console.warn('Could not resolve asset source for print:', e);
        return '';
    }
};

// Builds the point list for a scalloped/starburst medal edge (alternating outer/inner radius).
const buildScallopPoints = (cx: number, cy: number, outerR: number, innerR: number, spikes: number): string => {
    const pts: string[] = [];
    for (let i = 0; i < spikes * 2; i++) {
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
};

// Builds a ring of small star studs around the medal face.
const buildStarRing = (cx: number, cy: number, r: number, count: number, color: string): string => {
    return Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const x = (cx + r * Math.cos(angle)).toFixed(1);
        const y = (cy + r * Math.sin(angle)).toFixed(1);
        return `<circle cx="${x}" cy="${y}" r="1.3" fill="${color}" opacity="0.6" />`;
    }).join('');
};

export default function PromotionModal({ visible, promotionData, onClose, studentName }: PromotionModalProps) {
    const [scaleAnim] = useState(new Animated.Value(0.88));
    const [fadeAnim] = useState(new Animated.Value(0));
    const [frontPaper, setFrontPaper] = useState<'certificate' | 'report'>('certificate');
    const swapAnim = useRef(new Animated.Value(0)).current;
    const envelopeAnim = useRef(new Animated.Value(0)).current;

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
                    duration: 280,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 0.88,
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

    useEffect(() => {
        if (visible) {
            setFrontPaper('certificate');
            swapAnim.setValue(0);
            envelopeAnim.setValue(0);
            Animated.sequence([
                Animated.delay(100),
                Animated.spring(envelopeAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 42,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            envelopeAnim.setValue(0);
        }
    }, [visible]);

    if (!visible || !promotionData) {
        return null;
    }

    const toLevelLower = (promotionData.to_level || '').toLowerCase();
    const fromLevelLower = (promotionData.from_level || '').toLowerCase();

    const isGraduation =
        toLevelLower === 'graduated' ||
        toLevelLower === 'completed' ||
        toLevelLower === 'completion' ||
        fromLevelLower === 'advanced';

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

    const recipientName = studentName || 'Learner';

    const targetLevelUpper = promotionData.to_level.toUpperCase();
    const formattedPillText = targetLevelUpper.includes('LEVEL')
        ? targetLevelUpper
        : `${targetLevelUpper} LEVEL`;

    const handleDownloadLetter = async () => {
        try {
            const logoUri = getAssetUriForPrint(LOGO_IMAGE);
            const senyaUri = getAssetUriForPrint(SENYA_TEACHING_IMAGE);

            const certTitle = isGraduation ? 'CERTIFICATE OF COMPLETION' : 'CERTIFICATE OF ACHIEVEMENT';
            const certBodyText = isGraduation
                ? `for successfully completing the entire Filipino Sign Language curriculum in the SEÑAS Learning Platform. Through dedication, perseverance, and continuous learning, this learner has demonstrated proficiency across the Beginner, Intermediate, and Advanced levels of Filipino Sign Language. Congratulations on this remarkable achievement!`
                : `for successfully completing the <span class="level-highlight">${promotionData.from_level} Level</span> of the SEÑAS Filipino Sign Language Learning Platform and demonstrating the knowledge and skills required to advance to the next stage.`;

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #ffffff;
    }
    .cert-frame {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 45%, #38bdf8 75%, #1d4ed8 100%);
      padding: 14px;
    }
    .cert-container {
      width: 100%;
      height: 100%;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      padding: 44px 60px 36px 60px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    /* Decorative organic blobs, top-left and bottom-right */
    .blob-tl {
      position: absolute;
      top: -140px;
      left: -160px;
      width: 440px;
      height: 440px;
      background: linear-gradient(135deg, #bfdbfe 0%, #eff6ff 100%);
      border-radius: 42% 58% 65% 35% / 45% 40% 60% 55%;
      z-index: 0;
    }
    .blob-br {
      position: absolute;
      bottom: -180px;
      right: -170px;
      width: 520px;
      height: 520px;
      background: linear-gradient(135deg, #bfdbfe 0%, #eff6ff 100%);
      border-radius: 60% 40% 35% 65% / 55% 60% 40% 45%;
      z-index: 0;
    }
    .cert-inner { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
    .sparkle-star {
      position: absolute;
      color: #60a5fa;
      z-index: 1;
      line-height: 1;
    }
    /* Official Top-Right Ribbon with V-Notch Tail */
    .ribbon-banner {
      width: 128px;
      height: 182px;
      position: absolute;
      top: 0;
      right: 78px;
      z-index: 10;
      text-align: center;
    }
    .ribbon-shape {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 0;
    }
    .ribbon-content {
      position: relative;
      z-index: 1;
      padding: 16px 8px 22px 8px;
      color: #ffffff;
    }
    .ribbon-title {
      font-size: 10.5px;
      font-weight: 900;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 10px;
      line-height: 1.25;
    }
    .stamp-center-text {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .header-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .logo-img {
      height: 48px;
      object-fit: contain;
      margin-bottom: 6px;
    }
    .brand-tagline {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: #1d4ed8;
    }
    .cert-content {
      text-align: left;
      max-width: 610px;
      margin-top: 6px;
    }
    .cert-title {
      font-size: 29px;
      font-weight: 900;
      color: #0f2a5c;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .presented-to {
      font-size: 14px;
      color: #64748b;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .recipient-name {
      font-size: 42px;
      font-weight: 900;
      color: #0f2a5c;
      margin-bottom: 10px;
    }
    .divider-row {
      position: relative;
      width: 100%;
      max-width: 580px;
      height: 1.5px;
      background: linear-gradient(90deg, transparent, #a9c9f7, #a9c9f7, transparent);
      margin: 8px 0 18px 0;
    }
    .divider-diamond {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #2563eb;
      font-size: 15px;
      line-height: 1;
      background: #ffffff;
      padding: 0 8px;
    }
    .cert-body-text {
      font-size: 14.5px;
      color: #334155;
      line-height: 1.7;
      margin-bottom: 18px;
      max-width: 580px;
    }
    .level-highlight {
      color: #2563eb;
      font-weight: 800;
    }
    .promoted-section {
      margin-bottom: 18px;
    }
    .promoted-label {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .promoted-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: #eaf2ff;
      border: 1.5px solid #bfdbfe;
      padding: 9px 26px;
      border-radius: 26px;
      color: #1d4ed8;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.4px;
      box-shadow: 0 3px 8px rgba(37,99,235,0.10);
    }
    .pill-star {
      color: #f59e0b;
      font-size: 14px;
    }
    .quote-box {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      max-width: 540px;
      font-size: 13.5px;
      color: #475569;
      font-style: italic;
      line-height: 1.55;
    }
    .quote-mark {
      font-family: Georgia, serif;
      font-style: normal;
      font-weight: 900;
      font-size: 24px;
      color: #2563eb;
      line-height: 1;
    }
    .cert-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
    }
    .date-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .date-badge {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #eaf2ff;
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .date-label {
      font-size: 9.5px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 1px;
    }
    .date-val {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f2a5c;
    }
    .signatures-group {
      display: flex;
      align-items: center;
      gap: 28px;
      margin-right: 200px;
    }
    .sig-box {
      text-align: center;
      width: 150px;
    }
    .sig-line {
      border-top: 1.5px solid #cbd5e1;
      padding-top: 6px;
      font-size: 12px;
      font-weight: 800;
      color: #0f2a5c;
    }
    .sig-divider {
      height: 26px;
      width: 1px;
      background-color: #cbd5e1;
    }
    .senya-mascot {
      position: absolute;
      bottom: -4px;
      right: 30px;
      height: 225px;
      object-fit: contain;
      z-index: 6;
    }
  </style>
</head>
<body>
  <div class="cert-frame">
  <div class="cert-container">
    <div class="blob-tl"></div>
    <div class="blob-br"></div>
    <span class="sparkle-star" style="top:38px; left:210px; font-size:16px; opacity:0.55;">✦</span>
    <span class="sparkle-star" style="top:96px; left:150px; font-size:10px; opacity:0.4;">✦</span>
    <span class="sparkle-star" style="top:150px; left:250px; font-size:12px; opacity:0.35;">✦</span>
    <span class="sparkle-star" style="bottom:120px; right:260px; font-size:18px; opacity:0.5;">✦</span>
    <span class="sparkle-star" style="bottom:70px; right:340px; font-size:10px; opacity:0.4;">✦</span>
    <span class="sparkle-star" style="bottom:190px; right:200px; font-size:11px; opacity:0.35;">✦</span>
    <div class="ribbon-banner">
      <svg class="ribbon-shape" width="128" height="182" viewBox="0 0 128 182" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ribbonGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563eb" />
            <stop offset="55%" stop-color="#1d4ed8" />
            <stop offset="100%" stop-color="#1e40af" />
          </linearGradient>
        </defs>
        <path d="M0,0 L128,0 L128,158 L64,182 L0,158 Z" fill="url(#ribbonGrad)" />
      </svg>
      <div class="ribbon-content">
        <div class="ribbon-title">OFFICIAL<br/>CERTIFICATE</div>
        <svg width="86" height="86" viewBox="0 0 86 86" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <circle cx="43" cy="43" r="34" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="2.6 2.6" opacity="0.85" />
          <path id="stampTopPath" d="M 9,43 A 34,34 0 1,1 77,43" fill="none" />
          <path id="stampBottomPath" d="M 77,47 A 34,34 0 1,1 9,47" fill="none" />
          <text font-size="5.4" font-weight="700" letter-spacing="0.5" fill="#ffffff">
            <textPath href="#stampTopPath" xlink:href="#stampTopPath" startOffset="50%" text-anchor="middle">FILIPINO SIGN LANGUAGE</textPath>
          </text>
          <text font-size="5" font-weight="700" letter-spacing="0.5" fill="#ffffff">
            <textPath href="#stampBottomPath" xlink:href="#stampBottomPath" startOffset="50%" text-anchor="middle">LEARNING PLATFORM</textPath>
          </text>
          <text x="43" y="47" font-size="12.5" font-weight="900" fill="#ffffff" text-anchor="middle" class="stamp-center-text">SEÑAS</text>
        </svg>
      </div>
    </div>
    <div class="cert-inner">
      <div class="header-left">
        <img src="${logoUri}" class="logo-img" alt="SEÑAS Logo" />
        <div class="brand-tagline">Filipino Sign Language Learning Platform</div>
      </div>
      <div class="cert-content">
        <div class="cert-title">${certTitle}</div>
        <div class="presented-to">Presented to</div>
        <div class="recipient-name">${recipientName}</div>
        <div class="divider-row"><div class="divider-diamond">✦</div></div>
        <div class="cert-body-text">${certBodyText}</div>
        ${!isGraduation ? `
        <div class="promoted-section">
          <div class="promoted-label">PROMOTED TO</div>
          <div class="promoted-pill">
            <span class="pill-star">★</span> ${formattedPillText} <span class="pill-star">★</span>
          </div>
        </div>
        ` : ''}
        <div class="quote-box">
          <span class="quote-mark">&ldquo;</span>
          <span>Keep learning, keep signing, and continue making communication more inclusive.</span>
        </div>
      </div>
      <div class="cert-footer">
        <div class="date-container">
          <div class="date-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div class="date-label">DATE</div>
            <div class="date-val">${promotionDateFormatted}</div>
          </div>
        </div>
        <div class="signatures-group">
          <div class="sig-box">
            <div class="sig-line">SEÑAS Team</div>
          </div>
          <div class="sig-divider"></div>
          <div class="sig-box">
            <div class="sig-line">FSL Academic Committee</div>
          </div>
        </div>
      </div>
    </div>
    <img src="${senyaUri}" class="senya-mascot" alt="Senya Mascot" />
  </div>
  </div>
</body>
</html>
            `;
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Download Official Certificate' });
        } catch (error) {
            console.error('Error generating PDF Certificate:', error);
            Alert.alert('Error', 'Failed to generate PDF Certificate. Please try again.');
        }
    };

    const handleDownloadReportCard = async () => {
        try {
            const logoUri = getAssetUriForPrint(LOGO_IMAGE);
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f3172; padding: 40px; line-height: 1.6; background-color: #f8fafc; }
    .container { border: 1px solid #e2e8f0; padding: 40px; background: #ffffff; border-radius: 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); max-width: 650px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #edf2f7; padding-bottom: 20px; margin-bottom: 25px; }
    .logo-img { height: 42px; object-fit: contain; }
    .title { font-size: 16px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 1.5px; }
    .student-info { background: #f8fafc; border-radius: 12px; padding: 16px 20px; margin-bottom: 25px; display: flex; justify-content: space-between; border: 1px solid #e2e8f0; }
    .info-col { min-width: 140px; }
    .info-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
    .info-value { font-size: 15px; font-weight: 800; color: #0f3172; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    th { background-color: #0f3172; color: white; text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 6px 6px 0 0; }
    td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    tr:nth-child(even) td { background-color: #f8fafc; }
    .metric-name { font-weight: 600; color: #334155; }
    .metric-value { font-weight: 800; text-align: right; color: #0f3172; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUri}" class="logo-img" alt="SEÑAS Logo" />
      <div class="title">Performance Summary</div>
    </div>
    <div class="student-info">
      <div class="info-col">
        <div class="info-label">Learner Name</div>
        <div class="info-value">${recipientName}</div>
      </div>
      <div class="info-col">
        <div class="info-label">Promoted Level</div>
        <div class="info-value">${promotionData.to_level}</div>
      </div>
      <div class="info-col" style="text-align: right;">
        <div class="info-label">Date Issued</div>
        <div class="info-value">${promotionDateFormatted}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>Learning Metric</th><th style="text-align: right;">Record</th></tr>
      </thead>
      <tbody>
        <tr><td class="metric-name">Quizzes Taken</td><td class="metric-value">${promotionData.summary.quizzes_taken}</td></tr>
        <tr><td class="metric-name">Quizzes Passed</td><td class="metric-value">${promotionData.summary.quizzes_passed}</td></tr>
        <tr><td class="metric-name">Average Quiz Score</td><td class="metric-value">${promotionData.summary.avg_quiz_score}%</td></tr>
        <tr><td class="metric-name">Lessons Completed</td><td class="metric-value">${promotionData.summary.lessons_completed}</td></tr>
        <tr><td class="metric-name">Gestures Attempted</td><td class="metric-value">${promotionData.summary.gestures_attempted}</td></tr>
        <tr><td class="metric-name">Accuracy Rate</td><td class="metric-value">${promotionData.summary.accuracy}%</td></tr>
        <tr><td class="metric-name">Total Experience Points (XP)</td><td class="metric-value" style="color: #d97706; font-size: 16px;">★ ${promotionData.summary.total_xp} XP</td></tr>
      </tbody>
    </table>
    <div class="footer">
      <div>Official Performance Summary - SEÑAS Filipino Sign Language Learning Platform</div>
      <div>Verification Record ID: SENAS-PR-${promotionData.id}</div>
    </div>
  </div>
</body>
</html>
            `;
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Download Grade Report' });
        } catch (error) {
            console.error('Error generating PDF Report:', error);
            Alert.alert('Error', 'Failed to generate PDF Report. Please try again.');
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

    const paperEntranceOpacity = envelopeAnim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.4, 1] });
    const paperEntranceTranslateY = envelopeAnim.interpolate({ inputRange: [0, 1], outputRange: [125, 0] });
    const paperEntranceScale = envelopeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });

    const certTransform = {
        opacity: paperEntranceOpacity,
        transform: [
            { translateY: paperEntranceTranslateY },
            { scale: paperEntranceScale },
            { translateX: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
            { translateY: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
            { rotate: swapAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-6deg'] }) },
            { scale: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) },
        ],
    };

    const reportTransform = {
        opacity: paperEntranceOpacity,
        transform: [
            { translateY: paperEntranceTranslateY },
            { scale: paperEntranceScale },
            { translateX: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { translateY: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
            { rotate: swapAnim.interpolate({ inputRange: [0, 1], outputRange: ['6deg', '0deg'] }) },
            { scale: swapAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
    };

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <View style={styles.overlay}>
                <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.envelopeMainContainer}>
                        {/* Envelope Body - Rectangle with rounded bottom */}
                        <View style={styles.envelopeBody}>
                            <LinearGradient
                                colors={['#1e3a8a', '#1d4ed8', '#0f3172'] as const}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                            />
                            <View style={styles.envelopeBackHighlight} />
                        </View>

                        {/* Envelope Top Flap - Triangle that connects to body */}
                        <View style={styles.envelopeTriangleFlap} />
                        <View style={styles.envelopeTriangleFlapShade} />

                        {/* Close Button */}
                        <Pressable style={styles.closeIconButton} onPress={onClose} hitSlop={12}>
                            <Ionicons name="close" size={20} color="#FFFFFF" />
                        </Pressable>

                        {/* Papers Container - Positioned to emerge from envelope */}
                        <View style={styles.papersContainer}>
                            {/* Grade Report Card - WITHOUT download button inside */}
                            <Animated.View style={[styles.paperCard, reportTransform, { zIndex: frontPaper === 'report' ? 2 : 1 }]}>
                                <Pressable style={styles.paperTapArea} onPress={() => bringToFront('report')}>
                                    <Text style={styles.paperEyebrow}>OFFICIAL TRANSCRIPT</Text>
                                    <Text style={styles.paperTitleReport}>Grade Report Card</Text>
                                    <View style={styles.paperRule} />

                                    <View style={styles.statsGrid}>
                                        <View style={styles.statItem}>
                                            <Ionicons name="help-circle" size={16} color="#2563EB" />
                                            <Text style={styles.statValue}>{promotionData.summary.quizzes_taken}</Text>
                                            <Text style={styles.statLabel}>Quizzes</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                                            <Text style={styles.statValue}>{promotionData.summary.quizzes_passed}</Text>
                                            <Text style={styles.statLabel}>Passed</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Ionicons name="trophy" size={16} color="#D97706" />
                                            <Text style={styles.statValue}>{promotionData.summary.avg_quiz_score}%</Text>
                                            <Text style={styles.statLabel}>Avg Score</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Ionicons name="book" size={16} color="#2563EB" />
                                            <Text style={styles.statValue}>{promotionData.summary.lessons_completed}</Text>
                                            <Text style={styles.statLabel}>Lessons</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Ionicons name="hand-left" size={16} color="#2563EB" />
                                            <Text style={styles.statValue}>{promotionData.summary.gestures_attempted}</Text>
                                            <Text style={styles.statLabel}>Gestures</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Ionicons name="analytics" size={16} color="#2563EB" />
                                            <Text style={styles.statValue}>{promotionData.summary.accuracy}%</Text>
                                            <Text style={styles.statLabel}>Accuracy</Text>
                                        </View>
                                    </View>

                                    <View style={styles.xpRow}>
                                        <Ionicons name="star" size={16} color="#D97706" style={{ marginRight: 4 }} />
                                        <Text style={styles.xpRowText}>{promotionData.summary.total_xp} XP Earned</Text>
                                    </View>
                                </Pressable>
                            </Animated.View>

                            {/* Certificate Card - WITHOUT download button inside */}
                            <Animated.View style={[styles.paperCard, certTransform, { zIndex: frontPaper === 'certificate' ? 2 : 1 }]}>
                                <Pressable style={styles.paperTapArea} onPress={() => bringToFront('certificate')}>
                                    <View style={styles.canvaCertFrame}>
                                        <View style={styles.canvaRibbonBanner}>
                                            <Text style={styles.canvaRibbonTitle}>OFFICIAL{'\n'}CERTIFICATE</Text>
                                            <View style={styles.canvaRibbonStamp}>
                                                <Text style={styles.canvaStampTop}>FSL PLATFORM</Text>
                                                <Text style={styles.canvaStampCenter}>SEÑAS</Text>
                                            </View>
                                        </View>

                                        <View style={styles.canvaHeaderLeft}>
                                            <Image source={LOGO_IMAGE} style={styles.canvaLogo} resizeMode="contain" />
                                        </View>

                                        <View style={styles.canvaContent}>
                                            <Text style={styles.canvaTitle}>{isGraduation ? 'CERTIFICATE OF COMPLETION' : 'CERTIFICATE OF ACHIEVEMENT'}</Text>
                                            <Text style={styles.canvaPresentedTo}>Presented to</Text>
                                            <Text style={styles.canvaRecipientName} numberOfLines={1}>{recipientName}</Text>
                                            <View style={styles.canvaStarDivider}>
                                                <View style={styles.canvaDividerLine} />
                                                <Text style={styles.canvaStarIcon}>✦</Text>
                                                <View style={styles.canvaDividerLine} />
                                            </View>
                                            {isGraduation ? (
                                                <Text style={styles.canvaBodyText}>for successfully completing the entire Filipino Sign Language curriculum in the SEÑAS Learning Platform. Through dedication, perseverance, and continuous learning, this learner has demonstrated proficiency across the Beginner, Intermediate, and Advanced levels. Congratulations!</Text>
                                            ) : (
                                                <Text style={styles.canvaBodyText}>for successfully completing the <Text style={styles.canvaBoldText}>{promotionData.from_level} Level</Text> of the SEÑAS Filipino Sign Language Learning Platform and demonstrating the knowledge and skills required to advance to the next stage.</Text>
                                            )}
                                            {!isGraduation && (
                                                <View style={styles.canvaPromotedSection}>
                                                    <Text style={styles.canvaPromotedLabel}>PROMOTED TO</Text>
                                                    <View style={styles.canvaPromotedPill}>
                                                        <Ionicons name="star" size={11} color="#F59E0B" />
                                                        <Text style={styles.canvaPromotedText}>{formattedPillText}</Text>
                                                        <Ionicons name="star" size={11} color="#F59E0B" />
                                                    </View>
                                                </View>
                                            )}
                                            <Text style={styles.canvaQuote}>"Keep learning, keep signing, and continue making communication more inclusive."</Text>
                                        </View>
                                        <View style={styles.canvaFooter}>
                                            <View style={styles.canvaDateGroup}>
                                                <View style={styles.canvaDateIconBox}>
                                                    <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                                                </View>
                                                <View>
                                                    <Text style={styles.canvaDateLabel}>DATE</Text>
                                                    <Text style={styles.canvaDateValue}>{promotionDateFormatted}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.canvaSigsGroup}>
                                                <View style={styles.canvaSigCol}>
                                                    <View style={styles.canvaSigLine} />
                                                    <Text style={styles.canvaSigTitle}>SEÑAS Team</Text>
                                                </View>
                                                <View style={styles.canvaSigVertLine} />
                                                <View style={styles.canvaSigCol}>
                                                    <View style={styles.canvaSigLine} />
                                                    <Text style={styles.canvaSigTitle}>FSL Academic Committee</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <Image source={SENYA_TEACHING_IMAGE} style={styles.canvaSenyaMascot} resizeMode="contain" />
                                    </View>
                                </Pressable>
                            </Animated.View>
                        </View>

                        {/* Download Buttons - Positioned independently ABOVE the paper cards */}
                        <View style={styles.downloadButtonsContainer}>
                            {frontPaper === 'certificate' && (
                                <Pressable style={styles.paperDownloadBtn} onPress={handleDownloadLetter}>
                                    <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.paperDownloadBtnText}>Download Certificate</Text>
                                </Pressable>
                            )}
                            {frontPaper === 'report' && (
                                <Pressable style={styles.paperDownloadBtn} onPress={handleDownloadReportCard}>
                                    <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.paperDownloadBtnText}>Download Report Card</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Envelope Front Pocket - Covers bottom of papers */}
                        <View style={styles.envelopeFrontPocket} pointerEvents="none">
                            <LinearGradient
                                colors={['#2563eb', '#1d4ed8', '#0f3172'] as const}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                            />
                            <View style={styles.envelopeFrontVSeam} />
                            <View style={styles.envelopeFoldLeft} />
                            <View style={styles.envelopeFoldRight} />
                        </View>

                        {/* Wax Seal */}
                        <View style={styles.envelopeWaxSeal} pointerEvents="none">
                            <LinearGradient
                                colors={['#b45309', '#d97706', '#f59e0b'] as const}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0.2, y: 0.1 }}
                                end={{ x: 0.8, y: 0.9 }}
                            />
                            <View style={styles.envelopeWaxInner}>
                                <Ionicons name="ribbon" size={20} color="#FEF3C7" />
                            </View>
                        </View>

                        {/* Tab Buttons - Now directly below wax seal */}
                        <View style={styles.tabRow}>
                            <Pressable
                                style={[styles.tabButton, frontPaper === 'certificate' && styles.tabButtonActive]}
                                onPress={() => bringToFront('certificate')}
                            >
                                <Ionicons name="ribbon-outline" size={16} color={frontPaper === 'certificate' ? '#2563EB' : '#64748B'} style={{ marginRight: 6 }} />
                                <Text style={[styles.tabButtonText, frontPaper === 'certificate' && styles.tabButtonTextActive]}>Certificate</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.tabButton, frontPaper === 'report' && styles.tabButtonActive]}
                                onPress={() => bringToFront('report')}
                            >
                                <Ionicons name="stats-chart-outline" size={16} color={frontPaper === 'report' ? '#2563EB' : '#64748B'} style={{ marginRight: 6 }} />
                                <Text style={[styles.tabButtonText, frontPaper === 'report' && styles.tabButtonTextActive]}>Grade Report</Text>
                            </Pressable>
                        </View>

                        {/* Continue Button - Raised higher, envelope shorter */}
                        <Pressable style={styles.closeButton} onPress={onClose}>
                            <LinearGradient colors={['#2563eb', '#1d4ed8'] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.closeButtonGradient} />
                            <View style={styles.closeButtonContent}>
                                <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                                <Text style={styles.closeButtonText}>{isGraduation ? 'Awesome, Continue' : 'Continue Learning'}</Text>
                            </View>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    modalContainer: {
        width: width * 0.94,
        maxHeight: height * 0.95,
    },
    envelopeMainContainer: {
        width: '100%',
        minHeight: 560,
        padding: 0,
        paddingTop: 0,
        paddingBottom: 12,
        backgroundColor: 'transparent',
        position: 'relative',
        overflow: 'visible',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    envelopeBody: {
        width: '100%',
        height: 400,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 10,
        zIndex: 0,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    envelopeBackHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 90,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    envelopeTriangleFlap: {
        position: 'absolute',
        top: 20,
        alignSelf: 'center',
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderLeftWidth: width * 0.46,
        borderRightWidth: width * 0.46,
        borderBottomWidth: 150,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#1e3a8a',
        zIndex: 1,
    },
    envelopeTriangleFlapShade: {
        position: 'absolute',
        top: 10,
        alignSelf: 'center',
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderLeftWidth: width * 0.46,
        borderRightWidth: width * 0.46,
        borderBottomWidth: 150,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#1e40af',
        zIndex: 1,
    },
    closeIconButton: {
        position: 'absolute',
        top: 10,
        right: 14,
        zIndex: 99,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    papersContainer: {
        position: 'relative',
        width: '92%',
        height: 330,
        marginTop: 0,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    downloadButtonsContainer: {
        position: 'absolute',
        top: 340, // Changed from 280 to 300
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 6,
        paddingHorizontal: 16,
    },
    envelopeFrontPocket: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 170,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
        justifyContent: 'flex-start',
        alignItems: 'center',
        shadowColor: '#0F3172',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.30,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 3,
    },
    envelopeFrontVSeam: {
        position: 'absolute',
        top: 0,
        alignSelf: 'center',
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderLeftWidth: width * 0.44,
        borderRightWidth: width * 0.44,
        borderTopWidth: 80,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'rgba(255,255,255,0.10)',
    },
    envelopeFoldLeft: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 1.5,
        height: 180,
        backgroundColor: 'rgba(255,255,255,0.18)',
        transform: [{ rotate: '-62deg' }],
        transformOrigin: 'bottom left',
    },
    envelopeFoldRight: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 1.5,
        height: 180,
        backgroundColor: 'rgba(255,255,255,0.18)',
        transform: [{ rotate: '62deg' }],
        transformOrigin: 'bottom right',
    },
    envelopeWaxSeal: {
        position: 'absolute',
        bottom: 140,
        alignSelf: 'center',
        width: 46,
        height: 46,
        borderRadius: 23,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#FDE68A',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 8,
        zIndex: 20,
    },
    envelopeWaxInner: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paperCard: {
        position: 'absolute',
        top: -50,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        shadowColor: '#0F3172',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
    },
    paperTapArea: {
        flex: 1,
        padding: 12,
    },
    paperEyebrow: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 2,
    },
    paperTitleReport: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F3172',
        textAlign: 'center',
        marginBottom: 8,
    },
    paperRule: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginBottom: 10,
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
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '900',
        color: '#0F3172',
        marginTop: 2,
    },
    statLabel: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 1,
    },
    xpRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF3C7',
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    xpRowText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#92400E',
    },
    paperDownloadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#2563EB',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
        width: '85%',
    },
    paperDownloadBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    canvaCertFrame: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#BFDBFE',
        padding: 10,
        backgroundColor: '#F0F7FF',
        position: 'relative',
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    canvaHeaderLeft: {
        position: 'absolute',
        top: 8,
        left: 10,
        zIndex: 2,
    },
    canvaLogo: {
        width: 95,
        height: 26,
    },
    canvaRibbonBanner: {
        position: 'absolute',
        top: 0,
        right: 14,
        width: 66,
        backgroundColor: '#1E40AF',
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
        paddingVertical: 5,
        paddingHorizontal: 2,
        alignItems: 'center',
        zIndex: 10,
        shadowColor: '#1E40AF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    canvaRibbonTitle: {
        fontSize: 5.5,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    canvaRibbonStamp: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFFFFF',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    canvaStampTop: {
        fontSize: 3,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    canvaStampCenter: {
        fontSize: 7,
        fontWeight: '900',
        color: '#FFFFFF',
        marginVertical: 1,
    },
    canvaContent: {
        alignItems: 'center',
        marginTop: 26,
        paddingHorizontal: 6,
    },
    canvaTitle: {
        fontSize: 12.5,
        fontWeight: '900',
        color: '#0F3172',
        letterSpacing: 0.8,
        textAlign: 'center',
        marginBottom: 2,
    },
    canvaPresentedTo: {
        fontSize: 8.5,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 1,
    },
    canvaRecipientName: {
        fontSize: 19,
        fontWeight: '900',
        color: '#0F3172',
        textAlign: 'center',
        marginBottom: 2,
    },
    canvaStarDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '65%',
        marginVertical: 2,
    },
    canvaDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#93C5FD',
    },
    canvaStarIcon: {
        fontSize: 8,
        color: '#2563EB',
        marginHorizontal: 4,
    },
    canvaBodyText: {
        fontSize: 9,
        color: '#334155',
        textAlign: 'center',
        lineHeight: 13,
        marginVertical: 3,
        paddingHorizontal: 2,
    },
    canvaBoldText: {
        fontWeight: '800',
        color: '#2563EB',
    },
    canvaPromotedSection: {
        alignItems: 'center',
        marginVertical: 2,
    },
    canvaPromotedLabel: {
        fontSize: 6,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 1,
    },
    canvaPromotedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        paddingHorizontal: 10,
        paddingVertical: 2.5,
        borderRadius: 12,
        marginTop: 1,
    },
    canvaPromotedText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#2563EB',
    },
    canvaQuote: {
        fontSize: 8,
        fontStyle: 'italic',
        color: '#475569',
        textAlign: 'center',
        marginTop: 2,
    },
    canvaFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 4,
        paddingRight: 65,
    },
    canvaDateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    canvaDateIconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    canvaDateLabel: {
        fontSize: 6,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    canvaDateValue: {
        fontSize: 8,
        fontWeight: '700',
        color: '#0F3172',
    },
    canvaSigsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    canvaSigCol: {
        alignItems: 'center',
    },
    canvaSigLine: {
        width: 60,
        height: 1,
        backgroundColor: '#CBD5E1',
        marginBottom: 2,
    },
    canvaSigTitle: {
        fontSize: 7,
        fontWeight: '700',
        color: '#0F3172',
    },
    canvaSigVertLine: {
        width: 1,
        height: 14,
        backgroundColor: '#CBD5E1',
    },
    canvaSenyaMascot: {
        position: 'absolute',
        bottom: 60,
        right: 4,
        width: 68,
        height: 80,
        zIndex: 10,
    },
    tabRow: {
        flexDirection: 'row',
        gap: 8,
        width: '76%',
        marginTop: -40,
        marginBottom: 70,
        zIndex: 5,
        paddingHorizontal: 0,
        alignSelf: 'center',
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    tabButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#2563EB',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    tabButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    tabButtonTextActive: {
        color: '#2563EB',
    },
    closeButton: {
        width: '90%',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 7,
        marginHorizontal: 0,
        marginTop: 0,
    },
    closeButtonGradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 14,
    },
    closeButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
});