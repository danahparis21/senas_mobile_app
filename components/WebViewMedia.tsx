// components/WebViewMedia.tsx
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

interface WebViewMediaProps {
    url: string;
    isVideo?: boolean;
    caption?: string;
    autoplay?: boolean;
    style?: any;
    mediaType?: 'content' | 'quiz' | 'option';
    hideControls?: boolean;
    objectFit?: 'cover' | 'contain' | 'fill';
    objectPosition?: 'center' | 'left' | 'right' | 'top' | 'bottom' | string; // ✅ Allow string for percentages
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function WebViewMedia({
    url,
    isVideo = false,
    caption = '',
    autoplay = true,
    style,
    mediaType = 'content',
    hideControls = false,
    objectFit = 'cover',
    objectPosition = 'center',
}: WebViewMediaProps) {
    const baseUrl = 'http://192.168.1.45:8000/media-player';

    let aspectRatio = '16:9';

    switch (mediaType) {
        case 'content':
            aspectRatio = '16:9';
            break;
        case 'quiz':
            aspectRatio = '1:1';
            break;
        case 'option':
            aspectRatio = '16:9';
            break;
        default:
            aspectRatio = '16:9';
    }

    const fullUrl = `${baseUrl}?url=${encodeURIComponent(url)}&isVideo=${isVideo}&caption=${encodeURIComponent(caption)}&autoplay=${autoplay}&aspect=${aspectRatio}&hideControls=${hideControls}&fit=${objectFit}&position=${encodeURIComponent(objectPosition)}`;

    return (
        <View style={[styles.container, style]}>
            <WebView
                source={{ uri: fullUrl }}
                style={styles.webview}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                scrollEnabled={false}
                bounces={false}
                onError={(error) => console.log('WebView error:', error)}
                onLoadEnd={() => console.log('WebView loaded')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        flex: 1,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});