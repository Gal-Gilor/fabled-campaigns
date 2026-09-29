// Pure helpers for fixed-window rate limits. The counter itself is
// incrementRateLimit in db/index.ts; this module stays DB-free so it can be tested.

export function rateLimitWindowStart(nowMs: number, windowMs: number): number {
  return nowMs - (nowMs % windowMs);
}

export function transcribeRateLimitKey(userId: string | null, ip: string): string {
  return userId ? `transcribe:user:${userId}` : `transcribe:ip:${ip}`;
}

// On Vercel the platform sets x-forwarded-for, and its first entry is the client
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip')?.trim() || 'unknown';
}
