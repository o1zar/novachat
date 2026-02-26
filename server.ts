import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const db = new Database('nova.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_developer BOOLEAN DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    receiver_id TEXT, -- NULL for global/group
    group_id TEXT,    -- NULL for global/direct
    content TEXT,
    type TEXT DEFAULT 'text',
    file_name TEXT,
    file_size INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_global BOOLEAN DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    avatar_url TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT,
    user_id TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS active_chats (
    user_id TEXT,
    chat_partner_id TEXT,
    PRIMARY KEY (user_id, chat_partner_id)
  );
`);

// Migration: Add new columns if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const columns = tableInfo.map(col => col.name);

if (!columns.includes('is_developer')) {
  db.exec("ALTER TABLE users ADD COLUMN is_developer BOOLEAN DEFAULT 0");
}
if (!columns.includes('display_name')) {
  db.exec("ALTER TABLE users ADD COLUMN display_name TEXT");
}
if (!columns.includes('avatar_url')) {
  db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT");
}
if (!columns.includes('bio')) {
  db.exec("ALTER TABLE users ADD COLUMN bio TEXT");
}

// Migration for messages table
const msgTableInfo = db.prepare("PRAGMA table_info(messages)").all() as any[];
const msgColumns = msgTableInfo.map(col => col.name);

if (!msgColumns.includes('type')) {
  db.exec("ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'");
}
if (!msgColumns.includes('file_name')) {
  db.exec("ALTER TABLE messages ADD COLUMN file_name TEXT");
}
if (!msgColumns.includes('file_size')) {
  db.exec("ALTER TABLE messages ADD COLUMN file_size INTEGER");
}
if (!msgColumns.includes('group_id')) {
  db.exec("ALTER TABLE messages ADD COLUMN group_id TEXT");
}

// Basic Encryption Logic (Base64 + simple shift for "basic" feel)
const encrypt = (text: string) => {
  return Buffer.from(text).toString('base64');
};

const decrypt = (encoded: string) => {
  try {
    return Buffer.from(encoded, 'base64').toString('utf-8');
  } catch (e) {
    return encoded;
  }
};

const app = express();
app.use(express.json());

// SSL Configuration for local hosting
const certPath = path.resolve('certs/fullchain.pem');
const keyPath = path.resolve('certs/privkey.pem');
let server: any;
let isHttps = false;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const options = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
  server = createHttpsServer(options, app);
  isHttps = true;
  console.log('[SYSTEM] SSL Certificates found. Starting in HTTPS mode.');
} else {
  server = createHttpServer(app);
  console.log('[SYSTEM] No SSL certificates found. Starting in HTTP mode.');
}

const wss = new WebSocketServer({ server });

// Store active connections: userId -> WebSocket
const clients = new Map<string, WebSocket>();

// --- Console Command Listener ---
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const input = data.toString().trim();
  if (input.startsWith('/dev ')) {
    const username = input.substring(5).trim().replace('@', '');
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as any;
    if (user) {
      db.prepare('UPDATE users SET is_developer = 1 WHERE id = ?').run(user.id);
      console.log(`[SYSTEM] User @${username} is now a Developer.`);
      
      // Notify the user if they are online
      const ws = clients.get(user.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'dev_status_updated', isDeveloper: true }));
      }
      
      // Broadcast to everyone to update their user lists
      const broadcast = JSON.stringify({ type: 'user_updated', userId: user.id, isDeveloper: true });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(broadcast);
      });
    } else {
      console.log(`[SYSTEM] User "${username}" not found.`);
    }
  }
});

// --- API Routes ---

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  try {
    const id = uuidv4();
    const stmt = db.prepare('INSERT INTO users (id, username, password, display_name) VALUES (?, ?, ?, ?)');
    stmt.run(id, username, password, username); // Default display_name to username
    res.json({ id, username, display_name: username, is_developer: 0 });
  } catch (err: any) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any;
  if (user) {
    res.json({ 
      id: user.id, 
      username: user.username, 
      display_name: user.display_name || user.username,
      avatar_url: user.avatar_url,
      bio: user.bio,
      is_developer: user.is_developer 
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/profile/update', (req, res) => {
  const { userId, display_name, avatar_url, bio } = req.body;
  try {
    db.prepare('UPDATE users SET display_name = ?, avatar_url = ?, bio = ? WHERE id = ?')
      .run(display_name, avatar_url, bio, userId);
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    res.json({ 
      id: user.id, 
      username: user.username, 
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      is_developer: user.is_developer 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, avatar_url, bio, is_developer FROM users').all() as any[];
  const usersWithStatus = users.map(u => ({
    ...u,
    is_online: clients.has(u.id)
  }));
  res.json(usersWithStatus);
});

app.get('/api/messages/global', (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.username as sender_name, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url, u.is_developer as sender_is_dev
    FROM messages m 
    JOIN users u ON m.sender_id = u.id 
    WHERE is_global = 1 
    ORDER BY timestamp ASC 
    LIMIT 100
  `).all() as any[];
  
  res.json(messages.map(m => ({ ...m, content: decrypt(m.content) })));
});

app.get('/api/messages/direct/:userId/:partnerId', (req, res) => {
  const { userId, partnerId } = req.params;
  const messages = db.prepare(`
    SELECT m.*, u.username as sender_name, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url, u.is_developer as sender_is_dev
    FROM messages m 
    JOIN users u ON m.sender_id = u.id 
    WHERE is_global = 0 AND group_id IS NULL
    AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
    ORDER BY timestamp ASC 
    LIMIT 100
  `).all(userId, partnerId, partnerId, userId) as any[];
  
  res.json(messages.map(m => ({ ...m, content: decrypt(m.content) })));
});

app.get('/api/messages/group/:groupId', (req, res) => {
  const { groupId } = req.params;
  const messages = db.prepare(`
    SELECT m.*, u.username as sender_name, u.display_name as sender_display_name, u.avatar_url as sender_avatar_url, u.is_developer as sender_is_dev
    FROM messages m 
    JOIN users u ON m.sender_id = u.id 
    WHERE group_id = ?
    ORDER BY timestamp ASC 
    LIMIT 100
  `).all(groupId) as any[];
  
  res.json(messages.map(m => ({ ...m, content: decrypt(m.content) })));
});

app.post('/api/groups', (req, res) => {
  const { name, description, avatar_url, userId } = req.body;
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO groups (id, name, description, avatar_url, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, description, avatar_url, userId);
    db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(id, userId);
    res.json({ id, name, description, avatar_url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.get('/api/groups/:userId', (req, res) => {
  const { userId } = req.params;
  const groups = db.prepare(`
    SELECT g.* FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ?
  `).all(userId);
  res.json(groups);
});

app.post('/api/groups/:groupId/join', (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  try {
    db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)').run(groupId, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join group' });
  }
});

app.get('/api/chats/:userId', (req, res) => {
  const { userId } = req.params;
  const chats = db.prepare(`
    SELECT DISTINCT u.id, u.username, u.display_name, u.avatar_url, u.is_developer
    FROM active_chats ac
    JOIN users u ON ac.chat_partner_id = u.id
    WHERE ac.user_id = ?
  `).all(userId);
  res.json(chats);
});

// --- WebSocket Logic ---

wss.on('connection', (ws) => {
  let currentUserId: string | null = null;

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'auth':
        currentUserId = message.userId;
        if (currentUserId) {
          clients.set(currentUserId, ws);
          console.log(`User connected: ${currentUserId}`);
          
          // Broadcast online status
          const onlineMsg = JSON.stringify({ type: 'user_presence', userId: currentUserId, status: 'online' });
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(onlineMsg);
          });
        }
        break;

      case 'global_message':
        if (!currentUserId) return;
        const globalMsgId = uuidv4();
        const encryptedGlobalContent = encrypt(message.content);
        db.prepare('INSERT INTO messages (id, sender_id, content, is_global, type, file_name, file_size) VALUES (?, ?, ?, 1, ?, ?, ?)')
          .run(globalMsgId, currentUserId, encryptedGlobalContent, message.msgType || 'text', message.fileName, message.fileSize);
        
        const sender = db.prepare('SELECT username, display_name, avatar_url, is_developer FROM users WHERE id = ?').get(currentUserId) as any;
        
        const broadcastMsg = JSON.stringify({
          type: 'new_global_message',
          message: {
            id: globalMsgId,
            sender_id: currentUserId,
            sender_name: sender.username,
            sender_display_name: sender.display_name,
            sender_avatar_url: sender.avatar_url,
            sender_is_dev: sender.is_developer,
            content: message.content, // Send decrypted to clients for immediate display
            type: message.msgType || 'text',
            file_name: message.fileName,
            file_size: message.fileSize,
            timestamp: new Date().toISOString(),
            is_global: true
          }
        });

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMsg);
          }
        });
        break;

      case 'direct_message':
        if (!currentUserId) return;
        const { receiverId, content, msgType, fileName, fileSize } = message;
        const directMsgId = uuidv4();
        const encryptedDirectContent = encrypt(content);
        
        // Save message
        db.prepare('INSERT INTO messages (id, sender_id, receiver_id, content, is_global, type, file_name, file_size) VALUES (?, ?, ?, ?, 0, ?, ?, ?)')
          .run(directMsgId, currentUserId, receiverId, encryptedDirectContent, msgType || 'text', fileName, fileSize);
        
        // Ensure both users have this in their active chats
        db.prepare('INSERT OR IGNORE INTO active_chats (user_id, chat_partner_id) VALUES (?, ?)').run(currentUserId, receiverId);
        db.prepare('INSERT OR IGNORE INTO active_chats (user_id, chat_partner_id) VALUES (?, ?)').run(receiverId, currentUserId);

        const directSender = db.prepare('SELECT username, display_name, avatar_url, is_developer FROM users WHERE id = ?').get(currentUserId) as any;
        
        const directPayload = JSON.stringify({
          type: 'new_direct_message',
          message: {
            id: directMsgId,
            sender_id: currentUserId,
            sender_name: directSender.username,
            sender_display_name: directSender.display_name,
            sender_avatar_url: directSender.avatar_url,
            sender_is_dev: directSender.is_developer,
            receiver_id: receiverId,
            content: content,
            type: msgType || 'text',
            file_name: fileName,
            file_size: fileSize,
            timestamp: new Date().toISOString(),
            is_global: false
          }
        });

        // Send to receiver if online
        const receiverWs = clients.get(receiverId);
        if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
          receiverWs.send(directPayload);
        }
        // Send back to sender for confirmation/sync
        ws.send(directPayload);
        break;

      case 'group_message':
        if (!currentUserId) return;
        const { groupId, content: gContent, msgType: gType, fileName: gFileName, fileSize: gFileSize } = message;
        const groupMsgId = uuidv4();
        const encryptedGroupContent = encrypt(gContent);
        
        db.prepare('INSERT INTO messages (id, sender_id, group_id, content, is_global, type, file_name, file_size) VALUES (?, ?, ?, ?, 0, ?, ?, ?)')
          .run(groupMsgId, currentUserId, groupId, encryptedGroupContent, gType || 'text', gFileName, gFileSize);
        
        const groupSender = db.prepare('SELECT username, display_name, avatar_url, is_developer FROM users WHERE id = ?').get(currentUserId) as any;
        const groupMembers = db.prepare('SELECT user_id FROM group_members WHERE group_id = ?').all(groupId) as any[];

        const groupPayload = JSON.stringify({
          type: 'new_group_message',
          message: {
            id: groupMsgId,
            sender_id: currentUserId,
            sender_name: groupSender.username,
            sender_display_name: groupSender.display_name,
            sender_avatar_url: groupSender.avatar_url,
            sender_is_dev: groupSender.is_developer,
            group_id: groupId,
            content: gContent,
            type: gType || 'text',
            file_name: gFileName,
            file_size: gFileSize,
            timestamp: new Date().toISOString(),
            is_global: false
          }
        });

        groupMembers.forEach(member => {
          const memberWs = clients.get(member.user_id);
          if (memberWs && memberWs.readyState === WebSocket.OPEN) {
            memberWs.send(groupPayload);
          }
        });
        break;

      case 'call_request':
      case 'call_response':
      case 'ice_candidate':
      case 'hangup':
        if (!currentUserId) return;
        const targetWs = clients.get(message.targetId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify({
            ...message,
            senderId: currentUserId
          }));
        }
        break;
    }
  });

  ws.on('close', () => {
    if (currentUserId) {
      clients.delete(currentUserId);
      console.log(`User disconnected: ${currentUserId}`);
      
      // Broadcast offline status
      const offlineMsg = JSON.stringify({ type: 'user_presence', userId: currentUserId, status: 'offline' });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(offlineMsg);
      });
    }
  });
});

// --- Vite Integration ---

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(8080, '0.0.0.0', () => {
    const protocol = isHttps ? 'https' : 'http';
    console.log(`Server running on ${protocol}://localhost:8080`);
  });
}

start();
