import React, { useState, useEffect } from 'react';
import { MedievalSharp } from 'next/font/google';
import { Coins, Zap, X } from 'lucide-react';

const fontMedieval = MedievalSharp({ weight: '400', subsets: ['latin'] });

export default function ShopModal({ isOpen, onClose, currentCoins, currentEnergy, worldId, onPurchaseSuccess }) {
    const [items, setItems] = useState([]);
    const [myPurchases, setMyPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    // Track purchasing state per item ID
    const [purchasingId, setPurchasingId] = useState(null);
    const [purchaseError, setPurchaseError] = useState(null);
    const [successItem, setSuccessItem] = useState(null); // Used to show green flash

    useEffect(() => {
        if (!isOpen) return;

        const fetchShopData = async () => {
            setLoading(true);
            try {
                const [itemsRes, purchasesRes] = await Promise.all([
                    fetch('/api/shop/items'),
                    fetch(`/api/shop/my-purchases?worldId=${worldId}`)
                ]);

                if (itemsRes.ok) {
                    const { items: fetchedItems } = await itemsRes.json();
                    setItems(fetchedItems);
                }
                if (purchasesRes.ok) {
                    const { purchases: fetchedPurchases } = await purchasesRes.json();
                    setMyPurchases(fetchedPurchases);
                }
            } catch (err) {
                console.error('Failed to load shop data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchShopData();
    }, [isOpen, worldId]);

    const handlePurchase = async (itemId) => {
        setPurchasingId(itemId);
        setPurchaseError(null);
        setSuccessItem(null);

        try {
            const res = await fetch('/api/shop/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, worldId })
            });

            const data = await res.json();

            if (!res.ok) {
                setPurchaseError({ id: itemId, msg: data.error || 'Purchase failed.' });
            } else {
                // Success
                setSuccessItem(itemId);
                // Refresh purchases array locally to show "Owned" instantly
                setMyPurchases(prev => [...prev, { item: { id: itemId } }]);

                // Notify parent to update coin/energy stats
                if (onPurchaseSuccess) {
                    onPurchaseSuccess(data.newCoins, data.newEnergy);
                }

                // Clear success styling after 2s
                setTimeout(() => setSuccessItem(null), 2000);
            }
        } catch (err) {
            console.error(err);
            setPurchaseError({ id: itemId, msg: 'Network error.' });
        } finally {
            setPurchasingId(null);
        }
    };

    if (!isOpen) return null;

    const cosmetics = items.filter(i => i.category === 'cosmetic');
    const upgrades = items.filter(i => i.category === 'upgrade');

    const ownedItemIds = new Set(myPurchases.map(p => p.item?.id));

    const renderItemCard = (item) => {
        const isOwned = ownedItemIds.has(item.id);
        const canAfford = currentCoins >= item.coin_cost && currentEnergy >= item.energy_cost;
        const isPurchasing = purchasingId === item.id;
        const showSuccess = successItem === item.id;
        const err = purchaseError?.id === item.id ? purchaseError.msg : null;

        return (
            <div key={item.id} style={{
                backgroundColor: showSuccess ? '#2A3F24' : '#2A241A',
                border: `1px solid ${showSuccess ? '#4A6B3A' : '#3D3527'}`,
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                transition: 'background-color 0.3s ease'
            }}>
                <div className={fontMedieval.className} style={{ fontSize: '1.2rem', color: '#C9A84C', fontWeight: 'bold' }}>
                    {item.name}
                </div>

                <div style={{ fontSize: '0.9rem', color: '#a0a0a0', flex: 1 }}>
                    {item.description}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#e0d8c8', fontWeight: 'bold' }}>
                        <Coins size={16} color="#C9A84C" /> {item.coin_cost}
                    </span>
                    {item.energy_cost > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#e0d8c8', fontWeight: 'bold' }}>
                            <Zap size={16} fill="#4dc9ff" color="#4dc9ff" /> {item.energy_cost}
                        </span>
                    )}
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                    {isOwned ? (
                        <div style={{ padding: '0.5rem', backgroundColor: '#1A2410', color: '#4A6B3A', textAlign: 'center', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #4A6B3A' }}>
                            Owned
                        </div>
                    ) : (
                        <button
                            disabled={!canAfford || isPurchasing}
                            onClick={() => handlePurchase(item.id)}
                            className={fontMedieval.className}
                            style={{
                                width: '100%', padding: '0.5rem',
                                backgroundColor: canAfford ? '#C9A84C' : '#3D3527',
                                color: canAfford ? '#1A2410' : '#888',
                                border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1rem',
                                cursor: canAfford && !isPurchasing ? 'pointer' : 'not-allowed',
                                opacity: isPurchasing ? 0.7 : 1
                            }}
                        >
                            {isPurchasing ? 'Loading...' : showSuccess ? 'Purchased!' : 'Buy'}
                        </button>
                    )}
                </div>

                {err && (
                    <div style={{ color: '#ff6b6b', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.2rem' }}>
                        {err}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
                style={{
                    width: '90%', maxWidth: '800px', maxHeight: '90vh', backgroundColor: '#1A2410',
                    border: '2px solid #C9A84C', borderRadius: '12px', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)', overflow: 'hidden',
                    animation: 'slideUp 0.3s ease-out forwards'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #3D3527', backgroundColor: '#0f1409' }}>
                    <h2 className={fontMedieval.className} style={{ margin: 0, fontSize: '2rem', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Coins size={28} /> The Marketplace
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#e0d8c8', cursor: 'pointer', padding: '0.5rem' }}>
                        <X size={28} />
                    </button>
                </div>

                {/* Balance Bar */}
                <div style={{ backgroundColor: '#212B16', padding: '1rem 1.5rem', display: 'flex', gap: '2rem', borderBottom: '1px solid #3D3527' }}>
                    <span style={{ fontSize: '1.1rem', color: '#e0d8c8' }}>
                        Your balances:
                    </span>
                    <span style={{ fontSize: '1.1rem', color: '#C9A84C', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {currentCoins} <Coins size={18} />
                    </span>
                    <span style={{ fontSize: '1.1rem', color: '#4dc9ff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {currentEnergy} <Zap size={18} fill="#4dc9ff" />
                    </span>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#888', padding: '3rem' }} className={fontMedieval.className}>Loading wares...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                            <section>
                                <h3 className={fontMedieval.className} style={{ color: '#e0d8c8', fontSize: '1.5rem', borderBottom: '1px solid #3D3527', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                    Cosmetics
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                                    {cosmetics.map(renderItemCard)}
                                </div>
                            </section>

                            <section>
                                <h3 className={fontMedieval.className} style={{ color: '#e0d8c8', fontSize: '1.5rem', borderBottom: '1px solid #3D3527', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                    Upgrades
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                                    {upgrades.map(renderItemCard)}
                                </div>
                            </section>

                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
          @keyframes slideUp {
             from { opacity: 0; transform: translateY(30px); }
             to { opacity: 1; transform: translateY(0); }
          }
       `}} />
        </div>
    );
}
