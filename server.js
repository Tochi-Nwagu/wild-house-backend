import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ server });

const rooms = {};

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    const { type, partyCode, username, payload } = msg;

    switch (type) {
      // User joins a room
      case 'JOIN_ROOM':
        ws.username = username; // store name
        ws.partyCode = partyCode; // store room joined

        if (!rooms[partyCode]) rooms[partyCode] = [];

        rooms[partyCode].push(ws);

        console.log(`${username} joined ${partyCode}`);

        // notify everyone except the new user
        rooms[partyCode].forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: 'USER_JOINED',
                username,
              })
            );
          }
        });
        break;

      // Chat or sync message
      case 'SEND_MESSAGE':
        rooms[partyCode]?.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: 'NEW_MESSAGE',
                payload,
                username,
              })
            );
          }
        });
        break;

      default:
        console.log('Unknown type:', type);
    }
  });

  // User disconnects
  ws.on('close', () => {
    const partyCode = ws.partyCode;
    const username = ws.username;

    if (!partyCode || !rooms[partyCode]) return;

    rooms[partyCode] = rooms[partyCode].filter((client) => client !== ws);

    console.log(`${username} left ${partyCode}`);

    // Notify remaining users
    rooms[partyCode].forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'USER_LEFT',
            username,
          })
        );
      }
    });

    if (rooms[partyCode].length === 0) delete rooms[partyCode];
  });
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
