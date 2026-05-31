class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.level,
    required this.xp,
    this.avatarUrl,
  });

  final String id;
  final String name;
  final String email;
  final int level;
  final int xp;
  final String? avatarUrl;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      level: json['level'] as int,
      xp: json['xp'] as int,
      avatarUrl: json['avatar_url'] as String?,
    );
  }
}

class AuthSession {
  const AuthSession({required this.user, required this.token});

  final AppUser user;
  final String token;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      user: AppUser.fromJson(json['user'] as Map<String, dynamic>),
      token: json['token'] as String,
    );
  }
}
