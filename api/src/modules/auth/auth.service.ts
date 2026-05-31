import { conflict, unauthorized } from '../../shared/http/errors.js';
import { hashPassword, verifyPassword } from '../../shared/security/password.js';
import { signAuthToken } from '../../shared/security/token.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import {
  createUser,
  findPublicUserById,
  findUserByEmail,
} from './auth.repository.js';

export async function register(input: RegisterInput) {
  const existingUser = await findUserByEmail(input.email);
  if (existingUser) {
    throw conflict('Email already registered', 'email_already_registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
  });
  const token = await signAuthToken({ sub: user.id, email: user.email });

  return { user, token };
}

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw unauthorized('Invalid credentials');
  }

  const isValidPassword = await verifyPassword(
    user.password_hash,
    input.password,
  );
  if (!isValidPassword) {
    throw unauthorized('Invalid credentials');
  }

  const token = await signAuthToken({ sub: user.id, email: user.email });
  const { password_hash: _, ...publicUser } = user;

  return { user: publicUser, token };
}

export async function getMe(userId: string) {
  const user = await findPublicUserById(userId);
  if (!user) {
    throw unauthorized('Invalid user');
  }

  return user;
}
