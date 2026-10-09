import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Hand, ScanFace } from 'lucide-react-native';

interface HandDetectionGuideOverlayProps {
  handsRequired: number; // 1 or 2
  tracksHead?: boolean;
  handsDetected: number | null;
  isModelLoading?: boolean;
  modelStatusText?: string;
}

// Keep these as simple, familiar outlines. The previous "cyber" hand had too
// many internal paths and could read as a distorted hand at camera-overlay size.
function BlueHandIcon({ size = 64, flip = false }: { size?: number; flip?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scaleX: flip ? -1 : 1 }],
      }}
    >
      <Hand size={size * 0.78} color="#38BDF8" strokeWidth={1.8} />
    </View>
  );
}

// ── Stylized Glowing Face/Head Tracking SVG ─────────────────────────────────
function HeadTrackIcon({ size = 68 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <ScanFace size={size * 0.75} color="#38BDF8" strokeWidth={1.8} />
    </View>
  );
}

export function HandDetectionGuideOverlay({
  handsRequired,
  tracksHead = false,
  handsDetected,
  isModelLoading = false,
  modelStatusText,
}: HandDetectionGuideOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const noHandsDetected = handsDetected === null || handsDetected === 0;

  // Pulse animation for gentle guidance
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Fade out when hands are detected, fade in when no hands
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: noHandsDetected ? 1 : 0,
      duration: noHandsDetected ? 300 : 200,
      useNativeDriver: true,
    }).start();
  }, [noHandsDetected, fadeAnim]);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* ── Model Loading Pill (Shows when AI is still loading) ── */}
      {isModelLoading && (
        <View style={styles.modelLoadingPill}>
          <View style={styles.loadingPulseDot} />
          <Text style={styles.modelLoadingText}>
            {modelStatusText || 'AI Model Loading... Please wait'}
          </Text>
        </View>
      )}

      {/* ── Hand / Head Guidance Overlay (Disappears when hands are detected) ── */}
      <Animated.View
        style={[
          styles.overlayContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={styles.glassBackdrop}>
          {/* Icons Row */}
          <View style={styles.iconsRow}>
            {handsRequired === 2 && tracksHead ? (
              // ✋ 👤 🤚 for two hands + head tracking
              <>
                <BlueHandIcon size={64} />
                <HeadTrackIcon size={60} />
                <BlueHandIcon size={64} flip />
              </>
            ) : handsRequired === 2 ? (
              // ✋ 🤚 for two hands
              <>
                <BlueHandIcon size={66} />
                <BlueHandIcon size={66} flip />
              </>
            ) : tracksHead ? (
              // ✋ 👤 for one hand + head tracking
              <>
                <BlueHandIcon size={66} />
                <HeadTrackIcon size={60} />
              </>
            ) : (
              // ✋ for one hand
              <BlueHandIcon size={76} />
            )}
          </View>

          {/* Guide Text */}
          <Text style={styles.guideTitle}>
            {handsRequired === 2 && tracksHead
              ? 'Hands and face in frame'
              : handsRequired === 2
                ? 'Hands in frame'
                : tracksHead
                  ? 'Hand and face in frame'
                  : 'Hand in frame'}
          </Text>
          <Text style={styles.guideSubtitle}>
            {noHandsDetected ? 'Ready for your gesture' : 'Hands detected'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modelLoadingPill: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 49, 114, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  loadingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  modelLoadingText: {
    color: '#F0F9FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  overlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassBackdrop: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 8,
  },
  guideTitle: {
    color: '#E0F2FE',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(2, 132, 199, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    letterSpacing: 0.4,
  },
  guideSubtitle: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.9,
  },
});
