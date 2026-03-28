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
          'Authorization': `Bearer ${process.env.GROQ_API_KEY || 'YOUR_GROQ_API_KEY'}`,
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>🚨 Message Scam Detector</Text>
        <Text style={styles.subtitle}>
          Paste any suspicious message — we'll detect digital arrest fraud & scams
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Digital Arrest Scam: Fake officers call/message saying you're
            "digitally arrested" and demand money. This is FAKE — no such law exists!
          </Text>
        </View>

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
          style={styles.analyzeBtn}
          onPress={analyzeMessage}
          disabled={loading || !message.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeBtnText}>🤖 Analyze with AI</Text>
          )}
        </TouchableOpacity>

        {result && (
          <View style={styles.resultContainer}>
            <View style={[styles.riskBadge,
            { backgroundColor: getRiskColor(result.riskLevel) }]}>
              <Text style={styles.riskTitle}>
                {result.isScam ? '🚨 SCAM DETECTED' : '✅ Looks Safe'}
              </Text>
              <Text style={styles.riskSub}>
                {result.scamType} — {result.riskLevel?.toUpperCase()} RISK
              </Text>
            </View>

            {result.redFlags?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🚩 Red Flags Found:</Text>
                {result.redFlags.map((flag, i) => (
                  <Text key={i} style={styles.flagItem}>• {flag}</Text>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ What To Do:</Text>
              <Text style={styles.adviceText}>{result.whatToDo}</Text>
            </View>

            <View style={[styles.section, styles.hindiBox]}>
              <Text style={styles.sectionTitle}>🇮🇳 Hindi Mein:</Text>
              <Text style={styles.adviceText}>{result.hindiAdvice}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 16 },
  infoBox: {
    backgroundColor: '#1E3A5F', borderRadius: 12,
    padding: 14, marginBottom: 20,
  },
  infoText: { color: '#93C5FD', fontSize: 13, lineHeight: 20 },
  input: {
    backgroundColor: '#1E293B', borderRadius: 14,
    padding: 16, color: '#F1F5F9', fontSize: 14,
    minHeight: 120, marginBottom: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  analyzeBtn: {
    backgroundColor: '#DC2626', padding: 16,
    borderRadius: 14, alignItems: 'center', marginBottom: 24,
  },
  analyzeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultContainer: { gap: 16 },
  riskBadge: {
    padding: 20, borderRadius: 16, alignItems: 'center',
  },
  riskTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  riskSub: { color: '#fff', fontSize: 13, marginTop: 4, opacity: 0.9 },
  section: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 16, gap: 8,
  },
  hindiBox: { backgroundColor: '#1A2E1A' },
  sectionTitle: { color: '#F1F5F9', fontWeight: 'bold', fontSize: 15 },
  flagItem: { color: '#FCA5A5', fontSize: 13 },
  adviceText: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },
});
