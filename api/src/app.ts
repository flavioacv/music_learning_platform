import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import { ZodError } from 'zod';

import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { exercisesRoutes } from './modules/exercises/exercises.routes.js';
import { progressRoutes } from './modules/progress/progress.routes.js';
import { AppError } from './shared/http/errors.js';
import { failure, success } from './shared/http/response.js';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(cors, {
    origin: true,
  });
  app.register(helmet);

  app.get('/health', async () => success({ status: 'ok' }));

  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(catalogRoutes, { prefix: '/api/v1/catalog' });
  app.register(exercisesRoutes, { prefix: '/api/v1/exercises' });
  app.register(progressRoutes, { prefix: '/api/v1/progress' });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof ZodError) {
      return reply
        .code(400)
        .send(failure('validation_error', 'Invalid request payload'));
    }

    if (error instanceof AppError) {
      return reply
        .code(error.statusCode)
        .send(failure(error.code, error.message));
    }

    return reply
      .code(500)
      .send(failure('internal_error', 'Unexpected server error'));
  });

  return app;
}
