import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, X, ChevronRight } from 'lucide-react-native';
import { useLessonNotification } from '../contexts/LessonNotificationContext';

export const NewLessonBanner: React.FC = () => {
  const router = useRouter();
  const { activeLessonAlert, dismissLessonAlert, markAsRead } = useLessonNotification();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const autoDismissTimerRef = useRef<any>(null);

  const isVisible = !!activeLessonAlert;

  useEffect(() => {
    if (isVisible) {
      // Clear any prior timer
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }

      // Slide down in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 10 seconds
      autoDismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, 10000);
    } else {
      // Slide up out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, [isVisible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissLessonAlert();
    });
  };

  const handleOpenLesson = () => {
    if (!activeLessonAlert) return;
    const { lessonId, moduleId, id } = activeLessonAlert;

    const idStr = id != null ? String(id) : '';
    if (idStr && !idStr.startsWith('new_lesson_')) {
      markAsRead(idStr);
    }

    handleDismiss();

    router.push({
      pathname: '/(tabs)/lessons',
      params: {
        tab: 'modules',
        lessonId: String(lessonId),
        ...(moduleId ? { moduleId: String(moduleId) } : {}),
      },
    } as any);
  };

  if (!isVisible) return null;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleOpenLesson}
          style={styles.touchableArea}
        >
          <View style={styles.iconCircle}>
            <BookOpen size={18} color="#FFD700" />
          </View>

          <View style={styles.textContainer}>
            <View style={styles.badgeRow}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>TEACHER UPDATE</Text>
              </View>
              <Text style={styles.titleText} numberOfLines={1}>
                {activeLessonAlert.title}
              </Text>
            </View>
            <Text style={styles.subText} numberOfLines={2}>
              {activeLessonAlert.message}
            </Text>
          </View>

          <View style={styles.actionBtn}>
            <Text style={styles.actionText}>Start</Text>
            <ChevronRight size={14} color="#0F3172" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
        >
          <X size={14} color="rgba(255, 255, 255, 0.7)" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99998,
  },
  container: {
    marginHorizontal: 12,
    marginTop: Platform.OS === 'android' ? 36 : 10,
    backgroundColor: '#0F2942',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  touchableArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 6,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 6,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F59E0B',
  },
  livePillText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  titleText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 4,
  },
  actionText: {
    color: '#0F3172',
    fontSize: 12,
    fontWeight: '800',
    marginRight: 2,
  },
  closeBtn: {
    padding: 10,
    marginRight: 4,
  },
});
