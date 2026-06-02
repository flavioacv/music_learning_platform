import 'dart:async';
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
  late int _bpm;
  late List<int> _pattern;
  
  Timer? _metronomeTimer;
  int _currentTick = -1;
  bool _isPlaying = false;
  
  List<bool> _userTaps = [];

  @override
  void initState() {
    super.initState();
    _bpm = widget.exercise.payload['bpm'] as int;
    _pattern = List<int>.from(widget.exercise.payload['pattern'] ?? []);
    _userTaps = List.filled(_pattern.length, false);
  }

  @override
  void dispose() {
    _metronomeTimer?.cancel();
    super.dispose();
  }

  void _startMetronome() {
    if (_isPlaying) return;
    setState(() {
      _isPlaying = true;
      _currentTick = -1;
      _userTaps = List.filled(_pattern.length, false);
    });

    final intervalMs = (60000 / _bpm / 4).round(); // Assuming 16th notes
    _metronomeTimer = Timer.periodic(Duration(milliseconds: intervalMs), (timer) {
      if (_currentTick + 1 >= _pattern.length) {
        timer.cancel();
        _evaluateTaps();
        return;
      }
      setState(() {
        _currentTick++;
      });
    });
  }

  void _handleTap() {
    if (!_isPlaying || _currentTick < 0 || _currentTick >= _pattern.length) return;
    setState(() {
      _userTaps[_currentTick] = true;
    });
  }

  void _evaluateTaps() {
    setState(() {
      _isPlaying = false;
    });

    // Evaluate: user must tap when pattern is 1, and not tap when pattern is 0
    int correctTaps = 0;
    int expectedTaps = _pattern.where((p) => p == 1).length;
    
    for (int i = 0; i < _pattern.length; i++) {
      if (_pattern[i] == 1 && _userTaps[i]) correctTaps++;
    }

    // Accept if accuracy > 80%
    bool isCorrect = correctTaps >= expectedTaps * 0.8;
    widget.viewModel.submitAnswer(isCorrect);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
        const SizedBox(height: 16),
        Text(
          'BPM: $_bpm',
          textAlign: TextAlign.center,
          style: theme.textTheme.titleMedium?.copyWith(
            color: theme.colorScheme.primary,
          ),
        ),
        const SizedBox(height: 48),
        
        // Visual indicator of pattern
        Center(
          child: Wrap(
            spacing: 4,
            runSpacing: 8,
            children: List.generate(_pattern.length, (index) {
              final isCurrent = index == _currentTick;
              final isExpected = _pattern[index] == 1;
              final isTapped = _userTaps[index];
              
              Color dotColor = theme.colorScheme.surfaceVariant;
              if (isExpected) dotColor = theme.colorScheme.primary.withOpacity(0.5);
              if (isCurrent) dotColor = theme.colorScheme.secondary;
              if (isTapped) dotColor = Colors.greenAccent;

              return AnimatedContainer(
                duration: const Duration(milliseconds: 100),
                width: 16,
                height: isExpected ? 32 : 16,
                decoration: BoxDecoration(
                  color: dotColor,
                  borderRadius: BorderRadius.circular(8),
                ),
              );
            }),
          ),
        ),
        
        const SizedBox(height: 64),
        
        if (!_isPlaying && !widget.viewModel.hasAnswered)
          Center(
            child: FilledButton.icon(
              onPressed: _startMetronome,
              icon: const Icon(Icons.play_arrow),
              label: const Text('INICIAR'),
              style: FilledButton.styleFrom(
                minimumSize: const Size(200, 56),
              ),
            ),
          ),
          
        if (_isPlaying)
          Center(
            child: GestureDetector(
              onTapDown: (_) => _handleTap(),
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withOpacity(0.2),
                  shape: BoxShape.circle,
                  border: Border.all(color: theme.colorScheme.primary, width: 4),
                ),
                child: Center(
                  child: Text(
                    'TAP',
                    style: theme.textTheme.displaySmall?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
              ),
            ),
          ),
          
        if (widget.viewModel.hasAnswered && !widget.viewModel.isCorrect)
           Padding(
             padding: const EdgeInsets.only(top: 24.0),
             child: Center(
               child: Text(
                 'Você perdeu o ritmo. Tente novamente!',
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
