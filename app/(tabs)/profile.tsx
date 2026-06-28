import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Pressable, Switch, Modal, Alert, TextInput, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';

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
function HapticIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="3" stroke="#4b7bbb" strokeWidth="2" />
      <Rect x="9" y="9" width="6" height="6" rx="1" fill="#4b7bbb" fillOpacity="0.3" />
    </Svg>
  );
}
function TextSizeIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7V4h16v3M9 20h6M12 4v16" stroke="#4b7bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function LanguageIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke="#4b7bbb" strokeWidth="2" />
      <Path d="M3 12h18M12 3a15 15 0 0 0 0 18 15 15 0 0 0 0-18z" stroke="#4b7bbb" strokeWidth="2" />
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

// ── Helper Functions ──────────────────────────────────────────────────
function formatLearningGoal(goal: string) {
  if (!goal) return 'Not set';
  return goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatPracticeTime(time: string) {
  if (!time) return 'Not set';
  return time.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
function EditProfileModal({ visible, onClose, userName, onSave }: {
  visible: boolean; onClose: () => void; userName: string; onSave: (name: string) => void;
}) {
  const [name, setName] = useState(userName);
  const [showBadges, setShowBadges] = useState(true);

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

          {/* Avatar */}
          <View style={styles.avatarEditCenter}>
            <View style={styles.avatarEditRing}>
              <Image
                source={require('../../assets/images/img/senya_blue.png')}
                style={styles.avatarEditImg}
                contentFit="cover"
              />
            </View>
            <Pressable style={styles.changePicBtn}>
              <Text style={styles.changePicText}>Change Picture</Text>
            </Pressable>
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
            <Pressable style={styles.saveBtn} onPress={() => { onSave(name); onClose(); }}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


// ── Main Profile Screen ─────────────────────────────────────────────────
export default function Profile() {
  const router = useRouter();
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
  const [progressData, setProgressData] = useState<{ name: string, pct: number, color: string }[]>([]);
  const [recentBadges, setRecentBadges] = useState<{ src: any, label: string }[]>([]);

  // Settings state
  const [notifs, setNotifs] = useState(true);
  const [sound, setSound] = useState(true);
  const [haptic, setHaptic] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);


  const settingsItems = [
    { label: 'Daily Reminders', sub: 'Get notified to practice', val: notifs, set: setNotifs, Icon: BellIcon },
    { label: 'Sound Effects', sub: 'Play sounds during lessons', val: sound, set: setSound, Icon: SoundIcon },
    { label: 'Haptic Feedback', sub: 'Vibrate on interactions', val: haptic, set: setHaptic, Icon: HapticIcon },
    { label: 'Large Text Mode', sub: 'Bigger text for readability', val: largeText, set: setLargeText, Icon: TextSizeIcon },
  ];

  const accountItems = [
    { label: 'Language Preference', Icon: LanguageIcon },
    { label: 'Help & Support', Icon: HelpIcon },
    { label: 'About SEÑAS', Icon: InfoIcon },
  ];

  // ── Fetch profile data ──
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Get user data from AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const student = user.student;
        const fullName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim();
        setUserName(fullName || 'Student');
        setStudentLevel(student?.fsl_mastery_level || 'Beginner');
      }

      // Fetch latest data from API
      const response = await api.getStudentLessons();
      if (response.success) {
        const student = response.student;
        setTotalXp(student?.total_xp || 0);
        setStreakDays(student?.streak_days || 0);

        if (student?.fsl_mastery_level) {
          setStudentLevel(student.fsl_mastery_level);
        }

        const completedLessons = response.lessons?.filter((l: any) => l.status === 'completed') || [];
        setTotalLessons(completedLessons.length);

        const earnedBadges = Math.min(Math.floor((student?.total_xp || 0) / 50) + 1, 8);
        setTotalBadges(earnedBadges > 0 ? Math.min(earnedBadges, 8) : 0);

        // Build progress data
        const progressItems = response.lessons?.slice(0, 4).map((lesson: any, index: number) => {
          const progress = lesson.progress;
          const pct = progress ? Math.round((progress.current_step / lesson.total_steps) * 100) : 0;
          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
          return {
            name: lesson.title,
            pct: pct,
            color: colors[index % colors.length]
          };
        }) || [];

        while (progressItems.length < 4) {
          const placeholders = ['FSL Alphabet', 'Greetings', 'Numbers', 'Classroom Words'];
          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
          progressItems.push({
            name: placeholders[progressItems.length],
            pct: 0,
            color: colors[progressItems.length]
          });
        }
        setProgressData(progressItems);

        // ── FIXED: Set recent badges ──
        const badgeData = [
          { xp: 0, label: 'First Step', src: require('../../assets/images/img/first_step.png') },
          { xp: 50, label: 'Alphabet Star', src: require('../../assets/images/img/alphabet_star.png') },
          { xp: 100, label: 'Streak Starter', src: require('../../assets/images/img/streak1.png') },
          { xp: 150, label: 'Greeter', src: require('../../assets/images/img/greetings.png') },
        ];

        const earnedBadgeList = badgeData
          .filter(b => (student?.total_xp || 0) >= b.xp)
          .slice(0, 4);

        // Add locked badges as placeholders if needed - FIXED to include xp property
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

      // Get learning path
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
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        userName={userName}
        onSave={setUserName}
      />
      <SignOutModal
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={() => { setShowSignOutModal(false); router.replace('/onboarding'); }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerBubble1} />
          <View style={styles.headerBubble2} />

          <View style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              <Image
                source={require('../../assets/images/img/senya_blue.png')}
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

        {/* ── Learning Path ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Learning Path</Text>
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

        {/* ── Learning Progress ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Progress</Text>
          <GlassCard style={styles.progressCard}>
            {progressData.map((item, i) => (
              <View key={i} style={[styles.progressItem, i < progressData.length - 1 && styles.progressItemBorder]}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressName}>{item.name}</Text>
                  <Text style={[styles.progressPct, { color: item.color }]}>{item.pct}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${item.pct}%` as any, backgroundColor: item.color }]} />
                </View>
              </View>
            ))}
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
            {accountItems.map(({ label, Icon }, i) => (
              <Pressable key={i} style={[styles.accountRow, i < accountItems.length - 1 && styles.settingBorder]}>
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
    backgroundColor: '#1848c8',
    paddingTop: 32, paddingBottom: 40,
    alignItems: 'center', position: 'relative', overflow: 'hidden',
  },
  headerBubble1: { position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.06)' },
  headerBubble2: { position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.04)' },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)' },
  avatarImg: { width: '100%', height: '100%' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: '#FBBF24', borderWidth: 2, borderColor: '#1848c8', alignItems: 'center', justifyContent: 'center' },
  editAvatarIcon: { color: '#1848c8', fontSize: 14, fontWeight: '700' },
  headerName: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  headerRole: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500', marginBottom: 10 },
  headerBadgeRow: { flexDirection: 'row', gap: 8 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 12 },
  headerBadgeTextYellow: { color: '#FBBF24', fontSize: 12, fontWeight: '700' },
  headerBadgeTransp: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 12 },
  headerBadgeTextWhite: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Stats
  statsSection: { paddingHorizontal: 16, marginTop: -24 },
  statsCard: { padding: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 6 },
  statIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statIcon: { width: 22, height: 22 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0f3172' },
  statLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', textAlign: 'center' },

  // Sections
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

  // Progress
  progressCard: { padding: 20 },
  progressItem: { paddingBottom: 14, marginBottom: 14 },
  progressItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(15,49,114,0.08)' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressName: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  progressPct: { fontSize: 12, fontWeight: '700' },
  progressTrack: { backgroundColor: 'rgba(15,49,114,0.10)', borderRadius: 99, height: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },

  // Badges
  badgesCard: { padding: 20 },
  badgesRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  badgeItem: { alignItems: 'center', gap: 4 },
  badgeImg: { width: 48, height: 48 },
  badgeLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center' },

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
});