const request = require("supertest");
const app = require("./server");
const db = require("./database");

describe("Authentication and Server Route Tests", () => {
  beforeAll((done) => {
    db.serialize(() => {
      db.run("DELETE FROM users");
      db.run("DELETE FROM login_attempts");

      db.run(
        "INSERT INTO users (username, password, name) VALUES (?, ?, ?)",
        ["admin", "1234", "Admin User"],
        (err) => {
          done(err);
        }
      );
    });
  });

  beforeEach((done) => {
    db.run("DELETE FROM login_attempts", done);
  });

  describe("POST /login", () => {
    it("should return 400 if both username and password are missing", async () => {
      const res = await request(app)
        .post("/login")
        .send({ uname: "", psw: "" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Username and password are required.");
    });

    it("should return 400 if only username is missing", async () => {
      const res = await request(app)
        .post("/login")
        .send({ uname: "", psw: "1234" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Username and password are required.");
    });

    it("should return 400 if only password is missing", async () => {
      const res = await request(app)
        .post("/login")
        .send({ uname: "admin", psw: "" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Username and password are required.");
    });

    it("should return 401 for invalid login", async () => {
      const res = await request(app)
        .post("/login")
        .send({ uname: "wronguser", psw: "wrongpass" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid username or password.");
    });

    it("should return 200 for valid login", async () => {
      const res = await request(app)
        .post("/login")
        .send({ uname: "admin", psw: "1234" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Login successful");
    });

    it("should log a failed login attempt into the database", async () => {
      await request(app)
        .post("/login")
        .send({ uname: "baduser", psw: "badpass" });

      const rows = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM login_attempts WHERE username = ?", ["baduser"], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      expect(rows.length).toBe(1);
      expect(rows[0].success).toBe(0);
    });

    it("should log a successful login attempt into the database", async () => {
      await request(app)
        .post("/login")
        .send({ uname: "admin", psw: "1234" });

      const rows = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM login_attempts WHERE username = ?", ["admin"], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      expect(rows.length).toBe(1);
      expect(rows[0].success).toBe(1);
    });
  });

  describe("GET /logins", () => {
    it("should return login history successfully", async () => {
      await request(app)
        .post("/login")
        .send({ uname: "admin", psw: "1234" });

      const res = await request(app).get("/logins");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.logins)).toBe(true);
      expect(res.body.logins.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/health", () => {
    it("should return server health status", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Server is running.");
    });
  });

  describe("GET /", () => {
    it("should load the landing page", async () => {
      const res = await request(app).get("/");

      expect(res.status).toBe(200);
      expect(res.text).toContain("<!DOCTYPE html>");
    });
  });

  afterAll((done) => {
    db.close((err) => {
      done(err);
    });
  });
});