//bring in all required packages previously installed from package.json
const { WebSocketServer } = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const app = express();

//setting up CORS for frontend communication
app.use(cors({ orign: true, credentials: true }));
app.use(express.json());

//login/signup routes
app.post('/login', (req, res) => {
  const { username } = req.body;
  // when we have a DB in the future
  if (!username) {
    return res.status(400).json({ err: 'username is required' });
  } else {
    res.status(200).json({ success: true, username });
  }
});

// websocket setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// store rooms details
const rooms = {};

//Web socket connection
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    const { type, roomLink, payload, username } = msg;

    switch (type) {
      case 'JOIN_ROOM':
        // If room does not exist yet, create the room
        if (!rooms[roomLink]) rooms[roomLink] = [];
        rooms[roomLink].push({ ws, username });
        //Notify all user in room
        broadcast(roomLink, { type: 'USER_JOINED', username });
        break;

      //Send messages
      case 'SEND_MESSAGE':
        broadcast(roomLink, { type: 'NEW_MESSAGE', username, payload });
        break;

      // video controls
      case 'VIDEO_CONTROL':
        broadcast(roomLink, { type: 'VIDEO_CONTROL', payload, username }, ws);
        break;
    }
  });

  ws.on('close', () => {
    //remove from ll rooms
    for (const roomLink in rooms) {
      rooms[roomLink] = rooms[roomLink].filter((user) => user.ws !== ws);

      // notify other users
      rooms[roomLink].forEach((user) =>
        user.ws.send(JSON.stringify({ type: 'USER_LEFT', username: 'A user' }))
      );
      if (rooms[roomLink].length === 0) delete rooms[roomLink];
    }
  });
});

// exclude the user who left
function broadcast(roomLink, message, excludeWs) {
  if (!rooms[roomLink]) return;

  rooms[roomLink].forEach((user) => {
    if (user.ws !== excludeWs && user.ws.readyState === 1)
      user.ws.send(JSON.stringify(message));
  });
}

server.listen(PORT, () => console.log(`Server running on ${PORT}`));
