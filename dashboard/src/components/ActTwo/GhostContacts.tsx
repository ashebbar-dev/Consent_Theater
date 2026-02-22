import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MockContact, AppScanResult } from '../../types';

interface GhostContactsProps {
    contacts: MockContact[];
    apps: AppScanResult[];
}

export default function GhostContacts({ contacts, apps }: GhostContactsProps) {
    const ghostContacts = useMemo(() => {
        return contacts.filter((c) => c.is_ghost);
    }, [contacts]);

    const contactReadingApps = useMemo(() => {
        return apps.filter((app) =>
            app.dangerous_permissions.some((p) =>
                p.includes('READ_CONTACTS') || p.includes('WRITE_CONTACTS')
            )
        );
    }, [apps]);

    if (ghostContacts.length === 0) return null;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">👻 Ghost Contacts</h2>
            <p className="text-theater-muted mb-2">
                People exposed to your data ecosystem — without their knowledge or consent
            </p>
            <p className="text-red-400/80 text-sm mb-6">
                {contactReadingApps.length} of your apps can read your contacts.
                These {ghostContacts.length} people never installed those apps, but companies know about them anyway.
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
                {ghostContacts.map((contact, index) => (
                    <motion.div
                        key={contact.name}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
                        className="relative flex flex-col items-center"
                    >
                        {/* Pulsing ring */}
                        <div className="relative">
                            <motion.div
                                animate={{
                                    scale: [1, 1.4, 1],
                                    opacity: [0.6, 0, 0.6],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    delay: index * 0.15,
                                }}
                                className="absolute inset-0 rounded-full bg-orange-500/30"
                            />
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2"
                                style={{
                                    background: `linear-gradient(135deg, rgba(249,115,22,0.2), rgba(239,68,68,0.2))`,
                                    borderColor: `rgba(249,115,22,${0.3 + (1 - contact.digital_footprint_score / 100) * 0.5})`,
                                    color: '#F97316',
                                }}
                            >
                                {contact.name.charAt(0)}
                            </div>
                        </div>

                        <p className="text-theater-muted text-[10px] mt-1.5 text-center truncate w-full">
                            {contact.name}
                        </p>
                        <p className="text-orange-400/60 text-[9px]">
                            {contact.exposed_to.length} companies
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Summary */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4"
            >
                <p className="text-orange-300 text-sm text-center">
                    These people never agreed to share their data with{' '}
                    <strong>
                        {Array.from(new Set(ghostContacts.flatMap((c) => c.exposed_to))).length}
                    </strong>{' '}
                    companies — but your apps shared their contact info anyway.
                </p>
            </motion.div>
        </div>
    );
}
