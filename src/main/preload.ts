/**
 * VoxPrompt AI - Preload Bridge
 * Exposes a safe, typed API from main process to renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('voxprompt', {
    // ── Renderer → Main (request/response) ───────────────────────────────────
    injectText: (text: string) => ipcRenderer.invoke('inject-text', text),
    optimizePrompt: (text: string) => ipcRenderer.invoke('optimize-prompt', text),
    resizeWindow: (w: number, h: number) => ipcRenderer.invoke('resize-window', { width: w, height: h }),
    hideWindow: () => ipcRenderer.invoke('hide-window'),

    // ── Main → Renderer (push events, returns unsubscribe fn) ────────────────
    onStartRecording: (cb: () => void) => {
        ipcRenderer.on('start-recording', cb);
        return () => ipcRenderer.removeListener('start-recording', cb);
    },
    onStopAndInject: (cb: () => void) => {
        ipcRenderer.on('stop-and-inject', cb);
        return () => ipcRenderer.removeListener('stop-and-inject', cb);
    },
    onOptimizeText: (cb: (_e: any, text: string) => void) => {
        ipcRenderer.on('optimize-text', cb);
        return () => ipcRenderer.removeListener('optimize-text', cb);
    },
});
