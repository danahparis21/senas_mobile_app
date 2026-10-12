import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { subscribeToNotificationReceived } from '../services/pushNotifications';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'achievement' | 'promotion' | 'lesson' | 'streak' | 'system';
  is_read: boolean;
  created_at: string;
  data?: any;
  action_url?: string;
}

export interface NewLessonAlert {
  id: string;
  title: string;
  message: string;
  lessonId: string;
  moduleId?: string;
}

interface LessonNotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  activeLessonAlert: NewLessonAlert | null;
  dismissLessonAlert: () => void;
  refreshNotifications: (forceRefresh?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const LessonNotificationContext = createContext<LessonNotificationContextType>({
  notifications: [],
  unreadCount: 0,
  activeLessonAlert: null,
  dismissLessonAlert: () => {},
  refreshNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

const STORAGE_KEYS = {
  NOTIFICATIONS_CACHE: 'notificationsCache',
  KNOWN_LESSON_IDS: 'known_lesson_ids',
  KNOWN_NOTIF_IDS: 'known_notif_ids',
};

const getStudentKey = (base: string, studentId?: string | null) =>
  studentId ? `${base}_${studentId}` : base;

export const LessonNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeLessonAlert, setActiveLessonAlert] = useState<NewLessonAlert | null>(null);

  const isFetchingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const knownLessonIdsRef = useRef<Set<string>>(new Set());
  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  const currentStudentIdRef = useRef<string | null>(null);

  // Helper to safely get student ID
  const getStudentId = async (): Promise<string | null> => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const studentId = user?.student?.id || user?.student?.student_id;
        if (studentId) {
          const strId = String(studentId);
          currentStudentIdRef.current = strId;
          return strId;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // Load previously seen IDs from storage
  const loadStoredKnownIds = async (studentId: string | null) => {
    try {
      const lessonKey = getStudentKey(STORAGE_KEYS.KNOWN_LESSON_IDS, studentId);
      const notifKey = getStudentKey(STORAGE_KEYS.KNOWN_NOTIF_IDS, studentId);

      const [storedLessons, storedNotifs] = await Promise.all([
        AsyncStorage.getItem(lessonKey),
        AsyncStorage.getItem(notifKey),
      ]);

      if (storedLessons) {
        const ids: string[] = JSON.parse(storedLessons);
        ids.forEach((id) => knownLessonIdsRef.current.add(String(id)));
      }
      if (storedNotifs) {
        const ids: string[] = JSON.parse(storedNotifs);
        ids.forEach((id) => knownNotifIdsRef.current.add(String(id)));
      }
    } catch {
      // Gracefully ignore storage load errors
    }
  };

  // Persist known IDs
  const persistKnownIds = async (studentId: string | null) => {
    try {
      const lessonKey = getStudentKey(STORAGE_KEYS.KNOWN_LESSON_IDS, studentId);
      const notifKey = getStudentKey(STORAGE_KEYS.KNOWN_NOTIF_IDS, studentId);

      await Promise.all([
        AsyncStorage.setItem(lessonKey, JSON.stringify(Array.from(knownLessonIdsRef.current))),
        AsyncStorage.setItem(notifKey, JSON.stringify(Array.from(knownNotifIdsRef.current))),
      ]);
    } catch {
      // Gracefully ignore storage save errors
    }
  };

  // Main check function
  const checkNewLessonsAndNotifications = useCallback(async (forceRefresh: boolean = false) => {
    if (isFetchingRef.current) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      isFetchingRef.current = true;

      let studentId = currentStudentIdRef.current;
      if (!studentId) {
        studentId = await getStudentId();
      }

      // Ensure storage is loaded once
      if (!isInitializedRef.current) {
        await loadStoredKnownIds(studentId);
      }

      // 1. Check notifications
      const notifResponse = await api.getNotifications(forceRefresh);
      if (notifResponse && !notifResponse.unauthenticated && notifResponse.success) {
        const freshNotifs: NotificationItem[] = notifResponse.notifications || [];
        setNotifications(freshNotifs);
        setUnreadCount(notifResponse.unread_count || 0);

        if (!isInitializedRef.current) {
          // On first launch of app, mark all existing notifications as known so we don't alert for past ones
          freshNotifs.forEach((n) => knownNotifIdsRef.current.add(String(n.id)));
        } else {
          // Only alert for NEW unread lesson notifications that arrived after initialization
          const newLessonNotif = freshNotifs.find((n) => {
            const nId = String(n.id);
            return n.type === 'lesson' && !n.is_read && !knownNotifIdsRef.current.has(nId);
          });

          if (newLessonNotif) {
            const notifIdStr = String(newLessonNotif.id);
            knownNotifIdsRef.current.add(notifIdStr);

            let data = newLessonNotif.data;
            if (typeof data === 'string') {
              try { data = JSON.parse(data); } catch {}
            }
            const lessonId = String(data?.lesson_id || (newLessonNotif as any).lesson_id || '');
            const moduleId = data?.module_id ? String(data.module_id) : undefined;

            if (lessonId) {
              knownLessonIdsRef.current.add(lessonId);
              setActiveLessonAlert({
                id: notifIdStr,
                title: newLessonNotif.title || 'New Lesson Available!',
                message: newLessonNotif.message || 'A new lesson is ready for you.',
                lessonId,
                moduleId,
              });
            }
          }
        }
      }

      // 2. Check student lessons for newly published lessons
      const lessonsResponse = await api.getStudentLessons(null, forceRefresh);
      if (lessonsResponse && !lessonsResponse.unauthenticated && lessonsResponse.success && lessonsResponse.modules) {
        const allLessonList: any[] = [];
        for (const mod of lessonsResponse.modules) {
          if (Array.isArray(mod.lessons)) {
            for (const l of mod.lessons) {
              allLessonList.push({ ...l, module_id: l.module_id || mod.module_id });
            }
          }
        }

        if (!isInitializedRef.current) {
          // On first launch, mark all current lessons as known so we don't alert for existing ones
          allLessonList.forEach((l) => knownLessonIdsRef.current.add(String(l.lesson_id)));
          isInitializedRef.current = true;
          await persistKnownIds(studentId);
        } else {
          // Subsequent checks: alert if a brand new pending lesson was added by teacher
          const newlyPublished = allLessonList.filter((l) => {
            const lid = String(l.lesson_id);
            const isUnseen = lid && !knownLessonIdsRef.current.has(lid);
            // Skip if student already started or completed this lesson
            const isAlreadyDone = l.status === 'completed' || (l.progress && l.progress.current_step > 0);
            return isUnseen && !isAlreadyDone;
          });

          if (newlyPublished.length > 0) {
            const newest = newlyPublished[newlyPublished.length - 1];
            const newId = String(newest.lesson_id);
            knownLessonIdsRef.current.add(newId);
            await persistKnownIds(studentId);

            setActiveLessonAlert({
              id: `new_lesson_${newId}`,
              title: 'New Lesson Uploaded!',
              message: `"${newest.title}" was just uploaded by your teacher. Tap to start!`,
              lessonId: newId,
              moduleId: newest.module_id ? String(newest.module_id) : undefined,
            });

            setUnreadCount((c) => c + 1);
          }
        }
      }
    } catch {
      // Quietly catch background poll errors so terminal is never spammed
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const dismissLessonAlert = useCallback(() => {
    setActiveLessonAlert(null);
  }, []);

  const refreshNotifications = useCallback(
    async (forceRefresh: boolean = true) => {
      api.clearCache('/student/notifications');
      api.clearCache('/student/lessons');
      await checkNewLessonsAndNotifications(forceRefresh);
    },
    [checkNewLessonsAndNotifications]
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const idStr = String(notificationId);
      await api.markNotificationRead(idStr);
      setNotifications((prev) =>
        prev.map((n) => (String(n.id) === idStr ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Graceful error handling
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Graceful error handling
    }
  }, []);

  // Set up periodic polling & foreground listeners
  useEffect(() => {
    // Initial fetch
    checkNewLessonsAndNotifications(false);

    // ── Background poller: runs every 20 seconds when active (lightweight & clean) ──
    const interval = setInterval(() => {
      checkNewLessonsAndNotifications(true);
    }, 20000);

    // App state listener (poll when returning to foreground)
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkNewLessonsAndNotifications(true);
      }
    });

    // Push notification received in foreground
    const unsubPush = subscribeToNotificationReceived(() => {
      checkNewLessonsAndNotifications(true);
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
      unsubPush();
    };
  }, [checkNewLessonsAndNotifications]);

  return (
    <LessonNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeLessonAlert,
        dismissLessonAlert,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </LessonNotificationContext.Provider>
  );
};

export const useLessonNotification = () => useContext(LessonNotificationContext);
