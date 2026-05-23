const request = require("supertest");
const app = require("../server");

describe("POST /api/chat-multi", () => {
  it("should return 400 if messages are missing", async () => {
    const res = await request(app)
      .post("/api/chat-multi")
      .send({ messages: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return an error if selected models are invalid", async () => {
    const res = await request(app)
      .post("/api/chat-multi")
      .send({
        messages: [{ role: "user", content: "Give me startup ideas" }],
        selectedModels: ["fake-model-1", "fake-model-2"]
      });

    expect([400, 500, 503]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});