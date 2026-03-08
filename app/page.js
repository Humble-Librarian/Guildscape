'use client';

import { useState, useEffect } from 'react';
import { MedievalSharp, Cinzel } from 'next/font/google';
import { Github, Sword, Shield, Crown, Map, Users, Landmark, Zap } from 'lucide-react';
import Link from 'next/link';

const fontMedieval = MedievalSharp({ weight: '400', subsets: ['latin'], variable: '--font-medieval' });
const fontCinzel = Cinzel({ weight: '700', subsets: ['latin'], variable: '--font-cinzel' });

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState({});

  // Handle scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe all sections
    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`${fontMedieval.variable} ${fontCinzel.variable}`} style={{ 
      backgroundColor: '#0a0f0a', 
      color: '#e0d8c8', 
      minHeight: '100vh',
      fontFamily: 'var(--font-medieval)',
      overflowX: 'hidden'
    }}>
      {/* Hero Section */}
      <section id="hero" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '2rem',
        backgroundImage: 'radial-gradient(circle at center, #1a2410 0%, #0a0f0a 70%)'
      }}>
        {/* Parchment texture overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
          pointerEvents: 'none'
        }} />

        <div style={{
          textAlign: 'center',
          maxWidth: '800px',
          zIndex: 2,
          transform: isVisible.hero ? 'translateY(0)' : 'translateY(20px)',
          opacity: isVisible.hero ? 1 : 0,
          transition: 'all 1s ease-out'
        }}>
          <h1 className={fontCinzel.className} style={{
            fontSize: '4rem',
            color: '#C9A84C',
            margin: '0 0 1.5rem 0',
            textShadow: '0 0 20px rgba(201, 168, 76, 0.5)',
            letterSpacing: '2px'
          }}>
            Your code builds your world.
          </h1>
          
          <p style={{
            fontSize: '1.5rem',
            lineHeight: '1.6',
            margin: '0 0 3rem 0',
            color: '#a0a0a0',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Guildscape turns your GitHub activity into a living fantasy kingdom. 
            Every commit, every PR, every closed issue grows your realm.
          </p>
          
          <Link href="/auth/login" style={{
            display: 'inline-block',
            padding: '1.25rem 2.5rem',
            backgroundColor: '#C9A84C',
            color: '#1A2410',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1.25rem',
            border: '2px solid #C9A84C',
            transition: 'all 0.3s ease',
            boxShadow: '0 10px 25px rgba(201, 168, 76, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)';
            e.target.style.boxShadow = '0 15px 35px rgba(201, 168, 76, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 10px 25px rgba(201, 168, 76, 0.3)';
          }}
          >
            Build Your World — It's Free
            <Sword size={20} style={{ marginLeft: '10px', verticalAlign: 'middle' }} />
          </Link>
          
          {/* Static map preview */}
          <div style={{
            marginTop: '4rem',
            backgroundColor: '#1a2410',
            borderRadius: '12px',
            border: '2px solid #3D3527',
            padding: '2rem',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              height: '300px',
              backgroundColor: '#212B16',
              borderRadius: '8px',
              border: '1px solid #3D3527',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Isometric grid pattern */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundImage: `
                  linear-gradient(30deg, transparent 70%, rgba(61, 53, 39, 0.3) 70%),
                  linear-gradient(-30deg, transparent 70%, rgba(61, 53, 39, 0.3) 70%)
                `,
                backgroundSize: '40px 70px',
                opacity: 0.6
              }} />
              
              {/* Decorative elements */}
              <div style={{ textAlign: 'center', color: '#C9A84C', zIndex: 2 }}>
                <Landmark size={60} style={{ marginBottom: '1rem' }} />
                <div className={fontMedieval.className} style={{ fontSize: '1.5rem' }}>
                  Your Kingdom Awaits
                </div>
                <div style={{ fontSize: '0.9rem', color: '#a0a0a0', marginTop: '0.5rem' }}>
                  Connect GitHub to begin your journey
                </div>
              </div>
              
              {/* Floating decorative elements */}
              <div style={{
                position: 'absolute',
                top: '20%',
                left: '15%',
                color: '#4A6B3A',
                opacity: 0.7
              }}>
                <Shield size={30} />
              </div>
              <div style={{
                position: 'absolute',
                bottom: '25%',
                right: '20%',
                color: '#4A6B3A',
                opacity: 0.7
              }}>
                <Crown size={25} />
              </div>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              marginTop: '1rem', 
              color: '#888',
              fontSize: '0.9rem'
            }}>
              Preview of your isometric kingdom
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{
        padding: '6rem 2rem',
        backgroundColor: '#121a0f',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h2 className={fontCinzel.className} style={{
            fontSize: '2.5rem',
            color: '#C9A84C',
            marginBottom: '4rem',
            textShadow: '0 0 15px rgba(201, 168, 76, 0.3)'
          }}>
            How It Works
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '3rem',
            marginTop: '3rem'
          }}>
            {/* Step 1 */}
            <div style={{
              backgroundColor: '#1a2410',
              borderRadius: '12px',
              padding: '2.5rem',
              border: '1px solid #3D3527',
              transform: isVisible['how-it-works'] ? 'translateY(0)' : 'translateY(30px)',
              opacity: isVisible['how-it-works'] ? 1 : 0,
              transition: 'all 0.8s ease 0.1s'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                backgroundColor: '#C9A84C',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1A2410'
              }}>
                1
              </div>
              <Github size={40} style={{ 
                color: '#C9A84C', 
                margin: '0 auto 1rem',
                display: 'block'
              }} />
              <h3 className={fontMedieval.className} style={{
                fontSize: '1.5rem',
                color: '#C9A84C',
                marginBottom: '1rem'
              }}>
                Connect GitHub
              </h3>
              <p style={{ 
                color: '#a0a0a0', 
                lineHeight: '1.6',
                fontSize: '1.1rem'
              }}>
                Sign in and we'll read your public GitHub activity to start building your realm.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{
              backgroundColor: '#1a2410',
              borderRadius: '12px',
              padding: '2.5rem',
              border: '1px solid #3D3527',
              transform: isVisible['how-it-works'] ? 'translateY(0)' : 'translateY(30px)',
              opacity: isVisible['how-it-works'] ? 1 : 0,
              transition: 'all 0.8s ease 0.3s'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                backgroundColor: '#C9A84C',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1A2410'
              }}>
                2
              </div>
              <Zap size={40} style={{ 
                color: '#C9A84C', 
                margin: '0 auto 1rem',
                display: 'block'
              }} />
              <h3 className={fontMedieval.className} style={{
                fontSize: '1.5rem',
                color: '#C9A84C',
                marginBottom: '1rem'
              }}>
                Code to Earn
              </h3>
              <p style={{ 
                color: '#a0a0a0', 
                lineHeight: '1.6',
                fontSize: '1.1rem'
              }}>
                Merged PRs, pushes, and closed issues earn you coins and energy for your kingdom.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{
              backgroundColor: '#1a2410',
              borderRadius: '12px',
              padding: '2.5rem',
              border: '1px solid #3D3527',
              transform: isVisible['how-it-works'] ? 'translateY(0)' : 'translateY(30px)',
              opacity: isVisible['how-it-works'] ? 1 : 0,
              transition: 'all 0.8s ease 0.5s'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                backgroundColor: '#C9A84C',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1A2410'
              }}>
                3
              </div>
              <Landmark size={40} style={{ 
                color: '#C9A84C', 
                margin: '0 auto 1rem',
                display: 'block'
              }} />
              <h3 className={fontMedieval.className} style={{
                fontSize: '1.5rem',
                color: '#C9A84C',
                marginBottom: '1rem'
              }}>
                Watch Your Kingdom Grow
              </h3>
              <p style={{ 
                color: '#a0a0a0', 
                lineHeight: '1.6',
                fontSize: '1.1rem'
              }}>
                Spend coins on upgrades, unlock landmarks, and invite friends to join your realm.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: '6rem 2rem',
        backgroundColor: '#0a0f0a',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h2 className={fontCinzel.className} style={{
            fontSize: '2.5rem',
            color: '#C9A84C',
            textAlign: 'center',
            marginBottom: '4rem',
            textShadow: '0 0 15px rgba(201, 168, 76, 0.3)'
          }}>
            Realm Features
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '2.5rem'
          }}>
            {/* Feature 1 */}
            <div style={{
              backgroundColor: '#1a2410',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #3D3527',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1.5rem',
              transform: isVisible.features ? 'translateX(0)' : 'translateX(-30px)',
              opacity: isVisible.features ? 1 : 0,
              transition: 'all 0.8s ease 0.1s'
            }}>
              <Map size={32} style={{ 
                color: '#C9A84C', 
                minWidth: '32px',
                marginTop: '0.5rem'
              }} />
              <div>
                <h3 className={fontMedieval.className} style={{
                  fontSize: '1.4rem',
                  color: '#C9A84C',
                  marginBottom: '0.75rem'
                }}>
                  Your Own Isometric World
                </h3>
                <p style={{ 
                  color: '#a0a0a0', 
                  lineHeight: '1.6',
                  fontSize: '1.05rem'
                }}>
                  Private, personal, and uniquely yours. Build the kingdom that reflects your coding journey.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div style={{
              backgroundColor: '#1a2410',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #3D3527',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1.5rem',
              transform: isVisible.features ? 'translateX(0)' : 'translateX(30px)',
              opacity: isVisible.features ? 1 : 0,
              transition: 'all 0.8s ease 0.2s'
            }}>
              <Users size={32} style={{ 
                color: '#C9A84C', 
                minWidth: '32px',
                marginTop: '0.5rem'
              }} />
              <div>
                <h3 className={fontMedieval.className} style={{
                  fontSize: '1.4rem',
                  color: '#C9A84C',
                  marginBottom: '0.75rem'
                }}>
                  Invite Friends
                </h3>
                <p style={{ 
                  color: '#a0a0a0', 
                  lineHeight: '1.6',
                  fontSize: '1.05rem'
                }}>
                  Friends get their own plots in your world. Build together and create a thriving developer community.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div style={{
              backgroundColor: '#1a2410',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #3D3527',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1.5rem',
              transform: isVisible.features ? 'translateX(0)' : 'translateX(-30px)',
              opacity: isVisible.features ? 1 : 0,
              transition: 'all 0.8s ease 0.3s'
            }}>
              <Landmark size={32} style={{ 
                color: '#C9A84C', 
                minWidth: '32px',
                marginTop: '0.5rem'
              }} />
              <div>
                <h3 className={fontMedieval.className} style={{
                  fontSize: '1.4rem',
                  color: '#C9A84C',
                  marginBottom: '0.75rem'
                }}>
                  Milestone Landmarks
                </h3>
                <p style={{ 
                  color: '#a0a0a0', 
                  lineHeight: '1.6',
                  fontSize: '1.05rem'
                }}>
                  Hit group coin goals to unlock the Park, Library, and Monument. Each landmark tells your story.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div style={{
              backgroundColor: '#1a2410',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #3D3527',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1.5rem',
              transform: isVisible.features ? 'translateX(0)' : 'translateX(30px)',
              opacity: isVisible.features ? 1 : 0,
              transition: 'all 0.8s ease 0.4s'
            }}>
              <Shield size={32} style={{ 
                color: '#C9A84C', 
                minWidth: '32px',
                marginTop: '0.5rem'
              }} />
              <div>
                <h3 className={fontMedieval.className} style={{
                  fontSize: '1.4rem',
                  color: '#C9A84C',
                  marginBottom: '0.75rem'
                }}>
                  Anti-Spam Economy
                </h3>
                <p style={{ 
                  color: '#a0a0a0', 
                  lineHeight: '1.6',
                  fontSize: '1.05rem'
                }}>
                  Only meaningful work counts. Quality over quantity—no commit farming, just genuine contributions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#080c08',
        padding: '3rem 2rem',
        textAlign: 'center',
        borderTop: '1px solid #3D3527'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 className={fontMedieval.className} style={{
            fontSize: '1.8rem',
            color: '#C9A84C',
            marginBottom: '1.5rem'
          }}>
            Guildscape — Build with Code
          </h3>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <a 
              href="https://github.com" 
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#C9A84C',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#e0d8c8'}
              onMouseLeave={(e) => e.target.style.color = '#C9A84C'}
            >
              <Github size={24} />
              GitHub
            </a>
          </div>
          
          <p style={{ 
            color: '#888', 
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            Made with 
            <Sword size={16} style={{ color: '#C9A84C' }} /> 
            and 
            <span style={{ color: '#C9A84C' }}>☕</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
