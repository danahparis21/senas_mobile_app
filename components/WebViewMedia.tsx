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
    hideControls?: boolean;  // ✅ Add this
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function WebViewMedia({
    url,
    isVideo = false,
    caption = '',
    autoplay = true,
    style,
    mediaType = 'content',
    hideControls = false,  // ✅ Default to false
}: WebViewMediaProps) {
    const baseUrl = 'http://192.168.1.45:8000/media-player';

    // ✅ Determine aspect ratio based on media type
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

    // ✅ Build URL with all parameters
    const fullUrl = `${baseUrl}?url=${encodeURIComponent(url)}&isVideo=${isVideo}&caption=${encodeURIComponent(caption)}&autoplay=${autoplay}&aspect=${aspectRatio}&hideControls=${hideControls}`;

    // ✅ Different heights based on media type
    let containerHeight = 250;
    if (mediaType === 'quiz') {
        containerHeight = 200;
    } else if (mediaType === 'option') {
        containerHeight = 120;
    }

    return (
        <View style={[styles.container, { height: containerHeight }, style]}>
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
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#eaf5fd',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});