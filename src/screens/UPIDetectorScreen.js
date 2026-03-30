import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Image, ScrollView } from 'react-native';
import { analyzeUPI } from '../services/upiScanner';
import { getRiskColor, getRiskEmoji } from '../services/scamDetector';

const UPIDetectorScreen = ({ navigation, route }) => {
  const { upiUrl } = route.params || {};
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (upiUrl) {
      const res = analyzeUPI(upiUrl);
      setAnalysis(res);
    }
  }, [upiUrl]);

  const proceedToPay = () => {
    Linking.openURL(upiUrl);
    navigation.goBack();
  };

  if (!analysis) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: getRiskColor(analysis.risk) }]}>
        <Text style={{ fontSize: 48, color: '#FFF' }}>🛡️</Text>
        <Text style={styles.headerTitle}>UPI Payment Guard</Text>
        <Text style={styles.riskBadge}>{getRiskEmoji(analysis.risk)} {analysis.risk.toUpperCase()} RISK</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.paymentCard}>
          <Text style={styles.label}>Payee Name</Text>
          <Text style={styles.value}>{analysis.upi.pn || 'Unknown'}</Text>
          
          <Text style={styles.label}>VPA Address</Text>
          <Text style={styles.vpaValue}>{analysis.upi.pa}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Amount</Text>
          <Text style={styles.amount}>₹{analysis.upi.am || '0.00'}</Text>

          {analysis.upi.tn && (
            <View style={styles.noteBox}>
              <Text style={styles.label}>Transaction Note</Text>
              <Text style={styles.noteValue}>{analysis.upi.tn}</Text>
            </View>
          )}
        </View>

        {analysis.redFlags.length > 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Security Analysis Results:</Text>
            {analysis.redFlags.map((flag, i) => (
              <View key={i} style={styles.flagItem}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🚨</Text>
                <Text style={styles.flagText}>{flag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.protectionNote}>
          <Text style={{ fontSize: 20, color: '#1E293B', marginRight: 10 }}>ℹ️</Text>
          <Text style={styles.protectionText}>
            Aegis has intercepted this payment request to protect you from common UPI scams like fake "Refund" or "Cashback" frauds.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Discard Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.payBtn, { backgroundColor: analysis.risk === 'high' ? '#B91C1C' : '#059669' }]} 
          onPress={proceedToPay}
        >
          <Text style={styles.payBtnText}>
            {analysis.risk === 'high' ? 'Pay Anyway (Risky)' : 'Proceed to UPI App'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { height: 200, justifyContent: 'center', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  riskBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 10, color: '#FFF', fontWeight: 'bold' },
  content: { padding: 20 },
  paymentCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  label: { fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 15 },
  vpaValue: { fontSize: 16, color: '#334155', marginBottom: 15, fontFamily: 'monospace' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 15 },
  amount: { fontSize: 32, fontWeight: 'bold', color: '#1E293B' },
  noteBox: { marginTop: 15, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10 },
  noteValue: { fontSize: 14, color: '#475569', fontWeight: '500' },
  warningBox: { marginTop: 20, backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2' },
  warningTitle: { color: '#991B1B', fontWeight: 'bold', marginBottom: 10, fontSize: 16 },
  flagItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  flagText: { color: '#B91C1C', fontSize: 14, marginLeft: 10, flex: 1 },
  protectionNote: { flexDirection: 'row', marginTop: 20, padding: 12 },
  protectionText: { color: '#334155', fontSize: 13, marginLeft: 10, flex: 1 },
  footer: { padding: 20, flexDirection: 'row', gap: 12, backgroundColor: '#FFF' },
  cancelBtn: { flex: 1, padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: 'bold' },
  payBtn: { flex: 1.5, padding: 18, borderRadius: 12, alignItems: 'center' },
  payBtnText: { color: '#FFF', fontWeight: 'bold' }
});

export default UPIDetectorScreen;
