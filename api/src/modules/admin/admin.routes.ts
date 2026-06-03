import type { FastifyInstance } from 'fastify';

import { getAuthUser } from '../../shared/http/auth.js';
import { success } from '../../shared/http/response.js';
import { getAdminOverview } from './admin.repository.js';

export async function adminRoutes(app: FastifyInstance) {
  app.get('/overview', async (request) => {
    const authUser = await getAuthUser(request);
    const overview = await getAdminOverview(authUser.sub);

    return success(overview);
  });
}
