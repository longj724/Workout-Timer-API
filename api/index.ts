import { handle } from 'hono/vercel';

// @ts-ignore
import app from '../dist/src/app.js';

export const runtime = 'edge';

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
