import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";

const PORT = parseInt(process.env.PORT || "8766", 10);

interface ClientSession {
  ws: WebSocket;
  deviceId: string;
  publicKeyHex?: string;
  connectedAt: number;
}

export function createRelayServer() {
  const activeSessions = new Map<string, ClientSession>();
  const activeSockets = new Set<WebSocket>();
  let isMacLocked = false;
  let isPhonePaired = false;
  let pairedDeviceName = "Mobile Phone";

  const server = http.createServer((req, res) => {
    // Health check endpoint
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "healthy",
          uptimeSeconds: process.uptime(),
          connectedClients: activeSockets.size,
          isMacLocked,
          isPhonePaired,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    // Device discovery fallback directory (registered peer public keys)
    if (req.url === "/api/devices" && req.method === "GET") {
      const list = Array.from(activeSessions.values()).map((s) => ({
        deviceId: s.deviceId,
        publicKeyHex: s.publicKeyHex,
        connectedAt: s.connectedAt
      }));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ devices: list }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    activeSockets.add(ws);
    let authenticatedDeviceId: string = "client-" + Math.random().toString(36).slice(2, 9);

    // Send current ecosystem state immediately on connection
    ws.send(
      JSON.stringify({
        type: "relayed_envelope",
        payload: {
          action: "sync_state",
          isMacLocked,
          isPhonePaired,
          deviceName: pairedDeviceName
        }
      })
    );

    ws.on("message", (rawMessage: Buffer) => {
      try {
        const message = JSON.parse(rawMessage.toString("utf8"));

        switch (message.type) {
          case "register": {
            const { deviceId, publicKeyHex } = message;
            if (deviceId) {
              authenticatedDeviceId = deviceId;
            }
            activeSessions.set(authenticatedDeviceId, {
              ws,
              deviceId: authenticatedDeviceId,
              publicKeyHex,
              connectedAt: Date.now()
            });
            ws.send(JSON.stringify({ type: "registered", deviceId: authenticatedDeviceId, ok: true }));
            break;
          }

          case "broadcast": {
            const payload = message.payload || {};
            // Intercept lock/unlock actions to keep server state authoritative
            if (payload.action === "lock_mac") {
              isMacLocked = true;
            } else if (payload.action === "unlock_mac") {
              isMacLocked = false;
            } else if (payload.action === "phone_connected") {
              isPhonePaired = true;
              if (payload.deviceName) pairedDeviceName = payload.deviceName;
            }

            // Broadcast payload to all other connected sockets
            for (const socket of activeSockets) {
              if (socket !== ws && socket.readyState === WebSocket.OPEN) {
                socket.send(
                  JSON.stringify({
                    type: "relayed_envelope",
                    fromDeviceId: authenticatedDeviceId,
                    payload
                  })
                );
              }
            }
            break;
          }

          case "relay": {
            const { toDeviceId, payload } = message;
            const target = activeSessions.get(toDeviceId);
            if (target && target.ws.readyState === WebSocket.OPEN) {
              target.ws.send(
                JSON.stringify({
                  type: "relayed_envelope",
                  fromDeviceId: authenticatedDeviceId,
                  payload
                })
              );
            } else {
              // Fallback: broadcast if target session not strictly mapped
              for (const socket of activeSockets) {
                if (socket !== ws && socket.readyState === WebSocket.OPEN) {
                  socket.send(
                    JSON.stringify({
                      type: "relayed_envelope",
                      fromDeviceId: authenticatedDeviceId,
                      payload
                    })
                  );
                }
              }
            }
            break;
          }

          case "ping": {
            ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            break;
          }

          default:
            ws.send(JSON.stringify({ type: "error", error: `Unknown message type: ${message.type}` }));
        }
      } catch {
        ws.send(JSON.stringify({ type: "error", error: "Malformed JSON payload" }));
      }
    });

    ws.on("close", () => {
      activeSockets.delete(ws);
      activeSessions.delete(authenticatedDeviceId);
    });
  });

  return { server, wss, activeSessions };
}

const isDirectRun = process.argv[1]?.endsWith("dist/index.js");
if (isDirectRun && process.env.NODE_ENV !== "test") {
  const { server } = createRelayServer();
  server.listen(PORT, () => {
    console.log(`[Linkora Relay Server] Running on http://localhost:${PORT}`);
    console.log(`[Linkora Relay Server] WebSocket endpoint active at ws://localhost:${PORT}`);
  });
}
