/**
 * VoxPrompt AI - Speech Recognition Engine
 *
 * IMPORTANT — Why we always BUILD A FRESH INSTANCE on restart (not reuse):
 * Chromium's Web Speech API maintains a Mojo DataPipe to stream audio chunks
 * to Google's speech servers. Calling recognition.stop() initiates an async
 * flush of remaining audio through this pipe. If recognition.start() is called
 * on the SAME instance before the flush completes, the new session grabs the
 * OS audio device — destroying the old Mojo pipe's producer handle mid-flush —
 * causing `chunked_data_pipe_upload_data_stream.cc Error: -2` (ERR_FAILED).
 *
 * Fix: use abort() (flushes nothing, closes pipe immediately), then null the
 * instance (allow GC to free C++ handles), wait 500ms for OS audio device
 * release, then create a brand new SpeechRecognition object.
 */

export class SpeechEngine {
    private Ctor: any = null;
    private rec: any = null;

    private onResultCb: ((text: string, isFinal: boolean) => void) | null = null;
    private onEndCb: (() => void) | null = null;
    private onErrorCb: ((err: string) => void) | null = null;

    private _active = false;   // we WANT audio running
    private _stopping = false;   // explicit stop requested
    private _lang: 'en-US' | 'ta-IN' = 'en-US';
    private _restartTmr: ReturnType<typeof setTimeout> | null = null;

    /** Must be called before start(). Safe to call again to change language. */
    initialize(language: 'en-US' | 'ta-IN'): boolean {
        const S = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!S) {
            console.error('[SpeechEngine] Web Speech API unavailable.');
            return false;
        }
        if (this._active) this._doAbort();
        this.Ctor = S;
        this._lang = language;
        return true;
    }

    // Build a fresh recognition instance — NEVER reuse a stopped one
    private _build(): void {
        const r = new this.Ctor();
        r.continuous = true;
        r.interimResults = true;
        r.lang = this._lang;
        r.maxAlternatives = 1;

        r.onresult = (e: any) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
                this.onResultCb?.(e.results[i][0].transcript, e.results[i].isFinal);
            }
        };

        r.onerror = (e: any) => {
            console.error('[SpeechEngine]', e.error);
            this.onErrorCb?.(e.error as string);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                this._active = false; this._stopping = true;
                this.onEndCb?.();
            }
            // other errors: let onend handle reconnect
        };

        r.onend = () => {
            if (this._restartTmr) { clearTimeout(this._restartTmr); this._restartTmr = null; }

            if (!this._active || this._stopping) {
                // Explicit stop — notify caller
                this.rec = null;
                this.onEndCb?.();
                return;
            }

            // Unexpected end (silence timeout / network blip) — auto-restart
            console.log('[SpeechEngine] Unexpected end, rebuilding in 500ms…');
            this.rec = null; // free GC so Mojo handles are released

            this._restartTmr = setTimeout(() => {
                if (!this._active || this._stopping) return;
                this._build();
                try { this.rec?.start(); } catch (_) { }
            }, 500); // ← 500ms = safe OS audio device release window
        };

        this.rec = r;
    }

    start(): void {
        if (!this.Ctor) { console.error('[SpeechEngine] Call initialize() first.'); return; }
        this._stopping = false;
        this._active = true;
        this._build();                        // fresh instance every time
        try { this.rec.start(); }
        catch (e: any) { if (e.name !== 'InvalidStateError') throw e; }
    }

    /**
     * Explicit stop — called when user presses mic or shortcut.
     * Uses abort() NOT stop() to prevent flushing remaining audio
     * through the Mojo DataPipe (which causes Error: -2 if a new
     * session has already started).
     */
    stop(): void {
        if (this._restartTmr) { clearTimeout(this._restartTmr); this._restartTmr = null; }
        this._stopping = true;
        this._active = false;
        this._doAbort();
        setTimeout(() => this.onEndCb?.(), 0); // synchronous notify
    }

    private _doAbort(): void {
        try { this.rec?.abort(); } catch (_) { }
        this.rec = null;
    }

    onResult(cb: (text: string, isFinal: boolean) => void) { this.onResultCb = cb; }
    onEnd(cb: () => void) { this.onEndCb = cb; }
    onError(cb: (err: string) => void) { this.onErrorCb = cb; }

    get running() { return this._active && !this._stopping; }
}

export const speechEngine = new SpeechEngine();
