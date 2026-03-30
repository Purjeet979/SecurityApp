import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, ActivityIndicator,
  Alert, Clipboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { analyzeURL } from '../services/urlScanner';

export default function LinkScannerScreen() {
  const navigation = useNavigation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    
    // Simple validation adding https if missing
    let target = url.trim();
    if (!target.startsWith('http')) {
      target = 'https://' + target;
    }

    setLoading(true);
    try {
      const report = await analyzeURL(target);
      setResult(report);
    } catch (e) {
      Alert.alert('Error', 'Could not analyze URL. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  const pasteFromClipboard = async () => {
    const content = await Clipboard.getString();
    if (content) setUrl(content);
  };

  const getRiskColor = (risk) => {
    if (risk === 'high') return '#EF4444';
    if (risk === 'medium') return '#F59E0B';
    return '#10B981';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={{ fontSize: 24, color: '#FFFFFF' }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Link Scanner</Text>
        </View>

        <Text style={styles.subtitle}>
          Paste any link to analyze it for phishing, lookalike domains, and suspicious redirects.
        </Text>

        {/* Input Card */}
        <View style={styles.inputCard}>
          <View style={styles.inputWrapper}>
             <TextInput
              style={styles.input}
              placeholder="Enter or paste URL (e.g. sbi-net.com)"
              placeholderTextColor="#475569"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {url.length > 0 && (
              <TouchableOpacity onPress={() => setUrl('')}>
                <Text style={{ color: '#64748B', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={pasteFromClipboard} style={styles.pasteBtn}>
              <Text style={styles.pasteText}>Paste Link</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.scanBtn, (!url.trim() || loading) && styles.disabledBtn]}
              onPress={handleAnalyze}
              disabled={!url.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.scanBtnText}>Scan Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Result Detailed Section */}
        {result && (
          <View style={styles.resultContainer}>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(result.risk) }]}>
              <Text style={styles.riskLabel}>{result.risk.toUpperCase()} RISK</Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.domainName}>{result.domain}</Text>
              
              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Analysis Details</Text>
              
              {result.redFlags.length > 0 ? (
                result.redFlags.map((flag, i) => (
                  <View key={i} style={styles.flagItem}>
                    <Text style={styles.flagEmoji}>⚠️</Text>
                    <Text style={styles.flagText}>{flag}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.flagItem}>
                  <Text style={styles.flagEmoji}>✅</Text>
                  <Text style={styles.flagSafe}>No immediate red flags detected.</Text>
                </View>
              )}

              <View style={styles.adviceBox}>
                <Text style={styles.adviceLabel}>PRO TIP</Text>
                <Text style={styles.adviceText}>
                  {result.risk === 'high' 
                    ? "NEVER enter your bank passwords or OTPs on this site. Close it immediately."
                    : "Even if marked safe, always verify the source of the link."}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  scroll: { padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { color: '#94A3B8', fontSize: 15, lineHeight: 22, marginBottom: 32 },

  inputCard: { 
    backgroundColor: '#111827', borderRadius: 24, 
    padding: 16, borderWidth: 1, borderColor: '#1F2937',
    marginBottom: 32 
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#050810', borderRadius: 16,
    paddingHorizontal: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#1F2937'
  },
  input: { flex: 1, height: 56, color: '#FFFFFF', fontSize: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  pasteBtn: { paddingHorizontal: 20, justifyContent: 'center' },
  pasteText: { color: '#6366F1', fontWeight: '700' },
  scanBtn: { 
    flex: 1, backgroundColor: '#6366F1', height: 56, 
    borderRadius: 16, justifyContent: 'center', alignItems: 'center' 
  },
  disabledBtn: { opacity: 0.5 },
  scanBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

  resultContainer: { gap: 16 },
  riskBadge: { 
    paddingVertical: 10, paddingHorizontal: 20, 
    borderRadius: 50, alignSelf: 'flex-start' 
  },
  riskLabel: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 1, fontSize: 12 },
  
  detailCard: { 
    backgroundColor: '#111827', borderRadius: 24, 
    padding: 24, borderWidth: 1, borderColor: '#1F2937' 
  },
  domainName: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#1F2937', marginBottom: 20 },
  sectionTitle: { color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 16 },
  flagItem: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  flagEmoji: { fontSize: 16 },
  flagText: { color: '#F87171', fontSize: 14, flex: 1, fontWeight: '500' },
  flagSafe: { color: '#10B981', fontSize: 14, fontWeight: '500' },

  adviceBox: { 
    marginTop: 20, padding: 16, backgroundColor: '#1E1B4B', 
    borderRadius: 16, borderWidth: 1, borderColor: '#312E81' 
  },
  adviceLabel: { color: '#818CF8', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  adviceText: { color: '#C7D2FE', fontSize: 13, lineHeight: 18 }
});
