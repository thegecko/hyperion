import { Reader, Writer } from "protobufjs";
import { Client, Request, Response, MethodStream } from "../_proto/rpc";

export class WebsocketBridge {

    private logger = null; // console.log;
    private ws: WebSocket = null;
    private open: boolean = false;
    private queue: Uint8Array[] = [];

    private id = 0;
    private streams: { [key: number]: MethodStream<any, any> } = {};

    constructor(host: string = "ws://localhost:3000/ws?token=jwt-token") {
        this.ws = new (window as any).WebSocket(host);
        this.ws.binaryType = "arraybuffer";

        this.ws.addEventListener("open", () => {
            this.open = true;

            while (this.queue.length) {
                this.wsSend(this.queue.shift());
            }
        });

        this.ws.addEventListener("error", error => {
            this.log(error);
        });

        this.ws.addEventListener("message", event => {
            const bytes = new Uint8Array(event.data);
            const response = Response.decode(new Reader(bytes));
            this.log(response);

            // if (response.error) ...

            const stream = this.streams[response.id];
            if (stream) {
                if (response.end) {
                    stream.endStream(response.payload);
                    delete this.streams[response.id];
                } else {
                    stream.writeStream(response.payload);
                }
            }
        });
    }

    private log(data) {
        if (this.logger) this.logger(`WS Client: ${JSON.stringify(data, null, 2)}`);
    }

    private wsSend(data: Uint8Array): void {
        if (!this.open) {
            this.queue.push(data);
            return;
        }

        this.ws.send(data);
    }

    private rpcSend(request) {
        this.log(request);
        this.wsSend(Request.encode(new Writer(), request).finish());
    }

    public register(clients: Client[]) {
        clients.forEach(client => {
            client.rpcSender = (methodName, stream) => {
                this.send(client.name, methodName, stream);
            };
            client.readerFactory = (bytes: Uint8Array) => {
                return new Reader(bytes);
            };
            client.writerFactory = () => {
                return new Writer();
            };
        });
    }

    public send(serviceName: string, methodName: string, stream: MethodStream<any, any>) {
        this.id ++;
        this.streams[this.id] = stream;

        stream.on("dataStream", data => {
            this.rpcSend({
                id: this.id,
                service: serviceName,
                method: methodName,
                payload: data
            });
        });

        stream.on("endStream", data => {
            this.rpcSend({
                id: this.id,
                service: serviceName,
                method: methodName,
                payload: data,
                end: true
            });

            // add stream.off data and end
        });
    }
}
