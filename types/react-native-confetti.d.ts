// types/react-native-confetti.d.ts
declare module 'react-native-confetti' {
    import { Component } from 'react';
    import { ViewStyle } from 'react-native';

    export interface ConfettiProps {
        ref?: any;
        duration?: number;
        colors?: string[];
        style?: ViewStyle;
        numberOfPieces?: number;
        fadeOut?: boolean;
    }

    export default class Confetti extends Component<ConfettiProps> {
        startConfetti: () => void;
        stopConfetti: () => void;
    }
}