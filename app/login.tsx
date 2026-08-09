import React, { useState, useRef, useEffect } from 'react';
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
  Modal,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Rect, Circle, Polyline } from 'react-native-svg';
import { api } from '../services/api';

const { width, height } = Dimensions.get('window');

// ── SUNNY SKY PALETTE ────────────────────────────────────────────────
const GRADIENT = ['#c1eaff', '#BFE7FB', '#E6F4FE', '#F8FCFF'] as const;

const C = {
  ink: '#123A6B',
  inkSoft: '#5B84B1',
  blue: '#2F86D8',
  blueDeep: '#1E63B8',
  sun: '#FBBF24',
  sunDeep: '#B4700A',
  card: 'rgba(255, 255, 255, 0.94)',
  cardLine: 'rgba(255, 255, 255, 0.95)',
  sky: '#E6F1FF',
};

/**
 * Gentle floating cloud component for login background
 */
function LoginCloud({
  bottom,
  scale,
  duration,
  opacity,
  color,
  reverse = false,
  delay = 0,
}: {
  bottom: number;
  scale: number;
  duration: number;
  opacity: number;
  color: string;
  reverse?: boolean;
  delay?: number;
}) {
  const drift = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const translateX = drift.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? [-width, 0] : [0, -width],
  });

  if (!visible) return null;

  const unit = width / 2.2;
  const puffs = [
    { left: -unit * 0.25, bottom: -unit * 0.5 * scale, width: unit * 1.1 * scale, height: unit * 1.1 * scale },
    { left: unit * 0.55, bottom: -unit * 0.3 * scale, width: unit * 0.85 * scale, height: unit * 0.85 * scale },
    { left: unit * 1.15, bottom: -unit * 0.45 * scale, width: unit * 1.05 * scale, height: unit * 1.05 * scale },
    { left: unit * 1.85, bottom: -unit * 0.25 * scale, width: unit * 0.7 * scale, height: unit * 0.7 * scale },
  ];

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom,
        left: 0,
        width: width * 2,
        height: height * 0.3,
        opacity,
        transform: [{ translateX }],
      }}
    >
      {puffs.map((puff, index) => (
        <View
          key={index}
          style={[
            styles.cloudPuff,
            {
              backgroundColor: color,
              width: puff.width,
              height: puff.height,
              left: puff.left,
              bottom: puff.bottom,
            },
          ]}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: -2,
          bottom: -unit * 2,
          height: unit * 2,
          backgroundColor: color,
        }}
      />
      {puffs.map((puff, index) => (
        <View
          key={`dup-${index}`}
          style={[
            styles.cloudPuff,
            {
              backgroundColor: color,
              width: puff.width,
              height: puff.height,
              left: puff.left + width,
              bottom: puff.bottom,
            },
          ]}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: width,
          right: -2,
          bottom: -unit * 2,
          height: unit * 2,
          backgroundColor: color,
        }}
      />
    </Animated.View>
  );
}

// SVG Components
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
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          {React.cloneElement(icon, { color: isFocused ? C.blue : (showError ? '#E53935' : '#9AABB8') })}
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
              <CheckCircle size={16} color="#10B981" />
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

// Kid-friendly error modal
interface FriendlyErrorModalProps {
  visible: boolean;
  message: string;
  tip: string;
  onClose: () => void;
}

type ErrorTone = 'info' | 'warning' | 'danger';

function FriendlyErrorModal({ visible, message, tip, onClose }: FriendlyErrorModalProps) {
  const getErrorInfo = () => {
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
          <View style={[styles.modalIconContainer, { backgroundColor: info.iconBg, borderColor: info.borderColor }]}>
            <Image source={info.image} style={styles.modalImage} contentFit="contain" />
          </View>
          <Text style={styles.modalEmoji}>{info.emoji}</Text>
          <Text style={styles.modalTitle}>{info.title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>

          <View style={[styles.modalTipContainer, { backgroundColor: info.bgColor, borderColor: info.borderColor }]}>
            <Text style={styles.tipIcon}>💡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipLabel}>Tip</Text>
              <Text style={styles.modalTip}>{tip}</Text>
            </View>
          </View>

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
        Alert.alert(
          '🎉 Welcome!',
          `Hello, ${response.user.student?.first_name || response.user.name || 'Student'}! Ready to learn?`,
          [
            {
              text: "Let's go! 🚀",
              onPress: () => router.replace('/assessment'),
            },
          ]
        );
      }
    } catch (error: any) {
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
    <View style={styles.outerContainer}>
      <StatusBar style="dark" translucent />

      {/* Bright Sunny Sky Linear Gradient */}
      <LinearGradient
        colors={[...GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Background Soft Sky Clouds */}
      <LoginCloud bottom={height * 0.32} scale={0.7} duration={110000} opacity={0.65} color="#ffffff" reverse delay={0} />
      <LoginCloud bottom={height * 0.18} scale={1.1} duration={85000} opacity={0.80} color="#ffffff" delay={400} />
      <LoginCloud bottom={height * 0.04} scale={0.9} duration={60000} opacity={0.90} color="#E6F4FE" reverse delay={200} />
      <LoginCloud bottom={-height * 0.05} scale={1.25} duration={48000} opacity={1.0} color="#ffffff" delay={800} />

      <FriendlyErrorModal
        visible={errorModalVisible}
        message={errorMessage}
        tip={errorTip}
        onClose={() => setErrorModalVisible(false)}
      />

      <SafeAreaView style={styles.safeArea}>
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
              {/* Header section with brand logo */}
              <View style={styles.header}>
                <View style={styles.logoGlowRing}>
                  <View style={styles.logoBox}>
                    <Image source={require('../assets/images/img/senyas_logo.png')} style={styles.logo} contentFit="contain" />
                  </View>
                </View>
                <Text style={styles.title}>SEÑAS</Text>
                <Text style={styles.subtitle}>Filipino Sign Language Learning Platform</Text>
              </View>

              {/* Login Form Card */}
              <View style={styles.content}>
                <View style={styles.card}>
                  {/* Teacher Help Note Card */}
                  <View style={styles.noteCard}>
                    <View style={styles.noteIconBox}>
                      <GraduationCap size={22} color={C.sunDeep} />
                    </View>
                    <View style={styles.noteTextContent}>
                      <Text style={styles.noteTitle}>Need your LRN?</Text>
                      <Text style={styles.noteDesc}>Your Learner Reference Number (LRN) is provided by your teacher. Ask them if you need help! ✨</Text>
                    </View>
                  </View>

                  {/* LRN Field */}
                  <Field
                    label="Learner Reference Number (LRN)"
                    value={lrn}
                    onChange={validateLRN}
                    placeholder="Enter your 12-digit LRN"
                    type="text"
                    icon={<IdCard size={18} />}
                    maxLength={12}
                    error={lrnError}
                    showCounter={true}
                    counterText="Enter 12-digit LRN"
                  />

                  <View style={{ height: 18 }} />

                  {/* PIN Field */}
                  <Field
                    label="PIN"
                    value={pw}
                    onChange={validatePIN}
                    placeholder="Enter your 4-digit PIN"
                    type="password"
                    icon={<Lock size={18} />}
                    maxLength={4}
                    error={pinError}
                    showCounter={true}
                    counterText="Enter 4-digit PIN"
                  />

                  <Pressable style={styles.forgotBtn}>
                    <Text style={styles.forgotText}>Forgot PIN? Ask your teacher 🧑‍🏫</Text>
                  </Pressable>

                  {/* Sign In Button */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.signInBtn,
                      (loading || lrn.length !== 12 || pw.length !== 4) && styles.signInBtnDisabled,
                      { transform: [{ scale: pressed ? 0.98 : 1 }] }
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
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#c1eaff' },
  safeArea: { flex: 1 },
  cloudPuff: { position: 'absolute', borderRadius: 999 },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 16 },
  logoGlowRing: {
    padding: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 10,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  logoBox: {
    backgroundColor: '#ffffff',
    borderRadius: 99,
    padding: 10,
  },
  logo: { width: 68, height: 68 },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: C.ink,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12.5,
    color: C.inkSoft,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  content: { paddingHorizontal: 20, paddingTop: 6 },
  card: {
    backgroundColor: C.card,
    borderRadius: 32,
    padding: 24,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
    borderColor: C.cardLine,
    borderWidth: 1.5,
  },
  noteCard: {
    backgroundColor: '#FFF9EF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 24,
    borderColor: '#FDE68A',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteIconBox: { backgroundColor: 'rgba(251, 191, 36, 0.2)', borderRadius: 40, padding: 8 },
  noteTextContent: { flex: 1 },
  noteTitle: { fontSize: 13, fontWeight: '700', color: C.sunDeep },
  noteDesc: { fontSize: 12, color: '#92400E', lineHeight: 17, marginTop: 2 },
  fieldContainer: { marginBottom: 4 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: C.ink, marginBottom: 7, letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D0DFEE',
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  inputWrapperFocused: { borderColor: C.blue, backgroundColor: '#FFFFFF' },
  inputWrapperError: { borderColor: '#E53935' },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14.5,
    color: C.ink,
    fontWeight: '500',
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
    fontWeight: '600',
    marginRight: 2,
  },
  counterTextComplete: {
    color: '#10B981',
  },
  errorText: {
    fontSize: 12,
    color: '#E53935',
    marginTop: 5,
    marginLeft: 6,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: C.inkSoft,
    marginTop: 5,
    marginLeft: 6,
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 12 },
  forgotText: { color: C.blueDeep, fontSize: 12.5, fontWeight: '700' },
  signInBtn: {
    marginTop: 26,
    backgroundColor: C.blueDeep,
    paddingVertical: 16,
    borderRadius: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.blueDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  signInBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  footerText: { textAlign: 'center', marginTop: 24, fontSize: 11.5, color: C.inkSoft, lineHeight: 18 },
  linkText: { color: C.blueDeep, fontWeight: '700' },

  // Kid-friendly modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 58, 107, 0.45)',
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
    shadowColor: C.ink,
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
    color: C.ink,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 15,
    color: C.inkSoft,
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
    color: C.ink,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 1,
    opacity: 0.75,
  },
  modalTip: {
    fontSize: 11.5,
    color: C.inkSoft,
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
