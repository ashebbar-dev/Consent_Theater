import 'package:flutter_test/flutter_test.dart';
import 'package:scanner/scanner/permission_analyzer.dart';

void main() {
  group('PermissionAnalyzer', () {
    test('calculates risk score correctly', () {
      // 5 dangerous perms + 10 trackers
      // permScore = (5/15) * 60 = 20
      // trackerScore = (10/20) * 40 = 20
      // total = 40
      expect(PermissionAnalyzer.calculateRiskScore(5, 10), 40);
    });

    test('risk score caps at 100', () {
      expect(PermissionAnalyzer.calculateRiskScore(15, 20), 100);
    });

    test('risk score is 0 for no perms and no trackers', () {
      expect(PermissionAnalyzer.calculateRiskScore(0, 0), 0);
    });

    test('filters dangerous permissions correctly', () {
      final perms = [
        'android.permission.INTERNET',
        'android.permission.READ_CONTACTS',
        'android.permission.CAMERA',
        'android.permission.WAKE_LOCK',
      ];
      final dangerous = PermissionAnalyzer.filterDangerous(perms);
      expect(dangerous.length, 2);
      expect(dangerous, contains('android.permission.READ_CONTACTS'));
      expect(dangerous, contains('android.permission.CAMERA'));
    });

    test('getRiskLevel returns correct labels', () {
      expect(PermissionAnalyzer.getRiskLevel(10), 'Low');
      expect(PermissionAnalyzer.getRiskLevel(30), 'Moderate');
      expect(PermissionAnalyzer.getRiskLevel(50), 'High');
      expect(PermissionAnalyzer.getRiskLevel(70), 'Very High');
      expect(PermissionAnalyzer.getRiskLevel(90), 'Critical');
    });
  });
}
