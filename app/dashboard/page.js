'use client';

import { useEffect, useState, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@supabase/auth-helpers-react';
import { MedievalSharp } from 'next/font/google';
import IsometricCanvas from '@/components/map/IsometricCanvas';
import { Coins, Zap, Crown, RefreshCw } from 'lucide-react';
import ShopModal from '@/components/economy/ShopModal';
import InviteModal from '@/components/economy/InviteModal';

// Lazy load Three.js component to avoid SSR issues
const ThreeWorld = lazy(() => import('@/components/map/ThreeWorld'));

const fontMedieval = MedievalSharp({ weight: '400', subsets: ['latin'] });

// Helper to format relative time
function timeAgo(dateString) {
  if (!dateString) return '';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return Math.floor(seconds) + " secs ago";
}

// Enhanced activity formatter with humanized text
function formatActivity(activity) {
  const { event_type, event_payload, coins_awarded, energy_awarded } = activity;

  let actionStr = '';
  let emoji = '';
  
  if (event_type === 'push') {
    actionStr = `You pushed code to ${event_payload?.repo_name || 'a repository'}`;
    emoji = '→';
  } else if (event_type === 'pull_request') {
    if (event_payload?.action === 'closed' && event_payload?.merged) {
      actionStr = `You merged a PR in ${event_payload?.repo_name || 'a repository'}`;
      emoji = '⚔️';
    } else if (event_payload?.action === 'opened') {
      actionStr = `You opened a PR in ${event_payload?.repo_name || 'a repository'}`;
      emoji = '→';
    } else {
      actionStr = `You ${event_payload?.action || 'worked on'} a PR in ${event_payload?.repo_name || 'a repository'}`;
      emoji = '→';
    }
  } else if (event_type === 'issues') {
    if (event_payload?.action === 'closed') {
      actionStr = `You closed an issue in ${event_payload?.repo_name || 'a repository'}`;
      emoji = '📜';
    } else {
      actionStr = `You ${event_payload?.action || 'worked on'} an issue in ${event_payload?.repo_name || 'a repository'}`;
      emoji = '→';
    }
  } else {
    actionStr = `You performed a ${event_type} action`;
    emoji = '→';
  }

  const rewards = [];
  if (coins_awarded > 0) rewards.push(`+${coins_awarded} coins`);
  if (energy_awarded > 0) rewards.push(`+${energy_awarded} energy`);

  const rewardStr = rewards.length > 0 ? ` ${emoji} ${rewards.join(', ')}` : '';
  return `${actionStr}${rewardStr}`;
}

export default function DashboardPage() {
  const session = useSession();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');
  const [toasts, setToasts] = useState([]);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [use3D, setUse3D] = useState(true); // Toggle between 2D and 3D view

  // Add global error handler
  useEffect(() => {
    const handleError = (event) => {
      console.error('Global JavaScript Error:', event.error);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  console.log('Dashboard component rendered', { 
    session: session ? 'exists' : session,
    sessionType: typeof session,
    hasData: !!data 
  });

  const handleManualSync = async () => {
    console.log('Manual sync triggered');
    try {
      console.log('Making manual auth sync request...');
      const res = await fetch('/api/auth/sync', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Manual auth sync response:', res.status, res.statusText);
      
      if (res.ok) {
        console.log('Manual sync successful, fetching world data...');
        await fetchData();
      } else {
        const errorText = await res.text();
        console.error('Manual sync failed:', res.status, errorText);
        addToast(`Sync failed: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      console.error('Manual sync error:', e);
      addToast('Manual sync failed - check console');
    }
  };

  const addToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchData = async (retryCount = 0) => {
    try {
      console.log('Fetching world data...', { retryCount });
      console.log('Making GET request to /api/worlds/mine');
      const res = await fetch('/api/worlds/mine');
      console.log('World API response status:', res.status);
      console.log('World API response headers:', [...res.headers.entries()]);
      
      if (res.status === 401) {
        console.log('World API returned 401, redirecting to login');
        router.replace('/auth/login');
        return;
      }
      
      if (res.ok) {
        const json = await res.json();
        console.log('World data received:', json);
        setData(json);

        // If the user is an owner, fetch pending requests too
        if (json?.currentMembership?.role === 'owner') {
          console.log('User is owner, fetching pending requests...');
          const pendingRes = await fetch('/api/invites/pending');
          if (pendingRes.ok) {
            const pendingJson = await pendingRes.json();
            console.log('Pending requests received:', pendingJson);
            setPendingRequests(pendingJson.requests || []);
          }
        }
      } else if (res.status === 404 && retryCount < 3) {
        // Retry on 404 (might be timing issue)
        console.log('World API returned 404, retrying...');
        setTimeout(() => fetchData(retryCount + 1), 1000 * (retryCount + 1));
        return;
      } else {
        console.error('World API returned error status:', res.status);
        const errorText = await res.text();
        console.error('Error response body:', errorText);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      console.error('Error details:', e.message, e.stack);
      if (retryCount < 3) {
        console.log('Network error, retrying...');
        setTimeout(() => fetchData(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Dashboard useEffect triggered', { session, sessionType: typeof session });
    
    // Wait for session to be determined (it starts as undefined, then becomes null or the session object)
    if (session === undefined) {
      console.log('Session is undefined, still loading...');
      return;
    }
    
    if (session === null) {
      console.log('Session is null, redirecting to login after delay...');
      // Add a small delay to prevent immediate redirect race condition
      const redirectTimer = setTimeout(() => {
        router.replace('/auth/login');
      }, 500);
      return () => clearTimeout(redirectTimer);
    }
    
    // We have a valid session object
    console.log('Session exists, proceeding with sync and data fetch');
    console.log('About to make auth sync request...');

    // Add a small delay to ensure session is fully established
    const syncTimer = setTimeout(async () => {
      try {
        console.log('Making auth sync POST request to /api/auth/sync');
        const res = await fetch('/api/auth/sync', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('Auth sync response:', res.status);
        if (res.status === 401) {
          console.log('Auth sync returned 401, redirecting to login');
          router.replace('/auth/login');
          return;
        }
        console.log('Auth sync successful, now fetching world data...');
        await fetchData();
      } catch (e) {
        console.error('Auth sync failed:', e);
        console.error('Error details:', e.message, e.stack);
        // Don't redirect immediately on network errors - show error but keep trying
        addToast('Connection issue - retrying...');
        setTimeout(() => {
          if (!data) {  // Only retry if we don't have data yet
            fetchData();
          }
        }, 3000);
      }
    }, 200); // Small delay to ensure session propagation

    // Cleanup timer
    return () => clearTimeout(syncTimer);
  }, [session, router, data]);

  const handleRefreshActivity = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/ingestion/run', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        if (result.newMilestones && result.newMilestones.length > 0) {
          result.newMilestones.forEach(m => {
            const names = { park: 'The Park', library: 'The Library', monument: 'The Monument' };
            addToast(`🏛️ Your world unlocked ${names[m] || m}!`);
          });
        }
      }
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePurchaseSuccess = (newCoins, newEnergy) => {
    // Update local state without full reload
    if (data && data.currentMembership) {
      setData({
        ...data,
        currentMembership: {
          ...data.currentMembership,
          coins: newCoins,
          energy: newEnergy
        }
      });
    }
  };

  const handleResolveInvite = async (inviteId, action) => {
    try {
      const res = await fetch('/api/invites/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action })
      });

      if (res.ok) {
        addToast(action === 'approve' ? 'Member approved! 🏰' : 'Request rejected.');
        // Refresh everything to show the new house on the map and reset pending list
        await fetchData();
      } else {
        const errData = await res.json();
        addToast(`Error: ${errData.error || 'Failed to resolve invite'}`);
      }
    } catch (e) {
      console.error(e);
      addToast('Network error resolving invite');
    }
  };

  if (session === undefined || !session || loading || (!data && session !== null)) {
    console.log('Rendering loading state', { session, loading, hasData: !!data });
    return (
      <div style={{ backgroundColor: '#1A2410', color: '#C9A84C', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Manual Debug Button - Remove after debugging */}
        <button 
          onClick={handleManualSync}
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            padding: '10px 15px',
            backgroundColor: '#C9A84C',
            color: '#1A2410',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔧 Debug Sync
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <p className={fontMedieval.className} style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Loading World...</p>
          <p style={{ fontSize: '1rem', opacity: 0.8 }}>Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ backgroundColor: '#1A2410', color: '#C9A84C', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p className={fontMedieval.className} style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Unable to Load World</p>
          <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '2rem' }}>Having trouble connecting to the server</p>
          <button
            onClick={fetchData}
            className={fontMedieval.className}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#C9A84C', 
              color: '#1A2410', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold', 
              fontSize: '1.1rem', 
              cursor: 'pointer'
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { world, members, currentMembership, recentActivities, weeklyProgress } = data;

  // Format members for IsometricCanvas
  const canvasMembers = members.map(m => ({
    id: m.user.id,
    plot_index: m.membership.plot_index
  }));

  const userAvatar = session.user?.user_metadata?.avatar_url;
  const username = session.user?.user_metadata?.user_name ?? session.user?.user_metadata?.login ?? 'someone';

  return (
    <div style={{ backgroundColor: '#1A2410', color: '#e0d8c8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* TOP BAR */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 2rem', backgroundColor: '#0f1409', borderBottom: '2px solid #3D3527'
      }}>
        <div className={fontMedieval.className} style={{ fontSize: '2rem', color: '#C9A84C', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Guildscape
        </div>

        <div className={fontMedieval.className} style={{ fontSize: '1.5rem', color: '#e0d8c8' }}>
          {world?.name || `${username}'s World`}
        </div>

        {/* Admin Link - Only visible to owners */}
        {currentMembership?.role === 'owner' && (
          <button
            onClick={() => router.push('/dashboard/admin')}
            className={fontMedieval.className}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3D3527',
              color: '#C9A84C',
              border: '1px solid #C9A84C',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            📜 Admin
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#C9A84C', fontWeight: 'bold' }}>
            <Coins size={20} />
            {currentMembership?.coins || 0}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4dc9ff', fontWeight: 'bold' }}>
            <Zap size={20} fill="#4dc9ff" color="#4dc9ff" />
            {currentMembership?.energy || 0}
          </div>
          {userAvatar && (
            <img src={userAvatar} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #C9A84C' }} />
          )}
        </div>
      </header>

      {/* MAIN AREA */}
      <main style={{ flex: 1, display: 'flex', padding: '1rem', gap: '1rem', overflow: 'hidden' }}>
        {/* Left Column - Map */}
        <div style={{ flex: '0 0 70%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Weekly Progress Bar */}
          {weeklyProgress && (
            <div style={{ 
              backgroundColor: '#3D3527', 
              borderRadius: '8px', 
              border: '1px solid #C9A84C',
              padding: '1rem'
            }}>
              <h3 className={fontMedieval.className} style={{ 
                color: '#C9A84C', 
                margin: '0 0 1rem 0', 
                fontSize: '1.3rem',
                textAlign: 'center'
              }}>
                This Week's Progress
              </h3>
              
              {weeklyProgress.nextMilestone ? (
                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: '#e0d8c8'
                  }}>
                    <span>
                      {weeklyProgress.coinsThisWeek} / {weeklyProgress.nextMilestone.coinsNeeded} coins
                    </span>
                    <span style={{ fontWeight: 'bold' }}>
                      → {weeklyProgress.nextMilestone.name}
                    </span>
                  </div>
                  
                  <div style={{ 
                    height: '20px', 
                    backgroundColor: '#212B16', 
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid #3D3527'
                  }}>
                    <div 
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (weeklyProgress.coinsThisWeek / weeklyProgress.nextMilestone.coinsNeeded) * 100)}%`,
                        backgroundColor: '#C9A84C',
                        transition: 'width 0.5s ease-in-out',
                        borderRadius: '10px'
                      }}
                    />
                  </div>
                  
                  <div style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.8rem', 
                    color: '#a0a0a0',
                    textAlign: 'center'
                  }}>
                    {weeklyProgress.eventsThisWeek} activities this week
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
                  <div className={fontMedieval.className} style={{ color: '#C9A84C', fontSize: '1.2rem' }}>
                    All milestones unlocked!
                  </div>
                  <div style={{ color: '#a0a0a0', marginTop: '0.5rem' }}>
                    {weeklyProgress.coinsThisWeek} coins earned this week
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Map Canvas */}
          <div style={{ 
            backgroundColor: '#212B16', 
            borderRadius: '8px', 
            border: '1px solid #3D3527', 
            overflow: 'hidden', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flex: 1,
            position: 'relative'
          }}>
            {/* View Toggle & Refresh Buttons */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              display: 'flex',
              gap: '10px',
              zIndex: 10
            }}>
              <button
                onClick={handleRefreshActivity}
                disabled={refreshing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: refreshing ? '#666' : '#C9A84C',
                  color: '#1A2410',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                {refreshing ? 'Syncing...' : 'Sync GitHub'}
              </button>
              
              <button
                onClick={() => setUse3D(!use3D)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4A6B3A',
                  color: '#e0d8c8',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {use3D ? '2D View' : '3D View'}
              </button>
            </div>
            
            {use3D ? (
              <Suspense fallback={
                <div style={{ color: '#C9A84C', fontSize: '1.5rem' }}>
                  Loading 3D World...
                </div>
              }>
                <ThreeWorld
                  worldData={world}
                  members={canvasMembers}
                  width={900}
                  height={650}
                />
              </Suspense>
            ) : (
              <IsometricCanvas
                worldData={world}
                members={canvasMembers}
                currentUserId={session.user.id}
                width={900}
                height={650}
                onTileClick={(x, y, id) => console.log('Clicked tile', x, y, id)}
              />
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div style={{
          flex: '1',
          backgroundColor: '#3D3527',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #C9A84C',
          backgroundImage: 'radial-gradient(#4d4332 1px, transparent 1px)',
          backgroundSize: '10px 10px',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #212B16' }}>
            <button
              onClick={() => setActiveTab('activity')}
              className={fontMedieval.className}
              style={{ flex: 1, padding: '1rem', backgroundColor: activeTab === 'activity' ? 'transparent' : '#2A241A', color: activeTab === 'activity' ? '#C9A84C' : '#e0d8c8', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer', border: 'none', borderRight: '1px solid #212B16', transition: 'background 0.2s' }}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={fontMedieval.className}
              style={{ flex: 1, padding: '1rem', backgroundColor: activeTab === 'members' ? 'transparent' : '#2A241A', color: activeTab === 'members' ? '#C9A84C' : '#e0d8c8', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer', border: 'none', transition: 'background 0.2s' }}
            >
              Members
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {activeTab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentActivities && recentActivities.length > 0 ? (
                  recentActivities.map(act => (
                    <div key={act.id} style={{ backgroundColor: '#2A241A', padding: '0.75rem', borderRadius: '4px', borderLeft: '3px solid #C9A84C' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {userAvatar && <img src={userAvatar} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="Avatar" />}
                        <span style={{ fontWeight: 'bold', color: '#C9A84C' }}>{username}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
                        {formatActivity(act)}
                        {act.coins_awarded > 0 && (
                          <span style={{ color: '#C9A84C', fontWeight: 'bold' }}> 🪙</span>
                        )}
                      </p>
                      <small style={{ color: '#888', display: 'block', marginTop: '0.5rem' }}>{timeAgo(act.created_at)}</small>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👻</div>
                    <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                      Your world is quiet... Push some code to bring it to life! 🏰
                    </p>
                    <button
                      onClick={handleRefreshActivity}
                      disabled={refreshing}
                      className={fontMedieval.className}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#C9A84C',
                        color: '#1A2410',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        cursor: refreshing ? 'wait' : 'pointer',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      {refreshing ? 'Connecting...' : 'Connect & Refresh'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Pending Requests Section (Owner Only) */}
                {currentMembership?.role === 'owner' && pendingRequests.length > 0 && (
                  <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #C9A84C' }}>
                    <div className={fontMedieval.className} style={{ fontSize: '1.2rem', color: '#e0d8c8', marginBottom: '0.8rem' }}>
                      Pending Requests
                    </div>
                    {pendingRequests.map(req => (
                      <div key={req.inviteId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#3D3527', border: '1px solid #4A6B3A', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <img src={req.user.avatar_url || 'https://github.com/ghost.png'} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #C9A84C' }} />
                        <div style={{ flex: 1, fontWeight: 'bold', color: '#C9A84C' }}>
                          {req.user.github_username}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleResolveInvite(req.inviteId, 'approve')}
                            style={{ backgroundColor: '#2A3F24', color: '#e0d8c8', border: '1px solid #4A6B3A', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleResolveInvite(req.inviteId, 'reject')}
                            style={{ backgroundColor: '#3f2424', color: '#ff6b6b', border: '1px solid #6b4a4a', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current Members List */}
                {members.map(m => (
                  <div key={m.membership.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#2A241A', padding: '0.75rem', borderRadius: '4px' }}>
                    <img src={m.user.avatar_url || 'https://github.com/ghost.png'} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #3D3527' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#C9A84C' }}>{m.user.github_username}</span>
                        {m.membership.role === 'owner' && <Crown size={14} color="#C9A84C" />}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#a0a0a0', display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>🪙   {m.membership.coins}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#4dc9ff' }}>⚡  {m.membership.energy}</span>
                        <span>plot {m.membership.plot_index}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* BOTTOM BAR */}
      <footer style={{
        padding: '1rem 2rem', backgroundColor: '#0f1409', borderTop: '2px solid #3D3527',
        display: 'flex', gap: '1rem', justifyContent: 'center'
      }}>
        <button
          onClick={handleRefreshActivity}
          disabled={refreshing}
          className={fontMedieval.className}
          style={{ padding: '0.5rem 1.5rem', backgroundColor: '#C9A84C', color: '#1A2410', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1rem', cursor: refreshing ? 'wait' : 'pointer', transition: 'opacity 0.2s', opacity: refreshing ? 0.7 : 1 }}
        >
          {refreshing ? 'Syncing...' : 'Refresh Activity'}
        </button>
        <button
          className={fontMedieval.className}
          style={{ padding: '0.5rem 1.5rem', backgroundColor: '#212B16', color: '#C9A84C', border: '1px solid #C9A84C', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
          onClick={() => setIsInviteOpen(true)}
        >
          Invite Someone
        </button>
        <button
          className={fontMedieval.className}
          style={{ padding: '0.5rem 1.5rem', backgroundColor: '#3D3527', color: '#e0d8c8', border: '1px solid #3D3527', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
          onClick={() => setIsShopOpen(true)}
        >
          Shop
        </button>
      </footer>

      {/* TOAST NOTIFICATIONS */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 1000 }}>
        {toasts.map(toast => (
          <div key={toast.id} className={fontMedieval.className} style={{
            backgroundColor: '#1A2410', border: '2px solid #C9A84C', color: '#e0d8c8',
            padding: '1rem 1.5rem', borderRadius: '8px', fontSize: '1.1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            animation: 'fadein 0.3s, fadeout 0.3s 3.7s'
          }}>
            {toast.message}
          </div>
        ))}
      </div>

      {/* SHOP UI MODAL */}
      <ShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        currentCoins={currentMembership?.coins || 0}
        currentEnergy={currentMembership?.energy || 0}
        worldId={world?.id}
        onPurchaseSuccess={handlePurchaseSuccess}
      />

      {/* INVITE UI MODAL */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        currentMembersCount={members?.length || 1}
        pendingCount={pendingRequests?.length || 0}
        addToast={addToast}
      />
    </div>
  );
}
