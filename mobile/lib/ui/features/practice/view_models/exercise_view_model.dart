import 'package:flutter/foundation.dart';

import '../../../../domain/models/course_models.dart';

class ExerciseViewModel extends ChangeNotifier {
  ExerciseViewModel() : _notes = _defaultNotePairs;

  final List<NotePair> _notes;
  int _questionIndex = 0;
  int _score = 0;
  String? _selectedAnswer;

  NotePair get current => _notes[_questionIndex % _notes.length];
  int get questionIndex => _questionIndex;
  int get questionCount => _notes.length;
  int get score => _score;
  String? get selectedAnswer => _selectedAnswer;
  bool get hasAnswered => _selectedAnswer != null;
  bool get isCorrect => _selectedAnswer == current.american;

  List<String> get answers {
    final options = <String>{current.american};
    var cursor = _questionIndex + 2;
    while (options.length < 4) {
      options.add(_notes[cursor % _notes.length].american);
      cursor += 2;
    }
    return options.toList()..sort();
  }

  void answer(String answer) {
    if (hasAnswered) return;

    _selectedAnswer = answer;
    if (answer == current.american) {
      _score += 10;
    }
    notifyListeners();
  }

  void next() {
    _questionIndex = (_questionIndex + 1) % _notes.length;
    _selectedAnswer = null;
    notifyListeners();
  }
}

const _defaultNotePairs = [
  NotePair(latin: 'Do', american: 'C'),
  NotePair(latin: 'Re', american: 'D'),
  NotePair(latin: 'Mi', american: 'E'),
  NotePair(latin: 'Fa', american: 'F'),
  NotePair(latin: 'Sol', american: 'G'),
  NotePair(latin: 'La', american: 'A'),
  NotePair(latin: 'Si', american: 'B'),
];
