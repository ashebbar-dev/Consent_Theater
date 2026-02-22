import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { AppScanResult } from '../../types';
import { inferDemographics } from '../../utils/inferenceEngine';
import { calculateRevenue } from '../../utils/revenueCalculator';

/** Round down to a "nice" lower bound for a range display */
function roundDown(n: number): number {
    if (n < 50) return Math.floor(n / 5) * 5;
    if (n < 500) return Math.floor(n / 50) * 50;
    if (n < 5000) return Math.floor(n / 500) * 500;
    return Math.floor(n / 1000) * 1000;
}
/** Round up to a "nice" upper bound for a range display */
function roundUp(n: number): number {
    if (n < 50) return Math.ceil(n / 5) * 5 + 5;
    if (n < 500) return Math.ceil(n / 50) * 50 + 50;
    if (n < 5000) return Math.ceil(n / 500) * 500 + 500;
    return Math.ceil(n / 1000) * 1000 + 1000;
}
function rangeInr(n: number): string {
    return `₹${roundDown(n).toLocaleString('en-IN')}–${roundUp(n).toLocaleString('en-IN')}`;
}

interface PredictionPanelProps {
    apps: AppScanResult[];
}

export default function PredictionPanel({ apps }: PredictionPanelProps) {
    const profile = useMemo(() => inferDemographics(apps), [apps]);
    const revenue = useMemo(() => calculateRevenue(apps), [apps]);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">🔮 What They Know About You</h2>
            <p className="text-theater-muted mb-6">
                Based on your installed apps alone, data brokers likely classify you as…
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Demographic Profile Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-theater-card rounded-xl p-6 border border-theater-border"
                >
                    <h3 className="text-lg font-bold text-theater-accent mb-4">
                        👤 Inferred Profile
                    </h3>

                    <div className="space-y-4">
                        <ProfileRow label="Gender" value={profile.inferredGender} icon="⚧" />
                        <ProfileRow label="Age Range" value={profile.ageRange} icon="📅" />
                        <ProfileRow label="Income Level" value={profile.incomeLevel} icon="💰" />
                        <ProfileRow label="Location" value={profile.location} icon="📍" />

                        <div>
                            <span className="text-theater-muted text-sm">🎯 Interests:</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {profile.interests.map((interest, i) => (
                                    <motion.span
                                        key={interest}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="text-xs px-3 py-1 rounded-full bg-theater-accent/15 text-theater-accent border border-theater-accent/30"
                                    >
                                        {interest}
                                    </motion.span>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-theater-border">
                            <span className="text-theater-muted text-xs">
                                Confidence: {profile.confidence}% (based on {apps.length} apps)
                            </span>
                            <div className="w-full h-2 bg-theater-border rounded-full mt-1">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${profile.confidence}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className="h-full bg-theater-accent rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Revenue Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-theater-card rounded-xl p-6 border border-theater-border"
                >
                    <h3 className="text-lg font-bold text-theater-danger mb-4">
                        💸 Your Data's Value
                    </h3>

                    {/* Big number */}
                    <div className="text-center mb-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.3 }}
                            className="text-5xl font-black text-theater-danger"
                        >
                            ~{rangeInr(revenue.totalAnnualInr)}
                        </motion.div>
                        <p className="text-theater-muted text-sm mt-1">
                            avg. estimated annual value (~${roundDown(revenue.totalAnnualUsd)}–${roundUp(revenue.totalAnnualUsd)} USD)
                        </p>
                        <div className="flex justify-center gap-6 mt-3">
                            <div className="text-center">
                                <span className="text-lg font-bold text-theater-warning">
                                    ~₹{roundDown(revenue.perDay)}–{roundUp(revenue.perDay)}
                                </span>
                                <p className="text-theater-muted text-xs">per day</p>
                            </div>
                            <div className="text-center">
                                <span className="text-lg font-bold text-theater-warning">
                                    ~₹{Math.max(1, Math.floor(revenue.perHour))}–{Math.ceil(revenue.perHour) + 1}
                                </span>
                                <p className="text-theater-muted text-xs">per hour</p>
                            </div>
                        </div>
                    </div>

                    {/* Top earners */}
                    <div className="space-y-2">
                        <p className="text-theater-muted text-xs font-medium">Top earners from your data:</p>
                        {revenue.perCompany.slice(0, 6).map((company, i) => (
                            <motion.div
                                key={company.company}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                className="flex items-center justify-between text-sm"
                            >
                                <span className="text-theater-text">{company.company}</span>
                                <span className="text-theater-danger font-mono font-bold">
                                    ~{rangeInr(company.annualInr)}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function ProfileRow({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-theater-muted text-sm flex items-center gap-2">
                <span>{icon}</span>
                {label}:
            </span>
            <span className="text-theater-text font-medium text-sm">{value}</span>
        </div>
    );
}
