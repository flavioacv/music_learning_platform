import 'package:flutter/material.dart';

import '../../domain/models/course_models.dart';
import '../../domain/models/progress_models.dart';
import '../services/api_client.dart';

class LearningRepository {
  const LearningRepository(this._apiClient);

  final ApiClient _apiClient;

  List<NotePair> get notePairs => const [
    NotePair(latin: 'Do', american: 'C'),
    NotePair(latin: 'Re', american: 'D'),
    NotePair(latin: 'Mi', american: 'E'),
    NotePair(latin: 'Fa', american: 'F'),
    NotePair(latin: 'Sol', american: 'G'),
    NotePair(latin: 'La', american: 'A'),
    NotePair(latin: 'Si', american: 'B'),
  ];

  Future<List<CourseModule>> getModules() async {
    final responses = await Future.wait([
      _apiClient.get('/api/v1/catalog/courses'),
      _apiClient.get('/api/v1/progress/me'),
    ]);

    final courses = (responses[0]['data'] as List<dynamic>)
        .cast<Map<String, dynamic>>();
    final progress = UserProgress.fromJson(
      responses[1]['data'] as Map<String, dynamic>,
    );
    final completedCount = progress.completedLessons;
    var lessonCursor = 0;

    return courses
        .expand((course) => (course['modules'] as List<dynamic>))
        .cast<Map<String, dynamic>>()
        .map((module) {
          final lessons = (module['lessons'] as List<dynamic>)
              .cast<Map<String, dynamic>>()
              .map((lesson) {
                final status = lessonCursor < completedCount
                    ? LessonStatus.completed
                    : lessonCursor == completedCount
                    ? LessonStatus.available
                    : LessonStatus.locked;
                lessonCursor += 1;

                return Lesson(
                  id: lesson['id'] as String,
                  title: lesson['title'] as String,
                  description: lesson['description'] as String,
                  content: lesson['content'] as String?,
                  xp: lesson['xpReward'] as int,
                  status: status,
                );
              })
              .toList();

          return CourseModule(
            id: module['id'] as String,
            title: module['title'] as String,
            subtitle: module['description'] as String,
            icon: _iconForModule(module['title'] as String),
            lessons: lessons,
          );
        })
        .toList();
  }

  Future<UserProgress> getProgress() async {
    final json = await _apiClient.get('/api/v1/progress/me');
    return UserProgress.fromJson(json['data'] as Map<String, dynamic>);
  }

  Future<List<Exercise>> getExercises(String lessonId) async {
    final json = await _apiClient.get('/api/v1/exercises/lesson/$lessonId');
    final items = (json['data'] as List<dynamic>).cast<Map<String, dynamic>>();
    return items.map(Exercise.fromJson).toList();
  }

  Future<LessonCompletionResult> completeLesson(String lessonId) async {
    final response = await _apiClient.post(
      '/api/v1/progress/lessons/$lessonId/complete',
    );
    return LessonCompletionResult.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  List<Achievement> get achievements => const [
    Achievement(
      title: 'Primeiro som',
      description: 'Concluiu a primeira licao.',
      icon: Icons.emoji_events,
      unlocked: true,
    ),
    Achievement(
      title: 'Leitor de cifras',
      description: 'Acertou notas em cifra americana.',
      icon: Icons.workspace_premium,
      unlocked: false,
    ),
    Achievement(
      title: 'Construtor de escalas',
      description: 'Montou a primeira escala maior.',
      icon: Icons.auto_graph,
      unlocked: false,
    ),
  ];

  IconData _iconForModule(String title) {
    final normalized = title
        .toLowerCase()
        .replaceAll('á', 'a')
        .replaceAll('ã', 'a')
        .replaceAll('â', 'a')
        .replaceAll('é', 'e')
        .replaceAll('ê', 'e')
        .replaceAll('í', 'i')
        .replaceAll('ó', 'o')
        .replaceAll('ô', 'o')
        .replaceAll('ú', 'u');

    return switch (normalized) {
      'notas musicais' => Icons.music_note,
      'ritmo' => Icons.timer,
      'escalas' => Icons.linear_scale,
      'intervalos' => Icons.swap_horiz,
      'acordes' => Icons.piano,
      'campo harmonico' => Icons.account_tree,
      'aplicacao musical' => Icons.library_music,
      'treino auditivo' => Icons.hearing,
      _ => Icons.school,
    };
  }
}
