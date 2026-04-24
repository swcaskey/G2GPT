// G2GPT Server - Express.js Application
// Main server file handling authentication, chat, and routing

const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const db = require("./database");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "g2gpt-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));
app.use(express.static(path.join(__dirname, "./frontend")));

// ==================== Helper Functions ====================

function generateUUID() {
  return crypto.randomUUID();
}

// ==================== Routes: HTML Pages ====================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/home.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/signup.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/dashboard.html"));
});

app.get("/logout", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/logout.html"));
});

// ==================== Routes: API Endpoints ====================

app.post("/signup", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid email address." });
  }

  try {
    const checkStmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const existingUser = checkStmt.get(email);

    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use." });
    }

    const insertStmt = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    insertStmt.run(email, password);

    return res.status(201).json({ success: true, message: "Account created successfully!" });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ success: false, message: "Database error during registration." });
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    const stmt = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?");
    const user = stmt.get(email, password);

    if (!user) {
      const insertStmt = db.prepare("INSERT INTO login_attempts (email, success) VALUES (?, ?)");
      insertStmt.run(email, 0);
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const successStmt = db.prepare("INSERT INTO login_attempts (email, success) VALUES (?, ?)");
    successStmt.run(email, 1);

    req.session.userId = user.id;
    req.session.userEmail = user.email;

    return res.status(200).json({ success: true, message: "Login successful!", user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Database error." });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Error during logout." });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: "Logged out successfully." });
  });
});

app.get("/logins", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM login_attempts ORDER BY login_time DESC");
    const rows = stmt.all();
    res.json({ success: true, logins: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not fetch login history." });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running." });
});

app.get("/api/models", async (req, res) => {
  try {
    const ollamaResponse = await fetch("http://127.0.0.1:11434/api/tags");
    if (!ollamaResponse.ok) {
      return res.status(503).json({ success: false, message: "Unable to connect to Ollama. Is it running?" });
    }
    const ollamaData = await ollamaResponse.json();
    const models = ollamaData.models || [];
    if (models.length === 0) {
      return res.status(503).json({ success: false, message: "No models found in Ollama." });
    }
    res.json({ success: true, models });
  } catch (error) {
    return res.status(503).json({ success: false, message: "Could not connect to Ollama." });
  }
});

// ==================== LLM Chat Endpoints ====================

// POST /api/chat - Send prompt to a single Ollama model
app.post("/api/chat", async (req, res) => {
  const { messages, model } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: "Messages array is required and must not be empty." });
  }

  try {
    const modelsResponse = await fetch("http://127.0.0.1:11434/api/tags");
    if (!modelsResponse.ok) {
      return res.status(503).json({ success: false, message: "Unable to connect to Ollama. Is it running?" });
    }

    const modelsData = await modelsResponse.json();
    const availableModels = modelsData.models || [];

    if (availableModels.length === 0) {
      return res.status(503).json({ success: false, message: "No models found in Ollama." });
    }

    const availableNames = availableModels.map(m => m.name);
    const selectedModel = (model && availableNames.includes(model)) ? model : availableNames[0];

    const ollamaResponse = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selectedModel, messages, stream: false })
    });

    if (!ollamaResponse.ok) {
      const errorData = await ollamaResponse.json().catch(() => ({}));
      return res.status(502).json({ success: false, message: errorData.error || "Unable to reach the AI service." });
    }

    const ollamaData = await ollamaResponse.json();
    const reply = ollamaData.message?.content || "";

    if (!reply) {
      return res.status(502).json({ success: false, message: "Ollama returned an empty response." });
    }

    try {
      const firstUser = db.prepare("SELECT id FROM users ORDER BY id LIMIT 1").get();
      const userId = firstUser ? firstUser.id : null;
      if (userId) {
        const conversationId = generateUUID();
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
          .run(conversationId, userId, "New Chat", now, now);
        db.prepare(`INSERT INTO messages (conversation_id, role, content, model_name, created_at) VALUES (?, ?, ?, ?, ?)`)
          .run(conversationId, 'user', messages[messages.length - 1].content, null, now);
        db.prepare(`INSERT INTO messages (conversation_id, role, content, model_name, created_at) VALUES (?, ?, ?, ?, ?)`)
          .run(conversationId, 'assistant', reply, selectedModel, now);
      }
    } catch (dbError) {
      console.warn("Database error while saving conversation:", dbError.message);
    }

    return res.status(200).json({ success: true, reply, model: selectedModel });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error while calling AI service." });
  }
});

// POST /api/chat/multi - Send prompt to multiple Ollama models simultaneously
app.post("/api/chat/multi", async (req, res) => {
  const { messages, models } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: "Messages array is required and must not be empty." });
  }

  if (!models || !Array.isArray(models) || models.length === 0) {
    return res.status(400).json({ success: false, message: "Models array is required and must not be empty." });
  }

  try {
    const queryModel = async (modelName) => {
      try {
        const ollamaResponse = await fetch("http://127.0.0.1:11434/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: modelName, messages, stream: false })
        });

        if (!ollamaResponse.ok) {
          const errorData = await ollamaResponse.json().catch(() => ({}));
          return { model: modelName, success: false, error: errorData.error || "Model query failed." };
        }

        const data = await ollamaResponse.json();
        const reply = data.message?.content || "";
        return { model: modelName, success: true, reply };
      } catch (err) {
        return { model: modelName, success: false, error: err.message };
      }
    };

    const results = await Promise.all(models.map(queryModel));

    try {
      if (req.session && req.session.userId) {
        const now = new Date().toISOString();
        const conversationId = generateUUID();
        db.prepare(`INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
          .run(conversationId, req.session.userId, "Multi-Model Chat", now, now);
        db.prepare(`INSERT INTO messages (conversation_id, role, content, model_name, created_at) VALUES (?, ?, ?, ?, ?)`)
          .run(conversationId, 'user', messages[messages.length - 1].content, null, now);
        for (const result of results) {
          if (result.success) {
            db.prepare(`INSERT INTO messages (conversation_id, role, content, model_name, created_at) VALUES (?, ?, ?, ?, ?)`)
              .run(conversationId, 'assistant', result.reply, result.model, now);
          }
        }
      }
    } catch (dbError) {
      console.warn("Database error during multi-chat save:", dbError.message);
    }

    return res.status(200).json({ success: true, results });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error during multi-model query." });
  }
});

// ==================== Conversation Management API ====================

app.get("/api/conversations", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  try {
    const stmt = db.prepare(`
      SELECT c.id, c.title, c.created_at, c.updated_at,
             COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.user_id = ?
      GROUP BY c.id, c.title, c.created_at, c.updated_at
      ORDER BY c.updated_at DESC
    `);
    const conversations = stmt.all(req.session.userId);
    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching conversations." });
  }
});

app.post("/api/conversations", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const { id, title } = req.body;
  if (!id || !title) {
    return res.status(400).json({ success: false, message: "Conversation ID and title are required." });
  }

  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(`INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`);
    stmt.run(id, req.session.userId, title, now, now);
    res.json({ success: true, conversation: { id, title, created_at: now, updated_at: now } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating conversation." });
  }
});

app.get("/api/conversations/:id/messages", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const conversationId = req.params.id;

  try {
    const conversationStmt = db.prepare(`SELECT id FROM conversations WHERE id = ? AND user_id = ?`);
    const conversation = conversationStmt.get(conversationId, req.session.userId);

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    const messagesStmt = db.prepare(`
      SELECT id, role, content, model_name, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `);
    const messages = messagesStmt.all(conversationId);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching messages." });
  }
});

app.post("/api/conversations/:id/messages", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const conversationId = req.params.id;
  const { role, content, model_name } = req.body;

  if (!role || !content) {
    return res.status(400).json({ success: false, message: "Role and content are required." });
  }

  if (!['user', 'assistant'].includes(role)) {
    return res.status(400).json({ success: false, message: "Role must be 'user' or 'assistant'." });
  }

  try {
    const conversationStmt = db.prepare(`SELECT id FROM conversations WHERE id = ? AND user_id = ?`);
    const conversation = conversationStmt.get(conversationId, req.session.userId);

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    const insertStmt = db.prepare(`INSERT INTO messages (conversation_id, role, content, model_name) VALUES (?, ?, ?, ?)`);
    const result = insertStmt.run(conversationId, role, content, model_name || null);

    const updateStmt = db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`);
    updateStmt.run(new Date().toISOString(), conversationId);

    res.json({
      success: true,
      message: {
        id: result.lastInsertRowid,
        conversation_id: conversationId,
        role,
        content,
        model_name: model_name || null,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding message." });
  }
});

app.delete("/api/conversations/:id", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const conversationId = req.params.id;

  try {
    const conversationStmt = db.prepare(`SELECT id FROM conversations WHERE id = ? AND user_id = ?`);
    const conversation = conversationStmt.get(conversationId, req.session.userId);

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    db.prepare(`DELETE FROM conversations WHERE id = ?`).run(conversationId);
    res.json({ success: true, message: "Conversation deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting conversation." });
  }
});

// ==================== Server Initialization ====================

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
