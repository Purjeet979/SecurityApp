import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Switch, Alert,
  PermissionsAndroid, Platform, NativeModules
} from 'react-native';
const { AegisSecurity } = NativeModules;
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startSMSListener, stopSMSListener } from '../services/smsListener';
import {
  checkNotificationPermission,
  requestNotificationPermission
} from '../services/notificationListener';
import { getRiskColor, getRiskEmoji } from '../services/scamDetector';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [isActive, setIsActive] = useState(false);
  const [isAmbientActive, setIsAmbientActive] = useState(false);
  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ high: 0, medium: 0, low: 0 });

  useEffect(() => {
    loadHistory();
    AsyncStorage.getItem('isProtectionActive').then(val => setIsActive(val === 'true'));
    checkSecurityStatus();
    const interval = setInterval(() => {
      loadHistory();
      checkSecurityStatus();
    }, 8000); // Increased to 8s for performance
    return () => clearInterval(interval);
  }, []);

  const checkSecurityStatus = async () => {
    if (Platform.OS === 'android' && AegisSecurity) {
      const ambient = await AegisSecurity.isAccessibilityServiceEnabled();
      setIsAmbientActive(ambient);
      const overlay = await AegisSecurity.isOverlayPermissionEnabled();
      setIsOverlayActive(overlay);
    }
  };

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
      // Request necessary permissions for SMS, Calls, Notifications, and Camera
      if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ];

        if (Platform.Version >= 33) {
          permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }

        await PermissionsAndroid.requestMultiple(permissions);
      }

      // ... rest of toggleProtection ...
      const hasNotifPerm = await checkNotificationPermission();
      if (!hasNotifPerm) {
        Alert.alert(
          '🔔 Permission Needed',
          'Enable Notification Access so Aegis can scan WhatsApp previews',
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
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <>
            {/* Header Section */}
            <View style={styles.header}>
              <Text style={styles.greeting}>Aegis</Text>
              <Text style={styles.appStatus}>🛡️ Anti-Scam Protection Active</Text>
            </View>

            {/* Modern Protection Center Card */}
            <View style={[styles.protectionCard, isActive && styles.protectionActive]}>
              <View style={styles.protectionInfo}>
                <View style={[styles.statusIndicator, { backgroundColor: isActive ? '#10B981' : '#64748B' }]} />
                <View>
                  <Text style={styles.protectionTitle}>
                    {isActive ? 'System Protected' : 'Protection Disabled'}
                  </Text>
                  <Text style={styles.protectionSubtitle}>
                    {isActive ? 'Real-time scanning active' : 'Turn on to secure your device'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isActive}
                onValueChange={toggleProtection}
                trackColor={{ false: '#334155', true: '#059669' }}
                thumbColor={isActive ? '#ffffff' : '#94A3B8'}
              />
            </View>

            {/* Ambient Protection Card */}
            <View style={[styles.protectionCard, isAmbientActive && styles.ambientActive]}>
              <View style={styles.protectionInfo}>
                <View style={[styles.statusIndicator, { backgroundColor: isAmbientActive ? '#6366F1' : '#64748B' }]} />
                <View>
                  <Text style={styles.protectionTitle}>
                    {isAmbientActive ? 'Ambient Guard On' : 'Ambient Protection'}
                  </Text>
                  <Text style={styles.protectionSubtitle}>
                    {isAmbientActive ? 'Monitoring payment apps' : 'Enable to auto-scan GPay/PhonePe'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isAmbientActive}
                onValueChange={(val) => {
                  if (val && !isAmbientActive) {
                    Alert.alert(
                      '🛡️ Ambient Protection',
                      'Enable Aegis Accessibility Service to protect you inside other apps.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Settings', onPress: () => AegisSecurity?.openAccessibilitySettings() }
                      ]
                    );
                  }
                }}
                trackColor={{ false: '#334155', true: '#6366F1' }}
                thumbColor={isAmbientActive ? '#ffffff' : '#94A3B8'}
              />
            </View>

            {/* Call Overlay Shield Card */}
            <View style={[styles.protectionCard, isOverlayActive && styles.overlayActive]}>
              <View style={styles.protectionInfo}>
                <View style={[styles.statusIndicator, { backgroundColor: isOverlayActive ? '#EF4444' : '#64748B' }]} />
                <View>
                  <Text style={styles.protectionTitle}>
                    {isOverlayActive ? 'Call Shield Active' : 'Call Overlay Shield'}
                  </Text>
                  <Text style={styles.protectionSubtitle}>
                    {isOverlayActive ? 'Draw over calls enabled' : 'Show warnings during active calls'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isOverlayActive}
                onValueChange={(val) => {
                  if (val && !isOverlayActive) {
                    Alert.alert(
                      '📞 Call Shield',
                      'Aegis needs permission to draw over other apps to show warnings during calls.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Enable', onPress: () => AegisSecurity?.openOverlaySettings() }
                      ]
                    );
                  }
                }}
                trackColor={{ false: '#334155', true: '#EF4444' }}
                thumbColor={isOverlayActive ? '#ffffff' : '#94A3B8'}
              />
            </View>

            {/* Premium Stats Row */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={{ fontSize: 18 }}>🚨</Text>
                </View>
                <Text style={styles.statCount}>{stats.high}</Text>
                <Text style={styles.statDesc}>Danger</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Text style={{ fontSize: 18 }}>⚠️</Text>
                </View>
                <Text style={styles.statCount}>{stats.medium}</Text>
                <Text style={styles.statDesc}>Warn</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={{ fontSize: 18 }}>🛡️</Text>
                </View>
                <Text style={styles.statCount}>{stats.low}</Text>
                <Text style={styles.statDesc}>Safe</Text>
              </View>
            </View>

            {/* Security Tools Section */}
            <Text style={styles.sectionTitle}>Security Tools</Text>
            <View style={styles.toolsGrid}>
              <TouchableOpacity
                style={styles.toolCard}
                onPress={() => navigation.navigate('QRScanner')}
              >
                <View style={[styles.toolIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={{ fontSize: 20 }}>🔍</Text>
                </View>
                <Text style={styles.toolLabel}>Scan QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolCard}
                onPress={() => navigation.navigate('LinkScanner')}
              >
                <View style={[styles.toolIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Text style={{ fontSize: 20 }}>🔗</Text>
                </View>
                <Text style={styles.toolLabel}>Check Link</Text>
              </TouchableOpacity>
            </View>

            {/* Activity Feed Header */}
            <View style={styles.feedHeader}>
              <Text style={styles.feedTitle}>Activity Feed</Text>
              <TouchableOpacity onPress={loadHistory}>
                <Text style={styles.refreshBtn}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>
              {isActive ? 'Scanning incoming threads...' : 'Protection is currently inactive'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810', paddingHorizontal: 20 },
  header: { marginTop: 24, marginBottom: 28 },
  greeting: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  appStatus: { fontSize: 13, color: '#6366F1', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 },

  protectionCard: {
    backgroundColor: '#111827', borderRadius: 24, padding: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#1F2937', marginBottom: 24,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  protectionActive: { borderColor: '#065F46', backgroundColor: '#064E3B' },
  ambientActive: { borderColor: '#3730A3', backgroundColor: '#312E81' },
  overlayActive: { borderColor: '#991B1B', backgroundColor: '#7F1D1D' },
  protectionInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusIndicator: { width: 12, height: 12, borderRadius: 6 },
  protectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  protectionSubtitle: { color: '#94A3B8', fontSize: 13, marginTop: 2 },

  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statItem: {
    flex: 1, backgroundColor: '#111827', borderRadius: 20, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#1F2937'
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statCount: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  statDesc: { color: '#64748B', fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },

  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  feedTitle: { fontSize: 20, fontWeight: '700', color: '#F8FAFC' },
  refreshBtn: { color: '#6366F1', fontWeight: 'bold', fontSize: 14 },

  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#F8FAFC', marginBottom: 16, marginTop: 10 },
  toolsGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  toolCard: {
    flex: 1, backgroundColor: '#111827', borderRadius: 20, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#1F2937'
  },
  toolIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  toolLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  listContent: { paddingBottom: 24 },
  historyCard: {
    backgroundColor: '#111827', borderRadius: 18, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: '#1F2937',
    borderLeftWidth: 6,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historySource: { color: '#F1F5F9', fontWeight: '700', fontSize: 15 },
  historyTime: { color: '#475569', fontSize: 11, fontWeight: '600' },
  historyMsg: { color: '#94A3B8', fontSize: 14, lineHeight: 20 },
  scamType: { color: '#EF4444', fontSize: 12, fontWeight: 'bold', marginTop: 10, letterSpacing: 0.5 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 16 },
  emptyText: { color: '#475569', textAlign: 'center', fontSize: 15, paddingHorizontal: 40 },
});
