import 'dart:convert';
import 'package:flutter/services.dart';

/// Dart-side wrapper for the Kotlin platform channel.
/// Calls into Android's PackageManager via MethodChannel.
class PackageScanner {
  static const _channel = MethodChannel('com.consenttheater/scanner');

  /// Returns a list of installed non-system apps with their permissions.
  /// Each entry: { packageName, appName, permissions[] }
  Future<List<Map<String, dynamic>>> getInstalledApps() async {
    try {
      final String result = await _channel.invokeMethod('getInstalledApps');
      final List<dynamic> decoded = json.decode(result);
      return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
    } on PlatformException catch (e) {
      throw Exception('Failed to scan apps: ${e.message}');
    }
  }

  /// Returns device info: { model, manufacturer, androidVersion, sdkVersion }
  Future<Map<String, String>> getDeviceInfo() async {
    try {
      final String result = await _channel.invokeMethod('getDeviceInfo');
      final Map<String, dynamic> decoded = json.decode(result);
      return decoded.map((k, v) => MapEntry(k, v.toString()));
    } on PlatformException catch (e) {
      throw Exception('Failed to get device info: ${e.message}');
    }
  }
}
