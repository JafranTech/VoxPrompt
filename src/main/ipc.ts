/**
 * VoxPrompt AI - IPC Handlers (Main Process)
 */

import { ipcMain, clipboard, BrowserWindow } from 'electron';
import { exec } from 'child_process';
import { optimizePrompt } from '../agents/promptOptimizer';

export function setupIPC(mainWindow: BrowserWindow) {

    // Handler 1: Inject text into the previously active window via PowerShell SendKeys
    ipcMain.handle('inject-text', async (_event, text: string) => {
        clipboard.writeText(text);

        // Hide VoxPrompt and wait for target app to regain focus
        BrowserWindow.getAllWindows().forEach((w) => w.hide());
        await new Promise((r) => setTimeout(r, 350));

        return new Promise((resolve, reject) => {
            exec(
                `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`,
                (error) => {
                    if (error) {
                        console.error('[IPC] inject-text failed:', error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                }
            );
        });
    });

    // Handler 2: Optimize raw text → structured LLM prompt via AI agent
    ipcMain.handle('optimize-prompt', async (_event, rawText: string) => {
        try {
            return await optimizePrompt(rawText);
        } catch (err) {
            console.error('[IPC] optimize-prompt error:', err);
            return rawText; // fallback: return original text
        }
    });

    // Handler 3: Resize window
    ipcMain.handle('resize-window', (_event, { width, height }: { width: number; height: number }) => {
        mainWindow.setSize(width, height);
    });

    // Handler 4: Hide window
    ipcMain.handle('hide-window', () => {
        mainWindow.hide();
    });
}
