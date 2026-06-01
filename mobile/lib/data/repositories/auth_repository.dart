import '../../domain/models/auth_models.dart';
import '../services/api_client.dart';

class AuthRepository {
  const AuthRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<AuthSession> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final json = await _apiClient.post(
      '/api/v1/auth/register',
      body: {'name': name, 'email': email, 'password': password},
    );
    final session = AuthSession.fromJson(json['data'] as Map<String, dynamic>);
    _apiClient.setToken(session.token);

    return session;
  }

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final json = await _apiClient.post(
      '/api/v1/auth/login',
      body: {'email': email, 'password': password},
    );
    final session = AuthSession.fromJson(json['data'] as Map<String, dynamic>);
    _apiClient.setToken(session.token);

    return session;
  }

  Future<AppUser> getMe() async {
    final json = await _apiClient.get('/api/v1/auth/me');
    return AppUser.fromJson(json['data'] as Map<String, dynamic>);
  }

  void signOut() {
    _apiClient.setToken(null);
  }
}
