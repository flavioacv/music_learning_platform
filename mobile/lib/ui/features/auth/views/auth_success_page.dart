import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/responsive_content.dart';

class AuthSuccessPage extends StatelessWidget {
  const AuthSuccessPage({
    super.key,
    required this.onGoToDashboard,
  });

  final VoidCallback onGoToDashboard;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 800;

          if (isWide) {
            return Row(
              children: [
                const Expanded(
                  flex: 5,
                  child: SizedBox.shrink(),
                ),
                Expanded(
                  flex: 4,
                  child: _buildBody(context, theme),
                ),
              ],
            );
          }

          return SafeArea(
            child: _buildBody(context, theme),
          );
        },
      ),
    );
  }

  Widget _buildBody(BuildContext context, ThemeData theme) {
    return ResponsiveContent(
      maxWidth: 420,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.check_circle,
                  color: theme.colorScheme.primary,
                  size: 56,
                ),
              ).animate().scale(duration: 600.ms, curve: Curves.elasticOut),
              const SizedBox(height: 32),
              Text(
                'Tudo certo por aqui',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: theme.colorScheme.primary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'A autenticacao foi concluida com sucesso.',
                style: theme.textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'Voce ja pode acessar o app com o perfil escolhido e seguir com a trilha musical.',
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: onGoToDashboard,
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Ir para o app'),
              ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.1),
            ],
          ),
        ),
      ),
    );
  }
}
