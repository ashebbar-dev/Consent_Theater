import { useMemo } from 'react';
import type { VpnLogEntry } from '../../types';

interface TimelineProps {
    vpnLog: VpnLogEntry[];
}

export default function Timeline({ vpnLog }: TimelineProps) {
    // Group entries by hour
    const hourlyData = useMemo(() => {
        const hours: Array<{
            hour: number;
            entries: VpnLogEntry[];
            totalBytes: number;
            isSleeping: boolean;
        }> = [];

        for (let h = 0; h < 24; h++) {
            const entries = vpnLog.filter((e) => e.hour_of_day === h);
            hours.push({
                hour: h,
                entries,
                totalBytes: entries.reduce((sum, e) => sum + e.bytes_transferred, 0),
                isSleeping: h >= 0 && h <= 6,
            });
        }
        return hours;
    }, [vpnLog]);

    const maxBytes = useMemo(
        () => Math.max(...hourlyData.map((h) => h.totalBytes), 1),
        [hourlyData]
    );

    const formatHour = (h: number) => {
        if (h === 0) return '12AM';
        if (h === 12) return '12PM';
        return h < 12 ? `${h}AM` : `${h - 12}PM`;
    };

    const sleepingEntries = vpnLog.filter(
        (e) => e.hour_of_day >= 0 && e.hour_of_day <= 6
    );

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">⏱️ 24-Hour Timeline</h2>
            <p className="text-theater-muted mb-6">
                Each bar = data sent to trackers that hour. Dark band = you were sleeping.
                {sleepingEntries.length > 0 && (
                    <span className="text-red-400 ml-2 font-medium">
                        {sleepingEntries.length} connections while you slept!
                    </span>
                )}
            </p>

            <div className="bg-theater-card rounded-xl border border-theater-border p-6">
                {/* Chart */}
                <div className="flex items-end gap-1 h-48 mb-4">
                    {hourlyData.map((hourData) => {
                        const barHeight = (hourData.totalBytes / maxBytes) * 100;
                        const hasActivity = hourData.entries.length > 0;

                        return (
                            <div
                                key={hourData.hour}
                                className="flex-1 flex flex-col items-center justify-end h-full relative group"
                            >
                                {/* Sleeping background */}
                                {hourData.isSleeping && (
                                    <div className="absolute inset-0 bg-red-500/5 rounded-t" />
                                )}

                                {/* Bar */}
                                <div
                                    className="w-full rounded-t transition-all duration-300 group-hover:opacity-80 relative"
                                    style={{
                                        height: `${Math.max(barHeight, hasActivity ? 4 : 0)}%`,
                                        backgroundColor: hourData.isSleeping
                                            ? '#EF4444'
                                            : '#6366F1',
                                        opacity: hasActivity ? 0.8 : 0.1,
                                    }}
                                >
                                    {/* Tooltip */}
                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 pointer-events-none transition-opacity">
                                        <div className="bg-theater-surface border border-theater-border rounded-lg p-2 shadow-xl whitespace-nowrap text-xs">
                                            <p className="text-theater-text font-bold">
                                                {formatHour(hourData.hour)}
                                                {hourData.isSleeping && ' 😴'}
                                            </p>
                                            <p className="text-theater-muted">
                                                {hourData.entries.length} connections
                                            </p>
                                            <p className="text-theater-muted">
                                                {(hourData.totalBytes / 1024).toFixed(1)} KB sent
                                            </p>
                                            {hourData.entries.slice(0, 3).map((e, i) => (
                                                <p key={i} className="text-theater-accent text-[10px]">
                                                    {e.source_app_name} → {e.destination_company}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* X-axis labels */}
                <div className="flex gap-1">
                    {hourlyData.map((hourData) => (
                        <div
                            key={hourData.hour}
                            className="flex-1 text-center"
                        >
                            <span
                                className={`text-[9px] ${hourData.hour % 3 === 0
                                        ? hourData.isSleeping
                                            ? 'text-red-400'
                                            : 'text-theater-muted'
                                        : 'text-transparent'
                                    }`}
                            >
                                {formatHour(hourData.hour)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex gap-6 mt-4 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-indigo-500/80" />
                        <span className="text-theater-muted text-xs">Active hours</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500/80" />
                        <span className="text-theater-muted text-xs">Sleeping (12AM–6AM)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
