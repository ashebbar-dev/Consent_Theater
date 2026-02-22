import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { AppScanResult } from '../../types';

interface AppGradesProps {
    apps: AppScanResult[];
}

interface GradedApp extends AppScanResult {
    grade: string;
    gradeColor: string;
    recommendation: string;
}

function gradeApp(app: AppScanResult): GradedApp {
    const score = app.risk_score;
    let grade: string;
    let gradeColor: string;
    let recommendation: string;

    if (score <= 15) {
        grade = 'A';
        gradeColor = '#22C55E';
        recommendation = 'Safe — minimal data collection detected';
    } else if (score <= 30) {
        grade = 'B';
        gradeColor = '#4ADE80';
        recommendation = 'Acceptable — limited tracking, standard permissions';
    } else if (score <= 45) {
        grade = 'C';
        gradeColor = '#F59E0B';
        recommendation = 'Moderate concern — review permissions and consider alternatives';
    } else if (score <= 65) {
        grade = 'D';
        gradeColor = '#F97316';
        recommendation = 'High risk — excessive tracking. Consider replacing with a privacy-respecting alternative';
    } else {
        grade = 'F';
        gradeColor = '#EF4444';
        recommendation = 'Uninstall recommended — severe privacy violation';
    }

    return { ...app, grade, gradeColor, recommendation };
}

export default function AppGrades({ apps }: AppGradesProps) {
    const gradedApps = useMemo(
        () => apps.map(gradeApp).sort((a, b) => b.risk_score - a.risk_score),
        [apps]
    );

    const gradeCounts = useMemo(() => {
        const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        gradedApps.forEach((a) => counts[a.grade]++);
        return counts;
    }, [gradedApps]);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">📊 Privacy Grades</h2>
            <p className="text-theater-muted mb-6">
                Every installed app scored and graded
            </p>

            {/* Grade distribution */}
            <div className="flex gap-3 mb-6">
                {['A', 'B', 'C', 'D', 'F'].map((grade) => {
                    const colors: Record<string, string> = {
                        A: '#22C55E', B: '#4ADE80', C: '#F59E0B', D: '#F97316', F: '#EF4444',
                    };
                    return (
                        <motion.div
                            key={grade}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: ['A', 'B', 'C', 'D', 'F'].indexOf(grade) * 0.1, type: 'spring' }}
                            className="flex-1 bg-theater-card rounded-xl border border-theater-border p-4 text-center"
                            style={{ borderColor: `${colors[grade]}40` }}
                        >
                            <p className="text-3xl font-black" style={{ color: colors[grade] }}>
                                {grade}
                            </p>
                            <p className="text-lg font-bold text-theater-text">{gradeCounts[grade]}</p>
                            <p className="text-xs text-theater-muted">apps</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* App list */}
            <div className="space-y-2">
                {gradedApps.map((app, index) => (
                    <motion.div
                        key={app.package_name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="bg-theater-card rounded-lg border border-theater-border p-4 flex items-center gap-4"
                    >
                        {/* Grade badge */}
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                                backgroundColor: `${app.gradeColor}15`,
                                border: `2px solid ${app.gradeColor}`,
                            }}
                        >
                            <span
                                className="text-xl font-black"
                                style={{ color: app.gradeColor }}
                            >
                                {app.grade}
                            </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-theater-text font-medium text-sm truncate">
                                {app.app_name}
                            </h3>
                            <p className="text-theater-muted text-xs truncate">
                                {app.recommendation}
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 shrink-0">
                            <div className="text-center">
                                <p className="text-red-400 font-bold text-sm">{app.tracker_count}</p>
                                <p className="text-theater-muted text-[10px]">trackers</p>
                            </div>
                            <div className="text-center">
                                <p className="text-amber-400 font-bold text-sm">
                                    {app.dangerous_permission_count}
                                </p>
                                <p className="text-theater-muted text-[10px]">perms</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-sm" style={{ color: app.gradeColor }}>
                                    {app.risk_score}
                                </p>
                                <p className="text-theater-muted text-[10px]">risk</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
