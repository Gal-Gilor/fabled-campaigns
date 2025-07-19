/**
 * Tests for rate limiting middleware
 */

const { rateLimit, clearRateLimit, getRateLimitStatus } = require('../../lib/middleware/rateLimiter');

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearRateLimit();
  });

  test('should allow requests within limit', () => {
    const ip = '192.168.1.1';
    
    expect(rateLimit(ip, 60000, 5)).toBe(true);
    expect(rateLimit(ip, 60000, 5)).toBe(true);
    expect(rateLimit(ip, 60000, 5)).toBe(true);
  });

  test('should block requests over limit', () => {
    const ip = '192.168.1.1';
    
    // Make 5 requests (limit)
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(ip, 60000, 5)).toBe(true);
    }
    
    // 6th request should be blocked
    expect(rateLimit(ip, 60000, 5)).toBe(false);
  });

  test('should handle different IPs separately', () => {
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';
    
    // Fill up limit for ip1
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(ip1, 60000, 5)).toBe(true);
    }
    
    // ip1 should be blocked
    expect(rateLimit(ip1, 60000, 5)).toBe(false);
    
    // ip2 should still work
    expect(rateLimit(ip2, 60000, 5)).toBe(true);
  });

  test('should reset after time window', () => {
    const ip = '192.168.1.1';
    const shortWindow = 100; // 100ms window
    
    // Fill up the limit
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(ip, shortWindow, 3)).toBe(true);
    }
    
    // Should be blocked
    expect(rateLimit(ip, shortWindow, 3)).toBe(false);
    
    // Wait for window to reset
    return new Promise(resolve => {
      setTimeout(() => {
        // Should work again
        expect(rateLimit(ip, shortWindow, 3)).toBe(true);
        resolve();
      }, 150);
    });
  });

  test('should return rate limit status', () => {
    const ip = '192.168.1.1';
    
    // Make some requests
    rateLimit(ip, 60000, 5);
    rateLimit(ip, 60000, 5);
    
    const status = getRateLimitStatus(ip, 60000);
    
    expect(status.current).toBe(2);
    expect(status.remaining).toBe(3);
    expect(status.resetTime).toBeDefined();
  });

  test('should clear rate limit cache', () => {
    const ip = '192.168.1.1';
    
    // Fill up limit
    for (let i = 0; i < 5; i++) {
      rateLimit(ip, 60000, 5);
    }
    
    // Should be blocked
    expect(rateLimit(ip, 60000, 5)).toBe(false);
    
    // Clear cache
    clearRateLimit();
    
    // Should work again
    expect(rateLimit(ip, 60000, 5)).toBe(true);
  });
});