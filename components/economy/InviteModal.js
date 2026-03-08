import React, { useState } from 'react';
import { MedievalSharp } from 'next/font/google';
import { X, Copy, Users } from 'lucide-react';

const fontMedieval = MedievalSharp({ weight: '400', subsets: ['latin'] });

export default function InviteModal({ isOpen, onClose, currentMembersCount, pendingCount, addToast }) {
    const [loading, setLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const slotsAvailable = 4 - currentMembersCount;
    const isFull = slotsAvailable <= 0;

    const generateLink = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/invites/create', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to generate invite');
            } else {
                setInviteLink(data.inviteUrl);
            }
        } catch (err) {
            console.error(err);
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink);
            addToast('Link copied to clipboard! 📋');
        }
    };

    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '90%', maxWidth: '500px', backgroundColor: '#1A2410',
                    border: '2px solid #C9A84C', borderRadius: '12px', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)', overflow: 'hidden',
                    animation: 'slideUp 0.3s ease-out forwards' // share the same slideUp keyframes injected by ShopModal
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #3D3527', backgroundColor: '#0f1409' }}>
                    <h2 className={fontMedieval.className} style={{ margin: 0, fontSize: '1.8rem', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={24} /> Invite to Guildscape
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#e0d8c8', cursor: 'pointer', padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Stats Box */}
                    <div style={{ backgroundColor: '#212B16', padding: '1rem', borderRadius: '6px', border: '1px solid #3D3527', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ color: '#e0d8c8', fontSize: '1.1rem' }}>
                            <strong>{slotsAvailable} of 3</strong> invite slots remaining
                        </div>
                        {pendingCount > 0 && (
                            <div style={{ color: '#C9A84C', fontSize: '1rem' }}>
                                <em>{pendingCount} pending request{pendingCount > 1 ? 's' : ''} waiting for approval</em>
                            </div>
                        )}
                    </div>

                    {/* Action Area */}
                    {isFull ? (
                        <div style={{ color: '#ff6b6b', textAlign: 'center', padding: '1rem', backgroundColor: '#3f2424', borderRadius: '4px', border: '1px solid #6b4a4a' }}>
                            Your world is currently full. Reject pending invites or manage roster to free up space.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {!inviteLink ? (
                                <button
                                    onClick={generateLink}
                                    disabled={loading}
                                    className={fontMedieval.className}
                                    style={{
                                        padding: '0.8rem', backgroundColor: '#C9A84C', color: '#1A2410',
                                        border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.2rem',
                                        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
                                    }}
                                >
                                    {loading ? 'Scribing script...' : 'Commence Invite Link Generation'}
                                </button>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>Share this unique link:</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            readOnly
                                            value={inviteLink}
                                            style={{ flex: 1, padding: '0.8rem', backgroundColor: '#0f1409', color: '#e0d8c8', border: '1px solid #C9A84C', borderRadius: '4px', fontFamily: 'monospace', fontSize: '1rem' }}
                                        />
                                        <button
                                            onClick={handleCopy}
                                            style={{ backgroundColor: '#C9A84C', color: '#1A2410', border: 'none', padding: '0 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            title="Copy Link"
                                        >
                                            <Copy size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {error && <div style={{ color: '#ff6b6b', textAlign: 'center' }}>{error}</div>}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
