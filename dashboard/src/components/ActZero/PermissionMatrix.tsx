import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { AppScanResult } from '../../types';
import { DANGEROUS_PERMISSIONS } from '../../types';

interface PermissionMatrixProps {
    apps: AppScanResult[];
}

export default function PermissionMatrix({ apps }: PermissionMatrixProps) {
    // Sort apps by dangerous permission count (most first)
    const sortedApps = useMemo(
        () => [...apps].sort((a, b) => b.dangerous_permission_count - a.dangerous_permission_count),
        [apps]
    );

    // Count how many apps have each permission
    const permissionCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        DANGEROUS_PERMISSIONS.forEach((p) => {
            counts[p] = apps.filter((a) =>
                a.dangerous_permissions.includes(p)
            ).length;
        });
        return counts;
    }, [apps]);

    // Short labels for permissions
    const shortLabels: Record<string, string> = {
        READ_CONTACTS: 'Contacts',
        WRITE_CONTACTS: 'W.Contacts',
        READ_CALL_LOG: 'Call Log',
        CAMERA: 'Camera',
        RECORD_AUDIO: 'Mic',
        ACCESS_FINE_LOCATION: 'GPS',
        ACCESS_COARSE_LOCATION: 'Location',
        READ_PHONE_STATE: 'Phone',
        READ_EXTERNAL_STORAGE: 'R.Storage',
        WRITE_EXTERNAL_STORAGE: 'W.Storage',
        READ_SMS: 'SMS',
        SEND_SMS: 'Send SMS',
        READ_CALENDAR: 'Calendar',
        BODY_SENSORS: 'Sensors',
        ACTIVITY_RECOGNITION: 'Activity',
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">🔓 Permission Matrix</h2>
            <p className="text-theater-muted mb-6">
                Every filled cell is data flowing from your phone to a company's servers
            </p>

            <div className="bg-theater-card rounded-xl border border-theater-border overflow-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            <th className="sticky left-0 bg-theater-card z-10 p-2 text-left text-theater-muted font-medium border-b border-theater-border min-w-[140px]">
                                App
                            </th>
                            {DANGEROUS_PERMISSIONS.map((perm) => (
                                <th
                                    key={perm}
                                    className="p-2 text-center text-theater-muted font-medium border-b border-theater-border"
                                    style={{ minWidth: 50 }}
                                >
                                    <div className="writing-mode-vertical transform -rotate-45 origin-center whitespace-nowrap text-[10px]">
                                        {shortLabels[perm] || perm}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedApps.map((app, rowIdx) => (
                            <motion.tr
                                key={app.package_name}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: rowIdx * 0.02 }}
                                className="hover:bg-theater-surface/50"
                            >
                                <td className="sticky left-0 bg-theater-card z-10 p-2 border-b border-theater-border/50">
                                    <span className="text-theater-text font-medium text-xs truncate block max-w-[140px]">
                                        {app.app_name}
                                    </span>
                                </td>
                                {DANGEROUS_PERMISSIONS.map((perm) => {
                                    const hasPermission = app.dangerous_permissions.includes(perm);
                                    return (
                                        <td
                                            key={perm}
                                            className="p-1 text-center border-b border-theater-border/50"
                                        >
                                            {hasPermission ? (
                                                <div
                                                    className="w-5 h-5 mx-auto rounded-sm"
                                                    style={{
                                                        backgroundColor: app.risk_score > 60
                                                            ? '#EF4444'
                                                            : app.risk_score > 30
                                                                ? '#F59E0B'
                                                                : '#22C55E',
                                                        opacity: 0.8,
                                                    }}
                                                    title={`${app.app_name} → ${perm}`}
                                                />
                                            ) : (
                                                <div className="w-5 h-5 mx-auto rounded-sm bg-theater-border/20" />
                                            )}
                                        </td>
                                    );
                                })}
                            </motion.tr>
                        ))}
                    </tbody>

                    {/* Footer with counts */}
                    <tfoot>
                        <tr className="bg-theater-surface">
                            <td className="sticky left-0 bg-theater-surface z-10 p-2 text-theater-muted font-bold text-xs">
                                Apps with access →
                            </td>
                            {DANGEROUS_PERMISSIONS.map((perm) => (
                                <td key={perm} className="p-2 text-center">
                                    <span
                                        className="text-xs font-bold"
                                        style={{
                                            color: permissionCounts[perm] > apps.length * 0.5
                                                ? '#EF4444'
                                                : permissionCounts[perm] > apps.length * 0.2
                                                    ? '#F59E0B'
                                                    : '#94A3B8',
                                        }}
                                    >
                                        {permissionCounts[perm]}
                                    </span>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
