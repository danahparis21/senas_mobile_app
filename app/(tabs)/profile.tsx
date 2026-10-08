import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Pressable, Switch, Modal, Alert, TextInput, ActivityIndicator,
  Dimensions, Animated, Easing, Platform
} from 'react-native';

import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect, Line, Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import PromotionModal from '../../components/PromotionModal';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSettings } from '../../contexts/SettingsContext';
import Constants from 'expo-constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// How many documents to render at once. Prevents a long document history
// from rendering (and re-rendering) hundreds of rows in one go.
const DOCS_PAGE_SIZE = 5;

const getBaseUrl = () => {
  const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api';
  return apiUrl.replace('/api', '');
};

// ── SUNNY SKY PALETTE ────────────────────────────────────────────────
const GRADIENT = {
  start: '#c1eaffff',
  mid: '#BFE7FB',
  mid2: '#E6F4FE',
  end: '#F8FCFF',
};

// ── SVG Icons ──────────────────────────────────────────────────────────
function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#4b7bbb" strokeWidth="2" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#4b7bbb" strokeWidth="2" />
    </Svg>
  );
}
function SoundIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#4b7bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="#4b7bbb" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
function HelpIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke="#4b7bbb" strokeWidth="2" />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#4b7bbb" strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="17" x2="12.01" y2="17" stroke="#4b7bbb" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}
function InfoIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke="#4b7bbb" strokeWidth="2" />
      <Line x1="12" y1="8" x2="12" y2="8" stroke="#4b7bbb" strokeWidth="3" strokeLinecap="round" />
      <Line x1="12" y1="12" x2="12" y2="16" stroke="#4b7bbb" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
function RateIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7z"
        stroke="#4b7bbb" strokeWidth="1.8" strokeLinejoin="round"
      />
    </Svg>
  );
}
function CertificateIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="6" stroke="#2563EB" strokeWidth="2" />
      <Path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.5 8l1.7 1.7L14.5 6" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ChevronIcon() {
  return (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function SignOutIcon() {
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="16 17 21 12 16 7" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="21" y1="12" x2="9" y2="12" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// Same sparkle/star shape used for "Today's Goal" on the dashboard.
function SparkleIcon({ size = 22, color = '#F59E0B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2 L14.3 9.7 L22 12 L14.3 14.3 L12 22 L9.7 14.3 L2 12 L9.7 9.7 Z"
        fill={color}
      />
    </Svg>
  );
}

function TeacherIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2L2 7l10 5 10-5-10-5z" />
      <Path d="M2 17l10 5 10-5" />
      <Path d="M2 12l10 5 10-5" />
    </Svg>
  );
}

// ── Animated Cloud Component ──────────────────────────────────────────
function AnimatedCloud({ scale = 1, opacity = 0.5 }) {
  return (
    <Svg width={120 * scale} height={60 * scale} viewBox="0 0 120 60" opacity={opacity}>
      <Defs>
        <LinearGradient id="cloudGradProfile" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.5" />
        </LinearGradient>
      </Defs>
      <Path
        d="M20 40 C10 40 5 30 12 22 C8 12 20 5 30 10 C38 2 52 2 60 8 C68 3 80 5 85 14 C95 12 105 18 100 28 C110 35 108 48 95 50 L25 50 C18 50 14 45 20 40Z"
        fill="url(#cloudGradProfile)"
      />
    </Svg>
  );
}

// ── Helper Functions ──────────────────────────────────────────────────
function formatLearningGoal(goal: string) {
  if (!goal) return 'Not set';
  return goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatPracticeTime(time: string) {
  if (!time) return 'Not set';
  return time.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatPromotionLabel(fromLevel: string, toLevel: string) {
  return `${fromLevel} Level Promoted to ${toLevel}`;
}

function formatDocDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Sign Out Modal ──────────────────────────────────────────────────────
function SignOutModal({ visible, onClose, onConfirm }: {
  visible: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.signOutModal} onPress={e => e.stopPropagation()}>
          <View style={styles.signOutIconBox}>
            <SignOutIcon />
          </View>
          <Text style={styles.signOutTitle}>Sign Out?</Text>
          <Text style={styles.signOutDesc}>
            You'll need to sign in again to continue your learning streak.
          </Text>
          <View style={styles.signOutBtns}>
            <Pressable style={styles.stayBtn} onPress={onClose}>
              <Text style={styles.stayBtnText}>Stay</Text>
            </Pressable>
            <Pressable style={styles.confirmSignOutBtn} onPress={onConfirm}>
              <Text style={styles.confirmSignOutText}>Sign Out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Edit Profile Modal ──────────────────────────────────────────────────
function EditProfileModal({
  visible,
  onClose,
  userName,
  currentAvatar,
  onAvatarChange
}: {
  visible: boolean;
  onClose: () => void;
  userName: string;
  onSave?: (name: string) => void;
  currentAvatar: string;
  onAvatarChange: (avatar: string) => void;
}) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);

  useEffect(() => {
    if (visible) {
      setSelectedAvatar(currentAvatar);
    }
  }, [visible, currentAvatar]);

  // Available characters
  const characters = [
    { id: 'senya', label: 'Senya', image: require('../../assets/images/img/senya_blue.png') },
    { id: 'boy', label: 'Boy', image: require('../../assets/characters/boy.png') },
    { id: 'girl', label: 'Girl', image: require('../../assets/characters/girl.png') },
    { id: 'catto', label: 'Catto', image: require('../../assets/characters/catto.png') },
  ];

  const handleSave = async () => {
    try {
      await api.updateProfilePicture(selectedAvatar);
      onAvatarChange(selectedAvatar);
      onClose();
      Alert.alert('✅ Success', 'Profile character updated successfully!');
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to update character. Please try again.');
      console.error(error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.editModal} onPress={e => e.stopPropagation()}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Choose Character</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Avatar Selection */}
          <View style={styles.avatarEditCenter}>
            <View style={styles.avatarEditRing}>
              <Image
                source={characters.find(c => c.id === selectedAvatar)?.image || characters[0].image}
                style={styles.avatarEditImg}
                contentFit="cover"
              />
            </View>
            <Text style={styles.avatarEditLabel}>Select your companion avatar</Text>
          </View>

          {/* Character Grid - 4 responsive options */}
          <View style={styles.characterGrid}>
            {characters.map((char) => (
              <Pressable
                key={char.id}
                style={[
                  styles.characterOption,
                  selectedAvatar === char.id && styles.characterOptionSelected,
                ]}
                onPress={() => setSelectedAvatar(char.id)}
              >
                <Image
                  source={char.image}
                  style={styles.characterImage}
                  contentFit="contain"
                />
                <Text
                  style={[
                    styles.characterLabel,
                    selectedAvatar === char.id && styles.characterLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {char.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Display Name (Read-only actual name) */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Student Name</Text>
            <View style={styles.readOnlyNameBox}>
              <Ionicons name="person-circle-outline" size={22} color="#2563EB" />
              <Text style={styles.readOnlyNameText}>{userName || 'Student'}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.editModalBtns}>
            <Pressable style={styles.cancelEditBtn} onPress={onClose}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Help & Support Modal ──────────────────────────────────────────────
function HelpSupportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = () => {
    if (!message.trim()) {
      Alert.alert('Please enter a message');
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      Alert.alert('✅ Message Sent!', 'We\'ll get back to you within 24 hours.');
      setMessage('');
      onClose();
    }, 1500);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.helpModal} onPress={e => e.stopPropagation()}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Help & Support</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.helpSubtitle}>
            Having trouble? Send us a message and we'll help you out.
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Your Message</Text>
            <TextInput
              style={[styles.fieldInput, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue or question..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── About SEÑAS Modal ──────────────────────────────────────────────────
function AboutModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.aboutModal} onPress={e => e.stopPropagation()}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>About SEÑAS</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <Image
            source={require('../../assets/images/img/senya_blue.png')}
            style={styles.aboutLogo}
            contentFit="contain"
          />

          <Text style={styles.aboutTitle}>SEÑAS</Text>
          <Text style={styles.aboutSubtitle}>Filipino Sign Language Learning App</Text>

          <View style={styles.aboutDivider} />

          <Text style={styles.aboutText}>
            SEÑAS is a mobile application designed to help students learn Filipino Sign Language (FSL) through interactive lessons, gesture recognition, and gamified learning experiences.
          </Text>

          <View style={styles.aboutDivider} />

          <Text style={styles.aboutVersion}>Version 2.0.0</Text>
          <Text style={styles.aboutCopyright}>© 2026 SEÑAS. All rights reserved.</Text>
          <Text style={styles.aboutDevelopers}>
            Developed by Team SEÑAS
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── School Year Item Interface ──────────────────────────────────────────
interface SchoolYearItem {
  school_year_id: number | null;
  school_year_name: string;
  program_type?: string;
  grade_level?: string;
  section?: string;
  is_active: boolean;
  is_enrolled: boolean;
  enrolled_at?: string;
}

// ── School Year Picker Modal ────────────────────────────────────────────
function SchoolYearPickerModal({
  visible,
  onClose,
  schoolYears,
  selectedYear,
  onSelectYear,
  activeYear,
}: {
  visible: boolean;
  onClose: () => void;
  schoolYears: SchoolYearItem[];
  selectedYear: string;
  onSelectYear: (yearName: string) => void;
  activeYear: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.syModal} onPress={e => e.stopPropagation()}>
          <View style={styles.editModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22 }}>🎓</Text>
              <Text style={styles.editModalTitle}>Select School Year</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.syModalSubtitle}>
            Filter and review your enrolled progress, grades, badges, and certificates for each school year.
          </Text>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {schoolYears.map((sy, idx) => {
              const isSelected = (sy.school_year_name === selectedYear) || (!selectedYear && sy.is_active);
              const isCurrentActive = (sy.school_year_name === activeYear) || sy.is_active;

              return (
                <Pressable
                  key={sy.school_year_name || idx}
                  style={[
                    styles.syOptionCard,
                    isSelected && styles.syOptionCardSelected,
                  ]}
                  onPress={() => {
                    onSelectYear(sy.school_year_name);
                    onClose();
                  }}
                >
                  <View style={styles.syOptionLeft}>
                    <View style={[styles.syRadioCircle, isSelected && styles.syRadioCircleActive]}>
                      {isSelected && <View style={styles.syRadioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.syOptionTitle, isSelected && styles.syOptionTitleSelected]}>
                          S.Y. {sy.school_year_name}
                        </Text>
                        {isCurrentActive && (
                          <View style={styles.syActiveBadge}>
                            <Text style={styles.syActiveBadgeText}>Active S.Y.</Text>
                          </View>
                        )}
                        {sy.is_enrolled && (
                          <View style={styles.syEnrolledBadge}>
                            <Text style={styles.syEnrolledBadgeText}>Enrolled</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.syOptionSub}>
                        {[sy.program_type, sy.grade_level ? `${sy.grade_level}${sy.section ? ` - ${sy.section}` : ''}` : '']
                          .filter(Boolean)
                          .join(' • ') || 'Enrolled Academic Year'}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Text style={{ fontSize: 18, color: '#2563EB', fontWeight: 'bold' }}>✓</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={styles.syModalDoneBtn} onPress={onClose}>
            <Text style={styles.syModalDoneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── AndroidAcademicCard (Android-only collapsible card) ─────────────────
interface AndroidAcademicCardProps {
  selectedSchoolYear: string | null;
  activeSchoolYear: string | null;
  isEnrolledInActiveYear: boolean;
  studentAcademicInfo: {
    program_type?: string;
    grade_level?: string;
    section?: string;
    lrn?: string;
  };
  onPickSY: () => void;
  onReturnToActive: () => void;
}

function AndroidAcademicCard({
  selectedSchoolYear,
  activeSchoolYear,
  isEnrolledInActiveYear,
  studentAcademicInfo,
  onPickSY,
  onReturnToActive,
}: AndroidAcademicCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;
  const animRotate = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = expanded ? 0 : 1;
    Animated.parallel([
      Animated.spring(animHeight, { toValue, useNativeDriver: false, bounciness: 0, speed: 18 }),
      Animated.timing(animRotate, { toValue, useNativeDriver: true, duration: 220, easing: Easing.out(Easing.quad) }),
    ]).start();
    setExpanded(v => !v);
  };

  const isArchived = selectedSchoolYear && activeSchoolYear && selectedSchoolYear !== activeSchoolYear;

  // Status config
  const statusConfig = isArchived
    ? { bg: '#FEF3C7', border: '#F59E0B', dotColor: '#D97706', textColor: '#92400E', label: 'Archived S.Y.' }
    : isEnrolledInActiveYear
      ? { bg: '#ECFDF5', border: '#10B981', dotColor: '#10B981', textColor: '#065F46', label: 'Enrolled · Active S.Y.' }
      : { bg: '#FEF2F2', border: '#EF4444', dotColor: '#EF4444', textColor: '#991B1B', label: 'Not Enrolled (Last Records)' };

  const chevronRotation = animRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  // Expanded content height estimate (enough for all fields + return btn)
  const contentMaxHeight = animHeight.interpolate({ inputRange: [0, 1], outputRange: [0, isArchived ? 260 : 210] });

  return (
    <View style={styles.syAndroidCard}>
      {/* ── Collapsed Header Row ── */}
      <View style={styles.syAndroidCardHeader}>
        {/* Left: icon + title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={[styles.syIconBox, { backgroundColor: '#EFF6FF' }]}>
            <Text style={{ fontSize: 16 }}>🎓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.syCardLabel}>ACADEMIC RECORD</Text>
            <Text style={[styles.syCardTitle, { fontSize: 13 }]}>
              {selectedSchoolYear ? `S.Y. ${selectedSchoolYear}` : activeSchoolYear ? `S.Y. ${activeSchoolYear}` : 'School Year'}
            </Text>
          </View>
        </View>

        {/* Right: status dot + SY picker + expand toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Status indicator dot */}
          <View style={[styles.syStatusDot, { backgroundColor: statusConfig.dotColor, width: 9, height: 9 }]} />

          {/* SY picker button */}
          <Pressable style={styles.syPickerBtn} onPress={onPickSY}>
            <Ionicons name="calendar-outline" size={13} color="#2563EB" />
            <Text style={[styles.syPickerBtnText, { fontSize: 12 }]}>Filter</Text>
          </Pressable>

          {/* Expand toggle */}
          <Pressable
            onPress={toggle}
            style={{ padding: 4, backgroundColor: '#F3F4F6', borderRadius: 20 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
              <Ionicons name="chevron-down" size={18} color="#6B7280" />
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* ── Expandable Content ── */}
      <Animated.View style={[{ overflow: 'hidden' }, { maxHeight: contentMaxHeight }]}>
        <View style={styles.syAndroidExpandedContent}>
          {/* Status Pill */}
          <View style={[styles.syStatusPill, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, marginBottom: 12 }]}>
            <View style={[styles.syStatusDot, { backgroundColor: statusConfig.dotColor }]} />
            <Text style={[styles.syStatusPillText, { color: statusConfig.textColor }]}>{statusConfig.label}</Text>
          </View>

          {/* Academic Info Grid */}
          <View style={[styles.syAcademicGrid, { backgroundColor: '#F9FAFB' }]}>
            <View style={styles.syAcademicCol}>
              <Text style={styles.syAcademicLabel}>Program</Text>
              <Text style={styles.syAcademicVal} numberOfLines={1}>
                {studentAcademicInfo.program_type || 'Non-Graded'}
              </Text>
            </View>
            <View style={styles.syAcademicDividerVertical} />
            <View style={styles.syAcademicCol}>
              <Text style={styles.syAcademicLabel}>Grade & Section</Text>
              <Text style={styles.syAcademicVal} numberOfLines={1}>
                {[studentAcademicInfo.grade_level, studentAcademicInfo.section].filter(Boolean).join(' - ') || 'Grade 1'}
              </Text>
            </View>
            <View style={styles.syAcademicDividerVertical} />
            <View style={styles.syAcademicCol}>
              <Text style={styles.syAcademicLabel}>LRN</Text>
              <Text style={styles.syAcademicVal} numberOfLines={1}>
                {studentAcademicInfo.lrn || '—'}
              </Text>
            </View>
          </View>

          {/* Return to Active SY button */}
          {isArchived && (
            <Pressable style={[styles.syReturnBtn, { marginTop: 10 }]} onPress={onReturnToActive}>
              <Ionicons name="arrow-undo-outline" size={14} color="#2563EB" />
              <Text style={styles.syReturnBtnText}>Return to Active S.Y. ({activeSchoolYear})</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// ── Main Profile Screen ─────────────────────────────────────────────────
export default function Profile() {
  const router = useRouter();
  const { settings, updateSetting, refreshSettings } = useSettings();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Student');
  const [studentLevel, setStudentLevel] = useState('Beginner');
  const [learningGoal, setLearningGoal] = useState('Not set');
  const [practiceTime, setPracticeTime] = useState('Not set');
  const [memberSince, setMemberSince] = useState('2026');
  const [totalXp, setTotalXp] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [totalBadges, setTotalBadges] = useState(0);
  const [recentBadges, setRecentBadges] = useState<{ src: any, label: string }[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [visibleDocsCount, setVisibleDocsCount] = useState(DOCS_PAGE_SIZE);
  const [selectedPromotion, setSelectedPromotion] = useState<any | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // ── School Year & Academic states ──
  const [enrolledSchoolYears, setEnrolledSchoolYears] = useState<SchoolYearItem[]>([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
  const [activeSchoolYear, setActiveSchoolYear] = useState<string>('');
  const [isEnrolledInActiveYear, setIsEnrolledInActiveYear] = useState(true);
  const [isEnrolledInSelectedYear, setIsEnrolledInSelectedYear] = useState(true);
  const [showSchoolYearModal, setShowSchoolYearModal] = useState(false);
  const [studentAcademicInfo, setStudentAcademicInfo] = useState<{
    program_type?: string;
    grade_level?: string;
    section?: string;
    lrn?: string;
  }>({});

  // ── Teacher Info ──
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [teacherPhoto, setTeacherPhoto] = useState<string | null>(null);
  const [loadingTeacher, setLoadingTeacher] = useState(false);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const [selectedAvatar, setSelectedAvatar] = useState('senya');

  // Cloud animations
  const cloud1Anim = useRef(new Animated.Value(-200)).current;
  const cloud2Anim = useRef(new Animated.Value(screenWidth + 200)).current;
  const cloud3Anim = useRef(new Animated.Value(-250)).current;

  // Sun glow animation
  const sunAnim = useRef(new Animated.Value(0)).current;

  // ── Cloud Animations ──────────────────────────────────────────────────
  useEffect(() => {
    const startCloud1 = () => {
      cloud1Anim.setValue(-200);
      Animated.timing(cloud1Anim, {
        toValue: screenWidth + 200,
        duration: 45000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => startCloud1());
    };

    const startCloud2 = () => {
      cloud2Anim.setValue(screenWidth + 200);
      Animated.timing(cloud2Anim, {
        toValue: -200,
        duration: 55000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => startCloud2());
    };

    const startCloud3 = () => {
      cloud3Anim.setValue(-250);
      Animated.timing(cloud3Anim, {
        toValue: screenWidth + 250,
        duration: 50000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => startCloud3());
    };

    startCloud1();
    startCloud2();
    startCloud3();
  }, []);

  // ── Sun Glow Animation ───────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sunAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(sunAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const sunGlow = sunAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  // ── Settings Items ──
  const settingsItems = [
    {
      label: 'Sound Effects',
      sub: 'Play sounds during lessons',
      val: settings.soundEnabled,
      set: async (value: boolean) => {
        try {
          await updateSetting('soundEnabled', value);
        } catch (error) {
          console.error('Error updating sound setting:', error);
        }
      },
      Icon: SoundIcon
    },
  ];

  // ── Account Items ──
  const accountItems = [
    { label: 'Help & Support', Icon: HelpIcon, route: '/help' },
    { label: 'Rate Us', Icon: RateIcon, route: '/rate-us' },
    { label: 'About SEÑAS', Icon: InfoIcon, route: '/about' },
  ];

  // ── Fetch Teacher Info ──
  const fetchTeacherInfo = async (teacherId: number) => {
    if (!teacherId) return;

    try {
      setLoadingTeacher(true);
      const response = await api.getTeacher(teacherId);
      if (response.success && response.teacher) {
        const teacher = response.teacher;
        const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
        setTeacherName(fullName || 'Unknown Teacher');

        // ✅ Set teacher photo
        if (teacher.profile_photo) {
          const baseUrl = getBaseUrl();
          setTeacherPhoto(`${baseUrl}/storage/${teacher.profile_photo}`);
        }
      }
    } catch (error) {
      console.error('Error fetching teacher info:', error);
      // Fallback: try to get from student data if available
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          const student = user.student;
          if (student?.teacher) {
            const teacher = student.teacher;
            const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
            setTeacherName(fullName || 'Unknown Teacher');
            if (teacher.profile_photo) {
              const baseUrl = getBaseUrl();
              setTeacherPhoto(`${baseUrl}/storage/${teacher.profile_photo}`);
            }
          }
        }
      } catch (fallbackError) {
        console.error('Fallback teacher fetch failed:', fallbackError);
      }
    } finally {
      setLoadingTeacher(false);
    }
  };

  const fetchProfileData = async (targetSyName?: string) => {
    try {
      setLoading(true);

      const syToFetch = targetSyName !== undefined ? targetSyName : selectedSchoolYear;

      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const student = user.student;
        const fullName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim();
        setUserName(fullName || 'Student');
        setStudentLevel(student?.fsl_mastery_level || 'Beginner');
        const avatar = student?.profile_picture || 'senya';
        setSelectedAvatar(avatar);

        // ── Fetch teacher info if teacher_id exists ──
        if (student?.teacher_id) {
          await fetchTeacherInfo(student.teacher_id);
        }
      }

      // ── 1. Fetch Profile endpoint with school year ──
      let syInfoFromApi: any = null;
      try {
        const profileRes = await api.getProfile(syToFetch || null);
        if (profileRes && profileRes.student) {
          const st = profileRes.student;
          if (st.first_name || st.last_name) {
            setUserName(`${st.first_name || ''} ${st.last_name || ''}`.trim());
          }
          if (st.fsl_mastery_level) setStudentLevel(st.fsl_mastery_level);
          if (st.total_xp !== undefined) setTotalXp(st.total_xp);
          if (st.streak_days !== undefined) setStreakDays(st.streak_days);

          setStudentAcademicInfo({
            program_type: st.program_type,
            grade_level: st.grade_level,
            section: st.section,
            lrn: st.lrn,
          });
        }
        if (profileRes && profileRes.school_year_info) {
          syInfoFromApi = profileRes.school_year_info;
          if (syInfoFromApi.enrolled_school_years) {
            setEnrolledSchoolYears(syInfoFromApi.enrolled_school_years);
          }
          if (syInfoFromApi.active_school_year) {
            setActiveSchoolYear(syInfoFromApi.active_school_year);
          }
          if (syInfoFromApi.selected_school_year) {
            setSelectedSchoolYear(syInfoFromApi.selected_school_year);
          }
          if (syInfoFromApi.is_enrolled_in_active_year !== undefined) {
            setIsEnrolledInActiveYear(syInfoFromApi.is_enrolled_in_active_year);
          }
          if (syInfoFromApi.is_enrolled_in_selected_year !== undefined) {
            setIsEnrolledInSelectedYear(syInfoFromApi.is_enrolled_in_selected_year);
          }
        }
      } catch (err) {
        console.log('Profile endpoint fetch error:', err);
      }

      // ── 2. Fetch Lessons for school year ──
      const response = await api.getStudentLessons(syToFetch || null);
      if (response.success) {
        const student = response.student;
        if (student?.total_xp !== undefined && !syToFetch) {
          setTotalXp(student.total_xp);
        }
        if (student?.streak_days !== undefined) {
          setStreakDays(student.streak_days);
        }

        if (student?.fsl_mastery_level) {
          setStudentLevel(student.fsl_mastery_level);
        }

        if (student?.profile_picture) {
          setSelectedAvatar(student.profile_picture);
        }

        if (response.school_year_info && !syInfoFromApi) {
          const syInfo = response.school_year_info;
          if (syInfo.enrolled_school_years) {
            setEnrolledSchoolYears(syInfo.enrolled_school_years);
          }
          if (syInfo.active_school_year) {
            setActiveSchoolYear(syInfo.active_school_year);
          }
          if (syInfo.current_school_year && !selectedSchoolYear) {
            setSelectedSchoolYear(syInfo.current_school_year);
          }
        }

        // ── Also check if teacher data comes from API response ──
        if (student?.teacher_id && !teacherName) {
          await fetchTeacherInfo(student.teacher_id);
        }

        let completedCount = 0;
        if (response.modules && Array.isArray(response.modules)) {
          response.modules.forEach((module: any) => {
            if (module.lessons && Array.isArray(module.lessons)) {
              const completed = module.lessons.filter((l: any) => l.status === 'completed' || l.status === 'passed');
              completedCount += completed.length;
            }
          });
        }
        setTotalLessons(completedCount);

        if (response.lessons && Array.isArray(response.lessons) && completedCount === 0) {
          const completed = response.lessons.filter((l: any) => l.status === 'completed');
          setTotalLessons(completed.length);
        }

        // Fetch actual achievements from the backend and count unlocked ones
        try {
          const achievementsResponse = await api.getAchievements();
          if (achievementsResponse.success && achievementsResponse.achievements) {
            const allAchievements = achievementsResponse.achievements;
            const unlockedAchievements = allAchievements.filter((a: any) => a.is_unlocked);
            setTotalBadges(unlockedAchievements.length);

            // Build recent badges from actually unlocked achievements
            const ACHIEVEMENT_IMAGES: Record<string, any> = {
              'xp_50': require('../../assets/images/img/first_step.png'),
              'xp_100': require('../../assets/images/img/alphabet_star.png'),
              'xp_250': require('../../assets/images/img/streak1.png'),
              'xp_500': require('../../assets/images/img/greetings.png'),
              'xp_1000': require('../../assets/images/img/numbers.png'),
              'beginner_welcome': require('../../assets/images/img/first_step.png'),
              'alphabet_master': require('../../assets/images/img/alphabet_star.png'),
              'streak_3': require('../../assets/images/img/streak1.png'),
              'streak_7': require('../../assets/images/img/greetings.png'),
              'numbers_master': require('../../assets/images/img/numbers.png'),
              'greetings_master': require('../../assets/images/img/greetings.png'),
            };
            const DEFAULT_BADGE = require('../../assets/images/img/badges.png');
            const LOCKED_BADGE = require('../../assets/images/img/locked.png');

            // Take up to 4 unlocked achievements for the recent badges row
            const earnedBadgeList: { src: any; label: string }[] = unlockedAchievements
              .slice(0, 4)
              .map((a: any) => ({
                label: a.name,
                src: ACHIEVEMENT_IMAGES[a.code] || DEFAULT_BADGE,
              }));

            // Pad with locked placeholders from the remaining achievements
            const lockedAchievements = allAchievements.filter((a: any) => !a.is_unlocked);
            let padIndex = 0;
            while (earnedBadgeList.length < 4 && padIndex < lockedAchievements.length) {
              earnedBadgeList.push({ label: lockedAchievements[padIndex].name, src: LOCKED_BADGE });
              padIndex++;
            }
            setRecentBadges(earnedBadgeList);
          }
        } catch (achievementError) {
          console.log('Could not fetch achievements for badge count:', achievementError);
        }
      }

      // ── 3. Fetch promotion documents for target school year ──
      try {
        const promoResponse = await api.getPromotionHistory(syToFetch || null);
        const promotions = promoResponse?.history || [];
        setDocuments(promotions);
        setVisibleDocsCount(DOCS_PAGE_SIZE);
      } catch (error) {
        console.log('No promotion history found');
      }

      try {
        const pathResponse = await api.getLearningPath();
        if (pathResponse && pathResponse.learning_path) {
          const path = pathResponse.learning_path;
          setLearningGoal(formatLearningGoal(path.learning_goal));
          setPracticeTime(formatPracticeTime(path.practice_time));
        }
      } catch (error) {
        console.log('No learning path found');
      }

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = async (promotion: any) => {
    try {
      const response = await api.getPromotionDetails(promotion.id);
      const fullPromotion = response?.promotion || response;

      const promotionWithSummary = {
        ...fullPromotion,
        summary: fullPromotion.summary || {
          quizzes_taken: 0,
          quizzes_passed: 0,
          avg_quiz_score: 0,
          lessons_completed: 0,
          gestures_attempted: 0,
          total_xp: promotion.xp_at_promotion || 0,
          accuracy: 0
        },
        id: fullPromotion.id || promotion.id,
        from_level: fullPromotion.from_level || promotion.from_level,
        to_level: fullPromotion.to_level || promotion.to_level,
        promotion_date: fullPromotion.promotion_date || promotion.promoted_at || new Date().toISOString(),
        title: fullPromotion.title || `${promotion.from_level} to ${promotion.to_level}`,
        subtitle: fullPromotion.subtitle || 'Promotion Achievement',
        message: fullPromotion.message || 'Congratulations on your promotion!',
        badge_icon: fullPromotion.badge_icon || '🎓',
        was_forced: fullPromotion.was_forced || false,
      };

      setSelectedPromotion(promotionWithSummary);
      setShowPromotionModal(true);
    } catch (error) {
      console.error('Error fetching promotion details:', error);
      const promotionWithSummary = {
        ...promotion,
        summary: {
          quizzes_taken: 0,
          quizzes_passed: 0,
          avg_quiz_score: 0,
          lessons_completed: 0,
          gestures_attempted: 0,
          total_xp: promotion.xp_at_promotion || 0,
          accuracy: 0
        },
        title: `${promotion.from_level} to ${promotion.to_level}`,
        subtitle: 'Promotion Achievement',
        message: 'Congratulations on your promotion!',
        badge_icon: '🎓',
        promotion_date: promotion.promoted_at || new Date().toISOString()
      };
      setSelectedPromotion(promotionWithSummary);
      setShowPromotionModal(true);
    }
  };

  // ── Fetch profile data ──
  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
      refreshSettings();
    }, [])
  );

  // Stats data. Total XP uses an SVG IconComponent (matching the
  // dashboard's Today's Goal sparkle) instead of an image icon.
  const stats = [
    { label: 'Lessons Done', value: totalLessons.toString(), icon: require('../../assets/images/img/lesson.png'), color: '#3B82F6' },
    { label: 'Total XP', value: totalXp.toString(), IconComponent: SparkleIcon, color: '#F59E0B' },
    { label: 'Day Streak', value: streakDays.toString(), icon: require('../../assets/images/img/streak.png'), color: '#EF4444' },
    { label: 'Badges', value: totalBadges.toString(), icon: require('../../assets/images/img/badges.png'), color: '#8B5CF6' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#1E4F8A" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Modals */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        userName={userName}
        onSave={setUserName}
        currentAvatar={selectedAvatar}
        onAvatarChange={setSelectedAvatar}
      />

      <SignOutModal
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={() => { setShowSignOutModal(false); router.replace('/'); }}
      />
      <HelpSupportModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
      <AboutModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
      <SchoolYearPickerModal
        visible={showSchoolYearModal}
        onClose={() => setShowSchoolYearModal(false)}
        schoolYears={enrolledSchoolYears}
        selectedYear={selectedSchoolYear}
        activeYear={activeSchoolYear}
        onSelectYear={(yearName) => {
          setSelectedSchoolYear(yearName);
          fetchProfileData(yearName);
        }}
      />
      {selectedPromotion && (
        <PromotionModal
          visible={showPromotionModal}
          promotionData={selectedPromotion}
          onClose={() => setShowPromotionModal(false)}
          studentName={userName}
          teacherName={teacherName || 'Emma Ruth'}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── HEADER WITH SUNNY SKY BACKGROUND ── */}
        <View style={styles.header}>
          {/* Gradient Background */}
          <View style={StyleSheet.absoluteFillObject}>
            <Svg width={screenWidth} height={260}>
              <Defs>
                <LinearGradient id="headerBgGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={GRADIENT.start} stopOpacity="1" />
                  <Stop offset="40%" stopColor={GRADIENT.mid} stopOpacity="0.95" />
                  <Stop offset="70%" stopColor={GRADIENT.mid2} stopOpacity="0.9" />
                  <Stop offset="100%" stopColor={GRADIENT.end} stopOpacity="0.85" />
                </LinearGradient>
              </Defs>
              <Rect width={screenWidth} height={260} fill="url(#headerBgGrad)" />
            </Svg>
          </View>

          {/* Sun with animated glow */}
          <Animated.View style={[styles.sunContainer, { opacity: sunGlow }]}>
            <Svg width="80" height="80" viewBox="0 0 120 120">
              <Circle cx="60" cy="60" r="45" fill="#FCD34D" opacity="0.9" />
              <Circle cx="60" cy="60" r="55" fill="#FCD34D" opacity="0.3" />
              <Circle cx="60" cy="60" r="70" fill="#FCD34D" opacity="0.1" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <Rect
                  key={i}
                  x="54"
                  y="5"
                  width="12"
                  height="20"
                  rx="6"
                  fill="#FCD34D"
                  opacity="0.6"
                  transform={`rotate(${angle}, 60, 60)`}
                />
              ))}
            </Svg>
          </Animated.View>

          {/* Floating Clouds */}
          <View style={styles.floatingSky} pointerEvents="none">
            <Animated.View style={[styles.cloudWrapper, { top: 20, transform: [{ translateX: cloud1Anim }] }]}>
              <AnimatedCloud scale={1.2} opacity={0.4} />
            </Animated.View>
            <Animated.View style={[styles.cloudWrapper, { top: 80, transform: [{ translateX: cloud2Anim }] }]}>
              <AnimatedCloud scale={0.9} opacity={0.3} />
            </Animated.View>
            <Animated.View style={[styles.cloudWrapper, { top: 160, transform: [{ translateX: cloud3Anim }] }]}>
              <AnimatedCloud scale={1.4} opacity={0.35} />
            </Animated.View>
          </View>

          {/* Header Content */}
          <View style={styles.headerContent}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarRing}>
                <Image
                  source={
                    selectedAvatar === 'senya' ? require('../../assets/images/img/senya_blue.png') :
                      selectedAvatar === 'boy' ? require('../../assets/characters/boy.png') :
                        selectedAvatar === 'girl' ? require('../../assets/characters/girl.png') :
                          require('../../assets/characters/catto.png')
                  }
                  style={styles.avatarImg}
                  contentFit="cover"
                />
              </View>
              <Pressable style={styles.editAvatarBtn} onPress={() => setShowEditModal(true)}>
                <Text style={styles.editAvatarIcon}>✎</Text>
              </Pressable>
            </View>
            <Text style={styles.headerName}>{userName}</Text>
            <Text style={styles.headerRole}>FSL {studentLevel} Learner</Text>

            <View style={styles.headerBadgeRow}>
              <View style={styles.headerBadge}>
                <Image source={require('../../assets/images/img/energy.png')} style={{ width: 12, height: 12 }} contentFit="contain" />
                <Text style={styles.headerBadgeTextYellow}>{studentLevel}</Text>
              </View>
              <View style={styles.headerBadgeTransp}>
                <Text style={styles.headerBadgeTextWhite}>Member since {memberSince}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Academic & School Year Card ── */}
        <View style={styles.section}>
          {Platform.OS === 'ios' ? (
            /* ── iOS: Glassmorphic card ── */
            <GlassCard style={styles.syCard}>
              <View style={styles.syCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={styles.syIconBox}>
                    <Text style={{ fontSize: 18 }}>🎓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.syCardLabel}>ACADEMIC RECORD</Text>
                    <Text style={styles.syCardTitle}>School Year Filter</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.syPickerBtn}
                  onPress={() => setShowSchoolYearModal(true)}
                >
                  <Text style={styles.syPickerBtnText}>
                    {selectedSchoolYear ? `S.Y. ${selectedSchoolYear}` : (activeSchoolYear ? `S.Y. ${activeSchoolYear}` : 'Select S.Y.')}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#2563EB" />
                </Pressable>
              </View>

              <View style={styles.syStatusRow}>
                {selectedSchoolYear && activeSchoolYear && selectedSchoolYear !== activeSchoolYear ? (
                  <View style={[styles.syStatusPill, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                    <View style={[styles.syStatusDot, { backgroundColor: '#D97706' }]} />
                    <Text style={[styles.syStatusPillText, { color: '#92400E' }]}>Archived S.Y. (Viewing Past Progress)</Text>
                  </View>
                ) : isEnrolledInActiveYear ? (
                  <View style={[styles.syStatusPill, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
                    <View style={[styles.syStatusDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.syStatusPillText, { color: '#065F46' }]}>Enrolled • Active School Year</Text>
                  </View>
                ) : (
                  <View style={[styles.syStatusPill, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
                    <View style={[styles.syStatusDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.syStatusPillText, { color: '#991B1B' }]}>Not Enrolled in Active S.Y. (Last Enrolled Records)</Text>
                  </View>
                )}
              </View>

              <View style={styles.syAcademicGrid}>
                <View style={styles.syAcademicCol}>
                  <Text style={styles.syAcademicLabel}>Program</Text>
                  <Text style={styles.syAcademicVal} numberOfLines={1}>{studentAcademicInfo.program_type || 'Non-Graded'}</Text>
                </View>
                <View style={styles.syAcademicDividerVertical} />
                <View style={styles.syAcademicCol}>
                  <Text style={styles.syAcademicLabel}>Grade & Section</Text>
                  <Text style={styles.syAcademicVal} numberOfLines={1}>
                    {[studentAcademicInfo.grade_level, studentAcademicInfo.section].filter(Boolean).join(' - ') || 'Grade 1'}
                  </Text>
                </View>
                <View style={styles.syAcademicDividerVertical} />
                <View style={styles.syAcademicCol}>
                  <Text style={styles.syAcademicLabel}>LRN</Text>
                  <Text style={styles.syAcademicVal} numberOfLines={1}>{studentAcademicInfo.lrn || '—'}</Text>
                </View>
              </View>

              {selectedSchoolYear && activeSchoolYear && selectedSchoolYear !== activeSchoolYear && (
                <Pressable
                  style={styles.syReturnBtn}
                  onPress={() => { setSelectedSchoolYear(activeSchoolYear); fetchProfileData(activeSchoolYear); }}
                >
                  <Ionicons name="arrow-undo-outline" size={14} color="#2563EB" />
                  <Text style={styles.syReturnBtnText}>Return to Active S.Y. ({activeSchoolYear})</Text>
                </Pressable>
              )}
            </GlassCard>
          ) : (
            /* ── Android: Plain white collapsible card ── */
            <AndroidAcademicCard
              selectedSchoolYear={selectedSchoolYear}
              activeSchoolYear={activeSchoolYear}
              isEnrolledInActiveYear={isEnrolledInActiveYear}
              studentAcademicInfo={studentAcademicInfo}
              onPickSY={() => setShowSchoolYearModal(true)}
              onReturnToActive={() => { setSelectedSchoolYear(activeSchoolYear); fetchProfileData(activeSchoolYear); }}
            />
          )}
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsSection}>
          <GlassCard style={styles.statsCard}>
            <View style={styles.statsGrid}>
              {stats.map((s, i) => (
                <View key={i} style={styles.statItem}>
                  <View style={[styles.statIconBox, { backgroundColor: s.color + '22' }]}>
                    {s.IconComponent ? (
                      <s.IconComponent size={22} color={s.color} />
                    ) : (
                      <Image source={s.icon} style={styles.statIcon} contentFit="contain" />
                    )}
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </View>

        {/* ── Teacher Info ── */}
        {teacherName && (
          <View style={styles.section}>
            <GlassCard style={styles.teacherCard}>
              <View style={styles.teacherRow}>
                <View style={styles.teacherAvatarWrapper}>
                  {teacherPhoto ? (
                    <Image
                      source={{ uri: teacherPhoto }}
                      style={styles.teacherAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.teacherAvatarPlaceholder}>
                      <TeacherIcon size={28} />
                    </View>
                  )}
                </View>
                <View style={styles.teacherInfo}>
                  <Text style={styles.teacherLabel}>Teacher</Text>
                  <Text style={styles.teacherName}>{teacherName}</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        )}

        {/* ── Learning Path ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Learning Path</Text>
            <Pressable
              style={styles.editPathBtn}
              onPress={() => router.push('/assessment?edit=true')}
            >
              <Text style={styles.editPathBtnText}>Edit</Text>
              <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                <Path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </Svg>
            </Pressable>
          </View>
          <GlassCard style={styles.learningPathCard}>
            <View style={styles.learningPathItem}>
              <View style={styles.learningPathIconBox}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
                  <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </Svg>
              </View>
              <View style={styles.learningPathInfo}>
                <Text style={styles.learningPathLabel}>Your Level</Text>
                <Text style={styles.learningPathValue}>{studentLevel}</Text>
              </View>
            </View>

            <View style={styles.learningPathDivider} />

            <View style={styles.learningPathItem}>
              <View style={[styles.learningPathIconBox, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                  <Path d="M12 6V2l4 4-4 4V8c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6h2c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8z" />
                </Svg>
              </View>
              <View style={styles.learningPathInfo}>
                <Text style={styles.learningPathLabel}>Learning Goal</Text>
                <Text style={styles.learningPathValue}>{learningGoal}</Text>
              </View>
            </View>

            <View style={styles.learningPathDivider} />

            <View style={styles.learningPathItem}>
              <View style={[styles.learningPathIconBox, { backgroundColor: 'rgba(251,191,36,0.12)' }]}>
                <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                  <Circle cx="12" cy="12" r="10" />
                  <Polyline points="12 6 12 12 16 14" />
                </Svg>
              </View>
              <View style={styles.learningPathInfo}>
                <Text style={styles.learningPathLabel}>Practice Time</Text>
                <Text style={styles.learningPathValue}>{practiceTime}</Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* ── Recent Badges ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Badges</Text>
          <GlassCard style={styles.badgesCard}>
            <View style={styles.badgesRow}>
              {recentBadges.map((b, i) => (
                <View key={i} style={styles.badgeItem}>
                  <Image source={b.src} style={[styles.badgeImg, b.label === 'Quiz Whiz' && { opacity: 0.5 }]} contentFit="contain" />
                  <Text style={[styles.badgeLabel, b.label === 'Quiz Whiz' && { color: '#9CA3AF' }]}>{b.label}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </View>

        {/* ── Documents ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <GlassCard style={styles.documentsCard}>
            {documents.length === 0 ? (
              <View style={styles.docsEmpty}>
                <CertificateIcon size={28} />
                <Text style={styles.docsEmptyText}>
                  No documents yet. Keep learning to earn your first certificate!
                </Text>
              </View>
            ) : (
              documents.slice(0, visibleDocsCount).map((doc, i, visibleDocs) => (
                <Pressable
                  key={doc.id ?? i}
                  style={[
                    styles.docRow,
                    (i < visibleDocs.length - 1 || visibleDocsCount < documents.length) && styles.settingBorder,
                  ]}
                  onPress={() => handleOpenDocument(doc)}
                >
                  <View style={styles.settingIconBox}>
                    <CertificateIcon size={20} />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={styles.settingLabel}>
                      {formatPromotionLabel(doc.from_level, doc.to_level)}
                    </Text>
                    <Text style={styles.settingSub}>
                      {formatDocDate(doc.promoted_at)}
                    </Text>
                  </View>
                  <ChevronIcon />
                </Pressable>
              ))
            )}
            {documents.length > DOCS_PAGE_SIZE && (
              <Pressable
                style={styles.docsPagingRow}
                onPress={() =>
                  setVisibleDocsCount(prev =>
                    prev < documents.length ? prev + DOCS_PAGE_SIZE : DOCS_PAGE_SIZE
                  )
                }
              >
                <Text style={styles.docsPagingText}>
                  {visibleDocsCount < documents.length
                    ? `Show more (${documents.length - visibleDocsCount} left)`
                    : 'Show less'}
                </Text>
              </Pressable>
            )}
          </GlassCard>
        </View>

        {/* ── Settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <GlassCard style={styles.settingsCard}>
            {settingsItems.map(({ label, sub, val, set, Icon }, i) => (
              <View key={i} style={[styles.settingRow, i < settingsItems.length - 1 && styles.settingBorder]}>
                <View style={styles.settingIconBox}>
                  <Icon size={20} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>{label}</Text>
                  <Text style={styles.settingSub}>{sub}</Text>
                </View>
                <Switch
                  value={val}
                  onValueChange={set}
                  trackColor={{ false: 'rgba(15,49,114,0.15)', true: '#2563EB' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </GlassCard>
        </View>

        {/* ── Account ── */}
        <View style={styles.section}>
          <GlassCard style={styles.settingsCard}>
            {accountItems.map(({ label, Icon, route }, i) => (
              <Pressable
                key={i}
                style={[styles.accountRow, i < accountItems.length - 1 && styles.settingBorder]}
                onPress={() => router.push(route as any)}
              >
                <View style={styles.settingIconBox}>
                  <Icon size={20} />
                </View>
                <Text style={styles.accountLabel}>{label}</Text>
                <ChevronIcon />
              </Pressable>
            ))}
          </GlassCard>
        </View>

        {/* ── Sign Out ── */}
        <View style={[styles.section, { marginTop: 4 }]}>
          <Pressable style={styles.signOutBtn} onPress={() => setShowSignOutModal(true)}>
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eaf5fd' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: '#666' },

  // Header
  header: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  sunContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  floatingSky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  cloudWrapper: {
    position: 'absolute',
    left: 0,
  },
  avatarWrapper: { position: 'relative', marginBottom: 10 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarImg: { width: '100%', height: '100%' },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FBBF24',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  editAvatarIcon: { color: '#1848c8', fontSize: 14, fontWeight: '700' },
  headerName: {
    color: '#0f3172',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerRole: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textShadowColor: 'rgba(255,255,255,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerBadgeRow: { flexDirection: 'row', gap: 8 },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  headerBadgeTextYellow: { color: '#0f3172', fontSize: 12, fontWeight: '700' },
  headerBadgeTransp: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  headerBadgeTextWhite: { color: '#0f3172', fontSize: 12, fontWeight: '600' },

  // Stats
  statsSection: { paddingHorizontal: 16, marginTop: -24 },
  statsCard: { padding: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 6 },
  statIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statIcon: { width: 22, height: 22 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0f3172' },
  statLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', textAlign: 'center' },

  // Teacher Card
  teacherCard: {
    padding: 16,
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255,255,255,0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        shadowColor: '#0f3172',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(215, 235, 252, 0.8)',
        borderWidth: 1,
        elevation: 3,
      },
    }),
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  teacherAvatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: 'rgba(37,99,235,0.10)',
    borderWidth: 2,
    borderColor: 'rgba(37,99,235,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherAvatar: {
    width: '100%',
    height: '100%',
  },
  teacherAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f3172',
    marginTop: 2,
  },
  teacherIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(37,99,235,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.15)',
  },


  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editPathBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37,99,235,0.10)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.20)',
  },
  editPathBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f3172', marginBottom: 12 },

  // Learning Path
  learningPathCard: { padding: 20 },
  learningPathItem: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  learningPathIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(37,99,235,0.10)', alignItems: 'center', justifyContent: 'center' },
  learningPathInfo: { flex: 1 },
  learningPathLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  learningPathValue: { fontSize: 15, fontWeight: '700', color: '#0f3172', marginTop: 2 },
  learningPathDivider: { height: 1, backgroundColor: 'rgba(15,49,114,0.08)', marginVertical: 12 },

  // Badges
  badgesCard: { padding: 20 },
  badgesRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  badgeItem: { alignItems: 'center', gap: 4 },
  badgeImg: { width: 48, height: 48 },
  badgeLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center' },

  // Documents
  documentsCard: { overflow: 'hidden', padding: 0 },
  docsPagingRow: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docsPagingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 },
  docsEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 10 },
  docsEmptyText: { fontSize: 13, color: '#6B7280', fontWeight: '500', textAlign: 'center', lineHeight: 19 },

  // Settings
  settingsCard: { overflow: 'hidden', padding: 0 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18 },
  settingBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(15,49,114,0.08)' },
  settingIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(15,49,114,0.08)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  settingSub: { fontSize: 11, color: '#6B7280', fontWeight: '500', marginTop: 2 },

  // Account
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
  accountLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1F2937' },

  // Sign out
  signOutBtn: {
    paddingVertical: 14, borderRadius: 60,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center',
  },
  signOutBtnText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },

  // Modal overlay
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },

  // Sign Out Modal
  signOutModal: {
    width: '88%', maxWidth: 340,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 28, padding: 28,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.18, shadowRadius: 48, elevation: 24,
  },
  signOutIconBox: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  signOutTitle: { fontSize: 20, fontWeight: '800', color: '#0f3172', marginBottom: 8 },
  signOutDesc: { fontSize: 13, color: '#6B7280', fontWeight: '500', lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  signOutBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  stayBtn: {
    flex: 1, paddingVertical: 13,
    backgroundColor: 'rgba(15,49,114,0.07)',
    borderWidth: 1, borderColor: 'rgba(15,49,114,0.10)',
    borderRadius: 40, alignItems: 'center',
  },
  stayBtnText: { fontSize: 14, fontWeight: '700', color: '#0f3172' },
  confirmSignOutBtn: {
    flex: 1.3, paddingVertical: 13,
    backgroundColor: '#DC2626', borderRadius: 40, alignItems: 'center',
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  confirmSignOutText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Edit Modal
  editModal: {
    width: '90%', maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 32, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 40, elevation: 24,
  },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  editModalTitle: { fontSize: 20, fontWeight: '800', color: '#0f3172' },
  closeBtn: { width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: '#6B7280' },
  avatarEditCenter: { alignItems: 'center', marginBottom: 24, gap: 12 },
  avatarEditRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden', backgroundColor: '#2563EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  avatarEditImg: { width: '100%', height: '100%' },
  changePicBtn: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
    borderRadius: 40, paddingVertical: 8, paddingHorizontal: 16,
  },
  changePicText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  fieldBlock: { marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  fieldInput: {
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 16, fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.8)', color: '#1F2937',
  },
  readOnlyNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.18)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(239, 246, 255, 0.7)',
  },
  readOnlyNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f3172',
  },
  fieldNote: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  editModalBtns: { flexDirection: 'row', gap: 12 },
  cancelEditBtn: {
    flex: 1, paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 40, alignItems: 'center',
  },
  cancelEditText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  saveBtn: {
    flex: 1.5, paddingVertical: 12,
    backgroundColor: '#2563EB', borderRadius: 40, alignItems: 'center',
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Help & Support Modal
  helpModal: {
    width: '90%', maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 32, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 40, elevation: 24,
  },
  helpSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 20,
    lineHeight: 20,
  },
  messageInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  sendBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 40,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
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

  // About Modal
  aboutModal: {
    width: '90%', maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 32, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 40, elevation: 24,
    alignItems: 'center',
  },
  aboutLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  aboutTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f3172',
    letterSpacing: 2,
  },
  aboutSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 16,
  },
  aboutDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(15,49,114,0.08)',
    marginVertical: 16,
  },
  aboutText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  aboutVersion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f3172',
  },
  aboutCopyright: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  aboutDevelopers: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 8,
  },
  avatarEditLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  characterGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  characterOption: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(15,49,114,0.04)',
  },
  characterOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37,99,235,0.10)',
  },
  characterImage: {
    width: 44,
    height: 44,
  },
  characterLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  characterLabelSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },

  // ── School Year Card & Modal Styles ──
  syCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.12)',
  },
  syAndroidCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  syAndroidCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  syAndroidExpandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  syCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  syIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.8,
  },
  syCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f3172',
  },
  syPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  syPickerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  syStatusRow: {
    marginTop: 12,
    marginBottom: 10,
  },
  syStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  syStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  syStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  syAcademicGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 49, 114, 0.03)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  syAcademicCol: {
    flex: 1,
    alignItems: 'center',
  },
  syAcademicDividerVertical: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(15, 49, 114, 0.1)',
  },
  syAcademicLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  syAcademicVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f3172',
  },
  syReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
  },
  syReturnBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },

  // School Year Picker Modal
  syModal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 24,
  },
  syModalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 18,
  },
  syOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  syOptionCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  syOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  syRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syRadioCircleActive: {
    borderColor: '#2563EB',
  },
  syRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  syOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  syOptionTitleSelected: {
    color: '#2563EB',
  },
  syActiveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  syActiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  syEnrolledBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  syEnrolledBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
  },
  syOptionSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  syModalDoneBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 40,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  syModalDoneText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});