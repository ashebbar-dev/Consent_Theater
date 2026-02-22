import { useMemo } from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from '../shared/AnimatedCounter';
import type { AppScanResult, MockContact } from '../../types';

interface IndictmentPanelProps {
    apps: AppScanResult[];
    contacts: MockContact[];
}

export default function IndictmentPanel({ apps, contacts }: IndictmentPanelProps) {
    const analysis = useMemo(() => {
        const contactReadingApps = apps.filter((a) =>
            a.dangerous_permissions.includes('READ_CONTACTS')
        );
        const ghostContacts = contacts.filter((c) => c.is_ghost);
        const highRiskApps = apps.filter((a) => a.risk_score > 60);
        const totalTrackers = apps.reduce((sum, a) => sum + a.tracker_count, 0);

        // Calculate unique companies from all trackers
        const allCompanies = new Set<string>();
        apps.forEach((a) => a.trackers.forEach((t) => allCompanies.add(t.company)));

        // Worst offenders
        const worstApps = [...apps]
            .sort((a, b) => b.tracker_count - a.tracker_count)
            .slice(0, 5);

        return {
            contactReadingApps,
            ghostContacts,
            highRiskApps,
            totalTrackers,
            uniqueCompanies: allCompanies.size,
            worstApps,
            totalContacts: contacts.length,
        };
    }, [apps, contacts]);

    const indictments = [
        {
            icon: '📖',
            severity: 'CRITICAL' as const,
            title: `${analysis.contactReadingApps.length} apps read your entire contact list`,
            detail: `Apps like ${analysis.contactReadingApps
                .slice(0, 3)
                .map((a) => a.app_name)
                .join(', ')} uploaded your ${analysis.totalContacts} contacts to their servers.`,
            show: analysis.contactReadingApps.length > 0,
        },
        {
            icon: '👻',
            severity: 'HIGH' as const,
            title: `${analysis.ghostContacts.length} "ghost" contacts tracked without consent`,
            detail: `People in your phonebook who don't use these apps are being profiled anyway — shadow profiles built from your data.`,
            show: analysis.ghostContacts.length > 0,
        },
        {
            icon: '🔴',
            severity: 'HIGH' as const,
            title: `${analysis.highRiskApps.length} apps have Critical or Very High risk scores`,
            detail: `These apps combine aggressive permissions with embedded trackers, maximizing data extraction.`,
            show: analysis.highRiskApps.length > 0,
        },
        {
            icon: '🏢',
            severity: 'MEDIUM' as const,
            title: `${analysis.uniqueCompanies} companies have your data`,
            detail: `From ${analysis.totalTrackers} tracker instances across ${apps.length} apps, your behavioral data flows to ${analysis.uniqueCompanies} distinct corporate entities.`,
            show: analysis.uniqueCompanies > 0,
        },
    ];

    const severityColors = {
        CRITICAL: { bg: '#EF444420', border: '#EF444460', text: '#EF4444' },
        HIGH: { bg: '#F59E0B20', border: '#F59E0B60', text: '#F59E0B' },
        MEDIUM: { bg: '#8B5CF620', border: '#8B5CF660', text: '#8B5CF6' },
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">📋 The Indictment</h2>
            <p className="text-theater-muted mb-6">
                A summary of privacy violations discovered on your device
            </p>

            <div className="space-y-4">
                {indictments
                    .filter((i) => i.show)
                    .map((item, index) => {
                        const colors = severityColors[item.severity];
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.2 }}
                                className="rounded-xl p-5 border"
                                style={{
                                    backgroundColor: colors.bg,
                                    borderColor: colors.border,
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{item.icon}</span>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                                                style={{
                                                    backgroundColor: colors.border,
                                                    color: '#0a0a0f',
                                                }}
                                            >
                                                {item.severity}
                                            </span>
                                        </div>
                                        <h3
                                            className="font-bold text-lg"
                                            style={{ color: colors.text }}
                                        >
                                            {item.title}
                                        </h3>
                                        <p className="text-theater-muted text-sm mt-1">
                                            {item.detail}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
            </div>

            {/* Worst offenders table */}
            <div className="mt-8">
                <h3 className="text-lg font-bold text-theater-text mb-4">🏴 Worst Offenders</h3>
                <div className="bg-theater-card rounded-xl border border-theater-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-theater-surface">
                                <th className="p-3 text-left text-theater-muted font-medium">App</th>
                                <th className="p-3 text-center text-theater-muted font-medium">Trackers</th>
                                <th className="p-3 text-center text-theater-muted font-medium">Perms</th>
                                <th className="p-3 text-center text-theater-muted font-medium">Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysis.worstApps.map((app, i) => (
                                <tr
                                    key={app.package_name}
                                    className="border-t border-theater-border/50 hover:bg-theater-surface/30"
                                >
                                    <td className="p-3">
                                        <span className="text-theater-text font-medium">{app.app_name}</span>
                                        <br />
                                        <span className="text-theater-muted text-xs font-mono">
                                            {app.package_name}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center text-red-400 font-bold">
                                        {app.tracker_count}
                                    </td>
                                    <td className="p-3 text-center text-amber-400 font-bold">
                                        {app.dangerous_permission_count}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span
                                            className="px-2 py-1 rounded-full text-xs font-bold"
                                            style={{
                                                backgroundColor:
                                                    app.risk_score > 60
                                                        ? '#EF444420'
                                                        : app.risk_score > 30
                                                            ? '#F59E0B20'
                                                            : '#22C55E20',
                                                color:
                                                    app.risk_score > 60
                                                        ? '#EF4444'
                                                        : app.risk_score > 30
                                                            ? '#F59E0B'
                                                            : '#22C55E',
                                            }}
                                        >
                                            {app.risk_score}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
