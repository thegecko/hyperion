
import { IpcBridge } from "./ipc-bridge";
import { WebsocketBridge } from "./websocket-bridge";
import { SystemService } from "../_proto/system";

export const systemService = new SystemService();

const rpcBridge = ((window as any).isElectron === true) ? new IpcBridge() : new WebsocketBridge();

rpcBridge.register([
    systemService
]);
