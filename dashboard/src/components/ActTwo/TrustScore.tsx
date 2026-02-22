import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppScanResult, MockContact } from '../../types';

interface TrustScoreProps {
    apps: AppScanResult[];
    contacts: MockContact[];
}

export default function TrustScore({ apps, contacts }: TrustScoreProps) {
    const [revealed, setRevealed] = useState(false);

    const score = useMemo(() => {
        // Calculate trust score (0-100, lower = worse)
        const avgRisk = apps.reduce((sum, a) => sum + a.risk_score, 0) / (apps.length || 1);
        const ghostRatio = contacts.filter((c) => c.is_ghost).length / (contacts.length || 1);
        const trackerDensity = apps.reduce((sum, a) => sum + a.tracker_count, 0) / (apps.length || 1);
        const permDensity = apps.reduce((sum, a) => sum + a.dangerous_permission_count, 0) / (apps.length || 1);

        // Invert: high risk → low trust
        const trustFromRisk = Math.max(0, 100 - avgRisk);
        const trustFromGhosts = Math.max(0, 100 - ghostRatio * 200);
        const trustFromTrackers = Math.max(0, 100 - trackerDensity * 15);
        const trustFromPerms = Math.max(0, 100 - permDensity * 10);

        return Math.round(
            trustFromRisk * 0.3 + trustFromGhosts * 0.2 + trustFromTrackers * 0.3 + trustFromPerms * 0.2
        );
    }, [apps, contacts]);

    useEffect(() => {
        const timer = setTimeout(() => setRevealed(true), 800);
        return () => clearTimeout(timer);
    }, []);

    const getGrade = (s: number) => {
        if (s >= 80) return { grade: 'A', color: '#22C55E', label: 'Excellent' };
        if (s >= 60) return { grade: 'B', color: '#84CC16', label: 'Good' };
        if (s >= 40) return { grade: 'C', color: '#F59E0B', label: 'Concerning' };
        if (s >= 20) return { grade: 'D', color: '#F97316', label: 'Poor' };
        return { grade: 'F', color: '#EF4444', label: 'Critical' };
    };

    const { grade, color, label } = getGrade(score);
    const circumference = 2 * Math.PI * 80;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">🛡️ Digital Trust Score</h2>
            <p className="text-theater-muted mb-8">
                How much can your digital ecosystem be trusted with your data?
            </p>

            <div className="flex flex-col items-center">
                <AnimatePresence>
                    {!revealed ? (
                        <motion.div
                            key="loading"
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="w-48 h-48 flex items-center justify-center"
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-32 h-32 rounded-full border-4 border-theater-border border-t-indigo-500"
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="score"
                            initial={{ opacity: 0, scale: 0.3 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="relative w-48 h-48 flex items-center justify-center"
                        >
                            {/* SVG ring */}
                            <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 180 180">
                                <circle
                                    cx="90" cy="90" r="80"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.05)"
                                    strokeWidth="8"
                                />
                                <motion.circle
                                    cx="90" cy="90" r="80"
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    initial={{ strokeDashoffset: circumference }}
                                    animate={{ strokeDashoffset }}
                                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                                />
                            </svg>

                            <div className="text-center z-10">
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-5xl font-black block"
                                    style={{ color }}
                                >
                                    {grade}
                                </motion.span>
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="text-lg font-bold text-theater-muted block"
                                >
                                    {score}/100
                                </motion.span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: revealed ? 1 : 0 }}
                    transition={{ delay: 1.2 }}
                    className="text-lg font-bold mt-4"
                    style={{ color }}
                >
                    {label}
                </motion.p>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 10 }}
                    transition={{ delay: 1.5 }}
                    className="text-theater-muted text-sm mt-2 text-center max-w-md"
                >
                    Based on {apps.length} apps, {apps.reduce((s, a) => s + a.tracker_count, 0)} trackers,
                    and {contacts.filter((c) => c.is_ghost).length} ghost contacts exposed without consent.
                </motion.p>
            </div>
        </div>
    );
}
