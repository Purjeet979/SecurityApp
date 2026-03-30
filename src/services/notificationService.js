import { NativeModules } from 'react-native';

export const sendRiskNotification = async ({ title, body, risk, data }) => {
  const { NotificationModule } = NativeModules;

  const colorMap = {
    high: 0xffDC2626,    // Red
    medium: 0xffD97706,  // Yellow
    low: 0xff16A34A,     // Green
  };

  // Extract sender from data if available (title format is "🔴 Risky Message! From Soham T.")
  const sender = data?.sender || 'Unknown';

  try {
    await NotificationModule.showNotification({
      title,
      body,
      color: colorMap[risk] || colorMap.low,
      risk: risk || 'low',       // Pass risk so Kotlin adds Block/Report for high/medium
      sender,                    // Pass sender so Block buttons can dial/block them
      data: JSON.stringify(data),
      channelId: 'scam_alerts',
    });
  } catch (e) {
    console.log('Notification error:', e);
  }
};
