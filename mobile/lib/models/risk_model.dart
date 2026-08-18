class PIIEntityModel {
  final String id;
  final String entityType;
  final String rawValue;
  final String maskedValue;
  final int start;
  final int end;
  final double confidence;
  final String explanation;

  PIIEntityModel({
    required this.id,
    required this.entityType,
    required this.rawValue,
    required this.maskedValue,
    required this.start,
    required this.end,
    required this.confidence,
    required this.explanation,
  });

  factory PIIEntityModel.fromJson(Map<String, dynamic> json) {
    return PIIEntityModel(
      id: json['id'] ?? '',
      entityType: json['entity_type'] ?? '',
      rawValue: json['raw_value'] ?? '',
      maskedValue: json['masked_value'] ?? '',
      start: json['start'] ?? 0,
      end: json['end'] ?? 0,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      explanation: json['explanation'] ?? '',
    );
  }
}

class UploadResultModel {
  final String filename;
  final String format;
  final int byteSize;
  final double processingTimeMs;
  final String originalText;
  final String maskedText;
  final double riskScore;
  final String riskLevel;
  final int totalEntities;
  final String sanitizationHash;
  final bool zeroLeakVerified;
  final List<PIIEntityModel> entities;

  UploadResultModel({
    required this.filename,
    required this.format,
    required this.byteSize,
    required this.processingTimeMs,
    required this.originalText,
    required this.maskedText,
    required this.riskScore,
    required this.riskLevel,
    required this.totalEntities,
    required this.sanitizationHash,
    required this.zeroLeakVerified,
    required this.entities,
  });

  factory UploadResultModel.fromJson(Map<String, dynamic> json) {
    final risk = json['risk_assessment'] ?? {};
    final entitiesList = (risk['entities'] as List? ?? [])
        .map((e) => PIIEntityModel.fromJson(e))
        .toList();

    return UploadResultModel(
      filename: json['filename'] ?? '',
      format: json['format'] ?? '',
      byteSize: json['byte_size'] ?? 0,
      processingTimeMs: (json['processing_time_ms'] as num?)?.toDouble() ?? 0.0,
      originalText: json['original_text'] ?? '',
      maskedText: json['masked_text'] ?? '',
      riskScore: (risk['risk_score'] as num?)?.toDouble() ?? 0.0,
      riskLevel: risk['risk_level'] ?? 'LOW',
      totalEntities: risk['total_entities_found'] ?? 0,
      sanitizationHash: json['sanitization_hash'] ?? '',
      zeroLeakVerified: json['zero_leak_verified'] ?? false,
      entities: entitiesList,
    );
  }
}
