import { pool } from '../../db/pool.js';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  level: number;
  xp: number;
};

const publicUserColumns = `
  id,
  name,
  email,
  avatar_url,
  level,
  xp
`;

export type PublicUser = Omit<UserRecord, 'password_hash'>;

export async function findUserByEmail(email: string) {
  const result = await pool.query<UserRecord>(
    `SELECT id, name, email, password_hash, avatar_url, level, xp
     FROM users
     WHERE email = $1`,
    [email],
  );

  return result.rows[0] ?? null;
}

export async function findPublicUserById(id: string) {
  const result = await pool.query<PublicUser>(
    `SELECT ${publicUserColumns}
     FROM users
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const result = await pool.query<PublicUser>(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${publicUserColumns}`,
    [input.name, input.email, input.passwordHash],
  );

  return result.rows[0];
}
