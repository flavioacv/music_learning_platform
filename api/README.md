# Music Learning API

Backend REST para a plataforma de aprendizado musical.

## Stack

- Node.js + TypeScript
- Fastify
- PostgreSQL
- `pg` para acesso ao banco
- SQL migrations em `migrations/`

## Rodando localmente

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

Healthcheck:

```bash
curl http://localhost:3333/health
```

## Endpoints iniciais

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/catalog/courses`
- `GET /api/v1/progress/me`
- `POST /api/v1/progress/lessons/:lessonId/complete`
