import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

function createPool(): Pool {
  const url = new URL(env.DATABASE_URL);
  // Prisma-only query param; node-pg does not understand it.
  url.searchParams.delete('schema');

  const sslMode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');

  const useSsl =
    env.NODE_ENV === 'production' ||
    sslMode === 'require' ||
    sslMode === 'verify-full' ||
    sslMode === 'verify-ca';

  return new Pool({
    connectionString: url.toString(),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
}

const adapter = new PrismaPg(createPool());

export const prisma = new PrismaClient({ adapter });
