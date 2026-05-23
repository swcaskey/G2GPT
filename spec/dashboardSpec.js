// Jasmine Unit Tests for Dashboard (Chat Interface)
// Tests conversation management, message handling, search, and UI rendering

const dashboard = require('./helpers/dashboardHelper');

// Mock browser globals for testing
global.document = {
  createElement: (tag) => ({
    className: '',
    innerHTML: '',
    style: {},
    textContent: '',
    outerHTML: '',
    addEventListener: jasmine.createSpy('addEventListener'),
    appendChild: jasmine.createSpy('appendChild'),
    querySelector: jasmine.createSpy('querySelector'),
    remove: jasmine.createSpy('remove'),
    // Mock outerHTML getter
    get outerHTML() {
      return `<${tag} class="${this.className}">${this.innerHTML || this.textContent}</${tag}>`;
    }
  }),
  getElementById: jasmine.createSpy('getElementById')
};

global.fetch = jasmine.createSpy('fetch');

describe("Dashboard Conversation Management", () => { // Tests for conversation retrieval, ID generation, title formatting, grouping, and message rendering
  let conversations;

  beforeEach(() => {
    conversations = [];
  });

  describe("getConv", () => { // Tests for retrieving a conversation by ID
    it("should return conversation by ID", () => {
      const conv = { id: 'abc123', title: 'Test Chat', messages: [] };
      conversations.push(conv);
      
      expect(dashboard.getConv(conversations, 'abc123')).toBe(conv);
    });

    it("should return undefined for non-existent ID", () => { // Test that getConv returns undefined when a conversation with the specified ID does not exist in the conversations array, ensuring that the function correctly handles cases where the requested conversation is not found
      expect(dashboard.getConv(conversations, 'nonexistent')).toBeUndefined();
    });
  });

  describe("genId", () => { // Tests for generating unique conversation IDs
    it("should generate a unique ID", () => {
      const id1 = dashboard.genId();
      const id2 = dashboard.genId();
      // IDs should be defined, unique, and of type string
      expect(id1).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });

    it("should generate IDs with expected format", () => { // Test that genId generates IDs that are of a reasonable length and format (e.g., a combination of timestamp and random string in base36) to ensure that the generated IDs are unique and suitable for identifying conversations in the dashboard
      const id = dashboard.genId();
      
      // Should be a combination of timestamp and random string in base36
      expect(id.length).toBeGreaterThan(10);
    });
  });

  describe("autoTitle", () => { // Tests for auto-generating conversation titles based on message content
    it("should truncate long text to 42 characters", () => { // Test that text longer than 42 characters is truncated and ends with a period
      const longText = 'a'.repeat(50);
      const result = dashboard.autoTitle(longText);
      
      expect(result.length).toBe(43); // 42 + '.'
      expect(result).toBe('a'.repeat(42) + '.');
    });

    it("should not truncate short text", () => { // Test that text shorter than the truncation limit is returned unchanged
      const shortText = 'Hello';
      const result = dashboard.autoTitle(shortText);
      
      expect(result).toBe('Hello');
    });

    it("should trim whitespace before truncating", () => { // Test that leading/trailing whitespace is removed before applying truncation logic
      const textWithSpaces = '  Hello World  ';
      const result = dashboard.autoTitle(textWithSpaces);
      
      expect(result).toBe('Hello World');
    });
  });

  describe("groupConvs", () => { // Tests for grouping conversations by time periods (Today, Yesterday, Older)
    it("should group conversations by today/yesterday/older", () => { // Create conversations with different updatedAt timestamps to test grouping logic
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterday = today - 86400000;
      const twoDaysAgo = yesterday - 86400000;

      const conversations = [
        { id: '1', updatedAt: today + 3600000 }, // Today + 1 hour
        { id: '2', updatedAt: today + 1000 }, // Today + 1 second
        { id: '3', updatedAt: yesterday + 3600000 }, // Yesterday + 1 hour
        { id: '4', updatedAt: yesterday + 1000 }, // Yesterday + 1 second
        { id: '5', updatedAt: twoDaysAgo }, // Exactly two days ago
        { id: '6', updatedAt: twoDaysAgo - 1000 } // Two days ago - 1 second
      ];

      const groups = dashboard.groupConvs(conversations);

      expect(groups.Today.length).toBe(2);
      expect(groups.Yesterday.length).toBe(2);
      expect(groups.Older.length).toBe(2);
    });

    it("should handle empty array", () => { // Test that grouping an empty array of conversations returns empty groups without errors
      const groups = dashboard.groupConvs([]);
      
      expect(groups.Today).toEqual([]);
      expect(groups.Yesterday).toEqual([]);
      expect(groups.Older).toEqual([]);
    });
  });

  describe("escapeHtml", () => { // Tests for escaping special HTML characters to prevent XSS vulnerabilities
    it("should escape ampersand", () => {
      expect(dashboard.escapeHtml('A & B')).toBe('A &amp; B'); // Test that ampersands are correctly escaped to &amp; to prevent HTML injection
    });

    it("should escape less-than", () => {
      expect(dashboard.escapeHtml('A < B')).toBe('A &lt; B'); // Test that less-than signs are correctly escaped to &lt; to prevent HTML injection`
    });

    it("should escape greater-than", () => {
      expect(dashboard.escapeHtml('A > B')).toBe('A &gt; B'); // Test that greater-than signs are correctly escaped to &gt; to prevent HTML injection
    });

    it("should escape quotes", () => {
      expect(dashboard.escapeHtml('A "B" C')).toBe('A &quot;B&quot; C'); // Test that double quotes are correctly escaped to &quot; to prevent HTML injection
    });

    it("should handle multiple special characters", () => { // Test that a string containing multiple special characters is correctly escaped to ensure that all potential HTML injection vectors are handled properly
      const result = dashboard.escapeHtml('<div class="test">A & B</div>');
      expect(result).toBe('&lt;div class=&quot;test&quot;&gt;A &amp; B&lt;/div&gt;');
    });
  });

  describe("formatMessage", () => { // Tests for formatting message content by escaping HTML and converting newlines to <br> tags for safe rendering in the chat interface
    it("should escape HTML and convert newlines to br", () => { // Test that the formatMessage function correctly escapes HTML characters and converts newlines to <br> tags for safe rendering in the chat interface
      const input = '<script>alert("XSS")</script>\nHello\nWorld';
      const result = dashboard.formatMessage(input);
      
      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;<br>Hello<br>World');
    });
  });

  describe("setEmptyState", () => { // Tests for setting the empty state HTML content when there are no messages in a conversation
    it("should set empty state HTML", () => { //  Test that the setEmptyState function correctly sets the innerHTML of the provided element to the expected empty state content when there are no messages in a conversation
      const mockMessages = { innerHTML: '' };
      
      dashboard.setEmptyState(mockMessages);
      
      expect(mockMessages.innerHTML).toContain('Welcome to G2GPT');
      expect(mockMessages.innerHTML).toContain('Start a new conversation');
    });
  });

  describe("appendBubble", () => { // Tests for appending user and assistant message bubbles to the chat interface, including handling of empty state removal and animation settings
    let messagesContainer;
    let emptyState;

    beforeEach(() => { //  Set up a mock messages container with an empty state element for testing the appendBubble function, including spies to verify that the correct DOM manipulations occur when appending message bubbles and removing the empty state
      messagesContainer = { 
        appendChild: jasmine.createSpy('appendChild'),
        scrollTop: 0,
        innerHTML: '<div id="empty-state"></div>'
      };
      emptyState = { remove: jasmine.createSpy('remove') };
      emptyState.id = 'empty-state';
      messagesContainer.getElementById = () => emptyState;
    });

    it("should remove empty state on first message", () => { // Test that the appendBubble function removes the empty state element from the messages container when appending the first message bubble, ensuring that the chat interface transitions from the empty state to displaying messages correctly when a new message is added
      dashboard.appendBubble('user', 'Hello', false, messagesContainer);
      expect(emptyState.remove).toHaveBeenCalled();
    });

    it("should append user message bubble", () => { // Test that the appendBubble function correctly creates and appends a user message bubble to the messages container with the expected class name and content when appending a user message, ensuring that user messages are displayed correctly in the chat interface
      dashboard.appendBubble('user', 'Hello', false, messagesContainer);
      
      expect(messagesContainer.appendChild).toHaveBeenCalled();
      const appended = messagesContainer.appendChild.calls.argsFor(0)[0];
      expect(appended.className).toBe('msg-row user');
      expect(appended.innerHTML).toContain('You');
      expect(appended.innerHTML).toContain('Hello');
    });

    it("should append assistant message bubble", () => { // Test that the appendBubble function correctly creates and appends an assistant message bubble to the messages container with the expected class name and content when appending an assistant message, ensuring that assistant messages are displayed correctly in the chat interface
      dashboard.appendBubble('assistant', 'Hi there', false, messagesContainer);
      
      expect(messagesContainer.appendChild).toHaveBeenCalled();
      const appended = messagesContainer.appendChild.calls.argsFor(0)[0];
      expect(appended.className).toBe('msg-row assistant');
      expect(appended.innerHTML).toContain('AI');
      expect(appended.innerHTML).toContain('Hi there');
    });

    it("should not animate if animate is false", () => { // Test that the appendBubble function does not set an animation style on the appended message bubble when the animate parameter is false, ensuring that messages are displayed without animation when specified
      dashboard.appendBubble('user', 'Hello', false, messagesContainer);
      
      const appended = messagesContainer.appendChild.calls.argsFor(0)[0];
      expect(appended.style.animation).toBe('none');
    });
  });

  describe("renderMessages", () => { // Tests for rendering a list of messages in the chat interface, including handling of empty message lists and ensuring messages are rendered in the correct order with proper formatting
    let messagesContainer;

    beforeEach(() => {
      messagesContainer = {
        innerHTML: '',
        scrollTop: 0,
        appendChild: jasmine.createSpy('appendChild'),
        getElementById: jasmine.createSpy('getElementById').and.returnValue({ remove: jasmine.createSpy('remove') })
      };
    });

    it("should set empty state for empty message list", () => { // Test that the renderMessages function sets the empty state content in the messages container when provided with an empty list of messages, ensuring that the chat interface correctly displays the empty state when there are no messages to show
      dashboard.renderMessages([], messagesContainer);
      expect(messagesContainer.innerHTML).toContain('Welcome to G2GPT');
    });

    it("should render messages in order", () => { // Test that the renderMessages function correctly renders a list of messages in the order they are provided, ensuring that the chat interface displays messages in the correct sequence as they appear in the conversation history
      const messageList = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ];

      dashboard.renderMessages(messageList, messagesContainer);
      
      expect(messagesContainer.appendChild.calls.count()).toBe(2);
      expect(messagesContainer.appendChild.calls.argsFor(0)[0].innerHTML).toContain('Hello');
      expect(messagesContainer.appendChild.calls.argsFor(1)[0].innerHTML).toContain('Hi');
    });
  });

  describe("renderHistory", () => { // Tests for rendering the conversation history list in the dashboard, including handling of empty history, search filtering, and grouping by time periods to ensure the conversation history is displayed correctly and is searchable for users
    let historyList;
    let searchInput;

    beforeEach(() => { // Set up a mock history list element and search input for testing the renderHistory function, including a spy on the appendChild method to verify that conversation entries are rendered correctly based on the provided conversations array and search input value
      historyList = { 
        innerHTML: '', 
        appendChild: jasmine.createSpy('appendChild').and.callFake((element) => {
          historyList.innerHTML += element.outerHTML || element.textContent || element.className || '';
        })
      };
      searchInput = { value: '' };
    });

    it("should display no conversations message when empty", () => { // Test that the renderHistory function displays a message indicating there are no conversations when provided with an empty list of conversations, ensuring that users receive appropriate feedback when they have not started any conversations yet
      dashboard.renderHistory([], historyList, searchInput, null);
      expect(historyList.innerHTML).toContain('No conversations yet');
    });

    it("should filter conversations by search query", () => { // Test that the renderHistory function correctly filters the list of conversations based on the search input value, ensuring that users can easily find specific conversations in their history by typing relevant keywords
      const conversations = [
        { id: '1', title: 'Python Help', updatedAt: Date.now() },
        { id: '2', title: 'JavaScript Questions', updatedAt: Date.now() }
      ];
      searchInput.value = 'Python';

      dashboard.renderHistory(conversations, historyList, searchInput, null);

      // Should only show conversations matching 'Python'
      expect(historyList.innerHTML).toContain('Python Help');
      expect(historyList.innerHTML).not.toContain('JavaScript');
    });

    it("should group conversations by time period", () => { // Test that the renderHistory function correctly groups conversations into Today, Yesterday, and Older sections based on their updatedAt timestamps, ensuring that users can easily navigate their conversation history by time periods
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterday = today - 86400000;

      const conversations = [
        { id: '1', title: 'Today Chat', updatedAt: today },
        { id: '2', title: 'Yesterday Chat', updatedAt: yesterday }
      ];

      dashboard.renderHistory(conversations, historyList, searchInput, null);

      expect(historyList.innerHTML).toContain('Today');
      expect(historyList.innerHTML).toContain('Yesterday');
    });
  });

  describe("callLLM", () => { // Tests for calling the LLM API with a list of messages and optional model selection, including handling of successful responses, error scenarios, and ensuring the correct payload is sent to the server to verify that the chat interface can communicate effectively with the backend LLM API and handle various response scenarios appropriately
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should return LLM response", async () => { // Test that the callLLM function correctly sends a request to the /api/chat endpoint with the provided messages and models, and returns the expected response content when the API call is successful, ensuring that the chat interface can successfully communicate with the backend LLM API and display responses to users
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ reply: 'Hello from LLM' })
      };

      global.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse);

      const messageList = [{ role: 'user', content: 'Hello' }];
      const result = await dashboard.callLLM(messageList);

      expect(result.length).toBe(1);
      expect(result[0].model).toBe('default');
      expect(result[0].content).toBe('Hello from LLM');
    });

    it("should throw error for failed response", async () => { // Test that the callLLM function throws an error when the API response is not successful (e.g., network error, server error), ensuring that the chat interface can handle error scenarios gracefully and provide appropriate feedback to users when the LLM API call fails
      const mockResponse = {
        ok: false,
        status: 503,
        json: () => Promise.resolve({ message: 'Service unavailable' })
      };

      global.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse);

      const messageList = [{ role: 'user', content: 'Hello' }];
      
      await expectAsync(dashboard.callLLM(messageList)).toBeRejected();
    });
    it("should send selected models to /api/chat", async () => { // Test that the callLLM function includes the selected models in the request payload sent to the /api/chat endpoint, ensuring that users can specify which LLM models to use for generating responses and that this selection is correctly communicated to the backend API
  global.fetch = jasmine.createSpy('fetch').and.resolveTo({
    ok: true,
    json: async () => ({
      responses: [
        { model: "llama3.2", content: "A" },
        { model: "qwen2.5:0.5b", content: "B" }
      ]
    })
  });

  // Provide a valid messages array to avoid triggering validation errors and ensure we are specifically testing the inclusion of selected models in the API request payload
  const messages = [{ role: "user", content: "Hello" }];
  const models = ["llama3.2", "qwen2.5:0.5b"];

  const result = await dashboard.callLLM(messages, models);
  // The function should send the selected models in the request body and return the mocked responses, ensuring that the chat interface can utilize the model selection feature when communicating with the LLM API
  const [, options] = global.fetch.calls.argsFor(0);
  const body = JSON.parse(options.body);

  expect(body.models).toEqual(models);
  expect(result.length).toBe(2);
  expect(result[0].model).toBe("llama3.2");
});


it("should support legacy single-response payloads", async () => { // Test that the callLLM function can handle legacy API responses that return a single reply instead of an array of responses, ensuring backward compatibility with older versions of the LLM API and that the chat interface can still function correctly even if the backend response format has not been updated to the newer multi-response structure
  global.fetch = jasmine.createSpy('fetch').and.resolveTo({
    ok: true,
    json: async () => ({
      reply: "Single legacy reply"
    })
  });

  const result = await dashboard.callLLM( // Provide a valid messages array to avoid triggering validation errors and ensure we are specifically testing the handling of legacy single-response payloads
    [{ role: "user", content: "Hi" }],
    ["llama3.2"]
  );
  // The function should return an array with one response object containing the legacy reply content and a default model name, ensuring that the chat interface can display responses correctly even when the backend API returns data in the older format
  expect(result.length).toBe(1);
  expect(result[0].model).toBe("default");
  expect(result[0].content).toBe("Single legacy reply");
});
  });
});
