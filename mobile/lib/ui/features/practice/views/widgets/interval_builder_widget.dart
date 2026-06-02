import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../../domain/models/course_models.dart';
import '../../view_models/exercise_view_model.dart';

class IntervalBuilderWidget extends StatefulWidget {
  const IntervalBuilderWidget({
    super.key,
    required this.exercise,
    required this.viewModel,
  });

  final Exercise exercise;
  final ExerciseViewModel viewModel;

  @override
  State<IntervalBuilderWidget> createState() => _IntervalBuilderWidgetState();
}

class _IntervalBuilderWidgetState extends State<IntervalBuilderWidget> {
  final List<String> _allNotes = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
  ];
  
  String? _selectedNote;

  void _selectNote(String note) {
    if (widget.viewModel.hasAnswered) return;
    setState(() {
      _selectedNote = note;
    });
    
    final correctAnswer = widget.exercise.payload['answer'] as String;
    final isCorrect = note == correctAnswer;
    widget.viewModel.submitAnswer(isCorrect);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final correctAnswer = widget.exercise.payload['answer'] as String;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 32),
        Text(
          widget.exercise.prompt,
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ).animate().fadeIn().slideY(begin: -0.1),
        const SizedBox(height: 48),
        
        Wrap(
          spacing: 12,
          runSpacing: 16,
          alignment: WrapAlignment.center,
          children: _allNotes.map((note) {
            final isSelected = _selectedNote == note;
            final isCorrect = widget.viewModel.hasAnswered && note == correctAnswer;
            final isWrong = widget.viewModel.hasAnswered && isSelected && note != correctAnswer;

            Color bgColor = theme.colorScheme.surface;
            Color borderColor = theme.colorScheme.outlineVariant;
            Color textColor = theme.colorScheme.onSurface;

            if (isCorrect) {
              bgColor = Colors.greenAccent.withOpacity(0.2);
              borderColor = Colors.greenAccent;
              textColor = Colors.greenAccent;
            } else if (isWrong) {
              bgColor = Colors.redAccent.withOpacity(0.2);
              borderColor = Colors.redAccent;
              textColor = Colors.redAccent;
            } else if (isSelected) {
              bgColor = theme.colorScheme.primary.withOpacity(0.2);
              borderColor = theme.colorScheme.primary;
              textColor = theme.colorScheme.primary;
            }

            Widget button = GestureDetector(
              onTap: () => _selectNote(note),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 2),
                  boxShadow: isCorrect || isWrong ? [
                    BoxShadow(
                      color: (isCorrect ? Colors.greenAccent : Colors.redAccent).withOpacity(0.4),
                      blurRadius: 12,
                    )
                  ] : [],
                ),
                alignment: Alignment.center,
                child: Text(
                  note,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ),
            );

            if (isWrong) {
              button = button.animate().shakeX();
            }

            return MouseRegion(
              cursor: widget.viewModel.hasAnswered ? SystemMouseCursors.basic : SystemMouseCursors.click,
              child: button,
            );
          }).toList(),
        ).animate().fadeIn(),
        
        if (widget.viewModel.hasAnswered && !widget.viewModel.isCorrect)
           Padding(
             padding: const EdgeInsets.only(top: 32.0),
             child: Center(
               child: Text(
                 'A nota correta era: $correctAnswer',
                 style: const TextStyle(
                   color: Colors.redAccent,
                   fontWeight: FontWeight.bold,
                   fontSize: 18,
                 ),
               ).animate().fadeIn(),
             ),
           ),
      ],
    );
  }
}
