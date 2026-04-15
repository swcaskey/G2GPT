// Jasmine Unit Tests for Authentication Endpoints
// Tests POST /login, POST /signup, POST /logout, GET /logins, and GET /api/health endpoints

const request = require("supertest");
const app = require("../server");
const db = require("../database");

describe("POST /signup", () => {
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

  it("should return 400 if email is missing", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ email: "", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email and password are required.");
  });

  it("should return 400 if password is missing", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ email: "test@example.com", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email and password are required.");
  });

  it("should return 400 if email format is invalid", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ email: "notanemail", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Please enter a valid email address.");
  });

  it("should return 201 for valid signup", async () => {
    const res = await request(app)
      .post("/signup")
      .send({ email: "newuser@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Account created successfully!");
  });

  it("should return 400 if email already exists", async () => {
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

describe("POST /login", () => {
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

  it("should return 400 if both email and password are missing", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email and password are required.");
  });

  it("should return 400 if only email is missing", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "", password: "admin123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email and password are required.");
  });

  it("should return 400 if only password is missing", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "admin@example.com", password: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Email and password are required.");
  });

  it("should return 401 for invalid credentials", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "baduser@example.com", password: "badpass" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("should return 200 for valid credentials", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "admin@example.com", password: "admin123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Login successful!");
  });

  it("should log a failed login attempt into the database", async () => {
    await request(app)
      .post("/login")
      .send({ email: "baduser@example.com", password: "badpass" });

    const stmt = db.prepare("SELECT * FROM login_attempts WHERE email = ?");
    const rows = stmt.all("baduser@example.com");

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].success).toBe(0);
  });

  it("should log a successful login attempt into the database", async () => {
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
  it("should return 200 for logout request", async () => {
    const res = await request(app).post("/logout");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Logged out successfully.");
  });
});

describe("GET /logins", () => {
  it("should return login history successfully", async () => {
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
  it("should return server health successfully", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Server is running.");
  });
});

describe("GET /api/models", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return normalized model names when Ollama is available", async () => {
    global.fetch = jasmine.createSpy("fetch").and.resolveTo({
      ok: true,
      json: async () => ({ models: [{ name: "llama3" }, { name: "mistral" }] })
    });

    const res = await request(app).get("/api/models");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.models).toEqual(["llama3", "mistral"]);
  });

  it("should return 503 when Ollama is unavailable", async () => {
    global.fetch = jasmine.createSpy("fetch").and.rejectWith(new Error("Connection failed"));

    const res = await request(app).get("/api/models");

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Could not connect to Ollama.");
  });
});

describe("POST /api/chat", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return 400 if messages array is missing", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Messages array is required and must not be empty.");
  });

  it("should return 400 if messages array is empty", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Messages array is required and must not be empty.");
  });

  it("should return 400 if messages is not an array", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: "not an array" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Messages array is required and must not be empty.");
  });

  it("should return 400 when no models are provided", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [{ role: "user", content: "Hello" }], models: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("At least one model name is required.");
  });

  it("should return single-model response when one model is selected", async () => {
    global.fetch = jasmine.createSpy("fetch").and.callFake(async (url, options) => {
      if (url.endsWith("/api/tags")) {
        return {
          ok: true,
          json: async () => ({ models: [{ name: "llama3" }, { name: "mistral" }] })
        };
      }

      const payload = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          message: { content: `reply-${payload.model}` }
        })
      };
    });

    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [{ role: "user", content: "Hello there" }],
        models: ["llama3"]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.responses).toEqual([
      { model: "llama3", content: "reply-llama3" }
    ]);
  });

  it("should return multi-model responses when request is valid", async () => {
    global.fetch = jasmine.createSpy("fetch").and.callFake(async (url, options) => {
      if (url.endsWith("/api/tags")) {
        return {
          ok: true,
          json: async () => ({ models: [{ name: "llama3" }, { name: "mistral" }] })
        };
      }

      const payload = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          message: { content: `reply-${payload.model}` }
        })
      };
    });

    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [{ role: "user", content: "Hello there" }],
        models: ["llama3", "mistral"]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.responses).toEqual([
      { model: "llama3", content: "reply-llama3" },
      { model: "mistral", content: "reply-mistral" }
    ]);
  });
});

describe("Conversation messages model attribution", () => {
  let agent;
  let userId;
  const conversationId = "conv-model-test";

  beforeEach(async () => {
    db.prepare("DELETE FROM messages").run();
    db.prepare("DELETE FROM conversations").run();
    db.prepare("DELETE FROM users").run();

    const result = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run("modeltest@example.com", "password123");
    userId = result.lastInsertRowid;

    agent = request.agent(app);
    await agent.post("/login").send({ email: "modeltest@example.com", password: "password123" });

    db.prepare("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)").run(conversationId, userId, "Model Conversation");
  });

  it("should save and return model_name for assistant messages", async () => {
    const postRes = await agent
      .post(`/api/conversations/${conversationId}/messages`)
      .send({ role: "assistant", content: "Parallel answer", model_name: "llama3" });

    expect(postRes.status).toBe(200);
    expect(postRes.body.success).toBe(true);
    expect(postRes.body.message.model_name).toBe("llama3");

    const getRes = await agent.get(`/api/conversations/${conversationId}/messages`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.messages.length).toBe(1);
    expect(getRes.body.messages[0].model_name).toBe("llama3");
  });
});
