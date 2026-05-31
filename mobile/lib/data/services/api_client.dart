import 'package:dio/dio.dart';

import '../../config/api_config.dart';

class ApiException implements Exception {
  const ApiException(this.message, {required this.statusCode});

  final String message;
  final int statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({Dio? dio, String? baseUrl})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: baseUrl ?? apiBaseUrl,
              headers: {'Accept': 'application/json'},
              contentType: Headers.jsonContentType,
            ),
          );

  final Dio _dio;

  void setToken(String? token) {
    if (token == null) {
      _dio.options.headers.remove('Authorization');
      return;
    }

    _dio.options.headers['Authorization'] = 'Bearer $token';
  }

  Future<Map<String, dynamic>> get(String path) async {
    return _request(() => _dio.get<Object?>(path));
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    return _request(() => _dio.post<Object?>(path, data: body));
  }

  Future<Map<String, dynamic>> _request(
    Future<Response<Object?>> Function() request,
  ) async {
    try {
      final response = await request();
      return _asMap(response.data);
    } on DioException catch (error) {
      final response = error.response;
      final data = response?.data;
      String? message;
      if (data is Map<String, dynamic>) {
        final apiError = data['error'];
        if (apiError is Map<String, dynamic>) {
          message = apiError['message'] as String?;
        }
      }

      throw ApiException(
        message ?? 'Erro ao comunicar com a API.',
        statusCode: response?.statusCode ?? 0,
      );
    }
  }

  Map<String, dynamic> _asMap(Object? data) {
    if (data is Map<String, dynamic>) {
      return data;
    }

    throw const ApiException('Resposta invalida da API.', statusCode: 0);
  }
}
