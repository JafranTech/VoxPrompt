/**
 * VoxPrompt AI - Renderer App Root
 */

import React from 'react';
import FloatingPopup from './components/FloatingPopup';

export default function App() {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100vw',
                height: '100vh',
                backgroundColor: '#0D0D0D',
            }}
        >
            <FloatingPopup />
        </div>
    );
}
