# Authentication & User Management

## UofT Email Restriction

Registration is restricted to University of Toronto email domains:
- `@mail.utoronto.ca`
- `@utoronto.ca`

Validation is enforced on both client (Zod) and server (`POST /api/auth/register`). Any other email domain returns HTTP 400 with message: `"Registration is restricted to UofT email addresses (@utoronto.ca or @mail.utoronto.ca)."`

## Registration Fields

| Field | Type | Validation |
|-------|------|-----------|
| `name` | text | Required, min 2 chars |
| `email` | text | Required, UofT domain, unique |
| `password` | text | Required, min 8 chars |
| `committee` | text | Required (e.g. "ECE Club", "Hi-Skule") |
| `role` | enum | `applicant` \| `officer`; default `applicant` |

Password is hashed with **bcryptjs** (salt rounds: 12) before storage. Plain-text password is never persisted.

## NextAuth.js Configuration

Provider: **Credentials** (email + password).

```ts
// src/lib/auth.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { pool } from './db';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { rows } = await pool.query(
          'SELECT * FROM users WHERE email = $1', [credentials.email]
        );
        const user = rows[0];
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email,
                 role: user.role, committee: user.committee };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.committee = user.committee;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.committee = token.committee;
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
};
```

## Role-Based Route Protection (middleware.ts)

```ts
// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Officer-only routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/review')) {
      if (token?.role !== 'officer') {
        return NextResponse.redirect(new URL('/apply', req.url));
      }
    }

    // Applicant-only routes
    if (pathname.startsWith('/apply')) {
      if (token?.role !== 'applicant') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: ['/apply/:path*', '/dashboard/:path*', '/review/:path*'],
};
```

## Login Page Design

- **Header**: `#1B2A4A` navy background, white "EngSoc Cheque Requisition" title, UofT crest SVG logo left of title
- **Card**: centered white card, max-width 400px
- **Fields**: Email, Password (with show/hide toggle)
- **Primary button**: "Sign In" — navy `#1B2A4A` fill, white text, full width
- **Footer link**: "Don't have an account? Create Account" → `/register`
- Error state: red border + error message below field

## Profile Pre-Fill Behaviour

On pages 2 and 3 of the applicant wizard, the following fields are auto-populated from the authenticated user's JWT session data and are **read-only**:

| Form Field | Source |
|-----------|--------|
| Payable To | `session.user.name` |
| Email | `session.user.email` |
| Committee/Club | `session.user.committee` |
| Requested By | `session.user.name` |

This eliminates manual entry for the applicant's personal information on every submission and is one of the two primary mechanisms driving the time-reduction objective.
