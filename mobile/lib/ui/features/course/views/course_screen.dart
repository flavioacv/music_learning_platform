import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../data/repositories/learning_repository.dart';
import '../../../../domain/models/course_models.dart';
import '../../../core/responsive_content.dart';
import '../../practice/views/exercise_screen.dart';

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

  Future<void> _reloadModules() {
    final future = widget.learningRepository.getModules();
    setState(() {
      _modulesFuture = future;
    });
    return future;
  }

  Future<void> _completeLesson(Lesson lesson) async {
    final didComplete = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => ExerciseScreen(
          lesson: lesson,
          repository: widget.learningRepository,
        ),
      ),
    );

    if (!mounted || didComplete != true) return;

    await _reloadModules();
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

          return RefreshIndicator(
            onRefresh: _reloadModules,
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        'Curso Base',
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                          color: theme.colorScheme.primary,
                        ),
                      ).animate().fadeIn().slideX(begin: -0.1),
                    ),
                    IconButton.filledTonal(
                      onPressed: _reloadModules,
                      tooltip: 'Atualizar progresso',
                      icon: const Icon(Icons.refresh),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Da compreensao musical ate os primeiros acordes.',
                  style: theme.textTheme.bodyLarge,
                ).animate().fadeIn(delay: 100.ms).slideX(begin: -0.1),
                const SizedBox(height: 32),
                ...modules.asMap().entries.map((entry) {
                  final index = entry.key;
                  final module = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child:
                        _ModuleCard(
                              module: module,
                              onCompleteLesson: _completeLesson,
                            )
                            .animate()
                            .fadeIn(delay: (200 + (index * 100)).ms)
                            .slideY(begin: 0.1),
                  );
                }),
                const SizedBox(height: 40),
              ],
            ),
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
            Icon(icon, size: 64, color: theme.colorScheme.error)
                .animate(
                  onPlay: (controller) => controller.repeat(reverse: true),
                )
                .scale(begin: const Offset(1, 1), end: const Offset(1.1, 1.1)),
            const SizedBox(height: 24),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
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
  final ValueChanged<Lesson> onCompleteLesson;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: theme.copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          iconColor: theme.colorScheme.primary,
          collapsedIconColor: theme.colorScheme.onSurfaceVariant,
          tilePadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          leading: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(module.icon, color: theme.colorScheme.primary),
          ),
          title: Text(
            module.title,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
          ),
          subtitle: Text(module.subtitle),
          trailing: SizedBox(
            width: 80,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  '${(module.progress * 100).round()}%',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.expand_more),
              ],
            ),
          ),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: module.progress,
                  minHeight: 8,
                  backgroundColor: theme.colorScheme.background,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    theme.colorScheme.primary,
                  ),
                ),
              ),
            ),
            ...module.lessons.map(
              (lesson) =>
                  _LessonTile(lesson: lesson, onComplete: onCompleteLesson),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _LessonTile extends StatefulWidget {
  const _LessonTile({required this.lesson, required this.onComplete});

  final Lesson lesson;
  final ValueChanged<Lesson> onComplete;

  @override
  State<_LessonTile> createState() => _LessonTileState();
}

class _LessonTileState extends State<_LessonTile> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCompleted = widget.lesson.status == LessonStatus.completed;
    final isLocked = widget.lesson.status == LessonStatus.locked;

    final color = isCompleted
        ? Colors.greenAccent
        : isLocked
        ? theme.colorScheme.onSurfaceVariant.withOpacity(0.5)
        : theme.colorScheme.primary;

    final icon = isCompleted
        ? Icons.check_circle
        : isLocked
        ? Icons.lock
        : Icons.play_circle_fill;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      cursor: isLocked ? SystemMouseCursors.basic : SystemMouseCursors.click,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        color: _isHovering && !isLocked
            ? theme.colorScheme.surfaceVariant.withOpacity(0.5)
            : Colors.transparent,
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 24,
            vertical: 4,
          ),
          enabled: !isLocked,
          onTap: isCompleted ? null : () => widget.onComplete(widget.lesson),
          leading: Icon(icon, color: color, size: 28),
          title: Text(
            widget.lesson.title,
            style: TextStyle(
              fontWeight: isCompleted ? FontWeight.w600 : FontWeight.w800,
              decoration: isCompleted ? TextDecoration.lineThrough : null,
              color: isLocked
                  ? theme.colorScheme.onSurfaceVariant
                  : theme.colorScheme.onSurface,
            ),
          ),
          subtitle: Text(
            widget.lesson.description,
            style: TextStyle(
              color: isLocked
                  ? theme.colorScheme.onSurfaceVariant.withOpacity(0.5)
                  : theme.colorScheme.onSurfaceVariant,
            ),
          ),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isLocked ? Colors.transparent : color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isLocked
                    ? theme.colorScheme.onSurfaceVariant.withOpacity(0.2)
                    : color.withOpacity(0.3),
              ),
            ),
            child: Text(
              '+${widget.lesson.xp} XP',
              style: TextStyle(
                color: isLocked
                    ? theme.colorScheme.onSurfaceVariant.withOpacity(0.5)
                    : color,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
