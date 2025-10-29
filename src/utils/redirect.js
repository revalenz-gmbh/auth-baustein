// Shared redirect logic for OAuth callbacks

const TRUSTED_DOMAINS = [
  'https://www.revalenz.de',
  'https://revalenz.de',
  'https://benefizshow.de',
  'https://www.benefizshow.de',
  'http://localhost:5173', // Dev
  'http://localhost:3000'  // Dev
];

/**
 * Normalize and validate a URL
 * @param {string} url - URL to normalize
 * @returns {string|null} Normalized URL or null if invalid
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  // Remove whitespace and fix common issues
  url = url.trim();
  
  // Fix missing colon after protocol
  url = url.replace(/^https\/\//, 'https://');
  url = url.replace(/^http\/\//, 'http://');
  
  // Remove comma-separated parts (parsing error indicator)
  if (url.includes(',')) {
    const parts = url.split(',');
    url = parts[0].trim(); // Take first part only
  }
  
  // Validate URL format
  try {
    new URL(url); // Throws if invalid
    return url;
  } catch {
    return null;
  }
}

/**
 * Get validated redirect URL from state
 * @param {Object} state - Parsed OAuth state object
 * @returns {string} Validated redirect URL
 */
export function getValidatedRedirectUrl(state) {
  let returnUrl = state?.returnUrl;
  
  // Debug logging
  console.log('🔍 Redirect Debug - Raw State:', {
    stateType: typeof state,
    stateKeys: state ? Object.keys(state) : [],
    rawReturnUrl: returnUrl,
    stateJSON: JSON.stringify(state, null, 2)
  });
  
  // Normalize the URL
  returnUrl = normalizeUrl(returnUrl);
  
  console.log('🔍 Redirect Debug - After Normalization:', {
    normalizedReturnUrl: returnUrl,
    trustedDomains: TRUSTED_DOMAINS
  });
  
  // Validate that returnUrl starts with a trusted domain
  if (returnUrl && TRUSTED_DOMAINS.some(domain => returnUrl.startsWith(domain))) {
    console.log('✅ Validated returnUrl:', returnUrl);
    return returnUrl; // returnUrl already contains /auth/callback
  }
  
  // Fallback to environment-specific URL
  const fallback = `${process.env.FRONTEND_URL || 'https://www.revalenz.de'}/auth/callback`;
  console.log('⚠️ Using fallback URL:', fallback, '(original returnUrl was:', state?.returnUrl, ')');
  return fallback;
}

