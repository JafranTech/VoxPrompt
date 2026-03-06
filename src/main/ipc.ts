/**
 * VoxPrompt AI - IPC Handlers
 */

import { ipcMain, clipboard, BrowserWindow } from 'electron';
import { exec } from 'child_process';
import { optimizePrompt } from '../agents/promptOptimizer';
import { transcribeAudio } from '../agents/speechTranscriber';

export function setupIPC(mainWindow: BrowserWindow): void {

    // ── inject-text ─────────────────────────────────────────────────────────────
    // 1. Write text to clipboard
    // 2. Hide VoxPrompt so target app regains focus
    // 3. Simulate Ctrl+V via PowerShell SendKeys (zero native deps)
    ipcMain.handle('inject-text', async (_e, text: string) => {
        if (!text?.trim()) return;

        clipboard.writeText(text);

        // Hide all app windows so focus returns to previous application
        BrowserWindow.getAllWindows().forEach((w) => w.hide());

        // Wait for OS window manager to complete focus transfer
        await new Promise((r) => setTimeout(r, 350));

        return new Promise<boolean>((resolve, reject) => {
            exec(
                'powershell -NonInteractive -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^\'\' + \'v\')"',
                { timeout: 5000 },
                (err) => {
                    if (err) {
                        console.error('[IPC] inject-text SendKeys failed:', err.message);
                        // Fallback: clipboard is set — user can paste manually
                        reject(err);
                    } else {
                        resolve(true);
                    }
                }
            );
        });
    });

    // ── optimize-prompt ──────────────────────────────────────────────────────────
    ipcMain.handle('optimize-prompt', async (_e, rawText: string) => {
        if (!rawText?.trim()) return rawText;
        try {
            return await optimizePrompt(rawText);
        } catch (err) {
            console.error('[IPC] optimize-prompt error:', err);
            return rawText;
        }
    });

    // ── transcribe-audio ─────────────────────────────────────────────────────────
    ipcMain.handle('transcribe-audio', async (_e, base64Audio: string, mimeType: string) => {
        try {
            return await transcribeAudio(base64Audio, mimeType);
        } catch (err) {
            console.error('[IPC] transcribe-audio error:', err);
            throw err;
        }
    });

    // ── resize-window ────────────────────────────────────────────────────────────
    ipcMain.handle('resize-window', (_e, { width, height }: { width: number; height: number }) => {
        mainWindow.setSize(width, height);
    });

    // ── hide-window ──────────────────────────────────────────────────────────────
    ipcMain.handle('hide-window', () => {
        mainWindow.hide();
    });
}
