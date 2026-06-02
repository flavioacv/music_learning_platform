import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../data/repositories/learning_repository.dart';
import '../../../../domain/models/course_models.dart';
import '../../../../domain/models/progress_models.dart';
import '../../../core/responsive_content.dart';
import '../view_models/exercise_view_model.dart';

import 'widgets/multiple_choice_widget.dart';
import 'widgets/fill_blank_widget.dart';
import 'widgets/rhythm_tap_widget.dart';
import 'widgets/scale_builder_widget.dart';
import 'widgets/interval_builder_widget.dart';
import 'widgets/chord_builder_widget.dart';
import 'widgets/harmonic_field_builder_widget.dart';
import 'widgets/audio_recognition_widget.dart';

class ExerciseScreen extends StatefulWidget {
  const ExerciseScreen({
    super.key,
    required this.lesson,
    required this.repository,
  });

  final Lesson lesson;
  final LearningRepository repository;

  @override
  State<ExerciseScreen> createState() => _ExerciseScreenState();
}

class _ExerciseScreenState extends State<ExerciseScreen> {
  late final ExerciseViewModel _viewModel;
  late bool _showTheory;

  @override
  void initState() {
    super.initState();
    _viewModel = ExerciseViewModel(widget.repository, widget.lesson.id);
    _viewModel.addListener(_onViewModelChange);
    _showTheory = widget.lesson.content != null && widget.lesson.content!.isNotEmpty;
  }

  void _onViewModelChange() {
    if (_viewModel.isFinished) {
      _viewModel.removeListener(_onViewModelChange);
      _completeAndPop();
    }
  }

  Future<void> _completeAndPop() async {
    try {
      final result = await widget.repository.completeLesson(widget.lesson.id);
      if (mounted && (result.leveledUp || result.newAchievements.isNotEmpty)) {
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => _GamificationDialog(result: result),
        );
      }
    } catch (e) {
      // Ignore error for now
    }
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  void dispose() {
    _viewModel.removeListener(_onViewModelChange);
    _viewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Prática'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          if (_viewModel.isLoading) {
            return Center(
              child: const CircularProgressIndicator().animate().scale(),
            );
          }

          if (_viewModel.error != null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: theme.colorScheme.error,
                  ).animate().shake(),
                  const SizedBox(height: 16),
                  Text(
                    'Erro: ${_viewModel.error}',
                    style: theme.textTheme.titleMedium,
                  ),
                ],
              ),
            );
          }

          if (_showTheory) {
            return ResponsiveContent(
              maxWidth: 800,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                children: [
                  Text(
                    widget.lesson.title,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: theme.colorScheme.primary,
                    ),
                  ).animate().fadeIn().slideY(begin: -0.1),
                  const SizedBox(height: 8),
                  Text(
                    widget.lesson.description,
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ).animate().fadeIn(delay: 100.ms),
                  const SizedBox(height: 32),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceVariant.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: theme.colorScheme.surfaceVariant),
                    ),
                    child: Text(
                      widget.lesson.content!,
                      style: theme.textTheme.bodyLarge?.copyWith(height: 1.6),
                    ),
                  ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
                  const SizedBox(height: 48),
                  Center(
                    child: FilledButton.icon(
                      onPressed: () {
                        if (_viewModel.questionCount == 0) {
                          _completeAndPop();
                        } else {
                          setState(() {
                            _showTheory = false;
                          });
                        }
                      },
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(200, 56),
                      ),
                      icon: Icon(_viewModel.questionCount == 0 ? Icons.check_circle : Icons.arrow_forward),
                      label: Text(
                        _viewModel.questionCount == 0 ? 'Concluir Lição' : 'Começar Exercícios',
                        style: const TextStyle(fontSize: 18),
                      ),
                    ).animate().fadeIn(delay: 400.ms).scale(),
                  ),
                ],
              ),
            );
          }

          if (_viewModel.questionCount == 0 || _viewModel.current == null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    size: 64,
                    color: theme.colorScheme.primary,
                  ).animate().scale(),
                  const SizedBox(height: 16),
                  const Text('Nenhum exercicio para esta licao.'),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _completeAndPop,
                    child: const Text('Concluir licao'),
                  ),
                ],
              ),
            );
          }

          return ResponsiveContent(
            maxWidth: 800,
            child: _ExerciseContent(viewModel: _viewModel),
          );
        },
      ),
    );
  }
}

class _ExerciseContent extends StatelessWidget {
  const _ExerciseContent({required this.viewModel});

  final ExerciseViewModel viewModel;

  Widget _buildExerciseWidget() {
    final exercise = viewModel.current!;
    switch (exercise.type) {
      case 'multiple_choice':
        return MultipleChoiceWidget(exercise: exercise, viewModel: viewModel);
      case 'fill_blank':
        return FillBlankWidget(exercise: exercise, viewModel: viewModel);
      case 'rhythm_tap':
        return RhythmTapWidget(exercise: exercise, viewModel: viewModel);
      case 'scale_builder':
        return ScaleBuilderWidget(exercise: exercise, viewModel: viewModel);
      case 'interval_builder':
        return IntervalBuilderWidget(exercise: exercise, viewModel: viewModel);
      case 'chord_builder':
        return ChordBuilderWidget(exercise: exercise, viewModel: viewModel);
      case 'harmonic_field_builder':
        return HarmonicFieldBuilderWidget(exercise: exercise, viewModel: viewModel);
      case 'audio_recognition':
        return AudioRecognitionWidget(exercise: exercise, viewModel: viewModel);
      default:
        // Se ainda não construímos o widget, exibe um placeholder
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Text(
              'Widget para o tipo "${exercise.type}" ainda não implementado.\nPrompt: ${exercise.prompt}',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.orangeAccent),
            ),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceVariant,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'Questão ${viewModel.questionIndex + 1} de ${viewModel.questionCount}',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: theme.colorScheme.primary.withOpacity(0.5),
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.bolt, size: 20, color: theme.colorScheme.primary),
                  const SizedBox(width: 4),
                  Text(
                    '${viewModel.score} XP',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ).animate().fadeIn().slideY(begin: -0.5),
        
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: Container(
            key: ValueKey(viewModel.current!.id),
            child: _buildExerciseWidget(),
          ),
        ),
        
        const SizedBox(height: 40),
        if (viewModel.hasAnswered)
          _FeedbackCard(
            viewModel: viewModel,
          ).animate().slideY(begin: 0.5, curve: Curves.easeOutExpo),
      ],
    );
  }
}

class _FeedbackCard extends StatelessWidget {
  const _FeedbackCard({required this.viewModel});

  final ExerciseViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLast = viewModel.questionIndex + 1 == viewModel.questionCount;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: viewModel.isCorrect
            ? Colors.greenAccent.withOpacity(0.1)
            : Colors.orangeAccent.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: viewModel.isCorrect ? Colors.greenAccent : Colors.orangeAccent,
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                viewModel.isCorrect ? Icons.check_circle : Icons.info,
                color: viewModel.isCorrect
                    ? Colors.greenAccent
                    : Colors.orangeAccent,
                size: 32,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      viewModel.isCorrect ? 'Excelente!' : 'Ops...',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: viewModel.isCorrect
                            ? Colors.greenAccent
                            : Colors.orangeAccent,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: viewModel.next,
            style: FilledButton.styleFrom(
              backgroundColor: viewModel.isCorrect
                  ? Colors.greenAccent
                  : Colors.orangeAccent,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 20),
            ),
            icon: Icon(isLast ? Icons.done_all : Icons.arrow_forward_rounded),
            label: Text(isLast ? 'Finalizar Lição' : 'Próxima Questão'),
          ),
        ],
      ),
    );
  }
}

class _GamificationDialog extends StatelessWidget {
  const _GamificationDialog({required this.result});

  final LessonCompletionResult result;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (result.leveledUp) ...
              [
                Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        const Color(0xFFFFD700),
                        const Color(0xFFFFA500),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFFD700).withOpacity(0.5),
                        blurRadius: 32,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Text(
                      '⬆',
                      style: TextStyle(fontSize: 48),
                    ),
                  ),
                )
                    .animate()
                    .scale(
                      duration: 600.ms,
                      curve: Curves.easeOutBack,
                    )
                    .then()
                    .shimmer(duration: 1200.ms),
                const SizedBox(height: 20),
                Text(
                  'Level Up!',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFFFFD700),
                    letterSpacing: 1.5,
                  ),
                ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.3),
                const SizedBox(height: 8),
                Text(
                  'Voce atingiu o nivel ${result.newLevel}!',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyLarge,
                ).animate().fadeIn(delay: 300.ms),
                const SizedBox(height: 24),
              ],
            if (result.newAchievements.isNotEmpty) ...
              [
                Text(
                  result.leveledUp ? 'E ainda...' : 'Conquista desbloqueada!',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ).animate().fadeIn(delay: 400.ms),
                const SizedBox(height: 16),
                ...result.newAchievements.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final ach = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 16,
                      ),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            theme.colorScheme.primary.withOpacity(0.15),
                            theme.colorScheme.secondary.withOpacity(0.08),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: theme.colorScheme.primary.withOpacity(0.4),
                          width: 1.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primary.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.emoji_events,
                              color: const Color(0xFFFFD700),
                              size: 28,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  ach.title,
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Text(
                                  ach.description,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: theme.colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                      .animate()
                      .fadeIn(delay: (500 + idx * 150).ms)
                      .slideX(begin: 0.3);
                }),
                const SizedBox(height: 8),
              ],
            FilledButton.icon(
              onPressed: () => Navigator.of(context).pop(),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              icon: const Icon(Icons.check_rounded),
              label: const Text(
                'Continuar',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ).animate().fadeIn(delay: 700.ms),
          ],
        ),
      ),
    );
  }
}
