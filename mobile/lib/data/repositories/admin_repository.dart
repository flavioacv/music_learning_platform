import '../../domain/models/admin_models.dart';
import '../services/api_client.dart';

class AdminRepository {
  const AdminRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<AdminOverview> getOverview() async {
    final json = await _apiClient.get('/api/v1/admin/overview');
    return AdminOverview.fromJson(json['data'] as Map<String, dynamic>);
  }
}
