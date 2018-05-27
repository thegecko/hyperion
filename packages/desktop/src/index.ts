import { app, BrowserWindow } from "electron";
import { resolve } from "path";
import { IpcHandler, System } from "./services";

// tslint:disable-next-line:no-unused-expression
new IpcHandler([
    new System()
]);

let mainWindow = null;
const isDevEnv: boolean = process.env.NODE_ENV === "development";
const appURL = isDevEnv ? "http://localhost:3003" : `file://${resolve(__dirname, "..", "app", "index.html")}`;

app.on("ready", () => {
    mainWindow = new BrowserWindow({
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            preload: resolve(__dirname, "..", "dist", "./preload.js")
        },
        width: 800,
    });

    mainWindow.loadURL(appURL);
});
