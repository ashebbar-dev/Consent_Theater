// TypeScript interfaces matching the scan result JSON schema (§5.1 of TDD)

export interface TrackerInfo {
    name: string;
    company: string;
}

export interface AppScanResult {
    package_name: string;
    app_name: string;
    permissions: string[];
    dangerous_permissions: string[];
    trackers: TrackerInfo[];
    tracker_count: number;
    dangerous_permission_count: number;
    risk_score: number;
}

export interface ScanResult {
    scan_id: string;
    device_model: string;
    android_version: string;
    scan_timestamp: string;
    total_apps: number;
    total_trackers: number;
    total_dangerous_permissions: number;
    apps: AppScanResult[];
}

export interface VpnLogEntry {
    timestamp: string;
    source_app: string;
    source_app_name: string;
    destination_host: string;
    destination_ip: string;
    destination_company: string;
    destination_purpose: string;
    destination_country: string;
    destination_city: string;
    destination_lat: number;
    destination_lng: number;
    bytes_transferred: number;
    is_tracker: boolean;
    hour_of_day: number;
    user_was_active: boolean;
}

export interface BrokerContact {
    name: string;
    dpo_email: string;
    deletion_url: string;
    jurisdiction: string;
    typical_response_days: number;
    category?: string;
}

export interface TrackerCompanyEntry {
    hostname: string;
    company: string;
    parent_company?: string;
    category: string;
    country: string;
    coordinates: [number, number];
    arpu_inr_annual: number;
}

export interface MockContact {
    name: string;
    is_ghost: boolean;
    digital_footprint_score: number;
    exposed_to: string[];
    exposed_by_apps: string[];
}

// The 15 dangerous Android permissions
export const DANGEROUS_PERMISSIONS = [
    'READ_CONTACTS',
    'WRITE_CONTACTS',
    'READ_CALL_LOG',
    'CAMERA',
    'RECORD_AUDIO',
    'ACCESS_FINE_LOCATION',
    'ACCESS_COARSE_LOCATION',
    'READ_PHONE_STATE',
    'READ_EXTERNAL_STORAGE',
    'WRITE_EXTERNAL_STORAGE',
    'READ_SMS',
    'SEND_SMS',
    'READ_CALENDAR',
    'BODY_SENSORS',
    'ACTIVITY_RECOGNITION',
] as const;
