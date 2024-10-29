import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static('public'));

const clients = {};
const messagesFilePath = join(__dirname, 'messages.json');

let messages = [];
if (fs.existsSync(messagesFilePath)) {
  const data = fs.readFileSync(messagesFilePath, 'utf-8');
  messages = JSON.parse(data);
}

wss.on('connection', (ws) => {
  console.log('New client connected');

  messages.forEach(msg => {
    ws.send(JSON.stringify(msg));
  });

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'setUsername') {
      clients[ws] = data.username;
    } else if (data.type === 'message') {
      const username = clients[ws] || 'Anonymous';
      const timestamp = new Date().toISOString();
      const messageToSend = { username, msg: data.message, timestamp };
      console.log(`Received: ${JSON.stringify(messageToSend)}`);

      messages.push(messageToSend);

      fs.writeFileSync(messagesFilePath, JSON.stringify(messages, null, 2))

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          console.log(`Sending: ${JSON.stringify(messageToSend)} (${typeof messageToSend})`);
          client.send(JSON.stringify(messageToSend));
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    delete clients[ws];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
