// app/gesture/utils/heuristics.ts

export interface Landmark {
    x: number;
    y: number;
    z: number;
}

// Emulate numpy's 3D distance check from your Python script
export function getDistance3D(p1: Landmark, p2: Landmark): number {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2) +
        Math.pow(p1.z - p2.z, 2)
    );
}

// Emulate numpy's 2D distance check
export function getDistance2D(p1: Landmark, p2: Landmark): number {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2)
    );
}

// Replicates: get_finger_states(self, hand_landmarks)
export function getFingerStates(landmarks: Landmark[]): boolean[] {
    const tips = [4, 8, 12, 16, 20];
    const dips = [3, 6, 10, 14, 18];
    const fingers: boolean[] = [];

    // Thumb check (index 0)
    const thumbExtended = Math.abs(landmarks[4].x - landmarks[2].x) > 0.045;
    fingers.push(thumbExtended);

    // Other fingers (index 1 to 4)
    for (let i = 1; i < tips.length; i++) {
        const extended = landmarks[tips[i]].y < landmarks[dips[i]].y;
        fingers.push(extended);
    }
    return fingers;
}

// Replicates: apply_critical_dly_overrides(self, predicted, avg_conf, ...)
export function applyCriticalDlyOverrides(
    predicted: string,
    avgConf: number,
    landmarks: Landmark[]
): { letter: string; confidence: number } {
    const fingers = getFingerStates(landmarks);

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexDip = landmarks[7];
    const indexMcp = landmarks[5];
    const middleTip = landmarks[12];
    const middleMcp = landmarks[9];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const pinkyMcp = landmarks[17];

    // X override logic
    const isIndexHooked = (indexTip.y > indexDip.y) || (Math.abs(indexTip.x - indexDip.x) > 0.02 && !fingers[1]);
    const othersDown = !fingers[2] && !fingers[3] && !fingers[4];

    if (isIndexHooked && othersDown && ['L', 'Y', 'X', '?'].includes(predicted)) {
        return { letter: 'X', confidence: 0.98 };
    }

    // B shape logic
    const isBShape = fingers[1] && fingers[2] && fingers[3] && fingers[4];
    if (isBShape) {
        return { letter: 'B', confidence: 0.98 };
    }

    // D & L structural validation logic
    const indexUpState = fingers[1];
    const distThumbToMiddle3D = getDistance3D(thumbTip, middleTip);
    const distThumbToRing3D = getDistance3D(thumbTip, ringTip);
    const distThumbToMiddle2D = getDistance2D(thumbTip, middleTip);
    const ringMcpY = landmarks[13].y;
    const areFingersCurledToPalm = (middleTip.y > middleMcp.y) && (ringTip.y > ringMcpY);
    const distThumbToPalmCenter = getDistance2D(thumbTip, middleMcp);

    const isFormingD = (
        distThumbToMiddle3D < 0.10 ||
        distThumbToRing3D < 0.10 ||
        distThumbToMiddle2D < 0.08 ||
        (areFingersCurledToPalm && distThumbToPalmCenter < 0.10)
    );

    if (indexUpState && !isIndexHooked) {
        if (isFormingD) {
            return { letter: 'D', confidence: 0.99 };
        }
        const isThumbStretchedWide = Math.abs(thumbTip.x - indexMcp.x) > 0.075;
        if (isThumbStretchedWide) {
            return { letter: 'L', confidence: 0.96 };
        }
    }

    // Y override logic
    if (fingers[4] && !fingers[1] && !fingers[2] && !fingers[3]) {
        const isThumbActiveY = Math.abs(thumbTip.x - indexMcp.x) > 0.055;
        if (isThumbActiveY && pinkyTip.y < landmarks[19].y) {
            return { letter: 'Y', confidence: 0.98 };
        }
    }

    return { letter: predicted, confidence: avgConf };
}