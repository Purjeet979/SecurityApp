import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, ActivityIndicator
} from 'react-native';

const DIGITAL_ARREST_PATTERNS = [
  'you are under digital arrest',
  'CBI officer', 'narcotics department',
  'your aadhaar is linked to drug',
  'do not tell anyone', 'stay on video call',
  'your account will be frozen',
  'transfer money to safe account',
  'Supreme Court order',
  'ED officer', 'cybercrime branch',
  'your parcel contains drugs',
  'FIR has been registered against you',
  'remain on call or you will be arrested',
];

const SUSPICIOUS_PATTERNS = [
  'send money urgently', 'gift card',
  'you won a lottery', 'click this link',
  'verify your account', 'OTP',
  'your account is blocked',
  'work from home earn',
  'bitcoin investment',
  'share your password',
];

export default function MessageScannerScreen() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const localPatternCheck = (text) => {
    const lower = text.toLowerCase();
    const digitalMatches = DIGITAL_ARREST_PATTERNS
      .filter(p => lower.includes(p.toLowerCase()));
    const suspiciousMatches = SUSPICIOUS_PATTERNS
      .filter(p => lower.includes(p.toLowerCase()));
    return { digitalMatches, suspiciousMatches };
  };

  const analyzeMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);

    const { digitalMatches, suspiciousMatches } = localPatternCheck(message);

    try {
      // Using Groq instead of Claude as prioritized by the user
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_GROQ_API_KEY_HERE',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{
            role: 'user',
            content: `You are a scam detection expert in India. Analyze this message and respond ONLY in JSON format:
{
  "isScam": true/false,
  "scamType": "Digital Arrest / Phishing / Fake Identity / Investment Fraud / None",
  "riskLevel": "high / medium / low",
  "redFlags": ["flag1", "flag2"],
  "whatToDo": "Short advice in simple English",
  "hindiAdvice": "Same advice in Hindi"
}

Message to analyze: "${message}"`
          }]
        })
      });

      const data = await response.json();
      const text = data.choices[0].message.content;
      const clean = text.replace(/```json|```/g, '').trim();
      const aiResult = JSON.parse(clean);

      setResult({
        ...aiResult,
        digitalMatches,
        suspiciousMatches,
      });
    } catch (e) {
      const isScam = digitalMatches.length > 0 || suspiciousMatches.length > 0;
      setResult({
        isScam,
        scamType: digitalMatches.length > 0 ? 'Digital Arrest' : 'Suspicious',
        riskLevel: digitalMatches.length > 0 ? 'high' : 'medium',
        redFlags: [...digitalMatches, ...suspiciousMatches],
        whatToDo: 'Do not respond. Block and report immediately.',
        hindiAdvice: 'Jawab mat dijiye. Block karein aur report karein.',
        digitalMatches,
        suspiciousMatches,
      });
    }
    setLoading(false);
  };

  const getRiskColor = (level) => ({
    high: '#DC2626', medium: '#D97706', low: '#059669'
  }[level] || '#64748B');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Scam Analysis</Text>
          <Text style={styles.subtitle}>
            Analyze suspicious texts and digital arrest threats.
          </Text>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Expert Tip</Text>
          <Text style={styles.infoText}>
            Digital Arrest is FAKE. No government agency will arrest you over a video call or message. Do not pay!
          </Text>
        </View>

        {/* Input Area */}
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Paste suspicious message here..."
            placeholderTextColor="#475569"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.analyzeBtn, (loading || !message.trim()) && styles.btnDisabled]}
            onPress={analyzeMessage}
            disabled={loading || !message.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.analyzeBtnText}>Verify with Aegis AI</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Result Detailed Section */}
        {result && (
          <View style={styles.resultBox}>
            <View style={[styles.riskHeader, { backgroundColor: getRiskColor(result.riskLevel) }]}>
              <Text style={styles.riskTitle}>
                {result.isScam ? 'DETECTED AS SCAM' : 'PROBABLY SAFE'}
              </Text>
              <Text style={styles.riskSub}>
                {result.scamType} • {result.riskLevel?.toUpperCase()} RISK
              </Text>
            </View>

            <View style={styles.detailCard}>
               {result.redFlags?.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>🚩 Threats Found</Text>
                  <View style={styles.flagsList}>
                    {result.redFlags.map((flag, i) => (
                      <View key={i} style={styles.flagPill}>
                        <Text style={styles.flagText}>{flag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>✅ Action Required</Text>
                <Text style={styles.actionText}>{result.whatToDo}</Text>
              </View>

              <View style={[styles.detailSection, styles.hindiSection]}>
                <Text style={[styles.sectionLabel, { color: '#10B981' }]}>🇮🇳 Hindi Advice</Text>
                <Text style={styles.actionText}>{result.hindiAdvice}</Text>
              </View>
            </View>
          </View>
        )}
        
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

  infoBox: {
    backgroundColor: '#1E1B4B', borderRadius: 24,
    padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#312E81',
  },
  infoTitle: { color: '#818CF8', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  infoText: { color: '#C7D2FE', fontSize: 14, lineHeight: 20 },

  inputCard: { backgroundColor: '#111827', borderRadius: 28, padding: 8, borderWidth: 1, borderColor: '#1F2937', marginBottom: 28 },
  input: {
    padding: 20, color: '#FFFFFF', fontSize: 16,
    minHeight: 160, lineHeight: 24,
  },
  analyzeBtn: {
    backgroundColor: '#6366F1', padding: 18,
    borderRadius: 22, alignItems: 'center', margin: 8,
    elevation: 4, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  btnDisabled: { opacity: 0.5, backgroundColor: '#334155' },
  analyzeBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

  resultBox: { gap: 20 },
  riskHeader: {
    paddingVertical: 18, paddingHorizontal: 24, borderRadius: 24,
    alignItems: 'center', elevation: 4,
  },
  riskTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  riskSub: { color: '#FFFFFF', fontSize: 13, marginTop: 4, fontWeight: '600', opacity: 0.9 },

  detailCard: { backgroundColor: '#111827', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#1F2937' },
  detailSection: { marginBottom: 24 },
  hindiSection: { marginBottom: 0, padding: 16, backgroundColor: '#064E3B22', borderRadius: 20 },
  sectionLabel: { color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  flagsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flagPill: { backgroundColor: '#7F1D1D22', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#7F1D1D' },
  flagText: { color: '#F87171', fontSize: 13, fontWeight: '600' },
  actionText: { color: '#E2E8F0', fontSize: 15, lineHeight: 24, fontWeight: '500' },
});
