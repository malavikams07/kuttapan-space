// server.js — Kuttappan's Space with custom users (Innu & Kuttu)

const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const session = require('express-session');
const bodyParser = require('body-parser');

const PORT = 3000;
const NOTE_FILE = path.join(__dirname, 'note.txt');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Your custom users ---
const USERS = {
  Innu: { password: "Innu123", display: "Innu" },
  Kuttu: { password: "Kuttu123", display: "Kuttu" }
};

// Sessions for login
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: "kuttappan-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// In-memory note content
let currentNote = "";

// Load saved note
if (fs.existsSync(NOTE_FILE)) {
  currentNote = fs.readFileSync(NOTE_FILE, "utf8");
  console.log("Loaded saved note.");
}

// Save to file
function saveNote(text) {
  fs.writeFileSync(NOTE_FILE, text, "utf8");
}

// Login route
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS[username];

  if (!user || user.password !== password) {
    return res.send("Invalid username or password.");
  }

  req.session.username = username;
  res.redirect("/note.html");
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// API for frontend
app.get("/api/whoami", (req, res) => {
  const username = req.session.username;
  if (!username) return res.json({ loggedIn: false });

  return res.json({
    loggedIn: true,
    username,
    display: USERS[username].display
  });
});

// Protect note page
app.get("/note.html", (req, res, next) => {
  if (!req.session.username) return res.redirect("/");
  next();
});

// WebSocket handling
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "note", content: currentNote }));

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "note") {
      currentNote = data.content;
      saveNote(currentNote);

      // Broadcast to all
      const payload = JSON.stringify({ type: "note", content: currentNote });
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(payload);
      });
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Kuttappan's Space running at http://localhost:${PORT}`);
  console.log(`WebSocket URL: ws://localhost:${PORT}`);
});
