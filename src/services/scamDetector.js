// Local pattern detection — works offline, instant
const DIGITAL_ARREST_PATTERNS = [
  'digital arrest', 'CBI officer', 'narcotics',
  'aadhaar linked to drug', 'do not tell anyone',
  'stay on video call', 'transfer to safe account',
  'Supreme Court order', 'ED officer',
  'parcel contains drugs', 'FIR registered',
  'remain on call or arrested', 'cyber crime branch',
  'income tax raid', 'money laundering',
];

const PHISHING_PATTERNS = [
  'click this link', 'click here', 'click on this', 'tap here', 'verify your account',
  'your account blocked', 'send otp', 'otp', 'opt',
  'kyc update', 'bank account suspended',
  'winning prize', 'lottery winner',
  'work from home earn', 'per day income',
  'password', 'pin code', 'money transfer',
  'transfer money', 'freeze'
];

const URGENCY_PATTERNS = [
  'immediately', 'urgent', 'right now',
  'last warning', 'final notice',
  'act now', 'limited time',
  'abhi karo', 'turant', 'warna',
];

const EMERGENCY_PATTERNS = [
  'accident', 'hospital', 'emergency', 'bhejo',
  'help', 'bachao', 'urgent money', 'fata fat',
  'jaldi', 'paise bhejo', 'lakh bhejo'
];

const CRITICAL_PATTERNS = [
  'otp', 'send otp', 'one time password', 'pin code', 'cvv',
  'kyc update', 'account blocked', 'bank account suspended',
  'digital arrest', 'CBI', 'ED officer', 'drugs', 'parcel'
];

import { analyzeURL } from './urlScanner';

export const analyzeMessage = async (text, useAI = true) => {
  const lower = text.toLowerCase();
  
  // 0. Extract and Scan URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);
  let urlAnalysis = null;
  if (urls && urls.length > 0) {
    urlAnalysis = await analyzeURL(urls[0]);
    if (urlAnalysis.isPhishing) {
      return {
        score: Math.max(80, urlAnalysis.score),
        risk: 'high',
        isScam: true,
        scamType: 'Phishing Link Detected',
        redFlags: urlAnalysis.redFlags,
        whatToDo: `DANGER: The link (${urlAnalysis.domain}) is a known phishing threat. DO NOT CLICK.`,
        hindiAdvice: `Khatra: Yeh link (${urlAnalysis.domain}) ek dhokha hai. Ispe click na karein.`,
        aiAnalyzed: false,
        urlData: urlAnalysis
      };
    }
  }

  // 1. Check for Critical Patterns (Instant 'high' risk)
  const criticalMatches = CRITICAL_PATTERNS.filter(p => lower.includes(p.toLowerCase()));
  if (criticalMatches.length > 0) {
    return {
      score: 100,
      risk: 'high',
      isScam: true,
      scamType: 'Critical Threat',
      redFlags: criticalMatches,
      whatToDo: 'NEVER share OTP/PIN. Aegis has flagged this as a severe threat.',
      hindiAdvice: 'OTP ya PIN kisi ko na dein. Yeh ek bada khatra hai.',
      aiAnalyzed: false
    };
  }

  // 2. Regular Local pattern matching
  const digitalMatches = DIGITAL_ARREST_PATTERNS
    .filter(p => lower.includes(p.toLowerCase()));
  const phishingMatches = PHISHING_PATTERNS
    .filter(p => lower.includes(p.toLowerCase()));
  const urgencyMatches = URGENCY_PATTERNS
    .filter(p => lower.includes(p.toLowerCase()));
  const emergencyMatches = EMERGENCY_PATTERNS
    .filter(p => lower.includes(p.toLowerCase()));

  // Calculate local risk score
  let score = 0;
  score += digitalMatches.length * 40;
  score += phishingMatches.length * 30; 
  score += urgencyMatches.length * 10;
  score += emergencyMatches.length * 40; 
  score = Math.min(score, 100);

  const localResult = {
    score,
    risk: score >= 60 ? 'high' : score >= 25 ? 'medium' : 'low',
    digitalMatches,
    phishingMatches,
    urgencyMatches,
    emergencyMatches,
    isScam: score >= 30,
  };

  // If high risk locally or AI enabled, call Groq
  if (useAI && (score >= 30 || text.length > 50)) {
    try {
      const aiResult = await callGroqAPI(text);
      return { ...localResult, ...aiResult, aiAnalyzed: true };
    } catch (e) {
      return { ...localResult, aiAnalyzed: false };
    }
  }

  return { ...localResult, aiAnalyzed: false };
};

const callGroqAPI = async (text) => {
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
        content: `You are India's top scam detection AI. Analyze this message.
Respond ONLY in JSON:
{
  "isScam": true/false,
  "scamType": "Digital Arrest/Phishing/Fake Identity/Investment/None",
  "risk": "high/medium/low",
  "score": 0-100,
  "redFlags": ["flag1", "flag2"],
  "advice": "Short advice in English",
  "hindiAdvice": "Hindi mein salah"
}

Message: "${text}"`
      }]
    })
  });

  const data = await response.json();
  const clean = data.choices[0].message.content.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
};

export const getRiskColor = (risk) => ({
  high: '#DC2626',
  medium: '#D97706',
  low: '#16A34A',
}[risk] || '#64748B');

export const getRiskEmoji = (risk) => ({
  high: '🔴',
  medium: '🟡',
  low: '🟢',
}[risk] || '⚪');
