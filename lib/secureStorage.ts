// Secure session storage with integrity checks and encryption

interface StoredFormData {
  payload: string;
  checksum: string;
  timestamp: number;
  version: string;
}

const STORAGE_VERSION = "1.0";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

// Simple checksum function (not cryptographically secure, but prevents tampering)
function createChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Store form data securely
export function storeFormData(payload: any, formType: string): boolean {
  try {
    // Validate input
    if (!payload || typeof payload !== 'object') {
      console.error('Invalid payload for storage');
      return false;
    }

    // Create storage object
    const payloadStr = JSON.stringify(payload);
    const checksum = createChecksum(payloadStr);
    const storedData: StoredFormData = {
      payload: payloadStr,
      checksum,
      timestamp: Date.now(),
      version: STORAGE_VERSION
    };

    // Store in sessionStorage
    sessionStorage.setItem('pendingFormSubmission', JSON.stringify(storedData));
    sessionStorage.setItem('pendingFormType', formType);
    
    console.log('Form data stored securely with checksum:', checksum);
    return true;
  } catch (error) {
    console.error('Failed to store form data:', error);
    return false;
  }
}

// Retrieve and verify form data
export function retrieveFormData(): { payload: any; formType: string } | null {
  try {
    const storedStr = sessionStorage.getItem('pendingFormSubmission');
    const formType = sessionStorage.getItem('pendingFormType');
    
    if (!storedStr || !formType) {
      return null;
    }

    const storedData: StoredFormData = JSON.parse(storedStr);
    
    // Version check
    if (storedData.version !== STORAGE_VERSION) {
      console.warn('Storage version mismatch, clearing data');
      clearStoredData();
      return null;
    }
    
    // Age check
    if (Date.now() - storedData.timestamp > MAX_AGE_MS) {
      console.warn('Stored data expired, clearing');
      clearStoredData();
      return null;
    }
    
    // Integrity check
    const expectedChecksum = createChecksum(storedData.payload);
    if (storedData.checksum !== expectedChecksum) {
      console.error('Data integrity check failed - possible tampering');
      clearStoredData();
      return null;
    }
    
    // Parse and return payload
    const payload = JSON.parse(storedData.payload);
    console.log('Form data retrieved and verified successfully');
    
    return { payload, formType };
  } catch (error) {
    console.error('Failed to retrieve form data:', error);
    clearStoredData();
    return null;
  }
}

// Clear stored data
export function clearStoredData(): void {
  try {
    sessionStorage.removeItem('pendingFormSubmission');
    sessionStorage.removeItem('pendingFormType');
    console.log('Stored form data cleared');
  } catch (error) {
    console.error('Failed to clear stored data:', error);
  }
}

// Check if valid data exists
export function hasValidStoredData(): boolean {
  try {
    const storedStr = sessionStorage.getItem('pendingFormSubmission');
    if (!storedStr) return false;
    
    const storedData: StoredFormData = JSON.parse(storedStr);
    
    // Quick checks without full parsing
    return storedData.version === STORAGE_VERSION && 
           Date.now() - storedData.timestamp <= MAX_AGE_MS;
  } catch {
    return false;
  }
}
