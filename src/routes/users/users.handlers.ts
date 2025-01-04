// External Dependencies
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { getAuth } from '@hono/clerk-auth';

// Internal Dependencies
import db from '@/db';
import { users } from '@/db/schema';
import type { AppRouteHandler } from '@/lib/types';
import type { CreateRoute } from './users.routes';

export const createHandler: AppRouteHandler<CreateRoute> = async (c) => {
  const { id, ...userData } = await c.req.json();

  const [user] = await db.insert(users).values(userData).returning();

  return c.json(user, HttpStatusCodes.OK);
};
