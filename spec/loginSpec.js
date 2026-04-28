// Jasmine Unit Tests for Authentication Endpoints
// Tests POST /login, POST /signup, POST /logout, GET /logins, and GET /api/health endpoints

const request = require("supertest");
const app = require("../server");
const db = require("../database");

describe("POST /signup", () => { // Tests for signup endpoint with various validation scenarios
  beforeAll((done) => {
    try {
      // Clear test data using better-sqlite3 syntax
      db.prepare("DELETE FROM login_attempts").run();
      db.prepare("DELETE FROM users").run();
      done();
    } catch (err) {
      done.fail(err);
    }
  });

  it("should return 400 if email is missing", async () => { // Updated to check for empty string instead of null
    const res = await request(app)
      .post("/signup")
      .send({ email: "", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email and password are required.");
  });

  it("should return 400 if password is missing", async () => { // Updated to check for empty string instead of null
    const res = await request(app)
      .post("/signup")
      .send({ email: "test@example.com", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email and password are required.");
  });

  it("should return 400 if email format is invalid", async () => { // Added test for invalid email format
    const res = await request(app)
      .post("/signup")
      .send({ email: "notanemail", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Please enter a valid email address.");
  });

  it("should return 201 for valid signup", async () => { // Updated to check for valid signup with proper email format
    const res = await request(app)
      .post("/signup")
      .send({ email: "newuser@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Account created successfully!");
  });

  it("should return 400 if email already exists", async () => { // Updated to check for duplicate email with proper email format
    await request(app)
      .post("/signup")
      .send({ email: "duplicate@example.com", password: "password123" });

    const res = await request(app)
      .post("/signup")
      .send({ email: "duplicate@example.com", password: "password456" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email already in use.");
  });
});

describe("POST /login", () => { // Tests for login endpoint with various scenarios
  beforeAll((done) => {
    try {
      // Clear test data using better-sqlite3 syntax
      db.prepare("DELETE FROM login_attempts").run();
      db.prepare("DELETE FROM users").run();
      
      // Insert test user
      db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run("admin@example.com", "admin123");
      done();
    } catch (err) {
      done.fail(err);
    }
  });

  it("should return 400 if both email and password are missing", async () => { // Updated to check for empty strings instead of null
    const res = await request(app)
      .post("/login")
      .send({ email: "", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email and password are required.");
  });

  it("should return 400 if only email is missing", async () => { // Updated to check for empty string instead of null
    const res = await request(app)
      .post("/login")
      .send({ email: "", password: "admin123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email and password are required.");
  });

  it("should return 400 if only password is missing", async () => { // Updated to check for empty string instead of null
    const res = await request(app)
      .post("/login")
      .send({ email: "admin@example.com", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email and password are required.");
  });

  it("should return 401 for invalid credentials", async () => { // Updated to check for invalid credentials with proper email format
    const res = await request(app)
      .post("/login")
      .send({ email: "baduser@example.com", password: "badpass" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("should return 200 for valid credentials", async () => { // Updated to check for valid login with proper email format
    const res = await request(app)
      .post("/login")
      .send({ email: "admin@example.com", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Login successful!");
  });

  it("should log a failed login attempt into the database", async () => { // Updated to check for failed login attempt with proper email format
    await request(app)
      .post("/login")
      .send({ email: "baduser@example.com", password: "badpass" });

    const stmt = db.prepare("SELECT * FROM login_attempts WHERE email = ?");
    const rows = stmt.all("baduser@example.com");

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].success).toBe(0); 
  });

  it("should log a successful login attempt into the database", async () => { // Updated to check for successful login attempt with proper email format
    await request(app)
      .post("/login")
      .send({ email: "admin@example.com", password: "admin123" });

    const stmt = db.prepare("SELECT * FROM login_attempts WHERE email = ?");
    const rows = stmt.all("admin@example.com");

    expect(rows.length).toBeGreaterThan(0);
    const successfulAttempt = rows.find(row => row.success === 1);
    expect(successfulAttempt).toBeDefined();
  });
});

describe("POST /logout", () => {
  it("should return 200 for logout request", async () => { // Updated to check for logout functionality
    const res = await request(app).post("/logout");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Logged out successfully.");
  });
});

describe("GET /logins", () => {
  it("should return login history successfully", async () => { // Updated to check for login history retrieval
    await request(app)
      .post("/login")
      .send({ email: "admin@example.com", password: "admin123" });

    const res = await request(app).get("/logins");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logins)).toBe(true);
    expect(res.body.logins.length).toBeGreaterThan(0);
  });
});

describe("GET /api/health", () => {
  it("should return server health successfully", async () => { // Updated to check for server health endpoint
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Server is running.");
  });
});

describe("GET /api/models", () => {
  it("should return models list when Ollama is available or handle gracefully when not", async () => { // Updated to check for models endpoint with handling for Ollama availability
    const res = await request(app).get("/api/models");
    
    // Accept either success or expected failure
    expect([200, 503]).toContain(res.status);
    
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.models).toBeDefined();
      expect(Array.isArray(res.body.models)).toBe(true);
    } else {
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Could not connect to Ollama.");
    }
  });
});

describe("POST /api/chat", () => { // Tests for chat endpoint with various validation scenarios
  beforeEach((done) => {
    try {
      // Clear test data using better-sqlite3 syntax
      db.prepare("DELETE FROM conversations").run();
      db.prepare("DELETE FROM messages").run();
      done();
    } catch (err) {
      done.fail(err);
    }
  });

  it("should return 400 if messages array is missing", async () => { // Updated to check for missing messages array
    const res = await request(app)
      .post("/api/chat")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Messages array is required and must not be empty.");
  });

  it("should return 400 if messages array is empty", async () => { // Updated to check for empty messages array
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Messages array is required and must not be empty.");
  });

  it("should return 400 if messages is not an array", async () => { // Updated to check for invalid messages format
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: "not an array" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Messages array is required and must not be empty.");
  });
});

describe("POST /api/chat multi-LLM validation", () => {
  it("should return 400 if models array is missing", async () => { // Updated to check for missing models array when using multi-LLM setup
    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [{ role: "user", content: "Hello" }]
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Models array is required and must not be empty.");
  });

  it("should return 400 if models array is empty", async () => { // Updated to check for empty models array when using multi-LLM setup
    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [{ role: "user", content: "Hello" }],
        models: []
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Models array is required and must not be empty.");
  });
});
