import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AppScanResult } from '../../types';

interface AppGridProps {
    apps: AppScanResult[];
}

function getRiskColor(score: number): string {
    if (score <= 30) return '#22C55E';
    if (score <= 60) return '#F59E0B';
    return '#EF4444';
}

function getRiskLabel(score: number): string {
    if (score <= 20) return 'Low';
    if (score <= 40) return 'Moderate';
    if (score <= 60) return 'High';
    if (score <= 80) return 'Very High';
    return 'Critical';
}

export default function AppGrid({ apps }: AppGridProps) {
    const [expandedApp, setExpandedApp] = useState<string | null>(null);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">📦 Installed Apps</h2>
            <p className="text-theater-muted mb-6">
                {apps.length} apps scanned · Each card shows trackers embedded in the app code
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {apps.map((app, index) => {
                    const color = getRiskColor(app.risk_score);
                    const isExpanded = expandedApp === app.package_name;

                    return (
                        <motion.div
                            key={app.package_name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.3 }}
                            onClick={() => setExpandedApp(isExpanded ? null : app.package_name)}
                            className="cursor-pointer"
                        >
                            <div
                                className="bg-theater-card rounded-xl p-4 border-2 transition-all duration-300 hover:scale-[1.02]"
                                style={{
                                    borderColor: `${color}40`,
                                    boxShadow: isExpanded ? `0 0 20px ${color}30` : 'none',
                                }}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-theater-text font-semibold text-sm truncate">
                                            {app.app_name}
                                        </h3>
                                        <p className="text-theater-muted text-xs truncate font-mono">
                                            {app.package_name}
                                        </p>
                                    </div>
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ml-2"
                                        style={{
                                            border: `2px solid ${color}`,
                                            color: color,
                                            backgroundColor: `${color}15`,
                                        }}
                                    >
                                        {app.risk_score}
                                    </div>
                                </div>

                                {/* Badges */}
                                <div className="flex gap-2 mb-2">
                                    <span
                                        className="text-xs px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: '#EF444420',
                                            color: '#EF4444',
                                        }}
                                    >
                                        {app.tracker_count} trackers
                                    </span>
                                    <span
                                        className="text-xs px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: '#F59E0B20',
                                            color: '#F59E0B',
                                        }}
                                    >
                                        {app.dangerous_permission_count} perms
                                    </span>
                                </div>

                                {/* Risk label */}
                                <div className="text-xs font-medium" style={{ color }}>
                                    {getRiskLabel(app.risk_score)} Risk
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mt-3 pt-3 border-t border-theater-border"
                                    >
                                        {app.trackers.length > 0 && (
                                            <div className="mb-3">
                                                <p className="text-xs font-semibold text-red-400 mb-1">Trackers:</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {app.trackers.map((t, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20"
                                                        >
                                                            {t.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {app.dangerous_permissions.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-amber-400 mb-1">
                                                    Dangerous Permissions:
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {app.dangerous_permissions.map((p, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                                        >
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
