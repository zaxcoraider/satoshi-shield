import React, { useState } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────────

function ShieldIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F7931A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
    );
}

function RoadmapIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F7931A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l4-12h10l4 12"/>
            <path d="M6 12h12"/>
            <circle cx="12" cy="17" r="1" fill="#F7931A" stroke="none"/>
        </svg>
    );
}

function ChevronLeftIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
        </svg>
    );
}

function ChevronRightIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
        </svg>
    );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
    { text: 'Bitcoin-native insurance protocol',            icon: '₿' },
    { text: 'Protection pools funded by liquidity providers', icon: '💧' },
    { text: 'On-chain policy creation and claim tracking',   icon: '📋' },
    { text: 'Transparent coverage limits and vault health',  icon: '🔍' },
    { text: 'Built on OP_NET Bitcoin Layer 1',               icon: '⚡' },
];

const ROADMAP: {
    phase: string;
    title: string;
    items: string[];
    status: 'done' | 'active' | 'upcoming';
}[] = [
    {
        phase: 'Phase 1',
        title: 'Foundation',
        status: 'done',
        items: [
            'InsuranceVault smart contract',
            'BTCLP liquidity token (OP20)',
            'On-chain policy lifecycle',
            'OPNet Testnet deployment',
        ],
    },
    {
        phase: 'Phase 2',
        title: 'Frontend dApp',
        status: 'done',
        items: [
            'Liquidity provider dashboard',
            'Protection buyer interface',
            'Real-time pool health metrics',
            'OPWallet integration',
        ],
    },
    {
        phase: 'Phase 3',
        title: 'Risk Engine',
        status: 'active',
        items: [
            'Multi-tier coverage tiers',
            'Dynamic premium pricing',
            'Oracle-based event triggers',
            'Partial claim support',
        ],
    },
    {
        phase: 'Phase 4',
        title: 'Mainnet & Scale',
        status: 'upcoming',
        items: [
            'Bitcoin Mainnet launch',
            'DAO governance for risk params',
            'Cross-pool reinsurance',
            'Protocol fee distribution',
        ],
    },
];

const STATUS_STYLES = {
    done:     { dot: '#F7931A', dotBg: 'rgba(247,147,26,0.18)', line: 'rgba(247,147,26,0.3)',  label: 'Done',     labelBg: 'rgba(74,222,128,0.1)',  labelBorder: 'rgba(74,222,128,0.3)',  labelColor: '#4ade80' },
    active:   { dot: '#60a5fa', dotBg: 'rgba(96,165,250,0.15)', line: 'rgba(96,165,250,0.25)', label: 'In Progress', labelBg: 'rgba(96,165,250,0.1)', labelBorder: 'rgba(96,165,250,0.3)', labelColor: '#60a5fa' },
    upcoming: { dot: '#30363d', dotBg: '#0d1117',               line: 'rgba(48,54,61,0.6)',    label: 'Soon',     labelBg: 'rgba(139,148,158,0.08)',labelBorder: 'rgba(139,148,158,0.2)', labelColor: '#8b949e' },
};

// ── Mobile drawer ─────────────────────────────────────────────────────────────

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}
            {/* Slide-in panel */}
            <div
                className="fixed top-0 left-0 z-50 h-full w-72 overflow-y-auto lg:hidden transition-transform duration-300"
                style={{
                    background: '#0d1117',
                    borderRight: '1px solid #30363d',
                    transform: open ? 'translateX(0)' : 'translateX(-100%)',
                    boxShadow: open ? '4px 0 32px rgba(0,0,0,0.6)' : 'none',
                }}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]" style={{ background: 'rgba(13,17,23,0.95)' }}>
                    <div className="flex items-center gap-2">
                        <ShieldIcon />
                        <span className="text-sm font-semibold text-[#c9d1d9]">Satoshi Shield</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#8b949e] hover:text-white transition-colors p-1 rounded"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <AboutCard showCollapse={false} onCollapse={() => {}} />
                    <RoadmapCard />
                </div>
            </div>
        </>
    );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, action }: { icon: React.ReactNode; label: string; action?: React.ReactNode }) {
    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md"
                        style={{ background: 'rgba(247,147,26,0.1)', border: '1px solid rgba(247,147,26,0.2)' }}>
                        {icon}
                    </span>
                    <span className="text-xs font-bold text-[#c9d1d9] uppercase tracking-widest">{label}</span>
                </div>
                {action}
            </div>
            <div className="h-px" style={{ background: 'linear-gradient(90deg, rgba(247,147,26,0.6), rgba(247,147,26,0.1), transparent)' }} />
        </>
    );
}

// ── About card ────────────────────────────────────────────────────────────────

function AboutCard({ showCollapse, onCollapse }: { showCollapse: boolean; onCollapse: () => void }) {
    return (
        <div
            className="rounded-xl border border-[#30363d] p-4 space-y-3 group transition-all duration-300"
            style={{
                background: 'linear-gradient(135deg, #0d1117 0%, #0f1520 100%)',
                boxShadow: '0 0 0 0 rgba(247,147,26,0)',
                transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(247,147,26,0.3)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(247,147,26,0.06)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#30363d';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 0 rgba(247,147,26,0)';
            }}
        >
            <SectionHeader
                icon={<ShieldIcon />}
                label="About"
                action={showCollapse ? (
                    <button
                        onClick={onCollapse}
                        title="Collapse sidebar"
                        className="text-[#8b949e] hover:text-[#F7931A] transition-colors p-1 rounded-md hover:bg-[#F7931A]/10"
                    >
                        <ChevronLeftIcon />
                    </button>
                ) : undefined}
            />

            <p className="text-xs text-[#8b949e] leading-relaxed">
                <span className="text-[#F7931A] font-semibold">Satoshi Shield</span> is a decentralized
                Bitcoin protection protocol built on{' '}
                <span className="text-[#c9d1d9] font-semibold">OP_NET</span>.
            </p>
            <p className="text-xs text-[#8b949e] leading-relaxed">
                Users purchase protection coverage against crypto risks while liquidity
                providers earn premiums by supplying capital to the protection pool.
            </p>
            <p className="text-xs text-[#8b949e] leading-relaxed">
                The protocol introduces a native risk protection layer for the Bitcoin ecosystem.
            </p>

            {/* Key Features */}
            <div className="pt-1">
                <p className="text-[10px] font-bold text-[#8b949e] uppercase tracking-widest mb-2.5">Key Features</p>
                <ul className="space-y-2">
                    {FEATURES.map((f, i) => (
                        <li
                            key={i}
                            className="flex items-start gap-2.5 text-xs text-[#8b949e] rounded-lg px-2 py-1.5 transition-all duration-200 cursor-default"
                            style={{ transition: 'background 0.2s ease, color 0.2s ease' }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLLIElement).style.background = 'rgba(247,147,26,0.06)';
                                (e.currentTarget as HTMLLIElement).style.color = '#c9d1d9';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLLIElement).style.background = 'transparent';
                                (e.currentTarget as HTMLLIElement).style.color = '#8b949e';
                            }}
                        >
                            <span className="flex-shrink-0 w-5 h-5 rounded-md text-[11px] flex items-center justify-center"
                                style={{ background: 'rgba(247,147,26,0.1)', border: '1px solid rgba(247,147,26,0.2)' }}>
                                {f.icon}
                            </span>
                            <span className="leading-relaxed pt-0.5">{f.text}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// ── Roadmap card ──────────────────────────────────────────────────────────────

function RoadmapCard() {
    return (
        <div
            className="rounded-xl border border-[#30363d] p-4 space-y-3"
            style={{
                background: 'linear-gradient(135deg, #0d1117 0%, #0f1520 100%)',
                transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(247,147,26,0.3)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(247,147,26,0.06)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#30363d';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}
        >
            <SectionHeader icon={<RoadmapIcon />} label="Roadmap" />

            <div className="space-y-4 pt-1">
                {ROADMAP.map((phase, idx) => {
                    const s = STATUS_STYLES[phase.status];
                    return (
                        <div
                            key={idx}
                            className="relative pl-5 rounded-lg px-2 py-1 -mx-2 transition-all duration-200 cursor-default"
                            style={{ transition: 'background 0.2s ease' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(247,147,26,0.04)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                        >
                            {/* Vertical connector */}
                            {idx < ROADMAP.length - 1 && (
                                <div
                                    className="absolute left-[7px] top-4 w-px"
                                    style={{ background: s.line, height: 'calc(100% + 12px)' }}
                                />
                            )}

                            {/* Status dot */}
                            <div
                                className="absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-transform duration-200"
                                style={{ background: s.dotBg, borderColor: s.dot }}
                            >
                                {phase.status === 'done' && (
                                    <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="#F7931A" strokeWidth="2" strokeLinecap="round">
                                        <polyline points="2 6 5 9 10 3"/>
                                    </svg>
                                )}
                                {phase.status === 'active' && (
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#60a5fa' }} />
                                )}
                            </div>

                            {/* Header */}
                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                <span className="text-[11px] font-bold" style={{ color: s.dot }}>{phase.phase}</span>
                                <span className="text-[11px] text-[#8b949e]">·</span>
                                <span className="text-[11px] font-semibold text-[#c9d1d9]">{phase.title}</span>
                                <span
                                    className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ background: s.labelBg, border: `1px solid ${s.labelBorder}`, color: s.labelColor }}
                                >
                                    {s.label}
                                </span>
                            </div>

                            {/* Items */}
                            <ul className="space-y-1">
                                {phase.items.map((item, j) => (
                                    <li key={j} className="text-[11px] text-[#8b949e] flex items-start gap-1.5 leading-snug">
                                        <span className="flex-shrink-0 mt-0.5 text-[10px]" style={{ color: s.dot, opacity: phase.status === 'upcoming' ? 0.4 : 0.7 }}>
                                            {phase.status === 'done' ? '✓' : phase.status === 'active' ? '›' : '·'}
                                        </span>
                                        <span style={{ opacity: phase.status === 'upcoming' ? 0.55 : 1 }}>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Main Sidebar export ───────────────────────────────────────────────────────

export function Sidebar() {
    const [collapsed,    setCollapsed]    = useState(false);
    const [mobileOpen,   setMobileOpen]   = useState(false);

    return (
        <>
            {/* Mobile trigger button — visible on small screens only */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed bottom-5 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all duration-200 active:scale-95"
                style={{
                    background: 'rgba(247,147,26,0.15)',
                    border: '1px solid rgba(247,147,26,0.35)',
                    color: '#F7931A',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 20px rgba(247,147,26,0.2)',
                }}
            >
                <ShieldIcon />
                About
            </button>

            {/* Mobile slide-in drawer */}
            <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

            {/* Desktop: collapsed stub */}
            {collapsed && (
                <button
                    onClick={() => setCollapsed(false)}
                    title="Expand sidebar"
                    className="hidden lg:flex flex-col items-center justify-center gap-1.5 w-9 self-start rounded-xl border border-[#30363d] text-[#8b949e] hover:text-[#F7931A] hover:border-[#F7931A]/40 transition-all duration-200 hover:bg-[#F7931A]/05"
                    style={{ background: '#0d1117', minHeight: 64, padding: '8px 4px', position: 'sticky', top: 80 }}
                >
                    <ShieldIcon />
                    <ChevronRightIcon />
                </button>
            )}

            {/* Desktop: full sidebar */}
            {!collapsed && (
                <aside
                    className="hidden lg:flex flex-col gap-4 w-64 xl:w-72 flex-shrink-0 self-start"
                    style={{ position: 'sticky', top: 80 }}
                >
                    <AboutCard showCollapse onCollapse={() => setCollapsed(true)} />
                    <RoadmapCard />
                </aside>
            )}
        </>
    );
}
