import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNetworkAlert, AlertButton } from '../contexts/NetworkAlertContext';
import { AlertTriangle, WifiOff, CheckCircle2, Info, X } from 'lucide-react-native';

export const CustomAlertModal: React.FC = () => {
  const { alertConfig, hideAlert } = useNetworkAlert();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (alertConfig) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [alertConfig, scaleAnim, opacityAnim]);

  if (!alertConfig) return null;

  const { title, message, type = 'error', buttons } = alertConfig;

  const handleButtonPress = (btn: AlertButton) => {
    hideAlert();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'offline':
        return <WifiOff size={28} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={28} color="#F59E0B" />;
      case 'success':
        return <CheckCircle2 size={28} color="#10B981" />;
      case 'info':
        return <Info size={28} color="#3B82F6" />;
      case 'error':
      default:
        return <AlertTriangle size={28} color="#EF4444" />;
    }
  };

  const getBadgeBg = () => {
    switch (type) {
      case 'offline':
        return '#FEE2E2';
      case 'warning':
        return '#FEF3C7';
      case 'success':
        return '#D1FAE5';
      case 'info':
        return '#DBEAFE';
      case 'error':
      default:
        return '#FEE2E2';
    }
  };

  const displayButtons = buttons && buttons.length > 0
    ? buttons
    : [{ text: 'OK', style: 'default' as const }];

  return (
    <Modal
      transparent
      visible={!!alertConfig}
      animationType="none"
      onRequestClose={hideAlert}
    >
      <TouchableWithoutFeedback onPress={hideAlert}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={hideAlert}
                activeOpacity={0.7}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>

              <View style={[styles.iconBadge, { backgroundColor: getBadgeBg() }]}>
                {getIcon()}
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View
                style={[
                  styles.buttonContainer,
                  displayButtons.length > 2 ? styles.columnButtons : styles.rowButtons,
                ]}
              >
                {displayButtons.map((btn, idx) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.8}
                      onPress={() => handleButtonPress(btn)}
                      style={[
                        styles.button,
                        displayButtons.length === 1 && styles.singleButton,
                        isDestructive && styles.destructiveButton,
                        isCancel && styles.cancelButton,
                      ]}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isDestructive && styles.destructiveButtonText,
                          isCancel && styles.cancelButtonText,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  columnButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  button: {
    flex: 1,
    height: 46,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleButton: {
    flex: 0,
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#475569',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
});
