import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import PostgresAdapter from '@auth/pg-adapter';
import { Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error('DATABASE_URL_UNPOOLED is not set');
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED })),
  providers: [Google],
  pages: { signIn: '/auth/sign-in' },
  callbacks: {
    authorized({ auth }) {
      return true;
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
