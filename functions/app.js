const express = require("express");
const bodyParser = require("body-parser");
const serverless = require('serverless-http');
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
var cors = require("cors");
dotenv.config();

const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());

const port = process.env.PORT || 3000;
const secretKey = process.env.SECRET;

app.use(bodyParser.json());

const db = new sqlite3.Database("tasks.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      completed BOOLEAN
    )
  `);
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashedPassword],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "User registered successfully" });
    }
  );
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(401).json({ message: "Authentication failed" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Authentication failed" });
      }

      // Generate a JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        secretKey,
        { expiresIn: "1h" }
      );

      res.json({ token });
    }
  );
});

// Middleware
function verifyToken(req, res, next) {
  const token = req.headers["authorization"].split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "Token not provided" });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decoded;
    next();
  });
}

// Routes
app.post("/tasks", verifyToken, (req, res) => {
  const token = req.header("Authorization").split(" ")[1];
  const decodedToken = jwt.decode(token);

  if (!decodedToken) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const userId = decodedToken.id;
  const { title, description, completed } = req.body;
  const query =
    "INSERT INTO tasks (userId, title, description, completed) VALUES (?, ?, ?, ?)";
  db.run(query, [userId, title, description, completed], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID });
  });
});

// Get all tasks
app.get("/tasks", verifyToken, (req, res) => {
  const token = req.header("Authorization").split(" ")[1];
  const decodedToken = jwt.decode(token);

  if (!decodedToken) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const userId = decodedToken.id;
  console.log(decodedToken);

  db.all("SELECT * FROM tasks WHERE userId = ?", [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Update a task
app.put("/tasks/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const { title, description, completed } = req.body;
  const query =
    "UPDATE tasks SET title = ?, description = ?, completed = ? WHERE id = ?";
  db.run(query, [title, description, completed, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ changes: this.changes });
  });
});

// Delete a task
app.delete("/tasks/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM tasks WHERE id = ?";
  db.run(query, id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ deleted: this.changes });
  });
});

app.use('/.netlify/functions/app', router);
module.exports.handler = serverless(app);
