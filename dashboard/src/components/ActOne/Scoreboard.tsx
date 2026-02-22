import { useMemo } from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from '../shared/AnimatedCounter';
import type { VpnLogEntry } from '../../types';

interface ScoreboardProps {
    vpnLog: VpnLogEntry[];
}

export default function Scoreboard({ vpnLog }: ScoreboardProps) {
    const stats = useMemo(() => {
        const uniqueCompanies = new Set(vpnLog.map((e) => e.destination_company));
        const uniqueCountries = new Set(vpnLog.map((e) => e.destination_country));
        const sleepingConnections = vpnLog.filter(
            (e) => e.hour_of_day >= 0 && e.hour_of_day <= 6
        );
        const sleepingApps = new Set(
            sleepingConnections.map((e) => e.source_app_name)
        );
        const totalBytes = vpnLog.reduce((sum, e) => sum + e.bytes_transferred, 0);
        const inactiveConnections = vpnLog.filter((e) => !e.user_was_active);

        return {
            totalConnections: vpnLog.length,
            uniqueCompanies: uniqueCompanies.size,
            uniqueCountries: uniqueCountries.size,
            sleepingConnections: sleepingConnections.length,
            sleepingApps: sleepingApps.size,
            totalDataKB: Math.round(totalBytes / 1024),
            inactiveConnections: inactiveConnections.length,
            // Most active tracker company
            topCompany: getMostCommon(vpnLog.map((e) => e.destination_company)),
            topApp: getMostCommon(vpnLog.map((e) => e.source_app_name)),
        };
    }, [vpnLog]);

    const cards = [
        {
            icon: '📡',
            label: 'Tracker Connections',
            value: stats.totalConnections,
            color: '#EF4444',
            detail: 'in 24 hours',
        },
        {
            icon: '🏢',
            label: 'Unique Companies',
            value: stats.uniqueCompanies,
            color: '#8B5CF6',
            detail: 'received your data',
        },
        {
            icon: '🌍',
            label: 'Countries Reached',
            value: stats.uniqueCountries,
            color: '#6366F1',
            detail: 'your data was sent to',
        },
        {
            icon: '😴',
            label: 'While Sleeping',
            value: stats.sleepingConnections,
            color: '#EF4444',
            detail: `${stats.sleepingApps} apps active at night`,
        },
        {
            icon: '👻',
            label: 'Background Sends',
            value: stats.inactiveConnections,
            color: '#F59E0B',
            detail: 'while you weren\'t using apps',
        },
        {
            icon: '📊',
            label: 'Data Transferred',
            value: stats.totalDataKB,
            color: '#10B981',
            detail: 'KB of tracking data',
            suffix: ' KB',
        },
    ];

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">📊 The Numbers</h2>
            <p className="text-theater-muted mb-6">
                What happened in just 24 hours on your phone
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {cards.map((card, index) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.15, type: 'spring', stiffness: 200 }}
                        className="bg-theater-card rounded-xl p-5 border border-theater-border hover:border-opacity-60 transition-all"
                        style={{ borderColor: `${card.color}30` }}
                    >
                        <span className="text-2xl">{card.icon}</span>
                        <div className="mt-3">
                            <AnimatedCounter
                                value={card.value}
                                duration={2}
                                suffix={card.suffix}
                                className="text-3xl font-black block"
                                style={{ color: card.color }}
                            />
                            <p className="text-theater-text text-sm font-medium mt-1">
                                {card.label}
                            </p>
                            <p className="text-theater-muted text-xs mt-0.5">
                                {card.detail}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Most active callout */}
            {stats.topCompany && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center"
                >
                    <p className="text-red-400 text-sm">
                        🏆 <strong>{stats.topCompany}</strong> was the most frequent tracker company,
                        and <strong>{stats.topApp}</strong> was the app sending the most data.
                    </p>
                </motion.div>
            )}
        </div>
    );
}

function getMostCommon(arr: string[]): string {
    const counts = new Map<string, number>();
    arr.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
    let max = 0;
    let result = '';
    counts.forEach((count, item) => {
        if (count > max) {
            max = count;
            result = item;
        }
    });
    return result;
}
