import 'dart:math';

/// The 15 dangerous Android permissions that reveal the most about user behavior.
const List<String> dangerousPermissions = [
  'android.permission.READ_CONTACTS',
  'android.permission.WRITE_CONTACTS',
  'android.permission.READ_CALL_LOG',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.READ_PHONE_STATE',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_SMS',
  'android.permission.SEND_SMS',
  'android.permission.READ_CALENDAR',
  'android.permission.BODY_SENSORS',
  'android.permission.ACTIVITY_RECOGNITION',
];

/// Human-readable labels for dangerous permissions (without the android.permission. prefix).
const Map<String, String> permissionLabels = {
  'android.permission.READ_CONTACTS': 'READ_CONTACTS',
  'android.permission.WRITE_CONTACTS': 'WRITE_CONTACTS',
  'android.permission.READ_CALL_LOG': 'READ_CALL_LOG',
  'android.permission.CAMERA': 'CAMERA',
  'android.permission.RECORD_AUDIO': 'RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION': 'ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION': 'ACCESS_COARSE_LOCATION',
  'android.permission.READ_PHONE_STATE': 'READ_PHONE_STATE',
  'android.permission.READ_EXTERNAL_STORAGE': 'READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE': 'WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_SMS': 'READ_SMS',
  'android.permission.SEND_SMS': 'SEND_SMS',
  'android.permission.READ_CALENDAR': 'READ_CALENDAR',
  'android.permission.BODY_SENSORS': 'BODY_SENSORS',
  'android.permission.ACTIVITY_RECOGNITION': 'ACTIVITY_RECOGNITION',
};

class PermissionAnalyzer {
  /// Filter a raw permission list to only dangerous permissions.
  static List<String> filterDangerous(List<String> allPermissions) {
    return allPermissions
        .where((p) => dangerousPermissions.contains(p))
        .toList();
  }

  /// Get human-readable labels for dangerous permissions.
  static List<String> getDangerousLabels(List<String> allPermissions) {
    return filterDangerous(allPermissions)
        .map((p) => permissionLabels[p] ?? p.split('.').last)
        .toList();
  }

  /// Calculate risk score (0-100) based on dangerous permissions and tracker count.
  ///
  /// Formula: permScore (60% weight) + trackerScore (40% weight)
  ///   permScore = (dangerousPerms / 15) * 60
  ///   trackerScore = (min(trackerCount, 20) / 20) * 40
  static int calculateRiskScore(int dangerousPermCount, int trackerCount) {
    final permScore = (dangerousPermCount / 15) * 60;
    final trackerScore = (min(trackerCount, 20) / 20) * 40;
    return min((permScore + trackerScore).round(), 100);
  }

  /// Get a risk level label from a score.
  static String getRiskLevel(int score) {
    if (score <= 20) return 'Low';
    if (score <= 40) return 'Moderate';
    if (score <= 60) return 'High';
    if (score <= 80) return 'Very High';
    return 'Critical';
  }

  /// Get a color hex for a risk score (for UI display).
  static String getRiskColor(int score) {
    if (score <= 30) return '#22C55E'; // green
    if (score <= 60) return '#F59E0B'; // amber
    return '#EF4444'; // red
  }
}
