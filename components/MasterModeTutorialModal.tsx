// components/MasterModeTutorialModal.tsx
// Senya's "How Master Mode Works" tutorial.
import React from 'react';
import TutorialModal, { TutorialSlide } from './TutorialModal';

export const MASTER_MODE_TUTORIAL_KEY = 'master_mode_tutorial_seen_v1';

// Import images
const MASTER_MODE = require('../assets/images/img/tutorial/mastermode.jpg');
const MASTER_TIMER = require('../assets/images/img/tutorial/master_timer.jpg');
const MASTER_CONTINUE = require('../assets/images/img/tutorial/master-continue.jpg');
const MASTER_EXP = require('../assets/images/img/tutorial/master-exp.jpg');
const MASTER_BONUS = require('../assets/images/img/tutorial/master-lightningfastBonus.jpg');
const MASTER_TWO = require('../assets/images/img/tutorial/master2.jpg');

const SLIDES: TutorialSlide[] = [
    {
        id: 'welcome',
        title: 'Welcome to Master Mode ',
        body: "This mode zeroes in on your weak signs. It looks at your results across all modules and gives you focused practice on exactly the signs you need to improve.",
        image: MASTER_MODE,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#8B5CF6', '#A78BFA'] as const,
        responseText: "Let's find your weak signs! ",
    },
    {
        id: 'bonus',
        title: 'Extra Bonus Points ⭐',
        body: "Getting a sign right in Master Mode earns you more bonus points than usual — since you're improving on your weakest signs, it pays off more.",
        image: MASTER_BONUS,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#F59E0B', '#FBBF24'] as const,
        responseText: "Bonus points, here we come! ",
    },
    {
        id: 'timer',
        title: 'Countdown + 10-Second Timer ⏱',
        body: "Each round starts with a countdown. Then you get 10 seconds per sign. Watch the top-left of your camera screen — that's where the list of signs to do appears.",
        image: MASTER_TIMER,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#2563EB', '#60A5FA'] as const,
        responseText: 'Watch the top-left for your next sign! 👀',
    },
    {
        id: 'repeat',
        title: 'Practice Until You Master It ',
        body: "Missed a sign, or ran out of time? No worries — it comes back around in the next round so you keep practicing that sign until you get it right.",
        image: MASTER_CONTINUE,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#EF4444', '#F87171'] as const,
        responseText: 'Every try makes you stronger! ',
    },
    {
        id: 'rewards',
        title: 'Bigger EXP Rewards ',
        body: "Master Mode gives more EXP than the regular gesture modules, since you're doing the hardest work of all — leveling up your weak spots.",
        image: MASTER_EXP,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#10B981', '#34D399'] as const,
        responseText: "Let's master those signs! ",
    },
];

export default function MasterModeTutorialModal({
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
            seenStorageKey={MASTER_MODE_TUTORIAL_KEY}
        />
    );
}