package com.consenttheater.scanner

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.provider.ContactsContract
import com.google.gson.Gson
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.consenttheater/scanner"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "getInstalledApps" -> {
                        try {
                            val pm = packageManager
                            val packages = pm.getInstalledPackages(
                                PackageManager.GET_PERMISSIONS or
                                PackageManager.GET_META_DATA
                            )
                            val apps = packages
                                .filter { pkgInfo ->
                                    pkgInfo.applicationInfo?.let { appInfo ->
                                        appInfo.flags and ApplicationInfo.FLAG_SYSTEM == 0
                                    } ?: false
                                }
                                .map { pkg ->
                                    mapOf(
                                        "packageName" to pkg.packageName,
                                        "appName" to (pkg.applicationInfo?.let {
                                            pm.getApplicationLabel(it).toString()
                                        } ?: "Unknown"),
                                        "permissions" to
                                            (pkg.requestedPermissions?.toList()
                                             ?: emptyList<String>())
                                    )
                                }
                            result.success(Gson().toJson(apps))
                        } catch (e: Exception) {
                            result.error("SCAN_ERROR", e.message, null)
                        }
                    }
                    "getDeviceInfo" -> {
                        val info = mapOf(
                            "model" to android.os.Build.MODEL,
                            "manufacturer" to android.os.Build.MANUFACTURER,
                            "androidVersion" to android.os.Build.VERSION.RELEASE,
                            "sdkVersion" to android.os.Build.VERSION.SDK_INT.toString()
                        )
                        result.success(Gson().toJson(info))
                    }
                    "getContacts" -> {
                        try {
                            val contacts = mutableListOf<Map<String, String>>()
                            val cursor = contentResolver.query(
                                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                                arrayOf(
                                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                                    ContactsContract.CommonDataKinds.Phone.NUMBER
                                ),
                                null, null,
                                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
                            )
                            cursor?.use {
                                val nameIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                                val phoneIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                                val seen = mutableSetOf<String>()
                                while (it.moveToNext()) {
                                    val name = it.getString(nameIdx) ?: continue
                                    if (seen.contains(name)) continue
                                    seen.add(name)
                                    contacts.add(mapOf(
                                        "name" to name,
                                        "phone" to (it.getString(phoneIdx) ?: "")
                                    ))
                                }
                            }
                            result.success(Gson().toJson(contacts))
                        } catch (e: Exception) {
                            result.error("CONTACTS_ERROR", e.message, null)
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
