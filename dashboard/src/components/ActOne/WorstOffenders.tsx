import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { VpnLogEntry } from '../../types';

interface WorstOffendersProps {
    vpnLog: VpnLogEntry[];
}

interface OffenderEntry {
    appName: string;
    packageName: string;
    connectionCount: number;
    uniqueCompanies: number;
    sleepingConnections: number;
    bytesTransferred: number;
}

export default function WorstOffenders({ vpnLog }: WorstOffendersProps) {
    const offenders = useMemo(() => {
        const appMap = new Map<string, {
            packageName: string;
            connections: number;
            companies: Set<string>;
            sleeping: number;
            bytes: number;
        }>();

        vpnLog.forEach((entry) => {
            const existing = appMap.get(entry.source_app_name) || {
                packageName: entry.source_app,
                connections: 0,
                companies: new Set<string>(),
                sleeping: 0,
                bytes: 0,
            };
            existing.connections++;
            existing.companies.add(entry.destination_company);
            if (entry.hour_of_day >= 0 && entry.hour_of_day <= 6) existing.sleeping++;
            existing.bytes += entry.bytes_transferred;
            appMap.set(entry.source_app_name, existing);
        });

        const entries: OffenderEntry[] = Array.from(appMap.entries())
            .map(([appName, data]) => ({
                appName,
                packageName: data.packageName,
                connectionCount: data.connections,
                uniqueCompanies: data.companies.size,
                sleepingConnections: data.sleeping,
                bytesTransferred: data.bytes,
            }))
            .sort((a, b) => b.connectionCount - a.connectionCount);

        return entries;
    }, [vpnLog]);

    const maxConnections = offenders[0]?.connectionCount || 1;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">🏆 Worst Offenders</h2>
            <p className="text-theater-muted mb-6">
                Apps ranked by tracker connections in 24 hours
            </p>

            <div className="space-y-3">
                {offenders.slice(0, 15).map((app, index) => {
                    const barWidth = (app.connectionCount / maxConnections) * 100;
                    const isTop3 = index < 3;

                    return (
                        <motion.div
                            key={app.packageName}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
                            className={`relative bg-theater-card rounded-xl p-4 border overflow-hidden ${isTop3 ? 'border-red-500/40' : 'border-theater-border'
                                }`}
                        >
                            {/* Background bar */}
                            <div
                                className="absolute inset-y-0 left-0 opacity-10 rounded-xl"
                                style={{
                                    width: `${barWidth}%`,
                                    background: isTop3
                                        ? 'linear-gradient(90deg, #EF4444, #F97316)'
                                        : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                                }}
                            />

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className={`text-lg font-black ${isTop3 ? 'text-red-400' : 'text-theater-muted'
                                        }`}>
                                        #{index + 1}
                                    </span>
                                    <div>
                                        <p className="font-bold text-theater-text text-sm">
                                            {app.appName}
                                        </p>
                                        <p className="text-theater-muted text-xs">
                                            {app.uniqueCompanies} companies · {Math.round(app.bytesTransferred / 1024)} KB
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-right">
                                    {app.sleepingConnections > 0 && (
                                        <span className="text-xs text-yellow-400/80 flex items-center gap-1">
                                            😴 {app.sleepingConnections}
                                        </span>
                                    )}
                                    <div>
                                        <span className={`text-xl font-black ${isTop3 ? 'text-red-400' : 'text-indigo-400'
                                            }`}>
                                            {app.connectionCount}
                                        </span>
                                        <p className="text-theater-muted text-[10px]">connections</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {offenders.length > 15 && (
                <p className="text-center text-theater-muted text-sm mt-4">
                    + {offenders.length - 15} more apps...
                </p>
            )}
        </div>
    );
}
