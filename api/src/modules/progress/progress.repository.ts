import { pool } from '../../db/pool.js';

export async function getUserProgress(userId: string) {
  const [user, progress, totalLessons] = await Promise.all([
    pool.query<{
      xp: number;
      level: number;
    }>('SELECT xp, level FROM users WHERE id = $1', [userId]),
    pool.query<{
      completed_lessons: number;
      total_xp_awarded: number;
    }>(
      `SELECT
         COUNT(*)::int AS completed_lessons,
         COALESCE(SUM(xp_awarded), 0)::int AS total_xp_awarded
       FROM user_lesson_progress
       WHERE user_id = $1`,
      [userId],
    ),
    pool.query<{ total_lessons: number }>(
      'SELECT COUNT(*)::int AS total_lessons FROM lessons',
    ),
  ]);

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
    currentXp: user.rows[0]?.xp ?? 0,
    currentLevel: user.rows[0]?.level ?? 1,
    completedLessons: progress.rows[0]?.completed_lessons ?? 0,
    totalLessons: totalLessons.rows[0]?.total_lessons ?? 0,
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT xp, level FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rowCount === 0) throw new Error('User not found');
    let { xp, level } = userRes.rows[0];
    const oldLevel = level;

    const lessonRes = await client.query(
      'SELECT title, xp_reward FROM lessons WHERE id = $1',
      [lessonId]
    );
    if (lessonRes.rowCount === 0) throw new Error('Lesson not found');
    const lesson = lessonRes.rows[0];

    const insertRes = await client.query(
      `INSERT INTO user_lesson_progress (user_id, lesson_id, xp_awarded)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, lesson_id) DO NOTHING
       RETURNING completed_at`,
      [userId, lessonId, lesson.xp_reward]
    );

    if (insertRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const completedAt = insertRes.rows[0].completed_at;
    let totalXpGained = lesson.xp_reward;
    const newAchievements: {
      code: string;
      title: string;
      description: string;
      unlockedAt: string;
    }[] = [];

    const countRes = await client.query(
      'SELECT COUNT(*)::int as count FROM user_lesson_progress WHERE user_id = $1',
      [userId]
    );
    const completedCount = countRes.rows[0].count;

    const codesToCheck = [];
    if (completedCount === 1) codesToCheck.push('first_lesson');
    if (lesson.title === 'Notacao Americana') codesToCheck.push('cipher_reader');
    if (lesson.title === 'Construindo Escalas') codesToCheck.push('scale_builder');

    for (const code of codesToCheck) {
      const achRes = await client.query(
        'SELECT id, title, description, xp_reward FROM achievements WHERE code = $1',
        [code]
      );
      if (achRes.rowCount && achRes.rowCount > 0) {
        const ach = achRes.rows[0];
        const achInsert = await client.query(
          `INSERT INTO user_achievements (user_id, achievement_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING
           RETURNING unlocked_at`,
          [userId, ach.id]
        );

        if (achInsert.rowCount && achInsert.rowCount > 0) {
          totalXpGained += ach.xp_reward;
          newAchievements.push({
            code,
            title: ach.title,
            description: ach.description,
            unlockedAt: achInsert.rows[0].unlocked_at,
          });
        }
      }
    }

    xp += totalXpGained;
    level = Math.max(1, Math.floor(xp / 100) + 1);
    const leveledUp = level > oldLevel;

    await client.query(
      'UPDATE users SET xp = $1, level = $2, updated_at = now() WHERE id = $3',
      [xp, level, userId]
    );

    await client.query('COMMIT');

    return {
      lessonId,
      xpAwarded: totalXpGained,
      completedAt,
      leveledUp,
      newLevel: level,
      newAchievements,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
