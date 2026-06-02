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

  int _questionIndex = 0;
  int _score = 0;
  int _correctAnswers = 0;
  bool _isFinished = false;

  bool _hasAnswered = false;
  bool _isCorrect = false;

  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isFinished => _isFinished;

  Exercise? get current =>
      _exercises.isEmpty ? null : _exercises[_questionIndex];
  int get questionIndex => _questionIndex;
  int get questionCount => _exercises.length;
  int get score => _score;
  int get correctAnswers => _correctAnswers;
  double get accuracy =>
      questionCount == 0 ? 1 : _correctAnswers / questionCount;
  bool get hasPassed => accuracy >= 0.8;

  bool get hasAnswered => _hasAnswered;
  bool get isCorrect => _isCorrect;

  Future<void> _loadExercises() async {
    try {
      _isLoading = true;
      notifyListeners();

      _exercises = await _repository.getExercises(lessonId);

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  void submitAnswer(bool isCorrect) {
    if (_hasAnswered) return;

    _hasAnswered = true;
    _isCorrect = isCorrect;

    if (isCorrect && current != null) {
      _score += current!.xpReward;
      _correctAnswers += 1;
    }
    notifyListeners();
  }

  void next() {
    if (_questionIndex + 1 >= _exercises.length) {
      _isFinished = true;
      notifyListeners();
      return;
    }
    _questionIndex += 1;
    _hasAnswered = false;
    _isCorrect = false;
    notifyListeners();
  }

  void retry() {
    _questionIndex = 0;
    _score = 0;
    _correctAnswers = 0;
    _isFinished = false;
    _hasAnswered = false;
    _isCorrect = false;
    notifyListeners();
  }
}
