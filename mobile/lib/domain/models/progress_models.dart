class UserProgress {
  const UserProgress({
    required this.currentXp,
    required this.currentLevel,
    required this.completedLessons,
    required this.totalLessons,
    required this.totalXpAwarded,
    required this.achievements,
  });

  final int currentXp;
  final int currentLevel;
  final int completedLessons;
  final int totalLessons;
  final int totalXpAwarded;
  final List<ProgressAchievement> achievements;

  factory UserProgress.fromJson(Map<String, dynamic> json) {
    final achievements = (json['achievements'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>()
        .map(ProgressAchievement.fromJson)
        .toList();

    return UserProgress(
      currentXp:
          (json['currentXp'] as int?) ?? (json['totalXpAwarded'] as int?) ?? 0,
      currentLevel: json['currentLevel'] as int? ?? 1,
      completedLessons: json['completedLessons'] as int,
      totalLessons: json['totalLessons'] as int? ?? 0,
      totalXpAwarded: json['totalXpAwarded'] as int,
      achievements: achievements,
    );
  }
}

class ProgressAchievement {
  const ProgressAchievement({
    required this.code,
    required this.title,
    required this.description,
    required this.unlockedAt,
  });

  final String code;
  final String title;
  final String description;
  final String unlockedAt;

  factory ProgressAchievement.fromJson(Map<String, dynamic> json) {
    return ProgressAchievement(
      code: json['code'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      unlockedAt: json['unlockedAt'] as String,
    );
  }
}

class LessonCompletionResult {
  const LessonCompletionResult({
    required this.leveledUp,
    required this.newLevel,
    required this.newAchievements,
  });

  final bool leveledUp;
  final int newLevel;
  final List<ProgressAchievement> newAchievements;

  factory LessonCompletionResult.fromJson(Map<String, dynamic> json) {
    final achievements = (json['newAchievements'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>()
        .map(ProgressAchievement.fromJson)
        .toList();

    return LessonCompletionResult(
      leveledUp: json['leveledUp'] as bool? ?? false,
      newLevel: json['newLevel'] as int? ?? 1,
      newAchievements: achievements,
    );
  }
}
