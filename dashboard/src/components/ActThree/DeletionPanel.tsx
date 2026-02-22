import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Mail, Shield, Download } from 'lucide-react';
import type { AppScanResult } from '../../types';
import { generateDPDPARequest, generateGDPRRequest } from '../../utils/deletionTemplates';

interface DeletionPanelProps {
    apps: AppScanResult[];
}

export default function DeletionPanel({ apps }: DeletionPanelProps) {
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [requestType, setRequestType] = useState<'dpdpa' | 'gdpr'>('dpdpa');
    const [copied, setCopied] = useState(false);

    // Get unique companies from trackers
    const companies = useMemo(() => {
        const companyMap = new Map<string, { trackerCount: number; apps: string[] }>();
        apps.forEach((app) => {
            app.trackers.forEach((t) => {
                const existing = companyMap.get(t.company) || { trackerCount: 0, apps: [] };
                existing.trackerCount++;
                if (!existing.apps.includes(app.app_name)) {
                    existing.apps.push(app.app_name);
                }
                companyMap.set(t.company, existing);
            });
        });
        return Array.from(companyMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.trackerCount - a.trackerCount);
    }, [apps]);

    // Generate the deletion request
    const generatedRequest = useMemo(() => {
        if (!selectedCompany || !userName || !userEmail) return null;

        const dataTypes = [
            'Device identifiers (AAID, IMEI)',
            'Location data (GPS coordinates, cell tower data)',
            'Browsing history and in-app activity',
            'Contact list data',
            'Usage patterns and behavioral profiles',
            'IP addresses and network metadata',
        ];

        return requestType === 'dpdpa'
            ? generateDPDPARequest(userName, userEmail, selectedCompany, dataTypes)
            : generateGDPRRequest(userName, userEmail, selectedCompany, dataTypes);
    }, [selectedCompany, userName, userEmail, requestType]);

    const handleCopy = () => {
        if (generatedRequest) {
            navigator.clipboard.writeText(generatedRequest.body);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">⚖️ Take Action</h2>
            <p className="text-theater-muted mb-6">
                Generate legal data deletion requests under DPDPA (India) or GDPR (EU)
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Configuration */}
                <div className="space-y-4">
                    {/* Your details */}
                    <div className="bg-theater-card rounded-xl border border-theater-border p-5">
                        <h3 className="text-sm font-bold text-theater-text mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-theater-accent" />
                            Your Details
                        </h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Your full name"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="w-full bg-theater-surface border border-theater-border rounded-lg px-4 py-2.5 text-sm text-theater-text placeholder-theater-muted focus:border-theater-accent outline-none transition-colors"
                            />
                            <input
                                type="email"
                                placeholder="Your email"
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                                className="w-full bg-theater-surface border border-theater-border rounded-lg px-4 py-2.5 text-sm text-theater-text placeholder-theater-muted focus:border-theater-accent outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Request type */}
                    <div className="bg-theater-card rounded-xl border border-theater-border p-5">
                        <h3 className="text-sm font-bold text-theater-text mb-3">Legal Framework</h3>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setRequestType('dpdpa')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${requestType === 'dpdpa'
                                        ? 'bg-theater-accent text-white'
                                        : 'bg-theater-surface text-theater-muted border border-theater-border hover:text-theater-text'
                                    }`}
                            >
                                🇮🇳 DPDPA 2023
                            </button>
                            <button
                                onClick={() => setRequestType('gdpr')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${requestType === 'gdpr'
                                        ? 'bg-theater-accent text-white'
                                        : 'bg-theater-surface text-theater-muted border border-theater-border hover:text-theater-text'
                                    }`}
                            >
                                🇪🇺 GDPR
                            </button>
                        </div>
                    </div>

                    {/* Company selector */}
                    <div className="bg-theater-card rounded-xl border border-theater-border p-5">
                        <h3 className="text-sm font-bold text-theater-text mb-3">
                            Select Company ({companies.length})
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {companies.map((company) => (
                                <button
                                    key={company.name}
                                    onClick={() => setSelectedCompany(company.name)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${selectedCompany === company.name
                                            ? 'bg-theater-accent/20 border border-theater-accent/40 text-theater-accent'
                                            : 'bg-theater-surface text-theater-muted hover:text-theater-text hover:bg-theater-surface/80'
                                        }`}
                                >
                                    <span className="truncate">{company.name}</span>
                                    <span className="text-xs opacity-60 shrink-0 ml-2">
                                        {company.trackerCount} trackers · {company.apps.length} apps
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Generated request */}
                <div className="bg-theater-card rounded-xl border border-theater-border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-theater-text flex items-center gap-2">
                            <Mail className="w-4 h-4 text-theater-accent" />
                            Generated Request
                        </h3>
                        {generatedRequest && (
                            <div className="flex gap-2">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleCopy}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-theater-accent/20 text-theater-accent text-xs rounded-lg hover:bg-theater-accent/30 transition-colors"
                                >
                                    <Copy className="w-3 h-3" />
                                    {copied ? 'Copied!' : 'Copy'}
                                </motion.button>
                            </div>
                        )}
                    </div>

                    {generatedRequest ? (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-theater-muted">Subject:</label>
                                <p className="text-sm text-theater-text font-medium">
                                    {generatedRequest.subject}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-theater-muted">Body:</label>
                                <pre className="text-xs text-theater-text bg-theater-surface rounded-lg p-4 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto border border-theater-border/50">
                                    {generatedRequest.body}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-theater-muted py-12">
                            <p className="text-4xl mb-3">📝</p>
                            <p className="text-sm">
                                Fill in your details and select a company to generate a deletion request
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
