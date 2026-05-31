class UserProgress {
  const UserProgress({
    required this.completedLessons,
    required this.totalXpAwarded,
    required this.achievements,
  });

  final int completedLessons;
  final int totalXpAwarded;
  final List<ProgressAchievement> achievements;

  factory UserProgress.fromJson(Map<String, dynamic> json) {
    final achievements = (json['achievements'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>()
        .map(ProgressAchievement.fromJson)
        .toList();

    return UserProgress(
      completedLessons: json['completedLessons'] as int,
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
