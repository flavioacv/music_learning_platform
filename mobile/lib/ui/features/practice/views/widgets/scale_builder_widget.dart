import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../../domain/models/course_models.dart';
import '../../view_models/exercise_view_model.dart';

class ScaleBuilderWidget extends StatefulWidget {
  const ScaleBuilderWidget({
    super.key,
    required this.exercise,
    required this.viewModel,
  });

  final Exercise exercise;
  final ExerciseViewModel viewModel;

  @override
  State<ScaleBuilderWidget> createState() => _ScaleBuilderWidgetState();
}

class _ScaleBuilderWidgetState extends State<ScaleBuilderWidget> {
  final List<String> _allNotes = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
  ];
  
  List<String> _userScale = [];
  late List<String> _expectedScale;

  @override
  void initState() {
    super.initState();
    _expectedScale = List<String>.from(widget.exercise.payload['expectedScale'] ?? []);
  }

  void _addNote(String note) {
    if (widget.viewModel.hasAnswered) return;
    if (_userScale.length < _expectedScale.length) {
      setState(() {
        _userScale.add(note);
      });
    }
  }

  void _removeNote(int index) {
    if (widget.viewModel.hasAnswered) return;
    setState(() {
      _userScale.removeAt(index);
    });
  }

  void _checkAnswer() {
    if (widget.viewModel.hasAnswered) return;
    if (_userScale.length < _expectedScale.length) return;

    bool isCorrect = true;
    for (int i = 0; i < _expectedScale.length; i++) {
      if (_userScale[i] != _expectedScale[i]) {
        isCorrect = false;
        break;
      }
    }
    
    widget.viewModel.submitAnswer(isCorrect);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final rootNote = widget.exercise.payload['rootNote'] as String;

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
        const SizedBox(height: 8),
        Text(
          'Toque nas notas para montar a escala',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 32),
        
        // Slots for the scale
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: List.generate(_expectedScale.length, (index) {
            final hasNote = index < _userScale.length;
            final note = hasNote ? _userScale[index] : '';
            
            Color bgColor = theme.colorScheme.surfaceVariant.withOpacity(0.5);
            Color borderColor = theme.colorScheme.surfaceVariant;
            
            if (widget.viewModel.hasAnswered) {
               final isCorrectSlot = hasNote && _userScale[index] == _expectedScale[index];
               if (isCorrectSlot) {
                 bgColor = Colors.greenAccent.withOpacity(0.2);
                 borderColor = Colors.greenAccent;
               } else {
                 bgColor = Colors.redAccent.withOpacity(0.2);
                 borderColor = Colors.redAccent;
               }
            } else if (hasNote) {
               bgColor = theme.colorScheme.primary.withOpacity(0.2);
               borderColor = theme.colorScheme.primary;
            }

            return GestureDetector(
              onTap: () => hasNote ? _removeNote(index) : null,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 2),
                ),
                alignment: Alignment.center,
                child: Text(
                  note,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: hasNote ? theme.colorScheme.onSurface : theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            );
          }),
        ).animate().fadeIn(),
        
        const SizedBox(height: 48),
        
        // Available Notes Grid
        if (!widget.viewModel.hasAnswered)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: _allNotes.map((note) {
              return ActionChip(
                label: Text(note, style: const TextStyle(fontWeight: FontWeight.bold)),
                backgroundColor: theme.colorScheme.surface,
                side: BorderSide(color: theme.colorScheme.outlineVariant),
                onPressed: () => _addNote(note),
              );
            }).toList(),
          ).animate().fadeIn().slideY(begin: 0.2),

        const SizedBox(height: 32),
        if (!widget.viewModel.hasAnswered)
          Center(
            child: FilledButton(
              onPressed: _userScale.length == _expectedScale.length ? _checkAnswer : null,
              style: FilledButton.styleFrom(
                minimumSize: const Size(200, 56),
              ),
              child: const Text('Verificar Escala', style: TextStyle(fontSize: 18)),
            ),
          ),
          
        if (widget.viewModel.hasAnswered && !widget.viewModel.isCorrect)
           Padding(
             padding: const EdgeInsets.only(top: 24.0),
             child: Center(
               child: Text(
                 'A escala correta era: ${_expectedScale.join(" - ")}',
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
