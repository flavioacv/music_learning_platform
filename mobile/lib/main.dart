import 'package:flutter/material.dart';

import 'data/repositories/auth_repository.dart';
import 'data/repositories/learning_repository.dart';
import 'data/services/api_client.dart';
import 'domain/models/auth_models.dart';
import 'ui/features/auth/views/auth_screen.dart';
import 'ui/features/home/views/home_shell.dart';

void main() {
  runApp(const MusicLearningApp());
}

class MusicLearningApp extends StatefulWidget {
  const MusicLearningApp({super.key, this.initialUser});

  final AppUser? initialUser;

  @override
  State<MusicLearningApp> createState() => _MusicLearningAppState();
}

class _MusicLearningAppState extends State<MusicLearningApp> {
  late final ApiClient _apiClient;
  late final AuthRepository _authRepository;
  late final LearningRepository _learningRepository;
  AppUser? _user;

  @override
  void initState() {
    super.initState();
    _apiClient = ApiClient();
    _authRepository = AuthRepository(_apiClient);
    _learningRepository = LearningRepository(_apiClient);
    _user = widget.initialUser;
  }

  void _signIn(AuthSession session) {
    setState(() {
      _user = session.user;
    });
  }

  void _signOut() {
    _authRepository.signOut();
    setState(() => _user = null);
  }

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFF007A78);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Music Learning Platform',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: seed,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF7F5EF),
        appBarTheme: const AppBarTheme(centerTitle: false),
        cardTheme: CardThemeData(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: const BorderSide(color: Color(0xFFE3DFD2)),
          ),
        ),
      ),
      home: _user == null
          ? AuthScreen(authRepository: _authRepository, onSignedIn: _signIn)
          : HomeShell(
              user: _user!,
              learningRepository: _learningRepository,
              onSignOut: _signOut,
            ),
    );
  }
}
