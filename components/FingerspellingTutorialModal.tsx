// components/FingerspellingTutorialModal.tsx
// Senya's "How Fingerspelling Works" tutorial.
import React from 'react';
import TutorialModal, { TutorialSlide } from './TutorialModal';

export const FINGERSPELLING_TUTORIAL_KEY = 'fingerspelling_tutorial_seen_v1';

// Import images
const FINGERSPELLING_MODE = require('../assets/images/img/tutorial/fingerspelling-mode.jpg');
const FINGERSPELLING_RANDOM = require('../assets/images/img/tutorial/fingerspelling-randomwords.jpg');
const FINGERSPELLING_TYPE = require('../assets/images/img/tutorial/fingerspelling-typeyourown.jpg');

const SLIDES: TutorialSlide[] = [
    {
        id: 'welcome',
        title: 'Welcome to Fingerspelling ',
        body: 'Practice spelling out words letter by letter using FSL hand signs — a great way to build your alphabet skills.',
        image: FINGERSPELLING_MODE,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#4B7BBB', '#6FA8E6'] as const,
        responseText: "Let's spell it out! ✋",
    },
    {
        id: 'randomWords',
        title: 'Random Words Mode ',
        body: "Pick Random Words and we'll give you words to fingerspell — you might even see your own name pop up!",
        image: FINGERSPELLING_RANDOM,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#F59E0B', '#FBBF24'] as const,
        responseText: 'You never know what word is next! ',
    },
    {
        id: 'customWords',
        title: 'Type Your Own Words ',
        body: 'Want to practice something specific? Choose your own words to type in and fingerspell at your own pace.',
        image: FINGERSPELLING_TYPE,
        imageStyle: 'contain',
        imageHeight: 180,
        gradient: ['#8B5CF6', '#A78BFA'] as const,
        responseText: 'Practice exactly what you need!',
    },
    {
        id: 'noRush',
        title: 'No Timers, No Rush ',
        body: "Fingerspelling is chill — there's no countdown or timer. Take your time and sign each letter at your own pace.",
        icon: 'leaf',
        iconColor: '#10B981',
        gradient: ['#10B981', '#34D399'] as const,
        responseText: 'Take it easy and enjoy!',
    },
];

export default function FingerspellingTutorialModal({
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
            seenStorageKey={FINGERSPELLING_TUTORIAL_KEY}
        />
    );
}