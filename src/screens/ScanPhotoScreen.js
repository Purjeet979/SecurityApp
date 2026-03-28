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
      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY || 'YOUR_IMGBB_API_KEY'}`, {
        method: 'POST',
        body: formData,
      });
      const imgbbData = await imgbbRes.json();

      if (!imgbbRes.ok || !imgbbData.success) {
        throw new Error("ImgBB Upload Failed");
      }
      const uploadedUrl = imgbbData.data.url;

      // 2. Call SerpApi Google Lens with the uploaded ImgBB URL
      const serpResponse = await fetch(`https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(uploadedUrl)}&api_key=${process.env.SERP_API_KEY || 'YOUR_SERP_API_KEY'}`);

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
        'youtube.com', 'youtu.be', 'reddit.com', 'imdb.com',
        'wikipedia.org', 'twitter.com', 'x.com', 'pinterest.com',
        'tiktok.com', 'facebook.com/watch', 'instagram.com/p/', 'instagram.com/reel/',
        'instagram.com/popular', 'bbc.', 'nytimes.', 'ndtv.', 'hindustantimes.',
        'timesofindia.', 'gettyimages', 'shutterstock', 'alamy',
        'amazon.com', 'flipkart.com', 'linkedin.com', 'quora.com',
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
            'Authorization': `Bearer ${process.env.GROQ_API_KEY || 'YOUR_GROQ_API_KEY'}`,
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [{
              role: 'user',
              content: `You are a photo identity theft detector. The user uploaded their selfie and we ran reverse image search.
After filtering out known platforms (YouTube, Reddit, IMDb, news sites etc.), these are potentially suspicious matches: ${JSON.stringify(suspiciousMatches)}.
Mark as 'danger' if 5+ suspicious sites use this exact photo (clear identity theft).
Mark as 'suspicious' if 1-4 unknown sites have this photo.
Mark as 'safe' if no suspicious results found or all results look like generic lookalikes.
Answer ONLY JSON: {"risk": "safe/suspicious/danger"}`
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
        matches: suspiciousMatches.slice(0, 5),
        risk: aiAnalysis.risk
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>📸 Photo Theft Scanner</Text>
        <Text style={styles.subtitle}>
          Upload your photo to find if someone is using it without permission
        </Text>

        <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.preview} />
          ) : (
            <>
              <Text style={styles.uploadIcon}>📁</Text>
              <Text style={styles.uploadText}>Tap to select photo</Text>
            </>
          )}
        </TouchableOpacity>

        {image && (
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={scanPhoto}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.scanBtnText}>🔍 Scan for Fakes</Text>
            )}
          </TouchableOpacity>
        )}

        {results && !results.error && (
          <View style={styles.resultsBox}>
            <View style={[styles.riskBadge,
            { backgroundColor: getRiskColor(results.risk) }]}>
              <Text style={styles.riskText}>{getRiskLabel(results.risk)}</Text>
            </View>
            <Text style={styles.matchCount}>
              {results.count > 0
                ? `⚠️ Found ${results.count} suspicious sources (out of ${results.totalFound} total scanned)`
                : `✅ No suspicious sources found (${results.totalFound} sites checked)`
              }
            </Text>
            {results.matches.map((match, i) => (
              <TouchableOpacity
                key={i}
                style={styles.matchCard}
                onPress={() => Linking.openURL(match.link)}
              >
                <Text style={styles.matchDomain}>🌐 {match.source}</Text>
                <Text style={styles.matchUrl} numberOfLines={1}>
                  {match.link}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {results?.error && (
          <Text style={styles.errorText}>
            ❌ Something went wrong while communicating with APIs.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 24 },
  uploadBox: {
    height: 200, borderRadius: 16, borderWidth: 2,
    borderColor: '#334155', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1E293B', marginBottom: 16,
  },
  uploadIcon: { fontSize: 48 },
  uploadText: { color: '#64748B', marginTop: 8 },
  preview: { width: '100%', height: '100%', borderRadius: 14 },
  scanBtn: {
    backgroundColor: '#4F46E5', padding: 16,
    borderRadius: 14, alignItems: 'center', marginBottom: 20,
  },
  scanBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultsBox: { gap: 12 },
  riskBadge: { padding: 14, borderRadius: 12, alignItems: 'center' },
  riskText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  matchCount: { color: '#94A3B8', textAlign: 'center', marginVertical: 8 },
  matchCard: {
    backgroundColor: '#1E293B', padding: 14,
    borderRadius: 12, gap: 4,
  },
  matchDomain: { color: '#F1F5F9', fontWeight: '600' },
  matchUrl: { color: '#64748B', fontSize: 12 },
  errorText: { color: '#F87171', textAlign: 'center', marginTop: 20 },
});
