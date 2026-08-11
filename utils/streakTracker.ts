import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Gets a unique identifier for the currently logged-in user account.
 */
export const getAccountKey = async (): Promise<string> => {
    try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
            const user = JSON.parse(userData);
            const accountId = user?.id || user?.student?.id || user?.student?.student_id || user?.email;
            if (accountId) return String(accountId);
        }
        const token = await AsyncStorage.getItem('userToken');
        if (token) return token;
    } catch (e) {
        console.error('Error getting account key for streak check:', e);
    }
    return 'default_user';
};

/**
 * Returns today's date string in YYYY-MM-DD format (local time).
 */
export const getTodayDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Checks whether the streak screen has already been shown today for the active user account.
 */
export const hasStreakBeenShownToday = async (): Promise<boolean> => {
    try {
        const accountKey = await getAccountKey();
        const today = getTodayDateString();
        const lastShownDate = await AsyncStorage.getItem(`STREAK_LAST_SHOWN_${accountKey}`);
        return lastShownDate === today;
    } catch (e) {
        console.error('Error checking if streak shown today:', e);
        return false;
    }
};

/**
 * Marks that the streak screen has been shown today for the active user account.
 */
export const markStreakShownToday = async (): Promise<void> => {
    try {
        const accountKey = await getAccountKey();
        const today = getTodayDateString();
        await AsyncStorage.setItem(`STREAK_LAST_SHOWN_${accountKey}`, today);
    } catch (e) {
        console.error('Error marking streak as shown today:', e);
    }
};
