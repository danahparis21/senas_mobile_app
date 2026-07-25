import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Rect, Circle, Polyline } from 'react-native-svg';
import { api } from '../services/api';

// SVG Components (same as before)
function IdCard({ size = 18, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <Rect x="2" y="4" width="20" height="16" rx="2" />
      <Path d="M8 10h8" />
      <Path d="M8 14h5" />
      <Circle cx="16" cy="14" r="2" />
    </Svg>
  );
}

function Lock({ size = 18, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <Rect x="3" y="11" width="18" height="10" rx="2" />
      <Path d="M7 11V8a5 5 0 0 1 10 0v3" />
    </Svg>
  );
}

function GraduationCap({ size = 20, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <Path d="M12 2L1 7l11 5 9-4.09V17" />
      <Path d="M21 7v6" />
      <Path d="M7 21h10" />
    </Svg>
  );
}

function ChevronRight({ size = 18, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="9 18 15 12 9 6" />
    </Svg>
  );
}

function CheckCircle({ size = 16, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <Polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
  icon,
  maxLength,
  error,
  onBlur,
  showCounter,
  counterText
}: any) {
  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const showError = touched && error;

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused,
        showError && styles.inputWrapperError
      ]}>
        <View style={styles.inputIcon}>
          {icon}
        </View>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9AABB8"
          secureTextEntry={type === 'password'}
          keyboardType={type === 'password' ? 'number-pad' : 'number-pad'}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setTouched(true);
            if (onBlur) onBlur();
          }}
        />
        {showCounter && value.length > 0 && (
          <View style={styles.counterContainer}>
            <Text style={[
              styles.counterText,
              value.length === maxLength && styles.counterTextComplete
            ]}>
              {value.length}/{maxLength}
            </Text>
            {value.length === maxLength && (
              <CheckCircle size={16} color="#4CAF50" />
            )}
          </View>
        )}
      </View>
      {showError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      {!showError && counterText && value.length > 0 && value.length < maxLength && (
        <Text style={styles.hintText}>{counterText}</Text>
      )}
    </View>
  );
}

// ✨ Kid-friendly error modal — matches sign-out design, semantic colors
interface FriendlyErrorModalProps {
  visible: boolean;
  message: string;
  tip: string;
  onClose: () => void;
}

type ErrorTone = 'info' | 'warning' | 'danger';

function FriendlyErrorModal({ visible, message, tip, onClose }: FriendlyErrorModalProps) {
  const getErrorInfo = () => {
    // NETWORK — warning (amber), not danger
    if (message.includes('network') || message.includes('connection') || message.includes('internet')) {
      return {
        tone: 'warning' as ErrorTone,
        title: 'No internet!',
        emoji: '📡',
        image: require('../assets/images/img/senya_blue.png'),
        bgColor: '#FFF7E6',
        borderColor: '#FCD97A',
        iconBg: '#FEF3C7',
        buttonColor: '#F59E0B',
        buttonShadow: 'rgba(245, 158, 11, 0.35)',
      };
    }
    // LRN NOT FOUND — info (brand blue)
    if (message.includes('LRN') || message.includes('Student') || message.includes('find')) {
      return {
        tone: 'info' as ErrorTone,
        title: "Can't find you!",
        emoji: '🔍',
        image: require('../assets/images/img/senya_magnify.png'),
        bgColor: '#E6F0FB',
        borderColor: '#9EC5EC',
        iconBg: '#DCEBFA',
        buttonColor: '#1E4F8A',
        buttonShadow: 'rgba(30, 79, 138, 0.35)',
      };
    }
    // WRONG PIN — warning (amber). NOT red — kid just needs to try again.
    if (message.includes('PIN') || message.includes('Incorrect') || message.includes('match')) {
      return {
        tone: 'warning' as ErrorTone,
        title: "Hmm, let's try again!",
        emoji: '🔑',
        image: require('../assets/images/img/senya_blue.png'),
        bgColor: '#FFF7E6',
        borderColor: '#FCD97A',
        iconBg: '#FEF3C7',
        buttonColor: '#F59E0B',
        buttonShadow: 'rgba(245, 158, 11, 0.35)',
      };
    }
    // FALLBACK — info brand blue
    return {
      tone: 'info' as ErrorTone,
      title: 'Just a moment!',
      emoji: '💬',
      image: require('../assets/images/img/senya_blue.png'),
      bgColor: '#E6F0FB',
      borderColor: '#9EC5EC',
      iconBg: '#DCEBFA',
      buttonColor: '#1E4F8A',
      buttonShadow: 'rgba(30, 79, 138, 0.35)',
    };
  };

  const info = getErrorInfo();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          {/* Icon halo */}
          <View style={[styles.modalIconContainer, { backgroundColor: info.iconBg, borderColor: info.borderColor }]}>
            <Image source={info.image} style={styles.modalImage} contentFit="contain" />
          </View>

          {/* Emoji badge */}
          <Text style={styles.modalEmoji}>{info.emoji}</Text>

          {/* Title — brand navy, big & friendly */}
          <Text style={styles.modalTitle}>{info.title}</Text>

          {/* Message */}
          <Text style={styles.modalMessage}>{message}</Text>

          {/* Tip card */}
          <View style={[styles.modalTipContainer, { backgroundColor: info.bgColor, borderColor: info.borderColor }]}>
            <Text style={styles.tipIcon}>💡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipLabel}>Tip</Text>
              <Text style={styles.modalTip}>{tip}</Text>
            </View>
          </View>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.modalButton,
              {
                backgroundColor: info.buttonColor,
                shadowColor: info.buttonShadow,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>Got it! 👍</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


export default function Login() {
  const router = useRouter();
  const [lrn, setLrn] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [lrnError, setLrnError] = useState('');
  const [pinError, setPinError] = useState('');
  const pinInputRef = useRef(null);

  // State for friendly error modal
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTip, setErrorTip] = useState('');

  const validateLRN = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setLrn(numericText);

    if (numericText.length > 0 && numericText.length < 12) {
      setLrnError(`LRN must be exactly 12 digits (${numericText.length}/12)`);
    } else if (numericText.length === 12) {
      setLrnError('');
    } else {
      setLrnError('');
    }
  };

  const validatePIN = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setPw(numericText);

    if (numericText.length > 0 && numericText.length < 4) {
      setPinError(`PIN must be exactly 4 digits (${numericText.length}/4)`);
    } else if (numericText.length === 4) {
      setPinError('');
    } else {
      setPinError('');
    }
  };

  // Show friendly error popup
  const showFriendlyError = (message: string, tip: string) => {
    setErrorMessage(message);
    setErrorTip(tip);
    setErrorModalVisible(true);
  };

  const handleSignIn = async () => {
    // Validate before submitting
    let hasError = false;

    if (lrn.length !== 12) {
      setLrnError('LRN must be exactly 12 digits');
      hasError = true;
    }

    if (pw.length !== 4) {
      setPinError('PIN must be exactly 4 digits');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.login(lrn, pw);

      if (response.user) {
        // Show success message
        Alert.alert(
          '🎉 Welcome!',
          `Hello, ${response.user.student?.first_name || response.user.name || 'Student'}! Ready to learn?`,
          [
            {
              text: 'Let\'s go! 🚀',
              onPress: () => router.replace('/assessment'),
            },
          ]
        );
      }
    } catch (error: any) {
      // Handle specific error messages with friendly messages
      let friendlyMessage = '';
      let friendlyTip = 'Check your information and try again!';

      if (error.message === 'Student not found') {
        friendlyMessage = "Hmm, I can't find that LRN.";
        friendlyTip = "Double-check your 12-digit number and try again!";
      } else if (error.message === 'Invalid PIN') {
        friendlyMessage = "That PIN doesn't match our records.";
        friendlyTip = "Make sure you're using the right 4-digit PIN from your teacher!";
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        friendlyMessage = "Uh oh! No internet connection found.";
        friendlyTip = "Please check your Wi-Fi or mobile data and try again!";
      } else {
        friendlyMessage = "Something went wrong.";
        friendlyTip = "Please check your LRN and PIN, then try again!";
      }

      showFriendlyError(friendlyMessage, friendlyTip);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Add the friendly error modal */}
      <FriendlyErrorModal
        visible={errorModalVisible}
        message={errorMessage}
        tip={errorTip}
        onClose={() => setErrorModalVisible(false)}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logoBox}>
                <Image source={require('../assets/images/img/senyas_logo.png')} style={styles.logo} contentFit="contain" />
              </View>
              <Text style={styles.title}>SEÑAS</Text>
              <Text style={styles.subtitle}>Filipino Sign Language Learning</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.card}>
                <View style={styles.noteCard}>
                  <View style={styles.noteIconBox}>
                    <GraduationCap size={22} color="#D4891A" />
                  </View>
                  <View style={styles.noteTextContent}>
                    <Text style={styles.noteTitle}>Need your LRN?</Text>
                    <Text style={styles.noteDesc}>Your Learner Reference Number (LRN) is provided by your teacher. Ask them if you need help! ✨</Text>
                  </View>
                </View>

                <Field
                  label="Learner Reference Number (LRN)"
                  value={lrn}
                  onChange={validateLRN}
                  placeholder="Enter your 12-digit LRN"
                  type="text"
                  icon={<IdCard size={18} color="#9AABB8" />}
                  maxLength={12}
                  error={lrnError}
                  showCounter={true}
                  counterText="Enter 12-digit LRN"
                />

                <View style={{ height: 20 }} />

                <Field
                  label="PIN"
                  value={pw}
                  onChange={validatePIN}
                  placeholder="Enter your 4-digit PIN"
                  type="password"
                  icon={<Lock size={18} color="#9AABB8" />}
                  maxLength={4}
                  error={pinError}
                  showCounter={true}
                  counterText="Enter 4-digit PIN"
                />

                <Pressable style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>Forgot PIN? Ask your teacher 🧑‍🏫</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.signInBtn,
                    loading && styles.signInBtnDisabled,
                    (lrn.length !== 12 || pw.length !== 4) && styles.signInBtnDisabled
                  ]}
                  onPress={handleSignIn}
                  disabled={loading || lrn.length !== 12 || pw.length !== 4}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.signInText}>Sign in</Text>
                      <ChevronRight size={18} color="#fff" />
                    </>
                  )}
                </Pressable>
              </View>

              <Text style={styles.footerText}>
                By signing in, you agree to our <Text style={styles.linkText}>Terms</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  logoBox: { backgroundColor: 'rgba(30, 79, 138, 0.08)', borderRadius: 60, padding: 12, marginBottom: 8 },
  logo: { width: 64, height: 64 },
  title: { fontSize: 32, fontWeight: '800', color: '#1A2C3E', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#6B7C8E', fontWeight: '500', marginTop: 2 },
  content: { padding: 20, paddingTop: 0 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 3,
    borderColor: '#E8EDF2',
    borderWidth: 1,
  },
  noteCard: {
    backgroundColor: '#FFF8ED',
    borderRadius: 20,
    padding: 14,
    marginBottom: 28,
    borderColor: '#FFE8CC',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteIconBox: { backgroundColor: 'rgba(255, 200, 100, 0.15)', borderRadius: 40, padding: 8 },
  noteTextContent: { flex: 1 },
  noteTitle: { fontSize: 13, fontWeight: '600', color: '#C47A1A' },
  noteDesc: { fontSize: 12, color: '#9B6A1A', lineHeight: 16, marginTop: 4 },
  fieldContainer: { marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#4A5C6E', marginBottom: 6, letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DFE5EC',
    borderRadius: 60,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    minHeight: 50,
  },
  inputWrapperFocused: { borderColor: '#1E4F8A' },
  inputWrapperError: { borderColor: '#E53935' },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1A2C3E',
    paddingRight: 8,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterText: {
    fontSize: 11,
    color: '#9AABB8',
    fontWeight: '500',
    marginRight: 2,
  },
  counterTextComplete: {
    color: '#4CAF50',
  },
  errorText: {
    fontSize: 12,
    color: '#E53935',
    marginTop: 5,
    marginLeft: 4,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    color: '#9AABB8',
    marginTop: 5,
    marginLeft: 4,
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 12 },
  forgotText: { color: '#1E4F8A', fontSize: 12, fontWeight: '600' },
  signInBtn: {
    marginTop: 28,
    backgroundColor: '#1E4F8A',
    paddingVertical: 14,
    borderRadius: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signInBtnDisabled: {
    opacity: 0.5,
  },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerText: { textAlign: 'center', marginTop: 24, fontSize: 11, color: '#8A9AAA', lineHeight: 18 },
  linkText: { color: '#1E4F8A', fontWeight: '600' },


  // ✨ Kid-friendly modal — matches sign-out design
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 41, 55, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '88%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 32,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#0f3172',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 48,
    elevation: 24,
  },
  modalIconContainer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 3,
  },
  modalImage: {
    width: 92,
    height: 92,
  },
  modalEmoji: {
    fontSize: 22,
    marginTop: -8,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f3172',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 15,
    color: '#5B6B80',
    fontWeight: '500',
    lineHeight: 21,
    marginBottom: 18,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  modalTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    width: '100%',
  },
  tipIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  tipLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0f3172',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 1,
    opacity: 0.75,
  },
  modalTip: {
    fontSize: 11.5,
    color: '#4B5563',
    fontWeight: '500',
    lineHeight: 15,
  },
  modalButton: {
    paddingVertical: 15,
    paddingHorizontal: 44,
    borderRadius: 999,
    minWidth: 160,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
