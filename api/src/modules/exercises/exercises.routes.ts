import type { FastifyInstance } from 'fastify';

import { getAuthUser } from '../../shared/http/auth.js';
import { success } from '../../shared/http/response.js';
import { getExercisesByLesson } from './exercises.repository.js';

export async function exercisesRoutes(app: FastifyInstance) {
  app.get<{ Params: { lessonId: string } }>(
    '/lesson/:lessonId',
    async (request) => {
      await getAuthUser(request);
      const { lessonId } = request.params;
      const exercises = await getExercisesByLesson(lessonId);

      return success(exercises);
    },
  );
}
