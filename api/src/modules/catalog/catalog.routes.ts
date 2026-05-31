import type { FastifyInstance } from 'fastify';

import { success } from '../../shared/http/response.js';
import { listCourses } from './catalog.repository.js';

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/courses', async () => {
    const courses = await listCourses();

    return success(courses);
  });
}
