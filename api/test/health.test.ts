import { describe, expect, it } from 'vitest';

process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';

const { buildApp } = await import('../src/app.js');

describe('health', () => {
  it('returns ok', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { status: 'ok' } });
  });
});
