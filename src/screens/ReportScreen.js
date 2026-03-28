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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>📢 Report Assistant</Text>
        <Text style={styles.subtitle}>
          Step-by-step guide to report fake profiles & scams
        </Text>

        <View style={styles.emergencyBox}>
          <Text style={styles.emergencyTitle}>🚨 Being Digitally Arrested?</Text>
          <Text style={styles.emergencyText}>
            REMEMBER: Digital Arrest is FAKE. No government agency arrests
            you over a call. Hang up immediately!
          </Text>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL('tel:1930')}
          >
            <Text style={styles.callBtnText}>📞 Call Cyber Helpline 1930</Text>
          </TouchableOpacity>
        </View>

        {REPORT_STEPS.map((item, i) => (
          <View key={i} style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setExpanded(expanded === i ? null : i)}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={styles.cardTitle}>{item.platform}</Text>
              </View>
              <Text style={styles.chevron}>
                {expanded === i ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {expanded === i && (
              <View style={styles.stepsContainer}>
                {item.steps.map((step, j) => (
                  <View key={j} style={styles.stepRow}>
                    <View style={[styles.stepNum,
                      { backgroundColor: item.color }]}>
                      <Text style={styles.stepNumText}>{j + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.openBtn, { backgroundColor: item.color }]}
                  onPress={() => Linking.openURL(item.link)}
                >
                  <Text style={styles.openBtnText}>Open {item.platform} →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 20 },
  emergencyBox: {
    backgroundColor: '#7F1D1D', borderRadius: 16,
    padding: 20, marginBottom: 24, gap: 10,
  },
  emergencyTitle: { color: '#FCA5A5', fontSize: 18, fontWeight: 'bold' },
  emergencyText: { color: '#FECACA', fontSize: 13, lineHeight: 20 },
  callBtn: {
    backgroundColor: '#DC2626', padding: 14,
    borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  callBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: {
    backgroundColor: '#1E293B', borderRadius: 16,
    marginBottom: 16, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 18,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#F1F5F9' },
  chevron: { color: '#64748B', fontSize: 14 },
  stepsContainer: { padding: 16, paddingTop: 0, gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  stepNumText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  stepText: { color: '#CBD5E1', fontSize: 14, flex: 1 },
  openBtn: {
    padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
  },
  openBtnText: { color: '#fff', fontWeight: 'bold' },
});
