/**
 * VoxPrompt AI - Main UI Component
 *
 * Dark neon floating popup — design spec from DESIGN.md:
 *   Background: linear-gradient(180deg, #222222 0%, #1A1A1A 100%)
 *   Accent: #89E900 (neon green)
 *   CTA: linear-gradient(90deg, #89E900 0%, #6CC400 100%)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { speechEngine } from '../../engines/speechEngine';
import { transliterateTamil } from '../../engines/tamilTranslit';

// ─── Typed bridge to window.voxprompt (set by preload) ───────────────────────
interface VoxBridge {
    injectText: (text: string) => Promise<void>;
    optimizePrompt: (text: string) => Promise<string>;
    hideWindow: () => Promise<void>;
    onStartRecording: (cb: () => void) => () => void;
    onStopAndInject: (cb: () => void) => () => void;
    onOptimizeText: (cb: (_e: any, t: string) => void) => () => void;
}

// Null-safe bridge: returns no-op stubs if preload hasn't loaded yet.
// This prevents silent React crashes during Electron renderer init.
const NO_OP_UNSUB = () => { };
const VOX_STUB: VoxBridge = {
    injectText: async () => { },
    optimizePrompt: async (t) => t,
    hideWindow: async () => { },
    onStartRecording: () => NO_OP_UNSUB,
    onStopAndInject: () => NO_OP_UNSUB,
    onOptimizeText: () => NO_OP_UNSUB,
};

const vox = (): VoxBridge => (window as any).voxprompt ?? VOX_STUB;

// ─── Types ────────────────────────────────────────────────────────────────────
type Lang = 'english' | 'tamil';
type Status = 'idle' | 'recording' | 'optimizing' | 'injecting' | 'error';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const noop = () => { };

export default function FloatingPopup() {
    const [lang, setLang] = useState<Lang>('english');
    const [transcript, setTranscript] = useState('');
    const [status, setStatus] = useState<Status>('idle');
    const [errMsg, setErrMsg] = useState('');
    const [waveScale, setWaveScale] = useState(1);

    // Keep transcript ref for stale-closure safety
    const transcriptRef = useRef('');
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

    // Accumulate finalized speech segments across utterance boundaries
    const finalizedRef = useRef('');

    // Wave animation while recording
    const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startWave = () => {
        waveRef.current = setInterval(() => {
            setWaveScale(0.85 + Math.random() * 0.3);
        }, 200);
    };
    const stopWave = () => {
        if (waveRef.current) { clearInterval(waveRef.current); waveRef.current = null; }
        setWaveScale(1);
    };

    // ─── startRecording ──────────────────────────────────────────────────────────
    const startRecording = useCallback(() => {
        if (speechEngine.running) return;

        finalizedRef.current = '';
        setTranscript('');
        setErrMsg('');

        const ok = speechEngine.initialize(lang === 'tamil' ? 'ta-IN' : 'en-US');
        if (!ok) {
            setStatus('error');
            setErrMsg('Speech API unavailable. Ensure app is served from localhost.');
            return;
        }

        let finalized = '';

        speechEngine.onResult((text, isFinal) => {
            // Apply Tamil transliteration if needed
            const processed = lang === 'tamil' ? transliterateTamil(text) : text;

            if (isFinal) {
                finalized += processed + ' ';
                finalizedRef.current = finalized;
                setTranscript(finalized.trim());
            } else {
                setTranscript((finalized + processed).trim());
            }
        });

        speechEngine.onEnd(() => {
            setStatus('idle');
            stopWave();
        });

        speechEngine.onError((err) => {
            if (err === 'not-allowed' || err === 'service-not-allowed') {
                setStatus('error');
                setErrMsg('Microphone access denied. Grant permission in OS settings.');
                stopWave();
            }
        });

        speechEngine.start();
        setStatus('recording');
        startWave();
    }, [lang]);

    // ─── stopAndInject ────────────────────────────────────────────────────────────
    const stopAndInject = useCallback(async () => {
        speechEngine.stop();
        stopWave();
        setStatus('injecting');

        const text = (finalizedRef.current || transcriptRef.current).trim();

        if (text) {
            try {
                await vox().injectText(text);
            } catch (e) {
                console.error('[FloatingPopup] Injection failed', e);
            }
        }

        // Reset for next use
        setTranscript('');
        finalizedRef.current = '';
        setStatus('idle');
        // Window is hidden by main on Ctrl+Shift+Space toggle
    }, []);

    // ─── IPC listeners ────────────────────────────────────────────────────────────
    useEffect(() => {
        const bridge = vox();
        const unsub1 = bridge.onStartRecording(() => startRecording());
        const unsub2 = bridge.onStopAndInject(() => stopAndInject());
        const unsub3 = bridge.onOptimizeText((_e, text) => {
            setTranscript(text);
            finalizedRef.current = text;
            setStatus('idle');
        });
        return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // mount once — startRecording/stopAndInject captured via refs below

    // ─── Colour helpers ───────────────────────────────────────────────────────────
    const isRecording = status === 'recording';
    const isOptimizing = status === 'optimizing';
    const isInjecting = status === 'injecting';
    const isError = status === 'error';

    const statusColor =
        isRecording ? '#89E900' :
            isOptimizing ? '#FFB800' :
                isInjecting ? '#00C8FF' :
                    isError ? '#FF4545' :
                        '#555';

    const statusLabel =
        isRecording ? '● RECORDING' :
            isOptimizing ? '⚙ OPTIMIZING…' :
                isInjecting ? '↗ INJECTING…' :
                    isError ? `✕ ${errMsg}` :
                        'TAP TO SPEAK';

    // ─── Render ───────────────────────────────────────────────────────────────────
    return (
        <div style={{
            width: '400px', height: '540px',
            background: 'linear-gradient(180deg, #242424 0%, #181818 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(137,233,0,0.08)',
            display: 'flex', flexDirection: 'column',
            padding: '22px 20px 18px',
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            boxSizing: 'border-box',
            userSelect: 'none',
            overflow: 'hidden',
            position: 'relative',
        }}>

            {/* Glow orb behind mic button */}
            {isRecording && (
                <div style={{
                    position: 'absolute', top: '170px', left: '50%',
                    transform: 'translateX(-50%)',
                    width: '120px', height: '120px',
                    background: 'radial-gradient(circle, rgba(137,233,0,0.18) 0%, transparent 70%)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    transition: 'transform 0.2s',
                    scale: String(waveScale),
                }} />
            )}

            {/* ── Top Bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: isError ? '#FF4545' : isRecording ? '#89E900' : '#444',
                        boxShadow: isRecording ? '0 0 8px #89E900, 0 0 18px rgba(137,233,0,0.5)' : 'none',
                        transition: 'all 0.3s',
                        animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    }} />
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', letterSpacing: '0.3px' }}>
                        VoxPrompt <span style={{ color: '#89E900' }}>AI</span>
                    </span>
                </div>
                <span style={{
                    fontSize: '10px', color: '#555', letterSpacing: '1.5px', textTransform: 'uppercase',
                    fontWeight: 500,
                }}>
                    v0.1
                </span>
            </div>

            {/* ── Language Selector ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {(['english', 'tamil'] as Lang[]).map((l) => (
                    <button
                        key={l}
                        disabled={isRecording}
                        onClick={() => setLang(l)}
                        style={{
                            flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
                            fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px',
                            cursor: isRecording ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            background: lang === l ? 'rgba(137,233,0,0.15)' : 'rgba(255,255,255,0.04)',
                            color: lang === l ? '#89E900' : '#666',
                            boxShadow: lang === l ? 'inset 0 0 0 1px rgba(137,233,0,0.4)' : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                        }}
                    >
                        {l === 'english' ? '🇺🇸 English' : '🇮🇳 Tamil'}
                    </button>
                ))}
            </div>

            {/* ── Mic Button ── */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <button
                    id="mic-btn"
                    onClick={isRecording ? stopAndInject : startRecording}
                    disabled={isOptimizing || isInjecting}
                    title={isRecording ? 'Stop & inject text' : 'Start voice recording'}
                    style={{
                        width: '84px', height: '84px', borderRadius: '50%',
                        border: isRecording ? '2px solid rgba(137,233,0,0.6)' : '2px solid rgba(255,255,255,0.08)',
                        cursor: (isOptimizing || isInjecting) ? 'not-allowed' : 'pointer',
                        background: isRecording
                            ? 'linear-gradient(135deg, #89E900, #6CC400)'
                            : 'linear-gradient(135deg, #2A2A2A, #1E1E1E)',
                        boxShadow: isRecording
                            ? `0 0 ${20 + waveScale * 15}px rgba(137,233,0,0.5), 0 8px 24px rgba(0,0,0,0.5)`
                            : '0 8px 24px rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.25s, box-shadow 0.2s, border-color 0.25s',
                        outline: 'none',
                        transform: `scale(${isRecording ? waveScale * 0.95 + 0.05 : 1})`,
                    }}
                >
                    {/* Mic SVG */}
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="2" width="6" height="11" rx="3"
                            fill={isRecording ? '#1A1A1A' : '#89E900'} />
                        <path d="M5 11a7 7 0 0014 0" stroke={isRecording ? '#1A1A1A' : '#89E900'}
                            strokeWidth="1.8" strokeLinecap="round" fill="none" />
                        <line x1="12" y1="18" x2="12" y2="22"
                            stroke={isRecording ? '#1A1A1A' : '#89E900'} strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="8" y1="22" x2="16" y2="22"
                            stroke={isRecording ? '#1A1A1A' : '#89E900'} strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            {/* ── Status Label ── */}
            <div style={{
                textAlign: 'center', marginBottom: '14px', height: '16px',
                fontSize: '11px', fontWeight: 600, letterSpacing: '1.8px',
                color: statusColor,
                transition: 'color 0.3s',
            }}>
                {statusLabel}
            </div>

            {/* ── Transcript Area ── */}
            <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => {
                    setTranscript(e.target.value);
                    finalizedRef.current = e.target.value;
                }}
                placeholder="Your speech will appear here…&#10;Start speaking after pressing the mic."
                style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    color: '#e8e8e8',
                    fontSize: '14px',
                    lineHeight: '1.7',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    marginBottom: '14px',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
                    transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(137,233,0,0.3)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
            />

            {/* ── Action Buttons ── */}
            <div style={{ display: 'flex', gap: '10px' }}>
                {/* Inject raw text */}
                <button
                    onClick={stopAndInject}
                    disabled={!transcript.trim() || status === 'injecting'}
                    style={btnStyle('ghost', !transcript.trim() || status === 'injecting')}
                    title="Stop recording and inject raw text into active app"
                >
                    ↗ Inject
                </button>

                {/* Convert to Prompt */}
                <button
                    id="convert-btn"
                    disabled={!transcript.trim() || isOptimizing}
                    onClick={async () => {
                        const text = transcriptRef.current.trim();
                        if (!text) return;
                        setStatus('optimizing');
                        try {
                            const result = await vox().optimizePrompt(text);
                            if (result) {
                                setTranscript(result);
                                finalizedRef.current = result;
                            }
                        } catch (e) {
                            console.error(e);
                        } finally {
                            setStatus('idle');
                        }
                    }}
                    style={btnStyle('primary', !transcript.trim() || isOptimizing)}
                >
                    {isOptimizing ? '⚙ Optimizing…' : '✦ Convert to Prompt'}
                </button>
            </div>

            {/* Pulse keyframe — injected as a style tag */}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
        </div>
    );
}

// ─── Button Style Helper ──────────────────────────────────────────────────────
function btnStyle(variant: 'primary' | 'ghost', disabled: boolean): React.CSSProperties {
    const base: React.CSSProperties = {
        flex: variant === 'primary' ? 2 : 1,
        padding: '12px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.18s',
        outline: 'none',
    };

    if (variant === 'primary') {
        return {
            ...base,
            background: 'linear-gradient(90deg, #89E900, #6CC400)',
            color: '#111',
            boxShadow: disabled ? 'none' : '0 4px 16px rgba(137,233,0,0.25)',
        };
    }

    return {
        ...base,
        background: 'rgba(255,255,255,0.06)',
        color: '#888',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.09)',
    };
}
