import { useState, useCallback } from 'react';
import type { ScanResult, VpnLogEntry, BrokerContact, TrackerCompanyEntry, MockContact, AppScanResult } from '../types';
import { DANGEROUS_PERMISSIONS } from '../types';

// Import sample data
import sampleScan from '../data/sample-scan.json';
import sampleVpnLog from '../data/sample-vpn-log.json';
import sampleContacts from '../data/mock-contacts.json';

// ── Known tracker SDK permission patterns ──
// We detect trackers by matching permission substrings that are characteristic
// of ad/analytics SDKs (since the raw phone scan doesn't include tracker info).
const TRACKER_INDICATORS: Record<string, { name: string; company: string }> = {
    'com.google.android.gms.permission.AD_ID': { name: 'Google Mobile Ads', company: 'Alphabet Inc.' },
    'com.google.android.c2dm.permission.RECEIVE': { name: 'Google Cloud Messaging', company: 'Alphabet Inc.' },
    'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE': { name: 'Google Play Install Referrer', company: 'Alphabet Inc.' },
    'com.facebook.services.identity.FEO2': { name: 'Facebook SDK', company: 'Meta Platforms' },
    'com.google.android.gms.permission.ACTIVITY_RECOGNITION': { name: 'Google Activity Recognition', company: 'Alphabet Inc.' },
    'ACCESS_ADSERVICES_ATTRIBUTION': { name: 'Ad Attribution API', company: 'Google (Ad Services)' },
    'ACCESS_ADSERVICES_AD_ID': { name: 'Ad ID Service', company: 'Google (Ad Services)' },
    'ACCESS_ADSERVICES_TOPICS': { name: 'Topics API (Ad Tracking)', company: 'Google (Ad Services)' },
};

/**
 * Normalize a ScanResult from the friend's server format to the dashboard format.
 *
 * Friend's server sends:
 *   permissions: { dangerous: string[], normal: string[] }
 *   dangerous_permissions: string[]  (already computed)
 *   trackers: [{ name, company, category, website, ... }] (extra fields OK)
 *
 * Dashboard expects:
 *   permissions: string[]  (flat array of all permissions)
 *   dangerous_permissions: string[]
 *   trackers: [{ name, company }]
 */
function normalizeScanResult(scan: ScanResult): ScanResult {
    return {
        ...scan,
        apps: scan.apps.map(app => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const perms = app.permissions as any;

            // Flatten permissions if they come as { dangerous: [], normal: [] }
            let flatPermissions: string[];
            if (Array.isArray(perms)) {
                flatPermissions = perms;
            } else if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
                // Friend's format: { dangerous: string[], normal: string[] }
                const dangerous = Array.isArray(perms.dangerous) ? perms.dangerous : [];
                const normal = Array.isArray(perms.normal) ? perms.normal : [];
                flatPermissions = [...dangerous, ...normal];
            } else {
                flatPermissions = [];
            }

            // Strip "android.permission." prefix so PermissionMatrix matches
            // against short names like READ_CONTACTS, CAMERA, etc.
            const stripPrefix = (p: string) => p.replace(/^android\.permission\./i, '');
            flatPermissions = flatPermissions.map(stripPrefix);

            // Ensure dangerous_permissions is a flat string[] with short names
            let dangerousPerms: string[];
            if (Array.isArray(app.dangerous_permissions)) {
                dangerousPerms = app.dangerous_permissions.map(stripPrefix);
            } else {
                // Fallback: derive from flatPermissions using DANGEROUS_PERMISSIONS list
                dangerousPerms = flatPermissions.filter(p =>
                    (DANGEROUS_PERMISSIONS as readonly string[]).includes(p)
                );
            }

            const trackersList = Array.isArray(app.trackers) ? app.trackers : [];
            const trackerCount = trackersList.length;

            return {
                ...app,
                permissions: flatPermissions,
                dangerous_permissions: dangerousPerms,
                trackers: trackersList,
                tracker_count: trackerCount,
                dangerous_permission_count: dangerousPerms.length,
                risk_score: app.risk_score ?? 0,
            };
        }),
    };
}

// ── Raw phone app format (camelCase from Android PackageManager) ──
interface RawPhoneApp {
    packageName: string;
    appName: string;
    versionName?: string;
    permissions: string[];
}

/**
 * Transform a raw phone app entry into the dashboard's AppScanResult format.
 * Computes dangerous_permissions and risk_score from the raw permission list.
 */
function transformRawApp(raw: RawPhoneApp): AppScanResult {
    // Extract dangerous permissions (strip "android.permission." prefix)
    const dangerous_permissions: string[] = [];
    for (const perm of raw.permissions) {
        const shortName = perm.replace('android.permission.', '');
        if ((DANGEROUS_PERMISSIONS as readonly string[]).includes(shortName)) {
            dangerous_permissions.push(shortName);
        }
    }

    // Detect trackers from known permission patterns
    const trackers: { name: string; company: string }[] = [];
    const seenTrackers = new Set<string>();
    for (const perm of raw.permissions) {
        for (const [pattern, tracker] of Object.entries(TRACKER_INDICATORS)) {
            if (perm.includes(pattern) && !seenTrackers.has(tracker.name)) {
                trackers.push(tracker);
                seenTrackers.add(tracker.name);
            }
        }
    }

    // Risk score: weighted combination of dangerous perms + trackers (0-100)
    const dangerousScore = Math.min(dangerous_permissions.length * 8, 60);
    const trackerScore = Math.min(trackers.length * 10, 40);
    const risk_score = Math.min(dangerousScore + trackerScore, 100);

    return {
        package_name: raw.packageName,
        app_name: raw.appName,
        permissions: raw.permissions,
        dangerous_permissions,
        trackers,
        tracker_count: trackers.length,
        dangerous_permission_count: dangerous_permissions.length,
        risk_score,
    };
}

/**
 * Transform an array of raw phone apps into a full ScanResult.
 */
function transformRawScanToScanResult(rawApps: RawPhoneApp[]): ScanResult {
    const apps = rawApps.map(transformRawApp);
    return {
        scan_id: `live-scan-${Date.now()}`,
        device_model: 'Live Device',
        android_version: 'Unknown',
        scan_timestamp: new Date().toISOString(),
        total_apps: apps.length,
        total_trackers: apps.reduce((sum, a) => sum + a.tracker_count, 0),
        total_dangerous_permissions: apps.reduce((sum, a) => sum + a.dangerous_permission_count, 0),
        apps,
    };
}

/**
 * Check if data looks like a raw phone scan (array of {packageName, appName, permissions}).
 */
function isRawPhoneScan(json: unknown): json is RawPhoneApp[] {
    return (
        Array.isArray(json) &&
        json.length > 0 &&
        typeof json[0] === 'object' &&
        json[0] !== null &&
        'packageName' in json[0] &&
        'permissions' in json[0]
    );
}

// State type for all loaded data
export interface AppData {
    scanResult: ScanResult | null;
    vpnLog: VpnLogEntry[];
    brokerContacts: BrokerContact[];
    trackerDb: TrackerCompanyEntry[];
    mockContacts: MockContact[];
    isLoaded: boolean;
}

export function useAppData() {
    const [data, setData] = useState<AppData>({
        scanResult: null,
        vpnLog: [],
        brokerContacts: [],
        trackerDb: [],
        mockContacts: [],
        isLoaded: false,
    });
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);

    // Load from uploaded JSON file
    const loadScanResult = useCallback((json: ScanResult) => {
        setData(prev => ({ ...prev, scanResult: json, isLoaded: true }));
    }, []);

    const loadVpnLog = useCallback((json: VpnLogEntry[]) => {
        setData(prev => ({ ...prev, vpnLog: json }));
    }, []);

    // Load a combined JSON export (scan_result + vpn_log + contacts)
    const loadCombinedJson = useCallback((json: Record<string, unknown>) => {
        const scanResult = json.scan_result as ScanResult;
        const vpnLog = (json.vpn_log as VpnLogEntry[]) || [];
        const contacts = (json.contacts as MockContact[]) || [];

        setData({
            scanResult,
            vpnLog,
            brokerContacts: [],
            trackerDb: [],
            mockContacts: contacts.length > 0 ? contacts : sampleContacts as unknown as MockContact[],
            isLoaded: true,
        });
    }, []);

    // Load sample data for development/demo
    const loadSampleData = useCallback(() => {
        setData({
            scanResult: sampleScan as ScanResult,
            vpnLog: sampleVpnLog as unknown as VpnLogEntry[],
            brokerContacts: [],
            trackerDb: [],
            mockContacts: sampleContacts as unknown as MockContact[],
            isLoaded: true,
        });
    }, []);

    /**
     * Fetch data from the scanner's local HTTP server.
     *
     * Supports two server types:
     *
     * A) Multi-endpoint server (friend's app):
     *    /scan          → Full scan (apps + trackers + risk_score)
     *    /scan/raw      → Quick raw app list
     *    /pcap/json     → VPN log entries as JSON (for Act 1 globe)
     *    /contacts      → Contact data (for Act 2/3)
     *    /pcap          → Raw PCAP binary (not used by dashboard)
     *    /export        → Full scan + save to file
     *
     * B) Combined JSON server (codebase version):
     *    GET /          → Single JSON with format: "consent-theater-combined"
     *
     * When given a base URL (e.g. http://192.168.1.5:8080), auto-discovers
     * all endpoints in parallel to populate every Act.
     */
    const loadFromUrl = useCallback(async (url: string) => {
        setIsLoadingUrl(true);
        setUrlError(null);

        // Normalize URL: strip trailing slash
        const baseUrl = url.replace(/\/+$/, '');

        try {
            // Determine if this is a base URL or a specific endpoint
            const knownEndpoints = ['/scan', '/scan/raw', '/pcap', '/pcap/json', '/contacts', '/export'];
            const isSpecificEndpoint = knownEndpoints.some(ep => baseUrl.endsWith(ep));

            if (isSpecificEndpoint) {
                // User gave a specific endpoint — fetch just that
                const response = await fetch(baseUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const json = await response.json();
                await handleJsonResponse(json);
            } else {
                // Base URL — auto-discover all endpoints in parallel
                await autoDiscoverEndpoints(baseUrl);
            }
        } catch (err) {
            setUrlError(err instanceof Error ? err.message : 'Failed to fetch data');
        } finally {
            setIsLoadingUrl(false);
        }

        /**
         * Handle a single JSON response and load it into the appropriate state.
         */
        async function handleJsonResponse(json: unknown): Promise<boolean> {
            // Combined format
            if (json && typeof json === 'object' && !Array.isArray(json)) {
                const obj = json as Record<string, unknown>;
                if (obj.format === 'consent-theater-combined') {
                    loadCombinedJson(obj);
                    return true;
                }
                if (obj.scan_id && obj.apps) {
                    loadScanResult(normalizeScanResult(obj as unknown as ScanResult));
                    return true;
                }
            }
            // Raw phone scan data
            if (isRawPhoneScan(json)) {
                const scanResult = transformRawScanToScanResult(json);
                loadScanResult(scanResult);
                return true;
            }
            return false;
        }

        /**
         * Auto-discover and fetch from all available endpoints in parallel.
         * Tries: /scan, /pcap/json, /contacts (and falls back to base URL).
         */
        async function autoDiscoverEndpoints(base: string) {
            // Fire all requests in parallel for speed
            const [scanRes, pcapJsonRes, contactsRes, baseRes] = await Promise.allSettled([
                fetch(`${base}/scan`).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`${base}/pcap/json`).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`${base}/contacts`).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(base).then(r => r.ok ? r.json() : null).catch(() => null),
            ]);

            const scanData = scanRes.status === 'fulfilled' ? scanRes.value : null;
            const pcapData = pcapJsonRes.status === 'fulfilled' ? pcapJsonRes.value : null;
            const contactsData = contactsRes.status === 'fulfilled' ? contactsRes.value : null;
            const baseData = baseRes.status === 'fulfilled' ? baseRes.value : null;

            let scanResult: ScanResult | null = null;
            let vpnLog: VpnLogEntry[] = [];
            let contacts: MockContact[] = [];

            // --- Process /scan data ---
            if (scanData) {
                if (scanData.format === 'consent-theater-combined') {
                    // Combined format — has everything, load it directly
                    loadCombinedJson(scanData);
                    return;
                }
                if (scanData.scan_id && scanData.apps) {
                    scanResult = normalizeScanResult(scanData as ScanResult);
                } else if (isRawPhoneScan(scanData)) {
                    scanResult = transformRawScanToScanResult(scanData);
                }
            }

            // --- Fallback: try base URL for combined/scan data ---
            if (!scanResult && baseData) {
                if (baseData.format === 'consent-theater-combined') {
                    loadCombinedJson(baseData);
                    return;
                }
                if (baseData.scan_id && baseData.apps) {
                    scanResult = normalizeScanResult(baseData as ScanResult);
                } else if (isRawPhoneScan(baseData)) {
                    scanResult = transformRawScanToScanResult(baseData);
                }
            }

            if (!scanResult) {
                throw new Error('Could not load scan data from /scan or base URL');
            }

            // --- Process /pcap/json data (VPN log for Act 1) ---
            if (pcapData) {
                if (Array.isArray(pcapData)) {
                    // Could be raw VPN entries or wrapped in an object
                    vpnLog = pcapData as VpnLogEntry[];
                } else if (pcapData.entries && Array.isArray(pcapData.entries)) {
                    vpnLog = pcapData.entries as VpnLogEntry[];
                } else if (pcapData.connections && Array.isArray(pcapData.connections)) {
                    vpnLog = pcapData.connections as VpnLogEntry[];
                }
            }

            // --- Process /contacts data ---
            if (contactsData && Array.isArray(contactsData) && contactsData.length > 0) {
                contacts = contactsData as MockContact[];
            }

            // --- Set all data at once ---
            setData({
                scanResult,
                vpnLog,
                brokerContacts: [],
                trackerDb: [],
                mockContacts: contacts.length > 0
                    ? contacts
                    : sampleContacts as unknown as MockContact[],
                isLoaded: true,
            });
        }
    }, [loadCombinedJson, loadScanResult]);

    // Handle generic JSON file upload
    const handleFileUpload = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);

                // Auto-detect the file type
                if (json.format === 'consent-theater-combined') {
                    // Combined export from transfer server
                    loadCombinedJson(json);
                } else if (json.scan_id && json.apps) {
                    loadScanResult(json as ScanResult);
                } else if (isRawPhoneScan(json)) {
                    // Raw phone scan data from file upload too
                    const scanResult = transformRawScanToScanResult(json);
                    loadScanResult(scanResult);
                } else if (json.entries && Array.isArray(json.entries)) {
                    loadVpnLog(json.entries as VpnLogEntry[]);
                } else if (Array.isArray(json) && json[0]?.destination_host) {
                    loadVpnLog(json as VpnLogEntry[]);
                }
            } catch (err) {
                console.error('Failed to parse JSON:', err);
            }
        };
        reader.readAsText(file);
    }, [loadScanResult, loadVpnLog, loadCombinedJson]);

    return {
        data,
        loadScanResult,
        loadVpnLog,
        loadSampleData,
        loadFromUrl,
        handleFileUpload,
        isLoadingUrl,
        urlError,
    };
}

