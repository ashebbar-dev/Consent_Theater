import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VpnLogEntry, AppScanResult } from '../../types';
import { calculateRevenue } from '../../utils/revenueCalculator';

interface ReceiptMockupProps {
    vpnLog: VpnLogEntry[];
    apps: AppScanResult[];
}

interface ConsentReceipt {
    id: number;
    appName: string;
    company: string;
    dataTypes: string[];
    estimatedValue: number;
    timestamp: string;
}

const DATA_TYPE_MAP: Record<string, string[]> = {
    'advertising': ['Browsing habits', 'Ad interactions', 'Device fingerprint'],
    'analytics': ['Usage patterns', 'Session data', 'Device info'],
    'social': ['Contact list', 'Social graph', 'Profile data'],
    'location': ['GPS coordinates', 'Location history', 'Nearby WiFi'],
    'crash': ['Error logs', 'Stack traces', 'Device state'],
};

export default function ReceiptMockup({ vpnLog, apps }: ReceiptMockupProps) {
    const [receipts, setReceipts] = useState<ConsentReceipt[]>([]);
    const [running, setRunning] = useState(true);

    const revenue = useMemo(() => calculateRevenue(apps), [apps]);

    // Generate unique receipt data from vpnLog
    const receiptPool = useMemo(() => {
        const entries = vpnLog
            .filter((e) => e.is_tracker)
            .slice(0, 50)
            .map((entry, i) => {
                const purpose = entry.destination_purpose.toLowerCase();
                const dataTypes = Object.entries(DATA_TYPE_MAP).find(([key]) =>
                    purpose.includes(key)
                )?.[1] || ['Behavioral data', 'Device ID'];

                return {
                    id: i,
                    appName: entry.source_app_name,
                    company: entry.destination_company,
                    dataTypes,
                    estimatedValue: Math.round((entry.bytes_transferred / 1024) * 0.05 * 100) / 100 || 0.01,
                    timestamp: new Date(entry.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                };
            });
        return entries.length > 0 ? entries : [
            { id: 0, appName: 'App', company: 'Tracker Co.', dataTypes: ['Usage data'], estimatedValue: 0.12, timestamp: '3:42 AM' },
        ];
    }, [vpnLog]);

    // Animate receipts stacking
    useEffect(() => {
        if (!running || receiptPool.length === 0) return;

        let index = 0;
        const interval = setInterval(() => {
            const receipt = receiptPool[index % receiptPool.length];
            setReceipts((prev) => {
                const next = [{ ...receipt, id: Date.now() + index }, ...prev];
                return next.slice(0, 8); // max 8 visible
            });
            index++;
        }, 800);

        return () => clearInterval(interval);
    }, [running, receiptPool]);

    const runningTotal = useMemo(() => {
        return receipts.reduce((sum, r) => sum + r.estimatedValue, 0);
    }, [receipts]);

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-theater-text">🧾 Consent Receipts</h2>
                <button
                    onClick={() => setRunning(!running)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${running
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}
                >
                    {running ? '⏸ Pause' : '▶ Play'}
                </button>
            </div>
            <p className="text-theater-muted mb-6">
                What if every data transfer required a visible receipt?
            </p>

            {/* Running total banner */}
            <motion.div
                layout
                className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-4 mb-4 text-center"
            >
                <p className="text-theater-muted text-xs">Your data value (this session)</p>
                <motion.p
                    key={runningTotal}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-3xl font-black text-indigo-400"
                >
                    ₹{runningTotal.toFixed(2)}
                </motion.p>
                <p className="text-theater-muted text-[10px] mt-1">
                    Annual estimated: ₹{revenue.totalAnnualInr.toLocaleString('en-IN')}
                </p>
            </motion.div>

            {/* Receipt stack - phone mockup */}
            <div
                className="relative mx-auto rounded-3xl border-2 border-theater-border bg-theater-surface overflow-hidden"
                style={{ maxWidth: 360, minHeight: 420 }}
            >
                {/* Phone status bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-theater-card border-b border-theater-border">
                    <span className="text-theater-muted text-[10px]">Consent Theater OS</span>
                    <span className="text-theater-muted text-[10px]">
                        {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* Notification stack */}
                <div className="p-3 space-y-2">
                    <AnimatePresence initial={false}>
                        {receipts.map((receipt, index) => (
                            <motion.div
                                key={receipt.id}
                                layout
                                initial={{ opacity: 0, y: -60, scale: 0.8 }}
                                animate={{
                                    opacity: 1 - index * 0.1,
                                    y: 0,
                                    scale: 1 - index * 0.02,
                                }}
                                exit={{ opacity: 0, x: 200 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                className="bg-theater-card border border-theater-border rounded-xl p-3 shadow-lg"
                                style={{ zIndex: 10 - index }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm">
                                            📱
                                        </div>
                                        <div>
                                            <p className="text-theater-text text-xs font-bold">
                                                {receipt.appName}
                                            </p>
                                            <p className="text-theater-muted text-[10px]">
                                                → {receipt.company}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-yellow-400 text-xs font-bold">
                                            ₹{receipt.estimatedValue.toFixed(2)}
                                        </span>
                                        <p className="text-theater-muted text-[9px]">
                                            {receipt.timestamp}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {receipt.dataTypes.map((dtype) => (
                                        <span
                                            key={dtype}
                                            className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/80"
                                        >
                                            {dtype}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {receipts.length === 0 && (
                        <div className="text-center text-theater-muted py-12">
                            <p className="text-3xl mb-2">🧾</p>
                            <p className="text-sm">Waiting for data transfers...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
