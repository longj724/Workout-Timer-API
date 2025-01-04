// External Dependencies

// Internal Dependencies
import configureOpenAPI from '@/lib/configure-open-api';
import createApp from '@/lib/create-app';
import index from '@/routes/index.route';
import workouts from '@/routes/workouts/workouts.index';
import users from '@/routes/users/users.index';

const app = createApp();

configureOpenAPI(app);

const routes = [index, workouts, users] as const;

routes.forEach((route) => {
  app.route('/', route);
});

export type AppType = (typeof routes)[number];

export default app;
