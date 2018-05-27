import { ipcRenderer } from "electron";
import { RESPONSE_CHANNEL, REQUEST_CHANNEL } from "./";
import { Request, Response, MethodStream } from "../_proto/rpc";
import { Writer, Reader } from "protobufjs";

export class IpcBridge {

    private logger = null; // console.log;
    private id = 0;
    private streams: { [key: number]: MethodStream<any, any> } = {};

    constructor() {
        ipcRenderer.on(RESPONSE_CHANNEL, (_event, responseData: Uint8Array) => {
            const response = Response.decode(new Reader(responseData));

            // if (response.error) ...
            this.log(response);

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
        if (this.logger) this.logger(`IPC Client: ${JSON.stringify(data, null, 2)}`);
    }

    private rpcSend(request) {
        this.log(request);
        ipcRenderer.send(REQUEST_CHANNEL, Request.encode(new Writer(), request).finish());
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
