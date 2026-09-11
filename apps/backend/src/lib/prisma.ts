import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function resolveRdsCa(): string | undefined {
  const candidates = [
    process.env.RDS_CA_BUNDLE_PATH,
    path.resolve(moduleDir, '../../certs/rds-global-bundle.pem'),
    path.resolve(process.cwd(), 'certs/rds-global-bundle.pem'),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, 'utf8');
    }
  }
  return undefined;
}

function createPool(): Pool {
  const url = new URL(env.DATABASE_URL);
  url.searchParams.delete('schema');

  const sslMode = url.searchParams.get('sslmode');
  url.searchParams.delete('sslmode');

  const useSsl =
    sslMode === 'require' ||
    sslMode === 'verify-full' ||
    sslMode === 'verify-ca';

  const config: PoolConfig = {
    connectionString: url.toString(),
  };

  if (useSsl) {
    const ca = resolveRdsCa();
    if (!ca) {
      throw new Error(
        'SSL required for database connection but RDS CA bundle was not found. Set RDS_CA_BUNDLE_PATH or add certs/rds-global-bundle.pem.',
      );
    }
    config.ssl = {
      rejectUnauthorized: true,
      ca,
    };
  }

  return new Pool(config);
}

const adapter = new PrismaPg(createPool());

export const prisma = new PrismaClient({ adapter });
