import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

export const timers = pgTable('timers', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  minutes: integer('minutes').notNull().default(0),
  seconds: integer('seconds').notNull().default(0),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const intervals = pgTable('intervals', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  repetitions: integer('repetitions').notNull().default(1),
  workoutId: integer('workout_id')
    .notNull()
    .references(() => workouts.id),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const intervalTimers = pgTable('interval_timers', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  intervalId: integer('interval_id')
    .notNull()
    .references(() => intervals.id),
  timerId: text('timer_id')
    .notNull()
    .references(() => timers.id),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const workouts = pgTable('workouts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at')
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at')
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

// Define relationships
export const workoutsRelations = relations(workouts, ({ many }) => ({
  intervals: many(intervals),
}));

export const intervalsRelations = relations(intervals, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [intervals.workoutId],
    references: [workouts.id],
  }),
  intervalTimers: many(intervalTimers),
}));

export const timersRelations = relations(timers, ({ many }) => ({
  intervalTimers: many(intervalTimers),
}));

export const intervalTimersRelations = relations(intervalTimers, ({ one }) => ({
  interval: one(intervals, {
    fields: [intervalTimers.intervalId],
    references: [intervals.id],
  }),
  timer: one(timers, {
    fields: [intervalTimers.timerId],
    references: [timers.id],
  }),
}));

// Create Zod schemas
export const selectTimersSchema = createSelectSchema(timers);
export const insertTimersSchema = createInsertSchema(timers, {
  minutes: z.number().min(0).max(59),
  seconds: z.number().min(0).max(59),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectIntervalsSchema = createSelectSchema(intervals);
export const insertIntervalsSchema = createInsertSchema(intervals, {
  repetitions: z.number().min(1),
  order: z.number().min(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectWorkoutsSchema = createSelectSchema(workouts);
export const insertWorkoutsSchema = createInsertSchema(workouts, {
  name: z.string().min(1).max(500),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchTimersSchema = insertTimersSchema.partial();
export const patchIntervalsSchema = insertIntervalsSchema.partial();
export const patchWorkoutsSchema = insertWorkoutsSchema.partial();

export const selectIntervalTimersSchema = createSelectSchema(intervalTimers);
export const insertIntervalTimersSchema = createInsertSchema(intervalTimers, {
  order: z.number().min(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createWorkoutSchema = insertWorkoutsSchema.extend({
  intervals: z.array(
    insertIntervalsSchema
      .extend({
        timers: z.array(
          insertTimersSchema.extend({
            order: z.number().min(0),
          })
        ),
      })
      .omit({
        workoutId: true,
      })
  ),
});
