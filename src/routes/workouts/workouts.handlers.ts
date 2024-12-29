import db from '@/db';
import { intervals, timers, workouts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';

import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { AppRouteHandler } from '@/lib/types';
import type {
  ListRoute,
  CreateRoute,
  GetOneRoute,
  PatchRoute,
  RemoveRoute,
} from './workouts.routes';

export const listHandler: AppRouteHandler<ListRoute> = async (c) => {
  const workoutsList = await db.query.workouts.findMany({
    with: {
      intervals: {
        with: {
          intervalTimers: {
            with: {
              timer: true,
            },
          },
        },
        orderBy: (intervals, { asc }) => [asc(intervals.order)],
      },
    },
  });

  return c.json(workoutsList, HttpStatusCodes.OK);
};

export const createHandler: AppRouteHandler<CreateRoute> = async (c) => {
  const { intervals: intervalsData, ...workoutData } = await c.req.json();

  // Start a transaction since we're inserting multiple related records
  return await db.transaction(async (tx) => {
    // Create the workout first
    const [workout] = await tx.insert(workouts).values(workoutData).returning();

    // Create timers and intervals
    for (const [index, interval] of intervalsData.entries()) {
      const { timer: timerData, ...intervalData } = interval;

      // Create timer
      const [timer] = await tx.insert(timers).values(timerData).returning();

      // Create interval with the timer ID and workout ID
      await tx.insert(intervals).values({
        ...intervalData,
        timerId: timer.id,
        workoutId: workout.id,
        order: index,
      });
    }

    // Fetch the complete workout with its relations
    const completeWorkout = await tx.query.workouts.findFirst({
      where: eq(workouts.id, workout.id),
      with: {
        intervals: {
          with: {
            intervalTimers: {
              with: {
                timer: true,
              },
            },
          },
          orderBy: (intervals, { asc }) => [asc(intervals.order)],
        },
      },
    });

    if (!completeWorkout) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to create workout',
      });
    }

    return c.json(completeWorkout, HttpStatusCodes.OK);
  });
};

export const getOneHandler: AppRouteHandler<GetOneRoute> = async (c) => {
  const id = c.req.param('id');

  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, id),
    with: {
      intervals: {
        with: {
          intervalTimers: {
            with: {
              timer: true,
            },
          },
        },
        orderBy: (intervals, { asc }) => [asc(intervals.order)],
      },
    },
  });

  if (!workout) {
    throw new HTTPException(404, { message: 'Workout not found' });
  }

  return c.json(workout, HttpStatusCodes.OK);
};

export const patchHandler: AppRouteHandler<PatchRoute> = async (c) => {
  const id = c.req.param('id');
  const updates = await c.req.json();

  // Check if workout exists
  const existingWorkout = await db.query.workouts.findFirst({
    where: eq(workouts.id, id),
  });

  if (!existingWorkout) {
    throw new HTTPException(404, { message: 'Workout not found' });
  }

  // Update the workout
  const [updatedWorkout] = await db
    .update(workouts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(workouts.id, id))
    .returning();

  // Fetch the complete updated workout with its relations
  const completeWorkout = await db.query.workouts.findFirst({
    where: eq(workouts.id, updatedWorkout.id),
    with: {
      intervals: {
        with: {
          intervalTimers: {
            with: {
              timer: true,
            },
          },
        },
        orderBy: (intervals, { asc }) => [asc(intervals.order)],
      },
    },
  });

  return c.json(completeWorkout, HttpStatusCodes.OK);
};

export const removeHandler: AppRouteHandler<RemoveRoute> = async (c) => {
  const id = c.req.param('id');

  // Check if workout exists
  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, id),
    with: {
      intervals: {
        with: {
          intervalTimers: {
            with: {
              timer: true,
            },
          },
        },
      },
    },
  });

  if (!workout) {
    throw new HTTPException(404, { message: 'Workout not found' });
  }

  // Start a transaction to delete related records
  await db.transaction(async (tx) => {
    // Delete intervals and their associated timers
    for (const interval of workout.intervals) {
      await tx
        .delete(timers)
        .where(eq(timers.id, interval.intervalTimers[0].timerId));
      await tx.delete(intervals).where(eq(intervals.id, interval.id));
    }

    // Delete the workout
    await tx.delete(workouts).where(eq(workouts.id, id));
  });

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
