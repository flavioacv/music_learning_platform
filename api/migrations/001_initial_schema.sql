CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_lesson_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_modules_course_sort
  ON modules(course_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_lessons_module_sort
  ON lessons(module_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_exercises_lesson_sort
  ON exercises(lesson_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user
  ON user_lesson_progress(user_id);

INSERT INTO courses (id, title, description, sort_order)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Fundamentos Musicais',
  'Compreensao musical, teoria aplicada e exercicios interativos para iniciantes.',
  1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modules (id, course_id, title, description, sort_order)
VALUES
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Notas musicais', 'Nomenclatura latina e americana.', 1),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Acidentes musicais', 'Sustenidos e bemois.', 2),
  ('23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Escalas', 'Formacao da escala maior.', 3),
  ('24444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Intervalos', 'Distancias entre notas.', 4),
  ('25555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Formacao de acordes', 'Triades maiores e menores.', 5),
  ('26666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Campo harmonico', 'Funcoes harmonicas e progressoes.', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (id, module_id, title, description, content, xp_reward, sort_order)
VALUES
  ('31111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', 'As 7 notas', 'Entenda Do, Re, Mi, Fa, Sol, La e Si.', 'Do Re Mi Fa Sol La Si formam a base da nomenclatura latina.', 25, 1),
  ('32222222-2222-2222-2222-222222222222', '21111111-1111-1111-1111-111111111111', 'Cifras americanas', 'Relacione C, D, E, F, G, A e B.', 'Do=C, Re=D, Mi=E, Fa=F, Sol=G, La=A, Si=B.', 30, 2),
  ('33333333-3333-3333-3333-333333333333', '21111111-1111-1111-1111-111111111111', 'Exercicio rapido', 'Identifique notas em poucos segundos.', 'Pratique a conversao entre nota latina e cifra americana.', 35, 3),
  ('34444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Sustenidos', 'Veja como o # altera uma nota.', 'O sustenido eleva uma nota em um semitom.', 30, 1),
  ('35555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Bemois', 'Aprenda a ler notas com b.', 'O bemol abaixa uma nota em um semitom.', 30, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO exercises (lesson_id, type, prompt, payload, xp_reward, sort_order)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'note_identification',
  'Qual cifra americana corresponde a nota apresentada?',
  '{"notes":[{"latin":"Do","american":"C"},{"latin":"Re","american":"D"},{"latin":"Mi","american":"E"},{"latin":"Fa","american":"F"},{"latin":"Sol","american":"G"},{"latin":"La","american":"A"},{"latin":"Si","american":"B"}]}',
  10,
  1
);

INSERT INTO achievements (code, title, description, xp_reward)
VALUES
  ('first_lesson', 'Primeiro som', 'Concluiu a primeira licao.', 10),
  ('cipher_reader', 'Leitor de cifras', 'Acertou notas em cifra americana.', 20),
  ('scale_builder', 'Construtor de escalas', 'Montou a primeira escala maior.', 30)
ON CONFLICT (code) DO NOTHING;
