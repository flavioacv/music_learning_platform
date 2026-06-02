import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../../domain/models/course_models.dart';
import '../../view_models/exercise_view_model.dart';

class HarmonicFieldBuilderWidget extends StatefulWidget {
  const HarmonicFieldBuilderWidget({
    super.key,
    required this.exercise,
    required this.viewModel,
  });

  final Exercise exercise;
  final ExerciseViewModel viewModel;

  @override
  State<HarmonicFieldBuilderWidget> createState() => _HarmonicFieldBuilderWidgetState();
}

class _HarmonicFieldBuilderWidgetState extends State<HarmonicFieldBuilderWidget> {
  final List<String> _distractors = ['C', 'Cm', 'D', 'Dm', 'E', 'Em', 'F', 'Fm', 'G', 'Gm', 'A', 'Am', 'B', 'Bm', 'Bdim', 'Cdim', 'F#m', 'C#m', 'G#m', 'Ddim'];
  
  List<String> _userChords = [];
  late List<String> _expectedChords;
  late List<String> _availableChords;

  @override
  void initState() {
    super.initState();
    final answerList = List<String>.from(widget.exercise.payload['answer'] ?? []);
    _expectedChords = answerList;
    
    // Generate available options: actual answers + some distractors
    Set<String> optionsSet = Set.from(_expectedChords);
    _distractors.shuffle();
    for (String d in _distractors) {
      optionsSet.add(d);
      if (optionsSet.length >= 14) break; // Limit options to 14
    }
    
    _availableChords = optionsSet.toList();
    _availableChords.shuffle();
  }

  void _addChord(String chord) {
    if (widget.viewModel.hasAnswered) return;
    if (_userChords.length < _expectedChords.length) {
      setState(() {
        _userChords.add(chord);
      });
    }
  }

  void _removeChord(int index) {
    if (widget.viewModel.hasAnswered) return;
    setState(() {
      _userChords.removeAt(index);
    });
  }

  void _checkAnswer() {
    if (widget.viewModel.hasAnswered) return;
    if (_userChords.length < _expectedChords.length) return;

    bool isCorrect = true;
    for (int i = 0; i < _expectedChords.length; i++) {
      if (_userChords[i] != _expectedChords[i]) {
        isCorrect = false;
        break;
      }
    }
    
    widget.viewModel.submitAnswer(isCorrect);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final keyName = widget.exercise.payload['key'] as String;

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
          'Monte os 7 graus na ordem correta',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 32),
        
        // Slots for the chords
        Wrap(
          spacing: 8,
          runSpacing: 16,
          alignment: WrapAlignment.center,
          children: List.generate(_expectedChords.length, (index) {
            final hasChord = index < _userChords.length;
            final chord = hasChord ? _userChords[index] : '';
            final degreeRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][index];
            
            Color bgColor = theme.colorScheme.surfaceVariant.withOpacity(0.5);
            Color borderColor = theme.colorScheme.surfaceVariant;
            
            if (widget.viewModel.hasAnswered) {
               final isCorrectSlot = hasChord && _userChords[index] == _expectedChords[index];
               if (isCorrectSlot) {
                 bgColor = Colors.greenAccent.withOpacity(0.2);
                 borderColor = Colors.greenAccent;
               } else {
                 bgColor = Colors.redAccent.withOpacity(0.2);
                 borderColor = Colors.redAccent;
               }
            } else if (hasChord) {
               bgColor = theme.colorScheme.primary.withOpacity(0.2);
               borderColor = theme.colorScheme.primary;
            }

            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(degreeRoman, style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.primary)),
                const SizedBox(height: 4),
                GestureDetector(
                  onTap: () => hasChord ? _removeChord(index) : null,
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
                      chord,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: hasChord ? theme.colorScheme.onSurface : theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
              ],
            );
          }),
        ).animate().fadeIn(),
        
        const SizedBox(height: 48),
        
        // Available Chords Grid
        if (!widget.viewModel.hasAnswered)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
            children: _availableChords.map((chord) {
              return ActionChip(
                label: Text(chord, style: const TextStyle(fontWeight: FontWeight.bold)),
                backgroundColor: theme.colorScheme.surface,
                side: BorderSide(color: theme.colorScheme.outlineVariant),
                onPressed: () => _addChord(chord),
              );
            }).toList(),
          ).animate().fadeIn().slideY(begin: 0.2),

        const SizedBox(height: 32),
        if (!widget.viewModel.hasAnswered)
          Center(
            child: FilledButton(
              onPressed: _userChords.length == _expectedChords.length ? _checkAnswer : null,
              style: FilledButton.styleFrom(
                minimumSize: const Size(200, 56),
              ),
              child: const Text('Verificar Campo Harmônico', style: TextStyle(fontSize: 18)),
            ),
          ),
          
        if (widget.viewModel.hasAnswered && !widget.viewModel.isCorrect)
           Padding(
             padding: const EdgeInsets.only(top: 24.0),
             child: Center(
               child: Text(
                 'Correto: ${_expectedChords.join(" - ")}',
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
