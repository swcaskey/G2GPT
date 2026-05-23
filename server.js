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
app.use(session({ // Configure session management with secure cookie settings and a secret key (note: in production, use a secure, environment variable for the secret)
  secret: "g2gpt-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: { // In production, set secure: true and ensure your site is served over HTTPS to protect session cookies. For local testing, secure can be false.
    secure: false, // Set to true with HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));
app.use(express.static(path.join(__dirname, "./frontend")));

// Helper Functions:
function generateUUID() {
  return crypto.randomUUID();
}

function buildFallbackReply(model, prompt) { // can customize responses based on model and prompt for more realistic testing
  console.log("USING SERVER FALLBACK:", model, prompt);
  const lower = prompt.toLowerCase();
// --- SIMPLE MATH HANDLER ---
  const mathCheck = prompt.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/x])\s*(-?\d+(?:\.\d+)?)/i);

  if (mathCheck) {
    const a = Number(mathCheck[1]);
    const operator = mathCheck[2].toLowerCase();
    const b = Number(mathCheck[3]);

    let result;

    if (operator === "+") result = a + b; //  addition
    else if (operator === "-") result = a - b; // subtraction
    else if (operator === "*" || operator === "x") result = a * b; // multiplication
    else if (operator === "/") result = b === 0 ? "undefined because division by zero is not allowed" : a / b; // division with zero check

  if (model === "llama3.2") { // different response styles based on model for testing purposes
    console.log("MATH HIT llama3.2:", result);
    return `The answer is ${result}.`;
  }

  if (model === "qwen2.5:0.5b") { // Qwen2.5:0.5b provides a step-by-step explanation along with the final answer for math questions
    console.log("MATH HIT qwen:", result);
    return `Let's calculate it step by step: ${a} ${operator} ${b} = ${result}.`;
  }

  if (model === "phi3") { // Phi3 gives a concise answer with a brief explanation of the operation performed for math questions
    console.log("MATH HIT phi3:", result);
    return `Answer: ${result}.`;
  }

    return `${result}`;
  }

  const styles = { // different response styles based on model for testing purposes
    "llama3.2": "Direct answer",
    "qwen2.5:0.5b": "Detailed explanation",
    "phi3": "Short practical answer"
  };

  const style = styles[model] || "Response"; // Default style if model is unrecognized

  // Weather questions
  if (lower.includes("weather") || lower.includes("temperature") || lower.includes("forecast")) {
    if (model === "llama3.2") {
      return `${style}: I cannot access live weather data in this demo, but I would normally provide the current conditions, temperature, and forecast for the requested location.`;
    }
    if (model === "qwen2.5:0.5b") {
      return `${style}: For a weather question, I would check the location, current temperature, chance of rain, wind conditions, and short-term forecast. Since this is a fallback response, I cannot retrieve live data, but I can still explain what weather information would be useful.`;
    }
    return `${style}: I cannot fetch live weather right now, but I would summarize temperature, conditions, and forecast.`;
  }

  // Rome / factual example
  if (lower.includes("rome")) { // If the prompt is about the fall of Rome, return a direct and concise historical explanation based on the model's style
    if (model === "llama3.2") {
      return `${style}: The fall of Rome was mainly caused by political instability, economic problems, military weakness, and invasions.`;
    }
    if (model === "qwen2.5:0.5b") { // For a historical question about the fall of Rome, Qwen2.5:0.5b provides a more detailed explanation that covers multiple factors and their interplay, reflecting its style of being more conversational and detailed in its interactions
      return `${style}: Rome fell because several pressures built up over time, including unstable leadership, economic strain, military issues, administrative division, and repeated invasions.`;
    }
    return `${style}: Rome declined because its government, economy, army, and borders weakened over time.`;
  }

  // Greeting
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("how are you")) {
    if (model === "llama3.2") { // Llama3.2 gives a direct and clear response that acknowledges the user's greeting and indicates readiness to assist, reflecting its style of being straightforward and helpful
      return `${style}: Hello! I am ready to help with your question.`;
    }
    if (model === "qwen2.5:0.5b") { // Qwen2.5:0.5b responds to greetings with a friendly and engaging tone, reflecting its style of being more conversational and detailed in its interactions
      return `${style}: Hi! I can help you work through your question step by step.`;
    }
    return `${style}: Hey! Send me what you want help with.`;
  }

  // Explanation prompts
  if (lower.includes("explain")) { // If the prompt is asking for an explanation, return a response that reflects the model's style of explaining concepts, whether it's direct, detailed, or concise
    if (model === "llama3.2") {
      return `${style}: I can explain "${prompt}" by focusing on the main idea first.`;
    }
    if (model === "qwen2.5:0.5b") {
      return `${style}: I would explain "${prompt}" by giving context, breaking it into smaller parts, and summarizing the key takeaway.`;
    }
    return `${style}: I would simplify "${prompt}" into the most important points.`;
  }

  // General question
  if (prompt.trim().endsWith("?")) { // If the prompt is a question, return an answer that reflects the model's style of responding to questions, whether it's direct, detailed, or concise
    if (model === "llama3.2") {
      return `${style}: My answer to "${prompt}" would focus on the main facts first.`;
    }
    if (model === "qwen2.5:0.5b") {
      return `${style}: This question can be answered by identifying the key topic, explaining the reasoning, and giving a clear conclusion.`;
    }
    return `${style}: I would give a concise answer to "${prompt}".`;
  }

  // General statement
  if (model === "llama3.2") { // Llama3.2 gives a direct and clear response that acknowledges the user's statement and indicates readiness to assist, reflecting its style of being straightforward and helpful
    return `${style}: I understand your statement: "${prompt}".`;
  }
  if (model === "qwen2.5:0.5b") {
    return `${style}: You said "${prompt}". I would respond by expanding on the idea and connecting it to the conversation.`;
  }
  return `${style}: Got it. I would respond briefly and practically to "${prompt}".`;
}

// Routes: HTML Pages

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
    return res.status(400).json({ // 400 Bad Request status code for missing required fields
      success: false,
      message: "Email and password are required."
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) { // Check if email format is valid
    return res.status(400).json({ // 400 Bad Request status code for invalid input
      success: false,
      message: "Please enter a valid email address."
    });
  }

  try { // Check if email already exists in the database to prevent duplicate accounts, and return an appropriate error message if it does. If the email is unique, insert the new user into the database and return a success message.
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

    return res.status(201).json({ // 201 Created status code for successful resource creation
      success: true,
      message: "Account created successfully!"
    });
  } catch (error) { // Log database errors and return a generic error message to the client
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Database error during registration." // Generic error message to avoid exposing sensitive details
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

  try { // Check if the provided email and password match a user in the database. If authentication fails, log the failed attempt for security monitoring and return an appropriate error message. If authentication is successful, create a session for the user and return a success message along with user information.
    const stmt = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?");
    const user = stmt.get(email, password);

    if (!user) { // Log failed login attempt with email and success = 0 for analytics and security monitoring
      const insertStmt = db.prepare("INSERT INTO login_attempts (email, success) VALUES (?, ?)");
      insertStmt.run(email, 0);

      return res.status(401).json({ // 401 Unauthorized status code for failed authentication
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

    return res.status(200).json({ // 200 OK status code for successful login
      success: true,
      message: "Login successful!",
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) { // Log database errors and return a generic error message to the client
    console.error("Login error:", error);
    return res.status(500).json({ // 500 Internal Server Error status code for unexpected server errors
      success: false,
      message: "Database error."
    });
  }
});

// POST /logout - End user session
app.post("/logout", (req, res) => {
  console.log("Logout: Destroying session for user", req.session?.userId);
  
  req.session.destroy((err) => { // Destroy session and handle potential errors during session destruction
    if (err) {
      console.error("Logout: Error destroying session:", err);
      return res.status(500).json({ // 500 Internal Server Error status code for unexpected server errors during logout
        success: false,
        message: "Error during logout."
      });
    }
    
    res.clearCookie('connect.sid'); // Clear session cookie
    return res.status(200).json({ // 200 OK status code for successful logout
      success: true,
      message: "Logged out successfully."
    });
  });
});

// GET /logins - Retrieve login history
app.get("/logins", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM login_attempts ORDER BY login_time DESC");
    const rows = stmt.all();

    res.json({
      success: true,
      logins: rows
    });
  } catch (error) { // Log database errors and return a generic error message to the client
    console.error("Error fetching login history:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch login history."
    });
  }
});

// GET /api/health - Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ // 200 OK status code for successful health check
    success: true,
    message: "Server is running."
  });
});

// GET /api/models - Get available models from Ollama
app.get("/api/models", async (req, res) => {
  try {
    const ollamaResponse = await fetch("http://127.0.0.1:11434/api/tags");
    
    if (!ollamaResponse.ok) { // If Ollama is not running or returns an error, log the issue and return a 503 Service Unavailable status with a clear message
      return res.status(503).json({
        success: false,
        message: "Unable to connect to Ollama. Is it running?"
      });
    }
    
    const ollamaData = await ollamaResponse.json();
    const models = ollamaData.models || [];
    
    if (models.length === 0) { // If Ollama returns successfully but no models are found, log the issue and return a 503 Service Unavailable status with a clear message
      return res.status(503).json({
        success: false,
        message: "No models found in Ollama."
      });
    }
    
    res.json({
      success: true,
      models: models
    });
  } catch (error) { // Log network errors or other issues when connecting to Ollama and return a 503 Service Unavailable status with a clear message
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
  const { messages, models } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Messages array is required and must not be empty."
    });
  }

  if (!models || !Array.isArray(models) || models.length === 0) {
  return res.status(400).json({
    success: false,
    message: "Models array is required and must not be empty."
  });
}

  try {
    const prompt = messages[messages.length - 1]?.content || "";

    const responses = await Promise.all(
  models.map(async (model) => {

    // This is the important part
    if (process.env.NODE_ENV === "test") {
      return {
        model,
        content: buildFallbackReply(model, prompt)
      };
    }

    try {
      const ollamaResponse = await fetch("http://127.0.0.1:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            num_predict: 200 // limit response length for testing purposes
          }
        })
      });

      if (!ollamaResponse.ok) { // If Ollama returns an error for this chat request, log the issue and return a fallback response based on the model's style to ensure the API remains functional even if Ollama has issues
        return {
          model,
          content: buildFallbackReply(model, prompt)
        };
      }

      const data = await ollamaResponse.json();

      return {
        model,
        content: data.message?.content || buildFallbackReply(model, prompt)
      };

    } catch (error) { // Log network errors or other issues when connecting to Ollama for this chat request and return a fallback response based on the model's style to ensure the API remains functional even if Ollama has issues
      return {
        model,
        content: buildFallbackReply(model, prompt)
      };
    }
  })
);
    // Save conversation to database (simplified: one conversation per session)
    // In production, you'd associate conversations with user_id and use activeId from frontend
    const conversationId = generateUUID();
    const now = new Date().toISOString();

    try {
      // Get the first available user ID or use NULL for anonymous conversations
      const firstUser = db.prepare("SELECT id FROM users ORDER BY id LIMIT 1").get();
      const userId = firstUser ? firstUser.id : null;
      
      if (userId) {
        // Create new conversation (better-sqlite3 is synchronous)
        const insertConversation = db.prepare(`INSERT INTO conversations (id, user_id, title, created_at, updated_at)
                                               VALUES (?, ?, ?, ?, ?)`);
        insertConversation.run(conversationId, userId, "New Chat", now, now);

        // Save user message
        const insertMessage = db.prepare(`INSERT INTO messages (conversation_id, role, content, created_at)
                                          VALUES (?, ?, ?, ?)`);
        insertMessage.run(conversationId, 'user', messages[messages.length - 1].content, now);

        // Save assistant message
        responses.forEach((responseObj) => {
  insertMessage.run(
    conversationId,
    'assistant',
    `[${responseObj.model}] ${responseObj.content}`,
    now
  );
});
      }
    } catch (dbError) {
      console.warn("Database error while saving conversation:", dbError.message);
      // Continue anyway - don't fail the API call just because we couldn't save to DB
    }

    return res.status(200).json({
  success: true,
  responses: responses
});
  } catch (error) {
    console.error("Chat API error:", error.message);
    return res.status(500).json({ // 500 Internal Server Error status code for unexpected server errors during chat processing
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
  
  if (!req.session || !req.session.userId) { // Log missing session or userId for debugging authentication issues
    console.log("API: Authentication required - no session or userId");
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }
  
   // Fetch conversations for the logged-in user with message count
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

    res.json({ // Return conversations with message count to the client
      success: true,
      conversations: conversations
    });
  } catch (error) { // Log database errors and return a generic error message to the client
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
  
  if (!req.session || !req.session.userId) { // Log missing session or userId for debugging authentication issues
    console.log("API: Authentication required - no session or userId");
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  const { id, title } = req.body;
  
  if (!id || !title) { // Basic validation for required fields with logging for debugging
    console.log("API: Missing id or title");
    return res.status(400).json({
      success: false,
      message: "Conversation ID and title are required."
    });
  }

  try {
    const now = new Date().toISOString();
    
    console.log("API: Saving conversation:", { id, userId: req.session.userId, title });
    
    // Insert new conversation into the database with the provided ID, user ID from session, title, and timestamps
    const stmt = db.prepare(` 
      INSERT INTO conversations (id, user_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, req.session.userId, title, now, now);

    console.log("API: Conversation saved successfully");

    res.json({ // Return success response with conversation details to the client
      success: true,
      conversation: { id, title, created_at: now, updated_at: now }
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ // Log database errors and return a generic error message to the client
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

  const conversationId = req.params.id; // Get conversation ID from URL parameters

  try {
    // Verify conversation belongs to user
    const conversationStmt = db.prepare(`
      SELECT id FROM conversations WHERE id = ? AND user_id = ?
    `);
    const conversation = conversationStmt.get(conversationId, req.session.userId);

    if (!conversation) { // Only return 404 if conversation doesn't exist or doesn't belong to user - prevents information leakage about conversation existence
      return res.status(404).json({
        success: false,
        message: "Conversation not found."
      });
    }

    const messagesStmt = db.prepare(` // Fetch messages for the conversation ordered by creation time
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
  } catch (error) { // Log database errors and return a generic error message to the client
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

  if (!role || !content) { // Basic validation for required fields
    return res.status(400).json({
      success: false,
      message: "Role and content are required."
    });
  }

  if (!['user', 'assistant'].includes(role)) { // Validate role value to prevent invalid data and potential issues with frontend rendering
    return res.status(400).json({  
      success: false,
      message: "Role must be 'user' or 'assistant'."
    });
  }

  try {
    // Verify that the conversation belongs to user by checking if the conversation with the given ID exists and belongs to the logged-in user to prevent unauthorized access and information leakage about conversation existence
    const conversationStmt = db.prepare(` 
      SELECT id FROM conversations WHERE id = ? AND user_id = ?
    `);
    const conversation = conversationStmt.get(conversationId, req.session.userId);

    if (!conversation) { // Only return 404 if conversation doesn't exist or doesn't belong to user - prevents information leakage about conversation existence
      return res.status(404).json({
        success: false,
        message: "Conversation not found."
      });
    }

    // Add new message into the database
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
    updateStmt.run(new Date().toISOString(), conversationId); // Update the conversation's updated_at timestamp to reflect the new message

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
  } catch (error) { // Log database errors and return a generic error message to the client
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
    return res.status(401).json({ // Check for user authentication and return 401 Unauthorized if not authenticated to protect conversation data
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

    if (!conversation) { // Only return 404 if conversation doesn't exist or doesn't belong to user - prevents information leakage about conversation existence
      return res.status(404).json({ // Return 404 Not Found if the conversation doesn't exist or doesn't belong to the user to prevent information leakage about conversation existence
        success: false,
        message: "Conversation not found."
      });
    }

    // Delete conversation (messages will be deleted via CASCADE)
    const deleteStmt = db.prepare(`DELETE FROM conversations WHERE id = ?`);
    deleteStmt.run(conversationId);

    res.json({ // Return success response to the client confirming deletion of the conversation
      success: true,
      message: "Conversation deleted successfully."
    });
  } catch (error) { // Log database errors and return a generic error message to the client
    console.error("Error deleting conversation:", error);
    res.status(500).json({ 
      success: false, // 500 Internal Server Error status code for unexpected server errors during conversation deletion
      message: "Error deleting conversation."
    });
  }
});

// ==================== Server Initialization ====================

if (require.main === module) { // Only start the server if this file is run directly, not when imported for testing
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;