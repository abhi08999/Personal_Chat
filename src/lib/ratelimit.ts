import { RateLimiterMemory } from 'rate-limiter-flexible';

export const loginLimiter = new RateLimiterMemory({
  points: 5,        // 5 attempts
  duration: 60 * 5, // per 5 min
  blockDuration: 60 * 15, // block 15 min
});

export const uploadLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60,
});

export function clientIp(req: Request) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
