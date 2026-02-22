import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { VpnLogEntry } from '../../types';

interface BlockingPanelProps {
    vpnLog: VpnLogEntry[];
}

interface CategoryToggle {
    name: string;
    icon: string;
    purposes: string[];
    enabled: boolean;
    color: string;
}

export default function BlockingPanel({ vpnLog }: BlockingPanelProps) {
    const [categories, setCategories] = useState<CategoryToggle[]>([
        { name: 'Advertising', icon: '📢', purposes: ['advertising', 'ads', 'ad network'], enabled: true, color: '#EF4444' },
        { name: 'Analytics', icon: '📊', purposes: ['analytics', 'measurement', 'telemetry'], enabled: true, color: '#F59E0B' },
        { name: 'Social', icon: '🤝', purposes: ['social', 'social graph', 'behavioral'], enabled: true, color: '#3B82F6' },
        { name: 'Crash Reporting', icon: '🐛', purposes: ['crash', 'error', 'debugging'], enabled: false, color: '#8B5CF6' },
        { name: 'Location', icon: '📍', purposes: ['location', 'geolocation', 'geofencing'], enabled: true, color: '#10B981' },
    ]);

    const stats = useMemo(() => {
        const blockedPurposes = categories
            .filter((c) => c.enabled)
            .flatMap((c) => c.purposes);

        const blocked = vpnLog.filter((entry) =>
            blockedPurposes.some((p) =>
                entry.destination_purpose.toLowerCase().includes(p)
            ) || (entry.is_tracker && categories.find((c) => c.name === 'Advertising')?.enabled)
        );

        const remaining = vpnLog.length - blocked.length;
        const blockedBytes = blocked.reduce((sum, e) => sum + e.bytes_transferred, 0);
        const blockedCompanies = new Set(blocked.map((e) => e.destination_company)).size;

        return {
            total: vpnLog.length,
            blocked: blocked.length,
            remaining: Math.max(remaining, 0),
            blockedBytes,
            blockedCompanies,
            reductionPercent: vpnLog.length > 0
                ? Math.round((blocked.length / vpnLog.length) * 100)
                : 0,
        };
    }, [vpnLog, categories]);

    const toggleCategory = (index: number) => {
        setCategories((prev) =>
            prev.map((c, i) => (i === index ? { ...c, enabled: !c.enabled } : c))
        );
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">🛡️ What If You Blocked Trackers?</h2>
            <p className="text-theater-muted mb-6">
                See the difference tracker blocking would make
            </p>

            {/* Before / After comparison */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center"
                >
                    <p className="text-red-400 text-xs font-medium mb-1">Yesterday (No Blocking)</p>
                    <p className="text-4xl font-black text-red-400">
                        {stats.total.toLocaleString()}
                    </p>
                    <p className="text-red-400/60 text-xs">connections</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-center"
                >
                    <p className="text-green-400 text-xs font-medium mb-1">With Blocking</p>
                    <p className="text-4xl font-black text-green-400">
                        ~{stats.remaining.toLocaleString()}
                    </p>
                    <p className="text-green-400/60 text-xs">connections</p>
                </motion.div>
            </div>

            {/* Reduction stat */}
            <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-theater-card border border-theater-border rounded-xl p-4 mb-6"
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-theater-muted text-sm">Reduction</span>
                    <span className="text-green-400 font-bold">{stats.reductionPercent}% fewer connections</span>
                </div>
                <div className="h-3 bg-theater-border rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.reductionPercent}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-theater-muted">
                    <span>{stats.blockedCompanies} companies blocked</span>
                    <span>{Math.round(stats.blockedBytes / 1024)} KB saved</span>
                </div>
            </motion.div>

            {/* Category toggles */}
            <div className="space-y-2">
                <p className="text-theater-muted text-xs font-medium mb-2">Toggle blocking categories:</p>
                {categories.map((cat, index) => (
                    <motion.button
                        key={cat.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        onClick={() => toggleCategory(index)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${cat.enabled
                                ? 'bg-theater-card border-opacity-50'
                                : 'bg-theater-surface border-theater-border opacity-50'
                            }`}
                        style={{
                            borderColor: cat.enabled ? cat.color + '50' : undefined,
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-lg">{cat.icon}</span>
                            <span className="text-theater-text text-sm font-medium">{cat.name}</span>
                        </div>
                        <div
                            className={`w-10 h-6 rounded-full relative transition-all ${cat.enabled ? 'bg-green-500' : 'bg-theater-border'
                                }`}
                        >
                            <motion.div
                                animate={{ x: cat.enabled ? 16 : 2 }}
                                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                            />
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
