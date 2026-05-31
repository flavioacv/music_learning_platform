import 'package:flutter/material.dart';

import '../../../../data/repositories/learning_repository.dart';
import '../../../../domain/models/auth_models.dart';
import '../../../../domain/models/progress_models.dart';
import '../../../core/responsive_content.dart';
import '../../course/views/course_screen.dart';
import '../../practice/views/exercise_screen.dart';
import '../../profile/views/profile_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.user,
    required this.learningRepository,
    required this.onSignOut,
  });

  final AppUser user;
  final LearningRepository learningRepository;
  final VoidCallback onSignOut;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      DashboardScreen(
        user: widget.user,
        learningRepository: widget.learningRepository,
      ),
      CourseScreen(learningRepository: widget.learningRepository),
      const ExerciseScreen(),
      ProfileScreen(user: widget.user, onSignOut: widget.onSignOut),
    ];

    return Scaffold(
      body: SafeArea(child: screens[_selectedIndex]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) =>
            setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.school_outlined),
            selectedIcon: Icon(Icons.school),
            label: 'Curso',
          ),
          NavigationDestination(
            icon: Icon(Icons.quiz_outlined),
            selectedIcon: Icon(Icons.quiz),
            label: 'Pratica',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.user,
    required this.learningRepository,
  });

  final AppUser user;
  final LearningRepository learningRepository;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<UserProgress> _progressFuture;

  @override
  void initState() {
    super.initState();
    _progressFuture = widget.learningRepository.getProgress();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserProgress>(
      future: _progressFuture,
      builder: (context, snapshot) {
        final progress = snapshot.data;

        return _DashboardContent(
          user: widget.user,
          progress: progress,
          isLoading: snapshot.connectionState != ConnectionState.done,
          error: snapshot.error,
        );
      },
    );
  }
}

class _DashboardContent extends StatelessWidget {
  const _DashboardContent({
    required this.user,
    required this.progress,
    required this.isLoading,
    required this.error,
  });

  final AppUser user;
  final UserProgress? progress;
  final bool isLoading;
  final Object? error;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completed = progress?.completedLessons ?? 0;
    const total = 10;
    final percent = total == 0 ? 0.0 : completed / total;
    final xp = progress?.totalXpAwarded ?? user.xp;

    return ResponsiveContent(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ola, ${user.name}',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Sua trilha musical esta pronta para hoje.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              CircleAvatar(
                radius: 24,
                backgroundColor: theme.colorScheme.primary,
                child: Text(
                  user.name.characters.first.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          if (error != null) ...[
            const SizedBox(height: 12),
            Text(
              'Nao foi possivel carregar o progresso agora.',
              style: TextStyle(color: theme.colorScheme.error),
            ),
          ],
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.local_fire_department,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Progresso geral',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const Spacer(),
                      if (isLoading)
                        const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  LinearProgressIndicator(value: percent, minHeight: 10),
                  const SizedBox(height: 10),
                  Text('$completed de $total licoes concluidas'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _MetricCard(icon: Icons.bolt, label: 'XP', value: '$xp'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricCard(
                  icon: Icons.trending_up,
                  label: 'Nivel',
                  value: '${user.level}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'Continuar aprendendo',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          _NextLessonCard(theme: theme),
          const SizedBox(height: 20),
          Text(
            'Conquistas',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          if ((progress?.achievements ?? []).isEmpty)
            const Card(
              child: ListTile(
                leading: Icon(Icons.lock_open),
                title: Text('Primeiras conquistas'),
                subtitle: Text('Conclua licoes para desbloquear recompensas.'),
              ),
            )
          else
            ...progress!.achievements.map((achievement) {
              return Card(
                child: ListTile(
                  leading: Icon(
                    Icons.emoji_events,
                    color: theme.colorScheme.primary,
                  ),
                  title: Text(achievement.title),
                  subtitle: Text(achievement.description),
                  trailing: const Icon(Icons.lock_open, size: 18),
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Icon(icon, color: theme.colorScheme.primary),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: theme.textTheme.labelLarge),
                Text(
                  value,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _NextLessonCard extends StatelessWidget {
  const _NextLessonCard({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.music_note, color: theme.colorScheme.primary),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Cifras americanas',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text('Aprenda que Do tambem pode ser C.'),
                ],
              ),
            ),
            const Icon(Icons.chevron_right),
          ],
        ),
      ),
    );
  }
}
