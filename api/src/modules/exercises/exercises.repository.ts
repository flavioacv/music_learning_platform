import { pool } from '../../db/pool.js';

export async function getExercisesByLesson(lessonId: string) {
  const result = await pool.query(
    `
    SELECT
      id,
      lesson_id,
      type,
      prompt,
      payload,
      xp_reward,
      sort_order
    FROM exercises
    WHERE lesson_id = $1
    ORDER BY sort_order ASC
  `,
    [lessonId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    lessonId: row.lesson_id,
    type: row.type,
    prompt: row.prompt,
    payload: row.payload,
    xpReward: row.xp_reward,
    sortOrder: row.sort_order,
  }));
}
