import { isAdminEmail } from '../../config/env.js';
import { pool } from '../../db/pool.js';
import { forbidden } from '../../shared/http/errors.js';

async function assertAdmin(userId: string) {
  const result = await pool.query<{ email: string }>(
    'SELECT email FROM users WHERE id = $1',
    [userId],
  );
  const email = result.rows[0]?.email;

  if (!email || !isAdminEmail(email)) {
    throw forbidden('Admin access required');
  }
}

export async function getAdminOverview(userId: string) {
  await assertAdmin(userId);

  const [
    totals,
    progress,
    modules,
    recentUsers,
    lessonsWithoutExercises,
    exercisesWithoutFeedback,
  ] = await Promise.all([
    pool.query<{
      users: number;
      courses: number;
      modules: number;
      lessons: number;
      exercises: number;
      achievements: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM courses) AS courses,
        (SELECT COUNT(*)::int FROM modules) AS modules,
        (SELECT COUNT(*)::int FROM lessons) AS lessons,
        (SELECT COUNT(*)::int FROM exercises) AS exercises,
        (SELECT COUNT(*)::int FROM achievements) AS achievements
    `),
    pool.query<{
      completed_lessons: number;
      active_users: number;
      total_xp: number;
    }>(`
      SELECT
        COUNT(*)::int AS completed_lessons,
        COUNT(DISTINCT user_id)::int AS active_users,
        COALESCE(SUM(xp_awarded), 0)::int AS total_xp
      FROM user_lesson_progress
    `),
    pool.query<{
      id: string;
      title: string;
      lessons: number;
      exercises: number;
      completions: number;
    }>(`
      SELECT
        m.id,
        m.title,
        COUNT(DISTINCT l.id)::int AS lessons,
        COUNT(DISTINCT e.id)::int AS exercises,
        COUNT(DISTINCT ulp.user_id || ':' || ulp.lesson_id)::int AS completions
      FROM modules m
      LEFT JOIN lessons l ON l.module_id = m.id
      LEFT JOIN exercises e ON e.lesson_id = l.id
      LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = l.id
      GROUP BY m.id, m.title, m.sort_order
      ORDER BY m.sort_order
    `),
    pool.query<{
      id: string;
      name: string;
      email: string;
      xp: number;
      level: number;
      completed_lessons: number;
      last_activity: string | null;
    }>(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.xp,
        u.level,
        COUNT(ulp.lesson_id)::int AS completed_lessons,
        MAX(ulp.completed_at)::text AS last_activity
      FROM users u
      LEFT JOIN user_lesson_progress ulp ON ulp.user_id = u.id
      GROUP BY u.id
      ORDER BY COALESCE(MAX(ulp.completed_at), u.created_at) DESC
      LIMIT 12
    `),
    pool.query<{ id: string; title: string; module_title: string }>(`
      SELECT l.id, l.title, m.title AS module_title
      FROM lessons l
      JOIN modules m ON m.id = l.module_id
      LEFT JOIN exercises e ON e.lesson_id = l.id
      GROUP BY l.id, l.title, m.title, l.sort_order
      HAVING COUNT(e.id) = 0
      ORDER BY m.title, l.sort_order
      LIMIT 20
    `),
    pool.query<{ id: string; prompt: string; lesson_title: string }>(`
      SELECT e.id, e.prompt, l.title AS lesson_title
      FROM exercises e
      JOIN lessons l ON l.id = e.lesson_id
      WHERE e.payload->>'feedback' IS NULL OR e.payload->>'feedback' = ''
      ORDER BY l.sort_order, e.sort_order
      LIMIT 20
    `),
  ]);

  return {
    totals: totals.rows[0],
    progress: progress.rows[0],
    modules: modules.rows,
    recentUsers: recentUsers.rows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      xp: user.xp,
      level: user.level,
      completedLessons: user.completed_lessons,
      lastActivity: user.last_activity,
    })),
    contentHealth: {
      lessonsWithoutExercises: lessonsWithoutExercises.rows,
      exercisesWithoutFeedback: exercisesWithoutFeedback.rows,
    },
  };
}
