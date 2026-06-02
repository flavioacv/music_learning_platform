import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../../domain/models/course_models.dart';
import '../../view_models/exercise_view_model.dart';

class ChordBuilderWidget extends StatefulWidget {
  const ChordBuilderWidget({
    super.key,
    required this.exercise,
    required this.viewModel,
  });

  final Exercise exercise;
  final ExerciseViewModel viewModel;

  @override
  State<ChordBuilderWidget> createState() => _ChordBuilderWidgetState();
}

class _ChordBuilderWidgetState extends State<ChordBuilderWidget> {
  final List<String> _allNotes = [
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
  ];
  
  List<String> _userNotes = [];
  late List<String> _expectedNotes;

  @override
  void initState() {
    super.initState();
    final answerStr = widget.exercise.payload['answer'] as String;
    _expectedNotes = answerStr.split(' ').where((n) => n.isNotEmpty).toList();
  }

  void _addNote(String note) {
    if (widget.viewModel.hasAnswered) return;
    if (_userNotes.length < _expectedNotes.length) {
      setState(() {
        _userNotes.add(note);
      });
    }
  }

  void _removeNote(int index) {
    if (widget.viewModel.hasAnswered) return;
    setState(() {
      _userNotes.removeAt(index);
    });
  }

  void _checkAnswer() {
    if (widget.viewModel.hasAnswered) return;
    if (_userNotes.length < _expectedNotes.length) return;

    bool isCorrect = true;
    for (int i = 0; i < _expectedNotes.length; i++) {
      if (_userNotes[i] != _expectedNotes[i]) {
        isCorrect = false;
        break;
      }
    }
    
    widget.viewModel.submitAnswer(isCorrect);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
          'Monte o acorde selecionando as notas na ordem correta',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 32),
        
        // Slots for the chord notes
        Wrap(
          spacing: 16,
          runSpacing: 16,
          alignment: WrapAlignment.center,
          children: List.generate(_expectedNotes.length, (index) {
            final hasNote = index < _userNotes.length;
            final note = hasNote ? _userNotes[index] : '';
            
            Color bgColor = theme.colorScheme.surfaceVariant.withOpacity(0.5);
            Color borderColor = theme.colorScheme.surfaceVariant;
            
            if (widget.viewModel.hasAnswered) {
               final isCorrectSlot = hasNote && _userNotes[index] == _expectedNotes[index];
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
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: borderColor, width: 2),
                ),
                alignment: Alignment.center,
                child: Text(
                  note,
                  style: theme.textTheme.headlineSmall?.copyWith(
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
              onPressed: _userNotes.length == _expectedNotes.length ? _checkAnswer : null,
              style: FilledButton.styleFrom(
                minimumSize: const Size(200, 56),
              ),
              child: const Text('Verificar Acorde', style: TextStyle(fontSize: 18)),
            ),
          ),
          
        if (widget.viewModel.hasAnswered && !widget.viewModel.isCorrect)
           Padding(
             padding: const EdgeInsets.only(top: 24.0),
             child: Center(
               child: Text(
                 'O acorde correto era: ${_expectedNotes.join(" ")}',
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
