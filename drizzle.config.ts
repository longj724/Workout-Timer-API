import { defineConfig } from 'drizzle-kit';

import env from '@/env';

const dbUrl =
  env.NODE_ENV === 'production'
    ? env.PRODUCTION_DATABASE_URL
    : env.LOCAL_DATABASE_URL;

// export default defineConfig({
//   schema: './src/db/schema.ts',
//   out: './src/db/migrations',
//   dialect: 'postgresql',
//   dbCredentials: {
//     url: dbUrl,
//   },
// });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: dbUrl,
    authToken: env.DATABASE_AUTH_TOKEN,
  },
});
