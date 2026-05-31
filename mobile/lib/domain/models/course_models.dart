import 'package:flutter/material.dart';

enum LessonStatus { locked, available, completed }

class Lesson {
  const Lesson({
    required this.id,
    required this.title,
    required this.description,
    required this.xp,
    required this.status,
  });

  final String id;
  final String title;
  final String description;
  final int xp;
  final LessonStatus status;
}

class CourseModule {
  const CourseModule({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.lessons,
  });

  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final List<Lesson> lessons;

  int get completedLessons =>
      lessons.where((lesson) => lesson.status == LessonStatus.completed).length;

  double get progress =>
      lessons.isEmpty ? 0 : completedLessons / lessons.length;
}

class Achievement {
  const Achievement({
    required this.title,
    required this.description,
    required this.icon,
    required this.unlocked,
  });

  final String title;
  final String description;
  final IconData icon;
  final bool unlocked;
}

class NotePair {
  const NotePair({required this.latin, required this.american});

  factory NotePair.fromJson(Map<String, dynamic> json) {
    return NotePair(
      latin: json['latin'] as String,
      american: json['american'] as String,
    );
  }

  final String latin;
  final String american;
}

class Exercise {
  const Exercise({
    required this.id,
    required this.lessonId,
    required this.type,
    required this.prompt,
    required this.payload,
    required this.xpReward,
  });

  factory Exercise.fromJson(Map<String, dynamic> json) {
    return Exercise(
      id: json['id'] as String,
      lessonId: json['lessonId'] as String,
      type: json['type'] as String,
      prompt: json['prompt'] as String,
      payload: json['payload'] as Map<String, dynamic>,
      xpReward: json['xpReward'] as int,
    );
  }

  final String id;
  final String lessonId;
  final String type;
  final String prompt;
  final Map<String, dynamic> payload;
  final int xpReward;
}
