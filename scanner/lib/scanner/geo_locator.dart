/// Layered geo-location for tracker destinations.
///
/// Layer 1: Known tracker hostname → exact data-center coordinates
/// Layer 2: Country code → capital city coordinates
/// Layer 3: Fallback → US (Washington DC)
class GeoLocator {
  /// Major tracker server locations (hostname pattern → lat, lng, city)
  static const Map<String, GeoLocation> _trackerLocations = {
    // Meta
    'graph.facebook.com': GeoLocation(37.4530, -122.1817, 'Menlo Park', 'US'),
    'facebook.com': GeoLocation(37.4530, -122.1817, 'Menlo Park', 'US'),
    'fbcdn.net': GeoLocation(37.4530, -122.1817, 'Menlo Park', 'US'),
    'instagram.com': GeoLocation(37.4530, -122.1817, 'Menlo Park', 'US'),
    'whatsapp.net': GeoLocation(37.4530, -122.1817, 'Menlo Park', 'US'),
    'whatsapp.com': GeoLocation(37.4530, -122.1817, 'Menlo Park', 'US'),

    // Google / Alphabet
    'app-measurement.com': GeoLocation(37.4220, -122.0841, 'Mountain View', 'US'),
    'google-analytics.com': GeoLocation(37.4220, -122.0841, 'Mountain View', 'US'),
    'googleapis.com': GeoLocation(37.4220, -122.0841, 'Mountain View', 'US'),
    'googleadservices.com': GeoLocation(37.4220, -122.0841, 'Mountain View', 'US'),
    'doubleclick.net': GeoLocation(37.4220, -122.0841, 'Mountain View', 'US'),
    'googlesyndication.com': GeoLocation(37.4220, -122.0841, 'Mountain View', 'US'),
    'crashlytics.com': GeoLocation(37.4220, -122.0841, 'Mountain View', 'US'),
    'firebaseio.com': GeoLocation(37.4220, -122.0841, 'Mountain View', 'US'),

    // Amazon
    'amazonaws.com': GeoLocation(47.6062, -122.3321, 'Seattle', 'US'),
    'amazon-adsystem.com': GeoLocation(47.6062, -122.3321, 'Seattle', 'US'),

    // Microsoft
    'microsoft.com': GeoLocation(47.6740, -122.1215, 'Redmond', 'US'),
    'appcenter.ms': GeoLocation(47.6740, -122.1215, 'Redmond', 'US'),
    'azure.com': GeoLocation(47.6740, -122.1215, 'Redmond', 'US'),
    'bing.com': GeoLocation(47.6740, -122.1215, 'Redmond', 'US'),

    // ByteDance / TikTok
    'tiktokv.com': GeoLocation(39.9042, 116.4074, 'Beijing', 'CN'),
    'bytedance.com': GeoLocation(39.9042, 116.4074, 'Beijing', 'CN'),
    'musical.ly': GeoLocation(39.9042, 116.4074, 'Beijing', 'CN'),
    'tiktokcdn.com': GeoLocation(34.0522, -118.2437, 'Los Angeles', 'US'),

    // Ad tech / Analytics
    'appsflyer.com': GeoLocation(32.0853, 34.7818, 'Tel Aviv', 'IL'),
    'adjust.com': GeoLocation(52.5200, 13.4050, 'Berlin', 'DE'),
    'branch.io': GeoLocation(37.3861, -122.0839, 'Mountain View', 'US'),
    'mopub.com': GeoLocation(37.7749, -122.4194, 'San Francisco', 'US'),
    'unity3d.com': GeoLocation(37.7749, -122.4194, 'San Francisco', 'US'),
    'unityads.unity3d.com': GeoLocation(37.7749, -122.4194, 'San Francisco', 'US'),
    'inmobi.com': GeoLocation(12.9716, 77.5946, 'Bangalore', 'IN'),
    'clevertap.com': GeoLocation(19.0760, 72.8777, 'Mumbai', 'IN'),
    'criteo.com': GeoLocation(48.8566, 2.3522, 'Paris', 'FR'),
    'taboola.com': GeoLocation(32.0853, 34.7818, 'Tel Aviv', 'IL'),
    'outbrain.com': GeoLocation(40.7128, -74.0060, 'New York', 'US'),
    'applovin.com': GeoLocation(37.3382, -121.8863, 'San Jose', 'US'),
    'chartboost.com': GeoLocation(37.7749, -122.4194, 'San Francisco', 'US'),
    'flurry.com': GeoLocation(37.7749, -122.4194, 'San Francisco', 'US'),
    'comscore.com': GeoLocation(38.9072, -77.0369, 'Washington DC', 'US'),
    'scorecardresearch.com': GeoLocation(38.9072, -77.0369, 'Washington DC', 'US'),

    // Social / Communication
    'twitter.com': GeoLocation(37.7749, -122.4194, 'San Francisco', 'US'),
    'x.com': GeoLocation(37.7749, -122.4194, 'San Francisco', 'US'),
    'snapchat.com': GeoLocation(34.0259, -118.3964, 'Santa Monica', 'US'),
    'snap.com': GeoLocation(34.0259, -118.3964, 'Santa Monica', 'US'),

    // Indian services
    'truecaller.com': GeoLocation(59.3293, 18.0686, 'Stockholm', 'SE'),
    'jio.com': GeoLocation(19.0760, 72.8777, 'Mumbai', 'IN'),
    'paytm.com': GeoLocation(28.5728, 77.3218, 'Noida', 'IN'),
    'phonepe.com': GeoLocation(12.9716, 77.5946, 'Bangalore', 'IN'),

    // Data brokers
    'bluekai.com': GeoLocation(37.5294, -122.2660, 'Redwood City', 'US'),
    'oracle.com': GeoLocation(37.5294, -122.2660, 'Redwood City', 'US'),
    'acxiom.com': GeoLocation(34.7465, -92.2896, 'Little Rock', 'US'),
    'experian.com': GeoLocation(33.8121, -117.9190, 'Costa Mesa', 'US'),
  };

  /// Country code → capital city coordinates
  static const Map<String, GeoLocation> _countryCapitals = {
    'US': GeoLocation(38.9072, -77.0369, 'Washington DC', 'US'),
    'GB': GeoLocation(51.5074, -0.1278, 'London', 'GB'),
    'UK': GeoLocation(51.5074, -0.1278, 'London', 'GB'),
    'DE': GeoLocation(52.5200, 13.4050, 'Berlin', 'DE'),
    'FR': GeoLocation(48.8566, 2.3522, 'Paris', 'FR'),
    'JP': GeoLocation(35.6762, 139.6503, 'Tokyo', 'JP'),
    'CN': GeoLocation(39.9042, 116.4074, 'Beijing', 'CN'),
    'IN': GeoLocation(28.6139, 77.2090, 'New Delhi', 'IN'),
    'BR': GeoLocation(-15.7975, -47.8919, 'Brasilia', 'BR'),
    'AU': GeoLocation(-35.2809, 149.1300, 'Canberra', 'AU'),
    'CA': GeoLocation(45.4215, -75.6972, 'Ottawa', 'CA'),
    'SG': GeoLocation(1.3521, 103.8198, 'Singapore', 'SG'),
    'KR': GeoLocation(37.5665, 126.9780, 'Seoul', 'KR'),
    'NL': GeoLocation(52.3676, 4.9041, 'Amsterdam', 'NL'),
    'IE': GeoLocation(53.3498, -6.2603, 'Dublin', 'IE'),
    'SE': GeoLocation(59.3293, 18.0686, 'Stockholm', 'SE'),
    'IL': GeoLocation(32.0853, 34.7818, 'Tel Aviv', 'IL'),
    'RU': GeoLocation(55.7558, 37.6173, 'Moscow', 'RU'),
    'AE': GeoLocation(25.2048, 55.2708, 'Dubai', 'AE'),
    'HK': GeoLocation(22.3193, 114.1694, 'Hong Kong', 'HK'),
    'FI': GeoLocation(60.1699, 24.9384, 'Helsinki', 'FI'),
    'IT': GeoLocation(41.9028, 12.4964, 'Rome', 'IT'),
    'ES': GeoLocation(40.4168, -3.7038, 'Madrid', 'ES'),
  };

  /// Look up location for a hostname. Tries tracker DB first, then country fallback.
  static GeoLocation locate(String hostname, String? countryCode) {
    // Layer 1: exact hostname match
    final direct = _trackerLocations[hostname];
    if (direct != null) return direct;

    // Layer 1b: suffix match (e.g. "sdk.appsflyer.com" matches "appsflyer.com")
    for (final entry in _trackerLocations.entries) {
      if (hostname.endsWith('.${entry.key}') || hostname == entry.key) {
        return entry.value;
      }
    }

    // Layer 2: country code → capital
    if (countryCode != null && countryCode.isNotEmpty) {
      final capital = _countryCapitals[countryCode.toUpperCase()];
      if (capital != null) return capital;
    }

    // Layer 3: fallback to Washington DC
    return const GeoLocation(38.9072, -77.0369, 'Washington DC', 'US');
  }

  /// Convenience method returning a Map for JSON serialization
  static Map<String, dynamic> locateAsMap(String hostname, String? countryCode) {
    final loc = locate(hostname, countryCode);
    return {
      'lat': loc.lat,
      'lng': loc.lng,
      'city': loc.city,
      'country': loc.country,
    };
  }
}

class GeoLocation {
  final double lat;
  final double lng;
  final String city;
  final String country;

  const GeoLocation(this.lat, this.lng, this.city, this.country);
}
