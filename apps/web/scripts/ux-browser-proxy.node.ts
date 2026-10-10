import { createServer } from "node:http";

const args = process.argv.slice(2);
const port = args.length === 0 ? 0 : Number(args[1]);
if (
  (args.length !== 0 && (args.length !== 2 || args[0] !== "--port")) ||
  !Number.isInteger(port) ||
  port < 0 ||
  port > 65535
)
  throw new Error("Usage: ux-browser-proxy.node.ts [--port 0..65535]");
const server = createServer((_request, response) => {
  response.writeHead(403, { "Content-Length": "0", Connection: "close" });
  response.end();
});
server.on("connect", (_request, socket) => {
  socket.end(
    "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
  );
});
server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Loopback proxy address is unavailable");
  console.log(JSON.stringify({ pid: process.pid, port: address.port }));
});
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  server.close(() => {
    console.log("UX rejecting proxy closed");
  });
  server.closeAllConnections();
};
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
