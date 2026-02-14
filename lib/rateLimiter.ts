// Rate limiting and submission tracking

interface SubmissionRecord {
  timestamp: number;
  email?: string;
  ip?: string;
}

const SUBMISSION_COOLDOWN = 5 * 60 * 1000; // 5 minutes
const MAX_SUBMISSIONS_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

// Memory store for rate limiting (in production, use Redis or similar)
const submissionStore = new Map<string, SubmissionRecord[]>();

// Get client identifier (email for logged-in users, IP for logged-out)
function getClientIdentifier(req: Request): string {
  // Try to get email from auth headers (for logged-in users)
  const email = req.headers.get('x-user-email');
  if (email) {
    return `email:${email}`;
  }
  
  // Fall back to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

// Check if client is rate limited
export function checkRateLimit(req: Request): { allowed: boolean; reason?: string; retryAfter?: number } {
  const clientId = getClientIdentifier(req);
  const now = Date.now();
  
  // Get existing submissions for this client
  const submissions = submissionStore.get(clientId) || [];
  
  // Clean old submissions (older than 1 hour)
  const recentSubmissions = submissions.filter(sub => now - sub.timestamp < HOUR_MS);
  
  // Check hourly limit
  if (recentSubmissions.length >= MAX_SUBMISSIONS_PER_HOUR) {
    const oldestSubmission = Math.min(...recentSubmissions.map(sub => sub.timestamp));
    const retryAfter = Math.ceil((oldestSubmission + HOUR_MS - now) / 1000);
    
    return {
      allowed: false,
      reason: "Too many submissions. Please try again later.",
      retryAfter
    };
  }
  
  // Check cooldown between submissions
  const lastSubmission = submissions[0]; // Most recent
  if (lastSubmission && now - lastSubmission.timestamp < SUBMISSION_COOLDOWN) {
    const retryAfter = Math.ceil((lastSubmission.timestamp + SUBMISSION_COOLDOWN - now) / 1000);
    
    return {
      allowed: false,
      reason: "Please wait before submitting again.",
      retryAfter
    };
  }
  
  return { allowed: true };
}

// Record a submission
export function recordSubmission(req: Request, email?: string): void {
  const clientId = getClientIdentifier(req);
  const now = Date.now();
  
  const submissions = submissionStore.get(clientId) || [];
  submissions.unshift({ timestamp: now, email });
  
  // Keep only last hour of submissions
  const filteredSubmissions = submissions.filter(sub => now - sub.timestamp < HOUR_MS);
  submissionStore.set(clientId, filteredSubmissions);
  
  // Clean up old entries periodically
  if (Math.random() < 0.1) { // 10% chance
    cleanupOldEntries();
  }
}

// Clean up old entries
function cleanupOldEntries(): void {
  const now = Date.now();
  const cutoff = now - HOUR_MS;
  
  for (const [clientId, submissions] of submissionStore.entries()) {
    const filtered = submissions.filter(sub => sub.timestamp > cutoff);
    if (filtered.length === 0) {
      submissionStore.delete(clientId);
    } else {
      submissionStore.set(clientId, filtered);
    }
  }
}

// Express middleware for rate limiting
export function rateLimitMiddleware(req: Request) {
  const rateCheck = checkRateLimit(req);
  
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.reason,
      code: "RATE_LIMITED",
      retryAfter: rateCheck.retryAfter
    };
  }
  
  return { success: true };
}
