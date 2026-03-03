/**
 * VoxPrompt AI - Preload Script (Context Bridge)
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('voxprompt', {
    // ── Renderer → Main (invoke) ──────────────────────────────────────────────
    injectText: (text: string) =>
        ipcRenderer.invoke('inject-text', text),

    optimizePrompt: (text: string) =>
        ipcRenderer.invoke('optimize-prompt', text),

    resizeWindow: (width: number, height: number) =>
        ipcRenderer.invoke('resize-window', { width, height }),

    hideWindow: () =>
        ipcRenderer.invoke('hide-window'),

    // ── Main → Renderer (push listeners) ─────────────────────────────────────
    onStartRecording: (callback: () => void) => {
        ipcRenderer.on('start-recording', callback);
        return () => ipcRenderer.removeListener('start-recording', callback);
    },

    onStopAndInject: (callback: () => void) => {
        ipcRenderer.on('stop-and-inject', callback);
        return () => ipcRenderer.removeListener('stop-and-inject', callback);
    },

    onOptimizeText: (callback: (_: any, text: string) => void) => {
        ipcRenderer.on('optimize-text', callback);
        return () => ipcRenderer.removeListener('optimize-text', callback);
    },
});
