import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Switch, Alert,
  PermissionsAndroid, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startSMSListener, stopSMSListener } from '../services/smsListener';
import { checkNotificationPermission,
         requestNotificationPermission } from '../services/notificationListener';
import { getRiskColor, getRiskEmoji } from '../services/scamDetector';

export default function DashboardScreen() {
  const [isActive, setIsActive] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ high: 0, medium: 0, low: 0 });

  useEffect(() => {
    loadHistory();
    AsyncStorage.getItem('isProtectionActive').then(val => setIsActive(val === 'true'));
    const interval = setInterval(loadHistory, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, []);

  const loadHistory = async () => {
    const data = JSON.parse(
      await AsyncStorage.getItem('scanHistory') || '[]'
    );
    setHistory(data);
    setStats({
      high: data.filter(d => d.result.risk === 'high').length,
      medium: data.filter(d => d.result.risk === 'medium').length,
      low: data.filter(d => d.result.risk === 'low').length,
    });
  };

  const toggleProtection = async (value) => {
    if (value) {
      // Request runtime notification permission (Android 13+)
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      // Check notification permission for WhatsApp scanning
      const hasNotifPerm = await checkNotificationPermission();
      if (!hasNotifPerm) {
        Alert.alert(
          '🔔 Permission Needed',
          'Enable Notification Access so PhotoGuard can scan WhatsApp previews',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Enable', onPress: requestNotificationPermission }
          ]
        );
      }
      await AsyncStorage.setItem('isProtectionActive', 'true');
      await startSMSListener();
    } else {
      await AsyncStorage.setItem('isProtectionActive', 'false');
      await stopSMSListener();
    }
    setIsActive(value);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.historyCard,
      { borderLeftColor: getRiskColor(item.result.risk) }]}>
      <View style={styles.historyHeader}>
        <Text style={styles.historySource}>
          {getRiskEmoji(item.result.risk)} {item.source}
        </Text>
        <Text style={styles.historyTime}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.historyMsg} numberOfLines={2}>
        {item.message}
      </Text>
      {item.result.isScam && (
        <Text style={styles.scamType}>
          ⚠️ {item.result.scamType}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Protection Toggle */}
      <View style={styles.toggleCard}>
        <View>
          <Text style={styles.toggleTitle}>
            {isActive ? '🛡️ Protection Active' : '⭕ Protection Off'}
          </Text>
          <Text style={styles.toggleSub}>
            {isActive
              ? 'Scanning SMS & WhatsApp notifications'
              : 'Tap to start real-time scanning'}
          </Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={toggleProtection}
          trackColor={{ false: '#334155', true: '#4F46E5' }}
          thumbColor={isActive ? '#fff' : '#94A3B8'}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: '#7F1D1D' }]}>
          <Text style={styles.statNum}>{stats.high}</Text>
          <Text style={styles.statLabel}>🔴 High Risk</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#78350F' }]}>
          <Text style={styles.statNum}>{stats.medium}</Text>
          <Text style={styles.statLabel}>🟡 Medium</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#14532D' }]}>
          <Text style={styles.statNum}>{stats.low}</Text>
          <Text style={styles.statLabel}>🟢 Safe</Text>
        </View>
      </View>

      {/* Live Feed */}
      <Text style={styles.feedTitle}>📋 Live Scan Feed</Text>
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isActive
              ? 'Waiting for messages...'
              : 'Start protection to see live scans'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  toggleCard: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  toggleTitle: { fontSize: 17, fontWeight: 'bold', color: '#F1F5F9' },
  toggleSub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: {
    flex: 1, borderRadius: 14, padding: 16, alignItems: 'center',
  },
  statNum: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: '#fff', marginTop: 4 },
  feedTitle: {
    fontSize: 16, fontWeight: 'bold',
    color: '#F1F5F9', marginBottom: 12,
  },
  historyCard: {
    backgroundColor: '#1E293B', borderRadius: 12,
    padding: 14, marginBottom: 10, borderLeftWidth: 4,
  },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6,
  },
  historySource: { color: '#F1F5F9', fontWeight: '600', fontSize: 13 },
  historyTime: { color: '#64748B', fontSize: 11 },
  historyMsg: { color: '#94A3B8', fontSize: 13 },
  scamType: { color: '#FCA5A5', fontSize: 12, marginTop: 6 },
  emptyText: { color: '#475569', textAlign: 'center', marginTop: 40 },
});
