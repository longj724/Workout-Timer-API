import { createRouter } from '@/lib/create-app';
import { create, getOne, list, patch, remove } from './workouts.routes';
import {
  createHandler,
  getOneHandler,
  listHandler,
  patchHandler,
  removeHandler,
} from './workouts.handlers';

const workouts = createRouter()
  .openapi(list, listHandler)
  .openapi(create, createHandler)
  .openapi(getOne, getOneHandler)
  .openapi(patch, patchHandler)
  .openapi(remove, removeHandler);

export default workouts;
