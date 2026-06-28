import React from 'react';
import Svg, { Path, Polygon, Circle, Ellipse, Rect, Line, Text as SvgText } from 'react-native-svg';

export function BookIcon({ size = 24, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
}

export function ZapIcon({ size = 24, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  );
}

export function FlameIcon({ size = 24, color = "#EF4444" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2c1 2 2 4 2 7 0 3-1 6-3 8 1 2 2 4 2 6 0 4-2 6-2 6s-2-2-2-6c0-2 1-4 2-6-2-2-3-5-3-8 0-3 1-5 2-7z" />
    </Svg>
  );
}

export function TrophyIcon({ size = 24, color = "#F59E0B" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 9c0-1 1-2 2-2h8c1 0 2 1 2 2v2c0 1-1 2-2 2H8c-1 0-2-1-2-2V9z" opacity="0.3" />
      <Path d="M8 2h8v3H8V2zm0 8v8h8v-8H8z" />
      <Path d="M6 11c-1 0-2 1-2 2v2c0 1 1 2 2 2h1v-6H6z" />
      <Path d="M18 11v6h1c1 0 2-1 2-2v-2c0-1-1-2-2-2h-1z" />
    </Svg>
  );
}

export function FootprintIcon({ size = 24, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} opacity="0.7">
      <Circle cx="12" cy="4" r="2" />
      <Circle cx="7" cy="10" r="1.5" />
      <Circle cx="17" cy="10" r="1.5" />
      <Circle cx="5" cy="16" r="1.5" />
      <Circle cx="12" cy="16" r="1.5" />
      <Circle cx="19" cy="16" r="1.5" />
      <Ellipse cx="12" cy="20" rx="8" ry="2" />
    </Svg>
  );
}

export function StarIcon({ size = 24, color = "#F59E0B" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

export function BrainIcon({ size = 24, color = "#8B5CF6" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} opacity="0.7">
      <Path d="M9 3c-1 0-2 1-2 2v1c-2 0-3 1-3 3v10c0 2 1 3 3 3h1v2c0 1 1 2 2 2s2-1 2-2v-2h2v2c0 1 1 2 2 2s2-1 2-2v-2h1c2 0 3-1 3-3V9c0-2-1-3-3-3V5c0-1-1-2-2-2h-2c0-1-1-2-2-2s-2 1-2 2H9zm3 2c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2zm-4 4c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2zm8 0c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2z" />
    </Svg>
  );
}

export function SearchIcon({ size = 24, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Circle cx="11" cy="11" r="8" />
      <Path d="m21 21-4.35-4.35" />
    </Svg>
  );
}

export function NumbersIcon({ size = 24, color = "#F59E0B" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} opacity="0.8">
      <SvgText x="4" y="16" fontSize="14" fontWeight="bold" fill={color}>123</SvgText>
    </Svg>
  );
}

export function CalendarIcon({ size = 24, color = "#EC4899" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  );
}

export function TimerIcon({ size = 24, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Circle cx="12" cy="13" r="8" />
      <Path d="M12 9v4l3 2" />
      <Path d="M7 3h10" />
    </Svg>
  );
}

export function HandIcon({ size = 24, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M9 3v12M12 5v10M15 7v8M18 10v5" />
      <Path d="M6 13a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-3" />
    </Svg>
  );
}

export function QuestionIcon({ size = 24, color = "#3B82F6" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} opacity="0.8">
      <SvgText x="8" y="20" fontSize="18" fontWeight="bold" fill={color}>?</SvgText>
    </Svg>
  );
}

export function AlphabetIcon({ size = 24, color = "#3B82F6" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} opacity="0.8">
      <SvgText x="6" y="20" fontSize="14" fontWeight="bold" fill={color}>Aa</SvgText>
    </Svg>
  );
}

export function GreetingIcon({ size = 24, color = "#10B981" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} opacity="0.8">
      <Path d="M14 8c0-2-2-4-4-4s-4 2-4 4m8 0c0-3-2-5-4-5s-4 2-4 5" />
      <Path d="M10 16s-2 2-2 4v1h8v-1c0-2-2-4-2-4" />
      <Path d="M16 8l3-3m3 0l-3-3" />
    </Svg>
  );
}

export function ClassroomIcon({ size = 24, color = "#8B5CF6" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} opacity="0.8">
      <Rect x="3" y="6" width="18" height="12" rx="1" fill={color} opacity="0.3" />
      <Rect x="3" y="6" width="18" height="3" fill={color} />
      <Line x1="9" y1="12" x2="15" y2="12" stroke={color} strokeWidth="1" />
      <Line x1="9" y1="15" x2="15" y2="15" stroke={color} strokeWidth="1" />
    </Svg>
  );
}

export function SkipIcon({ size = 20, color = "#9CA3AF" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M5 3v18M19 3v18M5 3l14 9-14 9" opacity="0.6" />
    </Svg>
  );
}

export function NextIcon({ size = 20, color = "#fff" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function BackIcon({ size = 20, color = "#3B82F6" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <Path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function PlusIcon({ size = 24, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color = "#10B981" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3">
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

export function LockIcon({ size = 24, color = "currentColor" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Rect x="3" y="11" width="18" height="11" rx="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

export function RoadmapIcon({ size = 24, color = "#3B82F6" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Circle cx="6" cy="5" r="2" fill={color} />
      <Line x1="6" y1="7" x2="6" y2="10" />
      <Circle cx="6" cy="12" r="2" fill={color} />
      <Line x1="6" y1="14" x2="6" y2="17" />
      <Circle cx="6" cy="19" r="2" fill={color} />
      <Line x1="6" y1="7" x2="12" y2="10" />
      <Line x1="6" y1="14" x2="12" y2="17" />
    </Svg>
  );
}
