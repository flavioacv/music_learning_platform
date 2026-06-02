import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { getAuthUser } from '../../shared/http/auth.js';
import { notFound } from '../../shared/http/errors.js';
import { success } from '../../shared/http/response.js';
import { completeLesson, getUserProgress } from './progress.repository.js';

const paramsSchema = z.object({
  lessonId: z.string().uuid(),
});

export async function progressRoutes(app: FastifyInstance) {
  app.get('/me', async (request) => {
    const authUser = await getAuthUser(request);
    const progress = await getUserProgress(authUser.sub);

    return success(progress);
  });

  app.post('/lessons/:lessonId/complete', async (request, reply) => {
    const authUser = await getAuthUser(request);
    const params = paramsSchema.parse(request.params);
    const result = await completeLesson(authUser.sub, params.lessonId);

    if (!result) {
      throw notFound('Lesson not found', 'lesson_not_found');
    }

    return reply.code(result.alreadyCompleted ? 200 : 201).send(success(result));
  });
}
