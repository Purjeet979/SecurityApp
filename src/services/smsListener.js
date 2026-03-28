import { NativeModules, NativeEventEmitter, 
         PermissionsAndroid, Alert } from 'react-native';
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
    // Keep only last 50 scans
    await AsyncStorage.setItem(
      'scanHistory',
      JSON.stringify(history.slice(0, 50))
    );
  } catch (e) {}
};

// Background SMS scanning task
const smsScanTask = async (taskData) => {
  const { SmsAndroid } = NativeModules;
  const eventEmitter = new NativeEventEmitter(SmsAndroid);

  // Listen for new SMS in background
  eventEmitter.addListener('onSMSReceived', async (event) => {
    const { messageBody, senderPhoneNumber } = event;

    // Quick local scan first (no internet needed)
    const result = await analyzeMessage(messageBody, true);

    // Save to history
    await saveScanHistory(messageBody, result, 'SMS');

    // Send notification with risk level
    await sendRiskNotification({
      title: `${getRiskEmoji(result.risk)} SMS from ${senderPhoneNumber}`,
      body: result.isScam
        ? `⚠️ SCAM DETECTED! ${result.scamType}`
        : `✅ Message looks safe`,
      risk: result.risk,
      data: { messageBody, result },
    });
  });

  // Keep background service alive
  await new Promise(() => {});
};

// Background service options
const backgroundOptions = {
  taskName: 'PhotoGuard SMS Scanner',
  taskTitle: '🛡️ PhotoGuard Active',
  taskDesc: 'Scanning messages for scams in real-time',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#4F46E5',
  linkingURI: 'photoguard://home',
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
