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
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useSettings } from '../contexts/SettingsContext';

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
  teacherName?: string;
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

// Helper to build clean file names for downloaded PDFs (e.g. Hanad-Sirap-Achievement-Certificate.pdf)
const getSanitizedFileName = (name: string, type: 'Certificate' | 'Report', isGraduation: boolean) => {
  const cleanName = (name || 'Learner').trim().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  if (type === 'Certificate') {
    const certSuffix = isGraduation ? 'Completion-Certificate' : 'Achievement-Certificate';
    return `${cleanName}-${certSuffix}.pdf`;
  }
  return `${cleanName}-Grade-Report.pdf`;
};

export default function PromotionModal({ visible, promotionData, onClose, studentName, teacherName }: PromotionModalProps) {
  const [scaleAnim] = useState(new Animated.Value(0.88));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [frontPaper, setFrontPaper] = useState<'certificate' | 'report'>('certificate');
  const swapAnim = useRef(new Animated.Value(0)).current;
  const envelopeAnim = useRef(new Animated.Value(0)).current;
  const [adviserName, setAdviserName] = useState<string>(teacherName || 'Emma Ruth');

  // 🎵 Sound Effect
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const { settings } = useSettings();

  // ── Fetch Teacher / Adviser Name ──
  useEffect(() => {
    if (teacherName && teacherName.trim() !== '') {
      setAdviserName(teacherName);
      return;
    }
    const loadTeacher = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          const student = user.student;
          if (student?.teacher) {
            const t = student.teacher;
            const full = `${t.first_name || ''} ${t.last_name || ''}`.trim();
            if (full) {
              setAdviserName(full);
              return;
            }
          }
        }
      } catch (e) {
        console.log('Error loading teacher in modal:', e);
      }
      setAdviserName('Emma Ruth');
    };
    loadTeacher();
  }, [teacherName, visible]);

  // ─── Play Sound When Modal Opens OR Settings Change ──────────────────
  useEffect(() => {
    const handleSound = async () => {
      if (!settings.soundEnabled) {
        console.log('🔇 Sound disabled, stopping certificate sound');
        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
          setSound(null);
        }
        return;
      }

      if (visible && settings.soundEnabled) {
        try {
          if (sound) {
            await sound.unloadAsync();
            setSound(null);
          }

          const { sound: newSound } = await Audio.Sound.createAsync(
            require('../assets/music/certificate.mp3'),
            {
              shouldPlay: true,
              isLooping: false,
              volume: 0.8,
            }
          );
          setSound(newSound);
        } catch (error) {
          console.error('Failed to play certificate sound:', error);
        }
      }
    };

    handleSound();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [visible, settings.soundEnabled]);

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

      // Color Theme variables (Royal Blue for Achievement, Golden Yellow for Completion)
      const isGold = isGraduation;
      const themePrimary = isGold ? '#ca8a04' : '#1d4ed8';
      const themeSecondary = isGold ? '#eab308' : '#2563eb';
      const themeDark = isGold ? '#713f12' : '#0f2a5c';
      const themeLightBg = isGold ? '#fef9c3' : '#eff6ff';
      const themeBorder = isGold ? '#fef08a' : '#bfdbfe';
      const frameGrad = isGold
        ? 'linear-gradient(135deg, #ca8a04 0%, #eab308 50%, #854d0e 100%)'
        : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #1d4ed8 100%)';
      const waveBg = isGold
        ? 'radial-gradient(circle, #fef08a 0%, #fefcbf 70%, transparent 100%)'
        : 'radial-gradient(circle, #dbeafe 0%, #eff6ff 70%, transparent 100%)';
      const watermarkStroke = isGold ? '#fde047' : '#93c5fd';

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
      background: #ffffff;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    .cert-outer-canvas {
      width: 100%;
      height: 100%;
      background: ${frameGrad};
      padding: 14px;
    }
    .cert-card {
      width: 100%;
      height: 100%;
      background: #ffffff;
      border-radius: 18px;
      position: relative;
      overflow: hidden;
      padding: 34px 50px 110px 60px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Solid Header & Footer Bars */
    .header-accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 10px;
      background: ${themePrimary};
      z-index: 4;
    }
    .footer-solid-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 90px;
      background: ${themePrimary};
      z-index: 4;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 54px 0 60px;
      border-radius: 0 0 18px 18px;
    }
    .footer-bar-label {
      font-size: 10px;
      font-weight: 700;
      color: rgba(255,255,255,0.7);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .footer-bar-value {
      font-size: 13px;
      font-weight: 900;
      color: #ffffff;
      white-space: nowrap;
    }
    .footer-bar-divider {
      width: 1px;
      height: 36px;
      background: rgba(255,255,255,0.3);
    }

    /* Decorative Corner Blobs matching Canva Image 1 */
    .wave-tl {
      position: absolute;
      top: -120px;
      left: -130px;
      width: 390px;
      height: 390px;
      background: ${waveBg};
      border-radius: 50%;
      z-index: 0;
      opacity: 0.85;
    }
    .wave-tr {
      position: absolute;
      top: -100px;
      right: -100px;
      width: 340px;
      height: 340px;
      background: ${waveBg};
      border-radius: 50%;
      z-index: 0;
      opacity: 0.75;
    }
    .wave-bl {
      position: absolute;
      bottom: -110px;
      left: -110px;
      width: 360px;
      height: 360px;
      background: ${waveBg};
      border-radius: 50%;
      z-index: 0;
      opacity: 0.75;
    }
    .wave-br {
      position: absolute;
      bottom: -140px;
      right: -130px;
      width: 440px;
      height: 440px;
      background: ${waveBg};
      border-radius: 50%;
      z-index: 0;
      opacity: 0.85;
    }

    /* Stars scattered all over the certificate */
    .star-sparkle {
      position: absolute;
      color: ${isGold ? '#eab308' : '#3b82f6'};
      z-index: 1;
      line-height: 1;
      pointer-events: none;
    }

    /* Faint Hand Sign Gesture Watermarks on Left Background */
    .hand-watermarks {
      position: absolute;
      top: 50px;
      left: 20px;
      bottom: 50px;
      width: 120px;
      z-index: 1;
      opacity: 0.18;
      pointer-events: none;
    }

    /* Top-Right Vertical Ribbon Banner */
    .ribbon-banner {
      position: absolute;
      top: 0;
      right: 48px;
      width: 140px;
      height: 275px;
      z-index: 10;
    }

    /* Top Left Header */
    .header-left {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-top: 4px;
    }
    .logo-img {
      height: 52px;
      object-fit: contain;
      margin-bottom: 4px;
    }
    .brand-tagline {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: ${themePrimary};
    }

    /* Main Certificate Content */
    .cert-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-top: 10px;
      max-width: 660px;
    }
    .cert-title {
      font-size: 34px;
      font-weight: 900;
      color: ${themeDark};
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .presented-to {
      font-size: 16px;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .recipient-name {
      font-size: 52px;
      font-weight: 900;
      color: ${themeDark};
      line-height: 1.1;
      margin-bottom: 4px;
    }
    .name-line {
      height: 3px;
      background: linear-gradient(90deg, ${themeDark}, ${themeSecondary}, ${themeDark});
      width: 90%;
      max-width: 580px;
      margin-bottom: 16px;
      border-radius: 2px;
    }

    .cert-body-text {
      font-size: 16px;
      color: #334155;
      line-height: 1.75;
      max-width: 650px;
      margin-bottom: 18px;
    }
    .level-highlight {
      font-weight: 900;
      color: ${themeSecondary};
    }

    /* Promoted To Section - EXPANDED DESIGN */
    .promoted-section {
      margin-bottom: 18px;
    }
    .promoted-label {
      font-size: 10.5px;
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
      background: ${themeLightBg};
      border: 2px solid ${themeBorder};
      padding: 10px 30px;
      border-radius: 26px;
      color: ${themePrimary};
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .star-bullet {
      color: #f59e0b;
      font-size: 16px;
    }

    /* Quote Box */
    .quote-box {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      max-width: 580px;
      font-size: 14.5px;
      color: #475569;
      font-style: italic;
      line-height: 1.55;
    }
    .quote-mark {
      font-family: Georgia, serif;
      font-style: normal;
      font-weight: 900;
      font-size: 28px;
      color: ${themeSecondary};
      line-height: 1;
    }

    /* Decorative Left Sidebar Box */
    .left-deco-box {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 38px;
      background: linear-gradient(180deg, ${themePrimary} 0%, ${themeSecondary} 100%);
      z-index: 3;
      border-radius: 18px 0 0 18px;
    }

    /* Footer Section */
    .cert-footer {
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-bottom: 4px;
      gap: 0;
    }
    .date-container {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
      min-width: 180px;
    }
    .date-badge {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${themeLightBg};
      border: 1.5px solid ${themeBorder};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .date-label {
      font-size: 9.5px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .date-val {
      font-size: 14px;
      font-weight: 800;
      color: ${themeDark};
      white-space: nowrap;
    }

    .signatures-group {
      display: flex;
      align-items: flex-end;
      gap: 24px;
      margin-right: 200px;
      flex-shrink: 0;
    }
    .sig-box {
      text-align: center;
      min-width: 120px;
    }
    .sig-name {
      font-size: 14px;
      font-weight: 800;
      color: ${themeDark};
      font-style: italic;
      white-space: nowrap;
      padding-bottom: 3px;
      margin-bottom: 0;
    }
    .sig-line {
      border-top: 1.5px solid ${themeDark};
      padding-top: 5px;
      font-size: 9.5px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 1px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .sig-divider {
      height: 36px;
      width: 1px;
      background-color: #cbd5e1;
      align-self: flex-end;
      margin-bottom: 8px;
    }

    /* Senya Mascot - cleared above footer bar */
    .senya-mascot {
      position: absolute;
      bottom: 94px;
      right: 10px;
      height: 260px;
      object-fit: contain;
      z-index: 3;
    }
  </style>
</head>
<body>
  <div class="cert-outer-canvas">
  <div class="cert-card">
    <!-- Solid Header Bar with inline style to guarantee color rendering -->
    <div style="position:absolute;top:0;left:0;right:0;height:12px;background:${themePrimary};z-index:10;"></div>

    <!-- Decorative Left Sidebar (plain color strip) -->
    <div style="position:absolute;left:0;top:0;bottom:0;width:38px;background:linear-gradient(180deg,${themePrimary} 0%,${themeSecondary} 100%);z-index:3;border-radius:18px 0 0 18px;"></div>

    <div class="wave-tl"></div>
    <div class="wave-tr"></div>
    <div class="wave-bl"></div>
    <div class="wave-br"></div>

    <!-- Floating Stars All Over Certificate -->
    <span class="star-sparkle" style="top: 35px; left: 190px; font-size: 18px; opacity: 0.65;">✦</span>
    <span class="star-sparkle" style="top: 85px; left: 130px; font-size: 14px; opacity: 0.5;">★</span>
    <span class="star-sparkle" style="top: 140px; left: 260px; font-size: 16px; opacity: 0.45;">✨</span>
    <span class="star-sparkle" style="top: 60px; right: 220px; font-size: 20px; opacity: 0.55;">✦</span>
    <span class="star-sparkle" style="top: 120px; right: 300px; font-size: 12px; opacity: 0.4;">★</span>
    <span class="star-sparkle" style="top: 220px; left: 170px; font-size: 15px; opacity: 0.5;">✦</span>
    <span class="star-sparkle" style="top: 280px; left: 90px; font-size: 18px; opacity: 0.45;">✨</span>
    <span class="star-sparkle" style="top: 340px; left: 240px; font-size: 13px; opacity: 0.5;">★</span>
    <span class="star-sparkle" style="bottom: 160px; left: 150px; font-size: 17px; opacity: 0.55;">✦</span>
    <span class="star-sparkle" style="bottom: 90px; left: 260px; font-size: 14px; opacity: 0.4;">✨</span>
    <span class="star-sparkle" style="bottom: 220px; right: 280px; font-size: 19px; opacity: 0.5;">✦</span>
    <span class="star-sparkle" style="bottom: 140px; right: 340px; font-size: 13px; opacity: 0.45;">★</span>
    <span class="star-sparkle" style="bottom: 70px; right: 300px; font-size: 16px; opacity: 0.5;">✨</span>

    <!-- Hand Gesture Watermarks -->
    <div class="hand-watermarks">
      <svg width="100" height="400" viewBox="0 0 100 400" fill="none" stroke="${watermarkStroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <g transform="translate(10, 20) scale(0.65)">
          <path d="M30 80 V40 C30 35 35 30 40 30 C45 30 50 35 50 40 V60" />
          <path d="M50 50 C50 45 55 40 60 40 C65 40 70 45 70 50 V65" />
          <path d="M70 55 C70 50 75 45 80 45 C85 45 90 50 90 55 V70" />
          <path d="M20 70 C20 60 25 55 30 55" />
          <path d="M15 90 C15 75 30 70 30 70 L30 110 C30 120 40 130 60 130 C80 130 90 120 90 110 V70" />
        </g>
        <g transform="translate(10, 160) scale(0.65)">
          <path d="M35 80 V20 C35 15 40 10 45 10 C50 10 55 15 55 20 V60" />
          <path d="M60 60 V25 C60 20 65 15 70 15 C75 15 80 20 80 25 V65" />
          <path d="M20 90 C20 75 30 70 30 70 L30 110 C30 120 45 130 65 130 C85 130 90 120 90 110 V65" />
        </g>
        <g transform="translate(10, 290) scale(0.65)">
          <path d="M20 60 V30 C20 25 25 20 30 20 C35 20 40 25 40 30 V65" />
          <path d="M40 50 V20 C40 15 45 10 50 10 C55 10 60 15 60 20 V65" />
          <path d="M60 50 V25 C60 20 65 15 70 15 C75 15 80 20 80 25 V65" />
          <path d="M70 55 V35 C70 30 75 25 80 25 C85 25 90 30 90 35 V70" />
          <path d="M15 90 C15 75 30 70 30 70 L30 110 C30 120 45 130 65 130 C85 130 90 120 90 110 V70" />
        </g>
      </svg>
    </div>

    <!-- Top-Right Ribbon Banner -->
    <div class="ribbon-banner">
      <svg width="140" height="275" viewBox="0 0 140 275" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
          <linearGradient id="ribbonBgGrad" x1="0" y1="0" x2="0" y2="1">
            ${isGold
          ? '<stop offset="0%" stop-color="#854d0e"/><stop offset="50%" stop-color="#ca8a04"/><stop offset="100%" stop-color="#eab308"/>'
          : '<stop offset="0%" stop-color="#0f2a5c"/><stop offset="50%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#2563eb"/>'}
          </linearGradient>
        </defs>
        <!-- Ribbon Base Path with Chevron Tail V-notch -->
        <path d="M 0,0 L 140,0 L 140,260 L 70,225 L 0,260 Z" fill="url(#ribbonBgGrad)" />
        <!-- Dashed Inner Stitched Line -->
        <path d="M 8,0 L 8,247 L 70,215 L 132,247 L 132,0" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="4,4" opacity="0.8" />
        <!-- Top Ribbon Header Text -->
        <text x="70" y="32" font-size="10.5" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">OFFICIAL</text>
        <text x="70" y="46" font-size="10.5" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">CERTIFICATE</text>

        <!-- Center Circular SEÑAS Badge/Seal -->
        <g transform="translate(70, 136)">
          <!-- Outer Circle Fill -->
          <circle cx="0" cy="0" r="43" fill="#ffffff" stroke="${isGold ? '#ca8a04' : '#1e3a8a'}" stroke-width="2.5" />
          <!-- Inner Dashed Ring -->
          <circle cx="0" cy="0" r="38.5" fill="none" stroke="${isGold ? '#eab308' : '#2563eb'}" stroke-width="1" stroke-dasharray="3,3" />
          <!-- Curved Text Paths -->
          <path id="sealTopArc" d="M -31,0 A 31,31 0 0,1 31,0" fill="none" />
          <path id="sealBottomArc" d="M 31,0 A 31,31 0 0,1 -31,0" fill="none" />
          <text font-size="5.2" font-weight="800" fill="${isGold ? '#ca8a04' : '#1e3a8a'}" letter-spacing="0.5">
            <textPath href="#sealTopArc" xlink:href="#sealTopArc" startOffset="50%" text-anchor="middle">FILIPINO SIGN LANGUAGE</textPath>
          </text>
          <text x="0" y="4" font-size="12.5" font-weight="900" fill="${isGold ? '#ca8a04' : '#1e3a8a'}" text-anchor="middle" letter-spacing="0.5">SEÑAS</text>
          <text font-size="5" font-weight="800" fill="${isGold ? '#ca8a04' : '#1e3a8a'}" letter-spacing="0.5">
            <textPath href="#sealBottomArc" xlink:href="#sealBottomArc" startOffset="50%" text-anchor="middle">LEARNING PLATFORM</textPath>
          </text>
        </g>
      </svg>
    </div>

    <div class="header-left">
      <img src="${logoUri}" class="logo-img" alt="SEÑAS Logo" />
      <div class="brand-tagline">Filipino Sign Language Learning Platform</div>
    </div>

    <div class="cert-content">
      <div class="cert-title">${certTitle}</div>
      <div class="presented-to">Presented to</div>
      <div class="recipient-name">${recipientName}</div>
      <div class="name-line"></div>
      <div class="cert-body-text">${certBodyText}</div>
      ${!isGraduation ? `
      <div class="promoted-section">
        <div class="promoted-label">PROMOTED TO</div>
        <div class="promoted-pill">
          <span class="star-bullet">★</span> ${formattedPillText} <span class="star-bullet">★</span>
        </div>
      </div>
      ` : ''}
      <div class="quote-box">
        <span class="quote-mark">&ldquo;</span>
        <span>Keep learning, keep signing, and continue making communication more inclusive.</span>
      </div>
    </div>

    <div class="cert-footer" style="margin-bottom:14px;">
      <div class="date-container">
        <div class="date-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${themeSecondary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div>
          <div class="date-label">DATE AWARDED</div>
          <div class="date-val">${promotionDateFormatted}</div>
        </div>
      </div>
      <div class="signatures-group">
        <div class="sig-box">
          <div class="sig-name">${adviserName}</div>
          <div class="sig-line">Adviser / Teacher</div>
        </div>
        <div class="sig-divider"></div>
        <div class="sig-box">
          <div class="sig-name">&nbsp;</div>
          <div class="sig-line">FSL Academic Committee</div>
        </div>
      </div>
    </div>

    <!-- Solid Footer Bar with INLINE style to guarantee background color renders in expo-print -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:90px;background:${themePrimary};z-index:10;display:flex;align-items:center;justify-content:space-between;padding:0 54px 0 60px;border-radius:0 0 18px 18px;">
      <div>
        <div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Issuing Date</div>
        <div style="font-size:13px;font-weight:900;color:#ffffff;white-space:nowrap;">${promotionDateFormatted}</div>
      </div>
      <div style="width:1px;height:36px;background:rgba(255,255,255,0.35);"></div>
      <div style="text-align:center;">
        <div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Platform</div>
        <div style="font-size:13px;font-weight:900;color:#ffffff;">senas.edu.ph</div>
      </div>
      <div style="width:1px;height:36px;background:rgba(255,255,255,0.35);"></div>
      <div style="text-align:right;">
        <div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Certificate Type</div>
        <div style="font-size:13px;font-weight:900;color:#ffffff;white-space:nowrap;">${isGraduation ? 'Certificate of Completion' : 'Certificate of Achievement'}</div>
      </div>
    </div>

    <img src="${senyaUri}" class="senya-mascot" alt="Senya Mascot" />
  </div>
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const fileName = getSanitizedFileName(recipientName, 'Certificate', isGraduation);
      const destinationUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: destinationUri });
      await Sharing.shareAsync(destinationUri, { mimeType: 'application/pdf', dialogTitle: 'Download Official Certificate', UTI: 'com.adobe.pdf' });
    } catch (error) {
      console.error('Error generating PDF Certificate:', error);
      Alert.alert('Error', 'Failed to generate PDF Certificate. Please try again.');
    }
  };

  const handleDownloadReportCard = async () => {
    try {
      const logoUri = getAssetUriForPrint(LOGO_IMAGE);
      const senyaBlueUri = getAssetUriForPrint(SENYA_BLUE_IMAGE);

      // Compact gold seal (no ribbon tails) reused from the certificate's medal styling.
      const sealCx = 50, sealCy = 50;
      const sealScallop = buildScallopPoints(sealCx, sealCy, 38, 32, 12);
      const sealStarRing = buildStarRing(sealCx, sealCy, 29.5, 16, '#92400e');
      const sealTopArc = `M ${sealCx - 19},${sealCy} A 19,19 0 1,1 ${sealCx + 19},${sealCy}`;
      const sealBottomArc = `M ${sealCx + 19},${sealCy + 3} A 19,19 0 1,1 ${sealCx - 19},${sealCy + 3}`;

      const accuracy = promotionData.summary.accuracy;

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
    .report-frame {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 45%, #38bdf8 75%, #1d4ed8 100%);
      padding: 14px;
    }
    .report-container {
      width: 100%;
      height: 100%;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      padding: 40px 56px;
      display: flex;
      flex-direction: column;
    }
    .blob-tl {
      position: absolute;
      top: -150px;
      left: -170px;
      width: 400px;
      height: 400px;
      background: linear-gradient(135deg, #eaf2ff 0%, #f7fafe 100%);
      border-radius: 42% 58% 65% 35% / 45% 40% 60% 55%;
      z-index: 0;
    }
    .blob-br {
      position: absolute;
      bottom: -190px;
      right: -180px;
      width: 460px;
      height: 460px;
      background: linear-gradient(135deg, #eaf2ff 0%, #f7fafe 100%);
      border-radius: 60% 40% 35% 65% / 55% 60% 40% 45%;
      z-index: 0;
    }
    .report-inner { position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 22px;
    }
    .header-left { display: flex; flex-direction: column; align-items: flex-start; }
    .logo-img { height: 44px; object-fit: contain; margin-bottom: 6px; }
    .brand-tagline {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      color: #1d4ed8;
    }
    .seal-wrap { width: 100px; height: 100px; }
    .report-title-row { margin-bottom: 22px; }
    .report-title {
      font-size: 27px;
      font-weight: 900;
      color: #0f2a5c;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .report-subtitle { font-size: 13px; color: #64748b; font-weight: 500; }
    .info-bar {
      display: flex;
      justify-content: space-between;
      background: #eaf2ff;
      border: 1.5px solid #bfdbfe;
      border-radius: 16px;
      padding: 14px 26px;
      margin-bottom: 22px;
    }
    .info-col { min-width: 140px; }
    .info-col.right { text-align: right; }
    .info-label {
      font-size: 9.5px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 1.2px;
      margin-bottom: 3px;
    }
    .info-value { font-size: 16px; font-weight: 800; color: #0f2a5c; }
    .kpi-row { display: flex; gap: 16px; margin-bottom: 22px; }
    .kpi-card {
      flex: 1;
      border: 1.5px solid #dbeafe;
      border-radius: 14px;
      padding: 14px 16px;
      background: #fbfdff;
    }
    .kpi-card.xp {
      background: #fffaeb;
      border-color: #fde3a7;
    }
    .kpi-value { font-size: 22px; font-weight: 900; color: #0f2a5c; margin-bottom: 3px; }
    .kpi-card.xp .kpi-value { color: #b8791a; }
    .kpi-label {
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #64748b;
    }
    .table-wrap {
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: linear-gradient(90deg, #0f2a5c, #1d4ed8);
      color: #ffffff;
      text-align: left;
      padding: 11px 18px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    td { padding: 10px 18px; border-bottom: 1px solid #edf2f7; font-size: 13.5px; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background-color: #f8fafc; }
    .metric-name { font-weight: 600; color: #334155; }
    .metric-value { font-weight: 800; text-align: right; color: #0f2a5c; }
    .report-footer {
      margin-top: auto;
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 48px;
      border-top: 1.5px solid #e2e8f0;
      padding-top: 16px;
      padding-right: 140px; /* clear space for Senya mascot at bottom-right */
    }
    .date-container { display: flex; align-items: center; gap: 12px; }
    .date-badge {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #eaf2ff;
      border: 1px solid #bfdbfe;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .date-label { font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: 1px; }
    .date-val { font-size: 13px; font-weight: 700; color: #0f2a5c; }
    .verification { text-align: left; font-size: 10.5px; color: #94a3b8; line-height: 1.55; max-width: 380px; }
    .senya-mascot-small {
      position: absolute;
      bottom: 10px;
      right: 24px;
      height: 90px;
      object-fit: contain;
      z-index: 1;
      opacity: 0.94;
    }
  </style>
</head>
<body>
  <div class="report-frame">
  <div class="report-container">
    <div class="blob-tl"></div>
    <div class="blob-br"></div>
    <img src="${senyaBlueUri}" class="senya-mascot-small" alt="Senya Mascot" />
    <div class="report-inner">
      <div class="report-header">
        <div class="header-left">
          <img src="${logoUri}" class="logo-img" alt="SEÑAS Logo" />
          <div class="brand-tagline">Filipino Sign Language Learning Platform</div>
        </div>
        <svg class="seal-wrap" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <defs>
            <linearGradient id="sealGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fde68a" />
              <stop offset="45%" stop-color="#f2b53d" />
              <stop offset="100%" stop-color="#b8791a" />
            </linearGradient>
            <linearGradient id="sealFaceGrad" x1="0.2" y1="0.1" x2="0.8" y2="0.9">
              <stop offset="0%" stop-color="#fef3c7" />
              <stop offset="55%" stop-color="#f6c453" />
              <stop offset="100%" stop-color="#e0a530" />
            </linearGradient>
          </defs>
          <polygon points="${sealScallop}" fill="url(#sealGrad)" stroke="#92400e" stroke-width="0.8" />
          <circle cx="${sealCx}" cy="${sealCy}" r="27" fill="url(#sealFaceGrad)" stroke="#c99a3b" stroke-width="1.2" />
          ${sealStarRing}
          <path id="sealTopPath" d="${sealTopArc}" fill="none" />
          <path id="sealBottomPath" d="${sealBottomArc}" fill="none" />
          <text font-size="4.6" font-weight="800" letter-spacing="0.5" fill="#7c4a03">
            <textPath href="#sealTopPath" xlink:href="#sealTopPath" startOffset="50%" text-anchor="middle">OFFICIAL</textPath>
          </text>
          <text font-size="4.6" font-weight="800" letter-spacing="0.5" fill="#7c4a03">
            <textPath href="#sealBottomPath" xlink:href="#sealBottomPath" startOffset="50%" text-anchor="middle">RECORD</textPath>
          </text>
          <text x="${sealCx}" y="${sealCy + 4.5}" font-size="10" font-weight="900" fill="#7c4a03" text-anchor="middle">SEÑAS</text>
        </svg>
      </div>

      <div class="report-title-row">
        <div class="report-title">Performance Summary</div>
        <div class="report-subtitle">Official Learning Progress Report</div>
      </div>

      <div class="info-bar">
        <div class="info-col">
          <div class="info-label">Learner Name</div>
          <div class="info-value">${recipientName}</div>
        </div>
        <div class="info-col">
          <div class="info-label">Promoted Level</div>
          <div class="info-value">${promotionData.to_level}</div>
        </div>
        <div class="info-col right">
          <div class="info-label">Date Issued</div>
          <div class="info-value">${promotionDateFormatted}</div>
        </div>
      </div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-value">${promotionData.summary.quizzes_passed}/${promotionData.summary.quizzes_taken}</div>
          <div class="kpi-label">Quizzes Passed</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${accuracy}%</div>
          <div class="kpi-label">Accuracy Rate</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${promotionData.summary.lessons_completed}</div>
          <div class="kpi-label">Lessons Completed</div>
        </div>
        <div class="kpi-card xp">
          <div class="kpi-value">★ ${promotionData.summary.total_xp}</div>
          <div class="kpi-label">Total XP Earned</div>
        </div>
      </div>

      <div class="table-wrap">
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
            <tr><td class="metric-name">Accuracy Rate</td><td class="metric-value">${accuracy}%</td></tr>
            <tr><td class="metric-name">Total Experience Points (XP)</td><td class="metric-value" style="color: #b8791a;">★ ${promotionData.summary.total_xp} XP</td></tr>
          </tbody>
        </table>
      </div>

      <div class="report-footer">
        <div class="date-container">
          <div class="date-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div class="date-label">DATE ISSUED</div>
            <div class="date-val">${promotionDateFormatted}</div>
          </div>
        </div>
        <div class="verification">
          Official Performance Summary — SEÑAS Filipino Sign Language Learning Platform<br/>
          Verification Record ID: SENAS-PR-${promotionData.id}
        </div>
      </div>
    </div>
  </div>
  </div>
</body>
</html>
            `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const fileName = getSanitizedFileName(recipientName, 'Report', isGraduation);
      const destinationUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: destinationUri });
      await Sharing.shareAsync(destinationUri, { mimeType: 'application/pdf', dialogTitle: 'Download Grade Report', UTI: 'com.adobe.pdf' });
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
                colors={isGraduation ? (['#854d0e', '#ca8a04', '#eab308'] as const) : (['#1e3a8a', '#1d4ed8', '#0f3172'] as const)}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <View style={styles.envelopeBackHighlight} />
            </View>

            {/* Envelope Top Flap - Triangle that connects to body */}
            <View style={[styles.envelopeTriangleFlap, isGraduation && { borderBottomColor: '#854d0e' }]} />
            <View style={[styles.envelopeTriangleFlapShade, isGraduation && { borderBottomColor: '#ca8a04' }]} />

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
                  <View style={[styles.canvaCertFrame, isGraduation && { backgroundColor: '#fffff6ff', borderColor: '#FEF08A' }]}>
                    <View style={[styles.canvaRibbonBanner, isGraduation && { backgroundColor: '#eab94fff', shadowColor: '#CA8A04' }]}>
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
                      <Text style={[styles.canvaTitle, isGraduation && { color: '#713f12' }]}>{isGraduation ? 'CERTIFICATE OF COMPLETION' : 'CERTIFICATE OF ACHIEVEMENT'}</Text>
                      <Text style={styles.canvaPresentedTo}>Presented to</Text>
                      <Text style={[styles.canvaRecipientName, isGraduation && { color: '#713f12' }]} numberOfLines={1}>{recipientName}</Text>
                      <View style={[styles.canvaNameLine, isGraduation && { backgroundColor: '#CA8A04' }]} />
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
                        <View style={[styles.canvaDateIconBox, isGraduation && { backgroundColor: '#FEF9C3', borderColor: '#FEF08A' }]}>
                          <Ionicons name="calendar-outline" size={14} color={isGraduation ? '#CA8A04' : '#2563EB'} />
                        </View>
                        <View>
                          <Text style={styles.canvaDateLabel}>DATE</Text>
                          <Text style={[styles.canvaDateValue, isGraduation && { color: '#713f12' }]}>{promotionDateFormatted}</Text>
                        </View>
                      </View>
                      <View style={styles.canvaSigsGroup}>
                        <View style={styles.canvaSigCol}>
                          <Text style={styles.canvaSigName}>{adviserName}</Text>
                          <View style={styles.canvaSigLine} />
                          <Text style={styles.canvaSigTitle}>Adviser</Text>
                        </View>
                        <View style={styles.canvaSigVertLine} />
                        <View style={styles.canvaSigCol}>
                          <Text style={styles.canvaSigName}> </Text>
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
                <Pressable style={[styles.paperDownloadBtn, isGraduation && { backgroundColor: '#CA8A04', shadowColor: '#CA8A04' }]} onPress={handleDownloadLetter}>
                  <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.paperDownloadBtnText}>Download Certificate</Text>
                </Pressable>
              )}
              {frontPaper === 'report' && (
                <Pressable style={[styles.paperDownloadBtn, isGraduation && { backgroundColor: '#CA8A04', shadowColor: '#CA8A04' }]} onPress={handleDownloadReportCard}>
                  <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.paperDownloadBtnText}>Download Report Card</Text>
                </Pressable>
              )}
            </View>

            {/* Envelope Front Pocket - Covers bottom of papers */}
            <View style={styles.envelopeFrontPocket} pointerEvents="none">
              <LinearGradient
                colors={isGraduation ? (['#eab308', '#ca8a04', '#854d0e'] as const) : (['#2563eb', '#1d4ed8', '#0f3172'] as const)}
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
                style={[styles.tabButton, frontPaper === 'certificate' && styles.tabButtonActive, isGraduation && frontPaper === 'certificate' && { borderColor: '#CA8A04', shadowColor: '#CA8A04' }]}
                onPress={() => bringToFront('certificate')}
              >
                <Ionicons name="ribbon-outline" size={16} color={frontPaper === 'certificate' ? (isGraduation ? '#CA8A04' : '#2563EB') : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.tabButtonText, frontPaper === 'certificate' && styles.tabButtonTextActive, isGraduation && frontPaper === 'certificate' && { color: '#CA8A04' }]}>Certificate</Text>
              </Pressable>
              <Pressable
                style={[styles.tabButton, frontPaper === 'report' && styles.tabButtonActive, isGraduation && frontPaper === 'report' && { borderColor: '#CA8A04', shadowColor: '#CA8A04' }]}
                onPress={() => bringToFront('report')}
              >
                <Ionicons name="stats-chart-outline" size={16} color={frontPaper === 'report' ? (isGraduation ? '#CA8A04' : '#2563EB') : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.tabButtonText, frontPaper === 'report' && styles.tabButtonTextActive, isGraduation && frontPaper === 'report' && { color: '#CA8A04' }]}>Grade Report</Text>
              </Pressable>
            </View>

            {/* Continue Button - Raised higher, envelope shorter */}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <LinearGradient colors={isGraduation ? (['#ca8a04', '#eab308'] as const) : (['#2563eb', '#1d4ed8'] as const)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.closeButtonGradient} />
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
  canvaNameLine: {
    width: '75%',
    height: 1.5,
    backgroundColor: '#0F3172',
    marginVertical: 3,
    borderRadius: 1,
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
  canvaSigName: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#0F3172',
    fontStyle: 'italic',
    marginBottom: 1,
    minHeight: 9,
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
    bottom: 50,
    right: 4,
    width: 84,
    height: 98,
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