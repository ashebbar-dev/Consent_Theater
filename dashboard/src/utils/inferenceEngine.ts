import type { AppScanResult } from '../types';

export interface DemographicProfile {
    inferredGender: string;
    ageRange: string;
    incomeLevel: string;
    interests: string[];
    location: string;
    confidence: number;
}

// App category → demographic signals
const APP_SIGNALS: Record<string, { ageWeight: number; gender: string; income: string; interest: string }> = {
    'com.instagram.android': { ageWeight: -5, gender: 'neutral', income: 'medium', interest: 'Social Media' },
    'com.facebook.katana': { ageWeight: 5, gender: 'neutral', income: 'medium', interest: 'Social Media' },
    'com.whatsapp': { ageWeight: 0, gender: 'neutral', income: 'medium', interest: 'Messaging' },
    'com.zhiliaoapp.musically': { ageWeight: -10, gender: 'female-lean', income: 'low-medium', interest: 'Short-form Video' },
    'com.twitter.android': { ageWeight: 0, gender: 'male-lean', income: 'medium-high', interest: 'News & Politics' },
    'com.linkedin.android': { ageWeight: 5, gender: 'neutral', income: 'high', interest: 'Professional' },
    'com.spotify.music': { ageWeight: -3, gender: 'neutral', income: 'medium-high', interest: 'Music' },
    'com.google.android.youtube': { ageWeight: 0, gender: 'neutral', income: 'medium', interest: 'Video' },
    'com.amazon.mShop.android.shopping': { ageWeight: 3, gender: 'neutral', income: 'medium-high', interest: 'Shopping' },
    'com.flipkart.android': { ageWeight: 0, gender: 'neutral', income: 'medium', interest: 'Shopping' },
    'com.phonepe.app': { ageWeight: 0, gender: 'neutral', income: 'medium', interest: 'Finance' },
    'com.dream11.fantasy.cricket': { ageWeight: -3, gender: 'male-lean', income: 'medium', interest: 'Sports & Gaming' },
    'com.truecaller': { ageWeight: 0, gender: 'neutral', income: 'medium', interest: 'Communication' },
    'com.king.candycrushsaga': { ageWeight: 5, gender: 'female-lean', income: 'medium', interest: 'Casual Gaming' },
    'com.snapchat.android': { ageWeight: -8, gender: 'neutral', income: 'low-medium', interest: 'Social Media' },
};

// Permission → interest mapping
const PERMISSION_INTERESTS: Record<string, string> = {
    'ACCESS_FINE_LOCATION': 'Location-aware Services',
    'CAMERA': 'Photography & AR',
    'RECORD_AUDIO': 'Voice & Audio',
    'READ_CONTACTS': 'Social Networking',
    'READ_CALENDAR': 'Scheduling & Productivity',
    'BODY_SENSORS': 'Health & Fitness',
    'ACTIVITY_RECOGNITION': 'Fitness Tracking',
};

export function inferDemographics(apps: AppScanResult[]): DemographicProfile {
    let ageWeight = 0;
    let maleSignals = 0;
    let femaleSignals = 0;
    let incomeSignals: string[] = [];
    const interests = new Set<string>();

    // Analyze installed apps
    apps.forEach((app) => {
        const signal = APP_SIGNALS[app.package_name];
        if (signal) {
            ageWeight += signal.ageWeight;
            if (signal.gender === 'male-lean') maleSignals++;
            if (signal.gender === 'female-lean') femaleSignals++;
            incomeSignals.push(signal.income);
            interests.add(signal.interest);
        }

        // Infer interests from permissions
        app.dangerous_permissions.forEach((perm) => {
            const interest = PERMISSION_INTERESTS[perm];
            if (interest) interests.add(interest);
        });

        // Infer from tracker types
        if (app.trackers.some((t) => t.company === 'InMobi' || t.company === 'CleverTap')) {
            interests.add('Mobile Commerce');
        }
    });

    // Determine age range
    const baseAge = 28;
    const adjustedAge = baseAge + ageWeight;
    let ageRange: string;
    if (adjustedAge < 20) ageRange = '16-22';
    else if (adjustedAge < 25) ageRange = '18-25';
    else if (adjustedAge < 30) ageRange = '22-30';
    else if (adjustedAge < 35) ageRange = '25-34';
    else ageRange = '30-45';

    // Determine gender
    let inferredGender: string;
    if (maleSignals > femaleSignals + 1) inferredGender = 'Likely Male';
    else if (femaleSignals > maleSignals + 1) inferredGender = 'Likely Female';
    else inferredGender = 'Undetermined';

    // Determine income
    const incomeMap: Record<string, number> = { low: 1, 'low-medium': 2, medium: 3, 'medium-high': 4, high: 5 };
    const avgIncome =
        incomeSignals.reduce((sum, i) => sum + (incomeMap[i] || 3), 0) /
        (incomeSignals.length || 1);
    let incomeLevel: string;
    if (avgIncome < 2) incomeLevel = '₹2-4 LPA';
    else if (avgIncome < 3) incomeLevel = '₹4-8 LPA';
    else if (avgIncome < 4) incomeLevel = '₹8-15 LPA';
    else incomeLevel = '₹15-30 LPA';

    return {
        inferredGender,
        ageRange,
        incomeLevel,
        interests: Array.from(interests).slice(0, 8),
        location: 'India (inferred from app selection)',
        confidence: Math.min(Math.round((apps.length / 20) * 100), 95),
    };
}
