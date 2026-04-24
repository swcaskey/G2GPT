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

describe("Dashboard Conversation Management", () => {
  let conversations;

  beforeEach(() => {
    conversations = [];
  });

  describe("getConv", () => {
    it("should return conversation by ID", () => {
      const conv = { id: 'abc123', title: 'Test Chat', messages: [] };
      conversations.push(conv);

      expect(dashboard.getConv(conversations, 'abc123')).toBe(conv);
    });

    it("should return undefined for non-existent ID", () => {
      expect(dashboard.getConv(conversations, 'nonexistent')).toBeUndefined();
    });
  });

  describe("genId", () => {
    it("should generate a unique ID", () => {
      const id1 = dashboard.genId();
      const id2 = dashboard.genId();

      expect(id1).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
    });

    it("should generate IDs with expected format", () => {
      const id = dashboard.genId();

      // Should be a combination of timestamp and random string in base36
      expect(id.length).toBeGreaterThan(10);
    });
  });

  describe("autoTitle", () => {
    it("should truncate long text to 42 characters", () => {
      const longText = 'a'.repeat(50);
      const result = dashboard.autoTitle(longText);

      expect(result.length).toBe(43); // 42 + '.'
      expect(result).toBe('a'.repeat(42) + '.');
    });

    it("should not truncate short text", () => {
      const shortText = 'Hello';
      const result = dashboard.autoTitle(shortText);

      expect(result).toBe('Hello');
    });

    it("should trim whitespace before truncating", () => {
      const textWithSpaces = '  Hello World  ';
      const result = dashboard.autoTitle(textWithSpaces);

      expect(result).toBe('Hello World');
    });
  });

  describe("groupConvs", () => {
    it("should group conversations by today/yesterday/older", () => {
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

    it("should handle empty array", () => {
      const groups = dashboard.groupConvs([]);

      expect(groups.Today).toEqual([]);
      expect(groups.Yesterday).toEqual([]);
      expect(groups.Older).toEqual([]);
    });
  });

  describe("escapeHtml", () => {
    it("should escape ampersand", () => {
      expect(dashboard.escapeHtml('A & B')).toBe('A &amp; B');
    });

    it("should escape less-than", () => {
      expect(dashboard.escapeHtml('A < B')).toBe('A &lt; B');
    });

    it("should escape greater-than", () => {
      expect(dashboard.escapeHtml('A > B')).toBe('A &gt; B');
    });

    it("should escape quotes", () => {
      expect(dashboard.escapeHtml('A "B" C')).toBe('A &quot;B&quot; C');
    });

    it("should handle multiple special characters", () => {
      const result = dashboard.escapeHtml('<div class="test">A & B</div>');
      expect(result).toBe('&lt;div class=&quot;test&quot;&gt;A &amp; B&lt;/div&gt;');
    });
  });

  describe("formatMessage", () => {
    it("should escape HTML and convert newlines to br", () => {
      const input = '<script>alert("XSS")</script>\nHello\nWorld';
      const result = dashboard.formatMessage(input);

      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;<br>Hello<br>World');
    });
  });

  describe("setEmptyState", () => {
    it("should set empty state HTML", () => {
      const mockMessages = { innerHTML: '' };

      dashboard.setEmptyState(mockMessages);

      expect(mockMessages.innerHTML).toContain('Welcome to G2GPT');
      expect(mockMessages.innerHTML).toContain('Start a new conversation');
    });
  });

  describe("appendBubble", () => {
    let messagesContainer;
    let emptyState;

    beforeEach(() => {
      messagesContainer = {
        appendChild: jasmine.createSpy('appendChild'),
        scrollTop: 0,
        innerHTML: '<div id="empty-state"></div>'
      };
      emptyState = { remove: jasmine.createSpy('remove') };
      emptyState.id = 'empty-state';
      messagesContainer.getElementById = () => emptyState;
    });

    it("should remove empty state on first message", () => {
      dashboard.appendBubble('user', 'Hello', false, messagesContainer);
      expect(emptyState.remove).toHaveBeenCalled();
    });

    it("should append user message bubble", () => {
      dashboard.appendBubble('user', 'Hello', false, messagesContainer);

      expect(messagesContainer.appendChild).toHaveBeenCalled();
      const appended = messagesContainer.appendChild.calls.argsFor(0)[0];
      expect(appended.className).toBe('msg-row user');
      expect(appended.innerHTML).toContain('You');
      expect(appended.innerHTML).toContain('Hello');
    });

    it("should append assistant message bubble", () => {
      dashboard.appendBubble('assistant', 'Hi there', false, messagesContainer);

      expect(messagesContainer.appendChild).toHaveBeenCalled();
      const appended = messagesContainer.appendChild.calls.argsFor(0)[0];
      expect(appended.className).toBe('msg-row assistant');
      expect(appended.innerHTML).toContain('AI');
      expect(appended.innerHTML).toContain('Hi there');
    });

    it("should not animate if animate is false", () => {
      dashboard.appendBubble('user', 'Hello', false, messagesContainer);

      const appended = messagesContainer.appendChild.calls.argsFor(0)[0];
      expect(appended.style.animation).toBe('none');
    });
  });

  describe("renderMessages", () => {
    let messagesContainer;

    beforeEach(() => {
      messagesContainer = {
        innerHTML: '',
        scrollTop: 0,
        appendChild: jasmine.createSpy('appendChild'),
        getElementById: jasmine.createSpy('getElementById').and.returnValue({ remove: jasmine.createSpy('remove') })
      };
    });

    it("should set empty state for empty message list", () => {
      dashboard.renderMessages([], messagesContainer);
      expect(messagesContainer.innerHTML).toContain('Welcome to G2GPT');
    });

    it("should render messages in order", () => {
      const messageList = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ];

      dashboard.renderMessages(messageList, messagesContainer);

      expect(messagesContainer.appendChild.calls.count()).toBe(2);
      expect(messagesContainer.appendChild.calls.argsFor(0)[0].innerHTML).toContain('Hello');

      // Because we mock document.createElement, appending a child doesn't update its parent's innerHTML natively.
      // We check that the multi-col wrapper received the appended child containing 'Hi'.
      const multiColDiv = messagesContainer.appendChild.calls.argsFor(1)[0];
      const appendedCol = multiColDiv.appendChild.calls.argsFor(0)[0];
      expect(appendedCol.innerHTML).toContain('Hi');
    });
  });

  describe("renderHistory", () => {
    let historyList;
    let searchInput;

    beforeEach(() => {
      historyList = {
        innerHTML: '',
        appendChild: jasmine.createSpy('appendChild').and.callFake((element) => {
          historyList.innerHTML += element.outerHTML || element.textContent || element.className || '';
        })
      };
      searchInput = { value: '' };
    });

    it("should display no conversations message when empty", () => {
      dashboard.renderHistory([], historyList, searchInput, null);
      expect(historyList.innerHTML).toContain('No conversations yet');
    });

    it("should filter conversations by search query", () => {
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

    it("should group conversations by time period", () => {
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

  describe("callLLM", () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should return LLM response", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ replies: [{content:'Hello from LLM'}] })
      };

      global.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse);

      const messageList = [{ role: 'user', content: 'Hello' }];
      const result = await dashboard.callLLM(messageList);

      expect(result).toEqual([{ content: 'Hello from LLM' }]);
    });

    it("should throw error for failed response", async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        json: () => Promise.resolve({ message: 'Service unavailable' })
      };

      global.fetch = jasmine.createSpy('fetch').and.resolveTo(mockResponse);

      const messageList = [{ role: 'user', content: 'Hello' }];

      await expectAsync(dashboard.callLLM(messageList)).toBeRejected();
    });
  });
});
