import 'package:flutter/foundation.dart';

import '../../../../data/repositories/learning_repository.dart';
import '../../../../domain/models/course_models.dart';

class ExerciseViewModel extends ChangeNotifier {
  ExerciseViewModel(this._repository, this.lessonId) {
    _loadExercises();
  }

  final LearningRepository _repository;
  final String lessonId;

  bool _isLoading = true;
  String? _error;
  List<Exercise> _exercises = [];
  List<NotePair> _notes = [];

  int _questionIndex = 0;
  int _score = 0;
  String? _selectedAnswer;
  bool _isFinished = false;

  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isFinished => _isFinished;

  NotePair get current => _notes.isEmpty
      ? const NotePair(latin: '', american: '')
      : _notes[_questionIndex % _notes.length];
  int get questionIndex => _questionIndex;
  int get questionCount => _notes.length;
  int get score => _score;
  String? get selectedAnswer => _selectedAnswer;
  bool get hasAnswered => _selectedAnswer != null;
  bool get isCorrect => _selectedAnswer == current.american;

  List<String> get answers {
    if (_notes.isEmpty) return [];
    final options = <String>{current.american};
    var cursor = _questionIndex + 2;
    while (options.length < 4) {
      options.add(_notes[cursor % _notes.length].american);
      cursor += 2;
    }
    return options.toList()..sort();
  }

  Future<void> _loadExercises() async {
    try {
      _isLoading = true;
      notifyListeners();

      _exercises = await _repository.getExercises(lessonId);

      if (_exercises.isNotEmpty) {
        final exercise = _exercises.first;
        if (exercise.type == 'note_identification') {
          final notesData = exercise.payload['notes'] as List<dynamic>;
          _notes = notesData
              .cast<Map<String, dynamic>>()
              .map(NotePair.fromJson)
              .toList();
        }
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
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
    if (_questionIndex + 1 >= _notes.length) {
      _isFinished = true;
      notifyListeners();
      return;
    }
    _questionIndex += 1;
    _selectedAnswer = null;
    notifyListeners();
  }
}
