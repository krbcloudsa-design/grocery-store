import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ServerEvent, StockChange } from '../../shared/types.js';
import { inventory } from './inventory.js';

/**
 * Pushes inventory changes to every open storefront.
 *
 * Availability is never polled by the client: the ledger emits on every
 * mutation and each frame is fanned out here, so two browsers watching the same
 * product see it sell out at the same moment.
 */
export function attachRealtime(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket: WebSocket) => {
    const snapshot: ServerEvent = {
      type: 'stock:snapshot',
      stock: inventory.snapshot(),
      serverTime: Date.now(),
    };
    socket.send(JSON.stringify(snapshot));
    socket.on('error', () => socket.close());
  });

  const broadcast = (event: ServerEvent) => {
    const frame = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(frame);
    }
  };

  inventory.on('change', (changes: StockChange[], note: string) => {
    broadcast({ type: 'stock:changed', changes, note, serverTime: Date.now() });
  });

  return wss;
}
