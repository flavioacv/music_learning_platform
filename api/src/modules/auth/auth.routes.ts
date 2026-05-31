import type { FastifyInstance } from 'fastify';

import { getAuthUser } from '../../shared/http/auth.js';
import { success } from '../../shared/http/response.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { getMe, login, register } from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const result = await register(input);

    return reply.code(201).send(success(result));
  });

  app.post('/login', async (request) => {
    const input = loginSchema.parse(request.body);
    const result = await login(input);

    return success(result);
  });

  app.get('/me', async (request) => {
    const authUser = await getAuthUser(request);
    const user = await getMe(authUser.sub);

    return success(user);
  });
}
