import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Pressable, Switch, Modal, Alert, TextInput, ActivityIndicator,
  Dimensions, Animated, Easing
} from 'react-native';

import { Image } from 'expo-image';
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
  onSave,
  currentAvatar,
  onAvatarChange
}: {
  visible: boolean;
  onClose: () => void;
  userName: string;
  onSave: (name: string) => void;
  currentAvatar: string;
  onAvatarChange: (avatar: string) => void;
}) {
  const [name, setName] = useState(userName);
  const [showBadges, setShowBadges] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);

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
      onSave(name);
      onClose();
      Alert.alert('✅ Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to update profile. Please try again.');
      console.error(error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.editModal} onPress={e => e.stopPropagation()}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Edit Profile</Text>
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
            <Text style={styles.avatarEditLabel}>Choose your character</Text>
          </View>

          {/* Character Grid */}
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
                <Text style={[
                  styles.characterLabel,
                  selectedAvatar === char.id && styles.characterLabelSelected,
                ]}>
                  {char.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Display Name */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter a nickname"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.fieldNote}>*Your real name cannot be changed</Text>
          </View>

          {/* Badge toggle */}
          <View style={styles.badgeToggleRow}>
            <View>
              <Text style={styles.badgeToggleLabel}>Show Badges</Text>
              <Text style={styles.badgeToggleSub}>Display your earned badges on profile</Text>
            </View>
            <Switch
              value={showBadges}
              onValueChange={setShowBadges}
              trackColor={{ false: '#ddd', true: '#2563EB' }}
              thumbColor="#fff"
            />
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
      label: 'Daily Reminders',
      sub: 'Get notified to practice',
      val: settings.notificationsEnabled,
      set: async (value: boolean) => {
        try {
          await updateSetting('notificationsEnabled', value);
        } catch (error) {
          console.error('Error updating notification setting:', error);
        }
      },
      Icon: BellIcon
    },
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

  const fetchProfileData = async () => {
    try {
      setLoading(true);

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

      const response = await api.getStudentLessons();
      if (response.success) {
        const student = response.student;
        setTotalXp(student?.total_xp || 0);
        setStreakDays(student?.streak_days || 0);

        if (student?.fsl_mastery_level) {
          setStudentLevel(student.fsl_mastery_level);
        }

        if (student?.profile_picture) {
          setSelectedAvatar(student.profile_picture);
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

        const earnedBadges = Math.min(Math.floor((student?.total_xp || 0) / 50) + 1, 8);
        setTotalBadges(earnedBadges > 0 ? Math.min(earnedBadges, 8) : 0);

        const badgeData = [
          { xp: 0, label: 'First Step', src: require('../../assets/images/img/first_step.png') },
          { xp: 50, label: 'Alphabet Star', src: require('../../assets/images/img/alphabet_star.png') },
          { xp: 100, label: 'Streak Starter', src: require('../../assets/images/img/streak1.png') },
          { xp: 150, label: 'Greeter', src: require('../../assets/images/img/greetings.png') },
        ];

        const earnedBadgeList = badgeData
          .filter(b => (student?.total_xp || 0) >= b.xp)
          .slice(0, 4);

        const placeholderBadges: { xp: number; label: string; src: any }[] = [
          { xp: 200, label: 'Quiz Whiz', src: require('../../assets/images/img/locked.png') },
          { xp: 250, label: 'Sign Detective', src: require('../../assets/images/img/locked.png') },
          { xp: 300, label: 'Number Ninja', src: require('../../assets/images/img/locked.png') },
          { xp: 350, label: 'Week Warrior', src: require('../../assets/images/img/locked.png') },
        ];

        while (earnedBadgeList.length < 4) {
          earnedBadgeList.push(placeholderBadges[earnedBadgeList.length]);
        }
        setRecentBadges(earnedBadgeList);
      }

      try {
        const promoResponse = await api.getPromotionHistory();
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

  // Stats data
  const stats = [
    { label: 'Lessons Done', value: totalLessons.toString(), icon: require('../../assets/images/img/lesson.png'), color: '#3B82F6' },
    { label: 'Total XP', value: totalXp.toString(), icon: require('../../assets/images/img/energy.png'), color: '#F59E0B' },
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
        onConfirm={() => { setShowSignOutModal(false); router.replace('/onboarding'); }}
      />
      <HelpSupportModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
      <AboutModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
      {selectedPromotion && (
        <PromotionModal
          visible={showPromotionModal}
          promotionData={selectedPromotion}
          onClose={() => setShowPromotionModal(false)}
          studentName={userName}
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

        {/* ── Stats ── */}
        <View style={styles.statsSection}>
          <GlassCard style={styles.statsCard}>
            <View style={styles.statsGrid}>
              {stats.map((s, i) => (
                <View key={i} style={styles.statItem}>
                  <View style={[styles.statIconBox, { backgroundColor: s.color + '22' }]}>
                    <Image source={s.icon} style={styles.statIcon} contentFit="contain" />
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
    backgroundColor: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
  fieldBlock: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 16, fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.8)', color: '#1F2937',
  },
  fieldNote: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  badgeToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 24,
  },
  badgeToggleLabel: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  badgeToggleSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
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
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  characterOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(15,49,114,0.04)',
    minWidth: 60,
  },
  characterOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37,99,235,0.10)',
  },
  characterImage: {
    width: 50,
    height: 50,
  },
  characterLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  characterLabelSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
});