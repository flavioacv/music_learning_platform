import 'package:flutter/material.dart';

import '../../../../data/repositories/learning_repository.dart';
import '../../../../domain/models/course_models.dart';
import '../../../core/responsive_content.dart';

class CourseScreen extends StatefulWidget {
  const CourseScreen({super.key, required this.learningRepository});

  final LearningRepository learningRepository;

  @override
  State<CourseScreen> createState() => _CourseScreenState();
}

class _CourseScreenState extends State<CourseScreen> {
  late Future<List<CourseModule>> _modulesFuture;

  @override
  void initState() {
    super.initState();
    _modulesFuture = widget.learningRepository.getModules();
  }

  Future<void> _completeLesson(String lessonId) async {
    await widget.learningRepository.completeLesson(lessonId);
    setState(() {
      _modulesFuture = widget.learningRepository.getModules();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ResponsiveContent(
      child: FutureBuilder<List<CourseModule>>(
        future: _modulesFuture,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return _CourseMessage(
              icon: Icons.cloud_off,
              title: 'Nao foi possivel carregar o curso',
              message: snapshot.error.toString(),
            );
          }

          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final modules = snapshot.data!;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Curso',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              const Text('Da compreensao musical ate os primeiros acordes.'),
              const SizedBox(height: 18),
              ...modules.map(
                (module) => _ModuleCard(
                  module: module,
                  onCompleteLesson: _completeLesson,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CourseMessage extends StatelessWidget {
  const _CourseMessage({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 42, color: theme.colorScheme.error),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  const _ModuleCard({required this.module, required this.onCompleteLesson});

  final CourseModule module;
  final ValueChanged<String> onCompleteLesson;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: Icon(module.icon, color: theme.colorScheme.primary),
        title: Text(
          module.title,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(module.subtitle),
        trailing: SizedBox(
          width: 72,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text('${(module.progress * 100).round()}%'),
              const SizedBox(width: 4),
              const Icon(Icons.expand_more),
            ],
          ),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: LinearProgressIndicator(value: module.progress),
          ),
          ...module.lessons.map(
            (lesson) =>
                _LessonTile(lesson: lesson, onComplete: onCompleteLesson),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _LessonTile extends StatelessWidget {
  const _LessonTile({required this.lesson, required this.onComplete});

  final Lesson lesson;
  final ValueChanged<String> onComplete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = switch (lesson.status) {
      LessonStatus.completed => theme.colorScheme.primary,
      LessonStatus.available => theme.colorScheme.secondary,
      LessonStatus.locked => Colors.grey.shade500,
    };
    final icon = switch (lesson.status) {
      LessonStatus.completed => Icons.check_circle,
      LessonStatus.available => Icons.play_circle,
      LessonStatus.locked => Icons.lock,
    };

    return ListTile(
      enabled: lesson.status != LessonStatus.locked,
      onTap: lesson.status == LessonStatus.completed
          ? null
          : () => onComplete(lesson.id),
      leading: Icon(icon, color: color),
      title: Text(lesson.title),
      subtitle: Text(lesson.description),
      trailing: Text('+${lesson.xp} XP'),
    );
  }
}
