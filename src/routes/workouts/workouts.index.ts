import { createRouter } from '@/lib/create-app';
import {
  complete,
  create,
  list,
  listCompleted,
  patch,
  remove,
} from './workouts.routes';
import {
  completedHandler,
  createHandler,
  listCompletedHandler,
  listHandler,
  patchHandler,
  removeHandler,
} from './workouts.handlers';

const workouts = createRouter()
  .openapi(list, listHandler)
  .openapi(create, createHandler)
  .openapi(patch, patchHandler)
  .openapi(remove, removeHandler)
  .openapi(listCompleted, listCompletedHandler)
  .openapi(complete, completedHandler);

export default workouts;
