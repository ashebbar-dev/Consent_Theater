import { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import type { AppScanResult } from '../../types';

interface TrackerTreemapProps {
    apps: AppScanResult[];
}

// Company brand colors
const COMPANY_COLORS: Record<string, string> = {
    'Meta Platforms': '#1877F2',
    'Alphabet Inc.': '#34A853',
    'Amazon.com Inc.': '#FF9900',
    'ByteDance': '#010101',
    'Unity Technologies': '#222C37',
    'AppsFlyer': '#50E3C2',
    'AppLovin': '#F5515F',
    'Branch Metrics': '#2DB8B0',
    'X Corp': '#1DA1F2',
    'Microsoft Corporation': '#00A4EF',
    'Snap Inc.': '#FFFC00',
    'InMobi': '#2E8B57',
    'Braze': '#FF6F61',
    'CleverTap': '#E94E1B',
    'comScore': '#003399',
    'Criteo': '#F28B00',
    'Oracle Corporation': '#FF0000',
    'Adobe Inc.': '#FF0000',
    'Twilio': '#F22F46',
    'Yahoo': '#6001D2',
    'Sentry': '#362D59',
    'Default': '#8B5CF6',
};

interface TreemapNode {
    [key: string]: unknown;
    name: string;
    size: number;
    trackerCount: number;
    appCount: number;
    color: string;
}

// Custom content renderer for the treemap
function CustomContent(props: any) {
    const { x, y, width, height, color } = props;
    const name = props.name || '';
    const trackerCount = props.trackerCount || 0;

    if (!width || !height || width < 4 || height < 4) return null;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={4}
                fill={color || '#8B5CF6'}
                fillOpacity={0.85}
                stroke="#0a0a0f"
                strokeWidth={2}
            />
            {width > 60 && height > 40 && name && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - 8}
                        textAnchor="middle"
                        fill="white"
                        fontSize={width > 120 ? 13 : 10}
                        fontWeight="bold"
                    >
                        {name.length > width / 8 ? name.slice(0, Math.floor(width / 8)) + '…' : name}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 10}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.7)"
                        fontSize={10}
                    >
                        {trackerCount} tracker{trackerCount !== 1 ? 's' : ''}
                    </text>
                </>
            )}
        </g>
    );
}

// Custom tooltip
function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;

    return (
        <div className="bg-theater-surface border border-theater-border rounded-lg p-3 shadow-xl">
            <p className="font-bold text-theater-text">{data.name}</p>
            <p className="text-red-400 text-sm">{data.trackerCount} trackers found</p>
            <p className="text-theater-muted text-sm">Present in {data.appCount} apps</p>
        </div>
    );
}

export default function TrackerTreemap({ apps }: TrackerTreemapProps) {
    const companyData = useMemo(() => {
        const companyMap = new Map<string, { trackerCount: number; apps: Set<string> }>();

        apps.forEach((app) => {
            app.trackers.forEach((tracker) => {
                const company = tracker.company || 'Unknown';
                const existing = companyMap.get(company) || { trackerCount: 0, apps: new Set() };
                existing.trackerCount++;
                existing.apps.add(app.package_name);
                companyMap.set(company, existing);
            });
        });

        const nodes: TreemapNode[] = Array.from(companyMap.entries())
            .map(([name, data]) => ({
                name,
                size: data.trackerCount,
                trackerCount: data.trackerCount,
                appCount: data.apps.size,
                color: COMPANY_COLORS[name] || COMPANY_COLORS['Default'],
            }))
            .sort((a, b) => b.size - a.size);

        return nodes;
    }, [apps]);

    if (companyData.length === 0) {
        return (
            <div className="p-6 text-center text-theater-muted">
                No tracker data available.
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">🏢 Who's Tracking You?</h2>
            <p className="text-theater-muted mb-6">
                Rectangle size = number of trackers from that company across all apps
            </p>

            <div className="bg-theater-card rounded-xl p-4 border border-theater-border" style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={companyData}
                        dataKey="size"
                        nameKey="name"
                        content={<CustomContent />}
                        isAnimationActive={false}
                    >
                        <Tooltip content={<CustomTooltip />} />
                    </Treemap>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4">
                {companyData.slice(0, 8).map((company) => (
                    <div key={company.name} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: company.color }}
                        />
                        <span className="text-theater-muted text-xs">{company.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
