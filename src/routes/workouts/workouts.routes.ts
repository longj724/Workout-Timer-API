// External Dependencies
import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

// Internal Dependencies
import {
  createWorkoutSchema,
  getCompletedWorkoutsSchema,
  patchWorkoutWithRelationsSchema,
  selectWorkoutsSchema,
} from '@/db/schema';
import { notFoundSchema } from '@/lib/constants';

const tags = ['Workouts'];

export const list = createRoute({
  path: '/workouts',
  method: 'get',
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectWorkoutsSchema),
      'The list of workouts'
    ),
  },
});

export const create = createRoute({
  path: '/workouts',
  method: 'post',
  request: {
    body: jsonContentRequired(
      createWorkoutSchema,
      'The workout to create with intervals and timers'
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectWorkoutsSchema,
      'The created workout'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(createWorkoutSchema),
      'The validation error(s)'
    ),
  },
});

// export const getOne = createRoute({
//   path: '/workouts/{id}',
//   method: 'get',
//   request: {
//     params: z.object({
//       id: z.string(),
//     }),
//   },
//   tags,
//   responses: {
//     [HttpStatusCodes.OK]: jsonContent(
//       selectWorkoutsSchema,
//       'The requested workout'
//     ),
//     [HttpStatusCodes.NOT_FOUND]: jsonContent(
//       notFoundSchema,
//       'Workout not found'
//     ),
//     [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
//       createErrorSchema(
//         z.object({
//           id: z.string(),
//         })
//       ),
//       'Invalid id error'
//     ),
//   },
// });

export const patch = createRoute({
  path: '/workouts/{id}',
  method: 'patch',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      patchWorkoutWithRelationsSchema,
      'The workout updates with optional intervals and timers'
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectWorkoutsSchema,
      'The updated workout'
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Workout not found'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchWorkoutWithRelationsSchema).or(
        createErrorSchema(
          z.object({
            id: z.string(),
          })
        )
      ),
      'The validation error(s)'
    ),
  },
});

export const remove = createRoute({
  path: '/workouts/{id}',
  method: 'delete',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  tags,
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: 'Workout deleted',
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Workout not found'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(
        z.object({
          id: z.string(),
        })
      ),
      'Invalid id error'
    ),
  },
});

export const complete = createRoute({
  path: '/workouts/complete',
  method: 'post',
  request: {
    body: jsonContentRequired(
      z.object({
        workoutId: z.string().optional(),
        userId: z.string(),
        dateCompleted: z.string(),
        duration_hours: z.number(),
        duration_minutes: z.number(),
        duration_seconds: z.number(),
      }),
      'The completed workout'
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      getCompletedWorkoutsSchema,
      'The completed workout'
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(
        z.object({
          workoutId: z.string().optional(),
          userId: z.string(),
          dateCompleted: z.string(),
          duration_hours: z.number(),
          duration_minutes: z.number(),
          duration_seconds: z.number(),
        })
      ),
      'The validation error(s)'
    ),
  },
});

export const listCompleted = createRoute({
  path: '/workouts/completed',
  method: 'get',
  request: {
    query: z.object({
      startDate: z.string().refine(
        (value) => {
          const date = new Date(value);
          return date.toLocaleDateString() === value;
        },
        {
          message: 'Invalid date format, expected locale date string',
        }
      ),
      endDate: z.string().refine(
        (value) => {
          const date = new Date(value);
          return date.toLocaleDateString() === value;
        },
        {
          message: 'Invalid date format, expected locale date string',
        }
      ),
    }),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(getCompletedWorkoutsSchema),
      'List of completed workouts within the date range'
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
// export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type ListCompletedRoute = typeof listCompleted;
export type CompleteRoute = typeof complete;
