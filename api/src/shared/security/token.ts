import { SignJWT, jwtVerify } from 'jose';

import { env } from '../../config/env.js';
import { unauthorized } from '../http/errors.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export async function signAuthToken(payload: AuthTokenPayload) {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload.email !== 'string') {
      throw unauthorized('Invalid token');
    }
    return { sub: payload.sub, email: payload.email };
  } catch {
    throw unauthorized('Invalid token');
  }
}
