import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { registerGlobalAlertTrigger } from '../utils/errorHandler';
import Constants from 'expo-constants';

export type AlertType = 'error' | 'warning' | 'info' | 'offline' | 'success';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertConfig {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

interface NetworkAlertContextType {
  isOffline: boolean;
  isRestored: boolean;
  alertConfig: AlertConfig | null;
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
  checkConnection: () => Promise<boolean>;
}

const NetworkAlertContext = createContext<NetworkAlertContextType>({
  isOffline: false,
  isRestored: false,
  alertConfig: null,
  showAlert: () => {},
  hideAlert: () => {},
  checkConnection: async () => true,
});

const TARGET_API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://señas.tech/api';

export const NetworkAlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isRestored, setIsRestored] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);

  // Ping backend to confirm internet reachability
  const pingServer = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch(TARGET_API_URL, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      }).catch(() => null);

      clearTimeout(timeoutId);
      return response !== null;
    } catch {
      return false;
    }
  }, []);

  const handleNetworkStateChange = useCallback(async (state: NetInfoState) => {
    const connected = state.isConnected && state.isInternetReachable !== false;
    
    if (!connected) {
      setIsOffline(prev => {
        if (!prev) {
          setIsRestored(false);
        }
        return true;
      });
    } else {
      // Re-check with ping if netinfo claims online
      const canPing = await pingServer();
      if (!canPing && state.isConnected === false) {
        setIsOffline(true);
      } else {
        setIsOffline(prev => {
          if (prev) {
            // Was offline, now restored!
            setIsRestored(true);
            setTimeout(() => {
              setIsRestored(false);
            }, 3500);
          }
          return false;
        });
      }
    }
  }, [pingServer]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(handleNetworkStateChange);

    // Initial fetch check
    NetInfo.fetch().then(handleNetworkStateChange);

    // Register with errorHandler so triggerGlobalAlert works anywhere
    registerGlobalAlertTrigger((title, message, type = 'error') => {
      setAlertConfig({
        title,
        message,
        type,
        buttons: [{ text: 'OK', style: 'default' }],
      });
    });

    return () => {
      unsubscribe();
    };
  }, [handleNetworkStateChange]);

  const showAlert = useCallback((config: AlertConfig) => {
    setAlertConfig(config);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(null);
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    const reachable = await pingServer();
    const online = (state.isConnected && state.isInternetReachable !== false) || reachable;
    setIsOffline(!online);
    return online;
  }, [pingServer]);

  return (
    <NetworkAlertContext.Provider
      value={{
        isOffline,
        isRestored,
        alertConfig,
        showAlert,
        hideAlert,
        checkConnection,
      }}
    >
      {children}
    </NetworkAlertContext.Provider>
  );
};

export const useNetworkAlert = () => useContext(NetworkAlertContext);
