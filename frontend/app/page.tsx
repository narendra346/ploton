'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface RenderResult {
  status: string;
  video_url: string;
  filename: string;
  file_size_mb: number;
  duration: number;
  width: number;
  height: number;
}

interface Asset {
  filename: string;
  url: string;
  type: 'video' | 'image' | 'audio';
}

interface RenderItem {
  filename: string;
  url: string;
  size_mb: number;
}

// Star field generator
function generateStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.3,
    opacity: Math.random() * 0.6 + 0.1,
    duration: Math.random() * 8 + 4,
    delay: Math.random() * 6,
  }));
}

const STARS = generateStars(120);

export default function Home() {
  const [tab, setTab] = useState<'code' | 'assets'>('code');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RenderResult | null>(null);
  const [error, setError] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [renders, setRenders] = useState<RenderItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clock tick for observatory feel
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const timeStr = now.toUTCString().slice(17, 25);
  const dateStr = now.toISOString().slice(0, 10);

  const getAssetType = (filename: string): 'video' | 'image' | 'audio' => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return 'video';
    if (['mp3', 'wav', 'aac'].includes(ext || '')) return 'audio';
    return 'image';
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      setAssets(prev => [{ filename: file.name, url: data.url, type: getAssetType(file.name) }, ...prev]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    for (const file of Array.from(e.dataTransfer.files)) await uploadFile(file);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    for (const file of Array.from(e.target.files || [])) await uploadFile(file);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRender = async () => {
    if (!code.trim()) { setError('No code loaded into system.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Render failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Render sequence failed');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/renders');
      const data = await res.json();
      setRenders(data.renders || []);
      setShowHistory(true);
    } catch { setError('Could not reach archive'); }
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#020408',
      color: '#E8EDF5',
      fontFamily: '"DM Mono", "Courier New", monospace',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Cormorant+Garamond:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a2030; border-radius: 2px; }

        @keyframes twinkle {
          0%, 100% { opacity: var(--base-opacity); }
          50% { opacity: calc(var(--base-opacity) * 0.2); }
        }

        @keyframes sweep {
          0% { transform: rotate(0deg); opacity: 0.4; }
          5% { opacity: 0.7; }
          100% { transform: rotate(360deg); opacity: 0.4; }
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.02); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .coord-label {
          font-size: 9px;
          color: #5a7aa0;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .render-btn:hover {
          background: #122038 !important;
          border-color: #5a80b0 !important;
        }

        .tab-btn:hover { color: #8aa8d0 !important; }

        textarea::placeholder { color: #3a5272; }
      `}</style>

      {/* Star field */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {STARS.map(star => (
          <div key={star.id} style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: '#E8EDF5',
            opacity: star.opacity,
            // @ts-ignore
            '--base-opacity': star.opacity,
            animation: `twinkle ${star.duration}s ${star.delay}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Scanline effect - very subtle */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      }} />

      {/* Observatory arc - top right decoration */}
      <div style={{
        position: 'fixed', top: -80, right: -80,
        width: 320, height: 320,
        borderRadius: '50%',
        border: '1px solid #2a5080',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', top: -120, right: -120,
        width: 420, height: 420,
        borderRadius: '50%',
        border: '1px solid #0d1e30',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {/* Header */}
        <header style={{
          padding: '14px 28px',
          borderBottom: '1px solid #2a5080',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(2,4,8,0.8)',
          backdropFilter: 'blur(12px)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Observatory circle logo */}
            <div style={{ position: 'relative', width: 28, height: 28 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '1px solid #2a4a7a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse-ring 4s ease-in-out infinite',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#7aabe8',
                  boxShadow: '0 0 8px #7aabe8',
                }} />
              </div>
              {/* Sweep line */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '50%', height: '1px',
                background: 'linear-gradient(to right, #7aabe8, transparent)',
                transformOrigin: 'left center',
                animation: 'sweep 8s linear infinite',
              }} />
            </div>

            <div>
              <div style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: 18,
                fontWeight: 400,
                letterSpacing: '0.25em',
                color: '#d8e8f8',
              }}>
                PLOTON
              </div>
              <div className="coord-label" style={{ marginTop: -1 }}>
                render observatory
              </div>
            </div>
          </div>

          {/* Header right — coordinates + time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ textAlign: 'right' }}>
              <div className="coord-label">UTC {timeStr}</div>
              <div className="coord-label">{dateStr}</div>
            </div>

            <div style={{ width: 1, height: 28, background: '#2a5080' }} />

            <button onClick={loadHistory} style={{
              background: 'transparent',
              border: '1px solid #2a5080',
              color: '#6a9ac8',
              padding: '5px 14px',
              cursor: 'pointer',
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}>
              Archive
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          padding: '0 28px',
          borderBottom: '1px solid #2a5080',
          gap: 2,
          background: 'rgba(2,4,8,0.6)',
        }}>
          {(['code', 'assets'] as const).map(t => (
            <button
              key={t}
              className="tab-btn"
              onClick={() => setTab(t)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t ? '1px solid #7aabe8' : '1px solid transparent',
                color: tab === t ? '#8ab0d8' : '#5a7aa0',
                padding: '10px 18px',
                cursor: 'pointer',
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
                marginBottom: -1,
                transition: 'all 0.2s',
              }}
            >
              {t === 'code' ? '// sequence' : '⊕ objects'}
            </button>
          ))}

          {/* Right side label */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <span className="coord-label">
              {loading ? (
                <span style={{ color: '#7aabe8', animation: 'blink 1s infinite' }}>● rendering</span>
              ) : result ? (
                <span style={{ color: '#2a6a4a' }}>● complete</span>
              ) : (
                <span>○ standby</span>
              )}
            </span>
          </div>
        </div>

        {/* Main grid */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          overflow: 'hidden',
        }}>

          {/* LEFT PANEL */}
          <div style={{
            borderRight: '1px solid #2a5080',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>

            {/* Coordinate label */}
            <div style={{
              padding: '8px 28px',
              borderBottom: '1px solid #0f1e30',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span className="coord-label">
                {tab === 'code' ? 'RA 00h 00m 00s' : 'DEC +00° 00\' 00"'}
              </span>
              {code && tab === 'code' && (
                <button onClick={() => setCode('')} style={{
                  background: 'transparent', border: 'none',
                  color: '#3a5272', cursor: 'pointer',
                  fontSize: 9, letterSpacing: '0.15em',
                  textTransform: 'uppercase', fontFamily: 'inherit',
                }}>
                  clear
                </button>
              )}
            </div>

            {/* CODE TAB */}
            {tab === 'code' && (
              <>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder={`// load TSX sequence\n// paste remotion component code here\n\n// example:\nimport React from 'react';\nimport { useCurrentFrame } from 'remotion';\n\nexport const compositionConfig = {\n  durationInSeconds: 6,\n  fps: 30,\n  width: 1080,\n  height: 1920,\n};\n\nconst MyVideo: React.FC = () => { ... };\nexport default MyVideo;`}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#8abae0',
                    fontFamily: '"DM Mono", monospace',
                    fontSize: 12,
                    lineHeight: 1.7,
                    padding: '20px 28px',
                    resize: 'none',
                    outline: 'none',
                  }}
                />

                {/* Render button */}
                <div style={{
                  padding: '16px 28px',
                  borderTop: '1px solid #0f1e30',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <button
                    className="render-btn"
                    onClick={handleRender}
                    disabled={loading || !code.trim()}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      background: loading ? 'transparent' : 'rgba(10,22,40,0.8)',
                      border: `1px solid ${loading ? '#3a5a7a' : '#2a5080'}`,
                      color: loading ? '#5a7aa0' : '#8abae8',
                      fontSize: 10,
                      letterSpacing: '0.25em',
                      textTransform: 'uppercase',
                      fontFamily: 'inherit',
                      cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {loading ? (
                      <span>
                        <span style={{ animation: 'blink 0.8s infinite' }}>▸</span>
                        {' '}initiating render sequence...
                      </span>
                    ) : '▸  initiate render sequence'}
                  </button>

                  {code && (
                    <div className="coord-label">
                      {code.length.toLocaleString()} chars
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ASSETS TAB */}
            {tab === 'assets' && (
              <>
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    margin: '16px 28px',
                    border: `1px dashed ${dragOver ? '#3a7ab8' : '#2a5080'}`,
                    padding: '28px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragOver ? 'rgba(10,30,60,0.3)' : 'transparent',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                >
                  <input ref={fileInputRef} type="file" multiple
                    accept="video/*,image/*,audio/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }} />

                  {/* Corner marks */}
                  {[['0','0','right','bottom'],['0','auto','right','top'],['auto','0','left','bottom'],['auto','auto','left','top']].map(([b,r,bl,tr], i) => (
                    <div key={i} style={{
                      position: 'absolute',
                      bottom: b === '0' ? 8 : 'auto',
                      right: r === '0' ? 8 : 'auto',
                      top: b === 'auto' ? 8 : 'auto',
                      left: r === 'auto' ? 8 : 'auto',
                      width: 12, height: 12,
                      borderBottom: b === '0' ? '1px solid #3a7ab8' : 'none',
                      borderRight: r === '0' ? '1px solid #3a7ab8' : 'none',
                      borderTop: b === 'auto' ? '1px solid #3a7ab8' : 'none',
                      borderLeft: r === 'auto' ? '1px solid #3a7ab8' : 'none',
                    }} />
                  ))}

                  {uploading ? (
                    <div style={{ color: '#6a9ac8', fontSize: 11, letterSpacing: '0.15em' }}>
                      <span style={{ animation: 'blink 0.8s infinite' }}>▸</span> uploading to orbit...
                    </div>
                  ) : (
                    <>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: '1px solid #3a7ab8',
                        margin: '0 auto 12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: '#5a7a9a',
                      }}>+</div>
                      <div className="coord-label">transmit objects</div>
                      <div style={{ fontSize: 9, color: '#2a5080', marginTop: 4, letterSpacing: '0.1em' }}>
                        video · image · audio
                      </div>
                    </>
                  )}
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '0 28px 16px' }}>
                  {assets.length === 0 ? (
                    <div className="coord-label" style={{ textAlign: 'center', marginTop: 12 }}>
                      no objects in orbit
                    </div>
                  ) : assets.map((asset, i) => (
                    <div key={i} style={{
                      borderBottom: '1px solid #0f1e30',
                      padding: '12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#8abae0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {asset.filename}
                        </div>
                        <div style={{ fontSize: 9, color: '#6a9ac8', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
                          {asset.url}
                        </div>
                      </div>
                      <button
                        onClick={() => copyUrl(asset.url)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${copied === asset.url ? '#1a3a2a' : '#2a5080'}`,
                          color: copied === asset.url ? '#2a8a5a' : '#5a7a9a',
                          padding: '4px 12px',
                          cursor: 'pointer',
                          fontSize: 9,
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          fontFamily: 'inherit',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                        }}
                      >
                        {copied === asset.url ? '✓ locked' : 'copy url'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* RIGHT PANEL - Output */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            <div style={{
              padding: '8px 28px',
              borderBottom: '1px solid #0f1e30',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span className="coord-label">output channel</span>
              {result && (
                <span className="coord-label" style={{ color: '#2a5a3a' }}>
                  {result.width}×{result.height} · {result.duration}s · {result.file_size_mb}mb
                </span>
              )}
            </div>

            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 28,
              overflow: 'auto',
            }}>

              {/* Loading */}
              {loading && (
                <div style={{ textAlign: 'center' }}>
                  {/* Observatory loader */}
                  <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 24px' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      border: '1px solid #2a5080',
                    }} />
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      width: 48, height: 48, borderRadius: '50%',
                      border: '1px solid #3a7ab8',
                    }} />
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      width: '50%', height: '1px',
                      background: 'linear-gradient(to right, #7aabe8, transparent)',
                      transformOrigin: 'left center',
                      animation: 'sweep 2s linear infinite',
                    }} />
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%,-50%)',
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#7aabe8',
                    }} />
                  </div>
                  <div className="coord-label" style={{ marginBottom: 6 }}>rendering frames</div>
                  <div style={{ fontSize: 9, color: '#2a5080', letterSpacing: '0.1em' }}>
                    this may take 1-2 minutes
                  </div>
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div style={{
                  border: '1px solid #2a1010',
                  padding: '16px 20px',
                  width: '100%',
                  maxWidth: 500,
                  background: 'rgba(20,5,5,0.5)',
                }}>
                  <div style={{ fontSize: 9, color: '#6a2a2a', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
                    ✕ sequence failed
                  </div>
                  <pre style={{
                    color: '#4a1a1a', fontSize: 10, whiteSpace: 'pre-wrap',
                    maxHeight: 260, overflow: 'auto', lineHeight: 1.6,
                    fontFamily: 'inherit',
                  }}>
                    {error}
                  </pre>
                </div>
              )}

              {/* Success */}
              {result && !loading && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    position: 'relative',
                    border: '1px solid #2a5080',
                  }}>
                    {/* Corner marks on video */}
                    {['tl','tr','bl','br'].map(pos => (
                      <div key={pos} style={{
                        position: 'absolute',
                        top: pos.startsWith('t') ? -1 : 'auto',
                        bottom: pos.startsWith('b') ? -1 : 'auto',
                        left: pos.endsWith('l') ? -1 : 'auto',
                        right: pos.endsWith('r') ? -1 : 'auto',
                        width: 12, height: 12,
                        borderTop: pos.startsWith('t') ? '1px solid #3a7ab8' : 'none',
                        borderBottom: pos.startsWith('b') ? '1px solid #3a7ab8' : 'none',
                        borderLeft: pos.endsWith('l') ? '1px solid #3a7ab8' : 'none',
                        borderRight: pos.endsWith('r') ? '1px solid #3a7ab8' : 'none',
                        zIndex: 1,
                      }} />
                    ))}
                    <video
                      src={result.video_url}
                      controls
                      style={{
                        maxWidth: '100%',
                        maxHeight: '52vh',
                        display: 'block',
                      }}
                    />
                  </div>

                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = result.video_url;
                      a.download = result.filename;
                      a.click();
                    }}
                    style={{
                      padding: '9px 28px',
                      background: 'transparent',
                      border: '1px solid #3a7ab8',
                      color: '#7aabe8',
                      cursor: 'pointer',
                      fontSize: 10,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  >
                    ↓ extract mp4
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && !result && (
                <div style={{ textAlign: 'center' }}>
                  {/* Empty observatory diagram */}
                  <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', border: '1px solid #1a3050' }} />
                    <div style={{ position: 'absolute', top: 12, left: 12, width: 56, height: 56, borderRadius: '50%', border: '1px solid #162840' }} />
                    <div style={{ position: 'absolute', top: 24, left: 24, width: 32, height: 32, borderRadius: '50%', border: '1px solid #122030' }} />
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#162840' }} />
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#162840' }} />
                  </div>
                  <div className="coord-label">awaiting sequence</div>
                  <div style={{ fontSize: 9, color: '#080f18', marginTop: 6, letterSpacing: '0.1em' }}>
                    load tsx code to begin
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 28px',
          borderTop: '1px solid #2a5080',
          display: 'flex',
          justifyContent: 'space-between',
          background: 'rgba(2,4,8,0.8)',
        }}>
          <span className="coord-label">ploton · local render observatory · v1.0</span>
          <span className="coord-label">remotion · fastapi · next.js</span>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,2,6,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            style={{
              background: '#020408',
              border: '1px solid #2a5080',
              padding: 28,
              width: 480,
              maxHeight: '70vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Corner marks */}
            {['tl','tr','bl','br'].map(pos => (
              <div key={pos} style={{
                position: 'absolute',
                top: pos.startsWith('t') ? 8 : 'auto',
                bottom: pos.startsWith('b') ? 8 : 'auto',
                left: pos.endsWith('l') ? 8 : 'auto',
                right: pos.endsWith('r') ? 8 : 'auto',
                width: 10, height: 10,
                borderTop: pos.startsWith('t') ? '1px solid #3a7ab8' : 'none',
                borderBottom: pos.startsWith('b') ? '1px solid #3a7ab8' : 'none',
                borderLeft: pos.endsWith('l') ? '1px solid #3a7ab8' : 'none',
                borderRight: pos.endsWith('r') ? '1px solid #3a7ab8' : 'none',
              }} />
            ))}

            <div className="coord-label" style={{ marginBottom: 20, color: '#6a9ac8' }}>
              render archive
            </div>

            {renders.length === 0 ? (
              <div className="coord-label">no records found</div>
            ) : renders.map((r, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid #0f1e30',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: '#7aabe8' }}>{r.filename}</div>
                  <div style={{ fontSize: 9, color: '#6a9ac8', marginTop: 3 }}>{r.size_mb} mb</div>
                </div>
                <a href={r.url} download={r.filename} style={{
                  color: '#2a5a7a', textDecoration: 'none',
                  border: '1px solid #2a5080',
                  padding: '4px 12px',
                  fontSize: 9, letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}>↓ extract</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}