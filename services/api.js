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
                throw new Error(data.message || 'Login failed');
            }

            if (data.token) {
                await AsyncStorage.setItem('userToken', data.token);
                await AsyncStorage.setItem('userData', JSON.stringify(data.user));
            }

            return data;
        } catch (error) {
            console.error('❌ Login error:', error);
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


};