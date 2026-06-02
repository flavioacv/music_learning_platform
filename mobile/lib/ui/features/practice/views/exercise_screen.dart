import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../data/repositories/learning_repository.dart';
import '../../../../data/services/api_client.dart';
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
  bool _isCompleting = false;

  @override
  void initState() {
    super.initState();
    _viewModel = ExerciseViewModel(widget.repository, widget.lesson.id);
    _viewModel.addListener(_onViewModelChange);
    _showTheory =
        widget.lesson.content != null && widget.lesson.content!.isNotEmpty;
  }

  void _onViewModelChange() {
    if (_viewModel.isFinished) setState(() {});
  }

  Future<void> _completeAndPop() async {
    if (_isCompleting) return;

    setState(() {
      _isCompleting = true;
    });

    try {
      final result = await widget.repository.completeLesson(widget.lesson.id);
      if (mounted && (result.leveledUp || result.newAchievements.isNotEmpty)) {
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => _GamificationDialog(result: result),
        );
      }
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } on ApiException catch (error) {
      _showCompletionError(error.message);
    } catch (_) {
      _showCompletionError('Nao foi possivel salvar seu progresso.');
    }
  }

  void _showCompletionError(String message) {
    if (!mounted) return;

    setState(() {
      _isCompleting = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        action: SnackBarAction(
          label: 'Tentar de novo',
          onPressed: _completeAndPop,
        ),
      ),
    );
  }

  void _closeWithoutCompletion() {
    if (!_isCompleting) {
      Navigator.of(context).pop(false);
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
          onPressed: _closeWithoutCompletion,
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
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 32,
                ),
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
                  _LessonTheoryView(
                    content: widget.lesson.content!,
                  ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
                  const SizedBox(height: 48),
                  Center(
                    child: FilledButton.icon(
                      onPressed: () {
                        if (_isCompleting) return;

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
                      icon: Icon(
                        _isCompleting
                            ? Icons.hourglass_top
                            : _viewModel.questionCount == 0
                            ? Icons.check_circle
                            : Icons.arrow_forward,
                      ),
                      label: Text(
                        _isCompleting
                            ? 'Salvando progresso...'
                            : _viewModel.questionCount == 0
                            ? 'Concluir Lição'
                            : 'Começar Exercícios',
                        style: const TextStyle(fontSize: 18),
                      ),
                    ).animate().fadeIn(delay: 400.ms).scale(),
                  ),
                ],
              ),
            );
          }

          if (_viewModel.isFinished) {
            return ResponsiveContent(
              maxWidth: 760,
              child: _LessonResultView(
                viewModel: _viewModel,
                onComplete: _completeAndPop,
                isCompleting: _isCompleting,
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
                    onPressed: _isCompleting ? null : _completeAndPop,
                    child: Text(
                      _isCompleting
                          ? 'Salvando progresso...'
                          : 'Concluir licao',
                    ),
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

class _LessonResultView extends StatelessWidget {
  const _LessonResultView({
    required this.viewModel,
    required this.onComplete,
    required this.isCompleting,
  });

  final ExerciseViewModel viewModel;
  final Future<void> Function() onComplete;
  final bool isCompleting;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final passed = viewModel.hasPassed;
    final percent = (viewModel.accuracy * 100).round();

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      children: [
        Icon(
          passed ? Icons.verified_rounded : Icons.replay_circle_filled_rounded,
          size: 80,
          color: passed ? Colors.greenAccent : Colors.orangeAccent,
        ).animate().scale(curve: Curves.easeOutBack),
        const SizedBox(height: 20),
        Text(
          passed ? 'Lição dominada' : 'Vamos reforçar',
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w900,
            color: passed ? Colors.greenAccent : Colors.orangeAccent,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          '$percent% de acerto',
          textAlign: TextAlign.center,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '${viewModel.correctAnswers} de ${viewModel.questionCount} exercícios corretos',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 28),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: viewModel.accuracy,
            minHeight: 12,
            backgroundColor: theme.colorScheme.surfaceVariant,
            valueColor: AlwaysStoppedAnimation<Color>(
              passed ? Colors.greenAccent : Colors.orangeAccent,
            ),
          ),
        ),
        const SizedBox(height: 28),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceVariant.withOpacity(0.35),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: theme.colorScheme.surfaceVariant),
          ),
          child: Text(
            passed
                ? 'Você atingiu a meta mínima de 80%. A lição será concluída e a próxima etapa será desbloqueada.'
                : 'A meta mínima é 80%. Revise o feedback das questões e tente de novo para ganhar XP e desbloquear a próxima aula.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyLarge?.copyWith(height: 1.45),
          ),
        ),
        const SizedBox(height: 32),
        if (passed)
          FilledButton.icon(
            onPressed: isCompleting ? null : onComplete,
            icon: Icon(isCompleting ? Icons.hourglass_top : Icons.check_circle),
            label: Text(
              isCompleting ? 'Salvando progresso...' : 'Concluir e ganhar XP',
            ),
          )
        else
          FilledButton.icon(
            onPressed: viewModel.retry,
            icon: const Icon(Icons.refresh),
            label: const Text('Refazer exercícios'),
          ),
        const SizedBox(height: 12),
        if (!passed)
          OutlinedButton.icon(
            onPressed: isCompleting
                ? null
                : () => Navigator.of(context).pop(false),
            icon: const Icon(Icons.close),
            label: const Text('Sair sem concluir'),
          ),
      ],
    );
  }
}

class _LessonTheoryView extends StatelessWidget {
  const _LessonTheoryView({required this.content});

  final String content;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lines = content
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();

    final widgets = <Widget>[];

    for (final line in lines) {
      if (line.startsWith('## ')) {
        widgets.add(
          Padding(
            padding: EdgeInsets.only(top: widgets.isEmpty ? 0 : 20, bottom: 8),
            child: Text(
              line.substring(3),
              style: theme.textTheme.titleLarge?.copyWith(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        );
        continue;
      }

      if (line.startsWith('- ')) {
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.check_circle,
                  color: theme.colorScheme.secondary,
                  size: 18,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    line.substring(2),
                    style: theme.textTheme.bodyLarge?.copyWith(height: 1.45),
                  ),
                ),
              ],
            ),
          ),
        );
        continue;
      }

      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Text(
            line,
            style: theme.textTheme.bodyLarge?.copyWith(height: 1.55),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceVariant.withOpacity(0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.surfaceVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: widgets,
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
        return HarmonicFieldBuilderWidget(
          exercise: exercise,
          viewModel: viewModel,
        );
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
          if (viewModel.current?.payload['feedback'] case final String feedback)
            Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: Text(
                feedback,
                style: theme.textTheme.bodyLarge?.copyWith(height: 1.45),
              ),
            ),
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
            if (result.leveledUp) ...[
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
                      child: Text('⬆', style: TextStyle(fontSize: 48)),
                    ),
                  )
                  .animate()
                  .scale(duration: 600.ms, curve: Curves.easeOutBack)
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
            if (result.newAchievements.isNotEmpty) ...[
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
                                color: theme.colorScheme.primary.withOpacity(
                                  0.2,
                                ),
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
