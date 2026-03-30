// UPI Scam Detector
export const parseUPI = (url) => {
  try {
    const params = new URLSearchParams(url.split('?')[1]);
    return {
      pa: params.get('pa') || '', // Payee Address
      pn: params.get('pn') || '', // Payee Name
      am: params.get('am') || '', // Amount
      tn: params.get('tn') || '', // Transaction Note
      cu: params.get('cu') || 'INR'
    };
  } catch (e) {
    return null;
  }
};

export const analyzeUPI = (url) => {
  const upi = parseUPI(url);
  if (!upi) return { risk: 'low', isScam: false };

  let score = 0;
  const redFlags = [];

  const note = upi.tn.toLowerCase();
  const name = upi.pn.toLowerCase();
  const vpa = upi.pa.toLowerCase();

  // 1. Check for "Receive Money" Scam patterns
  const receiveScams = ['refund', 'cashback', 'lottery', 'reward', 'winning', 'receive', 'gift'];
  if (receiveScams.some(keyword => note.includes(keyword))) {
    score += 70;
    redFlags.push(`Suspicious note: "${upi.tn}". Scammers use these keywords to trick you into paying when you think you are receiving.`);
  }

  // 2. VPA vs Name Mismatch or Generic VPA for Brand
  const brands = ['sbi', 'hdfc', 'icici', 'paytm', 'amazon', 'flipkart', 'google'];
  for (const brand of brands) {
    if (name.includes(brand) && !vpa.includes(brand)) {
      score += 50;
      redFlags.push(`VPA Mismatch: Name says "${upi.pn}" but VPA is "${upi.pa}". This might be a fake brand account.`);
    }
  }

  // 3. High amount for unknown payee
  if (parseFloat(upi.am) > 2000) {
    redFlags.push('High transaction amount. Please verify the payee carefully.');
    if (score > 0) score += 20; // Escalation
  }

  return {
    score: Math.min(score, 100),
    risk: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low',
    redFlags,
    upi,
    isScam: score >= 50,
    advice: score >= 60 ? 'STOP! This looks like a common UPI scam.' : 'Be careful common payment requests.'
  };
};
