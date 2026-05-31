import 'package:flutter/material.dart';

import '../../../core/responsive_content.dart';
import '../view_models/exercise_view_model.dart';

class ExerciseScreen extends StatefulWidget {
  const ExerciseScreen({super.key});

  @override
  State<ExerciseScreen> createState() => _ExerciseScreenState();
}

class _ExerciseScreenState extends State<ExerciseScreen> {
  late final ExerciseViewModel _viewModel;

  @override
  void initState() {
    super.initState();
    _viewModel = ExerciseViewModel();
  }

  @override
  void dispose() {
    _viewModel.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _viewModel,
      builder: (context, _) {
        return ResponsiveContent(
          child: _ExerciseContent(viewModel: _viewModel),
        );
      },
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
                'Pratica',
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
              icon: const Icon(Icons.arrow_forward),
              label: const Text('Proxima nota'),
            ),
          ],
        ),
      ),
    );
  }
}
