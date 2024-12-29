import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import env from '@/env';

import * as schema from './schema';

const isProduction = process.env.NODE_ENV === 'production';

config({ path: '.env' });
const client = postgres(
  isProduction
    ? process.env.PRODUCTION_DATABASE_URL!
    : process.env.LOCAL_DATABASE_URL!
);

const db = drizzle(client, {
  schema,
});

export default db;
