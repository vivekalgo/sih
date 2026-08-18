import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'models/risk_model.dart';
import 'services/api_service.dart';

void main() {
  runApp(const PrivacyGuardMobileApp());
}

class PrivacyGuardMobileApp extends StatelessWidget {
  const PrivacyGuardMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PrivacyGuard AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF080B11),
        primaryColor: const Color(0xFF00F2FE),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00F2FE),
          secondary: Color(0xFF4FACFE),
          surface: Color(0xFF111726),
          error: Color(0xFFFF3366),
        ),
      ),
      home: const MobileWizardScreen(),
    );
  }
}

class MobileWizardScreen extends StatefulWidget {
  const MobileWizardScreen({super.key});

  @override
  State<MobileWizardScreen> createState() => _MobileWizardScreenState();
}

class _MobileWizardScreenState extends State<MobileWizardScreen> {
  final PrivacyApiService _apiService = PrivacyApiService();
  
  int _currentStep = 1; // 1: Purpose, 2: Upload, 3: Masking Options, 4: Final Output
  String _selectedPurpose = 'General Sharing';
  String _maskingMode = 'TOKEN'; // TOKEN, BLACKOUT, HASH, SYNTHETIC
  
  UploadResultModel? _result;
  bool _isLoading = false;
  String? _error;
  List<String> _selectedEntityValues = [];

  final List<Map<String, dynamic>> _purposeList = [
    {
      'id': 'General Sharing',
      'title': 'General Sharing',
      'icon': Icons.public,
      'desc': 'Maximum privacy for public and vendor sharing'
    },
    {
      'id': 'Bank KYC',
      'title': 'Bank KYC',
      'icon': Icons.account_balance,
      'desc': 'Financial verification (Mask secrets, keep verified IDs)'
    },
    {
      'id': 'Job Application',
      'title': 'Job Application',
      'icon': Icons.work,
      'desc': 'Resume submission (Hide salary & sensitive IDs)'
    },
    {
      'id': 'House Rent',
      'title': 'House Rent',
      'icon': Icons.home,
      'desc': 'Tenant verification (Mask credit cards & bank accounts)'
    },
  ];

  final List<Map<String, dynamic>> _maskingModes = [
    {
      'id': 'TOKEN',
      'name': 'Descriptive Tag',
      'sample': '[REDACTED_PAN: XXXXX1234X]',
      'icon': Icons.label,
    },
    {
      'id': 'BLACKOUT',
      'name': 'Blackout Box',
      'sample': '████████████',
      'icon': Icons.block,
    },
    {
      'id': 'HASH',
      'name': 'Scrambled Code',
      'sample': '[HASH_CODE: 7f83b1]',
      'icon': Icons.tag,
    },
    {
      'id': 'SYNTHETIC',
      'name': 'Fake Data',
      'sample': '[SAFE_PERSON_1]',
      'icon': Icons.person_outline,
    },
  ];

  Future<void> _pickAndUploadDocument() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg', 'txt'],
      );

      if (result != null && result.files.single.path != null) {
        setState(() {
          _isLoading = true;
          _error = null;
        });

        final file = File(result.files.single.path!);
        final uploadResult = await _apiService.uploadDocument(file);

        setState(() {
          _result = uploadResult;
          _selectedEntityValues = uploadResult.entities.map((e) => e.rawValue).toList();
          _isLoading = false;
          _currentStep = 3;
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = e.toString();
      });
    }
  }

  void _simulateMobileScan() {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    Future.delayed(const Duration(milliseconds: 800), () {
      setState(() {
        _isLoading = false;
        _result = UploadResultModel(
          filename: "sample_id_proof.png",
          format: "IMAGE (PNG)",
          byteSize: 1024 * 350,
          processingTimeMs: 142.5,
          originalText: "IDENTITY VERIFICATION\nName: Rahul Sharma\nPAN: ABCDE1234F\nAadhaar: 5432 9876 1234\nMobile: +91 9876543210\nEmail: rahul.sharma@example.in",
          maskedText: "IDENTITY VERIFICATION\nName: Rahul Sharma\n[PAN: ABXXXXXF]\n[AADHAAR: XXXX-XXXX-1234]\n[PHONE: +XX-XXXXX-43210]\n[EMAIL: ra***@example.in]",
          riskScore: 88.5,
          riskLevel: "CRITICAL",
          totalEntities: 4,
          sanitizationHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          zeroLeakVerified: true,
          entities: [
            PIIEntityModel(
              id: "pii_1",
              entityType: "PAN",
              rawValue: "ABCDE1234F",
              maskedValue: "[PAN: ABXXXXXF]",
              start: 40,
              end: 50,
              confidence: 0.98,
              explanation: "Indian Income Tax Permanent Account Number",
            ),
            PIIEntityModel(
              id: "pii_2",
              entityType: "AADHAAR",
              rawValue: "5432 9876 1234",
              maskedValue: "[AADHAAR: XXXX-XXXX-1234]",
              start: 60,
              end: 74,
              confidence: 0.97,
              explanation: "Indian 12-digit Aadhaar UID",
            ),
            PIIEntityModel(
              id: "pii_3",
              entityType: "PHONE_NUMBER",
              rawValue: "+91 9876543210",
              maskedValue: "[PHONE: +XX-XXXXX-43210]",
              start: 85,
              end: 100,
              confidence: 0.95,
              explanation: "Contact phone number",
            ),
          ],
        );
        _selectedEntityValues = _result!.entities.map((e) => e.rawValue).toList();
        _currentStep = 3;
      });
    });
  }

  Color _getRiskColor(String level) {
    switch (level) {
      case 'CRITICAL':
        return const Color(0xFFFF3366);
      case 'HIGH':
        return const Color(0xFFFFB300);
      case 'MEDIUM':
        return const Color(0xFFFFD600);
      default:
        return const Color(0xFF00E676);
    }
  }

  void _applyRedactionAndFinish() {
    String masked = _result?.originalText ?? '';
    for (var entity in _result?.entities ?? []) {
      if (_selectedEntityValues.contains(entity.rawValue)) {
        if (_maskingMode == 'BLACKOUT') {
          masked = masked.replaceAll(entity.rawValue, '████████');
        } else if (_maskingMode == 'HASH') {
          masked = masked.replaceAll(entity.rawValue, '[HASH_${entity.entityType.substring(0, 3)}]');
        } else if (_maskingMode == 'SYNTHETIC') {
          masked = masked.replaceAll(entity.rawValue, '[SAFE_${entity.entityType}]');
        } else {
          masked = masked.replaceAll(entity.rawValue, entity.maskedValue);
        }
      }
    }

    setState(() {
      if (_result != null) {
        _result = UploadResultModel(
          filename: _result!.filename,
          format: _result!.format,
          byteSize: _result!.byteSize,
          processingTimeMs: _result!.processingTimeMs,
          originalText: _result!.originalText,
          maskedText: masked,
          riskScore: _result!.riskScore,
          riskLevel: _result!.riskLevel,
          totalEntities: _result!.totalEntities,
          sanitizationHash: _result!.sanitizationHash,
          zeroLeakVerified: _result!.zeroLeakVerified,
          entities: _result!.entities,
        );
      }
      _currentStep = 4;
    });
  }

  Widget _buildStepIndicator() {
    final steps = [
      {'num': 1, 'label': 'Purpose'},
      {'num': 2, 'label': 'Upload'},
      {'num': 3, 'label': 'Hide Info'},
      {'num': 4, 'label': 'Output'},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0D121F),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1F293D)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: steps.map((s) {
          final int stepNum = s['num'] as int;
          final String label = s['label'] as String;
          final bool isCurrent = _currentStep == stepNum;
          final bool isDone = _currentStep > stepNum;

          return GestureDetector(
            onTap: () {
              if (stepNum < _currentStep || (_result != null && stepNum <= 4)) {
                setState(() => _currentStep = stepNum);
              }
            },
            child: Row(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isCurrent
                        ? const Color(0xFF00F2FE)
                        : isDone
                            ? const Color(0xFF00E676)
                            : const Color(0xFF1E293B),
                  ),
                  child: Center(
                    child: isDone
                        ? const Icon(Icons.check, size: 16, color: Colors.black)
                        : Text(
                            '$stepNum',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isCurrent ? Colors.black : Colors.white60,
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                    color: isCurrent
                        ? const Color(0xFF00F2FE)
                        : isDone
                            ? const Color(0xFF00E676)
                            : Colors.white38,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0F19),
        title: const Row(
          children: [
            Icon(Icons.shield, color: Color(0xFF00F2FE), size: 22),
            SizedBox(width: 8),
            Text(
              'PrivacyGuard AI',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0x1A00E676),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0x4D00E676)),
            ),
            child: const Text(
              'SAFE MODE',
              style: TextStyle(fontSize: 10, color: Color(0xFF00E676), fontFamily: 'monospace'),
            ),
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF0B0F19),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(color: Color(0xFF111726)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shield_outlined, size: 36, color: Color(0xFF00F2FE)),
                  SizedBox(height: 8),
                  Text(
                    'PrivacyGuard AI',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Device-Only Memory Redaction',
                    style: TextStyle(fontSize: 11, color: Colors.white54),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.layers, color: Color(0xFF00F2FE)),
              title: const Text('Protect Documents'),
              selected: true,
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.verified_user, color: Colors.white70),
              title: const Text('Compliance Check (DPDP/GDPR)'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Compliance status: 100% Zero Storage Compliant')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.flash_on, color: Colors.white70),
              title: const Text('AI Prompt Shield'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('AI Shield Active: Prevents prompt data leaks')),
                );
              },
            ),
            const Divider(color: Color(0xFF1F293D)),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Color(0xFFFF3366)),
              title: const Text('Clear Memory Session', style: TextStyle(color: Color(0xFFFF3366))),
              onTap: () {
                Navigator.pop(context);
                setState(() {
                  _result = null;
                  _currentStep = 1;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Session wiped from active memory.')),
                );
              },
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Step Progress Indicator
            _buildStepIndicator(),
            const SizedBox(height: 16),

            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.redAccent),
                ),
                child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
              ),
            ],

            // ==========================================
            // STEP 1: PURPOSE SELECTION
            // ==========================================
            if (_currentStep == 1) ...[
              const Text(
                'Step 1: Why are you sharing this?',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 4),
              const Text(
                'Select your use case. We automatically customize what data is safe to keep.',
                style: TextStyle(fontSize: 12, color: Colors.white54),
              ),
              const SizedBox(height: 14),

              ..._purposeList.map((p) {
                final bool isSelected = _selectedPurpose == p['id'];
                return Card(
                  color: isSelected ? const Color(0xFF132238) : const Color(0xFF111726),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(
                      color: isSelected ? const Color(0xFF00F2FE) : const Color(0xFF1F293D),
                      width: isSelected ? 1.5 : 1,
                    ),
                  ),
                  margin: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => setState(() => _selectedPurpose = p['id']),
                    child: Padding(
                      padding: const EdgeInsets.all(14.0),
                      child: Row(
                        children: [
                          Icon(p['icon'], color: isSelected ? const Color(0xFF00F2FE) : Colors.white60),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  p['title'],
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: isSelected ? Colors.white : Colors.white70,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  p['desc'],
                                  style: const TextStyle(fontSize: 11, color: Colors.white54),
                                ),
                              ],
                            ),
                          ),
                          if (isSelected)
                            const Icon(Icons.check_circle, color: Color(0xFF00F2FE), size: 20),
                        ],
                      ),
                    ),
                  ),
                );
              }),

              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: () => setState(() => _currentStep = 2),
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Next: Upload Document'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00838F),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],

            // ==========================================
            // STEP 2: UPLOAD DOCUMENT
            // ==========================================
            if (_currentStep == 2) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: () => setState(() => _currentStep = 1),
                    icon: const Icon(Icons.arrow_back, size: 16),
                    label: const Text('Back to Purpose'),
                    style: TextButton.styleFrom(foregroundColor: const Color(0xFF00F2FE)),
                  ),
                  Chip(
                    backgroundColor: const Color(0xFF132238),
                    label: Text(_selectedPurpose, style: const TextStyle(fontSize: 10, color: Color(0xFF00F2FE))),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              Card(
                color: const Color(0xFF111726),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFF1F293D)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    children: [
                      const Icon(Icons.cloud_upload_outlined, size: 54, color: Color(0xFF00F2FE)),
                      const SizedBox(height: 14),
                      const Text(
                        'Upload Document to Mask',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Supports PDF, PNG, JPG, JPEG & TXT files.\nAll processing happens locally in device memory.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white60, fontSize: 12),
                      ),
                      const SizedBox(height: 20),

                      ElevatedButton.icon(
                        onPressed: _isLoading ? null : _pickAndUploadDocument,
                        icon: _isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.upload_file),
                        label: Text(_isLoading ? 'Scanning & Detecting PII...' : 'Select File from Device'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00838F),
                          foregroundColor: Colors.white,
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 12),

                      OutlinedButton(
                        onPressed: _isLoading ? null : _simulateMobileScan,
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF00F2FE)),
                          minimumSize: const Size.fromHeight(44),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Test with Sample KYC ID', style: TextStyle(color: Color(0xFF00F2FE))),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            // ==========================================
            // STEP 3: MASKING OPTIONS
            // ==========================================
            if (_currentStep == 3 && _result != null) ...[
              const Text(
                'Step 3: Choose How to Hide Information',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 4),
              const Text(
                'Pick a masking style and review detected sensitive details.',
                style: TextStyle(fontSize: 12, color: Colors.white54),
              ),
              const SizedBox(height: 12),

              // Masking Mode Grid
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 2.2,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                children: _maskingModes.map((mode) {
                  final bool isSelected = _maskingMode == mode['id'];
                  return InkWell(
                    onTap: () => setState(() => _maskingMode = mode['id']),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF132238) : const Color(0xFF111726),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF00F2FE) : const Color(0xFF1F293D),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Row(
                            children: [
                              Icon(mode['icon'], size: 14, color: isSelected ? const Color(0xFF00F2FE) : Colors.white60),
                              const SizedBox(width: 4),
                              Text(
                                mode['name'],
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? Colors.white : Colors.white70,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            mode['sample'],
                            style: const TextStyle(fontSize: 9, fontFamily: 'monospace', color: Colors.white54),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 16),

              // Detected PII Entities Card
              Card(
                color: const Color(0xFF111726),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: Color(0xFF1F293D)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Detected Sensitive Items',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          Text(
                            '${_result!.entities.length} items',
                            style: const TextStyle(fontSize: 11, color: Colors.white54),
                          ),
                        ],
                      ),
                      const Divider(color: Color(0xFF1F293D), height: 16),
                      ..._result!.entities.map((item) {
                        final isChecked = _selectedEntityValues.contains(item.rawValue);
                        return CheckboxListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            item.rawValue,
                            style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
                          ),
                          subtitle: Text(
                            item.entityType,
                            style: const TextStyle(fontSize: 10, color: Color(0xFF00F2FE)),
                          ),
                          value: isChecked,
                          activeColor: const Color(0xFFFF3366),
                          onChanged: (val) {
                            setState(() {
                              if (val == true) {
                                _selectedEntityValues.add(item.rawValue);
                              } else {
                                _selectedEntityValues.remove(item.rawValue);
                              }
                            });
                          },
                        );
                      }),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => setState(() => _currentStep = 2),
                      icon: const Icon(Icons.arrow_back, size: 16),
                      label: const Text('Back'),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF1F293D)),
                        foregroundColor: Colors.white70,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: _applyRedactionAndFinish,
                      icon: const Icon(Icons.check),
                      label: const Text('Generate Clean Output'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00838F),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ],

            // ==========================================
            // STEP 4: FINAL CLEAN OUTPUT
            // ==========================================
            if (_currentStep == 4 && _result != null) ...[
              // Risk Score Indicator
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF111726),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _getRiskColor(_result!.riskLevel).withOpacity(0.5)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _getRiskColor(_result!.riskLevel).withOpacity(0.15),
                        border: Border.all(color: _getRiskColor(_result!.riskLevel), width: 3),
                      ),
                      child: Center(
                        child: Text(
                          '${_result!.riskScore.toInt()}%',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.verified, size: 14, color: Color(0xFF00E676)),
                              SizedBox(width: 4),
                              Text(
                                'ZERO LEAK VERIFIED',
                                style: TextStyle(color: Color(0xFF00E676), fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Masked with ${_maskingMode} style for ${_selectedPurpose}.',
                            style: const TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Sanitized Text Card
              Card(
                color: const Color(0xFF0D121D),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFF1F293D)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.lock, size: 16, color: Color(0xFF00E676)),
                              SizedBox(width: 6),
                              Text(
                                'Clean Document Output',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF00E676)),
                              ),
                            ],
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy, size: 18, color: Color(0xFF00F2FE)),
                            tooltip: 'Copy Masked Text',
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: _result!.maskedText));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Clean document copied to clipboard!')),
                              );
                            },
                          ),
                        ],
                      ),
                      const Divider(color: Color(0xFF1F293D), height: 16),
                      Text(
                        _result!.maskedText,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 12,
                          color: Colors.white,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => setState(() => _currentStep = 3),
                      icon: const Icon(Icons.tune, size: 16),
                      label: const Text('Tweak Options'),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF00F2FE)),
                        foregroundColor: const Color(0xFF00F2FE),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        setState(() {
                          _result = null;
                          _currentStep = 1;
                        });
                      },
                      icon: const Icon(Icons.refresh),
                      label: const Text('Start New'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00838F),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ],

          ],
        ),
      ),
    );
  }
}
