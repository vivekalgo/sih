import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/risk_model.dart';

class PrivacyApiService {
  final String baseUrl;

  // Connected to live Render Backend
  PrivacyApiService({this.baseUrl = 'https://sih-wn3v.onrender.com'});

  Future<UploadResultModel> uploadDocument(File file, {String maskingMode = 'TOKEN', String purpose = 'General Sharing'}) async {
    final uri = Uri.parse('$baseUrl/api/upload');
    final request = http.MultipartRequest('POST', uri);
    
    request.fields['masking_mode'] = maskingMode;
    request.fields['purpose'] = purpose;
    request.files.add(await http.MultipartFile.fromPath('file', file.path));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      final jsonMap = jsonDecode(utf8.decode(response.bodyBytes));
      return UploadResultModel.fromJson(jsonMap);
    } else {
      throw Exception('Upload failed with status code ${response.statusCode}: ${response.body}');
    }
  }

  Future<void> purgeMemory() async {
    final uri = Uri.parse('$baseUrl/api/purge');
    await http.post(uri);
  }
}
