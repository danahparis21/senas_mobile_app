// hooks/usePracticeTimeTracker.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { api } from '../services/api';

const FLUSH_INTERVAL_MS = 30 * 1000; // check for a completed minute every 30s
const MS_PER_MINUTE = 60 * 1000;

/**
 * Tracks minutes spent on a gesture-practice or lesson screen and reports
 * them toward the daily challenge's "Practice Time" goal.
 *
 * Drop this into any screen that counts as FSL learning/practice time:
 *
 *   export default function SomeGestureScreen() {
 *     const router = useRouter();
 *     usePracticeTimeTracker();
 *     ...
 *
 * How it works:
 * - Starts counting the moment the screen mounts.
 * - Pauses while the app is backgrounded (locked screen, switched app,
 *   phone call) so idle time isn't counted as practice.
 * - Reports completed minutes periodically while the screen stays open, and
 *   flushes whatever's left when the screen unmounts — so it doesn't matter
 *   whether the student taps back, finishes and gets routed to a results
 *   screen, or navigates away some other way.
 * - Fails silently on network errors — practice time is a nice-to-have and
 *   should never interrupt or error out the screen it's used on.
 */
export function usePracticeTimeTracker() {
    const activeSince = useRef<number | null>(null);
    const unreportedMs = useRef(0);

    useEffect(() => {
        activeSince.current = Date.now();

        const bankElapsed = () => {
            if (activeSince.current !== null) {
                unreportedMs.current += Date.now() - activeSince.current;
                activeSince.current = null;
            }
        };

        // Reports any completed whole minutes and keeps the remainder for
        // next time. `finalFlush` = screen is unmounting, don't resume.
        const report = (finalFlush = false) => {
            bankElapsed();

            const minutes = Math.floor(unreportedMs.current / MS_PER_MINUTE);
            if (minutes >= 1) {
                unreportedMs.current -= minutes * MS_PER_MINUTE;
                api.trackChallengeTime(minutes).catch((err: any) => {
                    console.log('⏱️ Practice time not recorded:', err?.message);
                });
            }

            if (!finalFlush) {
                activeSince.current = Date.now();
            }
        };

        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                activeSince.current = Date.now();
            } else {
                report();
            }
        };

        const interval = setInterval(() => report(), FLUSH_INTERVAL_MS);
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            clearInterval(interval);
            subscription.remove();
            report(true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}