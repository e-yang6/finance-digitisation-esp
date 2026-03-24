import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { registerSchema } from '@/lib/validations';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    // Check if email already exists
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [data.email]
    );

    if (existing.length > 0) {
      return Response.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await pool.query(
      'INSERT INTO users (name, email, password_hash, committee, role) VALUES ($1, $2, $3, $4, $5)',
      [data.name, data.email, passwordHash, data.committee, data.role]
    );

    return Response.json({ message: 'Account created successfully.' }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Registration error:', error);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
