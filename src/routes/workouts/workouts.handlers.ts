// External Dependencies
import db from '@/db';
import { intervals, timers, workouts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { getAuth } from '@hono/clerk-auth';

// Internal Dependencies
import type { AppRouteHandler } from '@/lib/types';
import type {
  ListRoute,
  CreateRoute,
  GetOneRoute,
  PatchRoute,
  RemoveRoute,
} from './workouts.routes';

export const listHandler: AppRouteHandler<ListRoute> = async (c) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized',
    });
  }

  const workoutsList = await db.query.workouts.findMany({
    where: eq(workouts.userId, auth.userId),
    with: {
      intervals: {
        with: {
          timers: true,
        },
        orderBy: (intervals, { asc }) => [asc(intervals.order)],
      },
    },
  });

  return c.json(workoutsList, HttpStatusCodes.OK);
};

export const createHandler: AppRouteHandler<CreateRoute> = async (c) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized',
    });
  }

  const { intervals: intervalsData, ...workoutData } = await c.req.json();

  return db.transaction(async (tx) => {
    const [workout] = await tx
      .insert(workouts)
      .values({ ...workoutData, userId: auth.userId })
      .returning();

    for (const [_, interval] of intervalsData.entries()) {
      const { timers: timersData, ...intervalData } = interval;

      const [createdInterval] = await tx
        .insert(intervals)
        .values({
          ...intervalData,
          workoutId: workout.id,
        })
        .returning();

      for (const timerData of timersData) {
        const [createdTimer] = await tx
          .insert(timers)
          .values({ ...timerData, intervalId: createdInterval.id })
          .returning();
      }
    }

    // Fetch the complete workout with its relations
    const completeWorkout = await tx.query.workouts.findFirst({
      where: eq(workouts.id, workout.id),
      with: {
        intervals: {
          with: {
            timers: true,
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
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized',
    });
  }

  const id = c.req.param('id');

  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, id),
    with: {
      intervals: {
        with: {
          timers: true,
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
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized',
    });
  }

  const id = c.req.param('id');
  const updates = await c.req.json();

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

  const completeWorkout = await db.query.workouts.findFirst({
    where: eq(workouts.id, updatedWorkout.id),
    with: {
      intervals: {
        with: {
          timers: true,
        },
        orderBy: (intervals, { asc }) => [asc(intervals.order)],
      },
    },
  });

  return c.json(completeWorkout, HttpStatusCodes.OK);
};

export const removeHandler: AppRouteHandler<RemoveRoute> = async (c) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized',
    });
  }

  const id = c.req.param('id');

  const workout = await db.query.workouts.findFirst({
    where: eq(workouts.id, id),
    with: {
      intervals: {
        with: {
          timers: true,
        },
      },
    },
  });

  if (!workout) {
    throw new HTTPException(404, { message: 'Workout not found' });
  }

  await db.transaction(async (tx) => {
    for (const interval of workout.intervals) {
      await tx.delete(timers).where(eq(timers.intervalId, interval.id));
      await tx.delete(intervals).where(eq(intervals.id, interval.id));
    }

    await tx.delete(workouts).where(eq(workouts.id, id));
  });

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
