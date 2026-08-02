import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get API URL from app.json extra
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000/api';

console.log('🌐 API URL:', API_URL);

export const api = {
    login: async (lrn, pin) => {
        try {
            console.log(`📤 Attempting login to: ${API_URL}/student/login`);
            console.log(`📋 LRN: ${lrn}, PIN: ${pin}`);

            const response = await fetch(`${API_URL}/student/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ lrn, pin }),
            });

            const data = await response.json();
            console.log('✅ Login response:', data);

            if (!response.ok) {
                // ✅ REMOVED the scary console.error here
                // console.error('❌ Login error:', data.message || 'Login failed');
                throw new Error(data.message || 'Login failed');
            }

            if (data.token) {
                await AsyncStorage.setItem('userToken', data.token);
                await AsyncStorage.setItem('userData', JSON.stringify(data.user));

                // ✅ Store profile picture separately for quick access
                if (data.user?.student?.profile_picture) {
                    await AsyncStorage.setItem('userAvatar', data.user.student.profile_picture);
                }
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    getProfile: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            const response = await fetch(`${API_URL}/student/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch profile');
            }

            return data;
        } catch (error) {
            console.error('❌ Profile fetch error:', error);
            throw error;
        }
    },

    logout: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (token) {
                await fetch(`${API_URL}/student/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
            }

            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            console.log('👋 Logged out successfully');
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    },

    updateFSLMasteryLevel: async (level) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            const response = await fetch(`${API_URL}/student/update-level`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fsl_mastery_level: level }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update level');
            }

            return data;
        } catch (error) {
            console.error('❌ Error updating level:', error);
            throw error;
        }
    },

    saveLearningPath: async (data) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            const response = await fetch(`${API_URL}/student/save-learning-path`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to save learning path');
            }

            return result;
        } catch (error) {
            console.error('❌ Error saving learning path:', error);
            throw error;
        }
    },

    getLearningPath: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            const response = await fetch(`${API_URL}/student/learning-path`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            console.log('✅ Get learning path response:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Failed to get learning path');
            }

            return data;
        } catch (error) {
            console.error('❌ Error getting learning path:', error);
            throw error;
        }
    },

    getStudentLessons: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('📚 Fetching student lessons...');

            const response = await fetch(`${API_URL}/student/lessons`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('✅ Get lessons response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch lessons');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching lessons:', error);
            throw error;
        }
    },

    // NEW: Get personalized "My Learning Path" lessons (adaptive, based on
    // learning_goal/fsl_level/performance). Sequencing/locking here is
    // separate from getStudentLessons() and does not affect module locks.
    getRecommendedLessons: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('🎯 Fetching My Learning Path lessons...');

            const response = await fetch(`${API_URL}/student/learning-path/lessons`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('✅ Get learning path lessons response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch learning path lessons');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching learning path lessons:', error);
            throw error;
        }
    },

    // NEW: Get all lessons as flat list for dashboard
    getAllLessons: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('📚 Fetching all lessons for dashboard...');

            const response = await fetch(`${API_URL}/student/all-lessons`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('✅ Get all lessons response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch lessons');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching all lessons:', error);
            throw error;
        }
    },

    getLessonById: async (lessonId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📚 Fetching lesson ${lessonId}...`);

            const response = await fetch(`${API_URL}/student/lesson/${lessonId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch lesson');
            }

            return data;
        } catch (error) {
            console.error(`❌ Error fetching lesson ${lessonId}:`, error);
            throw error;
        }
    },

    updateLessonProgress: async (lessonId, progressData) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📝 Updating progress for lesson ${lessonId}...`);

            const response = await fetch(`${API_URL}/student/lesson/${lessonId}/progress`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(progressData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update progress');
            }

            return data;
        } catch (error) {
            console.error(`❌ Error updating progress for lesson ${lessonId}:`, error);
            throw error;
        }
    },

    submitQuizAttempt: async (lessonId, quizData) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📝 Submitting quiz for lesson ${lessonId}...`);

            const response = await fetch(`${API_URL}/student/lesson/${lessonId}/quiz/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(quizData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to submit quiz');
            }

            return data;
        } catch (error) {
            console.error(`❌ Error submitting quiz for lesson ${lessonId}:`, error);
            throw error;
        }
    },

    awardSlideXp: async (lessonId, slideIndex) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📝 Awarding XP for slide ${slideIndex} in lesson ${lessonId}...`);

            const response = await fetch(`${API_URL}/student/lesson/${lessonId}/slide-xp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ slide_index: slideIndex }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to award slide XP');
            }

            return data;
        } catch (error) {
            console.error(`❌ Error awarding slide XP for lesson ${lessonId}:`, error);
            throw error;
        }
    },

    // ✅ FIXED: Changed from "ggetAttempts" to "getAttempts"
    getAttempts: async (lessonId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) throw new Error('No token found');

            console.log(`📊 Fetching attempts for lesson ${lessonId}...`);

            const response = await fetch(`${API_URL}/student/lesson/${lessonId}/attempts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch attempts');
            return data;
        } catch (error) {
            console.error('❌ Error fetching attempts:', error);
            throw error;
        }
    },
    getLessonLeaderboard: async (lessonId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) throw new Error('No token found');

            console.log(`🏆 Fetching leaderboard for lesson ${lessonId}...`);

            const response = await fetch(`${API_URL}/student/lesson/${lessonId}/leaderboard`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('🏆 Leaderboard response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch leaderboard');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching leaderboard:', error);
            throw error;
        }
    },

    /**
 * Save student's gesture performance from practice sessions
 */
    saveGesturePerformance: async (moduleName, letterPerformances, sessionId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📤 Saving gesture performance for module: ${moduleName}...`);

            const payload = {
                module_name: moduleName,
                letter_performances: letterPerformances,
                session_id: sessionId || `session_${Date.now()}`,
            };

            const response = await fetch(`${API_URL}/student/gesture-performance`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log('✅ Gesture performance saved:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to save gesture performance');
            }

            return data;
        } catch (error) {
            console.error('❌ Error saving gesture performance:', error);
            throw error;
        }
    },

    /**
     * Get student's gesture performance for a specific module
     */
    getGesturePerformance: async (moduleName) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📊 Fetching gesture performance for module: ${moduleName}...`);

            const response = await fetch(`${API_URL}/student/gesture-performance?module_name=${moduleName}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch gesture performance');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching gesture performance:', error);
            throw error;
        }
    },

    /**
     * Get struggling letters for recommendations
     */
    getStrugglingLetters: async (moduleName) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            const url = moduleName
                ? `${API_URL}/student/struggling-letters?module_name=${moduleName}`
                : `${API_URL}/student/struggling-letters`;

            console.log(`📊 Fetching struggling letters...`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch struggling letters');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching struggling letters:', error);
            throw error;
        }
    },

    /**
    * Get student's gesture module progress and XP for the dashboard
    */
    getGestureProgress: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('📊 Fetching gesture progress...');

            const response = await fetch(`${API_URL}/student/gesture-progress`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch gesture progress');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching gesture progress:', error);
            throw error;
        }
    },

    /**
     * Award XP for completing a module
     */
    awardModuleXp: async (moduleName, xpEarned) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`⭐ Awarding ${xpEarned} XP for ${moduleName}...`);

            const response = await fetch(`${API_URL}/student/award-module-xp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    module_name: moduleName,
                    xp_earned: xpEarned,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to award XP');
            }

            console.log('✅ XP awarded:', data);
            return data;
        } catch (error) {
            console.error('❌ Error awarding XP:', error);
            throw error;
        }
    },

    /**
     * Award XP for completing a gesture module
     */
    awardModuleXp: async (moduleName, starRating) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`⭐ Awarding XP for ${moduleName} with ${starRating} star(s)...`);

            const response = await fetch(`${API_URL}/student/award-module-xp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    module_name: moduleName,
                    star_rating: starRating,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to award XP');
            }

            return data;
        } catch (error) {
            console.error('❌ Error awarding XP:', error);
            throw error;
        }
    },

    /**
   * Get weak signs for a student
   */
    getWeakSigns: async (moduleName) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📊 Calling API: ${API_URL}/student/weak-signs?module_name=${moduleName}`);

            const response = await fetch(`${API_URL}/student/weak-signs?module_name=${moduleName}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('📊 Weak signs API response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch weak signs');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching weak signs:', error);
            throw error;
        }
    },

    /**
 * Award XP for challenge mode (no cap)
 */
    awardChallengeXp: async (moduleName, xpEarned, starRating) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`⭐ Awarding Challenge XP for ${moduleName} with ${starRating} star(s)...`);

            const response = await fetch(`${API_URL}/student/award-challenge-xp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    module_name: moduleName,
                    xp_earned: xpEarned,
                    star_rating: starRating,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to award challenge XP');
            }

            return data;
        } catch (error) {
            console.error('❌ Error awarding challenge XP:', error);
            throw error;
        }
    },

    /**
     * 🎯 Check if student has a pending promotion
     * GET /api/student/promotion
     */
    checkPromotion: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('🎯 Checking for pending promotion...');

            const response = await fetch(`${API_URL}/student/promotion`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('🎯 Promotion check response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to check promotion');
            }

            return data;
        } catch (error) {
            console.error('❌ Error checking promotion:', error);
            throw error;
        }
    },

    /**
     * 🎯 Mark promotion as viewed
     * POST /api/student/promotion/{id}/viewed
     */
    markPromotionViewed: async (promotionId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`🎯 Marking promotion ${promotionId} as viewed...`);

            const response = await fetch(`${API_URL}/student/promotion/${promotionId}/viewed`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('✅ Promotion marked as viewed:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to mark promotion as viewed');
            }

            return data;
        } catch (error) {
            console.error('❌ Error marking promotion as viewed:', error);
            throw error;
        }
    },

    /**
     * 🎯 Get promotion history
     * GET /api/student/promotion/history
     */
    getPromotionHistory: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('📜 Fetching promotion history...');

            const response = await fetch(`${API_URL}/student/promotion/history`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('📜 Promotion history response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch promotion history');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching promotion history:', error);
            throw error;
        }
    },

    /**
     * 🎯 Check if student has pending promotion (lightweight)
     * GET /api/student/promotion/status
     */
    hasPendingPromotion: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('🔍 Checking pending promotion status...');

            const response = await fetch(`${API_URL}/student/promotion/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('🔍 Promotion status response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to check promotion status');
            }

            return data;
        } catch (error) {
            console.error('❌ Error checking promotion status:', error);
            throw error;
        }
    },

    /**
 * 🎯 Get promotion details by ID
 * GET /api/student/promotion/{id}
 */
    getPromotionDetails: async (promotionId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📜 Fetching promotion details for ID: ${promotionId}`);

            const response = await fetch(`${API_URL}/student/promotion/${promotionId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('📜 Promotion details response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch promotion details');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching promotion details:', error);
            throw error;
        }
    },

    // ============================================================
    // 🏆 ACHIEVEMENTS API METHODS
    // ============================================================

    /**
     * Get all achievements with unlock status for the student
     * GET /api/student/achievements
     */
    getAchievements: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('🏆 Fetching achievements...');

            const response = await fetch(`${API_URL}/student/achievements`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('🏆 Achievements response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch achievements');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching achievements:', error);
            throw error;
        }
    },

    /**
     * Get only unlocked achievements
     * GET /api/student/achievements/unlocked
     */
    getUnlockedAchievements: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('🏆 Fetching unlocked achievements...');

            const response = await fetch(`${API_URL}/student/achievements/unlocked`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch unlocked achievements');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching unlocked achievements:', error);
            throw error;
        }
    },

    /**
     * Manually trigger achievement check (after level up, etc.)
     * POST /api/student/achievements/check
     */
    checkAchievements: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('🏆 Checking for newly unlocked achievements...');

            const response = await fetch(`${API_URL}/student/achievements/check`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('🏆 Achievement check response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to check achievements');
            }

            return data;
        } catch (error) {
            console.error('❌ Error checking achievements:', error);
            throw error;
        }
    },

    /**
 * Get student's current streak
 * GET /api/student/streak
 */
    getStreak: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            const response = await fetch(`${API_URL}/student/streak`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch streak');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching streak:', error);
            throw error;
        }
    },
    /**
 * Update student's profile picture
 * POST /api/student/update-profile-picture
 */
    updateProfilePicture: async (profilePicture) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`🎨 Updating profile picture to: ${profilePicture}`);

            const response = await fetch(`${API_URL}/student/update-profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ profile_picture: profilePicture }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to update profile picture');
            }

            // Update stored user data with new profile picture
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
                const user = JSON.parse(userData);
                user.student.profile_picture = profilePicture;
                await AsyncStorage.setItem('userData', JSON.stringify(user));
            }

            return data;
        } catch (error) {
            console.error('❌ Error updating profile picture:', error);
            throw error;
        }
    },

    /**
     * Award XP for custom/input mode (1 XP per letter, no cap)
     */
    awardCustomXp: async (moduleName, xpEarned, starRating) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📝 Awarding Custom XP for ${moduleName}: ${xpEarned} XP`);

            const response = await fetch(`${API_URL}/student/award-custom-xp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    module_name: moduleName,
                    xp_earned: xpEarned,
                    star_rating: starRating,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to award custom XP');
            }

            return data;
        } catch (error) {
            console.error('❌ Error awarding custom XP:', error);
            throw error;
        }
    },
    /**
     * Get all notifications for the student
     * GET /api/student/notifications
     */
    getNotifications: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('📬 Fetching notifications...');

            const response = await fetch(`${API_URL}/student/notifications`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('📬 Notifications response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch notifications');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching notifications:', error);
            throw error;
        }
    },

    /**
     * Mark a notification as read
     * POST /api/student/notifications/{id}/read
     */
    markNotificationRead: async (notificationId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📬 Marking notification ${notificationId} as read...`);

            const response = await fetch(`${API_URL}/student/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to mark notification as read');
            }

            return data;
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
            throw error;
        }
    },

    /**
     * Mark all notifications as read
     * POST /api/student/notifications/read-all
     */
    markAllNotificationsRead: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('📬 Marking all notifications as read...');

            const response = await fetch(`${API_URL}/student/notifications/read-all`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to mark all notifications as read');
            }

            return data;
        } catch (error) {
            console.error('❌ Error marking all notifications as read:', error);
            throw error;
        }
    },

    /**
 * Save multiple notifications for the student
 * POST /api/student/notifications/save
 */
    saveNotifications: async (notifications) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('📬 Saving notifications...');

            const response = await fetch(`${API_URL}/student/notifications/save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ notifications }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to save notifications');
            }

            return data;
        } catch (error) {
            console.error('❌ Error saving notifications:', error);
            throw error;
        }
    },

    /**
     * 🎯 Get today's daily challenge
     * GET /api/student/daily-challenge
     */
    getDailyChallenge: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('🎯 Fetching daily challenge...');

            const response = await fetch(`${API_URL}/student/daily-challenge`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('🎯 Daily challenge response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch daily challenge');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching daily challenge:', error);
            throw error;
        }
    },

    /**
     * 🎯 Update a goal's progress
     * POST /api/student/daily-challenge/progress
     */
    updateChallengeProgress: async (goalId, incrementBy) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`🎯 Updating challenge progress for goal: ${goalId} (+${incrementBy})...`);

            const response = await fetch(`${API_URL}/student/daily-challenge/progress`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    goal_id: goalId,
                    increment_by: incrementBy,
                }),
            });

            const data = await response.json();
            console.log('🎯 Challenge progress update response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to update challenge progress');
            }

            return data;
        } catch (error) {
            console.error('❌ Error updating challenge progress:', error);
            throw error;
        }
    },

    /**
     * 🎯 Track time spent in gesture practice (for time goal)
     * POST /api/student/daily-challenge/track-time
     */
    trackChallengeTime: async (minutesSpent) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`⏱️ Tracking challenge time: ${minutesSpent} minutes...`);

            const response = await fetch(`${API_URL}/student/daily-challenge/track-time`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    minutes_spent: minutesSpent,
                }),
            });

            const data = await response.json();
            console.log('⏱️ Challenge time tracking response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to track challenge time');
            }

            return data;
        } catch (error) {
            console.error('❌ Error tracking challenge time:', error);
            throw error;
        }
    },


    /**
  * Get student settings
  * GET /api/student/settings
  */
    getSettings: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('⚙️ Fetching student settings...');

            const response = await fetch(`${API_URL}/student/settings`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('⚙️ Settings response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch settings');
            }

            // 🔥 Convert snake_case from backend to camelCase for frontend
            if (data.success && data.settings) {
                return {
                    success: data.success,
                    settings: {
                        soundEnabled: data.settings.sound_enabled ?? true,
                        notificationsEnabled: data.settings.notifications_enabled ?? true,
                    }
                };
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching settings:', error);
            // Return default settings on error
            return {
                success: false,
                settings: {
                    soundEnabled: true,
                    notificationsEnabled: true,
                }
            };
        }
    },

    /**
 * Update student settings
 * POST /api/student/settings
 */
    updateSettings: async (settings) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('⚙️ Updating settings (frontend):', settings);

            // 🔥 Convert camelCase to snake_case for backend
            const payload = {};
            if (settings.soundEnabled !== undefined) {
                payload.sound_enabled = settings.soundEnabled;
            }
            if (settings.notificationsEnabled !== undefined) {
                payload.notifications_enabled = settings.notificationsEnabled;
            }

            console.log('⚙️ Sending payload (backend):', payload);

            const response = await fetch(`${API_URL}/student/settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log('⚙️ Settings update response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to update settings');
            }

            return data;
        } catch (error) {
            console.error('❌ Error updating settings:', error);
            throw error;
        }
    },


    // Add to your api object in api.js

    /**
     * 🎯 Get adaptive learning path recommendations
     * GET /api/student/adaptive-lessons
     */
    getAdaptiveLessons: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('🧠 Fetching adaptive lessons...');

            const response = await fetch(`${API_URL}/student/adaptive-lessons`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('🧠 Adaptive lessons response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch adaptive lessons');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching adaptive lessons:', error);
            throw error;
        }
    },

    /**
     * 📊 Get detailed mastery data for the student
     * GET /api/student/mastery
     */
    getMasteryData: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('📊 Fetching mastery data...');

            const response = await fetch(`${API_URL}/student/mastery`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('📊 Mastery data response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch mastery data');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching mastery data:', error);
            throw error;
        }
    },

    /**
     * 🎯 Update mastery after a practice session (real-time)
     * POST /api/student/mastery/update
     */
    updateMasteryAfterPractice: async (gestureId, attempts, successes) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`🎯 Updating mastery for gesture ${gestureId}...`);

            const response = await fetch(`${API_URL}/student/mastery/update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    gesture_id: gestureId,
                    attempts: attempts,
                    successes: successes,
                }),
            });

            const data = await response.json();
            console.log('🎯 Mastery update response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to update mastery');
            }

            return data;
        } catch (error) {
            console.error('❌ Error updating mastery:', error);
            throw error;
        }
    },
    /**
     * 📝 Get all checkpoint exams for the student
     * GET /api/student/checkpoint-exams
     */
    getCheckpointExams: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log('📝 Fetching checkpoint exams...');

            const response = await fetch(`${API_URL}/student/checkpoint-exams`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('📝 Checkpoint exams response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch checkpoint exams');
            }

            return data;
        } catch (error) {
            console.error('❌ Error fetching checkpoint exams:', error);
            throw error;
        }
    },

    /**
     * 📝 Get a specific checkpoint exam with all questions
     * GET /api/student/checkpoint-exam/{examId}
     */
    getCheckpointExamById: async (examId) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📝 Fetching checkpoint exam ${examId}...`);

            const response = await fetch(`${API_URL}/student/checkpoint-exam/${examId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();
            console.log('📝 Checkpoint exam response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch checkpoint exam');
            }

            return data;
        } catch (error) {
            console.error(`❌ Error fetching checkpoint exam ${examId}:`, error);
            throw error;
        }
    },

    /**
     * 📝 Submit a checkpoint exam
     * POST /api/student/checkpoint-exam/{examId}/submit
     */
    submitCheckpointExam: async (examId, answers) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                throw new Error('No token found. Please login first.');
            }

            console.log(`📝 Submitting checkpoint exam ${examId}...`);

            const response = await fetch(`${API_URL}/student/checkpoint-exam/${examId}/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ answers }),
            });

            const data = await response.json();
            console.log('📝 Checkpoint exam submit response:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to submit checkpoint exam');
            }

            return data;
        } catch (error) {
            console.error(`❌ Error submitting checkpoint exam ${examId}:`, error);
            throw error;
        }
    },




};