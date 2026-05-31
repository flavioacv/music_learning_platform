import { pool } from '../../db/pool.js';

export async function getUserProgress(userId: string) {
  const progress = await pool.query<{
    completed_lessons: number;
    total_xp_awarded: number;
  }>(
    `SELECT
       COUNT(*)::int AS completed_lessons,
       COALESCE(SUM(xp_awarded), 0)::int AS total_xp_awarded
     FROM user_lesson_progress
     WHERE user_id = $1`,
    [userId],
  );

  const achievements = await pool.query<{
    code: string;
    title: string;
    description: string;
    unlocked_at: string;
  }>(
    `SELECT a.code, a.title, a.description, ua.unlocked_at
     FROM user_achievements ua
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = $1
     ORDER BY ua.unlocked_at DESC`,
    [userId],
  );

  return {
    completedLessons: progress.rows[0]?.completed_lessons ?? 0,
    totalXpAwarded: progress.rows[0]?.total_xp_awarded ?? 0,
    achievements: achievements.rows.map((achievement) => ({
      code: achievement.code,
      title: achievement.title,
      description: achievement.description,
      unlockedAt: achievement.unlocked_at,
    })),
  };
}

export async function completeLesson(userId: string, lessonId: string) {
  const result = await pool.query<{
    lesson_id: string;
    xp_awarded: number;
    completed_at: string;
  }>(
    `WITH lesson AS (
       SELECT id, xp_reward FROM lessons WHERE id = $2
     ),
     inserted AS (
       INSERT INTO user_lesson_progress (user_id, lesson_id, xp_awarded)
       SELECT $1, lesson.id, lesson.xp_reward FROM lesson
       ON CONFLICT (user_id, lesson_id) DO NOTHING
       RETURNING lesson_id, xp_awarded, completed_at
     ),
     xp_update AS (
       UPDATE users
       SET xp = xp + COALESCE((SELECT xp_awarded FROM inserted), 0),
           level = GREATEST(1, ((xp + COALESCE((SELECT xp_awarded FROM inserted), 0)) / 100) + 1),
           updated_at = now()
       WHERE id = $1
     )
     SELECT lesson_id, xp_awarded, completed_at FROM inserted`,
    [userId, lessonId],
  );

  return result.rows[0] ?? null;
}
