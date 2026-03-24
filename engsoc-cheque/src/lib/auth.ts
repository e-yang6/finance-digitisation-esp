import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { pool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { authConfig } from '../../auth.config';
import type { UserRole } from '@/types';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { rows } = await pool.query(
          'SELECT id, name, email, password_hash, role, committee FROM users WHERE email = $1',
          [credentials.email]
        );

        const user = rows[0];
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          committee: user.committee,
        };
      },
    }),
  ],
});
