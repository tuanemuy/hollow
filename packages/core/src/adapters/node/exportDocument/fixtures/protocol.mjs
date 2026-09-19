import { parentPort, workerData } from "node:worker_threads";

if (workerData.title === "hang") {
  setInterval(() => {}, 1000);
} else if (workerData.title === "invalid") {
  parentPort.postMessage({ ok: true, value: { maxBytes: 1 } });
} else if (workerData.title === "failure") {
  parentPort.postMessage({ ok: false, code: "provider-internal-detail" });
} else {
  parentPort.postMessage({
    ok: true,
    value: {
      profile: "hollow-export-document-v2",
      filename: "fixture.html",
      mime: "text/html; charset=utf-8",
      maxBytes: 7,
      segments: [{ kind: "text", value: "fixture" }],
      notices: [],
    },
  });
  setInterval(() => {}, 1000);
}
