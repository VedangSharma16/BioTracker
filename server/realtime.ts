import type { Server } from "http";
import { WebSocketServer } from "ws";

type HealthEvent =
  | { type: "health-record-created"; patientId: number }
  | { type: "seed-complete" };

let wss: WebSocketServer | null = null;

export function setupRealtime(server: Server) {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({ server, path: "/ws" });
  return wss;
}

export function broadcastHealthEvent(event: HealthEvent) {
  if (!wss) {
    return;
  }

  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  });
}
