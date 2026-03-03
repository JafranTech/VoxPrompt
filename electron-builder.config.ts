import { Configuration } from 'electron-builder';

const config: Configuration = {
    appId: "com.voxprompt.app",
    productName: "VoxPrompt AI",
    directories: {
        output: "release"
    },
    win: {
        target: "nsis"
    },
    mac: {
        target: "dmg"
    },
    linux: {
        target: "AppImage"
    }
};

export default config;
