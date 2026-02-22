import { motion } from 'framer-motion';

interface NavigationProps {
    currentAct: number;
    onActChange: (act: number) => void;
    hasData: boolean;
}

const acts = [
    { id: 0, label: 'Act Zero', subtitle: 'The Inventory', icon: '📦' },
    { id: 1, label: 'Act One', subtitle: 'The Network', icon: '🌐' },
    { id: 2, label: 'Act Two', subtitle: 'The Contagion', icon: '🕸️' },
    { id: 3, label: 'Act Three', subtitle: 'The Reckoning', icon: '⚖️' },
];

export default function Navigation({ currentAct, onActChange, hasData }: NavigationProps) {
    return (
        <nav className="w-full bg-theater-surface border-b border-theater-border">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎭</span>
                        <h1 className="text-lg font-bold tracking-wider text-theater-text">
                            CONSENT THEATER
                        </h1>
                    </div>

                    {/* Act Tabs */}
                    <div className="flex gap-1">
                        {acts.map((act) => (
                            <button
                                key={act.id}
                                onClick={() => hasData && onActChange(act.id)}
                                disabled={!hasData && act.id > 0}
                                className={`relative px-4 py-2 rounded-lg transition-all duration-300 ${currentAct === act.id
                                        ? 'text-white'
                                        : hasData
                                            ? 'text-theater-muted hover:text-theater-text hover:bg-theater-card'
                                            : 'text-theater-muted/40 cursor-not-allowed'
                                    }`}
                            >
                                <span className="flex items-center gap-2 text-sm font-medium">
                                    <span>{act.icon}</span>
                                    <span className="hidden md:inline">{act.label}</span>
                                </span>
                                {currentAct === act.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-theater-accent/20 border border-theater-accent/40 rounded-lg -z-10"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
}
