const request = require("supertest");
const app = require("../backend/server");
const db = require("../backend/database");

describe("Login Route Tests", () => {
  beforeAll((done) => {
    db.serialize(() => {
      db.run("DELETE FROM users");
      db.run("DELETE FROM login_attempts");

      db.run(
        "INSERT INTO users (username, password, name) VALUES (?, ?, ?)",
        ["admin", "1234", "Admin User"],
        done
      );
    });
  });

  afterAll((done) => {
    db.close(done);
  });

  it("should return health status", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Server is running.");
  });

  it("should fail if username or password is missing", async () => {
    const res = await request(app)
      .post("/login")
      .send({ uname: "", psw: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Username and password are required.");
  });

  it("should fail for invalid username or password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ uname: "wronguser", psw: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid username or password.");
  });

  it("should succeed for valid username and password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ uname: "admin", psw: "1234" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("Login successful! Welcome, Admin User!");
  });

  it("should return login history", async () => {
    const res = await request(app).get("/logins");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logins)).toBe(true);
  });
});