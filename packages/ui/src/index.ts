import { systemService } from "./services/index";

function output(message) {
    document.getElementById("output").innerText += `${message}\n`;
}

systemService.Version(null, response => output(response.version));

const responseStream = systemService.Time({
    count: 5
});

responseStream.on("data", event => output(event.time));
responseStream.on("end", event => {
    output(event.time);
    output("Finished");
});
