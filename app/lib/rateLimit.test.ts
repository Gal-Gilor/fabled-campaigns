import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, rateLimitWindowStart, transcribeRateLimitKey } from './rateLimit';

const HOUR = 60 * 60 * 1000;

test('rateLimitWindowStart floors to the window', () => {
  assert.equal(rateLimitWindowStart(5 * HOUR + 1234, HOUR), 5 * HOUR);
  assert.equal(rateLimitWindowStart(5 * HOUR, HOUR), 5 * HOUR);
});

test('transcribeRateLimitKey keys users by id and guests by IP', () => {
  assert.equal(transcribeRateLimitKey('user-1', '203.0.113.7'), 'transcribe:user:user-1');
  assert.equal(transcribeRateLimitKey(null, '203.0.113.7'), 'transcribe:ip:203.0.113.7');
});

test('clientIp takes the first x-forwarded-for entry', () => {
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7');
});

test('clientIp falls back to x-real-ip, then unknown', () => {
  assert.equal(clientIp(new Headers({ 'x-real-ip': '198.51.100.2' })), '198.51.100.2');
  assert.equal(clientIp(new Headers()), 'unknown');
});
