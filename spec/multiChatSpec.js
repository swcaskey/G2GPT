const request = require("supertest");
const app = require("../server");

describe("Multi-Model API Endpoints", () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    // Mock the global fetch to avoid needing a live Ollama daemon for unit tests
    global.fetch = jasmine.createSpy("fetch").and.callFake(async (url) => {
      if (url.includes("/api/tags")) {
        return { 
          ok: true, 
          json: async () => ({ models: [{ name: "mock-model-a" }, { name: "mock-model-b" }] }) 
        };
      }
      if (url.includes("/api/chat")) {
        return { 
          ok: true, 
          json: async () => ({ message: { content: "Mock simulated response." } }) 
        };
      }
      return { ok: false, status: 404 };
    });
  });

  afterAll(() => {
    global.fetch = originalFetch; // restore
  });

  describe("GET /api/models", () => {
    it("should return a list of parsed model names", async () => {
      const res = await request(app).get("/api/models");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.models.length).toBe(7);
      expect(res.body.models).toContain("mock-model-a");
    });
  });

  describe("POST /api/chat/multi", () => {
    it("should return 400 if messages array is missing", async () => {
      const res = await request(app).post("/api/chat/multi").send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Messages array is required");
    });

    it("should process multi LLM responses successfully", async () => {
      const res = await request(app).post("/api/chat/multi").send({
         messages: [{ role: "user", content: "hello" }],
         modelNames: ["mock-model-x", "mock-model-y", "mock-model-z"]
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // We asked for 3 models, so we should get exactly 3 parallel replies
      expect(res.body.replies.length).toBe(3);
      
      // Check the structure of the replies mapped by Promise.all
      expect(res.body.replies[0].model).toBe("mock-model-x");
      expect(res.body.replies[0].content).toBe("Mock simulated response.");
      expect(res.body.replies[0].error).toBe(false);
      
      expect(res.body.replies[1].model).toBe("mock-model-y");
      expect(res.body.replies[2].model).toBe("mock-model-z");
    });
  });
});
