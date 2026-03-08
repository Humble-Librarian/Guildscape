'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@supabase/auth-helpers-react';
import { MedievalSharp } from 'next/font/google';
import { Coins, Zap, Crown, RotateCcw, BarChart3 } from 'lucide-react';

const fontMedieval = MedievalSharp({ weight: '400', subsets: ['latin'] });

// Humanize constant keys for display
function humanizeKey(key) {
    return key
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Format timestamp for display
function formatTime(timestamp) {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
}

export default function AdminPanelPage() {
    const session = useSession();
    const router = useRouter();

    const [constants, setConstants] = useState([]);
    const [worldStats, setWorldStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingStates, setSavingStates] = useState({});
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    // Fetch constants
    const fetchConstants = async () => {
        try {
            const res = await fetch('/api/admin/constants');
            if (res.status === 401) {
                router.replace('/auth/login');
                return;
            }
            if (res.status === 403) {
                addToast('Access denied: Owner permissions required', 'error');
                router.push('/dashboard');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setConstants(data.constants || []);
            }
        } catch (e) {
            console.error('Error fetching constants:', e);
            addToast('Failed to load constants', 'error');
        }
    };

    // Fetch world stats
    const fetchWorldStats = async () => {
        try {
            const res = await fetch('/api/admin/world-stats');
            if (res.ok) {
                const data = await res.json();
                setWorldStats(data);
            }
        } catch (e) {
            console.error('Error fetching world stats:', e);
        }
    };

    // Update constant
    const updateConstant = async (key, value) => {
        setSavingStates(prev => ({ ...prev, [key]: 'saving' }));
        
        try {
            const res = await fetch('/api/admin/constants/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });

            if (res.ok) {
                const data = await res.json();
                setConstants(prev => 
                    prev.map(c => c.key === key ? { ...c, value: data.newValue, updated_at: data.updatedAt } : c)
                );
                setSavingStates(prev => ({ ...prev, [key]: 'saved' }));
                addToast(`Updated ${humanizeKey(key)} to ${value}`, 'success');
                
                // Reset save state after delay
                setTimeout(() => {
                    setSavingStates(prev => ({ ...prev, [key]: null }));
                }, 2000);
            } else {
                const error = await res.json();
                addToast(error.error || 'Failed to update constant', 'error');
                setSavingStates(prev => ({ ...prev, [key]: 'error' }));
            }
        } catch (e) {
            console.error('Error updating constant:', e);
            addToast('Network error updating constant', 'error');
            setSavingStates(prev => ({ ...prev, [key]: 'error' }));
        }
    };

    // Reset to defaults
    const resetToDefaults = async () => {
        if (!confirm('Reset all scoring constants to default values?')) return;
        
        try {
            const res = await fetch('/api/admin/constants/reset', { method: 'POST' });
            if (res.ok) {
                addToast('Constants reset to default values', 'success');
                await fetchConstants(); // Refresh the list
            } else {
                const error = await res.json();
                addToast(error.error || 'Failed to reset constants', 'error');
            }
        } catch (e) {
            console.error('Error resetting constants:', e);
            addToast('Network error resetting constants', 'error');
        }
    };

    // Force run ingestion
    const forceRunIngestion = async () => {
        if (!confirm('Run ingestion for all members? This may take a while.')) return;
        
        try {
            const res = await fetch('/api/ingestion/run', { method: 'POST' });
            if (res.ok) {
                addToast('Ingestion started for all members', 'success');
            } else {
                const error = await res.json();
                addToast(error.error || 'Failed to start ingestion', 'error');
            }
        } catch (e) {
            console.error('Error running ingestion:', e);
            addToast('Network error starting ingestion', 'error');
        }
    };

    useEffect(() => {
        if (session === null) {
            router.replace('/auth/login');
            return;
        }
        if (!session) return;

        Promise.all([
            fetchConstants(),
            fetchWorldStats()
        ]).finally(() => setLoading(false));
    }, [session, router]);

    if (!session || loading) {
        return (
            <div style={{ backgroundColor: '#1A2410', color: '#C9A84C', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p className={fontMedieval.className} style={{ fontSize: '1.5rem' }}>Loading Admin Panel...</p>
            </div>
        );
    }

    return (
        <div style={{ 
            backgroundColor: '#1A2410', 
            color: '#e0d8c8', 
            minHeight: '100vh',
            padding: '2rem'
        }}>
            {/* Header */}
            <header style={{
                backgroundColor: '#0f1409',
                borderBottom: '2px solid #3D3527',
                padding: '1rem 2rem',
                marginBottom: '2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h1 className={fontMedieval.className} style={{ 
                    fontSize: '2rem', 
                    color: '#C9A84C', 
                    margin: 0 
                }}>
                    📜 World Admin Panel
                </h1>
                <button
                    onClick={() => router.push('/dashboard')}
                    className={fontMedieval.className}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#3D3527',
                        color: '#e0d8c8',
                        border: '1px solid #C9A84C',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    ← Back to Dashboard
                </button>
            </header>

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Scoring Constants Section */}
                <section style={{
                    backgroundColor: '#212B16',
                    border: '1px solid #3D3527',
                    borderRadius: '8px',
                    padding: '2rem',
                    marginBottom: '2rem',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%233d3527\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M0 0h20v20H0z\'/%3E%3C/g%3E%3C/svg%3E")'
                }}>
                    <h2 className={fontMedieval.className} style={{ 
                        color: '#C9A84C', 
                        fontSize: '1.8rem', 
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Coins size={24} />
                        Scoring Constants
                    </h2>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {constants.map(constant => (
                            <div key={constant.key} style={{
                                backgroundColor: '#3D3527',
                                border: '1px solid #C9A84C',
                                borderRadius: '6px',
                                padding: '1.5rem'
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'flex-start',
                                    marginBottom: '1rem'
                                }}>
                                    <div>
                                        <h3 className={fontMedieval.className} style={{ 
                                            color: '#e0d8c8', 
                                            margin: '0 0 0.5rem 0',
                                            fontSize: '1.3rem'
                                        }}>
                                            {humanizeKey(constant.key)}
                                        </h3>
                                        <p style={{ 
                                            color: '#a0a0a0', 
                                            margin: 0,
                                            fontSize: '0.9rem'
                                        }}>
                                            {constant.description}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <small style={{ color: '#888', display: 'block' }}>
                                            Last updated: {formatTime(constant.updated_at)}
                                        </small>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <label style={{ color: '#C9A84C', fontWeight: 'bold' }}>
                                        Value:
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={constant.value}
                                        onChange={(e) => {
                                            const newConstants = constants.map(c => 
                                                c.key === constant.key 
                                                    ? { ...c, value: parseInt(e.target.value) || 0 }
                                                    : c
                                            );
                                            setConstants(newConstants);
                                        }}
                                        style={{
                                            backgroundColor: '#212B16',
                                            color: '#e0d8c8',
                                            border: '1px solid #3D3527',
                                            borderRadius: '4px',
                                            padding: '0.5rem',
                                            width: '100px'
                                        }}
                                    />
                                    <button
                                        onClick={() => updateConstant(constant.key, constant.value)}
                                        disabled={savingStates[constant.key] === 'saving'}
                                        className={fontMedieval.className}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            backgroundColor: savingStates[constant.key] === 'saved' ? '#2A3F24' : '#C9A84C',
                                            color: savingStates[constant.key] === 'saved' ? '#e0d8c8' : '#1A2410',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: savingStates[constant.key] === 'saving' ? 'wait' : 'pointer',
                                            fontWeight: 'bold',
                                            minWidth: '80px'
                                        }}
                                    >
                                        {savingStates[constant.key] === 'saving' ? 'Saving...' : 
                                         savingStates[constant.key] === 'saved' ? '✓ Saved' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <button
                            onClick={resetToDefaults}
                            className={fontMedieval.className}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#3f2424',
                                color: '#ff6b6b',
                                border: '1px solid #6b4a4a',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <RotateCcw size={18} />
                            Reset to Default Values
                        </button>
                    </div>
                </section>

                {/* World Overview Section */}
                <section style={{
                    backgroundColor: '#212B16',
                    border: '1px solid #3D3527',
                    borderRadius: '8px',
                    padding: '2rem'
                }}>
                    <h2 className={fontMedieval.className} style={{ 
                        color: '#C9A84C', 
                        fontSize: '1.8rem', 
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <BarChart3 size={24} />
                        World Overview
                    </h2>

                    {worldStats ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                            <div style={{
                                backgroundColor: '#3D3527',
                                border: '1px solid #C9A84C',
                                borderRadius: '6px',
                                padding: '1.5rem',
                                textAlign: 'center'
                            }}>
                                <div className={fontMedieval.className} style={{ fontSize: '2.5rem', color: '#C9A84C', marginBottom: '0.5rem' }}>
                                    {worldStats.totalCoins}
                                </div>
                                <div style={{ color: '#a0a0a0' }}>Total Coins</div>
                            </div>

                            <div style={{
                                backgroundColor: '#3D3527',
                                border: '1px solid #C9A84C',
                                borderRadius: '6px',
                                padding: '1.5rem',
                                textAlign: 'center'
                            }}>
                                <div className={fontMedieval.className} style={{ fontSize: '2.5rem', color: '#C9A84C', marginBottom: '0.5rem' }}>
                                    {worldStats.memberCount}
                                </div>
                                <div style={{ color: '#a0a0a0' }}>Members</div>
                            </div>

                            <div style={{
                                backgroundColor: '#3D3527',
                                border: '1px solid #C9A84C',
                                borderRadius: '6px',
                                padding: '1.5rem'
                            }}>
                                <div className={fontMedieval.className} style={{ 
                                    color: '#C9A84C', 
                                    marginBottom: '1rem',
                                    fontSize: '1.2rem'
                                }}>
                                    Milestones Unlocked
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {(worldStats.milestonesUnlocked || []).map(milestone => (
                                        <span 
                                            key={milestone}
                                            style={{
                                                backgroundColor: '#2A3F24',
                                                color: '#e0d8c8',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '20px',
                                                fontSize: '0.9rem',
                                                border: '1px solid #4A6B3A'
                                            }}
                                        >
                                            {milestone.charAt(0).toUpperCase() + milestone.slice(1)}
                                        </span>
                                    ))}
                                    {(worldStats.milestonesUnlocked || []).length === 0 && (
                                        <span style={{ color: '#888', fontStyle: 'italic' }}>None yet</span>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                backgroundColor: '#3D3527',
                                border: '1px solid #C9A84C',
                                borderRadius: '6px',
                                padding: '1.5rem',
                                textAlign: 'center'
                            }}>
                                <div className={fontMedieval.className} style={{ fontSize: '2.5rem', color: '#C9A84C', marginBottom: '0.5rem' }}>
                                    {worldStats.activityCount}
                                </div>
                                <div style={{ color: '#a0a0a0' }}>Activities Recorded</div>
                            </div>
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                            Loading world statistics...
                        </p>
                    )}

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <button
                            onClick={forceRunIngestion}
                            className={fontMedieval.className}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#212B16',
                                color: '#C9A84C',
                                border: '1px solid #C9A84C',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            Force Run Ingestion for All Members
                        </button>
                    </div>
                </section>
            </div>

            {/* Toast Notifications */}
            <div style={{ 
                position: 'fixed', 
                bottom: '2rem', 
                right: '2rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem', 
                zIndex: 1000 
            }}>
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        className={fontMedieval.className}
                        style={{
                            backgroundColor: toast.type === 'error' ? '#3f2424' : '#1A2410',
                            border: `2px solid ${toast.type === 'error' ? '#ff6b6b' : '#C9A84C'}`,
                            color: '#e0d8c8',
                            padding: '1rem 1.5rem',
                            borderRadius: '8px',
                            fontSize: '1.1rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                        }}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>
    );
}