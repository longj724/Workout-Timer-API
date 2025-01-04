// External Dependencies
import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

// Internal Dependencies
import { createUserSchema, createSelectUserSchema } from '@/db/schema';

const tags = ['Users'];

export const create = createRoute({
  path: '/user',
  method: 'post',
  request: {
    body: jsonContentRequired(createUserSchema, 'Create a user'),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createSelectUserSchema,
      'The created user'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(createUserSchema),
      'The validation error(s)'
    ),
  },
});

export type CreateRoute = typeof create;
