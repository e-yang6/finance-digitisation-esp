import { Pool } from 'pg';

declare global {
  // Allow global `var` declarations in dev
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool() {
  const databaseUrl = process.env.DATABASE_URL;
  const normalizedConnectionString = databaseUrl
    ? (() => {
        const url = new URL(databaseUrl);
        url.searchParams.delete('sslmode');
        return url.toString();
      })()
    : undefined;

  return new Pool({
    connectionString: normalizedConnectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

// In development, reuse pool across hot reloads
export const pool =
  process.env.NODE_ENV === 'development'
    ? (global._pgPool ??= createPool())
    : createPool();

if (process.env.NODE_ENV === 'development') {
  global._pgPool = pool;
}
