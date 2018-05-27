
import { Reader, Writer } from "protobufjs";
import { Request, Response, Server, MethodStream } from "../_proto/rpc";

export class WebsocketHandler {

    private logger = null; // console.log;
    private services: { [key: string]: Server } = {};
    private streams: { [key: number]: MethodStream<any, any> } = {};

    constructor(private ws: WebSocket, services: Server[]) {
        services.forEach(service => {
            service.readerFactory = (bytes: Uint8Array) => {
                return new Reader(bytes);
            };
            service.writerFactory = () => {
                return new Writer();
            };

            this.services[service.name] = service;
        });

        this.ws.binaryType = "arraybuffer";
        this.ws.addEventListener("message", this.messageHandler.bind(this));
    }

    private log(data) {
        if (this.logger) this.logger(`WS Server: ${JSON.stringify(data, null, 2)}`);
    }

    private rpcSend(response) {
        this.log(response);
        this.ws.send(Response.encode(new Writer(), response).finish());
    }

    private messageHandler(event: MessageEvent) {
        const bytes = new Uint8Array(event.data);
        const request = Request.decode(new Reader(bytes));
        this.log(request);

        const method = request.method;
        const service = this.services[request.service];

        if (!service) {
            this.rpcSend({
                id: request.id,
                error: "Unknown service"
            });

            return;
        }

        let stream = this.streams[request.id];

        if (!stream) {
            stream = service.rpcHandler(method);
            this.streams[request.id] = stream;

            stream.on("dataStream", data => {
                this.rpcSend({
                    id: request.id,
                    payload: data
                });
            });

            stream.on("endStream", data => {
                this.rpcSend({
                    id: request.id,
                    payload: data,
                    end: true
                });

                // stream.off data and end
            });
        }

        if (request.end) {
            stream.endStream(request.payload);
            delete this.streams[request.id];
        } else {
            stream.writeStream(request.payload);
        }
    }
}
