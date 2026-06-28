import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, ScrollView, Modal, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Colors } from '../constants/Colors';
import { GhostButton } from '../components/ui/Buttons';

export default function RoleSelect() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const pickRole = (role: string) => {
    setSelected(role);
    if (role === 'teacher') {
      setShowPopup(true);
    }
    if (role === 'student') {
      // In the original, it goes to studentSplash then original Onboarding then Login
      // For simplicity, we just route them to login
      setTimeout(() => router.replace('/login'), 350);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.logoText}>SEÑAS</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroImageContainer}>
            <Image source={require('../assets/images/img/senya_blue.png')} style={styles.heroImage} contentFit="contain" />
          </View>
          
          <View style={styles.badgeContainer}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>CHOOSE YOUR ROLE</Text>
          </View>

          <Text style={styles.title}>Who are you learning for?</Text>
          <Text style={styles.subtitle}>Your experience will be tailored to your role.</Text>
        </View>

        {/* Cards */}
        <View style={styles.cardsContainer}>
          {/* STUDENT CARD */}
          <Pressable
            style={[
              styles.roleCard,
              selected === 'student' && styles.roleCardSelectedStudent,
              (selected && selected !== 'student') && styles.roleCardFaded
            ]}
            onPress={() => pickRole('student')}
          >
            <View style={[styles.cardTopStrip, { backgroundColor: '#2563EB' }]} />
            <View style={styles.cardContent}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(37,99,235,0.08)' }]}>
                <Image source={require('../assets/images/img/student.png')} style={styles.cardIcon} contentFit="contain" />
              </View>
              <View style={styles.cardTextContent}>
                <View style={[styles.cardLabel, { backgroundColor: 'rgba(37,99,235,0.08)' }]}>
                  <Text style={[styles.cardLabelText, { color: '#2563EB' }]}>STUDENT</Text>
                </View>
                <Text style={styles.cardTitle}>I'm here to learn</Text>
                <Text style={styles.cardDesc}>Access lessons, quizzes, gesture recognition, and earn badges.</Text>
              </View>
            </View>
          </Pressable>

          {/* TEACHER CARD */}
          <Pressable
            style={[
              styles.roleCard,
              selected === 'teacher' && styles.roleCardSelectedTeacher,
              (selected && selected !== 'teacher') && styles.roleCardFaded
            ]}
            onPress={() => pickRole('teacher')}
          >
            <View style={[styles.cardTopStrip, { backgroundColor: '#059669' }]} />
            <View style={styles.cardContent}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(5,150,105,0.08)' }]}>
                <Image source={require('../assets/images/img/teacher.png')} style={styles.cardIcon} contentFit="contain" />
              </View>
              <View style={styles.cardTextContent}>
                <View style={[styles.cardLabel, { backgroundColor: 'rgba(5,150,105,0.08)' }]}>
                  <Text style={[styles.cardLabelText, { color: '#059669' }]}>TEACHER</Text>
                </View>
                <Text style={styles.cardTitle}>I'm here to teach</Text>
                <Text style={styles.cardDesc}>Manage classes, monitor student progress, from a web dashboard.</Text>
              </View>
            </View>
          </Pressable>
        </View>

        <Text style={styles.footerNote}>You can always change your role in Settings later.</Text>

      </ScrollView>

      {/* Teacher Popup Modal */}
      <Modal visible={showPopup} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Image source={require('../assets/images/img/senyas_logo.png')} style={styles.modalLogo} contentFit="contain" />
            <Text style={styles.modalTitle}>You're heading to the teacher portal!</Text>
            <Text style={styles.modalDesc}>
              The SEÑAS teacher dashboard is a web-based platform. You'll be redirected to log in and manage your classes.
            </Text>
            <View style={styles.modalUrlBox}>
              <Text style={styles.modalUrlText}>teacher.senas.edu.ph</Text>
            </View>
            <View style={styles.modalActions}>
              <GhostButton style={styles.modalBtn} title="← Back" onPress={() => { setShowPopup(false); setSelected(null); }} />
              <Pressable style={styles.modalPrimaryBtn} onPress={() => { Linking.openURL('https://teacher.senas.edu.ph'); setShowPopup(false); setSelected(null); }}>
                <Text style={styles.modalPrimaryBtnText}>Open Dashboard →</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eaf5fd' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  logoText: { color: '#0f3172', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  hero: { alignItems: 'center', marginBottom: 24 },
  heroImageContainer: { marginBottom: 14 },
  heroImage: { width: 100, height: 100 },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,49,114,0.08)',
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1848c8' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#1848c8', letterSpacing: 0.8 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f3172', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#4b7bbb', fontWeight: '500', textAlign: 'center' },
  cardsContainer: { gap: 14 },
  roleCard: {
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  roleCardSelectedStudent: { borderColor: '#93C5FD' },
  roleCardSelectedTeacher: { borderColor: '#6EE7B7' },
  roleCardFaded: { opacity: 0.5 },
  cardTopStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  cardContent: { flexDirection: 'row', gap: 14 },
  cardIconBox: { width: 76, height: 76, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardIcon: { width: 72, height: 72 },
  cardTextContent: { flex: 1 },
  cardLabel: { alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 10, marginBottom: 6 },
  cardLabelText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f3172', marginBottom: 4 },
  cardDesc: { fontSize: 12.5, color: '#475569', lineHeight: 20 },
  footerNote: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,30,80,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 99, backgroundColor: '#E5E7EB', marginBottom: 20 },
  modalLogo: { width: 80, height: 80, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f3172', textAlign: 'center', marginBottom: 8 },
  modalDesc: { fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalUrlBox: {
    backgroundColor: 'rgba(5,150,105,0.06)',
    borderColor: 'rgba(5,150,105,0.15)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  modalUrlText: { fontSize: 13, fontWeight: '600', color: '#047857' },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 12 },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
