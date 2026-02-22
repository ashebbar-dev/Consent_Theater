import { motion, AnimatePresence } from 'framer-motion';
import type { MockContact } from '../../types';

interface DrillDownProps {
    contact: MockContact | null;
    onClose: () => void;
}

export default function DrillDown({ contact, onClose }: DrillDownProps) {
    if (!contact) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 30 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="bg-theater-card border border-theater-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold border-2 ${contact.is_ghost
                                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                                        : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                    }`}
                            >
                                {contact.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-theater-text">{contact.name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${contact.is_ghost
                                        ? 'bg-orange-500/20 text-orange-400'
                                        : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {contact.is_ghost ? '👻 Ghost Contact' : '👤 Regular Contact'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-theater-muted hover:text-theater-text text-xl"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Footprint score */}
                    <div className="bg-theater-surface rounded-xl p-4 mb-4">
                        <p className="text-theater-muted text-xs mb-1">Digital Footprint Score</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-theater-border rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${contact.digital_footprint_score}%` }}
                                    transition={{ duration: 0.8 }}
                                    className="h-full rounded-full"
                                    style={{
                                        background: contact.digital_footprint_score > 60
                                            ? 'linear-gradient(90deg, #22C55E, #84CC16)'
                                            : contact.digital_footprint_score > 30
                                                ? 'linear-gradient(90deg, #F59E0B, #F97316)'
                                                : 'linear-gradient(90deg, #EF4444, #F97316)',
                                    }}
                                />
                            </div>
                            <span className="text-theater-text font-bold text-sm">
                                {contact.digital_footprint_score}
                            </span>
                        </div>
                        <p className="text-theater-muted text-[10px] mt-1">
                            {contact.digital_footprint_score < 30
                                ? 'Very low online presence — likely unaware of data exposure'
                                : contact.digital_footprint_score < 60
                                    ? 'Moderate online presence'
                                    : 'Active online presence'}
                        </p>
                    </div>

                    {/* Exposed to companies */}
                    {contact.exposed_to.length > 0 && (
                        <div className="mb-4">
                            <p className="text-theater-muted text-xs mb-2">
                                📡 Exposed to {contact.exposed_to.length} companies
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {contact.exposed_to.map((company) => (
                                    <span
                                        key={company}
                                        className="text-[11px] px-2 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/20"
                                    >
                                        {company}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Exposed by apps */}
                    {contact.exposed_by_apps.length > 0 && (
                        <div>
                            <p className="text-theater-muted text-xs mb-2">
                                📱 Exposed by {contact.exposed_by_apps.length} apps
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {contact.exposed_by_apps.map((app) => (
                                    <span
                                        key={app}
                                        className="text-[11px] px-2 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                    >
                                        {app}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ghost warning */}
                    {contact.is_ghost && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3"
                        >
                            <p className="text-orange-300 text-xs text-center">
                                ⚠️ This person never installed these apps or agreed to share their data.
                                They were exposed through <strong>your</strong> contact list.
                            </p>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
