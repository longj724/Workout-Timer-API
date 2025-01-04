import { createRouter } from '@/lib/create-app';
import { create } from './users.routes';
import { createHandler } from './users.handlers';

const users = createRouter().openapi(create, createHandler);

export default users;
