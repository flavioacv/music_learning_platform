class AdminOverview {
  const AdminOverview({
    required this.totals,
    required this.progress,
    required this.modules,
    required this.recentUsers,
    required this.contentHealth,
  });

  final AdminTotals totals;
  final AdminProgress progress;
  final List<AdminModuleSummary> modules;
  final List<AdminRecentUser> recentUsers;
  final AdminContentHealth contentHealth;

  factory AdminOverview.fromJson(Map<String, dynamic> json) {
    return AdminOverview(
      totals: AdminTotals.fromJson(json['totals'] as Map<String, dynamic>),
      progress: AdminProgress.fromJson(
        json['progress'] as Map<String, dynamic>,
      ),
      modules: (json['modules'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(AdminModuleSummary.fromJson)
          .toList(),
      recentUsers: (json['recentUsers'] as List<dynamic>)
          .cast<Map<String, dynamic>>()
          .map(AdminRecentUser.fromJson)
          .toList(),
      contentHealth: AdminContentHealth.fromJson(
        json['contentHealth'] as Map<String, dynamic>,
      ),
    );
  }
}

class AdminTotals {
  const AdminTotals({
    required this.users,
    required this.courses,
    required this.modules,
    required this.lessons,
    required this.exercises,
    required this.achievements,
  });

  final int users;
  final int courses;
  final int modules;
  final int lessons;
  final int exercises;
  final int achievements;

  factory AdminTotals.fromJson(Map<String, dynamic> json) {
    return AdminTotals(
      users: json['users'] as int,
      courses: json['courses'] as int,
      modules: json['modules'] as int,
      lessons: json['lessons'] as int,
      exercises: json['exercises'] as int,
      achievements: json['achievements'] as int,
    );
  }
}

class AdminProgress {
  const AdminProgress({
    required this.completedLessons,
    required this.activeUsers,
    required this.totalXp,
  });

  final int completedLessons;
  final int activeUsers;
  final int totalXp;

  factory AdminProgress.fromJson(Map<String, dynamic> json) {
    return AdminProgress(
      completedLessons: json['completed_lessons'] as int,
      activeUsers: json['active_users'] as int,
      totalXp: json['total_xp'] as int,
    );
  }
}

class AdminModuleSummary {
  const AdminModuleSummary({
    required this.id,
    required this.title,
    required this.lessons,
    required this.exercises,
    required this.completions,
  });

  final String id;
  final String title;
  final int lessons;
  final int exercises;
  final int completions;

  double get exerciseCoverage => lessons == 0 ? 0 : exercises / lessons;

  factory AdminModuleSummary.fromJson(Map<String, dynamic> json) {
    return AdminModuleSummary(
      id: json['id'] as String,
      title: json['title'] as String,
      lessons: json['lessons'] as int,
      exercises: json['exercises'] as int,
      completions: json['completions'] as int,
    );
  }
}

class AdminRecentUser {
  const AdminRecentUser({
    required this.id,
    required this.name,
    required this.email,
    required this.xp,
    required this.level,
    required this.completedLessons,
    required this.lastActivity,
  });

  final String id;
  final String name;
  final String email;
  final int xp;
  final int level;
  final int completedLessons;
  final DateTime? lastActivity;

  factory AdminRecentUser.fromJson(Map<String, dynamic> json) {
    final lastActivity = json['lastActivity'] as String?;

    return AdminRecentUser(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      xp: json['xp'] as int,
      level: json['level'] as int,
      completedLessons: json['completedLessons'] as int,
      lastActivity: lastActivity == null ? null : DateTime.parse(lastActivity),
    );
  }
}

class AdminContentHealth {
  const AdminContentHealth({
    required this.lessonsWithoutExercises,
    required this.exercisesWithoutFeedback,
  });

  final List<AdminLessonIssue> lessonsWithoutExercises;
  final List<AdminExerciseIssue> exercisesWithoutFeedback;

  int get issueCount =>
      lessonsWithoutExercises.length + exercisesWithoutFeedback.length;

  factory AdminContentHealth.fromJson(Map<String, dynamic> json) {
    return AdminContentHealth(
      lessonsWithoutExercises:
          (json['lessonsWithoutExercises'] as List<dynamic>)
              .cast<Map<String, dynamic>>()
              .map(AdminLessonIssue.fromJson)
              .toList(),
      exercisesWithoutFeedback:
          (json['exercisesWithoutFeedback'] as List<dynamic>)
              .cast<Map<String, dynamic>>()
              .map(AdminExerciseIssue.fromJson)
              .toList(),
    );
  }
}

class AdminLessonIssue {
  const AdminLessonIssue({
    required this.id,
    required this.title,
    required this.moduleTitle,
  });

  final String id;
  final String title;
  final String moduleTitle;

  factory AdminLessonIssue.fromJson(Map<String, dynamic> json) {
    return AdminLessonIssue(
      id: json['id'] as String,
      title: json['title'] as String,
      moduleTitle: json['module_title'] as String,
    );
  }
}

class AdminExerciseIssue {
  const AdminExerciseIssue({
    required this.id,
    required this.prompt,
    required this.lessonTitle,
  });

  final String id;
  final String prompt;
  final String lessonTitle;

  factory AdminExerciseIssue.fromJson(Map<String, dynamic> json) {
    return AdminExerciseIssue(
      id: json['id'] as String,
      prompt: json['prompt'] as String,
      lessonTitle: json['lesson_title'] as String,
    );
  }
}
