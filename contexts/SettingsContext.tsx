// contexts/SettingsContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface Settings {
    soundEnabled: boolean;
    notificationsEnabled: boolean;
}

interface SettingsContextType {
    settings: Settings;
    isLoading: boolean;
    refreshSettings: () => Promise<void>;
    updateSetting: (key: keyof Settings, value: boolean) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>({
        soundEnabled: true,
        notificationsEnabled: true,
    });
    const [isLoading, setIsLoading] = useState(true);
    const isMounted = useRef(true);

    // 🔥 Rate limiting refs
    const lastFetchTimeRef = useRef<number>(0);
    const isFetchingRef = useRef<boolean>(false);
    const MIN_FETCH_INTERVAL = 10000; // 10 seconds between fetches
    const errorCountRef = useRef<number>(0);
    const MAX_ERRORS = 3;

    // 🔥 Cache the settings locally to avoid API calls
    const cachedSettingsRef = useRef<Settings>({
        soundEnabled: true,
        notificationsEnabled: true,
    });

    const refreshSettings = useCallback(async () => {
        // 🔥 If too many errors, skip API calls
        if (errorCountRef.current >= MAX_ERRORS) {
            console.log('⚠️ Too many errors, using cached settings');
            return;
        }

        // 🔥 Prevent multiple simultaneous calls
        if (isFetchingRef.current) {
            console.log('⏳ Already fetching settings, skipping...');
            return;
        }

        // 🔥 Rate limiting
        const now = Date.now();
        if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL) {
            console.log('⏳ Skipping settings fetch - rate limited');
            return;
        }

        isFetchingRef.current = true;
        lastFetchTimeRef.current = now;

        try {
            console.log('🔄 Refreshing settings from API...');
            setIsLoading(true);

            const response = await api.getSettings();
            console.log('📥 Settings API response:', response);

            if (response.success && isMounted.current) {
                const newSettings = {
                    soundEnabled: response.settings.soundEnabled ?? true,
                    notificationsEnabled: response.settings.notificationsEnabled ?? true,
                };
                console.log('✅ New settings applied:', newSettings);
                setSettings(newSettings);
                cachedSettingsRef.current = newSettings;
                await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
                errorCountRef.current = 0; // Reset error count on success
            } else {
                // Use cached settings
                const cached = await AsyncStorage.getItem('userSettings');
                if (cached && isMounted.current) {
                    const parsed = JSON.parse(cached);
                    console.log('📦 Using cached settings:', parsed);
                    setSettings(parsed);
                    cachedSettingsRef.current = parsed;
                }
            }
        } catch (error: any) {
            errorCountRef.current += 1;
            console.warn(`⚠️ Error fetching settings (${errorCountRef.current}/${MAX_ERRORS}):`, error.message);

            // Use cached settings on error
            try {
                const cached = await AsyncStorage.getItem('userSettings');
                if (cached && isMounted.current) {
                    const parsed = JSON.parse(cached);
                    console.log('📦 Fallback to cached settings:', parsed);
                    setSettings(parsed);
                    cachedSettingsRef.current = parsed;
                }
            } catch (e) {
                // Keep defaults
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
            isFetchingRef.current = false;
        }
    }, []);

    const updateSetting = useCallback(async (key: keyof Settings, value: boolean) => {
        try {
            console.log(`🔄 Updating setting: ${key} = ${value}`);

            // 🔥 OPTIMISTIC UPDATE - update UI immediately
            const newSettings = { ...settings, [key]: value };
            setSettings(newSettings);
            cachedSettingsRef.current = newSettings;

            // Update cache immediately
            await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));

            // 🔥 Build payload
            const payload: Record<string, boolean> = {};
            if (key === 'soundEnabled') {
                payload.soundEnabled = value;
            } else {
                payload.notificationsEnabled = value;
            }

            // 🔥 Try to send to backend, but don't wait too long
            try {
                const response = await api.updateSettings(payload);
                console.log('📥 Update response:', response);

                if (response.success) {
                    console.log('✅ Settings confirmed:', newSettings);
                } else {
                    console.log('⚠️ Backend returned error, keeping optimistic update');
                }
            } catch (apiError: any) {
                // 🔥 SILENTLY HANDLE RATE LIMIT - don't log as error
                if (apiError.message?.includes('Too Many Attempts') ||
                    apiError.message?.includes('429') ||
                    apiError.message?.includes('rate limit')) {
                    // Silently handle - the optimistic update is already applied
                    console.log('⏳ Rate limit hit - using local update');
                } else {
                    // Log other errors
                    console.warn('API error:', apiError.message);
                }
                // 🔥 IMPORTANT: Don't throw the error - the UI already updated
            }

        } catch (error: any) {
            // 🔥 Only log real errors, not rate limit errors
            if (!error.message?.includes('Too Many Attempts') &&
                !error.message?.includes('429') &&
                !error.message?.includes('rate limit')) {
                console.error('Error updating setting:', error);
            } else {
                console.log('⏳ Rate limit - local update applied');
            }
            // Keep the optimistic update - the UI should remain responsive
        }
    }, [settings]);

    // Initial load
    useEffect(() => {
        // Try to load from cache first
        AsyncStorage.getItem('userSettings').then(cached => {
            if (cached && isMounted.current) {
                try {
                    const parsed = JSON.parse(cached);
                    console.log('📦 Loaded from cache:', parsed);
                    setSettings(parsed);
                    cachedSettingsRef.current = parsed;
                } catch (e) {
                    // Ignore
                }
            }
        });

        // Then try to refresh from API (with delay to avoid rate limit)
        setTimeout(() => {
            refreshSettings();
        }, 1000);

        return () => {
            isMounted.current = false;
        };
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, isLoading, refreshSettings, updateSetting }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};