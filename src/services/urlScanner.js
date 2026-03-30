// Phishing URL Scanner Logic
const SUSPICIOUS_TLDS = ['.xyz', '.top', '.online', '.site', '.club', '.vip', '.icu', '.work'];
const TRUSTED_DOMAINS = ['google.com', 'sbi.co.in', 'hdfcbank.com', 'icicibank.com', 'paytm.com', 'amazon.in', 'flipkart.com', 'myloft.xyz'];

export const analyzeURL = async (url) => {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();
    
    let score = 0;
    const redFlags = [];

    // 1. Check for Lookalike Domains
    for (const trusted of TRUSTED_DOMAINS) {
      if (domain !== trusted && !domain.endsWith('.' + trusted) && domain.includes(trusted.split('.')[0])) {
        score += 80;
        redFlags.push(`Lookalike domain: suspicious resemblance to ${trusted}`);
      }
    }

    // 2. Check for Suspicious TLDs
    if (SUSPICIOUS_TLDS.some(tld => domain.endsWith(tld))) {
      score += 30;
      redFlags.push('Using a suspicious Top-Level Domain (TLD)');
    }

    // 3. Check for excessive subdomains or long URLs
    if (domain.split('.').length > 3) {
      score += 20;
      redFlags.push('Excessive subdomains (common in phishing)');
    }

    // 4. Follow Redirects (Deep Scan)
    const finalUrl = await followRedirects(url);
    if (finalUrl !== url) {
      const redirectedDomain = new URL(finalUrl).hostname.toLowerCase();
      if (redirectedDomain !== domain) {
        score += 40;
        redFlags.push('Malicious redirect to a different domain');
      }
    }

    return {
      score: Math.min(score, 100),
      risk: score >= 70 ? 'high' : score >= 30 ? 'medium' : 'low',
      redFlags,
      finalUrl,
      isPhishing: score >= 50,
      domain
    };
  } catch (e) {
    return { score: 0, risk: 'low', isPhishing: false, error: 'Invalid URL' };
  }
};

const followRedirects = async (url) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    return response.url;
  } catch (e) {
    return url;
  }
};
