import { pool } from '../../db/pool.js';

type CourseRow = {
  course_id: string;
  course_title: string;
  course_description: string;
  module_id: string | null;
  module_title: string | null;
  module_description: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  lesson_description: string | null;
  lesson_xp_reward: number | null;
};

export async function listCourses() {
  const result = await pool.query<CourseRow>(`
    SELECT
      c.id AS course_id,
      c.title AS course_title,
      c.description AS course_description,
      m.id AS module_id,
      m.title AS module_title,
      m.description AS module_description,
      l.id AS lesson_id,
      l.title AS lesson_title,
      l.description AS lesson_description,
      l.xp_reward AS lesson_xp_reward
    FROM courses c
    LEFT JOIN modules m ON m.course_id = c.id
    LEFT JOIN lessons l ON l.module_id = m.id
    ORDER BY c.sort_order, m.sort_order, l.sort_order
  `);

  return mapCourses(result.rows);
}

function mapCourses(rows: CourseRow[]) {
  const courses = new Map<string, any>();

  for (const row of rows) {
    if (!courses.has(row.course_id)) {
      courses.set(row.course_id, {
        id: row.course_id,
        title: row.course_title,
        description: row.course_description,
        modules: [],
      });
    }

    const course = courses.get(row.course_id);
    if (!row.module_id) continue;

    let module = course.modules.find((item: any) => item.id === row.module_id);
    if (!module) {
      module = {
        id: row.module_id,
        title: row.module_title,
        description: row.module_description,
        lessons: [],
      };
      course.modules.push(module);
    }

    if (row.lesson_id) {
      module.lessons.push({
        id: row.lesson_id,
        title: row.lesson_title,
        description: row.lesson_description,
        xpReward: row.lesson_xp_reward,
      });
    }
  }

  return [...courses.values()];
}
