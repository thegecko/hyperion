import { Reader, Writer } from "protobufjs";
import { Client } from "../_proto/rpc";

const bridge = (window as any).ipcBridge;

export class IpcBridge {

    public register(clients: Client[]) {
        clients.forEach(client => {
            client.rpcSender = (methodName, stream) => {
                bridge.send(client.name, methodName, stream);
            };
            client.readerFactory = (bytes: Uint8Array) => {
                return new Reader(bytes);
            };
            client.writerFactory = () => {
                return new Writer();
            };
        });
    }
}
