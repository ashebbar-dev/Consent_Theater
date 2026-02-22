import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Local HTTP server for transferring scan data to the dashboard.
///
/// Serves the combined JSON on any GET request with CORS headers.
/// Shows a QR code + plain URL on the scanner UI.
/// Auto-stops after first successful download or 5-minute timeout.
class TransferServer {
  HttpServer? _server;
  Timer? _timeoutTimer;
  String? _jsonData;
  bool _isRunning = false;

  bool get isRunning => _isRunning;
  String? _serverUrl;
  String? get serverUrl => _serverUrl;

  /// Start serving the combined JSON data.
  ///
  /// Returns the URL (e.g., "http://192.168.1.5:8080") that the dashboard
  /// should fetch from. The QR code and URL text are displayed on the phone.
  Future<String> start(Map<String, dynamic> combinedData) async {
    if (_isRunning) {
      await stop();
    }

    _jsonData = const JsonEncoder.withIndent('  ').convert(combinedData);

    // Find the device's local IP address
    final ip = await _getLocalIp();
    const port = 8080;

    _server = await HttpServer.bind(InternetAddress.anyIPv4, port);
    _isRunning = true;
    _serverUrl = 'http://$ip:$port';

    // Listen for requests
    _server!.listen((HttpRequest request) async {
      // Add CORS headers so the dashboard can fetch from any origin
      request.response.headers
        ..add('Access-Control-Allow-Origin', '*')
        ..add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        ..add('Access-Control-Allow-Headers', 'Content-Type')
        ..contentType = ContentType.json;

      if (request.method == 'OPTIONS') {
        // CORS preflight
        request.response
          ..statusCode = 200
          ..close();
        return;
      }

      if (request.method == 'GET') {
        request.response
          ..statusCode = 200
          ..write(_jsonData)
          ..close();

        // Auto-stop after successful download (short delay for response to flush)
        Future.delayed(const Duration(seconds: 2), () => stop());
      } else {
        request.response
          ..statusCode = 405
          ..write('Method not allowed')
          ..close();
      }
    });

    // Auto-stop after 5 minutes
    _timeoutTimer = Timer(const Duration(minutes: 5), () {
      stop();
    });

    return _serverUrl!;
  }

  /// Stop the server and clean up.
  Future<void> stop() async {
    _timeoutTimer?.cancel();
    _timeoutTimer = null;
    await _server?.close(force: true);
    _server = null;
    _isRunning = false;
    _serverUrl = null;
    _jsonData = null;
  }

  /// Get the device's local WiFi IP address.
  static Future<String> _getLocalIp() async {
    try {
      final interfaces = await NetworkInterface.list(
        type: InternetAddressType.IPv4,
        includeLoopback: false,
      );

      // Prefer WiFi interface
      for (final iface in interfaces) {
        if (iface.name.toLowerCase().contains('wlan') ||
            iface.name.toLowerCase().contains('wifi') ||
            iface.name.toLowerCase().contains('en0')) {
          for (final addr in iface.addresses) {
            if (!addr.address.startsWith('127.')) {
              return addr.address;
            }
          }
        }
      }

      // Fallback: use any non-loopback interface
      for (final iface in interfaces) {
        for (final addr in iface.addresses) {
          if (!addr.address.startsWith('127.')) {
            return addr.address;
          }
        }
      }
    } catch (_) {}

    return '0.0.0.0'; // worst case
  }
}
