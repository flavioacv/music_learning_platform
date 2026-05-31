import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../../data/repositories/auth_repository.dart';
import '../../../../domain/models/auth_models.dart';
import '../../../core/responsive_content.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.authRepository,
    required this.onSignedIn,
  });

  final AuthRepository authRepository;
  final ValueChanged<AuthSession> onSignedIn;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _nameController = TextEditingController(text: 'Ana');
  final _emailController = TextEditingController(text: 'ana.teste@example.com');
  final _passwordController = TextEditingController(text: 'senhaforte123');
  bool _isCreatingAccount = false;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final session = _isCreatingAccount
          ? await widget.authRepository.register(
              name: _nameController.text,
              email: _emailController.text,
              password: _passwordController.text,
            )
          : await widget.authRepository.login(
              email: _emailController.text,
              password: _passwordController.text,
            );

      if (!mounted) return;
      widget.onSignedIn(session);
    } catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = error.toString());
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 800;

          if (isWide) {
            return Row(
              children: [
                Expanded(
                  flex: 5,
                  child: const _AuthBrandingPane().animate().fadeIn(
                    duration: 800.ms,
                  ),
                ),
                Expanded(
                  flex: 4,
                  child: _buildForm(
                    context,
                  ).animate().fadeIn(delay: 200.ms).slideX(begin: 0.1),
                ),
              ],
            );
          }

          return SafeArea(
            child: _buildForm(context).animate().fadeIn().slideY(begin: 0.1),
          );
        },
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    final theme = Theme.of(context);

    return ResponsiveContent(
      maxWidth: 480,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: theme.colorScheme.primary.withOpacity(0.5),
                      ),
                    ),
                    child: Icon(
                      Icons.graphic_eq,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      'ZURC Music',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),
              Text(
                _isCreatingAccount ? 'Criar conta' : 'Bem-vindo de volta',
                style: theme.textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Sua jornada musical fluida e interativa comeca aqui.',
                style: theme.textTheme.bodyLarge,
              ),
              const SizedBox(height: 32),
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(
                    value: false,
                    label: Text('Login'),
                    icon: Icon(Icons.login),
                  ),
                  ButtonSegment(
                    value: true,
                    label: Text('Cadastro'),
                    icon: Icon(Icons.person_add),
                  ),
                ],
                selected: {_isCreatingAccount},
                onSelectionChanged: (value) {
                  setState(() => _isCreatingAccount = value.first);
                },
              ),
              const SizedBox(height: 24),
              if (_isCreatingAccount) ...[
                TextField(
                  controller: _nameController,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Nome',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                ).animate().fadeIn().slideY(begin: -0.2),
                const SizedBox(height: 16),
              ],
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
              ).animate().fadeIn().slideY(begin: -0.2),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Senha',
                  prefixIcon: Icon(Icons.lock_outline),
                ),
              ).animate().fadeIn().slideY(begin: -0.2),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {},
                  child: const Text('Esqueceu a senha?'),
                ),
              ),
              const SizedBox(height: 8),
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.redAccent.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: Colors.redAccent.withOpacity(0.5),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Colors.redAccent),
                        ),
                      ),
                    ],
                  ),
                ).animate().shakeX(),
                const SizedBox(height: 16),
              ],
              FilledButton.icon(
                onPressed: _isLoading ? null : _submit,
                icon: _isLoading
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Icon(
                        _isCreatingAccount
                            ? Icons.person_add
                            : Icons.arrow_forward,
                      ),
                label: Text(_isCreatingAccount ? 'Comecar agora' : 'Entrar'),
              ).animate().scale(delay: 300.ms),
              const SizedBox(height: 32),
              const _LearningPromiseCard(),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuthBrandingPane extends StatelessWidget {
  const _AuthBrandingPane();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            theme.colorScheme.background,
            theme.colorScheme.surface.withOpacity(0.8),
            theme.colorScheme.secondary.withOpacity(0.1),
            theme.colorScheme.primary.withOpacity(0.2),
          ],
        ),
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(48),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                    Icons.auto_awesome,
                    size: 48,
                    color: theme.colorScheme.primary,
                  )
                  .animate(onPlay: (controller) => controller.repeat())
                  .shimmer(duration: 2000.ms, color: Colors.white),
              const SizedBox(height: 24),
              Text(
                'Compreenda musica de forma intuitiva.',
                style: theme.textTheme.displayMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'A plataforma ZURC inverte a ordem tradicional. Entenda a logica antes de focar na habilidade motora.',
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LearningPromiseCard extends StatelessWidget {
  const _LearningPromiseCard();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceVariant.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.surfaceVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'O que voce vai dominar',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 16),
          const _PromiseItem(
            icon: Icons.check_circle_outline,
            text: 'Notas e Cifras Americanas',
          ),
          const _PromiseItem(
            icon: Icons.check_circle_outline,
            text: 'Formacao de Escalas e Acordes',
          ),
          const _PromiseItem(
            icon: Icons.check_circle_outline,
            text: 'Campo Harmonico completo',
          ),
        ],
      ),
    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1);
  }
}

class _PromiseItem extends StatelessWidget {
  const _PromiseItem({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20, color: theme.colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
