/**
 * VoxPrompt AI - Floating Popup Component
 * Minimalist dark neon voice-to-prompt popup UI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { speechEngine } from '../../engines/speechEngine';

export function FloatingPopup() {
    const [isRecording, setIsRecording] = useState(false);
    const [language, setLanguage] = useState<'english' | 'tamil'>('english');
    const [transcript, setTranscript] = useState('');
    const [status, setStatus] = useState<'idle' | 'recording' | 'optimizing' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    // ─── IPC / Bridge ───────────────────────────────────────────────────────────
    const vox = (window as any).voxprompt as {
        injectText: (text: string) => Promise<void>;
        optimizePrompt: (text: string) => Promise<string>;
        hideWindow: () => Promise<void>;
        onStartRecording: (cb: () => void) => () => void;
        onStopAndInject: (cb: () => void) => () => void;
        onOptimizeText: (cb: (_: any, text: string) => void) => () => void;
    };

    // ─── Ref to keep transcript accessible inside callbacks without stale closure
    const transcriptRef = useRef(transcript);
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

    // ─── Accumulated transcript across all utterance segments ──────────────────
    const accumulatedRef = useRef('');

    // ─── Speech helpers ──────────────────────────────────────────────────────────
    const startRecording = useCallback(() => {
        // Guard: don't start if already running
        if (speechEngine.running) {
            console.log('[FloatingPopup] Already recording, ignoring start signal.');
            return;
        }

        const lang = language === 'tamil' ? 'ta-IN' : 'en-US';
        accumulatedRef.current = '';
        setTranscript('');
        setErrorMsg('');

        const ok = speechEngine.initialize(lang);
        if (!ok) {
            setStatus('error');
            setErrorMsg('Speech API not available in this environment.');
            return;
        }

        // ─── FIX: Accumulate both interim and final results ───────────────────────
        // Store final segments in accumulatedRef so switching to a final segment
        // doesn't wipe out what was already confirmed.
        let finalizedText = '';

        speechEngine.onResult((text, isFinal) => {
            if (isFinal) {
                finalizedText += text + ' ';
                accumulatedRef.current = finalizedText;
                setTranscript(finalizedText.trim());
            } else {
                // Show interim result appended to finalized
                setTranscript((finalizedText + text).trim());
            }
        });

        speechEngine.onEnd(() => {
            // SpeechEngine handles auto-restart internally.
            // This callback only fires on explicit stop().
            setIsRecording(false);
            setStatus('idle');
        });

        speechEngine.onError((err) => {
            if (err === 'not-allowed' || err === 'service-not-allowed') {
                setStatus('error');
                setErrorMsg('Microphone permission denied. Check Electron permissions.');
                setIsRecording(false);
            }
            // Other errors (network, aborted) are handled by auto-restart in engine
        });

        speechEngine.start();
        setIsRecording(true);
        setStatus('recording');
    }, [language]);

    const stopAndInject = useCallback(async () => {
        speechEngine.stop();
        setIsRecording(false);
        setStatus('idle');

        const text = accumulatedRef.current.trim() || transcriptRef.current.trim();
        if (text) {
            try {
                await vox.injectText(text);
                setTranscript('');
                accumulatedRef.current = '';
            } catch (e) {
                console.error('[FloatingPopup] Injection failed:', e);
            }
        }
    }, [vox]);

    // ─── IPC listeners from main process ────────────────────────────────────────
    useEffect(() => {
        if (!vox) return;

        const unsubRecord = vox.onStartRecording(() => startRecording());
        const unsubStop = vox.onStopAndInject(() => stopAndInject());
        const unsubOptimize = vox.onOptimizeText((_: any, text: string) => {
            setTranscript(text);
            setStatus('optimizing');
        });

        return () => {
            unsubRecord?.();
            unsubStop?.();
            unsubOptimize?.();
        };
        // Intentionally NOT including startRecording/stopAndInject in deps
        // to avoid re-registering listeners on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Render ──────────────────────────────────────────────────────────────────
    return (
        <div
            style={{
                width: '400px',
                height: '520px',
                background: 'linear-gradient(180deg, #222222 0%, #1A1A1A 100%)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif",
                boxSizing: 'border-box',
                userSelect: 'none',
            }}
        >
            {/* 1. Top Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px' }}>
                    VoxPrompt AI
                </span>
                <div
                    title={isRecording ? 'Recording active' : 'Idle'}
                    style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: status === 'error' ? '#FF4444' : isRecording ? '#89E900' : '#555555',
                        boxShadow: isRecording ? '0 0 6px #89E900' : 'none',
                        transition: 'background-color 0.3s, box-shadow 0.3s',
                    }}
                />
            </div>

            {/* 2. Language Selector */}
            <div style={{ marginBottom: '22px', textAlign: 'center' }}>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'english' | 'tamil')}
                    disabled={isRecording}
                    style={{
                        background: '#2A2A2A',
                        color: '#FFFFFF',
                        border: '1px solid #444444',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: isRecording ? 'not-allowed' : 'pointer',
                        outline: 'none',
                        width: '180px',
                        appearance: 'none',
                        opacity: isRecording ? 0.5 : 1,
                        textAlign: 'center',
                        transition: 'opacity 0.2s',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#89E900')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#444444')}
                >
                    <option value="english">English</option>
                    <option value="tamil">Tamil</option>
                </select>
            </div>

            {/* 3. Microphone Button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
                <button
                    id="mic-button"
                    onClick={isRecording ? stopAndInject : startRecording}
                    title={isRecording ? 'Stop & Inject' : 'Start Recording'}
                    style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: isRecording ? '#89E900' : '#333333',
                        boxShadow: isRecording
                            ? '0 0 20px rgba(137, 233, 0, 0.6), 0 0 40px rgba(137, 233, 0, 0.3)'
                            : '0 4px 12px rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.25s, box-shadow 0.25s',
                        outline: 'none',
                    }}
                >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill={isRecording ? '#1A1A1A' : '#89E900'}>
                        <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2z" />
                        <path d="M19 10a1 1 0 0 1 1 1 8 8 0 0 1-16 0 1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z" />
                        <path d="M12 19a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1z" />
                        <path d="M9 22a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2H9z" />
                    </svg>
                </button>
            </div>

            {/* Status label */}
            <div style={{ textAlign: 'center', marginBottom: '14px', height: '18px' }}>
                <span
                    style={{
                        color:
                            status === 'recording' ? '#89E900' :
                                status === 'optimizing' ? '#FFA500' :
                                    status === 'error' ? '#FF4444' : '#555555',
                        fontSize: '12px',
                        fontWeight: 500,
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                        transition: 'color 0.3s',
                    }}
                >
                    {status === 'recording' ? '● Recording' :
                        status === 'optimizing' ? '⚙ Optimizing...' :
                            status === 'error' ? `✕ ${errorMsg || 'Error'}` :
                                'Tap to Speak'}
                </span>
            </div>

            {/* 4. Transcription Area */}
            <textarea
                id="transcript-area"
                value={transcript}
                onChange={(e) => {
                    setTranscript(e.target.value);
                    accumulatedRef.current = e.target.value;
                }}
                placeholder="Your speech will appear here..."
                style={{
                    flex: 1,
                    backgroundColor: '#111111',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    resize: 'none',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
                    fontFamily: 'inherit',
                    marginBottom: '16px',
                }}
            />

            {/* 5. CTA Button */}
            <button
                id="convert-btn"
                onClick={async () => {
                    const text = transcript.trim();
                    if (!text) return;
                    setStatus('optimizing');
                    try {
                        const result = await vox.optimizePrompt(text);
                        if (result) {
                            setTranscript(result);
                            accumulatedRef.current = result;
                        }
                    } finally {
                        setStatus('idle');
                    }
                }}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(90deg, #89E900 0%, #6CC400 100%)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '15px',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                    transition: 'opacity 0.2s, transform 0.1s',
                    outline: 'none',
                    opacity: status === 'optimizing' ? 0.7 : 1,
                }}
                disabled={status === 'optimizing'}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            >
                {status === 'optimizing' ? 'Optimizing...' : 'Convert to Prompt'}
            </button>
        </div>
    );
}

export default FloatingPopup;
