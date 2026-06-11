import { Pool } from '@neondatabase/serverless';
import { authSchema } from './schema/auth';
import { chatSessionsSchema } from './schema/chat_sessions';
import { collectionsSchema } from './schema/collections';
import { campaignsSchema } from './schema/campaigns';

async function dropCollectionTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  try {
    await pool.query('DROP TABLE IF EXISTS artifacts CASCADE');
    await pool.query('DROP TABLE IF EXISTS locations CASCADE');
    await pool.query('DROP TABLE IF EXISTS collection_sessions CASCADE');
    await pool.query('DROP TABLE IF EXISTS collections CASCADE');
  } finally {
    await pool.end();
  }
}

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  try {
    if (process.argv.includes('--reset')) {
      console.log('Resetting collection tables...');
      await dropCollectionTables();
    }
    await pool.query(authSchema);
    await pool.query(chatSessionsSchema);
    // Campaigns must run after chat_sessions: it ALTERs that table with a campaign_id FK
    await pool.query(campaignsSchema);
    await pool.query(collectionsSchema);
    console.log('Migration complete');
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);
