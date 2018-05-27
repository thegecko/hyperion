import { SystemService, VersionResponse, EmptyRequest, TimeRequest, TimeResponse, WriteStream } from "../../_proto/system";

export class System extends SystemService {

    protected Version(_request: EmptyRequest, callback: (response?: Partial<VersionResponse>) => void): void {
        callback({
            version: "Server version 1.0"
        });
    }

    protected Time(request: TimeRequest, responseStream: WriteStream<Partial<TimeResponse>>): void {
        const count = request.count || 1;
        let index = 0;

        function respond() {
            index ++;

            if (index === count) {
                responseStream.end({
                    time: new Date().toString()
                });
            } else {
                responseStream.write({
                    time: new Date().toString()
                });

                setTimeout(respond, 500);
            }
        }

        respond();
    }
}
