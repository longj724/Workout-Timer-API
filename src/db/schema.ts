// External Dependencies
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const createUserSchema = createInsertSchema(users);
export const createSelectUserSchema = createSelectSchema(users);

export const timers = sqliteTable('timers', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  intervalId: text('interval_id')
    .notNull()
    .references(() => intervals.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  minutes: integer('minutes').notNull().default(0),
  seconds: integer('seconds').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const intervals = sqliteTable('intervals', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  repetitions: integer('repetitions').notNull().default(1),
  workoutId: text('workout_id')
    .notNull()
    .references(() => workouts.id),
  order: integer('order').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const workouts = sqliteTable('workouts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  userId: text('user_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const completedWorkouts = sqliteTable('completed_workouts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workoutId: text('workout_id').references(() => workouts.id),
  userId: text('user_id').notNull(),
  dateCompleted: integer('date_completed', { mode: 'timestamp' }).notNull(),
  duration_hours: integer('duration_hours').notNull().default(0),
  duration_minutes: integer('duration_minutes').notNull().default(0),
  duration_seconds: integer('duration_seconds').notNull().default(0),
});

// Define relationships
export const workoutsRelations = relations(workouts, ({ many }) => ({
  intervals: many(intervals),
  completedWorkouts: many(completedWorkouts),
}));

export const completedWorkoutsRelations = relations(
  completedWorkouts,
  ({ one }) => ({
    workout: one(workouts, {
      fields: [completedWorkouts.workoutId],
      references: [workouts.id],
    }),
  })
);

export const intervalsRelations = relations(intervals, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [intervals.workoutId],
    references: [workouts.id],
  }),
  timers: many(timers),
}));

export const timersRelations = relations(timers, ({ one }) => ({
  interval: one(intervals, {
    fields: [timers.intervalId],
    references: [intervals.id],
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

export const patchWorkoutWithRelationsSchema = patchWorkoutsSchema.extend({
  interval: insertIntervalsSchema
    .extend({
      id: z.string().optional(),
      timers: z.array(
        insertTimersSchema
          .extend({
            id: z.string().optional(),
            order: z.number().min(0),
          })
          .omit({
            intervalId: true,
          })
      ),
    })
    .omit({
      workoutId: true,
    })
    .optional(),
});

export const createWorkoutSchema = insertWorkoutsSchema.extend({
  intervals: z.array(
    insertIntervalsSchema
      .extend({
        timers: z.array(
          insertTimersSchema
            .extend({
              order: z.number().min(0),
            })
            .omit({
              intervalId: true,
            })
        ),
      })
      .omit({
        workoutId: true,
      })
  ),
});

export const getCompletedWorkoutsSchema = createSelectSchema(completedWorkouts);

export const insertCompletedWorkoutsSchema = createInsertSchema(
  completedWorkouts
).omit({
  id: true,
});
