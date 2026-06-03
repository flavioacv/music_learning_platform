const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://127.0.0.1:3333',
);

const adminEmailsConfig = String.fromEnvironment('ADMIN_EMAILS');

bool isAdminEmail(String email) {
  final normalizedEmail = email.trim().toLowerCase();
  return adminEmailsConfig
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .where((item) => item.isNotEmpty)
      .contains(normalizedEmail);
}
