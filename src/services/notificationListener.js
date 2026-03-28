import NotificationListener from 'react-native-notification-listener';
import { analyzeMessage, getRiskEmoji } from './scamDetector';
import { sendRiskNotification } from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid } from 'react-native';

// Memory cache to deduplicate same notifications
const processedNotifications = new Set();

// Apps to monitor
const MONITORED_APPS = [
  'com.whatsapp',
  'com.whatsapp.w4b',       // WhatsApp Business
  'com.instagram.android',
  'com.facebook.orca',      // Messenger
  'com.telegram.messenger',
];

export const checkNotificationPermission = async () => {
  const status = await NotificationListener.getPermissionStatus();
  return status === 'authorized';
};

export const requestNotificationPermission = () => {
  // Opens Android notification access settings
  NotificationListener.requestPermission();
};

export const headlessNotificationListener = async ({ notification }) => {
  const isActive = await AsyncStorage.getItem('isProtectionActive');
  if (isActive !== 'true') return;

  if (!notification) return;
  const parsed = JSON.parse(notification);
  const { app, title, text } = parsed;

  // Only scan monitored apps
  if (!MONITORED_APPS.includes(app)) return;

  // Skip empty or very short messages
  if (!text || text.length < 10) return;

  // Deduplicate exact same message text (strip app prefix to catch WhatsApp summary+detail duplicates)
  const notifHash = `${text.substring(0, 50)}`;
  if (processedNotifications.has(notifHash)) return;
  processedNotifications.add(notifHash);
  setTimeout(() => {
    processedNotifications.delete(notifHash);
  }, 10000); // 10 second memory

  // Analyze the notification text
  const result = await analyzeMessage(text, true);

  // Save to history
  const history = JSON.parse(
    await AsyncStorage.getItem('scanHistory') || '[]'
  );
  history.unshift({
    id: Date.now().toString(),
    message: text.substring(0, 100),
    result,
    source: app.includes('whatsapp') ? 'WhatsApp' : 'App',
    timestamp: new Date().toISOString(),
  });
  await AsyncStorage.setItem(
    'scanHistory',
    JSON.stringify(history.slice(0, 50))
  );

  const titleString = result.risk === 'low'
    ? `${getRiskEmoji(result.risk)} Safe Message Detected`
    : `${getRiskEmoji(result.risk)} Suspicious message!`;

  const scamTypeString = result.isScam ? (result.scamType || 'Suspicious Content') : 'Looks clean';

  // Only alert for Suspicious/Danger — Safe messages are silently saved to history only
  if (result.risk !== 'low') {
    // Float message (Toast) visible even when WhatsApp is open
    ToastAndroid.showWithGravity(
      `${titleString}\nFrom ${title} — ${scamTypeString}`,
      ToastAndroid.LONG,
      ToastAndroid.TOP
    );

    // Standard heads-up notification for when screen is off / app is in background
    await sendRiskNotification({
      title: titleString,
      body: `From ${title} — ${scamTypeString}`,
      risk: result.risk,
      data: { text, result, app },
    });
  }
};
