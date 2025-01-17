// External Dependencies
import { serve } from '@hono/node-server';

// Internal Dependencies
import app from './app';
import env from './env';

const port = env.PORT;
// eslint-disable-next-line no-console
console.log(`Server is running on port http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
