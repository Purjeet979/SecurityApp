import { NativeModules } from 'react-native';

export const sendRiskNotification = async ({ title, body, risk, data }) => {
  const { NotificationModule } = NativeModules;

  const colorMap = {
    high: 0xffDC2626,    // Red
    medium: 0xffD97706,  // Yellow
    low: 0xff16A34A,     // Green
  };

  try {
    await NotificationModule.showNotification({
      title,
      body,
      color: colorMap[risk] || colorMap.low,
      priority: risk === 'high' ? 'max' : 'default',
      data: JSON.stringify(data),
      channelId: 'scam_alerts',
    });
  } catch (e) {
    console.log('Notification error:', e);
  }
};
