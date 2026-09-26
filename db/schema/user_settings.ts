export const userSettingsSchema = `
CREATE TABLE IF NOT EXISTS user_settings (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  image_size TEXT NOT NULL DEFAULT '1K' CHECK (image_size IN ('1K','2K','4K')),
  updated_at BIGINT NOT NULL
);
`;
