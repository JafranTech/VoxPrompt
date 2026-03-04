/**
 * VoxPrompt AI - Electron Main Process
 *
 * Architecture:
 * - Serves renderer from localhost HTTP server (REQUIRED for Web Speech API
 *   in Electron 40+ — file:// origin fails Chromium's IsSecureContext() check,
 *   causing chunked_data_pipe_upload Error: -2 on every speech upload)
 * - Global shortcuts for record/inject and optimize
 * - System tray background service
 * - IPC bridge between renderer ↔ main process
 */

import { app } from 'electron';

// Must be before app is ready
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('enable-speech-input');

import {
    BrowserWindow,
    globalShortcut,
    Tray,
    Menu,
    nativeImage,
    clipboard,
    session,
    ipcMain,
} from 'electron';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';
import { setupIPC } from './ipc';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let localServer: http.Server | null = null;

// ─── Localhost File Server ─────────────────────────────────────────────────────
// Serves dist/renderer/ from http://127.0.0.1:{port}
// This gives renderer a "secure context" so Web Speech API works correctly.
function startLocalServer(rendererDir: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const MIME: Record<string, string> = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.ico': 'image/x-icon',
            '.svg': 'image/svg+xml',
            '.woff2': 'font/woff2',
        };

        localServer = http.createServer((req, res) => {
            const urlPath = req.url === '/' ? '/index.html' : (req.url || '/index.html');
            const filePath = path.resolve(rendererDir, '.' + urlPath);
            const ext = path.extname(filePath).toLowerCase();

            // Safety: prevent directory traversal
            if (!filePath.startsWith(rendererDir)) {
                res.writeHead(403); res.end(); return;
            }

            fs.readFile(filePath, (err, data) => {
                if (err) { res.writeHead(404); res.end('Not found'); return; }
                res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
                res.end(data);
            });
        });

        localServer.on('error', reject);
        localServer.listen(0, '127.0.0.1', () => {
            const addr = localServer!.address() as { port: number };
            resolve(addr.port);
        });
    });
}

// ─── BrowserWindow ─────────────────────────────────────────────────────────────
async function createWindow(): Promise<void> {
    const rendererDir = path.join(__dirname, '../renderer');
    const port = await startLocalServer(rendererDir);

    console.log(`[VoxPrompt] Renderer served at http://127.0.0.1:${port}`);

    mainWindow = new BrowserWindow({
        width: 420,
        height: 580,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            // webSecurity must stay true for secure-context benefits to apply
        },
    });

    // Grant microphone permission
    session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
        cb(['media', 'microphone', 'audioCapture'].includes(permission));
    });
    session.defaultSession.setPermissionCheckHandler((_wc, permission) =>
        ['media', 'microphone', 'audioCapture'].includes(permission)
    );

    mainWindow.loadURL(`http://127.0.0.1:${port}`);

    mainWindow.on('closed', () => { mainWindow = null; });

    // Position window near bottom-right for Win+H parity
    const { screen } = require('electron');
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setPosition(sw - 440, sh - 600);
}

// ─── System Tray ───────────────────────────────────────────────────────────────
function createTray(): void {
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    tray.setToolTip('VoxPrompt AI — Press Ctrl+Shift+Space to start');
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Open VoxPrompt', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
        { label: 'Hide', click: () => mainWindow?.hide() },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() },
    ]));
    tray.on('click', () => {
        if (mainWindow?.isVisible()) mainWindow.hide();
        else { mainWindow?.show(); mainWindow?.focus(); }
    });
}

// ─── App Ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
    await createWindow();
    createTray();
    setupIPC(mainWindow!);

    // ── Ctrl+Shift+Space — Toggle popup + start/stop recording ─────────────────
    globalShortcut.register('Ctrl+Shift+Space', () => {
        if (!mainWindow) return;

        if (mainWindow.isVisible()) {
            mainWindow.webContents.send('stop-and-inject');
            // Window hide is handled by the renderer AFTER injection completes
        } else {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('start-recording');
        }
    });

    // ── Ctrl+Shift+P — AI Prompt Optimizer ────────────────────────────────────
    globalShortcut.register('Ctrl+Shift+P', () => {
        const text = clipboard.readText().trim();
        if (!text) return;
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('optimize-text', text);
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    localServer?.close();
});

app.on('window-all-closed', () => { /* keep alive in tray */ });
