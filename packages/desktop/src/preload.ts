import { IpcBridge } from "./services";

// Disable eval
(window as any).eval = global.eval = () => {
    throw new Error("Sorry, this app does not support window.eval()");
};

// Electron flag
(window as any).isElectron = true;

// IPC bridge
(window as any).ipcBridge = new IpcBridge();
