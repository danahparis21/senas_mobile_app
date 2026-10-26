// components/AnnouncementModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  NotificationItem,
  useLessonNotification,
  formatPhilippineDate,
  isPhilippineToday,
  extractAnnouncementLessonIds,
} from '../contexts/LessonNotificationContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AnnouncementModalProps {
  visible: boolean;
  announcement: NotificationItem | null;
  onClose: () => void;
}

export function AnnouncementModal({ visible, announcement, onClose }: AnnouncementModalProps) {
  const router = useRouter();
  const { allLessonsMap, markAsRead } = useLessonNotification();

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Automatically mark this notification as read when opened
      if (announcement?.id) {
        markAsRead(announcement.id);
      }
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, announcement]);

  if (!announcement) return null;

  // Extract lesson IDs
  const lessonIds = extractAnnouncementLessonIds(announcement);

  // Parse notification data for any embedded lessons fallback
  let data = announcement.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {}
  }

  // Resolve lessons from allLessonsMap or fallback to data.lessons
  const resolvedLessons = lessonIds.map((id) => {
    const fromMap = allLessonsMap[id];
    if (fromMap) {
      return {
        id: fromMap.id || fromMap.lesson_id || id,
        title: fromMap.title || `Lesson #${id}`,
        module_id: fromMap.module_id,
        module_title: fromMap.module_title || 'Module',
        duration: fromMap.duration || '5 min',
        xp: fromMap.xp_reward || fromMap.xp || 50,
        locked: Boolean(fromMap.locked || fromMap.is_locked),
        done: Boolean(fromMap.done || fromMap.status === 'completed'),
        category: fromMap.category || 'gesture',
        color: fromMap.color || '#1A6FD4',
      };
    }

    // Check data.lessons array if provided by backend
    const embedded = Array.isArray(data?.lessons)
      ? data.lessons.find((l: any) => Number(l.id || l.lesson_id) === Number(id))
      : null;

    return {
      id,
      title: embedded?.title || `Lesson #${id}`,
      module_id: embedded?.module_id,
      module_title: embedded?.module_title || 'Lesson',
      duration: embedded?.duration || '5 min',
      xp: embedded?.xp || 50,
      locked: Boolean(embedded?.locked || embedded?.is_locked),
      done: Boolean(embedded?.done),
      category: embedded?.category || 'gesture',
      color: '#1A6FD4',
    };
  });

  const isToday = isPhilippineToday(announcement.created_at);
  const dateFormatted = formatPhilippineDate(announcement.created_at);

  const handleLessonClick = (lesson: any) => {
    if (lesson.locked) {
      Alert.alert(
        '🔒 Lesson Locked',
        "This lesson is still locked! Complete the first lessons to unlock today's assignment.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Lesson Map',
            onPress: () => {
              onClose();
              router.push({
                pathname: '/(tabs)/lessons',
                params: {
                  tab: 'modules',
                  lessonId: String(lesson.id),
                  ...(lesson.module_id ? { moduleId: String(lesson.module_id) } : {}),
                  highlightToday: '1',
                },
              } as any);
            },
          },
        ]
      );
      return;
    }

    // Lesson is unlocked - proceed directly to map with bottom card opened!
    onClose();
    router.push({
      pathname: '/(tabs)/lessons',
      params: {
        tab: 'modules',
        lessonId: String(lesson.id),
        ...(lesson.module_id ? { moduleId: String(lesson.module_id) } : {}),
        highlightToday: '1',
      },
    } as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header with Royal Gradient */}
          <LinearGradient
            colors={['#0D326B', '#154B94', '#1E63B8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerTopRow}>
              <View style={styles.badgeRow}>
                <View style={styles.announcementTag}>
                  <Ionicons name="megaphone" size={14} color="#FBBF24" />
                  <Text style={styles.announcementTagText}>TEACHER ANNOUNCEMENT</Text>
                </View>
                {isToday && (
                  <View style={styles.todayTag}>
                    <View style={styles.pulsingGreenDot} />
                    <Text style={styles.todayTagText}>TODAY</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                ]}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={styles.headerTitle}>Do this lesson today! 🖐️</Text>
            <Text style={styles.headerDate}>{dateFormatted || 'Philippine Time'}</Text>
          </LinearGradient>

          {/* Body Content */}
          <ScrollView
            style={styles.contentScrollView}
            contentContainerStyle={styles.contentScrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Teacher's Message Bubble */}
            <View style={styles.messageCard}>
              <View style={styles.messageSenderRow}>
                <View style={styles.senderAvatar}>
                  <Ionicons name="school" size={16} color="#0D326B" />
                </View>
                <Text style={styles.senderLabel}>Message from your Teacher</Text>
              </View>

              <Text style={styles.messageText}>
                {announcement.message || 'Please complete the assigned lessons for today!'}
              </Text>
            </View>

            {/* Assigned Lessons Section */}
            <View style={styles.lessonsSectionHeader}>
              <Ionicons name="list" size={16} color="#0D326B" />
              <Text style={styles.lessonsSectionTitle}>
                ASSIGNED LESSONS ({resolvedLessons.length})
              </Text>
            </View>

            <Text style={styles.lessonsSectionSubtitle}>
              Tap a lesson to view it immediately on the map:
            </Text>

            {resolvedLessons.length === 0 ? (
              <View style={styles.emptyLessonsBox}>
                <Ionicons name="book-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptyLessonsText}>Check your lesson map for today's updates!</Text>
              </View>
            ) : (
              resolvedLessons.map((lesson, idx) => {
                const isLocked = lesson.locked;
                const isDone = lesson.done;

                return (
                  <Pressable
                    key={`${lesson.id}_${idx}`}
                    onPress={() => handleLessonClick(lesson)}
                    style={({ pressed }) => [
                      styles.lessonCard,
                      isLocked && styles.lessonCardLocked,
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <View
                      style={[
                        styles.lessonIconBox,
                        { backgroundColor: isLocked ? '#E2E8F0' : `${lesson.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={isLocked ? 'lock-closed' : isDone ? 'checkmark-circle' : 'book'}
                        size={22}
                        color={isLocked ? '#64748B' : isDone ? '#10B981' : lesson.color}
                      />
                    </View>

                    <View style={styles.lessonDetails}>
                      <View style={styles.lessonTitleRow}>
                        <Text
                          style={[styles.lessonTitle, isLocked && styles.lessonTitleLocked]}
                          numberOfLines={1}
                        >
                          {lesson.title}
                        </Text>
                      </View>

                      {/* Lock explanation or XP/duration chips */}
                      {isLocked ? (
                        <View style={styles.lockedHelperRow}>
                          <Text style={styles.lockedHelperText}>
                            🔒 Complete first lessons to unlock today's assignment!
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.metaRow}>
                          <View style={styles.metaChip}>
                            <Ionicons name="star" size={11} color="#F59E0B" />
                            <Text style={styles.metaChipText}>+{lesson.xp} XP</Text>
                          </View>
                          <View style={styles.metaChip}>
                            <Ionicons name="time-outline" size={11} color="#64748B" />
                            <Text style={styles.metaChipText}>{lesson.duration}</Text>
                          </View>
                          {isDone && (
                            <View style={[styles.metaChip, styles.metaChipDone]}>
                              <Ionicons name="checkmark" size={11} color="#059669" />
                              <Text style={styles.metaChipDoneText}>Completed</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Action Arrow / Button */}
                    <View
                      style={[
                        styles.actionPill,
                        isLocked ? styles.actionPillLocked : styles.actionPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionPillText,
                          isLocked ? styles.actionPillTextLocked : styles.actionPillTextActive,
                        ]}
                      >
                        {isLocked ? 'Locked' : 'Start'}
                      </Text>
                      <Ionicons
                        name={isLocked ? 'lock-closed' : 'arrow-forward'}
                        size={13}
                        color={isLocked ? '#94A3B8' : '#FFFFFF'}
                      />
                    </View>
                  </Pressable>
                );
              })
            )}

            {/* Helpful tip box */}
            <View style={styles.tipCard}>
              <Ionicons name="information-circle" size={18} color="#2563EB" />
              <Text style={styles.tipText}>
                Tip: You can re-open this list anytime by tapping this notification in your Notifications bell!
              </Text>
            </View>
          </ScrollView>

          {/* Bottom dismiss button */}
          <View style={styles.footerContainer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.dismissButton,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.dismissButtonText}>Close Announcement</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 50, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: Math.min(SCREEN_WIDTH - 32, 420),
    maxHeight: SCREEN_HEIGHT * 0.86,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 24,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  announcementTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  announcementTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  todayTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  pulsingGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  todayTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerDate: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  contentScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.56,
  },
  contentScrollContainer: {
    padding: 20,
  },
  messageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  messageSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  senderAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D326B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: '#1E293B',
  },
  lessonsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  lessonsSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0D326B',
    letterSpacing: 0.6,
  },
  lessonsSectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 12,
  },
  emptyLessonsBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyLessonsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 8,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lessonCardLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.9,
  },
  lessonIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lessonDetails: {
    flex: 1,
  },
  lessonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  lessonTitleLocked: {
    color: '#64748B',
  },
  lockedHelperRow: {
    marginTop: 4,
  },
  lockedHelperText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '700',
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    gap: 3,
  },
  metaChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  metaChipDone: {
    backgroundColor: '#ECFDF5',
  },
  metaChipDoneText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  actionPillActive: {
    backgroundColor: '#1E63B8',
  },
  actionPillLocked: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  actionPillTextActive: {
    color: '#FFFFFF',
  },
  actionPillTextLocked: {
    color: '#64748B',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
    lineHeight: 16,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  dismissButton: {
    backgroundColor: '#0D326B',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
