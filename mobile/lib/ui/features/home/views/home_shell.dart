import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../data/repositories/learning_repository.dart';
import '../../../../domain/models/auth_models.dart';
import '../../../../domain/models/progress_models.dart';
import '../../../core/responsive_content.dart';
import '../../course/views/course_screen.dart';
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
      ProfileScreen(
        user: widget.user,
        learningRepository: widget.learningRepository,
        onSignOut: widget.onSignOut,
      ),
    ];

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 800;

            if (isWide) {
              return Row(
                children: [
                  NavigationRail(
                    selectedIndex: _selectedIndex,
                    onDestinationSelected: (index) =>
                        setState(() => _selectedIndex = index),
                    extended: constraints.maxWidth >= 1000,
                    leading: Padding(
                      padding: const EdgeInsets.only(bottom: 24, top: 16),
                      child: Icon(
                        Icons.graphic_eq,
                        color: Theme.of(context).colorScheme.primary,
                        size: 32,
                      ),
                    ),
                    destinations: const [
                      NavigationRailDestination(
                        icon: Icon(Icons.home_outlined),
                        selectedIcon: Icon(Icons.home),
                        label: Text('Inicio'),
                      ),
                      NavigationRailDestination(
                        icon: Icon(Icons.school_outlined),
                        selectedIcon: Icon(Icons.school),
                        label: Text('Curso'),
                      ),
                      NavigationRailDestination(
                        icon: Icon(Icons.person_outline),
                        selectedIcon: Icon(Icons.person),
                        label: Text('Perfil'),
                      ),
                    ],
                  ),
                  const VerticalDivider(thickness: 1, width: 1),
                  Expanded(child: screens[_selectedIndex]),
                ],
              );
            }

            return Column(
              children: [
                Expanded(child: screens[_selectedIndex]),
                NavigationBar(
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
                      icon: Icon(Icons.person_outline),
                      selectedIcon: Icon(Icons.person),
                      label: 'Perfil',
                    ),
                  ],
                ),
              ],
            );
          },
        ),
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
    final total = progress?.totalLessons ?? 0;
    final percent = total == 0 ? 0.0 : completed / total;
    final xp = progress?.currentXp ?? user.xp;
    final level = progress?.currentLevel ?? user.level;

    return ResponsiveContent(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ola, ${user.name}',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: theme.colorScheme.primary,
                      ),
                    ).animate().fadeIn().slideX(begin: -0.1),
                    const SizedBox(height: 4),
                    Text(
                      'Sua trilha musical esta pronta para hoje.',
                      style: theme.textTheme.bodyLarge,
                    ).animate().fadeIn(delay: 100.ms).slideX(begin: -0.1),
                  ],
                ),
              ),
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: theme.colorScheme.primary.withOpacity(0.3),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: CircleAvatar(
                  radius: 28,
                  backgroundColor: theme.colorScheme.surfaceVariant,
                  child: Text(
                    user.name.characters.first.toUpperCase(),
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w900,
                      fontSize: 24,
                    ),
                  ),
                ),
              ).animate().scale(delay: 200.ms),
            ],
          ),
          if (error != null) ...[
            const SizedBox(height: 12),
            Text(
              'Nao foi possivel carregar o progresso agora.',
              style: TextStyle(color: theme.colorScheme.error),
            ),
          ],
          const SizedBox(height: 32),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                            Icons.local_fire_department,
                            color: theme.colorScheme.secondary,
                            size: 28,
                          )
                          .animate(
                            onPlay: (controller) =>
                                controller.repeat(reverse: true),
                          )
                          .scale(
                            begin: const Offset(1, 1),
                            end: const Offset(1.2, 1.2),
                          ),
                      const SizedBox(width: 12),
                      Text(
                        'Progresso geral',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const Spacer(),
                      if (isLoading)
                        const SizedBox.square(
                          dimension: 20,
                          child: CircularProgressIndicator(strokeWidth: 3),
                        ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: percent,
                      minHeight: 12,
                      backgroundColor: theme.colorScheme.background,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        theme.colorScheme.secondary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '$completed de $total licoes concluidas',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.1),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  icon: Icons.bolt,
                  label: 'XP',
                  value: '$xp',
                ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _MetricCard(
                  icon: Icons.trending_up,
                  label: 'Nivel',
                  value: '$level',
                ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.1),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Text(
            'Continuar aprendendo',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ).animate().fadeIn(delay: 600.ms),
          const SizedBox(height: 16),
          _NextLessonCard(
            theme: theme,
          ).animate().fadeIn(delay: 700.ms).slideX(begin: 0.1),
          const SizedBox(height: 32),
          Text(
            'Conquistas',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ).animate().fadeIn(delay: 800.ms),
          const SizedBox(height: 16),
          if ((progress?.achievements ?? []).isEmpty)
            const Card(
              child: ListTile(
                leading: Icon(Icons.lock_outline),
                title: Text('Primeiras conquistas'),
                subtitle: Text('Conclua licoes para desbloquear recompensas.'),
              ),
            ).animate().fadeIn(delay: 900.ms)
          else
            ...progress!.achievements.asMap().entries.map((entry) {
              final index = entry.key;
              final achievement = entry.value;
              return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 8,
                      ),
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.secondary.withOpacity(0.2),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.emoji_events,
                          color: theme.colorScheme.secondary,
                        ),
                      ),
                      title: Text(
                        achievement.title,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(achievement.description),
                      trailing: const Icon(
                        Icons.check_circle,
                        color: Colors.greenAccent,
                      ),
                    ),
                  )
                  .animate()
                  .fadeIn(delay: (900 + (index * 100)).ms)
                  .slideX(begin: 0.1);
            }),
          const SizedBox(height: 40),
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
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: theme.colorScheme.primary, size: 28),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: theme.textTheme.labelLarge),
                Text(
                  value,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w900,
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

class _NextLessonCard extends StatefulWidget {
  const _NextLessonCard({required this.theme});

  final ThemeData theme;

  @override
  State<_NextLessonCard> createState() => _NextLessonCardState();
}

class _NextLessonCardState extends State<_NextLessonCard> {
  bool _isHovering = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovering = true),
      onExit: (_) => setState(() => _isHovering = false),
      cursor: SystemMouseCursors.click,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        transform: Matrix4.identity()..translate(0.0, _isHovering ? -4.0 : 0.0),
        child: Card(
          elevation: _isHovering ? 8 : 0,
          shadowColor: widget.theme.colorScheme.primary.withOpacity(0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: _isHovering
                  ? widget.theme.colorScheme.primary
                  : const Color(0xFF2A2E3D),
              width: _isHovering ? 2 : 1,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        widget.theme.colorScheme.primary,
                        widget.theme.colorScheme.secondary,
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.music_note,
                    color: Colors.black,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cifras americanas',
                        style: widget.theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Aprenda que Do tambem pode ser C.',
                        style: widget.theme.textTheme.bodyLarge,
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_rounded,
                  color: _isHovering
                      ? widget.theme.colorScheme.primary
                      : widget.theme.colorScheme.onSurfaceVariant,
                  size: 32,
                ).animate(target: _isHovering ? 1 : 0).moveX(end: 5),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
