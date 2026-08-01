// hooks/useSound.ts
import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { useSettings } from '../contexts/SettingsContext';

export const useSound = (soundFile: any, options?: { volume?: number }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const { settings } = useSettings();
    const [isLoading, setIsLoading] = useState(false);

    const play = async () => {
        // ✅ Check if sound is enabled
        if (!settings.soundEnabled) {
            console.log('🔇 Sound disabled, skipping sound');
            return false;
        }

        try {
            setIsLoading(true);
            if (sound) {
                await sound.unloadAsync();
            }
            const { sound: newSound } = await Audio.Sound.createAsync(
                soundFile,
                {
                    shouldPlay: true,
                    isLooping: false,
                    volume: options?.volume ?? 0.8,
                }
            );
            setSound(newSound);
            setIsLoading(false);
            return true;
        } catch (error) {
            console.error('Failed to play sound:', error);
            setIsLoading(false);
            return false;
        }
    };

    const unload = async () => {
        if (sound) {
            await sound.unloadAsync();
            setSound(null);
        }
    };

    useEffect(() => {
        return () => {
            unload();
        };
    }, [sound]);

    return { play, unload, isLoading };
};