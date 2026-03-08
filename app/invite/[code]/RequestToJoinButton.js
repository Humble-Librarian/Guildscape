'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MedievalSharp } from 'next/font/google';

const fontMedieval = MedievalSharp({ weight: '400', subsets: ['latin'] });

export default function RequestToJoinButton({ inviteCode }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const router = useRouter();

    const handleRequest = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/invites/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteCode }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to request to join.');
            } else {
                // Success! Reload the page so the server component re-renders showing the "Waiting for approval" state
                router.refresh();
            }
        } catch (err) {
            console.error(err);
            setError('A network error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <button
                onClick={handleRequest}
                disabled={loading}
                className={fontMedieval.className}
                style={{
                    padding: '1rem 3rem',
                    backgroundColor: '#C9A84C',
                    color: '#1A2410',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '1.4rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    transition: 'transform 0.1s, opacity 0.2s',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                {loading ? 'Sending Request...' : 'Request to Join'}
            </button>

            {error && (
                <div className={fontMedieval.className} style={{ color: '#ff6b6b', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                    {error}
                </div>
            )}
        </div>
    );
}
