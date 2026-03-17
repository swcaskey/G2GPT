const request = require("supertest");
const app = require("../server");
const db = require("../database");

describe("Login Route Tests", () => {
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
  it("should return 400 if username or password is missing", async () => {
    const res = await request(app)
      .post("/login")
      .send({ uname: "", psw: "" });

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
    expect(res.body.message).toContain("Login successful!");
  });

  it("should return server health", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Server is running.");
  });
});