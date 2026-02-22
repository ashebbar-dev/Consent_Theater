import type { AppScanResult, TrackerCompanyEntry } from '../types';

// Tracker company database — India-specific ARPU values  
const COMPANY_ARPU_INR: Record<string, number> = {
    'Meta Platforms': 1040,
    'Alphabet Inc.': 780,
    'Amazon.com Inc.': 550,
    'ByteDance': 420,
    'Unity Technologies': 310,
    'AppsFlyer': 180,
    'AppLovin': 250,
    'Branch Metrics': 120,
    'X Corp': 190,
    'Microsoft Corporation': 340,
    'Snap Inc.': 270,
    'InMobi': 380,
    'Braze': 90,
    'CleverTap': 150,
    'comScore': 160,
    'Criteo': 220,
    'Oracle Corporation': 200,
    'Adobe Inc.': 280,
    'Twilio': 110,
    'Yahoo': 130,
    'Sentry': 60,
    'True Software Scandinavia AB': 210,
    'Digital Turbine': 140,
    'PubMatic': 170,
    'Taboola': 100,
    'Outbrain': 95,
    'Mixpanel': 80,
    'Amplitude': 85,
    'OneSignal': 70,
    'Zynga': 200,
};

export interface RevenueBreakdown {
    totalAnnualInr: number;
    totalAnnualUsd: number;
    perCompany: Array<{
        company: string;
        annualInr: number;
        trackerCount: number;
        apps: string[];
    }>;
    perDay: number;
    perHour: number;
}

/**
 * Calculate the estimated annual revenue generated from this user's data
 * by all the tracking companies found in their installed apps.
 */
export function calculateRevenue(apps: AppScanResult[]): RevenueBreakdown {
    const companyMap = new Map<string, { trackerCount: number; apps: Set<string> }>();

    // Aggregate trackers by company
    apps.forEach((app) => {
        app.trackers.forEach((tracker) => {
            const company = tracker.company || 'Unknown';
            const existing = companyMap.get(company) || { trackerCount: 0, apps: new Set() };
            existing.trackerCount++;
            existing.apps.add(app.app_name);
            companyMap.set(company, existing);
        });
    });

    // Calculate ARPU for each company
    const perCompany = Array.from(companyMap.entries())
        .map(([company, data]) => ({
            company,
            annualInr: COMPANY_ARPU_INR[company] || 100, // default ₹100 for unknown
            trackerCount: data.trackerCount,
            apps: Array.from(data.apps),
        }))
        .sort((a, b) => b.annualInr - a.annualInr);

    const totalAnnualInr = perCompany.reduce((sum, c) => sum + c.annualInr, 0);
    const totalAnnualUsd = Math.round(totalAnnualInr / 83); // approximate INR to USD

    return {
        totalAnnualInr,
        totalAnnualUsd,
        perCompany,
        perDay: Math.round(totalAnnualInr / 365),
        perHour: Math.round(totalAnnualInr / 8760 * 100) / 100,
    };
}
