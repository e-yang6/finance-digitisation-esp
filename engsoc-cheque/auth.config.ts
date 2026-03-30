/**
 * Edge-compatible auth config — no database imports.
 * Used by middleware.ts only.
 */
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: { signIn: '/login' },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.committee = (user as { committee?: string | null }).committee ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as 'applicant' | 'officer';
      session.user.committee = token.committee as string | null;
      return session;
    },
  },
  session: { strategy: 'jwt' },
  providers: [], // credentials added in src/lib/auth.ts only
};
