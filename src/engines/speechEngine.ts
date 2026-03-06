/**
 * VoxPrompt AI - Audio Recording Engine (MediaRecorder)
 *
 * Captures microphone audio to a Blob to be sent to Gemini Audio API.
 */

export class SpeechEngine {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;

    private onEndCb: ((audioBlob: Blob, mimeType: string) => void) | null = null;
    private onErrorCb: ((err: string) => void) | null = null;

    private _active = false;

    async initialize(): Promise<boolean> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Release immediately, just checking permission
            stream.getTracks().forEach(t => t.stop());
            return true;
        } catch (err) {
            console.error('[SpeechEngine] Init error:', err);
            return false;
        }
    }

    async start(): Promise<void> {
        if (this._active) return;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const mime = this.mediaRecorder?.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mime });
                this.onEndCb?.(audioBlob, mime);

                if (this.stream) {
                    this.stream.getTracks().forEach(t => t.stop());
                    this.stream = null;
                }
            };

            this.mediaRecorder.onerror = (e: any) => {
                console.error('[SpeechEngine] Error:', e);
                this.onErrorCb?.(e.error?.message || 'Recording failed');
            };

            this.mediaRecorder.start();
            this._active = true;
        } catch (err: any) {
            console.error('[SpeechEngine] start error:', err);
            this.onErrorCb?.(err.message || 'Microphone access denied');
            this._active = false;
        }
    }

    stop(): void {
        if (!this._active || !this.mediaRecorder) return;
        this._active = false;

        try {
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
        } catch (err) {
            console.error('[SpeechEngine] stop error:', err);
        }
    }

    onEnd(cb: (audioBlob: Blob, mimeType: string) => void) { this.onEndCb = cb; }
    onError(cb: (err: string) => void) { this.onErrorCb = cb; }

    get running() { return this._active; }
}

export const speechEngine = new SpeechEngine();
