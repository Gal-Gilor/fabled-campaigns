import { Pool } from '@neondatabase/serverless';
import { authSchema } from './schema/auth';
import { chatSessionsSchema } from './schema/chat_sessions';

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  try {
    await pool.query(authSchema);
    await pool.query(chatSessionsSchema);
    console.log('Migration complete');
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);
