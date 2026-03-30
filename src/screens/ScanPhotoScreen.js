import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, Image,
  ActivityIndicator, ScrollView, Linking
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

export default function ScanPhotoScreen() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.7,
    });

    if (result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
      setResults(null);
    }
  };

  const scanPhoto = async () => {
    if (!image) return;
    setLoading(true);
    try {
      // 1. Upload the image to ImgBB to get a public URL for SerpApi
      const formData = new FormData();
      formData.append('image', {
        uri: image,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      // Replace YOUR_IMGBB_API_KEY with user's actual key
      const imgbbRes = await fetch('https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY_HERE', {
        method: 'POST',
        body: formData,
      });
      const imgbbData = await imgbbRes.json();

      if (!imgbbRes.ok || !imgbbData.success) {
        throw new Error("ImgBB Upload Failed");
      }
      const uploadedUrl = imgbbData.data.url;

      // 2. Call SerpApi Google Lens with the uploaded ImgBB URL
      const serpResponse = await fetch(`https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(uploadedUrl)}&api_key=YOUR_SERPAPI_KEY_HERE`);

      let matches = [];
      if (serpResponse.ok) {
        const serpData = await serpResponse.json();
        matches = serpData.visual_matches || [];
      } else {
        matches = [];
      }

      // Filter out known legitimate platforms — Google Lens matches similar-looking faces from these,
      // which is NOT identity theft. Only keep unknown/suspicious-looking sources.
      const SAFE_PLATFORMS = [
        'youtube.com', 'youtu.be', 'reddit.com', 'imdb.com', 'wikipedia.org',
        'quora.com', 'amazon.', 'flipkart.', 'pinterest.com',
        'news', 'daily', 'post', 'journal', 'express', 'tribune', 'monitor',
        'gazette', 'chronicle', 'espn', 'sports', 'cric', 'soccer', 'football',
        'edu', 'school', 'university', 'college', 'wiki', 'blog', 'wallpaper',
        'stock', 'photo', 'free', 'download', 'alamy', 'shutterstock', 'getty',
        'bbc.', 'nytimes.', 'ndtv.', 'hindustantimes.', 'timesofindia.', 'reuters',
        'apnews', 'cnn.', 'fox', 'aljazeera', 'medium.com', 'livelaw', 'thesun',
        'scroll.in', 'thequint', 'thehindu', 'firstpost', 'moneycontrol', 'ndtv'
      ];

      const suspiciousMatches = matches.filter(m => {
        const link = (m.link || '').toLowerCase();
        return !SAFE_PLATFORMS.some(safe => link.includes(safe));
      });

      // 3. Call Groq AI analysis — only on suspicious matches (not generic video/news lookalikes)
      // Default: safe unless 3+ unknown/suspicious sources found
      let aiAnalysis = { risk: suspiciousMatches.length >= 3 ? 'suspicious' : 'safe' };

      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_GROQ_API_KEY_HERE',
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [{
              role: 'user',
              content: `Detect Identity Misuse. Input: ${JSON.stringify(suspiciousMatches)}.

CRITICAL RULES:
1. If this is a PUBLIC FIGURE (e.g., MS Dhoni):
   - Do NOT give 0 score. If found on multiple Social Media platforms, give a score of 30-60.
   - Reason: "Public figure media detected on multiple social platforms (Fan pages/Media)."
2. If this is a PRIVATE PERSON (Selfie):
   - Mark as 'danger' (80-100) if used on multiple Instagram, Facebook, or X accounts.
   - Reason: "Identity theft detected: Your photo is being used to impersonate you."
3. If found on 5+ Social Media sites, the risk should NEVER be 'safe'.
4. Prioritize Instagram, Facebook, and Twitter matches.

Answer ONLY JSON: {"risk": "safe/suspicious/danger", "score": 1-100, "reason": "short explanation"}`
            }]
          })
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const cleanText = groqData.choices[0].message.content.replace(/```json|```/g, '').trim();
          aiAnalysis = JSON.parse(cleanText);
        }
      } catch (e) {
        console.log("Groq API failed fallback");
      }

      setResults({
        count: suspiciousMatches.length,
        totalFound: matches.length,
        matches: suspiciousMatches.slice(0, 8),
        risk: aiAnalysis.risk,
        score: aiAnalysis.score || 0,
        reason: aiAnalysis.reason || 'Visual similarity scan complete.',
        publicUrl: uploadedUrl
      });
    } catch (e) {
      setResults({ error: true });
    }
    setLoading(false);
  };

  const getRiskColor = (risk) => ({
    safe: '#059669', suspicious: '#D97706', danger: '#DC2626'
  }[risk] || '#64748B');

  const getRiskLabel = (risk) => ({
    safe: '✅ Safe — No copies found',
    suspicious: '⚠️ Suspicious — Found in a few places',
    danger: '🚨 Danger — Your photo is being misused!'
  }[risk] || 'Unknown Risk');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Aegis Scanner</Text>
          <Text style={styles.subtitle}>
            Detect if your identity is being misused across the web.
          </Text>
        </View>

        {/* Modern Upload Area */}
        <TouchableOpacity
          style={[styles.uploadBox, image && styles.uploadBoxWithImage]}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.preview} />
          ) : (
            <View style={styles.uploadContent}>
              <View style={styles.iconCircle}>
                <Text style={styles.uploadIcon}>📸</Text>
              </View>
              <Text style={styles.uploadTitle}>Upload Your Photo</Text>
              <Text style={styles.uploadSub}>Tap to select from gallery</Text>
            </View>
          )}
        </TouchableOpacity>

        {image && (
          <TouchableOpacity
            style={[styles.scanBtn, loading && styles.scanBtnDisabled]}
            onPress={scanPhoto}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.scanBtnText}>Run Security Scan</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Results Section */}
        {results && !results.error && (
          <View style={styles.resultsBox}>
            <View style={[styles.riskPill, { backgroundColor: getRiskColor(results.risk) }]}>
              <Text style={styles.riskText}>{getRiskLabel(results.risk)}</Text>
            </View>


            {results.matches.length > 0 && (
              <View style={styles.matchesList}>
                <Text style={styles.listHeader}>Top Suspicious Sources</Text>
                {results.matches.map((match, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.matchCard}
                    onPress={() => Linking.openURL(match.link)}
                  >
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchDomain}>🌐 {match.source || 'Unknown Source'}</Text>
                      <Text style={styles.matchUrl} numberOfLines={1}>
                        {match.link}
                      </Text>
                    </View>
                    <Text style={styles.openIcon}>↗️</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {results?.error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              🔒 Connection timed out. Please check your internet and try again.
            </Text>
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
  header: { marginTop: 24, marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#94A3B8', marginTop: 8, lineHeight: 22 },

  uploadBox: {
    height: 240, borderRadius: 28, borderWidth: 1,
    borderColor: '#1F2937', borderStyle: 'solid',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#111827', marginBottom: 20,
    overflow: 'hidden',
  },
  uploadBoxWithImage: { borderColor: '#4F46E5', borderWidth: 2 },
  uploadContent: { alignItems: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  uploadIcon: { fontSize: 24 },
  uploadTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  uploadSub: { color: '#64748B', fontSize: 14, marginTop: 4 },
  preview: { width: '100%', height: '100%' },

  scanBtn: {
    backgroundColor: '#6366F1', padding: 18,
    borderRadius: 20, alignItems: 'center', marginBottom: 32,
    elevation: 4, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  scanBtnDisabled: { opacity: 0.6 },
  scanBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },

  resultsBox: { gap: 20 },
  riskPill: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 100, alignItems: 'center' },
  riskText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },

  summaryCard: { backgroundColor: '#111827', padding: 24, borderRadius: 28, borderWidth: 1, borderColor: '#1F2937', marginBottom: 12 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  summaryTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  scoreLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  scoreValue: { fontSize: 16, fontWeight: '900' },
  reasonText: { color: '#F8FAFC', fontSize: 15, fontStyle: 'italic', lineHeight: 24, marginBottom: 16 },
  summaryFooter: { color: '#64748B', fontSize: 12, lineHeight: 18 },

  matchesList: { marginTop: 8 },
  listHeader: { color: '#64748B', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginLeft: 4 },
  matchCard: {
    backgroundColor: '#111827', padding: 18,
    borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#1F2937'
  },
  matchInfo: { flex: 1, marginRight: 12 },
  matchDomain: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  matchUrl: { color: '#475569', fontSize: 12 },
  openIcon: { color: '#64748B', fontSize: 16 },

  errorCard: { backgroundColor: '#7F1D1D33', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#7F1D1D' },
  errorText: { color: '#F87171', textAlign: 'center', fontSize: 14, fontWeight: '600' },
});
