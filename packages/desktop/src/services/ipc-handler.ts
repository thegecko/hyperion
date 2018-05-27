
import { ipcMain } from "electron";
import { Reader, Writer } from "protobufjs";
import { RESPONSE_CHANNEL, REQUEST_CHANNEL } from "./";
import { Request, Response, Server, MethodStream } from "../_proto/rpc";

export class IpcHandler {

    private logger = null; // console.log;
    private services: { [key: string]: Server } = {};
    private streams: { [key: number]: MethodStream<any, any> } = {};

    constructor(services: Server[]) {
        services.forEach(service => {
            service.readerFactory = (bytes: Uint8Array) => {
                return new Reader(bytes);
            };
            service.writerFactory = () => {
                return new Writer();
            };

            this.services[service.name] = service;
        });
        ipcMain.on(REQUEST_CHANNEL, this.messageHandler.bind(this));
    }

    private log(data) {
        if (this.logger) this.logger(`IPC Server: ${JSON.stringify(data, null, 2)}`);
    }

    private rpcSend(sender, response) {
        this.log(response);
        sender.send(RESPONSE_CHANNEL, Response.encode(new Writer(), response).finish());
    }

    private messageHandler(event, requestData: Uint8Array) {
        const request = Request.decode(new Reader(requestData));
        this.log(request);

        const method = request.method;
        const service = this.services[request.service];

        if (!service) {
            this.rpcSend(event.sender, {
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
                this.rpcSend(event.sender, {
                    id: request.id,
                    payload: data
                });
            });

            stream.on("endStream", data => {
                this.rpcSend(event.sender, {
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
