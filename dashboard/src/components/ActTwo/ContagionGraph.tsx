import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { motion } from 'framer-motion';
import type { AppScanResult, MockContact } from '../../types';

interface ContagionGraphProps {
    apps: AppScanResult[];
    contacts: MockContact[];
}

interface GraphNode {
    id: string;
    name: string;
    type: 'user' | 'contact' | 'ghost';
    footprintScore: number;
    exposedTo: string[];
    val: number;
}

interface GraphLink {
    source: string;
    target: string;
    sharedApps: string[];
}

export default function ContagionGraph({ apps, contacts }: ContagionGraphProps) {
    const graphRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // Handle resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: 600,
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Configure forces after mount
    useEffect(() => {
        if (!graphRef.current) return;
        const fg = graphRef.current;
        // Push nodes apart so they don't cluster
        fg.d3Force('charge')?.strength(-200);
        fg.d3Force('link')?.distance(80);
        // Add a center force
        fg.d3Force('center')?.strength(0.05);
    }, []);

    // Build graph data
    const graphData = useMemo(() => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        // User node (center)
        nodes.push({
            id: 'user',
            name: 'You',
            type: 'user',
            footprintScore: 100,
            exposedTo: apps.flatMap((a) => a.trackers.map((t) => t.company)),
            val: 12,
        });

        // Contact nodes
        contacts.forEach((contact) => {
            const nodeType = contact.is_ghost ? 'ghost' : 'contact';
            nodes.push({
                id: `contact-${contact.name}`,
                name: contact.name,
                type: nodeType,
                footprintScore: contact.digital_footprint_score,
                exposedTo: contact.exposed_to,
                val: nodeType === 'ghost' ? 5 : 7,
            });

            // Link from user to contact
            links.push({
                source: 'user',
                target: `contact-${contact.name}`,
                sharedApps: contact.exposed_by_apps,
            });
        });

        return { nodes, links };
    }, [apps, contacts]);

    // Node coloring
    const getNodeColor = useCallback((node: GraphNode) => {
        if (node.type === 'user') return '#6366F1';
        if (node.type === 'ghost') return '#EF4444';
        // Score-based
        if (node.footprintScore > 70) return '#EF4444';
        if (node.footprintScore > 40) return '#F59E0B';
        return '#22C55E';
    }, []);

    // Custom node renderer
    const paintNode = useCallback(
        (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const graphNode = node as GraphNode;
            const label = graphNode.name;
            const fontSize = Math.max(12 / globalScale, 3);
            const nodeRadius = graphNode.val;
            const color = getNodeColor(graphNode);

            // Glow
            ctx.shadowColor = color;
            ctx.shadowBlur = graphNode.type === 'user' ? 25 : 12;

            // Circle
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, nodeRadius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();

            // Ghost icon — dashed ring
            if (graphNode.type === 'ghost') {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#EF444480';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, nodeRadius + 4, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // User node — double ring
            if (graphNode.type === 'user') {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#6366F180';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, nodeRadius + 5, 0, 2 * Math.PI);
                ctx.stroke();
            }

            // Label
            ctx.shadowBlur = 0;
            ctx.font = `${graphNode.type === 'user' ? 'bold ' : ''}${fontSize}px Inter, sans-serif`;
            ctx.fillStyle = '#E2E8F0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(label, node.x!, node.y! + nodeRadius + 4);
        },
        [getNodeColor]
    );

    // Link renderer
    const paintLink = useCallback(
        (link: any, ctx: CanvasRenderingContext2D) => {
            const graphLink = link as GraphLink;
            const start = link.source;
            const end = link.target;

            ctx.strokeStyle = graphLink.sharedApps.length > 2
                ? '#EF444450'
                : '#6366F130';
            ctx.lineWidth = Math.min(graphLink.sharedApps.length * 0.8, 3);

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        },
        []
    );

    const ghostCount = contacts.filter((c) => c.is_ghost).length;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-theater-text mb-2">🕸️ Contact Contagion</h2>
            <p className="text-theater-muted mb-4">
                Apps with READ_CONTACTS permission expose your entire address book to their tracker network.
                {ghostCount > 0 && (
                    <span className="text-red-400 font-medium ml-1">
                        {ghostCount} "ghost" contacts found — people tracked without an account.
                    </span>
                )}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Graph */}
                <div
                    ref={containerRef}
                    className="lg:col-span-2 bg-theater-card rounded-xl border border-theater-border overflow-hidden"
                    style={{ height: 600 }}
                >
                    {graphData.nodes.length > 0 && (
                        <ForceGraph2D
                            ref={graphRef}
                            width={dimensions.width}
                            height={dimensions.height}
                            graphData={graphData}
                            nodeCanvasObject={paintNode}
                            linkCanvasObject={paintLink}
                            onNodeClick={(node: any) => setSelectedNode(node as GraphNode)}
                            backgroundColor="#0a0a0f"
                            cooldownTicks={200}
                            warmupTicks={100}
                            linkDirectionalParticles={2}
                            linkDirectionalParticleWidth={2}
                            linkDirectionalParticleColor={() => '#6366F160'}
                        />
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Stats */}
                    <div className="bg-theater-card rounded-xl border border-theater-border p-4">
                        <h3 className="text-sm font-bold text-theater-text mb-3">Contagion Stats</h3>
                        <div className="space-y-3">
                            <StatRow
                                label="Contacts exposed"
                                value={contacts.length}
                                color="#F59E0B"
                            />
                            <StatRow
                                label="Ghost contacts"
                                value={ghostCount}
                                color="#EF4444"
                            />
                            <StatRow
                                label="Apps reading contacts"
                                value={apps.filter((a) =>
                                    a.dangerous_permissions.includes('READ_CONTACTS')
                                ).length}
                                color="#8B5CF6"
                            />
                        </div>
                    </div>

                    {/* Selected node detail */}
                    {selectedNode && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-theater-card rounded-xl border border-theater-border p-4"
                        >
                            <h3 className="text-sm font-bold text-theater-text mb-2">
                                {selectedNode.type === 'ghost' && '👻 '}
                                {selectedNode.type === 'user' && '👤 '}
                                {selectedNode.name}
                            </h3>
                            <p className="text-xs text-theater-muted mb-2">
                                Digital footprint: {selectedNode.footprintScore}%
                            </p>
                            {selectedNode.exposedTo.length > 0 && (
                                <div>
                                    <p className="text-xs text-red-400 font-medium mb-1">
                                        Data exposed to:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {[...new Set(selectedNode.exposedTo)].slice(0, 8).map((c, i) => (
                                            <span
                                                key={i}
                                                className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20"
                                            >
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Legend */}
                    <div className="bg-theater-card rounded-xl border border-theater-border p-4">
                        <h3 className="text-sm font-bold text-theater-text mb-2">Legend</h3>
                        <div className="space-y-2 text-xs">
                            <LegendItem color="#6366F1" label="You (center)" />
                            <LegendItem color="#22C55E" label="Low exposure contact" />
                            <LegendItem color="#F59E0B" label="Medium exposure" />
                            <LegendItem color="#EF4444" label="High exposure / Ghost" dashed />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-theater-muted">{label}</span>
            <span className="text-lg font-bold" style={{ color }}>
                {value}
            </span>
        </div>
    );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div
                className="w-3 h-3 rounded-full"
                style={{
                    backgroundColor: color,
                    border: dashed ? '1.5px dashed rgba(239,68,68,0.5)' : undefined,
                }}
            />
            <span className="text-theater-muted">{label}</span>
        </div>
    );
}
