import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../scanner/exodus_tracker_matcher.dart';
import '../scanner/permission_analyzer.dart';
import '../scanner/pcap_importer.dart';
import '../export/data_exporter.dart';
import '../export/transfer_server.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> with TickerProviderStateMixin {
  // Scanner state
  bool _isScanning = false;
  bool _scanComplete = false;
  String _statusMessage = 'Ready to scan';
  double _scanProgress = 0;
  int _appsScanned = 0;
  int _totalApps = 0;
  List<AnalyzedApp> _analyzedApps = [];
  Map<String, dynamic>? _scanResult;
  ExodusTrackerMatcher? _matcher;
  late AnimationController _pulseController;

  // VPN log (from PCAPdroid CSV import)
  List<Map<String, dynamic>> _vpnLog = [];
  bool _vpnLogImported = false;
  Map<String, dynamic>? _vpnStats;

  // Contacts
  List<Map<String, dynamic>> _contacts = [];
  bool _contactsLoaded = false;

  // Transfer server
  final TransferServer _transferServer = TransferServer();
  String? _transferUrl;

  // Export state
  String? _exportedFilePath;

  static const _channel = MethodChannel('com.consenttheater/scanner');

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _initMatcher();
  }

  Future<void> _initMatcher() async {
    setState(() => _statusMessage = 'Loading tracker database...');
    try {
      _matcher = ExodusTrackerMatcher();
      await _matcher!.init();
      setState(() => _statusMessage = 'Ready to scan');
    } catch (e) {
      setState(() => _statusMessage = 'Ready (offline mode — cached data only)');
    }
  }

  // ─── APP SCAN ───────────────────────────────────────────────
  Future<void> _startScan() async {
    if (_isScanning) return;
    setState(() {
      _isScanning = true;
      _scanComplete = false;
      _scanProgress = 0;
      _appsScanned = 0;
      _statusMessage = 'Querying installed apps...';
      _analyzedApps = [];
    });

    try {
      // Get installed apps from platform channel
      final String rawApps = await _channel.invokeMethod('getInstalledApps');
      final List<dynamic> apps = json.decode(rawApps);
      final String rawDevice = await _channel.invokeMethod('getDeviceInfo');
      final Map<String, dynamic> deviceInfo = json.decode(rawDevice);

      setState(() {
        _totalApps = apps.length;
        _statusMessage = 'Scanning ${apps.length} apps...';
      });

      // Scan each app
      for (var i = 0; i < apps.length; i++) {
        final app = apps[i] as Map<String, dynamic>;
        final packageName = app['packageName'] as String;
        final appName = app['appName'] as String;
        final permissions = List<String>.from(app['permissions'] ?? []);

        setState(() {
          _appsScanned = i + 1;
          _scanProgress = (i + 1) / apps.length;
          _statusMessage = 'Scanning $appName...';
        });

        // Match trackers
        List<TrackerInfo> trackers = [];
        if (_matcher != null) {
          trackers = _matcher!.matchTrackers(packageName, permissions);
        }

        // Analyze permissions
        final dangerous = PermissionAnalyzer.filterDangerous(permissions);
        final riskScore = PermissionAnalyzer.calculateRiskScore(
          dangerous.length, trackers.length,
        );

        _analyzedApps.add(AnalyzedApp(
          packageName: packageName,
          appName: appName,
          allPermissions: permissions,
          dangerousPermissions: dangerous,
          trackers: trackers,
          riskScore: riskScore,
        ));
      }

      // Build scan result JSON
      _scanResult = DataExporter.buildScanResult(
        apps: _analyzedApps,
        deviceInfo: deviceInfo.map((k, v) => MapEntry(k, v.toString())),
      );

      setState(() {
        _isScanning = false;
        _scanComplete = true;
        _statusMessage = 'Scan complete! ${_analyzedApps.length} apps analyzed.';
      });
    } catch (e) {
      setState(() {
        _isScanning = false;
        _statusMessage = 'Error: ${e.toString()}';
      });
    }
  }

  // ─── PCAPDROID DEEP SCAN ────────────────────────────────────
  Future<void> _launchPcapDroid() async {
    const pcapPackage = 'com.emanuelef.remote_capture';
    const playStoreUrl =
        'https://play.google.com/store/apps/details?id=$pcapPackage';

    // Try to launch PCAPdroid directly
    final pcapUri = Uri.parse('pcapdroid://capture');
    if (await canLaunchUrl(pcapUri)) {
      await launchUrl(pcapUri);
    } else {
      // Try launch by package
      final packageUri = Uri.parse(
          'android-app://$pcapPackage');
      if (await canLaunchUrl(packageUri)) {
        await launchUrl(packageUri);
      } else {
        // Not installed — show dialog with Play Store link
        if (!mounted) return;
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF12121A),
            title: const Text('PCAPdroid Required',
                style: TextStyle(color: Colors.white)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'PCAPdroid is needed to capture network traffic. '
                  'Please install it from the Play Store.',
                  style: TextStyle(color: Color(0xFF94A3B8)),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1E2E),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF2A2A3E)),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('📋 Instructions:',
                          style: TextStyle(
                              color: Color(0xFF6366F1),
                              fontWeight: FontWeight.bold,
                              fontSize: 13)),
                      SizedBox(height: 8),
                      Text(
                        '1. Install & open PCAPdroid\n'
                        '2. Tap "Traffic dump" mode\n'
                        '3. Select "PCAP dump" format\n'
                        '4. Start capture\n'
                        '5. Use your phone normally for 1-24 hrs\n'
                        '6. Stop capture & export as CSV\n'
                        '7. Come back here & tap "Import Traffic Log"',
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel',
                    style: TextStyle(color: Color(0xFF94A3B8))),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  launchUrl(Uri.parse(playStoreUrl),
                      mode: LaunchMode.externalApplication);
                },
                child: const Text('Open Play Store'),
              ),
            ],
          ),
        );
      }
    }
  }

  // ─── IMPORT PCAPDROID CSV ───────────────────────────────────
  Future<void> _importPcapCsv() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv', 'CSV'],
        dialogTitle: 'Select PCAPdroid CSV export',
      );

      if (result == null || result.files.isEmpty) return;
      if (result.files.first.path == null) return;

      setState(() => _statusMessage = 'Importing traffic log...');

      final entries = await PcapImporter.importCsv(result.files.first.path!);
      final stats = PcapImporter.getStats(entries);

      setState(() {
        _vpnLog = entries;
        _vpnLogImported = true;
        _vpnStats = stats;
        _statusMessage =
            'Imported ${entries.length} connections from ${stats['unique_companies']} companies';
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF22C55E),
          content: Text(
            '✅ Imported ${entries.length} connections, '
            '${stats['tracker_connections']} tracker hits, '
            '${stats['unique_countries']} countries',
          ),
        ),
      );
    } catch (e) {
      setState(() => _statusMessage = 'Import error: $e');
    }
  }

  // ─── LOAD CONTACTS ─────────────────────────────────────────
  Future<List<Map<String, dynamic>>> _loadContacts() async {
    final status = await Permission.contacts.request();
    if (status.isGranted) {
      try {
        final String rawContacts = await _channel.invokeMethod('getContacts');
        final List<dynamic> decoded = json.decode(rawContacts);
        return decoded.map((c) {
          final name = c['name'] ?? 'Unknown';
          return <String, dynamic>{
            'name': _abbreviateName(name),
            'is_ghost': false, // will be enriched later by dashboard
            'digital_footprint_score': 50,
            'exposed_to': <String>[],
            'exposed_by_apps': <String>[],
          };
        }).toList();
      } catch (e) {
        debugPrint('Contacts error: $e');
      }
    }
    return []; // empty = dashboard will use mock contacts
  }

  String _abbreviateName(String fullName) {
    final parts = fullName.trim().split(' ');
    if (parts.length <= 1) return fullName;
    return '${parts.first} ${parts.last[0]}.';
  }

  // ─── EXPORT & SHARE ─────────────────────────────────────────
  Future<void> _exportResult() async {
    if (_scanResult == null) return;

    // Load contacts if not already loaded
    if (!_contactsLoaded) {
      _contacts = await _loadContacts();
      _contactsLoaded = true;
    }

    setState(() => _statusMessage = 'Exporting...');

    try {
      final filePath = await DataExporter.writeCombinedToFile(
        scanResult: _scanResult!,
        vpnLog: _vpnLog,
        contacts: _contacts,
      );
      setState(() {
        _exportedFilePath = filePath;
        _statusMessage = 'Exported to $filePath';
      });
    } catch (e) {
      setState(() => _statusMessage = 'Export error: $e');
    }
  }

  Future<void> _shareResult() async {
    if (_exportedFilePath == null) await _exportResult();
    if (_exportedFilePath != null) {
      await DataExporter.shareFile(_exportedFilePath!);
    }
  }

  // ─── TRANSFER TO DASHBOARD ──────────────────────────────────
  Future<void> _startTransfer() async {
    if (_scanResult == null) return;

    // Load contacts if needed
    if (!_contactsLoaded) {
      _contacts = await _loadContacts();
      _contactsLoaded = true;
    }

    setState(() => _statusMessage = 'Starting transfer server...');

    try {
      final combined = DataExporter.buildCombinedExport(
        scanResult: _scanResult!,
        vpnLog: _vpnLog,
        contacts: _contacts,
      );

      final url = await _transferServer.start(combined);
      setState(() {
        _transferUrl = url;
        _statusMessage = 'Ready! Open this URL on your laptop:';
      });
    } catch (e) {
      setState(() => _statusMessage = 'Transfer error: $e');
    }
  }

  Future<void> _stopTransfer() async {
    await _transferServer.stop();
    setState(() {
      _transferUrl = null;
      _statusMessage = 'Transfer stopped';
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _transferServer.stop();
    super.dispose();
  }

  // ─── BUILD ──────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              const Text(
                '🎭 Consent Theater',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFE2E8F0),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              const Text(
                'Privacy Scanner',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF6366F1),
                  letterSpacing: 2,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // Status message
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF12121A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF2A2A3E)),
                ),
                child: Text(
                  _statusMessage,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 20),

              // ── SECTION 1: Quick Scan ──
              _buildScanButton(),
              if (_isScanning) ...[
                const SizedBox(height: 12),
                _buildProgress(),
              ],
              if (_scanComplete) ...[
                const SizedBox(height: 12),
                _buildStatsSummary(),
              ],

              const SizedBox(height: 20),

              // ── SECTION 2: Deep Scan (PCAPdroid) ──
              _sectionHeader('🔍 Deep Scan (Network Traffic)', 'Optional — 24hr capture'),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _actionButton(
                      icon: Icons.wifi_tethering,
                      label: 'Open PCAPdroid',
                      color: const Color(0xFF8B5CF6),
                      onTap: _launchPcapDroid,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _actionButton(
                      icon: Icons.file_download,
                      label: _vpnLogImported
                          ? '✅ ${_vpnLog.length} entries'
                          : 'Import CSV',
                      color: _vpnLogImported
                          ? const Color(0xFF22C55E)
                          : const Color(0xFF3B82F6),
                      onTap: _importPcapCsv,
                    ),
                  ),
                ],
              ),
              if (_vpnStats != null) ...[
                const SizedBox(height: 8),
                _buildVpnStats(),
              ],

              const SizedBox(height: 20),

              // ── SECTION 3: Export & Transfer ──
              if (_scanComplete) ...[
                _sectionHeader('📲 Export & Transfer', 'Send data to dashboard'),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _actionButton(
                        icon: Icons.share,
                        label: 'Share File',
                        color: const Color(0xFFF59E0B),
                        onTap: _shareResult,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _actionButton(
                        icon: _transferUrl != null
                            ? Icons.stop_circle
                            : Icons.qr_code,
                        label: _transferUrl != null
                            ? 'Stop Server'
                            : 'Transfer to Dashboard',
                        color: _transferUrl != null
                            ? const Color(0xFFEF4444)
                            : const Color(0xFF6366F1),
                        onTap: _transferUrl != null
                            ? _stopTransfer
                            : _startTransfer,
                      ),
                    ),
                  ],
                ),
                if (_transferUrl != null) ...[
                  const SizedBox(height: 16),
                  _buildTransferPanel(),
                ],
              ],

              const SizedBox(height: 20),

              // ── SECTION 4: App List ──
              if (_analyzedApps.isNotEmpty) _buildAppList(),
            ],
          ),
        ),
      ),
    );
  }

  // ─── UI COMPONENTS ──────────────────────────────────────────

  Widget _sectionHeader(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(color: Color(0xFF2A2A3E)),
        const SizedBox(height: 4),
        Text(title,
            style: const TextStyle(
                color: Color(0xFFE2E8F0),
                fontSize: 16,
                fontWeight: FontWeight.bold)),
        Text(subtitle,
            style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
      ],
    );
  }

  Widget _actionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: color.withAlpha(25),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withAlpha(76)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScanButton() {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        final scale = _isScanning
            ? 1.0
            : 1.0 + (_pulseController.value * 0.03);
        return Transform.scale(
          scale: _scanComplete ? 1.0 : scale,
          child: SizedBox(
            height: 56,
            child: ElevatedButton(
              onPressed: _isScanning ? null : _startScan,
              style: ElevatedButton.styleFrom(
                backgroundColor: _scanComplete
                    ? const Color(0xFF22C55E)
                    : const Color(0xFF6366F1),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_isScanning)
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  else
                    Icon(
                      _scanComplete ? Icons.check_circle : Icons.search,
                      color: Colors.white,
                    ),
                  const SizedBox(width: 8),
                  Text(
                    _isScanning
                        ? 'Scanning ($_appsScanned/$_totalApps)...'
                        : _scanComplete
                            ? 'Scan Complete ✓'
                            : '🔍 Quick Scan (Apps & Trackers)',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildProgress() {
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: _scanProgress,
            backgroundColor: const Color(0xFF1E1E2E),
            color: const Color(0xFF6366F1),
            minHeight: 6,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '$_appsScanned / $_totalApps apps',
          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildStatsSummary() {
    final totalTrackers = _analyzedApps.fold<int>(
        0, (sum, a) => sum + a.trackers.length);
    final totalDangerousPerms = _analyzedApps.fold<int>(
        0, (sum, a) => sum + a.dangerousPermissions.length);
    final highRiskCount =
        _analyzedApps.where((a) => a.riskScore > 60).length;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF12121A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF2A2A3E)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _statItem('Apps', '${_analyzedApps.length}', const Color(0xFF6366F1)),
          _statItem('Trackers', '$totalTrackers', const Color(0xFFEF4444)),
          _statItem('Perms', '$totalDangerousPerms', const Color(0xFFF59E0B)),
          _statItem('High Risk', '$highRiskCount', const Color(0xFFEF4444)),
        ],
      ),
    );
  }

  Widget _statItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(value,
            style: TextStyle(
                fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        Text(label,
            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
      ],
    );
  }

  Widget _buildVpnStats() {
    if (_vpnStats == null) return const SizedBox();
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0D1117),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF8B5CF6).withAlpha(76)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _statItem('Connections', '${_vpnStats!['total_connections']}',
              const Color(0xFF8B5CF6)),
          _statItem('Trackers', '${_vpnStats!['tracker_connections']}',
              const Color(0xFFEF4444)),
          _statItem('Companies', '${_vpnStats!['unique_companies']}',
              const Color(0xFFF59E0B)),
          _statItem('Countries', '${_vpnStats!['unique_countries']}',
              const Color(0xFF22C55E)),
        ],
      ),
    );
  }

  Widget _buildTransferPanel() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0D1117),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF6366F1).withAlpha(76)),
      ),
      child: Column(
        children: [
          // QR Code
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: QrImageView(
              data: _transferUrl!,
              version: QrVersions.auto,
              size: 180,
              backgroundColor: Colors.white,
            ),
          ),
          const SizedBox(height: 12),

          // URL text (the actual mechanism for hackathon)
          const Text(
            'Type this URL in the dashboard:',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
          ),
          const SizedBox(height: 4),
          GestureDetector(
            onTap: () {
              Clipboard.setData(ClipboardData(text: _transferUrl!));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: Color(0xFF22C55E),
                  content: Text('URL copied to clipboard!'),
                ),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF1E1E2E),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF6366F1)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _transferUrl!,
                    style: const TextStyle(
                      color: Color(0xFF6366F1),
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'monospace',
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.copy, color: Color(0xFF6366F1), size: 16),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            '⚡ Server auto-stops after download',
            style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
          ),
        ],
      ),
    );
  }

  Widget _buildAppList() {
    final sorted = List<AnalyzedApp>.from(_analyzedApps)
      ..sort((a, b) => b.riskScore.compareTo(a.riskScore));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(
          '📱 Scanned Apps (${sorted.length})',
          'Sorted by risk score (highest first)',
        ),
        const SizedBox(height: 8),
        ...sorted.map((app) => _buildAppCard(app)),
      ],
    );
  }

  Widget _buildAppCard(AnalyzedApp app) {
    final riskColor = app.riskScore > 60
        ? const Color(0xFFEF4444)
        : app.riskScore > 30
            ? const Color(0xFFF59E0B)
            : const Color(0xFF22C55E);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF12121A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: riskColor.withAlpha(76)),
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        title: Text(app.appName,
            style: const TextStyle(
                color: Color(0xFFE2E8F0),
                fontSize: 14,
                fontWeight: FontWeight.w600)),
        subtitle: Text(app.packageName,
            style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: riskColor.withAlpha(25),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: riskColor.withAlpha(76)),
          ),
          child: Text(
            '${app.riskScore}',
            style: TextStyle(
                color: riskColor, fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (app.trackers.isNotEmpty) ...[
                  Text('Trackers (${app.trackers.length}):',
                      style: const TextStyle(
                          color: Color(0xFFEF4444), fontSize: 12)),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: app.trackers
                        .map((t) => Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEF4444).withAlpha(25),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(t.name,
                                  style: const TextStyle(
                                      color: Color(0xFFEF4444),
                                      fontSize: 10)),
                            ))
                        .toList(),
                  ),
                ],
                if (app.dangerousPermissions.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('Dangerous Permissions (${app.dangerousPermissions.length}):',
                      style: const TextStyle(
                          color: Color(0xFFF59E0B), fontSize: 12)),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: app.dangerousPermissions
                        .map((p) => Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B).withAlpha(25),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(p.split('.').last,
                                  style: const TextStyle(
                                      color: Color(0xFFF59E0B),
                                      fontSize: 10)),
                            ))
                        .toList(),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
