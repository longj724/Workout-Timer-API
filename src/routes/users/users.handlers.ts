// External Dependencies
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { Webhook } from 'svix';

// Internal Dependencies
import db from '@/db';
import { users } from '@/db/schema';
import type { AppRouteHandler } from '@/lib/types';
import type { CreateRoute } from './users.routes';

export const createHandler: AppRouteHandler<CreateRoute> = async (c) => {
  const SIGNING_SECRET = process.env.SIGNING_SECRET as string;

  const wh = new Webhook(SIGNING_SECRET);

  // Get headers
  const headers = c.req.header();
  const payload = await c.req.json();
  const svix_id = headers['svix-id'];
  const svix_timestamp = headers['svix-timestamp'];
  const svix_signature = headers['svix-signature'];

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return c.json(
      {
        message: 'Error: Missing Svix headers',
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }

  let evt;

  // Attempt to verify the incoming webhook
  // If successful, the payload will be available from 'evt'
  // If verification fails, error out and return error code
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id as string,
      'svix-timestamp': svix_timestamp as string,
      'svix-signature': svix_signature as string,
    });
  } catch (err: any) {
    // console.log('Error: Could not verify webhook:', err.message)
    return c.json(
      {
        message: 'Error: Could not verify webhook',
      },
      HttpStatusCodes.BAD_REQUEST
    );
  }

  const [user] = await db
    .insert(users)
    .values({ id: (evt as any).data.id })
    .returning();

  return c.json(user, HttpStatusCodes.OK);
};
