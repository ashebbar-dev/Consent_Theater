import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react';
import type { VpnLogEntry } from '../../types';

// Check if WebGL is available before attempting to load globe.gl
function isWebGLAvailable(): boolean {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
    } catch {
        return false;
    }
}

interface ConnectionGlobeProps {
    vpnLog: VpnLogEntry[];
    userLat?: number;
    userLng?: number;
}

// Company → color map for arc coloring
const COMPANY_COLORS: Record<string, string> = {
    'Meta Platforms': '#1877F2',
    'Google (Alphabet)': '#34A853',
    'Alphabet Inc.': '#34A853',
    'Amazon.com Inc.': '#FF9900',
    'ByteDance': '#FE2C55',
    'Unity Technologies': '#FFFFFF',
    'AppsFlyer': '#50E3C2',
    'Microsoft Corporation': '#00A4EF',
    'X Corp': '#1DA1F2',
    'Snap Inc.': '#FFFC00',
    'InMobi': '#2E8B57',
    'CleverTap': '#E94E1B',
    'comScore': '#6699CC',
    'Criteo': '#F28B00',
    'AppLovin': '#FF6B6B',
    'Adjust': '#00C8FF',
    'Taboola': '#FF5722',
    'Flurry (Yahoo)': '#7B1FA2',
    'Oracle BlueKai': '#FF0000',
    'Branch': '#33CC99',
    'Truecaller': '#0099FF',
    'Default': '#8B5CF6',
};

// ── Fallback: static destination summary when WebGL is unavailable ──
function GlobeFallback({ vpnLog }: { vpnLog: VpnLogEntry[] }) {
    const destinations = useMemo(() => {
        const map = new Map<string, { count: number; country: string; companies: Set<string> }>();
        vpnLog.forEach((e) => {
            const key = e.destination_city || e.destination_country;
            const existing = map.get(key) || { count: 0, country: e.destination_country, companies: new Set<string>() };
            existing.count++;
            existing.companies.add(e.destination_company);
            map.set(key, existing);
        });
        return Array.from(map.entries())
            .map(([city, d]) => ({ city, country: d.country, count: d.count, companies: Array.from(d.companies) }))
            .sort((a, b) => b.count - a.count);
    }, [vpnLog]);

    const totalCompanies = useMemo(() => new Set(vpnLog.map((e) => e.destination_company)).size, [vpnLog]);
    const totalCountries = useMemo(() => new Set(vpnLog.map((e) => e.destination_country)).size, [vpnLog]);

    return (
        <div className="bg-theater-card border border-theater-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4 text-yellow-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">
                    3D Globe unavailable (WebGL disabled). Showing destination summary instead.
                </span>
            </div>

            {/* Stats bar */}
            <div className="flex gap-4 mb-6">
                <div className="bg-theater-surface rounded-lg px-4 py-3 text-center flex-1">
                    <p className="text-2xl font-bold text-theater-danger">{vpnLog.length}</p>
                    <p className="text-xs text-theater-muted">connections</p>
                </div>
                <div className="bg-theater-surface rounded-lg px-4 py-3 text-center flex-1">
                    <p className="text-2xl font-bold text-purple-400">{totalCompanies}</p>
                    <p className="text-xs text-theater-muted">companies</p>
                </div>
                <div className="bg-theater-surface rounded-lg px-4 py-3 text-center flex-1">
                    <p className="text-2xl font-bold text-theater-accent">{totalCountries}</p>
                    <p className="text-xs text-theater-muted">countries</p>
                </div>
            </div>

            {/* Destination list */}
            <h3 className="text-sm font-bold text-theater-text mb-3">📍 Top Destinations</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {destinations.slice(0, 20).map((dest, i) => (
                    <motion.div
                        key={dest.city}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between bg-theater-surface rounded-lg px-4 py-2 border border-theater-border/50"
                    >
                        <div>
                            <p className="text-theater-text text-sm font-medium">
                                {dest.city}, {dest.country}
                            </p>
                            <p className="text-theater-muted text-xs">
                                {dest.companies.slice(0, 3).join(', ')}
                                {dest.companies.length > 3 && ` +${dest.companies.length - 3}`}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-theater-accent font-bold text-sm">{dest.count}</span>
                            <p className="text-theater-muted text-[10px]">hits</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ── Main Component ──
export default function ConnectionGlobe({
    vpnLog,
    userLat = 12.9716,  // Bangalore default
    userLng = 77.5946,
}: ConnectionGlobeProps) {
    const globeContainerRef = useRef<HTMLDivElement>(null);
    const globeInstanceRef = useRef<any>(null);
    const animFrameRef = useRef<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [simulatedHour, setSimulatedHour] = useState(0);
    const [stats, setStats] = useState({ connections: 0, companies: 0, countries: 0 });
    const [globeFailed, setGlobeFailed] = useState(false);
    const webGLAvailable = useMemo(() => isWebGLAvailable(), []);

    // Sort log entries by hour
    const sortedLog = useMemo(
        () => [...vpnLog].sort((a, b) => a.hour_of_day - b.hour_of_day),
        [vpnLog]
    );

    // Build an arc object from a VPN entry
    const buildArc = useCallback(
        (entry: VpnLogEntry, opacity: number = 1) => ({
            startLat: userLat,
            startLng: userLng,
            endLat: entry.destination_lat,
            endLng: entry.destination_lng,
            color: [
                COMPANY_COLORS[entry.destination_company] || COMPANY_COLORS['Default'],
                `${COMPANY_COLORS[entry.destination_company] || COMPANY_COLORS['Default']}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
            ],
            app: entry.source_app_name,
            company: entry.destination_company,
            city: entry.destination_city,
            country: entry.destination_country,
            stroke: opacity > 0.8 ? 1.5 : 0.8,
        }),
        [userLat, userLng]
    );

    // Initialize Globe.gl — wrapped in try-catch for WebGL failures
    useEffect(() => {
        if (!globeContainerRef.current || globeInstanceRef.current) return;
        if (!webGLAvailable) {
            setGlobeFailed(true);
            return;
        }

        let globe: any;
        try {
            // Dynamic import to avoid loading globe.gl when WebGL isn't available
            import('globe.gl').then((GlobeModule) => {
                if (!globeContainerRef.current || globeInstanceRef.current) return;

                try {
                    const Globe = GlobeModule.default;
                    globe = new Globe(globeContainerRef.current)
                        .globeImageUrl('/textures/earth-night.jpg')
                        .backgroundImageUrl('/textures/night-sky.png')
                        .backgroundColor('#0a0a0f')
                        .showAtmosphere(true)
                        .atmosphereColor('#6366f1')
                        .atmosphereAltitude(0.15)
                        .arcColor('color')
                        .arcDashLength(0.6)
                        .arcDashGap(0.15)
                        .arcDashAnimateTime(2000)
                        .arcStroke('stroke' as any)
                        .arcAltitudeAutoScale(0.35)
                        .arcLabel((d: any) => `
                            <div style="background:#12121a;border:1px solid #2a2a3e;border-radius:8px;padding:8px 12px;font-family:Inter,sans-serif">
                              <div style="color:#e2e8f0;font-weight:600;font-size:12px">${d.app}</div>
                              <div style="color:#94a3b8;font-size:11px">→ ${d.company}</div>
                              <div style="color:#6366f1;font-size:10px">${d.city}, ${d.country}</div>
                            </div>
                        `)
                        .pointColor(() => '#EF4444')
                        .pointAltitude(0.01)
                        .pointRadius(0.5)
                        .pointsMerge(true)
                        .ringColor(() => (t: number) => `rgba(239,68,68,${1 - t})`)
                        .ringMaxRadius(3)
                        .ringPropagationSpeed(2)
                        .ringRepeatPeriod(1500)
                        .width(globeContainerRef.current.clientWidth)
                        .height(500);

                    globe.pointOfView({ lat: 20, lng: 78, altitude: 2.5 }, 0);
                    globe.pointsData([{ lat: userLat, lng: userLng }]);
                    globe.ringsData([{ lat: userLat, lng: userLng }]);

                    const controls = globe.controls();
                    if (controls) {
                        controls.autoRotate = true;
                        controls.autoRotateSpeed = 0.5;
                        controls.enableZoom = true;
                    }

                    globeInstanceRef.current = globe;
                } catch {
                    setGlobeFailed(true);
                }
            }).catch(() => {
                setGlobeFailed(true);
            });
        } catch {
            setGlobeFailed(true);
        }

        const handleResize = () => {
            if (globeContainerRef.current && globeInstanceRef.current) {
                globeInstanceRef.current.width(globeContainerRef.current.clientWidth);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [userLat, userLng, webGLAvailable]);

    // Playback — CUMULATIVE: arcs accumulate over time
    // Throttled to only rebuild arcs when the displayed hour changes,
    // and capped at MAX_ARCS to prevent WebGL from choking on large datasets.
    const startPlayback = useCallback(() => {
        if (!globeInstanceRef.current) return;

        setIsPlaying(true);
        const startTime = performance.now();

        const REAL_DURATION_MS = 45000;
        const MS_PER_SIM_HOUR = REAL_DURATION_MS / 24;
        const MAX_ARCS = 200; // Cap visible arcs to prevent GPU overload
        let lastRenderedHour = -1;

        const sampleEntries = (entries: typeof sortedLog, max: number) => {
            if (entries.length <= max) return entries;
            // Keep a representative sample: pick evenly spaced entries
            const step = entries.length / max;
            const sampled: typeof sortedLog = [];
            for (let i = 0; i < max; i++) {
                sampled.push(entries[Math.floor(i * step)]);
            }
            return sampled;
        };

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const currentHour = (elapsed / MS_PER_SIM_HOUR);
            const displayHour = Math.min(Math.floor(currentHour), 23);

            if (currentHour >= 24) {
                const finalEntries = sampleEntries(sortedLog, MAX_ARCS);
                const finalArcs = finalEntries.map((entry) => buildArc(entry, 1));
                globeInstanceRef.current.arcsData(finalArcs);
                setIsPlaying(false);
                setSimulatedHour(23);

                const allCompanies = new Set(sortedLog.map((e) => e.destination_company));
                const allCountries = new Set(sortedLog.map((e) => e.destination_country));
                setStats({
                    connections: sortedLog.length,
                    companies: allCompanies.size,
                    countries: allCountries.size,
                });
                return;
            }

            // Only rebuild arcs when the hour actually changes (not every frame)
            if (displayHour !== lastRenderedHour) {
                lastRenderedHour = displayHour;
                setSimulatedHour(displayHour);

                const visibleEntries = sortedLog.filter((e) => e.hour_of_day <= currentHour);
                const sampled = sampleEntries(visibleEntries, MAX_ARCS);

                const arcs = sampled.map((entry) => {
                    const age = currentHour - entry.hour_of_day;
                    const opacity = age < 2 ? 1 : Math.max(0.4, 1 - age * 0.03);
                    return buildArc(entry, opacity);
                });

                globeInstanceRef.current.arcsData(arcs);

                const uniqueCompanies = new Set(visibleEntries.map((e) => e.destination_company));
                const uniqueCountries = new Set(visibleEntries.map((e) => e.destination_country));
                setStats({
                    connections: visibleEntries.length,
                    companies: uniqueCompanies.size,
                    countries: uniqueCountries.size,
                });
            }

            animFrameRef.current = requestAnimationFrame(animate);
        };

        animFrameRef.current = requestAnimationFrame(animate);
    }, [sortedLog, buildArc]);

    const stopPlayback = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    const resetPlayback = useCallback(() => {
        stopPlayback();
        setSimulatedHour(0);
        setStats({ connections: 0, companies: 0, countries: 0 });
        if (globeInstanceRef.current) {
            globeInstanceRef.current.arcsData([]);
        }
    }, [stopPlayback]);

    const formatHour = (hour: number) => {
        const h = hour % 12 || 12;
        const ampm = hour < 12 ? 'AM' : 'PM';
        return `${h}:00 ${ampm}`;
    };

    // If WebGL failed, show fallback
    if (globeFailed || !webGLAvailable) {
        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold text-theater-text mb-2">🌐 Where Your Data Travels</h2>
                <p className="text-theater-muted mb-4">
                    24-hour visualization of tracker connections from your phone to servers worldwide
                </p>
                <GlobeFallback vpnLog={vpnLog} />
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">🌐 Where Your Data Travels</h2>
            <p className="text-theater-muted mb-4">
                24-hour visualization of tracker connections from your phone to servers worldwide
            </p>

            {/* Controls bar */}
            <div className="flex items-center gap-4 mb-4">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isPlaying ? stopPlayback : startPlayback}
                    className="flex items-center gap-2 px-6 py-3 bg-theater-accent rounded-xl text-white font-medium shadow-lg shadow-theater-accent/30"
                >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {isPlaying ? 'Pause' : 'Play 24hr'}
                </motion.button>

                <button
                    onClick={resetPlayback}
                    className="flex items-center gap-2 px-4 py-3 bg-theater-card border border-theater-border rounded-xl text-theater-muted hover:text-theater-text transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                </button>

                {/* Time display */}
                <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-theater-card rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-theater-accent rounded-full"
                            animate={{ width: `${(simulatedHour / 23) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <span className="text-theater-accent font-mono font-bold text-sm min-w-[80px]">
                        {formatHour(simulatedHour)}
                    </span>
                </div>
            </div>

            {/* Mini stats */}
            <div className="flex gap-4 mb-4">
                <div className="bg-theater-card border border-theater-border rounded-lg px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-theater-danger">{stats.connections}</p>
                    <p className="text-xs text-theater-muted">connections</p>
                </div>
                <div className="bg-theater-card border border-theater-border rounded-lg px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-purple-400">{stats.companies}</p>
                    <p className="text-xs text-theater-muted">companies</p>
                </div>
                <div className="bg-theater-card border border-theater-border rounded-lg px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-theater-accent">{stats.countries}</p>
                    <p className="text-xs text-theater-muted">countries</p>
                </div>
                {simulatedHour >= 0 && simulatedHour <= 6 && isPlaying && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-center animate-pulse">
                        <p className="text-lg font-bold text-red-400">😴 Sleeping</p>
                        <p className="text-xs text-red-300">Still sending data</p>
                    </div>
                )}
            </div>

            {/* Globe container */}
            <div
                ref={globeContainerRef}
                className="w-full rounded-xl overflow-hidden border border-theater-border bg-theater-bg"
                style={{ height: 500 }}
            />
        </div>
    );
}
