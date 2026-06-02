import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../data/repositories/learning_repository.dart';
import '../../../../domain/models/auth_models.dart';
import '../../../../domain/models/progress_models.dart';
import '../../../core/responsive_content.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.user,
    required this.learningRepository,
    required this.onSignOut,
  });

  final AppUser user;
  final LearningRepository learningRepository;
  final VoidCallback onSignOut;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
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
        return _ProfileContent(
          user: widget.user,
          progress: snapshot.data,
          isLoading: snapshot.connectionState != ConnectionState.done,
          onSignOut: widget.onSignOut,
        );
      },
    );
  }
}

class _ProfileContent extends StatelessWidget {
  const _ProfileContent({
    required this.user,
    required this.progress,
    required this.isLoading,
    required this.onSignOut,
  });

  final AppUser user;
  final UserProgress? progress;
  final bool isLoading;
  final VoidCallback onSignOut;

  // Lista de todas as conquistas possíveis (fixas do sistema)
  static const _allAchievements = [
    _AchievementInfo(
      code: 'first_lesson',
      title: 'Primeiro som',
      description: 'Concluiu a primeira licao.',
      icon: Icons.emoji_events,
    ),
    _AchievementInfo(
      code: 'cipher_reader',
      title: 'Leitor de cifras',
      description: 'Acertou notas em cifra americana.',
      icon: Icons.workspace_premium,
    ),
    _AchievementInfo(
      code: 'scale_builder',
      title: 'Construtor de escalas',
      description: 'Montou a primeira escala maior.',
      icon: Icons.auto_graph,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final currentXp = progress?.currentXp ?? user.xp;
    final currentLevel = progress?.currentLevel ?? user.level;
    final xpForCurrentLevel = (currentLevel - 1) * 100;
    final xpProgress = (currentXp - xpForCurrentLevel).clamp(0, 100);
    final levelProgress = xpProgress / 100.0;

    final unlockedCodes =
        progress?.achievements.map((a) => a.code).toSet() ?? {};

    return ResponsiveContent(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Header - Avatar e Info
          Row(
            children: [
              Hero(
                tag: 'user-avatar',
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        theme.colorScheme.primary,
                        theme.colorScheme.secondary,
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: theme.colorScheme.primary.withOpacity(0.4),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      user.name.characters.first.toUpperCase(),
                      style: theme.textTheme.headlineLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.name,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      user.email,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ).animate().fadeIn().slideY(begin: -0.1),
          const SizedBox(height: 32),

          // Card de Nível com Barra de Progresso
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              const Color(0xFFFFD700),
                              const Color(0xFFFFA500),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFFFD700).withOpacity(0.4),
                              blurRadius: 12,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.star,
                              color: Colors.black,
                              size: 18,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Nivel $currentLevel',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                color: Colors.black,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      if (isLoading)
                        const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      else
                        Text(
                          '$currentXp XP',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0.0, end: levelProgress),
                      duration: const Duration(milliseconds: 1000),
                      curve: Curves.easeOutCubic,
                      builder: (context, value, _) => LinearProgressIndicator(
                        value: value,
                        minHeight: 14,
                        backgroundColor: theme.colorScheme.surfaceVariant,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          const Color(0xFFFFD700),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '$xpProgress / 100 XP para o proximo nivel',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        'Nivel ${currentLevel + 1}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.1),
          const SizedBox(height: 24),

          // Seção de Conquistas
          Text(
            'Conquistas',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ).animate().fadeIn(delay: 250.ms),
          const SizedBox(height: 4),
          Text(
            '${unlockedCodes.length} de ${_allAchievements.length} desbloqueadas',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ).animate().fadeIn(delay: 300.ms),
          const SizedBox(height: 16),
          ..._allAchievements.asMap().entries.map((entry) {
            final idx = entry.key;
            final info = entry.value;
            final isUnlocked = unlockedCodes.contains(info.code);
            final unlockedAt = isUnlocked
                ? progress!.achievements
                      .where((a) => a.code == info.code)
                      .firstOrNull
                      ?.unlockedAt
                : null;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _AchievementCard(
                info: info,
                isUnlocked: isUnlocked,
                unlockedAt: unlockedAt,
              ),
            ).animate().fadeIn(delay: (350 + idx * 100).ms).slideX(begin: 0.1);
          }),
          const SizedBox(height: 32),

          // Botão de Logout
          OutlinedButton.icon(
            onPressed: onSignOut,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              side: BorderSide(color: theme.colorScheme.error.withOpacity(0.5)),
              foregroundColor: theme.colorScheme.error,
            ),
            icon: const Icon(Icons.logout),
            label: const Text('Sair da conta'),
          ).animate().fadeIn(delay: 600.ms),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

class _AchievementInfo {
  const _AchievementInfo({
    required this.code,
    required this.title,
    required this.description,
    required this.icon,
  });

  final String code;
  final String title;
  final String description;
  final IconData icon;
}

class _AchievementCard extends StatelessWidget {
  const _AchievementCard({
    required this.info,
    required this.isUnlocked,
    this.unlockedAt,
  });

  final _AchievementInfo info;
  final bool isUnlocked;
  final String? unlockedAt;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isUnlocked
              ? const Color(0xFFFFD700).withOpacity(0.5)
              : theme.colorScheme.surfaceVariant,
          width: isUnlocked ? 1.5 : 1,
        ),
        gradient: isUnlocked
            ? LinearGradient(
                colors: [
                  const Color(0xFFFFD700).withOpacity(0.08),
                  theme.colorScheme.surface,
                ],
              )
            : null,
        color: isUnlocked
            ? null
            : theme.colorScheme.surfaceVariant.withOpacity(0.3),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isUnlocked
                    ? const Color(0xFFFFD700).withOpacity(0.15)
                    : theme.colorScheme.surfaceVariant,
              ),
              child: Icon(
                isUnlocked ? info.icon : Icons.lock_outline,
                color: isUnlocked
                    ? const Color(0xFFFFD700)
                    : theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isUnlocked ? info.title : '???',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: isUnlocked
                          ? theme.colorScheme.onSurface
                          : theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isUnlocked
                        ? info.description
                        : 'Continue estudando para desbloquear.',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: isUnlocked
                          ? theme.colorScheme.onSurfaceVariant
                          : theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
                    ),
                  ),
                ],
              ),
            ),
            if (isUnlocked)
              const Icon(
                Icons.check_circle,
                color: Color(0xFFFFD700),
                size: 24,
              ),
          ],
        ),
      ),
    );
  }
}
