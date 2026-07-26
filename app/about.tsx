// app/about.tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Pressable,
    ScrollView,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';

// ── SVG Icons ──────────────────────────────────────────────────────────────

function BackIcon() {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#0f3172" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function BookIcon() {
    return (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
            <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
        </Svg>
    );
}

function SparklesIcon() {
    return (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <Path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M19 17L19.5 19L21.5 19.5L19.5 20L19 22L18.5 20L16.5 19.5L18.5 19L19 17Z" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function InfoIcon() {
    return (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke="#2563EB" strokeWidth="2" />
            <Line x1="12" y1="8" x2="12" y2="8" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
            <Line x1="12" y1="12" x2="12" y2="16" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
        </Svg>
    );
}

function UsersIcon() {
    return (
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <Circle cx="9" cy="7" r="4" stroke="#2563EB" strokeWidth="2" />
            <Path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
            <Circle cx="17" cy="7" r="2" stroke="#2563EB" strokeWidth="2" />
            <Path d="M21 21v-2a4 4 0 0 0-3-3.85" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
        </Svg>
    );
}

function EmailIcon() {
    return (
        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <Rect x="2" y="4" width="20" height="16" rx="2" stroke="#2563EB" strokeWidth="2" />
            <Path d="M22 7L12 13L2 7" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}

function GithubIcon() {
    return (
        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <Path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.253-.447-1.27.098-2.646 0 0 .84-.269 2.75 1.025.8-.223 1.65-.334 2.5-.334.85 0 1.7.111 2.5.334 1.91-1.294 2.75-1.025 2.75-1.025.545 1.376.201 2.393.099 2.646.64.698 1.03 1.591 1.03 2.682 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" stroke="#2563EB" strokeWidth="2" fill="#2563EB" fillOpacity="0.1" />
        </Svg>
    );
}

// ── Developer Card ──────────────────────────────────────────────────────
function DeveloperCard({
    name,
    role,
    image,
    email,
    index
}: {
    name: string;
    role: string;
    image: any;
    email: string;
    index: number;
}) {
    const handleEmailPress = () => {
        Linking.openURL(`mailto:${email}`);
    };

    return (
        <View style={[styles.devCard, { marginTop: index === 0 ? 0 : 14 }]}>
            <View style={styles.devAvatar}>
                <Image
                    source={image}
                    style={styles.devAvatarImage}
                    contentFit="cover"
                />
            </View>
            <View style={styles.devInfo}>
                <Text style={styles.devName}>{name}</Text>
                <View style={styles.devRoleBadge}>
                    <Text style={styles.devRole}>{role}</Text>
                </View>
                <Pressable style={styles.devEmail} onPress={handleEmailPress}>
                    <EmailIcon />
                    <Text style={styles.devEmailText} numberOfLines={1}>
                        {email}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

export default function About() {
    const router = useRouter();

    const developers = [
        {
            name: 'Mica Danah P. Paris',
            role: 'Software Engineer',
            image: require('../assets/images/developers/mica.jpg'),
            email: 'micadanah21@gmail.com',
        },
        {
            name: 'Christian Paul E. Mendoza',
            role: 'System Analyst',
            image: require('../assets/images/developers/christian.jpg'),
            email: 'christianpaulmendoza10@gmail.com',
        },
        {
            name: 'Theresa C. Valiente',
            role: 'QA Tester',
            image: require('../assets/images/developers/theresa.jpg'),
            email: 'theresavaliente17svt@gmail.com',
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header with Back Button */}
                <View style={styles.header}>
                    <Pressable style={styles.backBtn} onPress={() => router.back()}>
                        <BackIcon />
                    </Pressable>
                    <Text style={styles.headerTitle}>About SEÑAS</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Logo Section */}
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../assets/images/img/senya_blue.png')}
                            style={styles.logo}
                            contentFit="contain"
                        />
                    </View>

                    <Text style={styles.appName}>SEÑAS</Text>
                    <Text style={styles.appSubtitle}>Filipino Sign Language Learning App</Text>

                    <View style={styles.divider} />

                    {/* Description */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconBox}>
                                <BookIcon />
                            </View>
                            <Text style={styles.sectionTitle}>About the App</Text>
                        </View>
                        <Text style={styles.description}>
                            SEÑAS is a mobile application designed to help students learn
                            Filipino Sign Language (FSL) through interactive lessons,
                            gesture recognition, and gamified learning experiences.
                        </Text>
                    </View>

                    {/* Features */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconBox}>
                                <SparklesIcon />
                            </View>
                            <Text style={styles.sectionTitle}>Key Features</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <View style={styles.featureDot} />
                            <Text style={styles.featureText}>Interactive FSL lessons with real-time feedback</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <View style={styles.featureDot} />
                            <Text style={styles.featureText}>Gesture recognition for hands-on practice</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <View style={styles.featureDot} />
                            <Text style={styles.featureText}>Gamified learning with achievements and XP</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <View style={styles.featureDot} />
                            <Text style={styles.featureText}>Progress tracking and learning path personalization</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <View style={styles.featureDot} />
                            <Text style={styles.featureText}>Daily challenges to build learning streaks</Text>
                        </View>
                    </View>

                    {/* App Info */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconBox}>
                                <InfoIcon />
                            </View>
                            <Text style={styles.sectionTitle}>App Information</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Version</Text>
                            <Text style={styles.infoValue}>2.0.0</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Platform</Text>
                            <Text style={styles.infoValue}>iOS & Android</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Copyright</Text>
                            <Text style={styles.infoValue}>© 2026 SEÑAS</Text>
                        </View>
                    </View>

                    {/* Development Team */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.iconBox}>
                                <UsersIcon />
                            </View>
                            <Text style={styles.sectionTitle}>Development Team</Text>
                        </View>
                        {developers.map((dev, index) => (
                            <DeveloperCard
                                key={index}
                                name={dev.name}
                                role={dev.role}
                                image={dev.image}
                                email={dev.email}
                                index={index}
                            />
                        ))}
                    </View>

                    {/* Footer */}
                    <Text style={styles.footerText}>
                        Made with ❤️ for the Filipino Deaf Community
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#eaf5fd',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(15,49,114,0.08)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,49,114,0.06)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f3172',
    },
    headerSpacer: {
        width: 40,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 24,
        alignItems: 'center',
    },
    logoContainer: {
        width: 100,
        height: 100,
        backgroundColor: '#FFFFFF',
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 4,
        marginBottom: 12,
    },
    logo: {
        width: 70,
        height: 70,
    },
    appName: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0f3172',
        letterSpacing: 3,
    },
    appSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 16,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(15,49,114,0.08)',
        marginVertical: 12,
    },
    sectionCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.06)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(37,99,235,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f3172',
    },
    description: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
        lineHeight: 22,
        textAlign: 'left',
        paddingHorizontal: 4,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    featureDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2563EB',
        marginTop: 7,
        marginRight: 10,
        flexShrink: 0,
    },
    featureText: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
        flex: 1,
        lineHeight: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(15,49,114,0.05)',
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f3172',
    },
    devCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15,49,114,0.04)',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(15,49,114,0.06)',
    },
    devAvatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#E5E7EB',
        overflow: 'hidden',
        borderWidth: 2.5,
        borderColor: '#2563EB',
        flexShrink: 0,
    },
    devAvatarImage: {
        width: '100%',
        height: '100%',
    },
    devInfo: {
        flex: 1,
        marginLeft: 16,
    },
    devName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f3172',
        marginBottom: 2,
    },
    devRoleBadge: {
        backgroundColor: 'rgba(37,99,235,0.10)',
        paddingVertical: 2,
        paddingHorizontal: 10,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    devRole: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2563EB',
    },
    devEmail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    devEmailText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        flex: 1,
    },
    footerText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 12,
    },
});