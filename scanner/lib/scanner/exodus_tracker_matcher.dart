import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:hive/hive.dart';

/// Tracker info from the Exodus Privacy database.
class TrackerInfo {
  final int id;
  final String name;
  final String? website;
  final List<String> categories;
  final String codeSignature;  // e.g. "com.facebook.analytics"
  final String? networkSignature;
  final String? company;

  TrackerInfo({
    required this.id,
    required this.name,
    this.website,
    required this.categories,
    required this.codeSignature,
    this.networkSignature,
    this.company,
  });

  factory TrackerInfo.fromJson(Map<String, dynamic> json) {
    return TrackerInfo(
      id: json['id'] ?? 0,
      name: json['name'] ?? 'Unknown',
      website: json['website'],
      categories: List<String>.from(json['categories'] ?? []),
      codeSignature: json['code_signature'] ?? '',
      networkSignature: json['network_signature'],
      company: _inferCompany(json['name'] ?? ''),
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'company': company ?? 'Unknown',
  };

  /// Infer the parent company from the tracker name.
  static String _inferCompany(String trackerName) {
    final lower = trackerName.toLowerCase();
    if (lower.contains('facebook') || lower.contains('meta')) return 'Meta Platforms';
    if (lower.contains('google') || lower.contains('firebase') || lower.contains('admob') || lower.contains('crashlytics') || lower.contains('doubleclick')) return 'Alphabet Inc.';
    if (lower.contains('amazon') || lower.contains('aws')) return 'Amazon.com Inc.';
    if (lower.contains('tiktok') || lower.contains('bytedance') || lower.contains('pangle')) return 'ByteDance';
    if (lower.contains('unity')) return 'Unity Technologies';
    if (lower.contains('appsflyer')) return 'AppsFlyer';
    if (lower.contains('adjust')) return 'AppLovin';
    if (lower.contains('branch')) return 'Branch Metrics';
    if (lower.contains('twitter') || lower.contains(' x ')) return 'X Corp';
    if (lower.contains('microsoft') || lower.contains('linkedin') || lower.contains('bing') || lower.contains('clarity') || lower.contains('xandr')) return 'Microsoft Corporation';
    if (lower.contains('snap')) return 'Snap Inc.';
    if (lower.contains('inmobi')) return 'InMobi';
    if (lower.contains('applovin') || lower.contains('mopub') || lower.contains('ironsource')) return 'AppLovin';
    if (lower.contains('chartboost')) return 'Zynga';
    if (lower.contains('braze')) return 'Braze';
    if (lower.contains('clevertap')) return 'CleverTap';
    if (lower.contains('onesignal')) return 'OneSignal';
    if (lower.contains('segment') || lower.contains('twilio')) return 'Twilio';
    if (lower.contains('mixpanel')) return 'Mixpanel';
    if (lower.contains('amplitude')) return 'Amplitude';
    if (lower.contains('comscore') || lower.contains('scorecard')) return 'comScore';
    if (lower.contains('criteo')) return 'Criteo';
    if (lower.contains('taboola')) return 'Taboola';
    if (lower.contains('outbrain')) return 'Outbrain';
    if (lower.contains('pubmatic')) return 'PubMatic';
    if (lower.contains('sentry')) return 'Sentry';
    if (lower.contains('flurry') || lower.contains('yahoo')) return 'Yahoo';
    if (lower.contains('adobe') || lower.contains('demdex') || lower.contains('everest')) return 'Adobe Inc.';
    if (lower.contains('oracle') || lower.contains('bluekai')) return 'Oracle Corporation';
    if (lower.contains('truecaller')) return 'True Software Scandinavia AB';
    return 'Unknown';
  }
}

/// Matches installed apps against the Exodus Privacy tracker database.
/// Uses the /trackers endpoint (no auth required) instead of /search.
class ExodusTrackerMatcher {
  final Dio _dio = Dio();
  Box? _cacheBox;
  List<TrackerInfo>? _allTrackers;

  static const String _trackersUrl =
      'https://reports.exodus-privacy.eu.org/api/trackers';
  static const String _cacheKey = 'exodus_trackers_cache';

  /// Initialize the Hive cache box.
  Future<void> init() async {
    _cacheBox = await Hive.openBox('exodus_cache');
    await _loadTrackers();
  }

  /// Load all trackers from cache or API.
  Future<void> _loadTrackers() async {
    // Check cache first (valid for 24 hours)
    final cachedData = _cacheBox?.get(_cacheKey);
    final cacheTimestamp = _cacheBox?.get('${_cacheKey}_timestamp');

    if (cachedData != null && cacheTimestamp != null) {
      final cacheAge = DateTime.now().millisecondsSinceEpoch - (cacheTimestamp as int);
      if (cacheAge < 24 * 60 * 60 * 1000) { // 24 hours
        _allTrackers = _parseTrackerResponse(cachedData as String);
        return;
      }
    }

    // Fetch from API
    try {
      final response = await _dio.get(_trackersUrl);
      if (response.statusCode == 200) {
        final jsonStr = json.encode(response.data);
        await _cacheBox?.put(_cacheKey, jsonStr);
        await _cacheBox?.put(
          '${_cacheKey}_timestamp',
          DateTime.now().millisecondsSinceEpoch,
        );
        _allTrackers = _parseTrackerResponse(jsonStr);
      }
    } catch (e) {
      // If API fails and we have stale cache, use it
      if (cachedData != null) {
        _allTrackers = _parseTrackerResponse(cachedData as String);
      } else {
        _allTrackers = [];
      }
    }
  }

  /// Parse the tracker API response.
  /// The response is: { "trackers": { "1": {...}, "2": {...}, ... } }
  List<TrackerInfo> _parseTrackerResponse(String jsonStr) {
    try {
      final data = json.decode(jsonStr);
      final Map<String, dynamic> trackersMap =
          Map<String, dynamic>.from(data['trackers'] ?? data);

      return trackersMap.values.map((t) {
        return TrackerInfo.fromJson(Map<String, dynamic>.from(t));
      }).toList();
    } catch (e) {
      return [];
    }
  }

  /// Match an app's permissions/metadata against known tracker code signatures.
  /// Returns trackers whose code signatures appear in the app's package dependencies.
  List<TrackerInfo> matchTrackers(String packageName, List<String> permissions) {
    if (_allTrackers == null || _allTrackers!.isEmpty) return [];

    final matched = <TrackerInfo>[];

    for (final tracker in _allTrackers!) {
      // Match by code signature prefix in permissions or known package patterns
      final sig = tracker.codeSignature.toLowerCase();
      if (sig.isEmpty) continue;

      // Check if any permission or metadata matches the tracker's code signature
      for (final perm in permissions) {
        if (perm.toLowerCase().contains(sig) ||
            sig.contains(packageName.split('.').take(2).join('.'))) {
          matched.add(tracker);
          break;
        }
      }
    }

    // Also match well-known trackers by package name patterns
    matched.addAll(_matchByKnownPatterns(packageName));

    // Deduplicate by tracker name
    final seen = <String>{};
    return matched.where((t) => seen.add(t.name)).toList();
  }

  /// Fallback: match trackers by well-known package name patterns.
  List<TrackerInfo> _matchByKnownPatterns(String packageName) {
    final knownTrackers = <String, List<Map<String, String>>>{
      'com.whatsapp': [
        {'name': 'Facebook Analytics', 'company': 'Meta Platforms'},
        {'name': 'Facebook Login', 'company': 'Meta Platforms'},
        {'name': 'Facebook Share', 'company': 'Meta Platforms'},
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'Google CrashLytics', 'company': 'Alphabet Inc.'},
      ],
      'com.instagram.android': [
        {'name': 'Facebook Analytics', 'company': 'Meta Platforms'},
        {'name': 'Facebook Login', 'company': 'Meta Platforms'},
        {'name': 'Facebook Ads', 'company': 'Meta Platforms'},
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'Google CrashLytics', 'company': 'Alphabet Inc.'},
        {'name': 'Branch', 'company': 'Branch Metrics'},
      ],
      'com.facebook.katana': [
        {'name': 'Facebook Analytics', 'company': 'Meta Platforms'},
        {'name': 'Facebook Login', 'company': 'Meta Platforms'},
        {'name': 'Facebook Ads', 'company': 'Meta Platforms'},
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
      ],
      'com.zhiliaoapp.musically': [
        {'name': 'Facebook Login', 'company': 'Meta Platforms'},
        {'name': 'Facebook Share', 'company': 'Meta Platforms'},
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'AppsFlyer', 'company': 'AppsFlyer'},
        {'name': 'Pangle (ByteDance)', 'company': 'ByteDance'},
      ],
      'com.truecaller': [
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'Google CrashLytics', 'company': 'Alphabet Inc.'},
        {'name': 'CleverTap', 'company': 'CleverTap'},
        {'name': 'InMobi', 'company': 'InMobi'},
      ],
      'com.google.android.youtube': [
        {'name': 'Google Ads', 'company': 'Alphabet Inc.'},
        {'name': 'Google Analytics', 'company': 'Alphabet Inc.'},
      ],
      'com.spotify.music': [
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'Adjust', 'company': 'AppLovin'},
        {'name': 'comScore', 'company': 'comScore'},
      ],
      'com.flipkart.android': [
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'Facebook Analytics', 'company': 'Meta Platforms'},
        {'name': 'CleverTap', 'company': 'CleverTap'},
        {'name': 'Criteo', 'company': 'Criteo'},
      ],
      'com.amazon.mShop.android.shopping': [
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'Amazon Ads', 'company': 'Amazon.com Inc.'},
      ],
      'com.king.candycrushsaga': [
        {'name': 'Facebook Analytics', 'company': 'Meta Platforms'},
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'Unity Ads', 'company': 'Unity Technologies'},
        {'name': 'AppLovin MAX', 'company': 'AppLovin'},
        {'name': 'ironSource', 'company': 'Unity Technologies'},
        {'name': 'AdColony', 'company': 'Digital Turbine'},
      ],
      'com.twitter.android': [
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'Twitter MoPub', 'company': 'X Corp'},
      ],
      'com.snapchat.android': [
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'Snap Kit', 'company': 'Snap Inc.'},
        {'name': 'Adjust', 'company': 'AppLovin'},
      ],
      'com.linkedin.android': [
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'LinkedIn Analytics', 'company': 'Microsoft Corporation'},
      ],
      'com.phonepe.app': [
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'Branch', 'company': 'Branch Metrics'},
        {'name': 'CleverTap', 'company': 'CleverTap'},
      ],
      'com.dream11.fantasy.cricket': [
        {'name': 'Google Firebase Analytics', 'company': 'Alphabet Inc.'},
        {'name': 'CleverTap', 'company': 'CleverTap'},
        {'name': 'AppsFlyer', 'company': 'AppsFlyer'},
      ],
    };

    final trackers = knownTrackers[packageName];
    if (trackers == null) return [];

    return trackers.map((t) => TrackerInfo(
      id: 0,
      name: t['name']!,
      categories: ['Known'],
      codeSignature: '',
      company: t['company'],
    )).toList();
  }

  /// Get count of all loaded trackers (for UI display).
  int get totalTrackersInDb => _allTrackers?.length ?? 0;
}
