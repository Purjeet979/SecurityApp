import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Linking
} from 'react-native';

const REPORT_STEPS = [
  {
    platform: 'Instagram',
    icon: '📷',
    color: '#E1306C',
    steps: [
      'Go to the fake profile',
      'Tap the 3 dots (⋮) on top right',
      'Select "Report"',
      'Choose "Pretending to be someone"',
      'Select "Me" and submit'
    ],
    link: 'https://www.instagram.com'
  },
  {
    platform: 'Cybercrime Portal (India)',
    icon: '🏛️',
    color: '#1D4ED8',
    steps: [
      'Visit cybercrime.gov.in',
      'Click "Report Other Cyber Crime"',
      'Register/Login',
      'Fill complaint form with screenshots',
      'Submit and note complaint number'
    ],
    link: 'https://cybercrime.gov.in'
  },
  {
    platform: 'National Helpline',
    icon: '📞',
    color: '#059669',
    steps: [
      'Call 1930 (Cyber Crime Helpline)',
      'Available 24/7',
      'Keep screenshot evidence ready',
      'Note down your complaint number'
    ],
    link: 'tel:1930'
  },
];

export default function ReportScreen() {
  const [expanded, setExpanded] = useState(null);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Report Guide</Text>
          <Text style={styles.subtitle}>
            Follow these steps to report scams and fake identities effectively.
          </Text>
        </View>

        {/* Modern Emergency Card */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyIconArea}>
            <Text style={{ fontSize: 24 }}>🚨</Text>
          </View>
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>URGENT: Digital Arrests</Text>
            <Text style={styles.emergencyText}>
              Government agencies NEVER arrest people over calls. Hang up and report immediately.
            </Text>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL('tel:1930')}
            >
              <Text style={styles.callBtnText}>Call National Helpline 1930</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Report Platforms */}
        <Text style={styles.sectionLabel}>Select Platform</Text>
        {REPORT_STEPS.map((item, i) => (
          <View key={i} style={[styles.platformCard, expanded === i && styles.platformExpanded]}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setExpanded(expanded === i ? null : i)}
              activeOpacity={0.7}
            >
              <View style={styles.cardInfo}>
                <View style={[styles.platformIcon, { backgroundColor: item.color + '22' }]}>
                  <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.platform}</Text>
              </View>
              <Text style={[styles.chevron, { transform: [{ rotate: expanded === i ? '180deg' : '0deg' }] }]}>
                ▼
              </Text>
            </TouchableOpacity>

            {expanded === i && (
              <View style={styles.expandedContent}>
                <View style={styles.divider} />
                {item.steps.map((step, j) => (
                  <View key={j} style={styles.stepItem}>
                    <View style={[styles.stepDot, { backgroundColor: item.color }]} />
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: item.color }]}
                  onPress={() => Linking.openURL(item.link)}
                >
                  <Text style={styles.actionBtnText}>Open Official Portal</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  scroll: { paddingHorizontal: 20 },
  header: { marginTop: 24, marginBottom: 28 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#94A3B8', marginTop: 8, lineHeight: 22 },

  emergencyCard: {
    backgroundColor: '#7F1D1D22', borderRadius: 28, padding: 24,
    flexDirection: 'row', gap: 16, borderWidth: 1, borderColor: '#7F1D1D',
    marginBottom: 32,
  },
  emergencyIconArea: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#7F1D1D44', justifyContent: 'center', alignItems: 'center' },
  emergencyContent: { flex: 1 },
  emergencyTitle: { color: '#FCA5A5', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emergencyText: { color: '#FECACA', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  callBtn: {
    backgroundColor: '#EF4444', paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 14, alignItems: 'center',
    elevation: 2, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  callBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  sectionLabel: { color: '#64748B', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginLeft: 4 },
  platformCard: {
    backgroundColor: '#111827', borderRadius: 24,
    marginBottom: 12, borderWidth: 1, borderColor: '#1F2937',
    overflow: 'hidden',
  },
  platformExpanded: { borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  platformIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  chevron: { color: '#475569', fontSize: 12 },

  expandedContent: { padding: 20, paddingTop: 0 },
  divider: { height: 1, backgroundColor: '#1F2937', marginBottom: 20 },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  stepDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  stepText: { color: '#E2E8F0', fontSize: 14, lineHeight: 20, flex: 1, fontWeight: '500' },
  actionBtn: {
    padding: 16, borderRadius: 18,
    alignItems: 'center', marginTop: 8,
  },
  actionBtnText: { color: '#FFFFFF', fontWeight: '800' },
});
