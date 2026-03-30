import { NativeModules, NativeEventEmitter, 
         PermissionsAndroid, Alert, ToastAndroid } from 'react-native';
import BackgroundActions from 'react-native-background-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeMessage, getRiskEmoji } from './scamDetector';
import { sendRiskNotification } from './notificationService';

// Request SMS permissions
export const requestSMSPermission = async () => {
  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    ]);
    return Object.values(grants)
      .every(v => v === PermissionsAndroid.RESULTS.GRANTED);
  } catch (e) {
    return false;
  }
};

// Save scan to history
const saveScanHistory = async (message, result, source) => {
  try {
    const history = JSON.parse(
      await AsyncStorage.getItem('scanHistory') || '[]'
    );
    history.unshift({
      id: Date.now().toString(),
      message: message.substring(0, 100),
      result,
      source,
      timestamp: new Date().toISOString(),
    });
    await AsyncStorage.setItem(
      'scanHistory',
      JSON.stringify(history.slice(0, 50))
    );
  } catch (e) {}
};

// Deduplicate cache: avoid alerting same SMS twice
const processedSMS = new Set();

// Background SMS scanning task
const smsScanTask = async (taskData) => {
  const { SmsAndroid } = NativeModules;
  if (!SmsAndroid) return;

  const eventEmitter = new NativeEventEmitter(SmsAndroid);

  // Listen for new SMS in background
  eventEmitter.addListener('onSMSReceived', async (event) => {
    const { messageBody, senderPhoneNumber } = event;

    if (!messageBody || messageBody.length < 5) return;

    // Deduplicate same SMS within 15 seconds
    const smsHash = messageBody.substring(0, 50);
    if (processedSMS.has(smsHash)) return;
    processedSMS.add(smsHash);
    setTimeout(() => processedSMS.delete(smsHash), 15000);

    // Analyze the message (local + Groq AI)
    const result = await analyzeMessage(messageBody, true);

    // Always save to history silently
    await saveScanHistory(messageBody, result, 'SMS');

    // Only show alert for Suspicious/Risky — ignore safe SMS
    if (result.risk !== 'low') {
      const titleString = `${getRiskEmoji(result.risk)} SMS from ${senderPhoneNumber}`;
      const scamType = result.scamType || 'Suspicious Content';
      const bodyString = `⚠️ ${scamType} — Do not respond!`;

      // Float Toast visible even when messaging app is open
      ToastAndroid.showWithGravity(
        `${titleString}\n${bodyString}`,
        ToastAndroid.LONG,
        ToastAndroid.TOP
      );

      // Heads-up notification
      await sendRiskNotification({
        title: titleString,
        body: bodyString,
        risk: result.risk,
        data: { messageBody, result },
      });
    }
  });

  // Keep background service alive
  await new Promise(() => {});
};

// Background service options
const backgroundOptions = {
  taskName: 'Aegis SMS Scanner',
  taskTitle: '🛡️ Aegis Protection',
  taskDesc: 'Scanning for suspicious threads...',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#4F46E5',
  linkingURI: 'aegis://home',
  parameters: {},
};

export const startSMSListener = async () => {
  const hasPermission = await requestSMSPermission();
  if (!hasPermission) {
    Alert.alert(
      'Permission Required',
      'SMS permission is needed to scan messages for scams.',
    );
    return false;
  }
  await BackgroundActions.start(smsScanTask, backgroundOptions);
  return true;
};

export const stopSMSListener = async () => {
  await BackgroundActions.stop();
};
