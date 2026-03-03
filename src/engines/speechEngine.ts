/**
 * VoxPrompt AI - Speech Recognition Engine
 * Uses Web Speech API (requires secure context: served from localhost)
 */

export class SpeechEngine {
    private SpeechRecognitionClass: any = null;
    private recognition: any = null;

    private onResultCb: ((text: string, isFinal: boolean) => void) | null = null;
    private onEndCb: (() => void) | null = null;
    private onErrorCb: ((err: string) => void) | null = null;

    private _running = false;
    private _stopping = false;
    private _lang: 'en-US' | 'ta-IN' = 'en-US';
    private _restartTimer: ReturnType<typeof setTimeout> | null = null;

    initialize(language: 'en-US' | 'ta-IN'): boolean {
        const Ctor =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!Ctor) {
            console.error('[SpeechEngine] Web Speech API unavailable.');
            return false;
        }

        // Clean up any existing session first
        if (this._running) this._abort();

        this.SpeechRecognitionClass = Ctor;
        this._lang = language;
        return true;
    }

    private _buildInstance(): void {
        const rec = new this.SpeechRecognitionClass();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = this._lang;
        rec.maxAlternatives = 1;

        rec.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                const isFinal = event.results[i].isFinal;
                this.onResultCb?.(text, isFinal);
            }
        };

        rec.onerror = (event: any) => {
            const err: string = event.error;
            console.error('[SpeechEngine] Error:', err);
            this.onErrorCb?.(err);

            if (err === 'not-allowed' || err === 'service-not-allowed') {
                this._running = false;
                this._stopping = true;
                this.onEndCb?.();
            }
            // network / aborted → let onend handle restart
        };

        rec.onend = () => {
            if (this._restartTimer) {
                clearTimeout(this._restartTimer);
                this._restartTimer = null;
            }

            if (!this._running || this._stopping) {
                this.recognition = null;
                this.onEndCb?.();
                return;
            }

            // Unexpected end — rebuild fresh instance after 500ms device release
            console.log('[SpeechEngine] Unexpected end — rebuilding in 500ms...');
            this.recognition = null;

            this._restartTimer = setTimeout(() => {
                if (!this._running || this._stopping) return;
                this._buildInstance();
                try { this.recognition?.start(); } catch (_) { }
            }, 500);
        };

        this.recognition = rec;
    }

    start(): void {
        if (!this.SpeechRecognitionClass) {
            console.error('[SpeechEngine] Call initialize() first.');
            return;
        }
        this._stopping = false;
        this._running = true;
        this._buildInstance();
        try {
            this.recognition.start();
        } catch (e: any) {
            if (e.name !== 'InvalidStateError') console.error('[SpeechEngine] Start failed:', e);
        }
    }

    stop(): void {
        if (this._restartTimer) {
            clearTimeout(this._restartTimer);
            this._restartTimer = null;
        }
        this._stopping = true;
        this._running = false;
        this._abort();
        // Synchronously fire end callback (abort may not fire onend)
        setTimeout(() => this.onEndCb?.(), 0);
    }

    private _abort(): void {
        try { this.recognition?.abort(); } catch (_) { }
        this.recognition = null;
    }

    onResult(cb: (text: string, isFinal: boolean) => void) { this.onResultCb = cb; }
    onEnd(cb: () => void) { this.onEndCb = cb; }
    onError(cb: (err: string) => void) { this.onErrorCb = cb; }

    get running(): boolean { return this._running && !this._stopping; }
}

export const speechEngine = new SpeechEngine();
