// components/InfiniteModeTutorialModal.tsx
// Senya's "How Infinite Mode Works" tutorial.
import React from 'react';
import TutorialModal, { TutorialSlide } from './TutorialModal';

export const INFINITE_MODE_TUTORIAL_KEY = 'infinite_mode_tutorial_seen_v1';

// Import images
const INFINITE_MODE = require('../assets/images/img/tutorial/infinite.jpg');
const INFINITE_TIMER = require('../assets/images/img/tutorial/infinite-timer.jpg');
const INFINITE_BONUS = require('../assets/images/img/tutorial/inifinite-bonus.jpg');
const INFINITE_SCORE = require('../assets/images/img/tutorial/inifinite-score.jpg');

const SLIDES: TutorialSlide[] = [
    {
        id: 'welcome',
        title: 'Welcome to Infinite Mode ♾️',
        body: 'Same countdown-and-timer style as Master Mode, but this time there\'s no end in sight — keep signing for as long as you want!',
        image: INFINITE_MODE,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#0EA5E9', '#38BDF8'] as const,
        responseText: "Let's keep going and going! ♾️",
    },
    {
        id: 'timer',
        title: 'Countdown + 10 Seconds Per Sign ⏱',
        body: 'Each round starts with a countdown. Then you get 10 seconds to perform each sign that appears on screen.',
        image: INFINITE_TIMER,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#2563EB', '#60A5FA'] as const,
        responseText: 'Stay quick and ready! ⚡',
    },
    {
        id: 'speedBonus',
        title: 'Speed = Bonus Points ⚡',
        body: "The faster and more accurately you sign, the more bonus points you earn. Even signing a bit faster than usual gives you extra points!",
        image: INFINITE_BONUS,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#F59E0B', '#FBBF24'] as const,
        responseText: 'Speed pays off! ',
    },
    {
        id: 'endless',
        title: 'Keep Going Until You Finish ',
        body: 'Infinite Mode has no set ending — it keeps giving you signs to practice until you tap the Finish button whenever you\'re ready to stop.',
        icon: 'flag',
        iconColor: '#8B5CF6',
        gradient: ['#8B5CF6', '#A78BFA'] as const,
        responseText: "You're in control of when to stop!",
    },
    {
        id: 'scoring',
        title: 'Scored by Accuracy & Speed',
        body: 'Your final score is based on how many signs you were given and how many of them you completed correctly within the timer.',
        image: INFINITE_SCORE,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#10B981', '#34D399'] as const,
        responseText: "Let's set a new high score!"
    },
];

export default function InfiniteModeTutorialModal({
    visible,
    onClose,
}: {
    visible: boolean;
    onClose: () => void;
}) {
    return (
        <TutorialModal
            visible={visible}
            onClose={onClose}
            slides={SLIDES}
            seenStorageKey={INFINITE_MODE_TUTORIAL_KEY}
        />
    );
}