import type { FastifyRequest } from 'fastify';

import { unauthorized } from './errors.js';
import { verifyAuthToken } from '../security/token.js';

export async function getAuthUser(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw unauthorized();
  }

  const token = header.slice('Bearer '.length);
  return verifyAuthToken(token);
}
