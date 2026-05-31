import 'package:flutter/material.dart';

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
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: ResponsiveContent(
          maxWidth: 640,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.graphic_eq, color: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Music Learning Platform',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 36),
              Text(
                _isCreatingAccount ? 'Criar conta' : 'Entrar',
                style: theme.textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Aprenda musica por compreensao, pratica visual e feedback imediato.',
                style: theme.textTheme.bodyLarge,
              ),
              const SizedBox(height: 28),
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
              const SizedBox(height: 20),
              if (_isCreatingAccount) ...[
                TextField(
                  controller: _nameController,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Nome',
                    prefixIcon: Icon(Icons.person),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Senha',
                  prefixIcon: Icon(Icons.lock),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.help_outline),
                  label: const Text('Recuperar senha'),
                ),
              ),
              const SizedBox(height: 8),
              if (_errorMessage != null) ...[
                Text(
                  _errorMessage!,
                  style: TextStyle(color: theme.colorScheme.error),
                ),
                const SizedBox(height: 12),
              ],
              FilledButton.icon(
                onPressed: _isLoading ? null : _submit,
                icon: _isLoading
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(_isCreatingAccount ? Icons.person_add : Icons.login),
                label: Text(_isCreatingAccount ? 'Comecar agora' : 'Entrar'),
              ),
              const SizedBox(height: 24),
              _LearningPromiseCard(theme: theme),
            ],
          ),
        ),
      ),
    );
  }
}

class _LearningPromiseCard extends StatelessWidget {
  const _LearningPromiseCard({required this.theme});

  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Primeiros 7 dias',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            const _PromiseItem(
              icon: Icons.check_circle,
              text: 'Identificar notas e cifras',
            ),
            const _PromiseItem(
              icon: Icons.check_circle,
              text: 'Entender escalas e acordes',
            ),
            const _PromiseItem(
              icon: Icons.check_circle,
              text: 'Praticar em exercicios interativos',
            ),
          ],
        ),
      ),
    );
  }
}

class _PromiseItem extends StatelessWidget {
  const _PromiseItem({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
