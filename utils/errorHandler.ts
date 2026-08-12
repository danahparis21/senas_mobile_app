import { LogBox } from 'react-native';

/**
 * Production Error Handler & Log Suppressor
 * Suppresses developer redboxes/yellowboxes in the app UI and redirects
 * errors to custom alert handlers instead of raw crash popups.
 */

// Global reference for triggering custom alert from non-React code (e.g. services/api.js)
type AlertTriggerFn = (title: string, message: string, type?: 'error' | 'warning' | 'info' | 'offline') => void;
let globalAlertTrigger: AlertTriggerFn | null = null;

export const registerGlobalAlertTrigger = (fn: AlertTriggerFn) => {
  globalAlertTrigger = fn;
};

export const triggerGlobalAlert = (
  title: string,
  message: string,
  type: 'error' | 'warning' | 'info' | 'offline' = 'error'
) => {
  if (globalAlertTrigger) {
    globalAlertTrigger(title, message, type);
  }
};

/**
 * Initializes error handling & log box suppression.
 */
export function initErrorHandler() {
  // Suppress all React Native warning/error overlays (YellowBox & RedBox) in app UI
  LogBox.ignoreAllLogs(true);

  // Preserve original console functions for internal logging if needed
  const originalError = console.error;
  const originalWarn = console.warn;

  // Safe wrapper for console.error to prevent raw developer popups while keeping clean log tracing
  console.error = (...args: any[]) => {
    // Log to standard console output without triggering UI overlays
    const messageStr = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    
    // Silence raw redbox popups in app
    if (__DEV__) {
      originalError.apply(console, ['[App Error Suppressed]:', ...args]);
    }

    // Check if error is network failure related
    if (
      messageStr.includes('Network request failed') ||
      messageStr.includes('Failed to fetch') ||
      messageStr.includes('NetworkError') ||
      messageStr.includes('ECONNREFUSED')
    ) {
      triggerGlobalAlert('Connection Error', 'Unable to reach the server. Please check your internet connection.', 'offline');
    }
  };

  console.warn = (...args: any[]) => {
    if (__DEV__) {
      originalWarn.apply(console, args);
    }
  };
}
