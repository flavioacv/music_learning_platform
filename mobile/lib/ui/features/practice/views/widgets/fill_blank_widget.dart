import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../../domain/models/course_models.dart';
import '../../view_models/exercise_view_model.dart';

class FillBlankWidget extends StatefulWidget {
  const FillBlankWidget({
    super.key,
    required this.exercise,
    required this.viewModel,
  });

  final Exercise exercise;
  final ExerciseViewModel viewModel;

  @override
  State<FillBlankWidget> createState() => _FillBlankWidgetState();
}

class _FillBlankWidgetState extends State<FillBlankWidget> {
  final _controller = TextEditingController();

  void _handleSubmit() {
    if (widget.viewModel.hasAnswered) return;
    final answer = _controller.text.trim();
    if (answer.isEmpty) return;

    final correctAnswer = widget.exercise.payload['answer'] as String;
    final isCorrect = answer.toLowerCase() == correctAnswer.toLowerCase();
    widget.viewModel.submitAnswer(isCorrect);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sentence = widget.exercise.payload['sentence'] as String;
    final correctAnswer = widget.exercise.payload['answer'] as String;
    
    // Split sentence by '_____'
    final parts = sentence.split('_____');
    
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
        Center(
          child: Wrap(
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 16,
            children: [
              if (parts.isNotEmpty)
                Text(
                  parts[0],
                  style: theme.textTheme.titleLarge,
                ),
              SizedBox(
                width: 120,
                child: TextField(
                  controller: _controller,
                  enabled: !widget.viewModel.hasAnswered,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: theme.colorScheme.surfaceVariant.withOpacity(0.5),
                  ),
                  onSubmitted: (_) => _handleSubmit(),
                ),
              ),
              if (parts.length > 1)
                Text(
                  parts[1],
                  style: theme.textTheme.titleLarge,
                ),
            ],
          ).animate().fadeIn().scale(),
        ),
        const SizedBox(height: 48),
        if (!widget.viewModel.hasAnswered)
          Center(
            child: FilledButton(
              onPressed: _handleSubmit,
              style: FilledButton.styleFrom(
                minimumSize: const Size(200, 56),
              ),
              child: const Text('Responder', style: TextStyle(fontSize: 18)),
            ),
          ),
        if (widget.viewModel.hasAnswered && !widget.viewModel.isCorrect)
           Padding(
             padding: const EdgeInsets.only(top: 24.0),
             child: Center(
               child: Text(
                 'A resposta correta era: $correctAnswer',
                 style: TextStyle(
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
