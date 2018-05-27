import { EventEmitter } from "events";
import { IncomingMessage } from "http";
import { parse } from "url";
import * as ws from "ws";

export class WSServer extends EventEmitter  {
    private wss: ws.Server = null;

    constructor(private path: string, options?: ws.ServerOptions) {
        super();
        options = options || {};
        if (!options.server) options.noServer = true;

        options.verifyClient = this.verifyClient.bind(this);

        this.wss = new ws.Server(options);

        this.wss.on("connection", (socket: WebSocket, request: any) => {
            this.emit("connection", socket, request);
        });

        this.wss.on("error", (socket, error) => {
            this.emit("error", socket, error);
        });
    }

    private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }, next: (res: boolean, code?: number, message?: string) => void) {
        const query = parse(info.req.url, true).query;
        if (query.token === "jwt-token") next(true);
    }

    public upgrade(request: IncomingMessage, socket: any, head: any) {
        if (parse(request.url).pathname === this.path) {
            this.wss.handleUpgrade(request, socket, head, websocket => {
                this.wss.emit("connection", websocket);
            });
        }
    }
}
