// Fixed-window request counters. One row per key per window; expired windows
// are deleted by incrementRateLimit as requests come in.
export const rateLimitsSchema = `
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT NOT NULL,
  window_start BIGINT NOT NULL,
  count        INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx ON rate_limits(window_start);
`;
