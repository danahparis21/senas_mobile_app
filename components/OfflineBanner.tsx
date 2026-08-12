import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNetworkAlert } from '../contexts/NetworkAlertContext';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react-native';

export const OfflineBanner: React.FC = () => {
  const { isOffline, isRestored, checkConnection } = useNetworkAlert();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isRetrying, setIsRetrying] = React.useState(false);

  const shouldShow = isOffline || isRestored;

  useEffect(() => {
    if (shouldShow) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shouldShow, slideAnim, opacityAnim]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkConnection();
    setTimeout(() => setIsRetrying(false), 800);
  };

  if (!shouldShow) return null;

  const isGreen = isRestored && !isOffline;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
      <Animated.View
        style={[
          styles.container,
          isGreen ? styles.restoredContainer : styles.offlineContainer,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.contentRow}>
          {isGreen ? (
            <Wifi size={18} color="#FFFFFF" style={styles.icon} />
          ) : (
            <WifiOff size={18} color="#FF6B6B" style={styles.icon} />
          )}

          <View style={styles.textContainer}>
            <Text style={styles.titleText}>
              {isGreen ? 'Internet Connection Restored' : 'No Internet Connection'}
            </Text>
            <Text style={styles.subText}>
              {isGreen
                ? 'You are back online'
                : 'Please check your connection and try again.'}
            </Text>
          </View>

          {!isGreen && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRetry}
              disabled={isRetrying}
              style={styles.retryButton}
            >
              <RefreshCw
                size={14}
                color="#FFFFFF"
                style={isRetrying ? styles.spinIcon : undefined}
              />
              <Text style={styles.retryText}>{isRetrying ? 'Retrying...' : 'Retry'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
  },
  container: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  offlineContainer: {
    backgroundColor: '#1E232A',
    borderLeftWidth: 4,
    borderLeftColor: '#FF4D4D',
  },
  restoredContainer: {
    backgroundColor: '#10B981',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    marginRight: 12,
  },
  spinIcon: {
    opacity: 0.7,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    marginTop: 2,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});
