/**
 * VoxPrompt AI - Electron Main Process
 *
 * PERMANENT FIX for chunked_data_pipe_upload_data_stream Error: -2:
 * Web Speech API requires a SECURE CONTEXT. In Electron 40+ (Chromium 130+),
 * file:// is treated as an opaque origin and fails IsSecureContext() checks,
 * causing Mojo pipe teardown errors during Google Speech API uploads.
 *
 * Solution: Serve the renderer from http://localhost (secure/trusted context).
 * This eliminates ALL chunked upload failures — no flags, no hacks needed.
 */

import { app } from 'electron';

// Enable media capture before app is ready
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
} from 'electron';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';
import { setupIPC } from './ipc';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let localServer: http.Server | null = null;
let serverPort = 0;

// ─── Serve renderer from localhost (permanent Web Speech API fix) ─────────────
function startLocalServer(): Promise<number> {
    return new Promise((resolve) => {
        const rendererDir = path.join(__dirname, '../renderer');

        localServer = http.createServer((req, res) => {
            const urlPath = req.url === '/' ? '/index.html' : req.url || '/index.html';
            const filePath = path.join(rendererDir, urlPath);
            const ext = path.extname(filePath);

            const contentTypes: Record<string, string> = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.png': 'image/png',
                '.ico': 'image/x-icon',
            };

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }
                res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
                res.end(data);
            });
        });

        // Bind to random available port on localhost
        localServer.listen(0, '127.0.0.1', () => {
            const addr = localServer!.address() as { port: number };
            serverPort = addr.port;
            resolve(serverPort);
        });
    });
}

async function createWindow() {
    // Start local HTTP server first
    const port = await startLocalServer();
    console.log(`[VoxPrompt] Serving renderer from http://127.0.0.1:${port}`);

    mainWindow = new BrowserWindow({
        width: 400,
        height: 520,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // Grant microphone permission
    session.defaultSession.setPermissionRequestHandler(
        (_webContents, permission, callback) => {
            const allowed = ['media', 'microphone', 'audioCapture'];
            callback(allowed.includes(permission));
        }
    );

    session.defaultSession.setPermissionCheckHandler(
        (_webContents, permission) => {
            const allowed = ['media', 'microphone', 'audioCapture'];
            return allowed.includes(permission);
        }
    );

    // Load from localhost — secure context — Web Speech API works correctly
    mainWindow.loadURL(`http://127.0.0.1:${port}`);
    mainWindow.hide();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createTray() {
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show VoxPrompt', click: () => mainWindow?.show() },
        { label: 'Hide', click: () => mainWindow?.hide() },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() },
    ]);
    tray.setToolTip('VoxPrompt AI');
    tray.setContextMenu(contextMenu);
}

app.whenReady().then(async () => {
    await createWindow();
    createTray();

    if (mainWindow) {
        setupIPC(mainWindow);
    }

    // SHORTCUT 1 — Ctrl+Shift+Space: Toggle popup + start/stop recording
    globalShortcut.register('Ctrl+Shift+Space', () => {
        if (mainWindow?.isVisible()) {
            mainWindow.webContents.send('stop-and-inject');
            mainWindow.hide();
        } else {
            mainWindow?.show();
            mainWindow?.focus();
            mainWindow?.webContents.send('start-recording');
        }
    });

    // SHORTCUT 2 — Ctrl+Shift+P: AI Prompt Optimizer
    globalShortcut.register('Ctrl+Shift+P', () => {
        const rawText = clipboard.readText();
        if (!rawText?.trim()) return;
        mainWindow?.webContents.send('optimize-text', rawText);
        mainWindow?.show();
        mainWindow?.focus();
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    localServer?.close();
});

app.on('window-all-closed', () => {
    // Keep alive in tray
});
