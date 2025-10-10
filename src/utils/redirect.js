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
 * Get validated redirect URL from state
 * @param {Object} state - Parsed OAuth state object
 * @returns {string} Validated redirect URL
 */
export function getValidatedRedirectUrl(state) {
  const returnUrl = state?.returnUrl;
  
  // Validate that returnUrl starts with a trusted domain
  if (returnUrl && TRUSTED_DOMAINS.some(domain => returnUrl.startsWith(domain))) {
    return returnUrl; // returnUrl already contains /auth/callback
  }
  
  // Fallback to environment-specific URL
  return `${process.env.FRONTEND_URL || 'https://www.revalenz.de'}/auth/callback`;
}

