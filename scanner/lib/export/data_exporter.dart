import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:uuid/uuid.dart';
import '../scanner/exodus_tracker_matcher.dart';

/// Represents a fully analyzed app with trackers, permissions, and risk score.
class AnalyzedApp {
  final String packageName;
  final String appName;
  final List<String> allPermissions;
  final List<String> dangerousPermissions;
  final List<TrackerInfo> trackers;
  final int riskScore;

  AnalyzedApp({
    required this.packageName,
    required this.appName,
    required this.allPermissions,
    required this.dangerousPermissions,
    required this.trackers,
    required this.riskScore,
  });

  Map<String, dynamic> toJson() => {
    'package_name': packageName,
    'app_name': appName,
    'permissions': allPermissions,
    'dangerous_permissions': dangerousPermissions
        .map((p) => p.split('.').last)
        .toList(),
    'trackers': trackers.map((t) => t.toJson()).toList(),
    'tracker_count': trackers.length,
    'dangerous_permission_count': dangerousPermissions.length,
    'risk_score': riskScore,
  };
}

/// Builds the full ScanResult JSON and exports it.
class DataExporter {
  /// Build a complete scan result from the analyzed apps and device info.
  static Map<String, dynamic> buildScanResult({
    required List<AnalyzedApp> apps,
    required Map<String, String> deviceInfo,
  }) {
    final totalTrackers = apps.fold<int>(0, (sum, a) => sum + a.trackers.length);
    final totalDangerousPerms = apps.fold<int>(
      0, (sum, a) => sum + a.dangerousPermissions.length,
    );

    return {
      'scan_id': const Uuid().v4(),
      'device_model': '${deviceInfo["manufacturer"] ?? ""} ${deviceInfo["model"] ?? "Unknown"}'.trim(),
      'android_version': deviceInfo['androidVersion'] ?? 'Unknown',
      'scan_timestamp': DateTime.now().toUtc().toIso8601String(),
      'total_apps': apps.length,
      'total_trackers': totalTrackers,
      'total_dangerous_permissions': totalDangerousPerms,
      'apps': apps.map((a) => a.toJson()).toList(),
    };
  }

  /// Write the scan result to a JSON file in the app's documents directory.
  /// Returns the file path.
  static Future<String> writeToFile(Map<String, dynamic> scanResult) async {
    final dir = await getApplicationDocumentsDirectory();
    final scanDir = Directory('${dir.path}/ConsentTheater');
    if (!await scanDir.exists()) {
      await scanDir.create(recursive: true);
    }

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final file = File('${scanDir.path}/scan_result_$timestamp.json');
    final jsonStr = const JsonEncoder.withIndent('  ').convert(scanResult);
    await file.writeAsString(jsonStr);

    return file.path;
  }

  /// Share the scan result JSON file via the system share dialog.
  static Future<void> shareFile(String filePath) async {
    await Share.shareXFiles(
      [XFile(filePath)],
      subject: 'Consent Theater Scan Result',
      text: 'Scan result from Consent Theater privacy scanner',
    );
  }

  /// Get the JSON string for clipboard or direct use.
  static String toJsonString(Map<String, dynamic> scanResult) {
    return const JsonEncoder.withIndent('  ').convert(scanResult);
  }

  /// Build a combined export that bundles scan result + VPN log + contacts.
  /// This is the format the transfer server sends to the dashboard.
  static Map<String, dynamic> buildCombinedExport({
    required Map<String, dynamic> scanResult,
    List<Map<String, dynamic>> vpnLog = const [],
    List<Map<String, dynamic>> contacts = const [],
  }) {
    return {
      'format': 'consent-theater-combined',
      'version': '1.0',
      'exported_at': DateTime.now().toUtc().toIso8601String(),
      'scan_result': scanResult,
      'vpn_log': vpnLog,
      'contacts': contacts,
    };
  }

  /// Write the combined export to a file and return the path.
  static Future<String> writeCombinedToFile({
    required Map<String, dynamic> scanResult,
    List<Map<String, dynamic>> vpnLog = const [],
    List<Map<String, dynamic>> contacts = const [],
  }) async {
    final combined = buildCombinedExport(
      scanResult: scanResult,
      vpnLog: vpnLog,
      contacts: contacts,
    );

    final dir = await getApplicationDocumentsDirectory();
    final scanDir = Directory('${dir.path}/ConsentTheater');
    if (!await scanDir.exists()) {
      await scanDir.create(recursive: true);
    }

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final file = File('${scanDir.path}/combined_export_$timestamp.json');
    final jsonStr = const JsonEncoder.withIndent('  ').convert(combined);
    await file.writeAsString(jsonStr);

    return file.path;
  }
}
