import 'dart:io';
import 'package:csv/csv.dart';
import 'geo_locator.dart';

/// Parses PCAPdroid CSV exports into VPN log entries.
///
/// Auto-detects column headers from the first row, so it works
/// regardless of PCAPdroid version or column ordering.
class PcapImporter {
  /// Known tracker hostnames → company mapping (subset for on-device matching)
  static const Map<String, String> _hostnameToCompany = {
    'graph.facebook.com': 'Meta Platforms',
    'facebook.com': 'Meta Platforms',
    'fbcdn.net': 'Meta Platforms',
    'instagram.com': 'Meta Platforms',
    'whatsapp.net': 'Meta Platforms',
    'whatsapp.com': 'Meta Platforms',
    'app-measurement.com': 'Google (Alphabet)',
    'google-analytics.com': 'Google (Alphabet)',
    'googleapis.com': 'Google (Alphabet)',
    'googleadservices.com': 'Google (Alphabet)',
    'doubleclick.net': 'Google (Alphabet)',
    'googlesyndication.com': 'Google (Alphabet)',
    'crashlytics.com': 'Google (Alphabet)',
    'firebaseio.com': 'Google (Alphabet)',
    'amazonaws.com': 'Amazon.com Inc.',
    'amazon-adsystem.com': 'Amazon.com Inc.',
    'microsoft.com': 'Microsoft Corporation',
    'appcenter.ms': 'Microsoft Corporation',
    'tiktokv.com': 'ByteDance',
    'bytedance.com': 'ByteDance',
    'tiktokcdn.com': 'ByteDance',
    'appsflyer.com': 'AppsFlyer',
    'adjust.com': 'Adjust',
    'branch.io': 'Branch',
    'unity3d.com': 'Unity Technologies',
    'inmobi.com': 'InMobi',
    'clevertap.com': 'CleverTap',
    'criteo.com': 'Criteo',
    'taboola.com': 'Taboola',
    'applovin.com': 'AppLovin',
    'flurry.com': 'Flurry (Yahoo)',
    'comscore.com': 'comScore',
    'scorecardresearch.com': 'comScore',
    'twitter.com': 'X Corp',
    'x.com': 'X Corp',
    'snapchat.com': 'Snap Inc.',
    'snap.com': 'Snap Inc.',
    'truecaller.com': 'Truecaller',
    'bluekai.com': 'Oracle BlueKai',
    'oracle.com': 'Oracle BlueKai',
    'mopub.com': 'X Corp',
    'chartboost.com': 'AppLovin',
  };

  /// Import a PCAPdroid CSV file and convert to VPN log entries.
  ///
  /// Returns a list of maps matching the VpnLogEntry schema.
  static Future<List<Map<String, dynamic>>> importCsv(String filePath) async {
    final file = File(filePath);
    if (!await file.exists()) {
      throw FileSystemException('CSV file not found', filePath);
    }

    final csvString = await file.readAsString();
    final rows = const CsvToListConverter(eol: '\n').convert(csvString);

    if (rows.isEmpty) return [];

    // First row = headers — auto-detect column mapping
    final headers = rows.first.map((h) => h.toString().trim().toLowerCase()).toList();
    final colMap = _buildColumnMap(headers);

    final entries = <Map<String, dynamic>>[];

    for (var i = 1; i < rows.length; i++) {
      final row = rows[i];
      if (row.length < 3) continue; // skip malformed rows

      final entry = _parseRow(row, colMap);
      if (entry != null) {
        entries.add(entry);
      }
    }

    return entries;
  }

  /// Build a flexible column map from headers.
  /// Handles various PCAPdroid CSV formats.
  static Map<String, int> _buildColumnMap(List<String> headers) {
    final map = <String, int>{};

    for (var i = 0; i < headers.length; i++) {
      final h = headers[i].replaceAll('#', '').trim();

      // Timestamp variations
      if (h.contains('timestamp') || h.contains('time') || h.contains('date')) {
        map['timestamp'] ??= i;
      }
      // App name
      if (h.contains('app') || h.contains('application') || h.contains('uid_name')) {
        map['app'] ??= i;
      }
      // Destination IP
      if (h.contains('dst_ip') || h.contains('dest_ip') || h.contains('destination_ip') ||
          (h.contains('dst') && h.contains('ip'))) {
        map['dst_ip'] ??= i;
      }
      // Destination port
      if (h.contains('dst_port') || h.contains('dest_port') || h.contains('destination_port') ||
          (h.contains('dst') && h.contains('port'))) {
        map['dst_port'] ??= i;
      }
      // Hostname / domain / info / SNI
      if (h.contains('host') || h.contains('domain') || h.contains('info') ||
          h.contains('sni') || h.contains('server_name')) {
        map['hostname'] ??= i;
      }
      // Protocol
      if (h == 'protocol' || h == 'proto' || h == 'l7proto') {
        map['protocol'] ??= i;
      }
      // Country
      if (h.contains('country') || h.contains('geo') || h.contains('location')) {
        map['country'] ??= i;
      }
      // Bytes sent
      if (h.contains('bytes_sent') || h.contains('sent_bytes') || h.contains('tx_bytes') ||
          (h.contains('sent') && h.contains('byte'))) {
        map['bytes_sent'] ??= i;
      }
      // Bytes received
      if (h.contains('bytes_rcvd') || h.contains('rcvd_bytes') || h.contains('rx_bytes') ||
          h.contains('bytes_received') ||
          (h.contains('rcv') && h.contains('byte'))) {
        map['bytes_rcvd'] ??= i;
      }
      // Total bytes (if separate sent/rcvd not available)
      if (h == 'bytes' || h == 'total_bytes' || h == 'size') {
        map['total_bytes'] ??= i;
      }
    }

    return map;
  }

  /// Parse a single CSV row into a VPN log entry map.
  static Map<String, dynamic>? _parseRow(List<dynamic> row, Map<String, int> colMap) {
    String getCol(String key) {
      final idx = colMap[key];
      if (idx == null || idx >= row.length) return '';
      return row[idx].toString().trim();
    }

    final hostname = getCol('hostname');
    final dstIp = getCol('dst_ip');
    final app = getCol('app');
    final timestampStr = getCol('timestamp');
    final country = getCol('country');

    // Skip if no useful destination info
    if (hostname.isEmpty && dstIp.isEmpty) return null;

    // Skip local/private IPs
    if (dstIp.startsWith('10.') || dstIp.startsWith('192.168.') ||
        dstIp.startsWith('172.16.') || dstIp.startsWith('127.')) {
      return null;
    }

    // Identify the tracker company
    final company = _identifyCompany(hostname.isNotEmpty ? hostname : dstIp);
    final isTracker = company != 'Unknown';

    // Parse timestamp → extract hour of day
    int hourOfDay = 0;
    DateTime? timestamp;
    try {
      timestamp = DateTime.parse(timestampStr);
      hourOfDay = timestamp.hour;
    } catch (_) {
      // Try other formats
      try {
        // PCAPdroid sometimes uses "YYYY-MM-DD HH:mm:ss" format
        final parts = timestampStr.split(' ');
        if (parts.length >= 2) {
          final timeParts = parts[1].split(':');
          hourOfDay = int.tryParse(timeParts[0]) ?? 0;
        }
      } catch (_) {}
    }

    // Calculate bytes
    final bytesSent = int.tryParse(getCol('bytes_sent')) ?? 0;
    final bytesRcvd = int.tryParse(getCol('bytes_rcvd')) ?? 0;
    final totalBytes = int.tryParse(getCol('total_bytes')) ?? (bytesSent + bytesRcvd);

    // Geo-locate
    final effectiveHostname = hostname.isNotEmpty ? hostname : dstIp;
    final geo = GeoLocator.locateAsMap(effectiveHostname, country);

    // Determine if user was likely active (6AM - midnight)
    final userWasActive = hourOfDay >= 6 && hourOfDay < 24;

    return {
      'timestamp': timestamp?.toUtc().toIso8601String() ??
          DateTime.now().toUtc().toIso8601String(),
      'source_app': app,
      'source_app_name': _cleanAppName(app),
      'destination_host': hostname.isNotEmpty ? hostname : dstIp,
      'destination_ip': dstIp,
      'destination_company': company,
      'destination_purpose': isTracker ? 'Analytics / Advertising' : 'General',
      'destination_country': geo['country'] ?? country,
      'destination_city': geo['city'] ?? 'Unknown',
      'destination_lat': geo['lat'] ?? 0.0,
      'destination_lng': geo['lng'] ?? 0.0,
      'bytes_transferred': totalBytes > 0 ? totalBytes : 100,
      'is_tracker': isTracker,
      'hour_of_day': hourOfDay,
      'user_was_active': userWasActive,
    };
  }

  /// Match hostname to a known tracker company.
  static String _identifyCompany(String hostname) {
    // Direct match
    if (_hostnameToCompany.containsKey(hostname)) {
      return _hostnameToCompany[hostname]!;
    }

    // Suffix match
    for (final entry in _hostnameToCompany.entries) {
      if (hostname.endsWith('.${entry.key}') || hostname.contains(entry.key)) {
        return entry.value;
      }
    }

    return 'Unknown';
  }

  /// Clean up app package names for display.
  /// "com.whatsapp" → "WhatsApp", "com.instagram.android" → "Instagram"
  static String _cleanAppName(String packageOrName) {
    if (packageOrName.isEmpty) return 'Unknown App';

    // If it doesn't look like a package name, return as-is
    if (!packageOrName.contains('.')) return packageOrName;

    // Extract last meaningful part
    final parts = packageOrName.split('.');
    // Skip common prefixes/suffixes
    final skip = {'com', 'org', 'net', 'android', 'app', 'lite', 'beta'};
    final meaningful = parts.where((p) => !skip.contains(p.toLowerCase())).toList();

    if (meaningful.isEmpty) return packageOrName;

    // Capitalize
    final name = meaningful.last;
    return name[0].toUpperCase() + name.substring(1);
  }

  /// Get import statistics for display
  static Map<String, dynamic> getStats(List<Map<String, dynamic>> entries) {
    final companies = entries
        .where((e) => e['is_tracker'] == true)
        .map((e) => e['destination_company'])
        .toSet();
    final countries = entries.map((e) => e['destination_country']).toSet();
    final totalBytes = entries.fold<int>(
      0, (sum, e) => sum + (e['bytes_transferred'] as int? ?? 0));
    final trackerEntries = entries.where((e) => e['is_tracker'] == true).length;
    final sleepEntries = entries
        .where((e) => (e['hour_of_day'] as int) < 6 || (e['hour_of_day'] as int) >= 23)
        .length;

    return {
      'total_connections': entries.length,
      'tracker_connections': trackerEntries,
      'unique_companies': companies.length,
      'unique_countries': countries.length,
      'total_bytes': totalBytes,
      'sleeping_connections': sleepEntries,
      'company_list': companies.toList(),
    };
  }
}
