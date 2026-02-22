import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'ui/scan_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive for local caching
  await Hive.initFlutter();

  runApp(const ConsentTheaterApp());
}

class ConsentTheaterApp extends StatelessWidget {
  const ConsentTheaterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Consent Theater',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0A0A0F),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF8B5CF6),
          surface: Color(0xFF12121A),
          error: Color(0xFFEF4444),
        ),
        fontFamily: 'Inter',
        useMaterial3: true,
      ),
      home: const ScanScreen(),
    );
  }
}
