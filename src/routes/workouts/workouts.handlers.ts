// External Dependencies
import db from '@/db';
import { intervals, timers, workouts, completedWorkouts } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { getAuth } from '@hono/clerk-auth';

// Internal Dependencies
import type { AppRouteHandler } from '@/lib/types';
import type {
  ListRoute,
  CreateRoute,
  PatchRoute,
  RemoveRoute,
  ListCompletedRoute,
  CompleteRoute,
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

export const patchHandler: AppRouteHandler<PatchRoute> = async (c) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized',
    });
  }

  const { timers: newTimers, ...intervalUpdates } = await c.req.json();

  return db.transaction(async (tx) => {
    const [updatedInterval] = await tx
      .update(intervals)
      .set({ ...intervalUpdates, updatedAt: new Date() })
      .where(eq(intervals.id, intervalUpdates.id))
      .returning();

    if (!updatedInterval) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to update interval',
      });
    }

    // Delete existing timers
    await tx.delete(timers).where(eq(timers.intervalId, intervalUpdates.id));

    // Create new timers
    for (const timer of newTimers) {
      await tx.insert(timers).values({
        ...timer,
        intervalId: updatedInterval.id,
      });
    }

    // Fetch the updated workout
    const updatedWorkout = await tx.query.workouts.findFirst({
      where: eq(workouts.id, updatedInterval.workoutId),
      with: {
        intervals: {
          with: {
            timers: true,
          },
          orderBy: (intervals, { asc }) => [asc(intervals.order)],
        },
      },
    });

    if (!updatedWorkout) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to update workout',
      });
    }

    return c.json(updatedWorkout, HttpStatusCodes.OK);
  });
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

export const completedHandler: AppRouteHandler<CompleteRoute> = async (c) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized',
    });
  }

  const data = await c.req.json();

  // Not sure why this is needed but it's not inserting without it
  data.dateCompleted = new Date(data.dateCompleted);

  const [completedWorkout] = await db
    .insert(completedWorkouts)
    .values({ ...data, userId: auth.userId })
    .returning();

  return c.json(completedWorkout, HttpStatusCodes.OK);
};

export const listCompletedHandler: AppRouteHandler<ListCompletedRoute> = async (
  c
) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Unauthorized',
    });
  }

  const { startDate, endDate } = c.req.query();

  const workoutsWithinDateRange = await db.query.completedWorkouts.findMany({
    where: and(
      eq(completedWorkouts.userId, auth.userId),
      gte(completedWorkouts.dateCompleted, new Date(startDate)),
      lte(completedWorkouts.dateCompleted, new Date(endDate))
    ),
  });

  return c.json(workoutsWithinDateRange, HttpStatusCodes.OK);
};
