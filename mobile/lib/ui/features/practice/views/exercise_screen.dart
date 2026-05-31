import 'package:flutter/material.dart';

import '../../../../data/repositories/learning_repository.dart';
import '../../../core/responsive_content.dart';
import '../view_models/exercise_view_model.dart';

class ExerciseScreen extends StatefulWidget {
  const ExerciseScreen({
    super.key,
    required this.lessonId,
    required this.repository,
  });

  final String lessonId;
  final LearningRepository repository;

  @override
  State<ExerciseScreen> createState() => _ExerciseScreenState();
}

class _ExerciseScreenState extends State<ExerciseScreen> {
  late final ExerciseViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = ExerciseViewModel(widget.repository, widget.lessonId);
    _viewModel.addListener(_onViewModelChange);
  }

  void _onViewModelChange() {
    if (_viewModel.isFinished) {
      _viewModel.removeListener(_onViewModelChange);
      _completeAndPop();
    }
  }

  Future<void> _completeAndPop() async {
    // Show a loading overlay or just complete
    try {
      await widget.repository.completeLesson(widget.lessonId);
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
    return Scaffold(
      appBar: AppBar(title: const Text('Pratica')),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          if (_viewModel.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (_viewModel.error != null) {
            return Center(child: Text('Erro: ${_viewModel.error}'));
          }

          if (_viewModel.questionCount == 0) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Nenhum exercicio para esta licao.'),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _completeAndPop,
                    child: const Text('Concluir licao'),
                  ),
                ],
              ),
            );
          }

          return ResponsiveContent(
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Identifique a nota',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Chip(
              avatar: const Icon(Icons.bolt, size: 18),
              label: Text('${viewModel.score} XP'),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text('Identifique a cifra americana da nota apresentada.'),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text('Nota', style: theme.textTheme.labelLarge),
                const SizedBox(height: 8),
                Text(
                  viewModel.current.latin,
                  style: theme.textTheme.displayLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Questao ${viewModel.questionIndex + 1} '
                  'de ${viewModel.questionCount}',
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 560 ? 4 : 2;
            final itemWidth =
                (constraints.maxWidth - (12 * (columns - 1))) / columns;

            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: viewModel.answers.map((answer) {
                return SizedBox(
                  width: itemWidth,
                  height: 56,
                  child: _AnswerButton(viewModel: viewModel, answer: answer),
                );
              }).toList(),
            );
          },
        ),
        const SizedBox(height: 20),
        if (viewModel.hasAnswered) _FeedbackCard(viewModel: viewModel),
      ],
    );
  }
}

class _AnswerButton extends StatelessWidget {
  const _AnswerButton({required this.viewModel, required this.answer});

  final ExerciseViewModel viewModel;
  final String answer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final wasSelected = viewModel.selectedAnswer == answer;
    final shouldShowCorrect =
        viewModel.hasAnswered && answer == viewModel.current.american;

    return OutlinedButton(
      onPressed: () => viewModel.answer(answer),
      style: OutlinedButton.styleFrom(
        backgroundColor: shouldShowCorrect
            ? Colors.green.shade50
            : wasSelected
            ? Colors.red.shade50
            : null,
        side: BorderSide(
          color: shouldShowCorrect
              ? Colors.green
              : wasSelected
              ? Colors.red
              : theme.colorScheme.outline,
        ),
      ),
      child: Text(
        answer,
        style: theme.textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _FeedbackCard extends StatelessWidget {
  const _FeedbackCard({required this.viewModel});

  final ExerciseViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  viewModel.isCorrect ? Icons.check_circle : Icons.info,
                  color: viewModel.isCorrect ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 8),
                Text(
                  viewModel.isCorrect ? 'Resposta correta' : 'Quase la',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${viewModel.current.latin} corresponde a '
              '${viewModel.current.american}.',
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: viewModel.next,
              icon: Icon(
                viewModel.questionIndex + 1 == viewModel.questionCount
                    ? Icons.check
                    : Icons.arrow_forward,
              ),
              label: Text(
                viewModel.questionIndex + 1 == viewModel.questionCount
                    ? 'Finalizar'
                    : 'Proxima nota',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
