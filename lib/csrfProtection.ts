// CSRF protection for OAuth flow

interface CSRFToken {
  token: string;
  timestamp: number;
}

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_LENGTH = 32;

// Generate cryptographically secure random token
function generateSecureToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Create CSRF token for OAuth flow
export function createCSRFToken(): string {
  const token: CSRFToken = {
    token: generateSecureToken(),
    timestamp: Date.now()
  };
  
  // Store in sessionStorage with metadata
  sessionStorage.setItem('oauth_csrf_token', JSON.stringify(token));
  
  return token.token;
}

// Validate CSRF token
export function validateCSRFToken(providedToken: string): boolean {
  try {
    const stored = sessionStorage.getItem('oauth_csrf_token');
    if (!stored) return false;
    
    const token: CSRFToken = JSON.parse(stored);
    
    // Check token match
    if (token.token !== providedToken) {
      console.warn('CSRF token mismatch');
      return false;
    }
    
    // Check expiry
    if (Date.now() - token.timestamp > TOKEN_EXPIRY_MS) {
      console.warn('CSRF token expired');
      clearCSRFToken();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('CSRF validation error:', error);
    return false;
  }
}

// Clear CSRF token
export function clearCSRFToken(): void {
  sessionStorage.removeItem('oauth_csrf_token');
}

// Get stored CSRF token
export function getStoredCSRFToken(): string | null {
  try {
    const stored = sessionStorage.getItem('oauth_csrf_token');
    if (!stored) return null;
    
    const token: CSRFToken = JSON.parse(stored);
    
    // Check expiry
    if (Date.now() - token.timestamp > TOKEN_EXPIRY_MS) {
      clearCSRFToken();
      return null;
    }
    
    return token.token;
  } catch {
    return null;
  }
}

// Add CSRF token to URL as query parameter
export function addCSRFToUrl(url: string): string {
  const token = createCSRFToken();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}csrf_token=${token}`;
}

// Middleware to validate CSRF in API routes
export function validateCSRFMiddleware(req: Request): { valid: boolean; error?: string } {
  const url = new URL(req.url);
  const token = url.searchParams.get('csrf_token');
  
  if (!token) {
    return { valid: false, error: 'Missing CSRF token' };
  }
  
  if (!validateCSRFToken(token)) {
    return { valid: false, error: 'Invalid CSRF token' };
  }
  
  return { valid: true };
}
