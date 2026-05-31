import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

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
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pratica'),
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

          if (_viewModel.questionCount == 0) {
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
                'Questao ${viewModel.questionIndex + 1} de ${viewModel.questionCount}',
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
        const SizedBox(height: 48),
        Text(
          'Identifique a cifra americana correspondente',
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ).animate().fadeIn().slideY(begin: -0.1),
        const SizedBox(height: 48),
        Center(
          child: Container(
            key: ValueKey(viewModel.current.latin),
            width: 200,
            height: 200,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  theme.colorScheme.primary.withOpacity(0.2),
                  theme.colorScheme.background,
                ],
                radius: 0.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: theme.colorScheme.primary.withOpacity(0.1),
                  blurRadius: 40,
                  spreadRadius: 10,
                ),
              ],
            ),
            child: Center(
              child: Text(
                viewModel.current.latin,
                style: theme.textTheme.displayLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  fontSize: 72,
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
          ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
        ),
        const SizedBox(height: 64),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 600 ? 4 : 2;
            final itemWidth =
                (constraints.maxWidth - (16 * (columns - 1))) / columns;

            return Wrap(
              key: ValueKey(viewModel.questionIndex),
              spacing: 16,
              runSpacing: 16,
              children: viewModel.answers.asMap().entries.map((entry) {
                final index = entry.key;
                final answer = entry.value;
                return SizedBox(
                  width: itemWidth,
                  height: 80,
                  child: _AnswerButton(
                    viewModel: viewModel,
                    answer: answer,
                  ).animate().fadeIn(delay: (100 * index).ms).scale(),
                );
              }).toList(),
            );
          },
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

class _AnswerButton extends StatefulWidget {
  const _AnswerButton({required this.viewModel, required this.answer});

  final ExerciseViewModel viewModel;
  final String answer;

  @override
  State<_AnswerButton> createState() => _AnswerButtonState();
}

class _AnswerButtonState extends State<_AnswerButton> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final wasSelected = widget.viewModel.selectedAnswer == widget.answer;
    final shouldShowCorrect =
        widget.viewModel.hasAnswered &&
        widget.answer == widget.viewModel.current.american;
    final isWrong = wasSelected && !shouldShowCorrect;

    Color backgroundColor = theme.colorScheme.surface;
    Color borderColor = theme.colorScheme.surfaceVariant;
    Color textColor = theme.colorScheme.onSurface;

    if (shouldShowCorrect) {
      backgroundColor = Colors.greenAccent.withOpacity(0.2);
      borderColor = Colors.greenAccent;
      textColor = Colors.greenAccent;
    } else if (isWrong) {
      backgroundColor = Colors.redAccent.withOpacity(0.2);
      borderColor = Colors.redAccent;
      textColor = Colors.redAccent;
    } else if (_isHovering && !widget.viewModel.hasAnswered) {
      borderColor = theme.colorScheme.primary;
      backgroundColor = theme.colorScheme.primary.withOpacity(0.05);
    }

    Widget button = MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      cursor: widget.viewModel.hasAnswered
          ? SystemMouseCursors.basic
          : SystemMouseCursors.click,
      child: GestureDetector(
        onTap: () => widget.viewModel.answer(widget.answer),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor, width: 2),
            boxShadow: shouldShowCorrect
                ? [
                    BoxShadow(
                      color: Colors.greenAccent.withOpacity(0.4),
                      blurRadius: 20,
                    ),
                  ]
                : isWrong
                ? [
                    BoxShadow(
                      color: Colors.redAccent.withOpacity(0.4),
                      blurRadius: 20,
                    ),
                  ]
                : _isHovering
                ? [
                    BoxShadow(
                      color: theme.colorScheme.primary.withOpacity(0.2),
                      blurRadius: 10,
                    ),
                  ]
                : [],
          ),
          alignment: Alignment.center,
          child: Text(
            widget.answer,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
              color: textColor,
            ),
          ),
        ),
      ),
    );

    if (isWrong) {
      button = button
          .animate(onPlay: (controller) => controller.forward(from: 0))
          .shakeX(amount: 10);
    }
    if (shouldShowCorrect && wasSelected) {
      button = button
          .animate(onPlay: (controller) => controller.forward(from: 0))
          .scale(begin: const Offset(1, 1), end: const Offset(1.05, 1.05))
          .then()
          .scale(begin: const Offset(1.05, 1.05), end: const Offset(1, 1));
    }

    return button;
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
                      viewModel.isCorrect ? 'Excelente!' : 'Quase la...',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: viewModel.isCorrect
                            ? Colors.greenAccent
                            : Colors.orangeAccent,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${viewModel.current.latin} corresponde a ${viewModel.current.american}.',
                      style: theme.textTheme.bodyLarge,
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
            label: Text(isLast ? 'Finalizar Licao' : 'Proxima Nota'),
          ),
        ],
      ),
    );
  }
}
