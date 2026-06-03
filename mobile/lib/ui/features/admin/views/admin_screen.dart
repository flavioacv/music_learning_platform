import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../data/repositories/admin_repository.dart';
import '../../../../domain/models/admin_models.dart';
import '../../../core/responsive_content.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key, required this.adminRepository});

  final AdminRepository adminRepository;

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  late Future<AdminOverview> _overviewFuture;

  @override
  void initState() {
    super.initState();
    _overviewFuture = widget.adminRepository.getOverview();
  }

  Future<void> _reloadOverview() {
    final future = widget.adminRepository.getOverview();
    setState(() {
      _overviewFuture = future;
    });
    return future;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ResponsiveContent(
      maxWidth: 1080,
      child: FutureBuilder<AdminOverview>(
        future: _overviewFuture,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return _AdminMessage(
              icon: Icons.admin_panel_settings_outlined,
              title: 'Acesso admin indisponivel',
              message: snapshot.error.toString(),
              onRetry: _reloadOverview,
            );
          }

          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final overview = snapshot.data!;

          return RefreshIndicator(
            onRefresh: _reloadOverview,
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Painel admin',
                            style: theme.textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: theme.colorScheme.primary,
                            ),
                          ).animate().fadeIn().slideX(begin: -0.1),
                          const SizedBox(height: 4),
                          Text(
                            'Operacao, progresso e saude do conteudo.',
                            style: theme.textTheme.bodyLarge,
                          ).animate().fadeIn(delay: 100.ms).slideX(begin: -0.1),
                        ],
                      ),
                    ),
                    IconButton.filledTonal(
                      onPressed: _reloadOverview,
                      tooltip: 'Atualizar painel',
                      icon: const Icon(Icons.refresh),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _AdminSummary(
                  overview: overview,
                ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.08),
                const SizedBox(height: 16),
                _MetricGrid(
                  overview: overview,
                ).animate().fadeIn(delay: 250.ms).slideY(begin: 0.08),
                const SizedBox(height: 24),
                _SectionTitle(
                  title: 'Modulos',
                  trailing: '${overview.modules.length} ativos',
                ),
                const SizedBox(height: 12),
                _ModuleSummaryList(
                  modules: overview.modules,
                ).animate().fadeIn(delay: 350.ms).slideY(begin: 0.08),
                const SizedBox(height: 24),
                _SectionTitle(
                  title: 'Usuarios recentes',
                  trailing: '${overview.recentUsers.length} exibidos',
                ),
                const SizedBox(height: 12),
                _RecentUsersList(
                  users: overview.recentUsers,
                ).animate().fadeIn(delay: 450.ms).slideY(begin: 0.08),
                const SizedBox(height: 24),
                _SectionTitle(
                  title: 'Saude do conteudo',
                  trailing: '${overview.contentHealth.issueCount} pendencias',
                ),
                const SizedBox(height: 12),
                _ContentHealthPanel(
                  health: overview.contentHealth,
                ).animate().fadeIn(delay: 550.ms).slideY(begin: 0.08),
                const SizedBox(height: 40),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _AdminSummary extends StatelessWidget {
  const _AdminSummary({required this.overview});

  final AdminOverview overview;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final completionRate = overview.totals.lessons == 0
        ? 0.0
        : overview.progress.completedLessons / overview.totals.lessons;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.insights,
                    color: theme.colorScheme.primary,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${overview.progress.activeUsers} usuarios ativos',
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${overview.progress.completedLessons} licoes concluidas no total',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: completionRate.clamp(0.0, 1.0),
                minHeight: 10,
                backgroundColor: theme.colorScheme.surface,
                valueColor: AlwaysStoppedAnimation<Color>(
                  theme.colorScheme.secondary,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              '${(completionRate * 100).round()}% de conclusoes por licao cadastrada',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.overview});

  final AdminOverview overview;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 760;
        final metrics = [
          _AdminMetric(
            Icons.people_alt_outlined,
            'Usuarios',
            overview.totals.users,
          ),
          _AdminMetric(
            Icons.school_outlined,
            'Cursos',
            overview.totals.courses,
          ),
          _AdminMetric(
            Icons.library_books_outlined,
            'Licoes',
            overview.totals.lessons,
          ),
          _AdminMetric(
            Icons.quiz_outlined,
            'Exercicios',
            overview.totals.exercises,
          ),
          _AdminMetric(
            Icons.bolt_outlined,
            'XP total',
            overview.progress.totalXp,
          ),
          _AdminMetric(
            Icons.emoji_events_outlined,
            'Conquistas',
            overview.totals.achievements,
          ),
        ];

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: metrics.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: isWide ? 3 : 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            mainAxisExtent: 112,
          ),
          itemBuilder: (context, index) => _MetricTile(metric: metrics[index]),
        );
      },
    );
  }
}

class _AdminMetric {
  const _AdminMetric(this.icon, this.label, this.value);

  final IconData icon;
  final String label;
  final int value;
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.metric});

  final _AdminMetric metric;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(metric.icon, color: theme.colorScheme.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(metric.label, style: theme.textTheme.labelLarge),
                  Text(
                    '${metric.value}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.trailing});

  final String title;
  final String trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        Text(
          trailing,
          style: theme.textTheme.labelLarge?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _ModuleSummaryList extends StatelessWidget {
  const _ModuleSummaryList({required this.modules});

  final List<AdminModuleSummary> modules;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Column(
        children: modules.map((module) {
          final index = modules.indexOf(module);
          final coverage = module.exerciseCoverage.clamp(0.0, 1.0);

          return Column(
            children: [
              ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                leading: CircleAvatar(
                  backgroundColor: theme.colorScheme.secondary.withValues(
                    alpha: 0.14,
                  ),
                  child: Text(
                    '${index + 1}',
                    style: TextStyle(
                      color: theme.colorScheme.secondary,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                title: Text(
                  module.title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: coverage,
                      minHeight: 8,
                      backgroundColor: theme.colorScheme.surface,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        theme.colorScheme.primary,
                      ),
                    ),
                  ),
                ),
                trailing: _ModuleNumbers(module: module),
              ),
              if (index != modules.length - 1)
                Divider(
                  height: 1,
                  color: theme.colorScheme.surfaceContainerHighest,
                ),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _ModuleNumbers extends StatelessWidget {
  const _ModuleNumbers({required this.module});

  final AdminModuleSummary module;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      width: 156,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          _TinyStat(label: 'Aulas', value: module.lessons),
          const SizedBox(width: 12),
          _TinyStat(label: 'Ex.', value: module.exercises),
          const SizedBox(width: 12),
          _TinyStat(
            label: 'Fim',
            value: module.completions,
            color: theme.colorScheme.secondary,
          ),
        ],
      ),
    );
  }
}

class _TinyStat extends StatelessWidget {
  const _TinyStat({required this.label, required this.value, this.color});

  final String label;
  final int value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          '$value',
          style: theme.textTheme.titleMedium?.copyWith(
            color: color,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(label, style: theme.textTheme.labelSmall),
      ],
    );
  }
}

class _RecentUsersList extends StatelessWidget {
  const _RecentUsersList({required this.users});

  final List<AdminRecentUser> users;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (users.isEmpty) {
      return const Card(
        child: ListTile(
          leading: Icon(Icons.people_outline),
          title: Text('Nenhum usuario encontrado'),
        ),
      );
    }

    return Card(
      child: Column(
        children: users.map((user) {
          final index = users.indexOf(user);

          return Column(
            children: [
              ListTile(
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                leading: CircleAvatar(
                  backgroundColor: theme.colorScheme.primary.withValues(
                    alpha: 0.12,
                  ),
                  child: Text(
                    user.name.characters.first.toUpperCase(),
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                title: Text(
                  user.name,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text(
                  '${user.email} • ${_formatLastActivity(user.lastActivity)}',
                ),
                trailing: SizedBox(
                  width: 116,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      _TinyStat(label: 'Nivel', value: user.level),
                      const SizedBox(width: 14),
                      _TinyStat(
                        label: 'XP',
                        value: user.xp,
                        color: theme.colorScheme.secondary,
                      ),
                    ],
                  ),
                ),
              ),
              if (index != users.length - 1)
                Divider(
                  height: 1,
                  color: theme.colorScheme.surfaceContainerHighest,
                ),
            ],
          );
        }).toList(),
      ),
    );
  }

  String _formatLastActivity(DateTime? date) {
    if (date == null) return 'sem atividade';

    final local = date.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final month = local.month.toString().padLeft(2, '0');
    return '$day/$month/${local.year}';
  }
}

class _ContentHealthPanel extends StatelessWidget {
  const _ContentHealthPanel({required this.health});

  final AdminContentHealth health;

  @override
  Widget build(BuildContext context) {
    if (health.issueCount == 0) {
      return const Card(
        child: ListTile(
          leading: Icon(Icons.check_circle_outline),
          title: Text('Conteudo em dia'),
          subtitle: Text('Todas as licoes tem exercicios e feedback.'),
        ),
      );
    }

    return Column(
      children: [
        _IssueCard(
          icon: Icons.assignment_late_outlined,
          title: 'Licoes sem exercicios',
          emptyMessage: 'Nenhuma licao sem exercicios.',
          issues: health.lessonsWithoutExercises
              .map((issue) => _IssueLine(issue.title, issue.moduleTitle))
              .toList(),
        ),
        const SizedBox(height: 12),
        _IssueCard(
          icon: Icons.feedback_outlined,
          title: 'Exercicios sem feedback',
          emptyMessage: 'Nenhum exercicio sem feedback.',
          issues: health.exercisesWithoutFeedback
              .map((issue) => _IssueLine(issue.prompt, issue.lessonTitle))
              .toList(),
        ),
      ],
    );
  }
}

class _IssueLine {
  const _IssueLine(this.title, this.subtitle);

  final String title;
  final String subtitle;
}

class _IssueCard extends StatelessWidget {
  const _IssueCard({
    required this.icon,
    required this.title,
    required this.emptyMessage,
    required this.issues,
  });

  final IconData icon;
  final String title;
  final String emptyMessage;
  final List<_IssueLine> issues;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: theme.colorScheme.secondary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                Text(
                  '${issues.length}',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: theme.colorScheme.secondary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (issues.isEmpty)
              Text(emptyMessage)
            else
              ...issues
                  .take(6)
                  .map(
                    (issue) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.circle,
                            size: 8,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  issue.title,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(issue.subtitle),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
            if (issues.length > 6)
              Text(
                '+${issues.length - 6} pendencias ocultas',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _AdminMessage extends StatelessWidget {
  const _AdminMessage({
    required this.icon,
    required this.title,
    required this.message,
    required this.onRetry,
  });

  final IconData icon;
  final String title;
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 64, color: theme.colorScheme.error),
            const SizedBox(height: 24),
            Text(
              title,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }
}
