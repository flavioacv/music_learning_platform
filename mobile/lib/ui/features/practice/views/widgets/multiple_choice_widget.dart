import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../../domain/models/course_models.dart';
import '../../view_models/exercise_view_model.dart';

class MultipleChoiceWidget extends StatefulWidget {
  const MultipleChoiceWidget({
    super.key,
    required this.exercise,
    required this.viewModel,
  });

  final Exercise exercise;
  final ExerciseViewModel viewModel;

  @override
  State<MultipleChoiceWidget> createState() => _MultipleChoiceWidgetState();
}

class _MultipleChoiceWidgetState extends State<MultipleChoiceWidget> {
  String? _selectedOption;

  void _handleSelect(String option) {
    if (widget.viewModel.hasAnswered) return;
    setState(() {
      _selectedOption = option;
    });
    
    final correctAnswer = widget.exercise.payload['correctAnswer'] as String;
    final isCorrect = option == correctAnswer;
    widget.viewModel.submitAnswer(isCorrect);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final options = List<String>.from(widget.exercise.payload['options'] ?? []);
    final correctAnswer = widget.exercise.payload['correctAnswer'] as String;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 48),
        Text(
          widget.exercise.prompt,
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ).animate().fadeIn().slideY(begin: -0.1),
        const SizedBox(height: 64),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 600 ? 2 : 1;
            final spacing = 16.0;
            final itemWidth = (constraints.maxWidth - (spacing * (columns - 1))) / columns;

            return Wrap(
              key: ValueKey(widget.exercise.id),
              spacing: spacing,
              runSpacing: spacing,
              children: options.asMap().entries.map((entry) {
                final index = entry.key;
                final option = entry.value;
                final wasSelected = _selectedOption == option;
                
                final shouldShowCorrect = widget.viewModel.hasAnswered && option == correctAnswer;
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
                }

                Widget button = GestureDetector(
                  onTap: () => _handleSelect(option),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: itemWidth,
                    height: 80,
                    decoration: BoxDecoration(
                      color: backgroundColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: borderColor, width: 2),
                      boxShadow: shouldShowCorrect
                          ? [BoxShadow(color: Colors.greenAccent.withOpacity(0.4), blurRadius: 20)]
                          : isWrong
                              ? [BoxShadow(color: Colors.redAccent.withOpacity(0.4), blurRadius: 20)]
                              : [],
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      option,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: textColor,
                      ),
                    ),
                  ),
                );

                if (isWrong) {
                  button = button.animate(onPlay: (c) => c.forward(from: 0)).shakeX(amount: 10);
                }
                if (shouldShowCorrect && wasSelected) {
                  button = button.animate(onPlay: (c) => c.forward(from: 0)).scale(begin: const Offset(1, 1), end: const Offset(1.05, 1.05)).then().scale(begin: const Offset(1.05, 1.05), end: const Offset(1, 1));
                }

                return MouseRegion(
                  cursor: widget.viewModel.hasAnswered ? SystemMouseCursors.basic : SystemMouseCursors.click,
                  child: button.animate().fadeIn(delay: (100 * index).ms).scale(),
                );
              }).toList(),
            );
          },
        ),
      ],
    );
  }
}
