import { buildApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';

const app = buildApp();

async function start() {
  try {
    await app.listen({ host: env.HOST, port: env.PORT });
  } catch (error) {
    app.log.error(error);
    await closePool();
    process.exit(1);
  }
}

async function shutdown() {
  await app.close();
  await closePool();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await start();
