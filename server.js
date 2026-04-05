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
    secure: false, // Set to true with HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));
app.use(express.static(path.join(__dirname, "./frontend")));

// ==================== Helper Functions ====================

function generateUUID() {
  return crypto.randomUUID();
}

// ==================== Routes: HTML Pages ====================

// Landing page (home)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/home.html"));
});

// Login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/login.html"));
});

// Sign up page
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/signup.html"));
});

// Dashboard (authenticated home page)
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/dashboard.html"));
});

// Logout confirmation page
app.get("/logout", (req, res) => {
  res.sendFile(path.join(__dirname, "./frontend/logout.html"));
});

// ==================== Routes: API Endpoints ====================

// POST /signup - Create new user account
app.post("/signup", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required."
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address."
    });
  }

  try {
    const checkStmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const existingUser = checkStmt.get(email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already in use."
      });
    }

    const insertStmt = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    insertStmt.run(email, password);

    return res.status(201).json({
      success: true,
      message: "Account created successfully!"
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Database error during registration."
    });
  }
});

// POST /login - Authenticate user
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required."
    });
  }

  try {
    const stmt = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?");
    const user = stmt.get(email, password);

    if (!user) {
      const insertStmt = db.prepare("INSERT INTO login_attempts (email, success) VALUES (?, ?)");
      insertStmt.run(email, 0);

      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const successStmt = db.prepare("INSERT INTO login_attempts (email, success) VALUES (?, ?)");
    successStmt.run(email, 1);

    // Create session
    req.session.userId = user.id;
    req.session.userEmail = user.email;

    console.log("Login: Created session for user", user.id, user.email);

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Database error."
    });
  }
});

// POST /logout - End user session
app.post("/logout", (req, res) => {
  console.log("Logout: Destroying session for user", req.session?.userId);
  
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout: Error destroying session:", err);
      return res.status(500).json({
        success: false,
        message: "Error during logout."
      });
    }
    
    res.clearCookie('connect.sid'); // Clear session cookie
    return res.status(200).json({
      success: true,
      message: "Logged out successfully."
    });
  });
});

// GET /logins - Retrieve login history
app.get("/logins", (req, res) => {
  db.all(
    "SELECT * FROM login_attempts ORDER BY login_time DESC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Could not fetch login history."
        });
      }

      res.json({
        success: true,
        logins: rows
      });
    }
  );
});

// GET /api/health - Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running."
  });
});

// GET /api/models - Get available models from Ollama
app.get("/api/models", async (req, res) => {
  try {
    const ollamaResponse = await fetch("http://127.0.0.1:11434/api/tags");
    
    if (!ollamaResponse.ok) {
      return res.status(503).json({
        success: false,
        message: "Unable to connect to Ollama. Is it running?"
      });
    }
    
    const ollamaData = await ollamaResponse.json();
    const models = ollamaData.models || [];
    
    if (models.length === 0) {
      return res.status(503).json({
        success: false,
        message: "No models found in Ollama."
      });
    }
    
    res.json({
      success: true,
      models: models
    });
  } catch (error) {
    console.error("Models API error:", error.message);
    return res.status(503).json({
      success: false,
      message: "Could not connect to Ollama."
    });
  }
});

// ==================== LLM Chat Endpoint ====================

// POST /api/chat - Send prompt to Ollama and save conversation
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Messages array is required and must not be empty."
    });
  }

  try {
    // First, get available models to ensure we have at least one
    const modelsResponse = await fetch("http://127.0.0.1:11434/api/tags");
    
    if (!modelsResponse.ok) {
      return res.status(503).json({
        success: false,
        message: "Unable to connect to Ollama. Is it running?"
      });
    }
    
    const modelsData = await modelsResponse.json();
    const models = modelsData.models || [];
    
    if (models.length === 0) {
      return res.status(503).json({
        success: false,
        message: "No models found in Ollama."
      });
    }
    
    // Randomly select a model from available models
    const randomModel = models[Math.floor(Math.random() * models.length)].name;
    
    // Call Ollama chat endpoint with selected model
    const ollamaResponse = await fetch(`http://127.0.0.1:11434/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: randomModel,
        messages: messages,
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      const errorData = await ollamaResponse.json().catch(() => ({}));
      console.error("Ollama error:", errorData);
      return res.status(502).json({
        success: false,
        message: errorData.error || "Unable to reach the AI service."
      });
    }

    const ollamaData = await ollamaResponse.json();
    const reply = ollamaData.message?.content || "";

    if (!reply) {
      return res.status(502).json({
        success: false,
        message: "Ollama returned an empty response."
      });
    }

    // Save conversation to database (simplified: one conversation per session)
    // In production, you'd associate conversations with user_id and use activeId from frontend
    const conversationId = generateUUID();
    const now = new Date().toISOString();

    db.serialize(() => {
      // Create new conversation
      db.run(
        `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
         VALUES (?, 1, ?, ?, ?)`,
        [conversationId, "New Chat", now, now],
        (err) => {
          if (err) {
            console.warn("Failed to create conversation:", err.message);
          }

          // Save user message
          db.run(
            `INSERT INTO messages (conversation_id, role, content, created_at)
             VALUES (?, 'user', ?, ?)`,
            [conversationId, messages[messages.length - 1].content, now],
            (err) => {
              if (err) {
                console.warn("Failed to save user message:", err.message);
              }
            }
          );

          // Save assistant message
          db.run(
            `INSERT INTO messages (conversation_id, role, content, created_at)
             VALUES (?, 'assistant', ?, ?)`,
            [conversationId, reply, now],
            (err) => {
              if (err) {
                console.warn("Failed to save assistant message:", err.message);
              }
            }
          );
        }
      );
    });

    return res.status(200).json({
      success: true,
      reply: reply
    });
  } catch (error) {
    console.error("Chat API error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while calling AI service."
    });
  }
});

// ==================== Conversation Management API ====================

// GET /api/conversations - Get user's conversations
app.get("/api/conversations", (req, res) => {
  console.log("API: GET /api/conversations called");
  console.log("API: Session:", req.session);
  console.log("API: User ID:", req.session?.userId);
  
  if (!req.session || !req.session.userId) {
    console.log("API: Authentication required - no session or userId");
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
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

    console.log("API: Found conversations:", conversations.length, conversations);

    res.json({
      success: true,
      conversations: conversations
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching conversations."
    });
  }
});

// POST /api/conversations - Create new conversation
app.post("/api/conversations", (req, res) => {
  console.log("API: POST /api/conversations called");
  console.log("API: Session:", req.session);
  console.log("API: User ID:", req.session?.userId);
  console.log("API: Request body:", req.body);
  
  if (!req.session || !req.session.userId) {
    console.log("API: Authentication required - no session or userId");
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  const { id, title } = req.body;
  
  if (!id || !title) {
    console.log("API: Missing id or title");
    return res.status(400).json({
      success: false,
      message: "Conversation ID and title are required."
    });
  }

  try {
    const now = new Date().toISOString();
    
    console.log("API: Saving conversation:", { id, userId: req.session.userId, title });
    
    const stmt = db.prepare(`
      INSERT INTO conversations (id, user_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, req.session.userId, title, now, now);

    console.log("API: Conversation saved successfully");

    res.json({
      success: true,
      conversation: { id, title, created_at: now, updated_at: now }
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({
      success: false,
      message: "Error creating conversation."
    });
  }
});

// GET /api/conversations/:id/messages - Get messages for a conversation
app.get("/api/conversations/:id/messages", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  const conversationId = req.params.id;

  try {
    // Verify conversation belongs to user
    const conversationStmt = db.prepare(`
      SELECT id FROM conversations WHERE id = ? AND user_id = ?
    `);
    const conversation = conversationStmt.get(conversationId, req.session.userId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found."
      });
    }

    const messagesStmt = db.prepare(`
      SELECT id, role, content, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `);
    const messages = messagesStmt.all(conversationId);

    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching messages."
    });
  }
});

// POST /api/conversations/:id/messages - Add message to conversation
app.post("/api/conversations/:id/messages", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  const conversationId = req.params.id;
  const { role, content } = req.body;

  if (!role || !content) {
    return res.status(400).json({
      success: false,
      message: "Role and content are required."
    });
  }

  if (!['user', 'assistant'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be 'user' or 'assistant'."
    });
  }

  try {
    // Verify conversation belongs to user
    const conversationStmt = db.prepare(`
      SELECT id FROM conversations WHERE id = ? AND user_id = ?
    `);
    const conversation = conversationStmt.get(conversationId, req.session.userId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found."
      });
    }

    // Add message
    const insertStmt = db.prepare(`
      INSERT INTO messages (conversation_id, role, content)
      VALUES (?, ?, ?)
    `);
    const result = insertStmt.run(conversationId, role, content);

    // Update conversation timestamp
    const updateStmt = db.prepare(`
      UPDATE conversations 
      SET updated_at = ? 
      WHERE id = ?
    `);
    updateStmt.run(new Date().toISOString(), conversationId);

    res.json({
      success: true,
      message: {
        id: result.lastInsertRowid,
        conversation_id: conversationId,
        role: role,
        content: content,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json({
      success: false,
      message: "Error adding message."
    });
  }
});

// DELETE /api/conversations/:id - Delete conversation
app.delete("/api/conversations/:id", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  const conversationId = req.params.id;

  try {
    // Verify conversation belongs to user
    const conversationStmt = db.prepare(`
      SELECT id FROM conversations WHERE id = ? AND user_id = ?
    `);
    const conversation = conversationStmt.get(conversationId, req.session.userId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found."
      });
    }

    // Delete conversation (messages will be deleted via CASCADE)
    const deleteStmt = db.prepare(`DELETE FROM conversations WHERE id = ?`);
    deleteStmt.run(conversationId);

    res.json({
      success: true,
      message: "Conversation deleted successfully."
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting conversation."
    });
  }
});

// ==================== Server Initialization ====================

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
