// Jasmine Unit Tests for Authentication Endpoints
// Tests POST /login, POST /signup, POST /logout, GET /logins, and GET /api/health endpoints

const request = require("supertest");
const app = require("../server");
const db = require("../database");

describe("POST /signup", () => {
  beforeAll((done) => {
    db.serialize(() => {
      db.run("DELETE FROM login_attempts", (err) => {
        if (err) return done.fail(err);
      });
      db.run("DELETE FROM users", (err) => {
        if (err) return done.fail(err);
        done();
      });
    });
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
    db.serialize(() => {
      db.run("DELETE FROM login_attempts", (err) => {
        if (err) return done.fail(err);
      });
      db.run("DELETE FROM users", (err) => {
        if (err) return done.fail(err);
      });
      db.run(
        "INSERT INTO users (email, password) VALUES (?, ?)",
        ["admin@example.com", "admin123"],
        (err) => {
          if (err) return done.fail(err);
          done();
        }
      );
    });
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

    const rows = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM login_attempts WHERE email = ?",
        ["baduser@example.com"],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].success).toBe(0);
  });

  it("should log a successful login attempt into the database", async () => {
    await request(app)
      .post("/login")
      .send({ email: "admin@example.com", password: "admin123" });

    const rows = await new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM login_attempts WHERE email = ?",
        ["admin@example.com"],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

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
  it("should return models list when Ollama is available or handle gracefully when not", async () => {
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

describe("POST /api/chat", () => {
  beforeEach((done) => {
    db.serialize(() => {
      db.run("DELETE FROM conversations", (err) => {
        if (err) return done.fail(err);
      });
      db.run("DELETE FROM messages", (err) => {
        if (err) return done.fail(err);
        done();
      });
    });
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
});
