import 'package:flutter_test/flutter_test.dart';
import 'package:music_learning_platform/domain/models/auth_models.dart';
import 'package:music_learning_platform/main.dart';

void main() {
  testWidgets('student can open practice from signed in state', (tester) async {
    await tester.pumpWidget(
      const MusicLearningApp(
        initialUser: AppUser(
          id: 'test-user',
          name: 'Ana',
          email: 'ana@example.com',
          level: 1,
          xp: 0,
        ),
      ),
    );

    expect(find.text('Ola, Ana'), findsOneWidget);
    expect(find.text('Continuar aprendendo'), findsOneWidget);

    await tester.tap(find.text('Pratica'));
    await tester.pumpAndSettle();

    expect(
      find.text('Identifique a cifra americana da nota apresentada.'),
      findsOneWidget,
    );
    expect(find.text('Do'), findsOneWidget);
  });
}
