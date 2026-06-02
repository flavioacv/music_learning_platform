import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../../domain/models/course_models.dart';
import '../../view_models/exercise_view_model.dart';

class RhythmTapWidget extends StatefulWidget {
  const RhythmTapWidget({
    super.key,
    required this.exercise,
    required this.viewModel,
  });

  final Exercise exercise;
  final ExerciseViewModel viewModel;

  @override
  State<RhythmTapWidget> createState() => _RhythmTapWidgetState();
}

class _RhythmTapWidgetState extends State<RhythmTapWidget> {
  late final int _bpm;
  late final List<int> _pattern;
  late List<bool> _selected;

  @override
  void initState() {
    super.initState();
    _bpm = widget.exercise.payload['bpm'] as int;
    _pattern = List<int>.from(widget.exercise.payload['pattern'] ?? []);
    _selected = List.filled(_pattern.length, false);
  }

  void _toggleStep(int index) {
    if (widget.viewModel.hasAnswered) return;

    setState(() {
      _selected[index] = !_selected[index];
    });
  }

  void _clear() {
    if (widget.viewModel.hasAnswered) return;

    setState(() {
      _selected = List.filled(_pattern.length, false);
    });
  }

  void _submit() {
    if (widget.viewModel.hasAnswered) return;

    final expectedIndexes = <int>[];
    for (var index = 0; index < _pattern.length; index++) {
      if (_pattern[index] == 1) expectedIndexes.add(index);
    }

    final selectedExpected = expectedIndexes
        .where((index) => _selected[index])
        .length;
    final extraTaps = _selected.asMap().entries.where((entry) {
      return entry.value && _pattern[entry.key] != 1;
    }).length;

    final expectedCount = expectedIndexes.length;
    final enoughCorrect =
        expectedCount == 0 || selectedExpected >= (expectedCount * 0.8).ceil();
    final fewExtras = extraTaps <= 1;

    widget.viewModel.submitAnswer(enoughCorrect && fewExtras);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 36),
        Text(
          widget.exercise.prompt,
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ).animate().fadeIn().slideY(begin: -0.1),
        const SizedBox(height: 12),
        Text(
          'BPM: $_bpm',
          textAlign: TextAlign.center,
          style: theme.textTheme.titleMedium?.copyWith(
            color: theme.colorScheme.primary,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 18),
        Text(
          'Marque as partes do compasso onde o som deve acontecer.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 32),
        _RhythmGrid(
          pattern: _pattern,
          selected: _selected,
          hasAnswered: widget.viewModel.hasAnswered,
          onToggle: _toggleStep,
        ),
        const SizedBox(height: 28),
        if (!widget.viewModel.hasAnswered)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              OutlinedButton.icon(
                onPressed: _clear,
                icon: const Icon(Icons.refresh),
                label: const Text('Limpar'),
              ),
              const SizedBox(width: 12),
              FilledButton.icon(
                onPressed: _selected.any((item) => item) ? _submit : null,
                icon: const Icon(Icons.check),
                label: const Text('Conferir padrão'),
              ),
            ],
          ),
        if (widget.viewModel.hasAnswered && !widget.viewModel.isCorrect)
          Padding(
            padding: const EdgeInsets.only(top: 24),
            child: Center(
              child: Text(
                'Quase. Compare os tempos destacados e tente ouvir o pulso antes de marcar.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.orangeAccent,
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

class _RhythmGrid extends StatelessWidget {
  const _RhythmGrid({
    required this.pattern,
    required this.selected,
    required this.hasAnswered,
    required this.onToggle,
  });

  final List<int> pattern;
  final List<bool> selected;
  final bool hasAnswered;
  final ValueChanged<int> onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final labels = _labelsFor(pattern.length);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: pattern.length >= 16 ? 8 : 4,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.25,
          ),
          itemCount: pattern.length,
          itemBuilder: (context, index) {
            final isExpected = pattern[index] == 1;
            final isSelected = selected[index];
            final isCorrectSelection = hasAnswered && isExpected && isSelected;
            final isMissing = hasAnswered && isExpected && !isSelected;
            final isExtra = hasAnswered && !isExpected && isSelected;

            final color = isCorrectSelection
                ? Colors.greenAccent
                : isMissing
                ? Colors.orangeAccent
                : isExtra
                ? Colors.redAccent
                : isSelected
                ? theme.colorScheme.primary
                : theme.colorScheme.surfaceVariant;

            final foreground =
                isSelected || isCorrectSelection || isMissing || isExtra
                ? Colors.black
                : theme.colorScheme.onSurface;

            return FilledButton(
              onPressed: hasAnswered ? null : () => onToggle(index),
              style: FilledButton.styleFrom(
                backgroundColor: color,
                disabledBackgroundColor: color,
                foregroundColor: foreground,
                disabledForegroundColor: foreground,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                padding: EdgeInsets.zero,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    labels[index],
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Icon(isSelected ? Icons.music_note : Icons.remove, size: 18),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  List<String> _labelsFor(int length) {
    if (length == 16) {
      return const [
        '1',
        'e',
        '&',
        'a',
        '2',
        'e',
        '&',
        'a',
        '3',
        'e',
        '&',
        'a',
        '4',
        'e',
        '&',
        'a',
      ];
    }

    return List.generate(length, (index) => '${index + 1}');
  }
}
