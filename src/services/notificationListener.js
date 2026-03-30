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
  'com.whatsapp.w4b',          // WhatsApp Business
  'com.instagram.android',
  'com.facebook.orca',         // Messenger
  'com.telegram.messenger',
  'com.google.android.apps.messaging', // Google Messages (RCS + SMS notifications)
  'com.samsung.android.messaging',     // Samsung Messages
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

  // Filter out WhatsApp summaries/noise
  const isSummary = /new messages|messages from|doing work in the background/.test(text.toLowerCase()) || 
                    /WhatsApp is checking for new messages/.test(text);
  if (isSummary) return;

  // Skip empty or trivial messages
  if (!text || text.length < 4) return;

  // Check Aegis block list — silently ignore messages from blocked senders
  const blockedRaw = await AsyncStorage.getItem('aegis_blocked_senders');
  const blockedList = blockedRaw ? JSON.parse(blockedRaw) : [];
  if (blockedList.some(b => title?.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(title?.toLowerCase()))) return;

  // Deduplicate exact same message text (30 second memory)
  const notifHash = `${app}_${title}_${text.substring(0, 40)}`;
  if (processedNotifications.has(notifHash)) return;
  processedNotifications.add(notifHash);
  setTimeout(() => {
    processedNotifications.delete(notifHash);
  }, 30000); 

  // Analyze locally first (instant, no internet)
  const result = await analyzeMessage(text, false);

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

  // 🔴 High Risk = "Risky" | 🟡 Medium = "Suspicious" | 🟢 Low = silent
  const titleString =
    result.risk === 'high'   ? `🔴 Risky Message! SCAM Alert`  :
    result.risk === 'medium' ? `🟡 Suspicious Message Detected` :
                               `🟢 Safe Message Detected`;

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
      data: { text, result, app, sender: title }, // pass sender name/number for Block action
    });
  }
};
