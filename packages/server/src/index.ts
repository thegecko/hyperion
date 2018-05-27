import { exec } from "child_process";
import * as express from "express";
import { join } from "path";
import { WSServer } from "./websocket";
import { WebsocketHandler, System } from "./services";

const port = "3000";
const app = express();
const wss = new WSServer("/ws");

wss.on("connection", (ws: WebSocket) => {
    // tslint:disable-next-line:no-unused-expression
    new WebsocketHandler(ws, [
        new System()
    ]);
});

// Load static SPA
if (process.env.NODE_ENV !== "development") {
    app.use(express.static(join(__dirname, "..", "app")));
}

const server = app.listen(port, () => {
    const url = `http://localhost:${port}`;
    // tslint:disable-next-line:no-console
    console.log(`Server listening at ${url}`);

    if (process.env.NODE_ENV !== "development") {
        let cmd = join(__dirname, "xdg-open");
        if (process.platform === "darwin") cmd = "open";
        else if (process.platform === "win32") cmd = `start ""`;

        exec(`${cmd} ${url}`);
    }
});

server.on("upgrade", wss.upgrade.bind(wss));
